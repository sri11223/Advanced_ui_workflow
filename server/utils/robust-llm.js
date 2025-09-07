const { ChatGroq } = require("@langchain/groq");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const PersistentCache = require("./persistent-cache");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

/**
 * Robust LLM client with fallback capabilities
 * Supports multiple providers with automatic failover
 */
class RobustLLMClient {
  constructor(options = {}) {
    this.primaryProvider = options.primaryProvider || "groq";
    this.fallbackProviders = options.fallbackProviders || [
      "gemini",
      "groq-backup",
    ];
    this.maxRetries = options.maxRetries || 3;
    this.backoffFactor = options.backoffFactor || 2;

    // Initialize persistent cache
    this.cache = new PersistentCache({
      cacheDir: options.cacheDir,
      maxItems: options.maxCacheItems || 500,
      saveInterval: options.cacheSaveInterval || 5 * 60 * 1000, // 5 minutes
    });

    this.cacheTTL = options.cacheTTL || 3600000; // 1 hour cache TTL by default
    this.clients = this.initializeClients();
    this.outputParser = new StringOutputParser();

    // Track statistics for monitoring
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      providerSuccesses: {},
      providerFailures: {},
      lastRequestTime: null,
      lastError: null,
    };

    // Initialize provider stats
    [this.primaryProvider, ...this.fallbackProviders].forEach((provider) => {
      this.stats.providerSuccesses[provider] = 0;
      this.stats.providerFailures[provider] = 0;
    });
  }

  /**
   * Initialize LLM clients for all providers
   */
  initializeClients() {
    const clients = {};

    // Primary Groq client
    try {
      clients.groq = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        maxTokens: undefined,
        maxRetries: 2,
      });
      console.log("Primary Groq LLM client initialized");
    } catch (error) {
      console.error("Failed to initialize primary Groq client:", error);
    }

    // Gemini client (highest priority fallback)
    try {
      clients.gemini = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: "gemini-2.5-flash",
        temperature: 0.2,
        maxOutputTokens: 4096,
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      });
      console.log("Gemini 2.5 Flash LLM client initialized (fallback)");
    } catch (error) {
      console.error("Failed to initialize Gemini client:", error);
    }

    // Backup Groq client with different model
    try {
      clients["groq-backup"] = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.1-8b-instant", // Use a different model as backup
        temperature: 0.3,
        maxTokens: undefined,
        maxRetries: 1,
      });
      console.log("Backup Groq LLM client initialized");
    } catch (error) {
      console.error("Failed to initialize backup Groq client:", error);
    }

    return clients;
  }

  /**
   * Generate a cache key from the prompt and options
   */
  getCacheKey(prompt, options = {}) {
    const optionsString = JSON.stringify(options);
    return `${prompt}:${optionsString}`;
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      providers: [this.primaryProvider, ...this.fallbackProviders],
    };
  }

  /**
   * Invoke the LLM with automatic retries and fallbacks
   */
  async invoke(prompt, options = {}) {
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date().toISOString();

    // Check cache first if not explicitly skipped
    if (!options.skipCache) {
      const cacheKey = this.getCacheKey(prompt, options);
      const cachedResult = this.cache.get(cacheKey);

      if (cachedResult) {
        console.log("Cache hit for prompt");
        this.stats.cacheHits++;
        return cachedResult;
      } else {
        this.stats.cacheMisses++;
      }
    }

    // Try each provider in order: primary first, then fallbacks
    const providersToTry = [this.primaryProvider, ...this.fallbackProviders];
    let lastError;

    for (const provider of providersToTry) {
      const client = this.clients[provider];

      if (!client) {
        console.warn(`Provider ${provider} not available, skipping`);
        continue;
      }

      // Try current provider with retries and backoff
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          console.log(
            `Attempting to use ${provider} (attempt ${attempt + 1}/${
              this.maxRetries
            })`
          );

          const response = await client.invoke(prompt);
          let result;

          // Handle different response formats from different LLM providers
          try {
            result = await this.outputParser.parse(response);
          } catch (parseError) {
            console.warn(`Error parsing LLM response: ${parseError.message}`);
            // Fallback: if response has a text or content property, use that
            if (response && (response.text || response.content)) {
              result = response.text || response.content;
            } else if (typeof response === "object") {
              // Try to stringify the object if it's not a string
              result = JSON.stringify(response);
            } else {
              // Last resort: use the response directly
              result = String(response);
            }
          }

          // Update stats
          this.stats.providerSuccesses[provider] =
            (this.stats.providerSuccesses[provider] || 0) + 1;

          // Cache successful result if not explicitly skipped
          if (!options.skipCache) {
            const cacheKey = this.getCacheKey(prompt, options);
            this.cache.set(cacheKey, result, this.cacheTTL);
          }

          console.log(`Successfully generated response using ${provider}`);
          return result;
        } catch (error) {
          lastError = error;
          console.warn(
            `${provider} attempt ${attempt + 1} failed: ${error.message}`
          );

          // Update stats
          this.stats.providerFailures[provider] =
            (this.stats.providerFailures[provider] || 0) + 1;
          this.stats.lastError = {
            provider,
            time: new Date().toISOString(),
            message: error.message,
            attempt: attempt + 1,
          };

          // Apply exponential backoff before retrying
          if (attempt < this.maxRetries - 1) {
            const backoffMs = Math.pow(this.backoffFactor, attempt) * 1000;
            console.log(`Backing off for ${backoffMs}ms before retry`);
            await new Promise((r) => setTimeout(r, backoffMs));
          }
        }
      }

      console.error(
        `All attempts with ${provider} failed, trying next provider`
      );
    }

    // If we get here, all providers failed
    console.error("All LLM providers failed");
    throw (
      lastError || new Error("All LLM providers failed to generate a response")
    );
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    console.log("LLM response cache cleared");
  }

  /**
   * Clean up resources when shutting down
   */
  async close() {
    await this.cache.close();
  }
}

/**
 * JSON handling utilities for repairing and validating LLM-generated JSON
 */
class JSONHandler {
  /**
   * Attempt to repair and parse malformed JSON
   */
  static repairAndParse(jsonString) {
    // Handle null or undefined input
    if (!jsonString) {
      console.error("Empty JSON string provided");
      return {};
    }

    try {
      // First try direct parsing
      return JSON.parse(jsonString);
    } catch (initialError) {
      console.log("Initial JSON parsing failed, attempting repair");

      // Clean up markdown code blocks
      let cleanedJson = jsonString
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      try {
        return JSON.parse(cleanedJson);
      } catch (basicCleanupError) {
        console.log("Basic cleanup failed, attempting more aggressive repairs");

        try {
          // Common pattern fixes
          let repairedJson = cleanedJson
            // Fix missing quotes around property names
            .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
            // Fix trailing commas in arrays/objects
            .replace(/,(\s*[}\]])/g, "$1")
            // Add missing quotes around string values
            .replace(/:(\s*)([^{\[\d"\s][^,}\]]*)(,|}|])/g, ':"$2"$3')
            // Fix single quotes used instead of double quotes
            .replace(/'/g, '"')
            // Remove any line breaks within strings
            .replace(/:\s*"([^"]*)[\n\r]+([^"]*)"/g, ':"$1 $2"')
            // Remove extra spaces after colons
            .replace(/:\s+/g, ":")
            // Ensure boolean values are lowercase
            .replace(/"(true|false)"(?=,|}|])/gi, (match, p1) =>
              p1.toLowerCase()
            )
            // Ensure null is not quoted
            .replace(/"null"(?=,|}|])/g, "null");

          // Balance braces/brackets
          repairedJson = JSONHandler.balanceBraces(repairedJson);

          return JSON.parse(repairedJson);
        } catch (aggressiveRepairError) {
          console.error(
            "Aggressive JSON repair failed, attempting last resort structural repair"
          );

          try {
            // Last resort: structural repair
            const structurallyRepairedJson =
              JSONHandler.structuralRepair(cleanedJson);
            return JSON.parse(structurallyRepairedJson);
          } catch (structuralRepairError) {
            console.error(
              "All JSON repair attempts failed:",
              structuralRepairError
            );
            throw new Error(
              "Failed to parse or repair JSON after multiple attempts: " +
                initialError.message
            );
          }
        }
      }
    }
  }

  /**
   * Balance braces and brackets in a JSON string
   */
  static balanceBraces(jsonStr) {
    const stack = [];
    const pairs = { "{": "}", "[": "]", '"': '"' };
    let inString = false;
    let escaped = false;

    // First pass: count opening and closing braces/brackets
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];

      if (char === "\\") {
        escaped = !escaped;
        continue;
      }

      if (char === '"' && !escaped) {
        inString = !inString;
      }

      escaped = false;

      if (!inString) {
        if ("{[".includes(char)) {
          stack.push(char);
        } else if ("}]".includes(char)) {
          const expected = pairs[stack.pop()];
          if (char !== expected) {
            // Mismatched closing brace/bracket
            console.warn(
              `Mismatched braces at position ${i}: expected ${expected}, got ${char}`
            );
          }
        }
      }
    }

    // Add missing closing braces/brackets
    let result = jsonStr;
    while (stack.length > 0) {
      const openBrace = stack.pop();
      result += pairs[openBrace];
    }

    return result;
  }

  /**
   * Structural repair of JSON by extracting key parts
   */
  static structuralRepair(jsonStr) {
    // Look for the main JSON object structure
    const objectMatch = jsonStr.match(/{[\s\S]*}/);
    if (objectMatch) {
      // Found an object, attempt to extract and repair it
      let extracted = objectMatch[0];

      // Try to identify and repair key-value pairs
      const fixedKeyValues = [];
      const keyValueRegex =
        /"?(\w+)"?\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\{[\s\S]*?\}|\[[\s\S]*?\]|[^,}\]]*)/g;

      let match;
      while ((match = keyValueRegex.exec(extracted)) !== null) {
        let [full, key, value] = match;

        // Ensure key is properly quoted
        key = `"${key.replace(/"/g, "")}"`; // Remove existing quotes and add new ones

        // Try to determine value type and format appropriately
        if (value.trim().startsWith("{") || value.trim().startsWith("[")) {
          // Object or array value - leave as is
        } else if (
          value.trim().startsWith('"') ||
          value.trim().startsWith("'")
        ) {
          // String value - ensure proper quoting
          value = `"${value.replace(/^['"]|['"]$/g, "").replace(/"/g, '\\"')}"`;
        } else if (value.trim().match(/^(true|false|null)$/i)) {
          // Boolean or null value - ensure lowercase
          value = value.trim().toLowerCase();
        } else if (value.trim().match(/^-?\d+(\.\d+)?$/)) {
          // Numeric value - leave as is
        } else {
          // Assume it's a string if we can't determine type
          value = `"${value.trim()}"`;
        }

        fixedKeyValues.push(`${key}:${value}`);
      }

      // Reconstruct the JSON object
      return `{${fixedKeyValues.join(",")}}`;
    }

    // If we couldn't find an object structure, return an empty object
    return "{}";
  }

  /**
   * Validate and complete a wireframe JSON object
   */
  static validateWireframeJSON(json, defaultScreen = "Default Screen") {
    // Ensure we have an object
    if (!json || typeof json !== "object") {
      json = {};
    }

    // Ensure screen name exists
    json.screen = json.screen || defaultScreen;

    // For backward compatibility, ensure all arrays exist
    json.fields = Array.isArray(json.fields) ? json.fields : [];
    json.buttons = Array.isArray(json.buttons) ? json.buttons : [];
    json.links = Array.isArray(json.links) ? json.links : [];

    // Set default layout if not provided
    if (!json.layout) {
      json.layout = {
        width: 1440,
        height: 900,
        background: "#FFFFFF",
        padding: 40,
        contentAlignment: "center",
      };
    }

    // Add design system if not provided
    if (!json.designSystem) {
      json.designSystem = {
        typography: {
          fontFamily: "Inter, sans-serif",
          headings: { fontWeight: 700, color: "#333333" },
          body: { fontWeight: 400, color: "#555555" },
        },
        colors: {
          primary: "#3498DB",
          secondary: "#2ECC71",
          accent: "#9B59B6",
          background: "#FFFFFF",
          text: "#333333",
          error: "#E74C3C",
        },
        spacing: {
          xs: 4,
          sm: 8,
          md: 16,
          lg: 24,
          xl: 32,
        },
      };
    }

    // Add detailed positioning information to elements if missing
    json.fields = json.fields.map((field, index) => {
      if (typeof field === "string") {
        // Convert simple string fields to objects with positioning
        return {
          name: field,
          type: "text",
          placeholder: `Enter ${field.toLowerCase()}`,
          position: { x: "center", y: 200 + index * 80 },
          width: 300,
          height: 48,
          required: true,
          label: { text: field, position: "top" },
        };
      } else if (typeof field === "object") {
        // Ensure object fields have required properties
        return {
          name: field.name || `Field ${index + 1}`,
          type: field.type || "text",
          position: field.position || { x: "center", y: 200 + index * 80 },
          width: field.width || 300,
          height: field.height || 48,
          ...field,
        };
      }
      return field;
    });

    // Add detailed positioning to buttons if missing
    json.buttons = json.buttons.map((button, index) => {
      if (typeof button === "string") {
        // Convert simple string buttons to objects with positioning
        return {
          name: button,
          type: index === 0 ? "primary" : "secondary",
          position: { x: "center", y: 400 + index * 70 },
          width: 150,
          height: 48,
          backgroundColor: index === 0 ? "#3498DB" : "#FFFFFF",
          textColor: index === 0 ? "#FFFFFF" : "#3498DB",
          borderRadius: 8,
          action: "submit",
        };
      } else if (typeof button === "object") {
        // Ensure object buttons have required properties
        return {
          name: button.name || `Button ${index + 1}`,
          type: button.type || (index === 0 ? "primary" : "secondary"),
          position: button.position || { x: "center", y: 400 + index * 70 },
          width: button.width || 150,
          height: button.height || 48,
          ...button,
        };
      }
      return button;
    });

    // Add detailed positioning to links if missing
    json.links = json.links.map((link, index) => {
      if (typeof link === "string") {
        // Convert simple string links to objects with positioning
        return {
          name: link,
          position: { x: "center", y: 500 + index * 40 },
          fontSize: 14,
          textColor: "#3498DB",
          action: "navigate",
          destination: link.toLowerCase().replace(/\s+/g, "-"),
        };
      } else if (typeof link === "object") {
        // Ensure object links have required properties
        return {
          name: link.name || `Link ${index + 1}`,
          position: link.position || { x: "center", y: 500 + index * 40 },
          fontSize: link.fontSize || 14,
          ...link,
        };
      }
      return link;
    });

    return json;
  }
}

module.exports = {
  RobustLLMClient,
  JSONHandler,
};
