const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Groq = require("groq-sdk");
const dotenv = require("dotenv");
const { WebSocketServer } = require("ws");

// Load environment variables from .env file
const result = dotenv.config();
if (result.error) {
  console.error("Error loading .env file:", result.error);
}
console.log(
  "Environment variables loaded:",
  Object.keys(process.env).filter(
    (key) => key.includes("PINECONE") || key.includes("GROQ")
  )
);

// Import routers and utilities
const ragRouter = require("./chatbot");
const questionnaireRouter = require("./questionnaire");

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Add route for wireframe generation using RAG system
app.post("/generate-wireframe", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Forward to the chatbot's generateWireframe function
    const wireframe = await require("./chatbot").generateWireframe(prompt);

    console.log(
      "Generated wireframe JSON:",
      JSON.stringify(wireframe, null, 2)
    );

    // Also send the wireframe to the Figma plugin if there are connected clients
    if (figmaClients.length > 0) {
      // Convert to Figma-compatible format
      const figmaJson = convertToFigmaFormat(wireframe);
      broadcastToFigma({ type: "wireframe-json", data: figmaJson });
      console.log("Wireframe sent to Figma plugin");
    }

    res.json(wireframe);
  } catch (error) {
    console.error("Error generating wireframe:", error);
    res
      .status(500)
      .json({ error: "Wireframe generation failed: " + error.message });
  }
});

/**
 * Convert the RAG wireframe JSON to Figma-compatible format
 */
function convertToFigmaFormat(wireframe) {
  const components = [];

  // Add title/header
  components.push({
    type: "text",
    label: wireframe.screen || "Wireframe",
    x: 150,
    y: 50,
    fontSize: 24,
    fontWeight: "bold",
  });

  // Add fields
  if (wireframe.fields && wireframe.fields.length) {
    wireframe.fields.forEach((field) => {
      components.push({
        type: field.type === "password" ? "input" : "text",
        label: field.name || field.text || field.placeholder || "Field",
        x: field.position ? field.position.x : 50,
        y: field.position ? field.position.y : 100,
        width: field.width || 200,
        height: field.height || 40,
        placeholder: field.placeholder,
        isPassword: field.type === "password",
        fontSize: field.fontSize,
        fontWeight: field.fontWeight,
        backgroundColor: field.backgroundColor,
        color: field.color,
      });
    });
  }

  // Add buttons
  if (wireframe.buttons && wireframe.buttons.length) {
    wireframe.buttons.forEach((button) => {
      components.push({
        type: "button",
        label: button.name || button.text || "Button",
        x: button.position ? button.position.x : 50,
        y: button.position ? button.position.y : 200,
        width: button.width || 200,
        height: button.height || 40,
        backgroundColor: button.backgroundColor,
        textColor: button.textColor,
      });
    });
  }

  // Add links
  if (wireframe.links && wireframe.links.length) {
    wireframe.links.forEach((link) => {
      components.push({
        type: "link",
        label: link.name || link.text || "Link",
        x: link.position ? link.position.x : 50,
        y: link.position ? link.position.y : 250,
        width: link.width || 150,
        height: link.height || 20,
        color: link.color,
      });
    });
  }

  return {
    title: wireframe.screen || "Wireframe",
    components: components,
  };
}

// Mount the RAG router for PDF chatbot
app.use("/api/chatbot", ragRouter);

// Mount the questionnaire router for interactive wireframe creation
app.use("/api/questionnaire", questionnaireRouter);

// ===== Figma API Integration =====
// WebSocket clients for Figma plugin connection
let figmaClients = [];
// Store the latest wireframe JSON for context
let latestWireframeContext = null;

// REST API to send wireframe JSON to Figma plugin
app.post("/figma/generate", (req, res) => {
  const { json } = req.body;
  if (!json) return res.status(400).json({ error: "No JSON provided" });

  // Store the wireframe JSON for context before broadcasting
  latestWireframeContext = json;
  console.log("Stored wireframe context for future edits");

  broadcastToFigma({ type: "wireframe-json", data: json });
  res.json({ status: "ok" });
});

// Function to broadcast messages to all connected Figma plugins
function broadcastToFigma(msg) {
  try {
    // Debug info before sending
    console.log("Broadcasting message of type:", msg.type);
    if (msg.data) {
      console.log("Data structure:", Object.keys(msg.data));
      if (typeof msg.data === "object") {
        // If it's an object, log a sample of the data
        const sampleKeys = Object.keys(msg.data).slice(0, 3);
        const sample = {};
        sampleKeys.forEach((key) => (sample[key] = msg.data[key]));
        console.log("Data sample:", sample);
      }
    }

    const str = JSON.stringify(msg);
    console.log("Message size (bytes):", str.length);

    if (figmaClients.length === 0) {
      console.warn("No Figma clients connected to receive the message");
      return;
    }

    figmaClients.forEach((c) => c.send(str));
    console.log(
      `Broadcasted wireframe to ${figmaClients.length} Figma plugin clients`
    );
  } catch (error) {
    console.error("Error broadcasting to Figma:", error);
  }
}

// Endpoint to update wireframe based on user prompt
app.post("/figma/update", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    if (!latestWireframeContext) {
      return res.status(400).json({ error: "No wireframe context available" });
    }

    // console.log(`Updating wireframe based on prompt: "${prompt}"`);

    // Access the updateWireframe function from the chatbot module
    const { updateWireframe } = require("./chatbot");

    // Call the updateWireframe function with the context and prompt
    const updatedWireframe = await updateWireframe(
      latestWireframeContext,
      prompt
    );
    console.log(
      "Updated wireframe received:",
      Object.keys(updatedWireframe || {})
    );

    // Make sure we have a valid wireframe object
    if (!updatedWireframe || typeof updatedWireframe !== "object") {
      throw new Error("Invalid wireframe object returned from updateWireframe");
    }

    // Store the updated wireframe as the new context
    latestWireframeContext = updatedWireframe;

    // For Figma plugin compatibility, ensure we have a properly formatted object
    // If the wireframe is already in Figma format (has components array), use it directly
    // Otherwise, convert it using the convertToFigmaFormat function
    const figmaWireframe = updatedWireframe.components
      ? updatedWireframe
      : convertToFigmaFormat(updatedWireframe);

    console.log("Figma wireframe format:", Object.keys(figmaWireframe));

    // Broadcast the updated wireframe to all connected Figma plugins
    broadcastToFigma({ type: "wireframe-json", data: figmaWireframe });

    res.json({ status: "ok", data: updatedWireframe });
  } catch (error) {
    console.error("Error updating wireframe:", error);
    res
      .status(500)
      .json({ error: "Wireframe update failed: " + error.message });
  }
});

// WebSocket server for Figma plugin
const WSPORT = process.env.WSPORT || 8080;
const wss = new WebSocketServer({ port: WSPORT });
wss.on("connection", (ws) => {
  console.log("🔌 Figma Plugin connected");
  figmaClients.push(ws);
  ws.on("close", () => {
    figmaClients = figmaClients.filter((c) => c !== ws);
    console.log("Figma Plugin disconnected");
  });
});

// Try alternative ports if the default is busy
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(
    `Server running on port ${PORT}, Figma WebSocket on port ${WSPORT}`
  )
);

// Handle graceful shutdown to ensure cache is saved
process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);

async function shutDown() {
  console.log("Received shutdown signal...");

  // Close WebSocket server
  wss.close(() => {
    console.log("WebSocket server closed");
  });

  // Close server first to stop accepting new connections
  server.close(() => {
    console.log("HTTP server closed");

    // Then close any other resources like the LLM client cache
    try {
      // Access the LLM client from chatbot module
      const { closeLLMClient } = require("./chatbot");
      if (typeof closeLLMClient === "function") {
        closeLLMClient()
          .then(() => {
            console.log("LLM client and cache properly closed");
            process.exit(0);
          })
          .catch((err) => {
            console.error("Error closing LLM client:", err);
            process.exit(1);
          });
      } else {
        console.log("No LLM client close function found, exiting");
        process.exit(0);
      }
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error("Forced shutdown due to timeout");
    process.exit(1);
  }, 10000);
}
