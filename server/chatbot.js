const { get_retriever } = require("./utils/utils");
const { ChatGroq } = require("@langchain/groq");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const express = require("express");
const router = express.Router();

let retriever = null;

async function initializeRetrievers() {
  try {
    retriever = await get_retriever();
    console.log("Retrievers initialized successfully");
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
    // Check if retrievers are initialized
    if (!retriever) {
      throw new Error(
        "System is still initializing. Please try again in a few moments."
      );
    }

    const llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      maxTokens: undefined,
      maxRetries: 5,
    });

    // Break down the wireframe request into subquestions about UX principles
    const wireframeQueries = [
      `What are the essential UI elements for a ${prompt} screen?`,
      `What UX principles should be applied to a ${prompt} interface?`,
      `How should information hierarchy be structured for a ${prompt} wireframe?`,
      `What are best practices for form fields and buttons in a ${prompt} interface?`,
      `What navigation patterns work best for a ${prompt} screen?`,
    ];

    // Retrieve documents for these queries
    const results = await Promise.all(
      wireframeQueries.map((q) => retriever.invoke(q))
    );

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
      context: topDocuments,
    });

    const wireframeResponse = await llm.invoke(wireframePrompt);
    const outputParser = new StringOutputParser();
    const parsedOutput = await outputParser.parse(wireframeResponse);

    // Extract the JSON object from the response
    const jsonMatch = parsedOutput.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to generate valid JSON wireframe");
    }

    const jsonStr = jsonMatch[0];

    try {
      // Clean the JSON string to remove markdown code blocks if present
      const cleanedJsonStr = jsonStr
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // Parse the JSON and ensure it has the required structure
      const wireframeJson = JSON.parse(cleanedJsonStr);

      // Ensure the JSON has the required fields
      if (!wireframeJson.screen) {
        throw new Error("Generated JSON is missing screen name");
      }

      // For backward compatibility, ensure all arrays exist
      wireframeJson.fields = Array.isArray(wireframeJson.fields)
        ? wireframeJson.fields
        : [];
      wireframeJson.buttons = Array.isArray(wireframeJson.buttons)
        ? wireframeJson.buttons
        : [];
      wireframeJson.links = Array.isArray(wireframeJson.links)
        ? wireframeJson.links
        : [];

      // Set default layout if not provided
      if (!wireframeJson.layout) {
        wireframeJson.layout = {
          width: 1440,
          height: 900,
          background: "#FFFFFF",
          padding: 40,
          contentAlignment: "center",
        };
      }

      // Add design system if not provided
      if (!wireframeJson.designSystem) {
        wireframeJson.designSystem = {
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

      return wireframeJson;
    } catch (jsonError) {
      console.error("Error parsing JSON:", jsonError);
      throw new Error("Failed to parse wireframe JSON: " + jsonError.message);
    }
  } catch (error) {
    console.error("Error generating wireframe:", error);
    throw error;
  }
}

async function chat(Question) {
  try {
    // Check if retrievers are initialized
    if (!retriever) {
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
        const response = await llm.invoke(formattedPrompt);
        const outputParser = new StringOutputParser();
        const parsedOutput = await outputParser.parse(response);
        const queries = parsedOutput.content.match(/^\d+\.\s.*?\?$/gm);

        return queries || [];
      } catch (error) {
        console.error("Error generating queries:", error);
        return [];
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

    const subQuestions = await generateQueries();
    console.log(subQuestions);

    const allDocuments = await retrieveDocuments(subQuestions);

    const topDocuments = await reciprocalRankFusion(allDocuments);
    // console.log(topDocuments)

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
      context: topDocuments,
    });
    //console.log(finalPrompt)
    const outputParser = new StringOutputParser();
    const finalOutput = await outputParser.parse(await llm.invoke(finalPrompt));
    return finalOutput.content;
  } catch (error) {
    console.error("Error in chat function:", error);
    return "An error occurred while processing your request.";
  }
}

router.post("/", async (req, res) => {
  try {
    // Wait for retrievers to be initialized (with timeout)
    let attempts = 0;
    const maxAttempts = 15; // 15 seconds timeout

    while (!retriever && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!retriever) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again later.",
      });
    }

    let { question } = req.body;
    question = question.toLowerCase();
    const answer = await chat(question);
    res.status(200).json({ answer });
  } catch (error) {
    console.error("Error in RAG router:", error);
    res.status(400).json({ error: error.message });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    retrieversInitialized: {
      retriever: !!retriever,
    },
  });
});

// Endpoint for generating wireframes using RAG
router.post("/generate-wireframe", async (req, res) => {
  try {
    // Wait for retrievers to be initialized (with timeout)
    let attempts = 0;
    const maxAttempts = 15; // 15 seconds timeout

    while (!retriever && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!retriever) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again later.",
      });
    }

    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const wireframe = await generateWireframe(prompt);
    res.status(200).json(wireframe);
  } catch (error) {
    console.error("Error in wireframe generation:", error);
    res
      .status(500)
      .json({ error: error.message || "Wireframe generation failed" });
  }
});

module.exports = router;
module.exports.generateWireframe = generateWireframe;
