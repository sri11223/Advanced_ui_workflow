const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Groq = require("groq-sdk");
const dotenv = require("dotenv");

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

const ragRouter = require("./chatbot");
const questionnaireRouter = require("./questionnaire");

const app = express();
app.use(cors());
app.use(bodyParser.json());

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
    res.json(wireframe);
  } catch (error) {
    console.error("Error generating wireframe:", error);
    res
      .status(500)
      .json({ error: "Wireframe generation failed: " + error.message });
  }
});

// Mount the RAG router for PDF chatbot
app.use("/api/chatbot", ragRouter);

// Mount the questionnaire router for interactive wireframe creation
app.use("/api/questionnaire", questionnaireRouter);

// Try alternative ports if the default is busy
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
