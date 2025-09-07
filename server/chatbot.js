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
      
      IMPORTANT: Your response MUST follow the EXACT structure with a top-level "json" key.
      
      The Figma plugin in our project ONLY supports a FLAT array of components. It does NOT support nested components 
      like containers with sub-components. Each component must be at the top level in the components array.
      The size of the figma frame is 360x720 and position (x, y) of each component should be specified to avoid overlaps.

      Generate ONLY a JSON object with the following structure (no explanation, just the JSON):
      {{
        "json": {{
          "title": "Name of the screen (e.g., 'Login Screen', 'Dashboard', etc.)",
          "components": [
            {{
              "type": "text",
              "label": "Text Label",
              "x": 150,
              "y": 50,
              "fontSize": 24,
              "fontWeight": "bold"
            }},
            {{
              "type": "input",
              "label": "Input Label",
              "x": 50,
              "y": 120,
              "width": 300,
              "height": 40,
              "placeholder": "Placeholder Text"
            }},
            {{
              "type": "button",
              "label": "Button Text",
              "x": 50,
              "y": 280,
              "width": 300,
              "backgroundColor": "#337ab7",
              "textColor": "#ffffff"
            }}
          ]
        }}
      }}
      
      STRICTLY follow these requirements:
      1. RETURN ONLY the JSON object with the "json" key at the top level
      2. Use ONLY these component types: "text", "input", "button"
      3. ALL components must be in a FLAT array (no nested components or containers)
      4. Button components must use "label" for the button text (not "text")
      5. DO NOT include any explanation text before or after the JSON
      6. Ensure the JSON is valid and properly formatted`
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
      // First, try to clean up any markdown code blocks
      const cleanedResponse = (responseContent.content || responseContent)
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // Use our robust JSON handler to parse and validate
      let wireframeJson = JSONHandler.repairAndParse(cleanedResponse);

      // Ensure the wireframe has the correct structure with top-level "json" key
      if (!wireframeJson.json) {
        console.log("Wireframe missing top-level 'json' key, wrapping it");
        wireframeJson = {
          json: {
            title: `${prompt} Screen`,
            components: [],
          },
        };

        // Try to convert the old format to the new format
        if (wireframeJson.screen) {
          wireframeJson.json.title = wireframeJson.screen;
        }

        // Convert fields to components if they exist
        if (Array.isArray(wireframeJson.fields)) {
          wireframeJson.json.components = wireframeJson.fields.map((field) => {
            if (typeof field === "string") {
              return {
                type: "input",
                label: field,
                x: 50,
                y: 120,
                width: 300,
                height: 40,
                placeholder: `Enter ${field}`,
              };
            } else {
              return {
                type: field.type || "input",
                label: field.name || field.label || "Field",
                x: field.position ? field.position.x : 50,
                y: field.position ? field.position.y : 120,
                width: field.width || 300,
                height: field.height || 40,
                placeholder: field.placeholder || field.name || "Enter text",
              };
            }
          });
        }

        // Add buttons as components if they exist
        if (Array.isArray(wireframeJson.buttons)) {
          wireframeJson.buttons.forEach((button, index) => {
            if (typeof button === "string") {
              wireframeJson.json.components.push({
                type: "button",
                label: button,
                x: 50,
                y: 200 + index * 60,
                width: 300,
                backgroundColor: "#337ab7",
                textColor: "#ffffff",
              });
            } else {
              wireframeJson.json.components.push({
                type: "button",
                label: button.name || button.text || "Button",
                x: button.position ? button.position.x : 50,
                y: button.position ? button.position.y : 200 + index * 60,
                width: button.width || 300,
                backgroundColor: button.backgroundColor || "#337ab7",
                textColor: button.textColor || "#ffffff",
              });
            }
          });
        }
      }

      // Flatten any nested components structures
      if (wireframeJson.json && wireframeJson.json.components) {
        const flattenedComponents = [];

        const flattenComponents = (components, parentX = 0, parentY = 0) => {
          components.forEach((component) => {
            // Skip if it's not an object
            if (typeof component !== "object") return;

            // Create a copy of the component without nested components
            const flatComponent = { ...component };

            // Adjust x and y based on parent coordinates if they're nested
            if (parentX !== 0 || parentY !== 0) {
              flatComponent.x = (flatComponent.x || 0) + parentX;
              flatComponent.y = (flatComponent.y || 0) + parentY;
            }

            // Check for unsupported component types and convert them
            if (!["text", "input", "button"].includes(flatComponent.type)) {
              // Convert container/form to a text label
              if (
                flatComponent.type === "container" ||
                flatComponent.type === "form"
              ) {
                flatComponent.type = "text";
                flatComponent.label =
                  flatComponent.label ||
                  flatComponent.type.charAt(0).toUpperCase() +
                    flatComponent.type.slice(1);
                flatComponent.fontSize = flatComponent.fontSize || 16;
              } else {
                // Default to input for unknown types
                flatComponent.type = "input";
                flatComponent.label = flatComponent.label || flatComponent.type;
                flatComponent.placeholder =
                  flatComponent.placeholder || "Enter text";
              }
            }

            // Remove any nested components array
            const nestedComponents = flatComponent.components;
            delete flatComponent.components;

            // Ensure button text is in label property
            if (
              flatComponent.type === "button" &&
              flatComponent.text &&
              !flatComponent.label
            ) {
              flatComponent.label = flatComponent.text;
              delete flatComponent.text;
            }

            // Add to flattened components
            flattenedComponents.push(flatComponent);

            // Process nested components if they exist
            if (Array.isArray(nestedComponents)) {
              flattenComponents(
                nestedComponents,
                flatComponent.x,
                flatComponent.y
              );
            }
          });
        };

        flattenComponents(wireframeJson.json.components);
        wireframeJson.json.components = flattenedComponents;
      }

      console.log("Successfully generated wireframe JSON");
      return wireframeJson;
    } catch (jsonError) {
      console.error("Error processing wireframe JSON:", jsonError);

      // Attempt recovery with a simpler prompt
      console.log("Attempting recovery with simpler prompt");
      try {
        const simplePrompt = `Create a JSON wireframe for a "${prompt}" screen. IMPORTANT: The response MUST have a top-level "json" key containing "title" and "components" array. Example: {"json": {"title": "Screen Title", "components": [{"type": "text", "label": "Text", "x": 50, "y": 50}]}}`;
        const fallbackResponse = await llmClient.invoke(simplePrompt, {
          skipCache: true,
        });

        // Parse and validate the fallback response
        const cleanedResponse = (fallbackResponse.content || fallbackResponse)
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        let fallbackJson = JSONHandler.repairAndParse(cleanedResponse);

        // Ensure the fallback has the correct structure
        if (!fallbackJson.json) {
          console.log("Fallback missing json key, creating minimal structure");
          fallbackJson = {
            json: {
              title: `${prompt} Screen`,
              components: [
                {
                  type: "text",
                  label: `${prompt} Screen`,
                  x: 150,
                  y: 50,
                  fontSize: 24,
                  fontWeight: "bold",
                },
                {
                  type: "input",
                  label: "Input Field",
                  x: 50,
                  y: 120,
                  width: 300,
                  height: 40,
                  placeholder: "Enter text",
                },
                {
                  type: "button",
                  label: "Submit",
                  x: 50,
                  y: 200,
                  width: 300,
                  backgroundColor: "#337ab7",
                  textColor: "#ffffff",
                },
              ],
            },
          };
        }

        return fallbackJson;
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);

        // Return a minimal valid wireframe as last resort
        return {
          json: {
            title: `${prompt} Screen`,
            components: [
              {
                type: "text",
                label: `${prompt} Screen`,
                x: 150,
                y: 50,
                fontSize: 24,
                fontWeight: "bold",
              },
              {
                type: "input",
                label: "Input Field 1",
                x: 50,
                y: 120,
                width: 300,
                height: 40,
                placeholder: "Enter text",
              },
              {
                type: "input",
                label: "Input Field 2",
                x: 50,
                y: 180,
                width: 300,
                height: 40,
                placeholder: "Enter text",
              },
              {
                type: "button",
                label: "Submit",
                x: 50,
                y: 240,
                width: 300,
                backgroundColor: "#337ab7",
                textColor: "#ffffff",
              },
            ],
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
        json: {
          title: `${prompt} Screen`,
          components: [
            {
              type: "text",
              label: `${prompt} Screen`,
              x: 150,
              y: 50,
              fontSize: 24,
              fontWeight: "bold",
            },
            {
              type: "input",
              label: "Input Field",
              x: 50,
              y: 120,
              width: 300,
              height: 40,
              placeholder: "Enter text",
            },
            {
              type: "button",
              label: "Submit",
              x: 50,
              y: 180,
              width: 300,
              backgroundColor: "#337ab7",
              textColor: "#ffffff",
            },
          ],
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
      
      IMPORTANT: Your response MUST follow the EXACT same JSON structure as the input, including keeping the top-level "json" key.
      
      The Figma plugin in our project ONLY supports a FLAT array of components. It does NOT support nested components 
      like containers with sub-components. Each component must be at the top level in the components array.
      
      The REQUIRED output format is:
      {{
        "json": {{
          "title": "Screen Name",
          "components": [
            {{
              "type": "text",
              "label": "Text Label",
              "x": 150,
              "y": 50,
              "fontSize": 24,
              "fontWeight": "bold"
            }},
            {{
              "type": "input",
              "label": "Input Label",
              "x": 50,
              "y": 120,
              "width": 300,
              "height": 40,
              "placeholder": "Placeholder Text"
            }},
            {{
              "type": "button",
              "label": "Button Text",
              "x": 50,
              "y": 280,
              "width": 300,
              "backgroundColor": "#337ab7",
              "textColor": "#ffffff"
            }}
            // other components...
          ]
        }}
      }}
      
      STRICTLY follow these requirements:
      1. RETURN ONLY the JSON object with the "json" key at the top level
      2. Use ONLY these component types: "text", "input", "button"
      3. ALL components must be in a FLAT array (no nested components or containers)
      4. Button components must use "label" for the button text (not "text")
      5. DO NOT include any explanation text before or after the JSON
      6. Ensure the JSON is valid and properly formatted`
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
      // First, try to clean up any markdown code blocks
      let cleanedResponse = responseString
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      console.log("Cleaned response length:", cleanedResponse.length);
      console.log("First 200 chars:", cleanedResponse.substring(0, 200));

      // Check around position 1022 if the response is long enough
      if (cleanedResponse.length > 1000) {
        console.log(
          "Content around position 1022:",
          cleanedResponse.substring(1000, 1050)
        );
      }

      // Pre-clean common JSON issues before sending to JSONHandler
      cleanedResponse = cleanedResponse
        // Remove any text before the first {
        .replace(/^[^{]*/, "")
        // Remove any text after the last }
        .replace(/}[^}]*$/, "}")
        // Fix common quote issues
        .replace(/'/g, '"')
        // Fix unquoted property names
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        // Remove trailing commas
        .replace(/,(\s*[}\]])/g, "$1")
        // Fix line breaks in strings
        .replace(/:\s*"([^"]*)[\n\r]+([^"]*)"/g, ':"$1 $2"');

      console.log("Pre-cleaned response length:", cleanedResponse.length);

      // Import and use the JSONHandler.repairAndParse method
      let parsedWireframe;
      try {
        parsedWireframe = JSONHandler.repairAndParse(cleanedResponse);
      } catch (jsonError) {
        console.error(
          "JSONHandler failed, trying manual fallback:",
          jsonError.message
        );

        // Log more details about the problematic JSON
        const errorMatch = jsonError.message.match(/position (\d+)/);
        if (errorMatch) {
          const errorPos = parseInt(errorMatch[1]);
          console.log(
            "Error position context:",
            cleanedResponse.substring(Math.max(0, errorPos - 50), errorPos + 50)
          );
        }

        // Try a more aggressive manual cleanup
        try {
          let manuallyCleanedJson = cleanedResponse
            // Remove any remaining markdown or comments
            .replace(/\/\/.*$/gm, "")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            // Ensure proper boolean and null values
            .replace(/:\s*true(?=\s*[,}\]])/gi, ": true")
            .replace(/:\s*false(?=\s*[,}\]])/gi, ": false")
            .replace(/:\s*null(?=\s*[,}\]])/gi, ": null")
            // Fix numbers that might have quotes
            .replace(/:\s*"(\d+)"(?=\s*[,}\]])/g, ": $1")
            // Remove any duplicate commas
            .replace(/,+/g, ",")
            // Fix spacing issues
            .replace(/\s+/g, " ");

          console.log("Attempting manual JSON.parse with cleaned JSON");
          parsedWireframe = JSON.parse(manuallyCleanedJson);
          console.log("Manual JSON parsing succeeded!");
        } catch (manualError) {
          console.error(
            "Manual JSON parsing also failed:",
            manualError.message
          );

          // Last resort: try to extract just the components array if it exists
          try {
            const componentsMatch = cleanedResponse.match(
              /"components"\s*:\s*\[([\s\S]*?)\]/
            );
            if (componentsMatch) {
              console.log("Attempting to extract just components array...");
              const componentsJson = `{"title": "Fallback Wireframe", "components": [${componentsMatch[1]}]}`;
              const fallbackJson = JSON.parse(componentsJson);
              parsedWireframe = { json: fallbackJson };
              console.log(
                "Successfully extracted components array as fallback"
              );
            } else {
              throw new Error(
                `Unable to parse JSON. Error: ${manualError.message}`
              );
            }
          } catch (fallbackError) {
            throw new Error(
              `All JSON parsing attempts failed. Last error: ${fallbackError.message}`
            );
          }
        }
      }

      // Log the parsed structure for debugging
      console.log("Parsed wireframe keys:", Object.keys(parsedWireframe));

      // Validate that the wireframe has the correct structure
      if (!parsedWireframe.json) {
        console.log("Wireframe missing top-level 'json' key, wrapping it");
        // If the response didn't include the top-level 'json' key, add it
        parsedWireframe = { json: parsedWireframe };
      }

      // Validate that the structure inside json is correct
      if (!parsedWireframe.json.components && parsedWireframe.json.fields) {
        console.log(
          "Converting old format (fields) to new format (components)"
        );
        // Convert from the old format to the new format if needed
        parsedWireframe.json.components = parsedWireframe.json.fields.map(
          (field) => {
            return {
              type: field.type || "input",
              label: field.name || field.label || "Field",
              x: field.position ? field.position.x : 50,
              y: field.position ? field.position.y : 100,
              width: field.width || 300,
              height: field.height || 40,
              placeholder: field.placeholder || field.label,
            };
          }
        );

        // Add buttons if they exist
        if (parsedWireframe.json.buttons) {
          parsedWireframe.json.buttons.forEach((button) => {
            parsedWireframe.json.components.push({
              type: "button",
              label: button.name || button.text || "Button",
              x: button.position ? button.position.x : 50,
              y: button.position ? button.position.y : 200,
              width: button.width || 300,
              backgroundColor: button.backgroundColor || "#337ab7",
              textColor: button.textColor || "#ffffff",
            });
          });
        }
      }

      // Flatten any nested components structures
      if (parsedWireframe.json && parsedWireframe.json.components) {
        const flattenedComponents = [];

        const flattenComponents = (components, parentX = 0, parentY = 0) => {
          components.forEach((component) => {
            // Skip if it's not an object
            if (typeof component !== "object") return;

            // Create a copy of the component without nested components
            const flatComponent = { ...component };

            // Adjust x and y based on parent coordinates if they're nested
            if (parentX !== 0 || parentY !== 0) {
              flatComponent.x = (flatComponent.x || 0) + parentX;
              flatComponent.y = (flatComponent.y || 0) + parentY;
            }

            // Check for unsupported component types and convert them
            if (!["text", "input", "button"].includes(flatComponent.type)) {
              // Convert container/form to a text label
              if (
                flatComponent.type === "container" ||
                flatComponent.type === "form"
              ) {
                flatComponent.type = "text";
                flatComponent.label =
                  flatComponent.label ||
                  flatComponent.type.charAt(0).toUpperCase() +
                    flatComponent.type.slice(1);
                flatComponent.fontSize = flatComponent.fontSize || 16;
              } else {
                // Default to input for unknown types
                flatComponent.type = "input";
                flatComponent.label = flatComponent.label || flatComponent.type;
                flatComponent.placeholder =
                  flatComponent.placeholder || "Enter text";
              }
            }

            // Remove any nested components array
            const nestedComponents = flatComponent.components;
            delete flatComponent.components;

            // Ensure button text is in label property
            if (
              flatComponent.type === "button" &&
              flatComponent.text &&
              !flatComponent.label
            ) {
              flatComponent.label = flatComponent.text;
              delete flatComponent.text;
            }

            // Add to flattened components
            flattenedComponents.push(flatComponent);

            // Process nested components if they exist
            if (Array.isArray(nestedComponents)) {
              flattenComponents(
                nestedComponents,
                flatComponent.x,
                flatComponent.y
              );
            }
          });
        };

        flattenComponents(parsedWireframe.json.components);
        parsedWireframe.json.components = flattenedComponents;
      }

      // Final validation of the wireframe structure
      if (!parsedWireframe.json || !parsedWireframe.json.components) {
        console.log("Creating minimal wireframe structure");
        // Create a minimal valid structure
        parsedWireframe = {
          json: {
            title: "Updated Wireframe",
            components: [
              {
                type: "text",
                label: "Updated based on user prompt",
                x: 150,
                y: 50,
                fontSize: 24,
                fontWeight: "bold",
              },
            ],
          },
        };
      }

      // Ensure title exists
      if (!parsedWireframe.json.title) {
        parsedWireframe.json.title = "Updated Wireframe";
      }

      console.log("Final wireframe structure:", Object.keys(parsedWireframe));
      console.log("JSON sub-structure:", Object.keys(parsedWireframe.json));

      console.log("Successfully updated wireframe based on user prompt");
      return parsedWireframe;
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
