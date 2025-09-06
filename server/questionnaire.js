const express = require("express");
const { ChatGroq } = require("@langchain/groq");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { get_retriever } = require("./utils/utils");
const questionnaireRouter = express.Router();

// Access to the same retriever used by the chatbot
let retriever = null;

// Initialize retriever
async function initializeRetriever() {
  try {
    retriever = await get_retriever();
    console.log("Questionnaire retriever initialized successfully");
  } catch (error) {
    console.error("Failed to initialize questionnaire retriever:", error);
  }
}

// Initialize retriever immediately
initializeRetriever().catch(console.error);

// Generate follow-up questions based on the initial wireframe request
async function generateFollowUpQuestions(prompt) {
  try {
    const llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      maxTokens: undefined,
      maxRetries: 3,
    });

    // Retrieve UX design principles and guidelines related to the wireframe
    const uxQueries = [
      `What information is needed to create a good ${prompt} wireframe?`,
      `What key requirements should be gathered for a ${prompt} interface?`,
    ];

    let contextDocs = [];
    if (retriever) {
      const results = await Promise.all(
        uxQueries.map((q) => retriever.invoke(q))
      );

      // Combine and deduplicate results
      const seen = new Set();
      results.flat().forEach((doc) => {
        const docStr = JSON.stringify(doc);
        if (!seen.has(docStr)) {
          seen.add(docStr);
          contextDocs.push(doc);
        }
      });
    }

    // Create prompt to generate follow-up questions
    const questionsTemplate = PromptTemplate.fromTemplate(
      `You are a UX design expert helping gather requirements for wireframe creation.
            
            The user wants a wireframe for: {initialPrompt}
            
            Based on UX best practices and the following design principles:
            
            {context}
            
            Generate 2-4 specific follow-up questions that would help clarify the wireframe requirements. 
            The questions should cover:
            1. User needs and goals
            2. Key functionality requirements
            3. Content organization preferences
            4. User flow priorities
            5. Visual hierarchy preferences
            
            Format your response as a JSON array of questions only:
            
            {{
                "questions": [
                    "Question 1?",
                    "Question 2?",
                    "Question 3?",
                    "Question 4?"
                ]
            }}
            `
    );

    const formattedPrompt = await questionsTemplate.format({
      initialPrompt: prompt,
      context: contextDocs.map((doc) => doc.pageContent).join("\n\n"),
    });

    const response = await llm.invoke(formattedPrompt);
    const outputParser = new StringOutputParser();
    const parsedOutput = await outputParser.parse(response);

    // Extract JSON from response
    const jsonMatch = parsedOutput.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to generate follow-up questions");
    }

    const cleanedJsonStr = jsonMatch[0]
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const questionsJson = JSON.parse(cleanedJsonStr);
    return questionsJson.questions || [];
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    // Return default questions if there's an error
    return [
      "What are the primary user goals for this interface?",
      "What key features or functionality should be included?",
      "Are there specific brand guidelines or visual preferences to consider?",
      "What content elements are most important to highlight?",
      "Are there any specific user flows that need to be supported?",
    ];
  }
}

// Process answers to follow-up questions and generate wireframe request
async function processAnswersAndGenerateWireframe(initialPrompt, answers) {
  try {
    const llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      maxTokens: undefined,
      maxRetries: 3,
    });

    // Create a detailed wireframe request based on the initial prompt and answers
    const detailedRequestTemplate = PromptTemplate.fromTemplate(
      `Based on the following information, create a detailed specification for a wireframe:
            
      Initial request: {initialPrompt}
            
      Additional information gathered from user:
      {additionalInfo}
            
      I need you to create a VERY detailed wireframe description that will be used to generate a visual wireframe with Figma API. 
      
      Your response should include:
      1. Precise positioning of all UI elements (x,y coordinates)
      2. Exact dimensions (width, height) for each component
      3. Detailed styling information (colors, fonts, spacing)
      4. Clear hierarchy and layout structure
      5. Specific content for text elements
      
      Include clear positioning guidance, element relationships, and visual design specifications.
      This will be used to generate a detailed wireframe JSON with positional data that a Figma API can use.
      
      Format your response as a SINGLE PARAGRAPH with no bullets or numbering, but be extremely specific about layout details.
      Include all the details necessary for creating a professional wireframe in Figma.`
    );

    // Format the answers into a string
    const additionalInfoText = Object.entries(answers)
      .map(([question, answer]) => `${question} ${answer}`)
      .join("\n\n");

    const formattedPrompt = await detailedRequestTemplate.format({
      initialPrompt: initialPrompt,
      additionalInfo: additionalInfoText,
    });

    const response = await llm.invoke(formattedPrompt);
    const outputParser = new StringOutputParser();
    const detailedRequest = await outputParser.parse(response);

    // Return the detailed wireframe request
    return detailedRequest.content || detailedRequest;
  } catch (error) {
    console.error("Error processing answers:", error);
    // Return the initial prompt if there's an error
    return initialPrompt;
  }
}

// Store ongoing questionnaire sessions
const activeSessions = new Map();

questionnaireRouter.post("/start", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Generate a session ID
    const sessionId = Date.now().toString();

    // Generate follow-up questions
    const questions = await generateFollowUpQuestions(prompt);

    // Store the session
    activeSessions.set(sessionId, {
      initialPrompt: prompt,
      questions,
      answers: {},
      currentQuestionIndex: 0,
      completed: false,
    });

    res.json({
      sessionId,
      question: questions[0],
      totalQuestions: questions.length,
      currentQuestion: 1,
    });
  } catch (error) {
    console.error("Error starting questionnaire:", error);
    res.status(500).json({ error: "Failed to start questionnaire" });
  }
});

questionnaireRouter.post("/answer", async (req, res) => {
  try {
    const { sessionId, answer } = req.body;

    if (!sessionId || !answer) {
      return res
        .status(400)
        .json({ error: "Session ID and answer are required" });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Store the answer to the current question
    const currentQuestion = session.questions[session.currentQuestionIndex];
    session.answers[currentQuestion] = answer;

    // Move to the next question
    session.currentQuestionIndex++;

    // Check if we've reached the end of the questions
    if (session.currentQuestionIndex >= session.questions.length) {
      session.completed = true;

      // Process answers and generate wireframe
      const detailedRequest = await processAnswersAndGenerateWireframe(
        session.initialPrompt,
        session.answers
      );

      // Import the generateWireframe function from chatbot.js
      const { generateWireframe } = require("./chatbot");

      // Generate the wireframe using the detailed request
      const wireframe = await generateWireframe(detailedRequest);

      // Clear the session
      activeSessions.delete(sessionId);

      return res.json({
        completed: true,
        wireframe,
      });
    }

    // Return the next question
    res.json({
      sessionId,
      question: session.questions[session.currentQuestionIndex],
      totalQuestions: session.questions.length,
      currentQuestion: session.currentQuestionIndex + 1,
    });
  } catch (error) {
    console.error("Error processing answer:", error);
    res
      .status(500)
      .json({ error: "Failed to process answer: " + error.message });
  }
});

// Get the current state of a session
questionnaireRouter.get("/session/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({
    initialPrompt: session.initialPrompt,
    currentQuestion: session.currentQuestionIndex + 1,
    totalQuestions: session.questions.length,
    completed: session.completed,
  });
});

module.exports = questionnaireRouter;
