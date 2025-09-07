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

// Helper function to check if the input is a greeting
function checkIfGreeting(prompt) {
  const greetings = [
    "hi",
    "hello",
    "hey",
    "greetings",
    "good morning",
    "good afternoon",
    "good evening",
    "sup",
    "what's up",
    "howdy",
    "hiya",
    "yo",
  ];

  const lowerPrompt = prompt.toLowerCase().trim();

  // Check if the prompt is just a greeting or starts with a greeting
  return (
    greetings.some(
      (greeting) =>
        lowerPrompt === greeting ||
        lowerPrompt.startsWith(greeting + " ") ||
        lowerPrompt.startsWith(greeting + "!")
    ) || lowerPrompt.length < 10
  ); // Very short messages are likely greetings
}

// Generate friendly greeting questions
function generateGreetingQuestions() {
  return [
    "Hi there! 👋 I'm excited to help you create an amazing wireframe! What kind of interface or screen would you like me to help you design today?",
    "Great! Now I'd love to learn more about your vision. What are the main goals you want users to achieve with this interface?",
    "Awesome! What specific features or functionality should be included in your wireframe?",
    "Perfect! Are there any particular design preferences, brand guidelines, or visual style you'd like me to consider?",
  ];
}

// Generate follow-up questions based on the initial wireframe request
async function generateFollowUpQuestions(prompt) {
  try {
    const llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      maxTokens: undefined,
      maxRetries: 3,
    });

    // Check if this is a greeting or casual message
    const isGreeting = checkIfGreeting(prompt);
    if (isGreeting) {
      return generateGreetingQuestions();
    }

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
      `You are a friendly UX design expert and wireframe assistant helping gather requirements for wireframe creation.
            
            The user wants a wireframe for: {initialPrompt}
            
            Based on UX best practices and the following design principles:
            
            {context}
            
            Generate 3-4 friendly, conversational follow-up questions that would help clarify the wireframe requirements. 
            Make the questions sound natural and engaging, like you're having a friendly conversation with a colleague.
            
            The questions should cover:
            1. User needs and goals (who will use this and what do they want to accomplish?)
            2. Key functionality requirements (what features are essential?)
            3. Content organization preferences (how should information be structured?)
            4. User flow priorities (what's the most important user journey?)
            
            Make each question sound friendly and conversational. Use phrases like:
            - "I'd love to know more about..."
            - "Could you tell me..."
            - "What would you say..."
            - "How do you envision..."
            
            Format your response as a JSON array of friendly questions:
            
            {{
                "questions": [
                    "Friendly question 1?",
                    "Engaging question 2?",
                    "Conversational question 3?",
                    "Natural question 4?"
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
    // Return friendly default questions if there's an error
    return [
      "I'd love to know more about who will be using this interface - what are their main goals? 🎯",
      "What key features or functionality would you say are absolutely essential for this wireframe? ✨",
      "How do you envision the content being organized? Any specific sections or areas you'd like to highlight? 📋",
      "Are there any particular design preferences, brand colors, or visual style you'd like me to keep in mind? 🎨",
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

    // Check if this is a greeting and handle accordingly
    const isGreeting = checkIfGreeting(prompt);

    let questions;
    let initialPrompt = prompt;

    if (isGreeting) {
      // For greetings, use predefined friendly questions
      questions = generateGreetingQuestions();
      // Store the greeting as the initial prompt, we'll get the real wireframe request later
      initialPrompt = "greeting";
    } else {
      // Generate follow-up questions based on wireframe request
      questions = await generateFollowUpQuestions(prompt);
    }

    // Store the session
    activeSessions.set(sessionId, {
      initialPrompt: initialPrompt,
      questions,
      answers: {},
      currentQuestionIndex: 0,
      completed: false,
      isGreetingFlow: isGreeting,
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

    // Special handling for greeting flow - capture the wireframe request from the first answer
    if (session.isGreetingFlow && session.currentQuestionIndex === 0) {
      session.initialPrompt = answer; // The first answer contains the actual wireframe request
    }

    // Move to the next question
    session.currentQuestionIndex++;

    // Check if we've reached the end of the questions
    if (session.currentQuestionIndex >= session.questions.length) {
      session.completed = true;

      // Determine the actual wireframe request
      let wireframeRequest = session.initialPrompt;
      if (session.isGreetingFlow) {
        // For greeting flow, the wireframe request is in the first answer
        const firstQuestion = session.questions[0];
        wireframeRequest = session.answers[firstQuestion];
      }

      // Process answers and generate wireframe
      const detailedRequest = await processAnswersAndGenerateWireframe(
        wireframeRequest,
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
