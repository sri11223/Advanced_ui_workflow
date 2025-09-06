const { get_retriever } = require("./utils/utils");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RobustLLMClient, JSONHandler } = require("./utils/robust-llm");
const express = require("express");
const router = express.Router();

let retriever = null;
let llmClient = null;

async function initializeRetrievers() {
  try {
    retriever = await get_retriever();
    console.log("Retrievers initialized successfully");

    // Initialize the robust LLM client
    llmClient = new RobustLLMClient({
      primaryProvider: "groq",
      fallbackProviders: ["gemini", "groq-backup"],
      maxRetries: 3,
      backoffFactor: 2,
      cacheDir: "./cache/llm-responses",
      maxCacheItems: 1000,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours cache TTL for wireframes
      cacheSaveInterval: 5 * 60 * 1000, // Save cache every 5 minutes
    });
    console.log(
      "Robust LLM client initialized with fallbacks and persistent cache"
    );
  } catch (error) {
    console.error("Failed to initialize retrievers:", error);
    throw error;
  }
}

// Initialize retrievers immediately
initializeRetrievers().catch(console.error);

// Function to generate wireframes using RAG
async function generateWireframe(prompt) {
  try {
    // Check if retrievers and LLM client are initialized
    if (!retriever || !llmClient) {
      throw new Error(
        "System is still initializing. Please try again in a few moments."
      );
    }

    console.log(`Generating wireframe for prompt: "${prompt}"`);

    // Break down the wireframe request into subquestions about UX principles
    const wireframeQueries = [
      `What are the essential UI elements for a ${prompt} screen?`,
      `What UX principles should be applied to a ${prompt} interface?`,
      `How should information hierarchy be structured for a ${prompt} wireframe?`,
      `What are best practices for form fields and buttons in a ${prompt} interface?`,
      `What navigation patterns work best for a ${prompt} screen?`,
    ];

    // Retrieve documents for these queries with error handling
    let results = [];
    try {
      results = await Promise.all(
        wireframeQueries.map((q) => retriever.invoke(q))
      );
    } catch (retrievalError) {
      console.error("Error retrieving documents:", retrievalError);
      // Continue with empty results, the LLM will use its general knowledge
      results = wireframeQueries.map(() => []);
    }

    // Fuse the results using reciprocal rank fusion
    const fusedScores = new Map();
    const k = 60;

    results.forEach((docs) => {
      docs.forEach((doc, rank) => {
        const docStr = JSON.stringify(doc);
        if (!fusedScores.has(docStr)) {
          fusedScores.set(docStr, 0);
        }
        fusedScores.set(docStr, fusedScores.get(docStr) + 1 / (rank + k));
      });
    });

    const topDocuments = Array.from(fusedScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([docStr]) => JSON.parse(docStr));

    // Generate wireframe based on retrieved UX principles
    const wireframeTemplate = PromptTemplate.fromTemplate(
      `You are a wireframe generator with deep knowledge of UX design principles. 
      Based on the UX principles and guidelines below, create a detailed JSON object describing a wireframe for: {prompt}
      
      The wireframe should follow best practices from these UX design documents:
      
      Context from UX documents: {context}
      
      Generate ONLY a JSON object with the following structure (no explanation, just the JSON):
      {{
        "screen": "Name of the screen (e.g., 'Login Screen', 'Dashboard', etc.)",
        "layout": {{
          "width": 1440,
          "height": 900,
          "background": "#FFFFFF",
          "padding": 40,
          "contentAlignment": "center"
        }},
        "sections": [
          {{
            "name": "Header",
            "position": {{ "x": 0, "y": 0 }},
            "width": "100%",
            "height": 80,
            "backgroundColor": "#F5F5F5",
            "elements": [
              {{ "type": "logo", "position": {{ "x": 40, "y": 20 }}, "width": 120, "height": 40 }}
            ]
          }},
          {{
            "name": "Main Content",
            "position": {{ "x": 0, "y": 120 }},
            "width": "100%",
            "alignment": "center"
          }}
        ],
        "fields": [
          {{
            "name": "Username",
            "type": "text",
            "placeholder": "Enter username",
            "position": {{ "x": "center", "y": 200 }},
            "width": 300,
            "height": 48,
            "required": true,
            "label": {{ "text": "Username", "position": "top" }}
          }}
        ],
        "buttons": [
          {{
            "name": "Submit",
            "type": "primary",
            "position": {{ "x": "center", "y": 400 }},
            "width": 150,
            "height": 48,
            "backgroundColor": "#3498DB",
            "textColor": "#FFFFFF",
            "borderRadius": 8,
            "action": "submit"
          }}
        ],
        "links": [
          {{
            "name": "Register Now",
            "position": {{ "x": "center", "y": 470 }},
            "fontSize": 14,
            "textColor": "#3498DB",
            "action": "navigate",
            "destination": "register"
          }}
        ],
        "designSystem": {{
          "typography": {{
            "fontFamily": "Inter, sans-serif",
            "headings": {{ "fontWeight": 700, "color": "#333333" }},
            "body": {{ "fontWeight": 400, "color": "#555555" }}
          }},
          "colors": {{
            "primary": "#3498DB",
            "secondary": "#2ECC71",
            "accent": "#9B59B6",
            "background": "#FFFFFF",
            "text": "#333333",
            "error": "#E74C3C"
          }},
          "spacing": {{
            "xs": 4,
            "sm": 8,
            "md": 16,
            "lg": 24,
            "xl": 32
          }}
        }}
      }}
      
      The JSON must be properly formatted with no additional text or explanation.
      Ensure your wireframe applies appropriate UX principles like information hierarchy, clear navigation, and consistent design patterns.
      Make sure to include detailed position information, sizes, colors, and styling to make it useful for automatic generation in Figma.`
    );

    const wireframePrompt = await wireframeTemplate.format({
      prompt: prompt,
      context: topDocuments.map((doc) => doc.pageContent || "").join("\n\n"),
    });

    console.log("Sending wireframe generation request to LLM client");
    const responseContent = await llmClient.invoke(wireframePrompt);

    // Extract and parse the JSON with robust error handling
    try {
      console.log("Attempting to extract and parse JSON from LLM response");

      // Extract JSON from the response if it contains other text
      const jsonMatch = responseContent.content?.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch
        ? jsonMatch[0]
        : responseContent.content || responseContent;

      // Use our robust JSON handler to parse and validate
      const wireframeJson = JSONHandler.repairAndParse(jsonStr);
      const validatedJson = JSONHandler.validateWireframeJSON(
        wireframeJson,
        `${prompt} Screen`
      );

      console.log("Successfully generated wireframe JSON");
      return validatedJson;
    } catch (jsonError) {
      console.error("Error processing wireframe JSON:", jsonError);

      // Attempt recovery with a simpler prompt
      console.log("Attempting recovery with simpler prompt");
      try {
        const simplePrompt = `Create a simple JSON wireframe for a "${prompt}" screen with these properties: "screen", "fields", "buttons", and "links".`;
        const fallbackResponse = await llmClient.invoke(simplePrompt, {
          skipCache: true,
        });

        // Parse and validate the fallback response
        const fallbackJson = JSONHandler.repairAndParse(
          fallbackResponse.content || fallbackResponse
        );
        return JSONHandler.validateWireframeJSON(
          fallbackJson,
          `${prompt} Screen`
        );
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);

        // Return a minimal valid wireframe as last resort
        return {
          screen: `${prompt} Screen`,
          layout: {
            width: 1440,
            height: 900,
            background: "#FFFFFF",
            padding: 40,
            contentAlignment: "center",
          },
          fields: ["Input Field 1", "Input Field 2"],
          buttons: ["Submit"],
          links: ["Help", "Back"],
          designSystem: {
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
          },
        };
      }
    }
  } catch (error) {
    console.error("Error generating wireframe:", error);
    throw error;
  }
}

async function chat(Question) {
  try {
    // Check if retrievers and LLM client are initialized
    if (!retriever || !llmClient) {
      return "System is still initializing. Please try again in a few moments.";
    }

    const llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      maxTokens: undefined,
      maxRetries: 5,
    });

    const generateQueries = async (question) => {
      try {
        const prompt = PromptTemplate.fromTemplate(
          `You are a helpful assistant that generates exactly three distinct and concise questions related to an input question.
          The goal is to break the input question into three self-contained queries that can be answered independently. Ensure that:
          1. Each query is a complete question.
          2. No additional explanation or context is included.
    
          Input Question: {question}
          Generated Queries:
          1.
          2.
          3.`
        );

        const formattedPrompt = await prompt.format({ question: Question });
        const response = await llmClient.invoke(formattedPrompt);
        const queries = response.content?.match(/^\d+\.\s.*?\?$/gm) || [];
        return queries;
      } catch (error) {
        console.error("Error generating queries:", error);
        // Fallback to simpler queries derived from the original question
        return [
          `What are the key concepts related to ${Question}?`,
          `How does ${Question} apply to UX design?`,
          `What are best practices for ${Question}?`,
        ];
      }
    };

    const retrieveDocuments = async (subQuestions) => {
      try {
        if (!retriever) {
          console.error("retriever is not initialized yet");
          return [];
        }

        const results = await Promise.all(
          subQuestions.map((q) => retriever.invoke(q))
        );
        return results;
      } catch (error) {
        console.error("Error retrieving documents:", error);
        return [];
      }
    };

    const reciprocalRankFusion = async (results, k = 60) => {
      try {
        const fusedScores = new Map();

        results.forEach((docs) => {
          docs.forEach((doc, rank) => {
            const docStr = JSON.stringify(doc);
            if (!fusedScores.has(docStr)) {
              fusedScores.set(docStr, 0);
            }
            fusedScores.set(docStr, fusedScores.get(docStr) + 1 / (rank + k));
          });
        });

        return Array.from(fusedScores.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([docStr]) => JSON.parse(docStr));
      } catch (error) {
        console.error("Error in reciprocal rank fusion:", error);
        return [];
      }
    };

    // Generate subquestions for better retrieval
    const subQuestions = await generateQueries(Question);
    console.log("Generated subquestions:", subQuestions);

    // Retrieve documents for each subquestion
    const allDocuments = await retrieveDocuments(subQuestions);

    // Fuse results for better quality
    const topDocuments = await reciprocalRankFusion(allDocuments);

    const template = PromptTemplate.fromTemplate(
      `You are a UX Design expert chatbot that understands the provided context below and gives a clear, helpful response to the user by following these guidelines:

        Question: {question}  

        1. **If the question does NOT relate to UX design, UI design, wireframes, user experience, or related design concepts, respond ONLY with:**  
          **"As a UX design assistant, I can only provide information about user experience design, interface design, wireframing, and related topics."**  

        2. **If the user's question is related to greetings, just greet them appropriately and briefly mention that you can help with UX design questions.**  

        3. **If the question is related to UX/UI design, provide a comprehensive answer that includes (as applicable):**  
          - Clear definitions of concepts
          - Practical examples of implementation
          - Best practices and principles
          - How to apply these concepts in real projects

        4. **For wireframe-related questions:**
          - Explain the purpose and importance of wireframes
          - Describe different types of wireframes (low-fidelity, high-fidelity)
          - Provide guidance on wireframing tools or techniques
          - Include tips for effective wireframe creation

        5. **Give responses based on the question. You may include or exclude the above points based on the question's needs. If the question doesn't require these points, provide only the necessary response.**

        6. **Use the below context from UX design documents for replying. If the context doesn't cover the question adequately, use your general knowledge about UX design but make it clear which information is from the documents and which is general knowledge.**

        Context: {context} `
    );

    const finalPrompt = await template.format({
      question: Question,
      context: topDocuments.map((doc) => doc.pageContent || "").join("\n\n"),
    });

    try {
      // Use our robust LLM client with fallback capability
      const response = await llmClient.invoke(finalPrompt);
      return response.content || response;
    } catch (error) {
      console.error("Error getting response from LLM:", error);

      // Fallback to a simple response if all LLM providers fail
      return (
        "I'm sorry, I'm having trouble processing your request right now. Your question was about '" +
        Question +
        "'. Please try asking in a different way or try again later."
      );
    }
  } catch (error) {
    console.error("Error in chat function:", error);
    return "An error occurred while processing your request.";
  }
}

router.post("/", async (req, res) => {
  try {
    // Wait for retrievers and LLM client to be initialized (with timeout)
    let attempts = 0;
    const maxAttempts = 15; // 15 seconds timeout

    while ((!retriever || !llmClient) && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!retriever || !llmClient) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again later.",
        details: "System is still initializing resources.",
      });
    }

    let { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    question = question.toLowerCase();

    try {
      const answer = await chat(question);
      res.status(200).json({ answer });
    } catch (chatError) {
      console.error("Error in chat processing:", chatError);

      // Attempt direct fallback response if chat processing fails
      try {
        const directQuestion = `Give a brief answer about ${question} in the context of UX design.`;
        const fallbackResponse = await llmClient.invoke(directQuestion, {
          skipCache: true,
        });
        const fallbackAnswer =
          fallbackResponse.content ||
          fallbackResponse ||
          "I'm having trouble answering that question right now. Please try again later.";

        res.status(200).json({
          answer: fallbackAnswer,
          fallback: true,
        });
      } catch (fallbackError) {
        // If even the fallback fails, return a basic response
        res.status(200).json({
          answer:
            "I apologize, but I'm currently experiencing technical difficulties. Your question was received, but I'm unable to process it at this time. Please try again later.",
          fallback: true,
        });
      }
    }
  } catch (error) {
    console.error("Error in RAG router:", error);
    res.status(500).json({
      error: "An unexpected error occurred",
      message: error.message,
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    systemInitialized: {
      retriever: !!retriever,
      llmClient: !!llmClient,
    },
    providers: llmClient ? Object.keys(llmClient.clients) : [],
    uptime: process.uptime(),
  });
});

// Endpoint for generating wireframes using RAG
router.post("/generate-wireframe", async (req, res) => {
  try {
    // Wait for retrievers to be initialized (with timeout)
    let attempts = 0;
    const maxAttempts = 15; // 15 seconds timeout

    while ((!retriever || !llmClient) && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!retriever || !llmClient) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again later.",
        details: "System is still initializing resources.",
      });
    }

    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    try {
      const wireframe = await generateWireframe(prompt);
      res.status(200).json(wireframe);
    } catch (wireframeError) {
      console.error("Error in wireframe generation:", wireframeError);

      // Return a fallback wireframe if generation fails
      res.status(200).json({
        screen: `${prompt} Screen`,
        layout: {
          width: 1440,
          height: 900,
          background: "#FFFFFF",
          padding: 40,
          contentAlignment: "center",
        },
        fields: [
          {
            name: "Input Field",
            type: "text",
            position: { x: "center", y: 200 },
            width: 300,
            height: 48,
          },
        ],
        buttons: [
          {
            name: "Submit",
            type: "primary",
            position: { x: "center", y: 300 },
            width: 150,
            height: 48,
          },
        ],
        links: [
          {
            name: "Help",
            position: { x: "center", y: 370 },
          },
        ],
        designSystem: {
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
        },
        fallback: true,
        error: wireframeError.message,
      });
    }
  } catch (error) {
    console.error("Fatal error in wireframe endpoint:", error);
    res.status(500).json({
      error: "An unexpected error occurred",
      message: error.message,
    });
  }
});

/**
 * Safely close the LLM client and save the cache
 * Used during graceful server shutdown
 */
async function closeLLMClient() {
  if (llmClient) {
    console.log("Closing LLM client and saving cache...");
    try {
      await llmClient.close();
      console.log("LLM client closed and cache saved successfully");
    } catch (error) {
      console.error("Error closing LLM client:", error);
      throw error;
    }
  } else {
    console.log("No LLM client to close");
  }
  return true;
}

module.exports = router;
module.exports.generateWireframe = generateWireframe;
module.exports.closeLLMClient = closeLLMClient;

/**
 * Update an existing wireframe based on user prompt
 * @param {Object} existingWireframe - The existing wireframe JSON to update
 * @param {string} prompt - The user's prompt describing desired changes
 * @returns {Promise<Object>} - The updated wireframe JSON
 */
async function updateWireframe(existingWireframe, prompt) {
  try {
    // Check if retrievers and LLM client are initialized
    if (!retriever || !llmClient) {
      throw new Error(
        "System is still initializing. Please try again in a few moments."
      );
    }

    console.log(`Updating wireframe based on prompt: "${prompt}"`);

    // Get UX principles relevant to the user's prompt
    let relevantDocs = [];
    try {
      relevantDocs = await retriever.invoke(prompt);
    } catch (retrievalError) {
      console.error("Error retrieving documents for update:", retrievalError);
      // Continue with empty results, the LLM will use its general knowledge
      relevantDocs = [];
    }

    // Convert docs to text
    const contextText = relevantDocs
      .map((doc) => doc.pageContent || "")
      .join("\n\n");

    // Create a prompt template for updating the wireframe
    const updateTemplate = PromptTemplate.fromTemplate(
      `You are a wireframe editor with deep knowledge of UX design principles.
      You are given an existing wireframe JSON and a user's prompt requesting changes to the wireframe.
      Your task is to update the wireframe JSON based on the user's prompt, applying appropriate UX principles.
      If the prompt asks you to create a new wireframe, don't create anything new - just return the existing wireframe unchanged.
      
      The wireframe should follow best practices from these UX design documents:
      
      Context from UX documents: {context}
      
      Existing wireframe JSON:
      {existingWireframe}
      
      User's requested changes:
      {prompt}
      
      Generate ONLY an updated JSON object with the same structure as the existing wireframe.
      The JSON must be properly formatted with no additional text or explanation.
      Ensure your updated wireframe applies appropriate UX principles and maintains design consistency.
      Do not add new fields or properties that weren't in the original JSON structure.`
    );

    const updatePrompt = await updateTemplate.format({
      context: contextText,
      existingWireframe: JSON.stringify(existingWireframe, null, 2),
      prompt: prompt,
    });

    console.log("Sending wireframe update request to LLM client");
    const responseContent = await llmClient.invoke(updatePrompt);

    // Debug the full response structure
    console.log("Full LLM response:", JSON.stringify(responseContent, null, 2));

    // Extract the actual content from LangChain's message format
    let responseString;
    if (responseContent && typeof responseContent === "object") {
      if (
        responseContent.lc === 1 &&
        responseContent.type === "constructor" &&
        responseContent.id &&
        responseContent.id.includes("AIMessage") &&
        responseContent.kwargs &&
        responseContent.kwargs.content
      ) {
        // It's a LangChain AIMessage format
        responseString = responseContent.kwargs.content;
      } else if (responseContent.content) {
        // It has a direct content property
        responseString = responseContent.content;
      } else {
        // Fallback to stringify
        responseString = JSON.stringify(responseContent);
      }
    } else if (typeof responseContent === "string") {
      responseString = responseContent;
    } else {
      responseString = String(responseContent);
    }

    console.log(
      "Extracted response string:",
      responseString.substring(0, 200) + "..."
    );

    // Parse the response to extract the JSON wireframe
    try {
      // Import and use the JSONHandler.repairAndParse method
      const updatedWireframe = JSONHandler.repairAndParse(responseString);

      if (!updatedWireframe) {
        throw new Error(
          "Failed to parse the updated wireframe JSON from LLM response"
        );
      }

      console.log("Successfully updated wireframe based on user prompt");
      return updatedWireframe;
    } catch (parseError) {
      console.error("Error parsing the LLM response:", parseError);
      throw new Error(
        "Failed to parse the updated wireframe JSON: " + parseError.message
      );
    }
  } catch (error) {
    console.error("Error updating wireframe:", error);
    throw error;
  }
}

module.exports.updateWireframe = updateWireframe;
