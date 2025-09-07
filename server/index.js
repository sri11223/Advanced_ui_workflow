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

// Store conversation sessions for context with enhanced session management
const conversationSessions = new Map();

// Enhanced session structure for intelligent conversations
class WireframeSession {
  constructor(id) {
    this.id = id;
    this.messages = [];
    this.currentWireframe = null;
    this.sessionState = 'initial'; // initial, questioning, generating, modifying, suggesting
    this.pendingQuestions = [];
    this.userAnswers = {};
    this.websiteType = null;
    this.objectives = null;
    this.colorPreferences = null;
    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  addMessage(role, content, metadata = {}) {
    this.messages.push({
      role,
      content,
      timestamp: new Date(),
      ...metadata
    });
    this.lastActivity = new Date();
  }

  updateState(newState) {
    this.sessionState = newState;
    this.lastActivity = new Date();
  }

  setWireframe(wireframe) {
    this.currentWireframe = wireframe;
    this.lastActivity = new Date();
  }
}

// Enhanced wireframe generation endpoint for chat interface
app.post("/api/wireframe/generate", async (req, res) => {
  try {
    const { prompt, sessionId, existingWireframe } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Add realistic processing delay (2-4 seconds)
    const processingDelay = Math.random() * 2000 + 2000;
    await new Promise(resolve => setTimeout(resolve, processingDelay));

    const currentSessionId = sessionId || Date.now().toString();
    
    // Get or create enhanced conversation session
    if (!conversationSessions.has(currentSessionId)) {
      conversationSessions.set(currentSessionId, new WireframeSession(currentSessionId));
    }
    
    const session = conversationSessions.get(currentSessionId);
    session.addMessage('user', prompt);

    // Detect request type - Enhanced modification detection
    const modificationKeywords = ['change', 'modify', 'update', 'add', 'remove', 'color', 'make', 'improve', 'enhance'];
    const newWireframeKeywords = ['create', 'build', 'design', 'generate', 'new', 'page for', 'login page', 'dashboard', 'homepage'];
    
    // Check if it's explicitly a new wireframe request
    const isNewWireframeRequest = newWireframeKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword)
    );
    
    const isModificationRequest = !isNewWireframeRequest && modificationKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword)
    ) && (existingWireframe || session.currentWireframe);

    // Detect multi-page website requests - Enhanced detection
    const ecommerceKeywords = ['ecommerce', 'e-commerce', 'shop', 'store', 'product', 'cart', 'checkout', 'buy', 'sell'];
    const multiPageKeywords = [
      'website', 'site', 'blog', 'portfolio', 'dashboard', 'landing page', 'corporate', 'business',
      'multi-page', 'multiple pages', 'navigation', 'menu', 'pages', 'sections',
      'home page', 'about page', 'contact page', 'services', 'gallery', 'news', 'articles'
    ];
    const isEcommerceRequest = ecommerceKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
    const isMultiPageRequest = multiPageKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
    const shouldGenerateMultiPage = isEcommerceRequest || isMultiPageRequest;

    // Enhanced intelligent conversation flow
    if (session.sessionState === 'initial' && shouldGenerateMultiPage) {
      // First time wireframe request - ask follow-up questions
      const websiteType = detectWebsiteType(prompt);
      session.websiteType = websiteType;
      session.updateState('questioning');
      
      const followUpQuestions = generateFollowUpQuestions(websiteType, prompt);
      session.pendingQuestions = followUpQuestions;
      
      // Generate initial wireframe but also ask questions
      const wireframe = await generateMultiPageWireframe(prompt, isEcommerceRequest);
      session.setWireframe(wireframe.json);
      
      const responseMessage = `I've created your ${websiteType} wireframe! To make it perfect for you, I have a few questions below. You can answer these questions or ask me to modify anything you see!`;
      
      session.addMessage('assistant', responseMessage, { 
        hasQuestions: true, 
        questions: followUpQuestions,
        suggestions: generateSuggestions(websiteType)
      });

      return res.json({
        success: true,
        wireframe: {
          json: wireframe.json
        },
        message: responseMessage,
        sessionId: currentSessionId,
        hasQuestions: true,
        questions: followUpQuestions,
        suggestions: generateSuggestions(websiteType),
        sessionState: 'questioning'
      });
    }

    // Enhanced modification detection - check for existing wireframe from frontend
    const hasExistingWireframe = existingWireframe && (existingWireframe.components || existingWireframe.pages);
    
    // Only treat as modification if it's NOT a new wireframe request AND has existing wireframe
    const enhancedModificationRequest = isModificationRequest && !isNewWireframeRequest && hasExistingWireframe;

    if (enhancedModificationRequest && (session.currentWireframe || hasExistingWireframe)) {
      // Handle contextual modifications
      console.log("Processing contextual modification:", prompt);
      console.log("Existing wireframe data:", existingWireframe);
      session.updateState('modifying');
      
      // Use existing wireframe from frontend if available, otherwise use session wireframe
      const baseWireframe = hasExistingWireframe ? existingWireframe : session.currentWireframe;
      
      const { modifyWireframe } = require('./chatbot');
      const modifiedWireframe = await modifyWireframe(prompt, baseWireframe);
      session.setWireframe(modifiedWireframe);
      
      const suggestions = generateModificationSuggestions(prompt, modifiedWireframe);
      const responseMessage = `Modified your wireframe! ${suggestions.length > 0 ? 'Here are some other things you might want to try:' : ''}`;
      
      session.addMessage('assistant', responseMessage, { 
        isModification: true,
        suggestions: suggestions
      });

      return res.json({
        success: true,
        wireframe: {
          json: modifiedWireframe
        },
        message: responseMessage,
        sessionId: currentSessionId,
        isModification: true,
        suggestions: suggestions,
        sessionState: 'modifying'
      });
    }

    // Handle answers to pending questions
    if (session.sessionState === 'questioning' && session.pendingQuestions.length > 0) {
      const updatedWireframe = await handleQuestionAnswer(prompt, session);
      session.setWireframe(updatedWireframe);
      session.updateState('generating');
      
      const responseMessage = "Great! I've updated your wireframe based on your preferences. What would you like to modify next?";
      const suggestions = generateSuggestions(session.websiteType);
      
      session.addMessage('assistant', responseMessage, { suggestions: suggestions });

      return res.json({
        success: true,
        wireframe: {
          json: updatedWireframe
        },
        message: responseMessage,
        sessionId: currentSessionId,
        suggestions: suggestions,
        sessionState: 'generating'
      });
    }

    // Generate new wireframe using the existing chatbot system
    console.log("Processing wireframe generation:", prompt);
    console.log("Multi-page detection:", { isEcommerceRequest, isMultiPageRequest, shouldGenerateMultiPage });
    
    try {
      let wireframe;
      
      if (shouldGenerateMultiPage) {
        // Generate multi-page wireframe for e-commerce/websites
        wireframe = await generateMultiPageWireframe(prompt, isEcommerceRequest);
      } else {
        // Use the existing generateWireframe function from chatbot.js for single pages
        wireframe = await require("./chatbot").generateWireframe(prompt);
      }
      
      // Transform the wireframe to match the expected format
      let transformedWireframe;
      
      // Transform wireframe components to match frontend expectations
      const transformComponents = (components) => {
        return components.map((comp, index) => ({
          id: comp.id || `comp-${Date.now()}-${index}`,
          type: comp.type || 'text',
          x: comp.x || 50,
          y: comp.y || 50 + (index * 70),
          width: comp.width || (comp.type === 'button' ? 200 : comp.type === 'input' ? 260 : 300),
          height: comp.height || (comp.type === 'button' ? 40 : comp.type === 'input' ? 40 : 30),
          text: comp.label || comp.text || comp.placeholder || `Component ${index + 1}`,
          fill: comp.backgroundColor || (comp.type === 'button' ? '#3b82f6' : comp.type === 'input' ? '#ffffff' : '#f3f4f6'),
          textColor: comp.textColor || (comp.type === 'button' ? '#ffffff' : '#374151'),
          fontSize: comp.fontSize || 14,
          fontWeight: comp.fontWeight || 'normal',
          borderColor: comp.borderColor || '#d1d5db',
          borderWidth: comp.borderWidth || 1,
          borderRadius: comp.borderRadius || (comp.type === 'button' ? 6 : 4),
          opacity: comp.opacity || 1,
          placeholder: comp.placeholder
        }));
      };

      if (wireframe && wireframe.json) {
        // Handle multi-page wireframes
        transformedWireframe = {
          appType: wireframe.json.websiteType || 'web-app',
          title: wireframe.json.title || 'Generated Wireframe',
          totalPages: wireframe.json.pages ? wireframe.json.pages.length : 1,
          pages: (wireframe.json.pages || [{
            id: 'main',
            title: 'Main',
            components: wireframe.json.components || []
          }]).map(page => ({
            ...page,
            components: transformComponents(page.components || [])
          }))
        };
      } else if (wireframe && wireframe.components) {
        // Handle single page wireframes
        transformedWireframe = {
          appType: 'web-app',
          title: wireframe.title || 'Generated Wireframe',
          totalPages: 1,
          pages: [{
            id: 'main',
            title: 'Main',
            components: transformComponents(wireframe.components)
          }]
        };
      } else {
        // Fallback wireframe
        transformedWireframe = {
          appType: 'web-app',
          title: 'Simple Wireframe',
          totalPages: 1,
          pages: [{
            id: 'main',
            title: 'Main',
            components: [
              {
                id: 'header-1',
                type: 'text',
                x: 50,
                y: 50,
                width: 300,
                height: 40,
                text: prompt.substring(0, 50) + '...',
                fill: '#f3f4f6',
                textColor: '#374151',
                fontSize: 18
              },
              {
                id: 'button-1',
                type: 'button',
                x: 50,
                y: 120,
                width: 200,
                height: 40,
                text: 'Action Button',
                fill: '#3b82f6',
                textColor: '#ffffff',
                fontSize: 14
              }
            ]
          }]
        };
      }

      session.setWireframe(transformedWireframe);
      session.addMessage('assistant', `Generated wireframe: ${prompt}`);

      return res.json({
        success: true,
        wireframe: {
          json: transformedWireframe
        },
        message: `Generated wireframe: ${prompt}`,
        sessionId: currentSessionId,
        isModification: false
      });
    } catch (error) {
      console.error("Error generating wireframe:", error);
      
      // Fallback wireframe generation
      const fallbackWireframe = {
        title: "Basic Wireframe",
        canvasWidth: 1200,
        canvasHeight: 600,
        components: [
          { id: 'fallback-1', type: 'text', x: 50, y: 50, width: 300, height: 40, text: 'Wireframe Generation Error', fontSize: 18, fontWeight: 'bold' },
          { id: 'fallback-2', type: 'text', x: 50, y: 100, width: 500, height: 60, text: 'Please try again with a different prompt.', fontSize: 14 }
        ]
      };
      
      session.setWireframe(fallbackWireframe);
      session.addMessage('assistant', `Fallback wireframe generated due to error: ${error.message}`);

      return res.json({
        success: true,
        wireframe: fallbackWireframe,
        message: `Generated basic wireframe (fallback): ${error.message}`,
        sessionId: currentSessionId,
        isModification: false
      });
    }

  } catch (error) {
    console.error("Error in wireframe/chat endpoint:", error);
    res.status(500).json({ 
      success: false,
      error: "Request failed: " + error.message 
    });
  }
});

// Helper functions for intelligent conversation system

// Generate follow-up questions based on website type
function generateFollowUpQuestions(websiteType, prompt) {
  const questionSets = {
    ecommerce: [
      "What's the main objective of your e-commerce store? (e.g., sell electronics, fashion, books)",
      "What color scheme do you prefer? (e.g., blue and white, modern dark theme, colorful)",
      "Who is your target audience? (e.g., young professionals, families, tech enthusiasts)",
      "What key features are most important? (e.g., product search, reviews, wishlist)"
    ],
    blog: [
      "What's the main topic of your blog? (e.g., technology, lifestyle, travel, cooking)",
      "What color palette would you like? (e.g., clean white, warm earth tones, vibrant colors)",
      "How often do you plan to post? (e.g., daily, weekly, monthly)",
      "What's your writing style? (e.g., professional, casual, educational)"
    ],
    portfolio: [
      "What's your profession or field? (e.g., web developer, designer, photographer, artist)",
      "What color scheme represents you best? (e.g., minimal black/white, creative colorful, professional blue)",
      "What type of projects do you want to showcase? (e.g., web apps, designs, photos, artwork)",
      "What's your main goal? (e.g., get hired, attract clients, showcase skills)"
    ],
    corporate: [
      "What industry is your company in? (e.g., technology, consulting, finance, healthcare)",
      "What color scheme reflects your brand? (e.g., professional blue, trustworthy green, modern gray)",
      "What's your company's main value proposition? (e.g., innovation, reliability, expertise)",
      "Who are your target clients? (e.g., enterprises, small businesses, consumers)"
    ],
    dashboard: [
      "What type of data will you be displaying? (e.g., sales metrics, user analytics, financial data)",
      "What color scheme do you prefer? (e.g., dark theme, light theme, colorful charts)",
      "Who will be using this dashboard? (e.g., executives, analysts, managers)",
      "What's the most important metric to highlight? (e.g., revenue, user growth, performance)"
    ],
    landing: [
      "What product or service are you promoting? (e.g., SaaS app, course, product launch)",
      "What color scheme matches your brand? (e.g., energetic orange, trustworthy blue, modern purple)",
      "What's your main call-to-action? (e.g., sign up, buy now, learn more, download)",
      "Who is your target audience? (e.g., business owners, students, developers)"
    ]
  };

  return questionSets[websiteType] || questionSets.ecommerce;
}

// Generate suggestions for next steps
function generateSuggestions(websiteType) {
  const suggestionSets = {
    ecommerce: [
      "Add a product search bar",
      "Include customer reviews section",
      "Add shopping cart functionality",
      "Include product categories",
      "Add user login/signup",
      "Include payment options"
    ],
    blog: [
      "Add a search functionality",
      "Include social media links",
      "Add comment section",
      "Include newsletter signup",
      "Add author bio section",
      "Include related posts"
    ],
    portfolio: [
      "Add project case studies",
      "Include testimonials section",
      "Add skills/technologies list",
      "Include resume/CV download",
      "Add contact form",
      "Include social media links"
    ],
    corporate: [
      "Add team members section",
      "Include client testimonials",
      "Add services pricing",
      "Include company timeline",
      "Add office locations",
      "Include case studies"
    ],
    dashboard: [
      "Add data filters",
      "Include export functionality",
      "Add real-time updates",
      "Include user permissions",
      "Add notification system",
      "Include data visualization"
    ],
    landing: [
      "Add testimonials section",
      "Include pricing plans",
      "Add feature highlights",
      "Include FAQ section",
      "Add social proof",
      "Include urgency elements"
    ]
  };

  return suggestionSets[websiteType] || suggestionSets.ecommerce;
}

// Handle answers to follow-up questions
async function handleQuestionAnswer(prompt, session) {
  const lowerPrompt = prompt.toLowerCase();
  let updatedWireframe = JSON.parse(JSON.stringify(session.currentWireframe));

  // Extract color preferences
  const colorKeywords = ['blue', 'red', 'green', 'purple', 'orange', 'pink', 'black', 'white', 'gray', 'dark', 'light'];
  const mentionedColors = colorKeywords.filter(color => lowerPrompt.includes(color));
  
  if (mentionedColors.length > 0) {
    session.colorPreferences = mentionedColors;
    // Apply color preferences to wireframe
    const primaryColor = mentionedColors[0];
    const colorMap = {
      'blue': '#3b82f6', 'red': '#dc2626', 'green': '#10b981',
      'purple': '#8b5cf6', 'orange': '#f97316', 'pink': '#ec4899',
      'black': '#000000', 'white': '#ffffff', 'gray': '#6b7280',
      'dark': '#1f2937', 'light': '#f9fafb'
    };
    
    const targetColor = colorMap[primaryColor];
    if (targetColor) {
      // Apply to buttons and key elements
      const applyColors = (components) => {
        components.forEach(component => {
          if (component.type === 'button') {
            component.fill = targetColor;
          }
        });
      };
      
      if (updatedWireframe.pages) {
        updatedWireframe.pages.forEach(page => applyColors(page.components));
      } else if (updatedWireframe.components) {
        applyColors(updatedWireframe.components);
      }
    }
  }

  // Extract objectives and update content
  if (lowerPrompt.includes('sell') || lowerPrompt.includes('product')) {
    session.objectives = 'sales';
    // Update text content to be more sales-focused
  } else if (lowerPrompt.includes('blog') || lowerPrompt.includes('write')) {
    session.objectives = 'content';
    // Update text content to be more content-focused
  }

  return updatedWireframe;
}

// Generate modification suggestions based on recent changes
function generateModificationSuggestions(prompt, wireframe) {
  const suggestions = [];
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('color')) {
    suggestions.push("Try changing the text color too", "Add a gradient background", "Adjust the button hover effects");
  }
  
  if (lowerPrompt.includes('text')) {
    suggestions.push("Change the font size", "Make the text bold", "Add more descriptive content");
  }
  
  if (lowerPrompt.includes('add')) {
    suggestions.push("Position the new element", "Change its color", "Add more similar elements");
  }

  // Always include some general suggestions
  suggestions.push("Add more interactive elements", "Improve the layout spacing", "Try a different color scheme");

  return suggestions.slice(0, 3); // Return max 3 suggestions
}

// Handle answers to follow-up questions
async function handleQuestionAnswer(prompt, session) {
  const lowerPrompt = prompt.toLowerCase();
  let updatedWireframe = JSON.parse(JSON.stringify(session.currentWireframe));

  // Extract color preferences
  const colorKeywords = ['blue', 'red', 'green', 'purple', 'orange', 'pink', 'black', 'white', 'gray', 'dark', 'light'];
  const mentionedColors = colorKeywords.filter(color => lowerPrompt.includes(color));
  
  if (mentionedColors.length > 0) {
    session.colorPreferences = mentionedColors;
    // Apply color preferences to wireframe
    const primaryColor = mentionedColors[0];
    const colorMap = {
      'blue': '#3b82f6', 'red': '#dc2626', 'green': '#10b981',
      'purple': '#8b5cf6', 'orange': '#f97316', 'pink': '#ec4899',
      'black': '#000000', 'white': '#ffffff', 'gray': '#6b7280',
      'dark': '#1f2937', 'light': '#f9fafb'
    };
    
    const targetColor = colorMap[primaryColor];
    if (targetColor) {
      // Apply to buttons and key elements
      const applyColors = (components) => {
        components.forEach(component => {
          if (component.type === 'button') {
            component.fill = targetColor;
          }
        });
      };
      
      if (updatedWireframe.pages) {
        updatedWireframe.pages.forEach(page => applyColors(page.components));
      } else if (updatedWireframe.components) {
        applyColors(updatedWireframe.components);
      }
    }
  }

  // Extract objectives and update content
  if (lowerPrompt.includes('sell') || lowerPrompt.includes('product')) {
    session.objectives = 'sales';
    // Update text content to be more sales-focused
  } else if (lowerPrompt.includes('blog') || lowerPrompt.includes('write')) {
    session.objectives = 'content';
    // Update text content to be more content-focused
  }

  return updatedWireframe;
}

// Generate modification suggestions based on recent changes
function generateModificationSuggestions(prompt, wireframe) {
  const suggestions = [];
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('color')) {
    suggestions.push("Try changing the text color too", "Add a gradient background", "Adjust the button hover effects");
  }
  
  if (lowerPrompt.includes('text')) {
    suggestions.push("Change the font size", "Make the text bold", "Add more descriptive content");
  }
  
  if (lowerPrompt.includes('add')) {
    suggestions.push("Position the new element", "Change its color", "Add more similar elements");
  }

  // Always include some general suggestions
  suggestions.push("Add more interactive elements", "Improve the layout spacing", "Try a different color scheme");

  return suggestions.slice(0, 3); // Return max 3 suggestions
}

// Multi-page wireframe generator function
async function generateMultiPageWireframe(prompt, isEcommerce) {
  console.log("Generating multi-page wireframe for:", prompt);
  
  // Always detect website type from prompt, don't just default to ecommerce
  const websiteType = detectWebsiteType(prompt);
  
  // Define page templates based on website type
  const pageTemplates = {
    ecommerce: [
      {
        id: 'home',
        name: 'Homepage',
        title: 'Home',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'E-Commerce Store', fontSize: 24, fontWeight: 'bold' },
          { type: 'button', x: 900, y: 30, width: 100, height: 35, text: 'Login', backgroundColor: '#3b82f6' },
          { type: 'button', x: 1020, y: 30, width: 100, height: 35, text: 'Cart (0)', backgroundColor: '#10b981' },
          { type: 'input', x: 400, y: 30, width: 300, height: 35, placeholder: 'Search products...' },
          { type: 'text', x: 50, y: 100, width: 300, height: 60, text: 'Featured Products', fontSize: 20, fontWeight: 'bold' },
          { type: 'button', x: 50, y: 180, width: 200, height: 150, text: 'Product 1\n$29.99', backgroundColor: '#f8f9fa' },
          { type: 'button', x: 270, y: 180, width: 200, height: 150, text: 'Product 2\n$39.99', backgroundColor: '#f8f9fa' },
          { type: 'button', x: 490, y: 180, width: 200, height: 150, text: 'Product 3\n$49.99', backgroundColor: '#f8f9fa' },
          { type: 'text', x: 50, y: 360, width: 200, height: 30, text: 'Categories', fontSize: 18, fontWeight: 'bold' },
          { type: 'button', x: 50, y: 400, width: 150, height: 40, text: 'Electronics', backgroundColor: '#e5e7eb' },
          { type: 'button', x: 220, y: 400, width: 150, height: 40, text: 'Clothing', backgroundColor: '#e5e7eb' },
          { type: 'button', x: 390, y: 400, width: 150, height: 40, text: 'Books', backgroundColor: '#e5e7eb' }
        ]
      },
      {
        id: 'products',
        name: 'Products',
        title: 'Product Listing',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'All Products', fontSize: 24, fontWeight: 'bold' },
          { type: 'input', x: 400, y: 30, width: 300, height: 35, placeholder: 'Search products...' },
          { type: 'text', x: 50, y: 100, width: 100, height: 30, text: 'Filters:', fontSize: 16, fontWeight: 'bold' },
          { type: 'button', x: 50, y: 140, width: 120, height: 35, text: 'Price Range', backgroundColor: '#e5e7eb' },
          { type: 'button', x: 180, y: 140, width: 120, height: 35, text: 'Category', backgroundColor: '#e5e7eb' },
          { type: 'button', x: 310, y: 140, width: 120, height: 35, text: 'Brand', backgroundColor: '#e5e7eb' },
          { type: 'button', x: 50, y: 200, width: 180, height: 200, text: 'Product A\n$25.99\n★★★★☆', backgroundColor: '#ffffff' },
          { type: 'button', x: 250, y: 200, width: 180, height: 200, text: 'Product B\n$35.99\n★★★★★', backgroundColor: '#ffffff' },
          { type: 'button', x: 450, y: 200, width: 180, height: 200, text: 'Product C\n$45.99\n★★★☆☆', backgroundColor: '#ffffff' },
          { type: 'button', x: 650, y: 200, width: 180, height: 200, text: 'Product D\n$55.99\n★★★★☆', backgroundColor: '#ffffff' }
        ]
      },
      {
        id: 'product-detail',
        name: 'Product Detail',
        title: 'Product Details',
        components: [
          { type: 'text', x: 50, y: 30, width: 300, height: 40, text: 'Premium Headphones', fontSize: 24, fontWeight: 'bold' },
          { type: 'button', x: 50, y: 80, width: 300, height: 250, text: 'Product Image\n[Large Photo]', backgroundColor: '#f3f4f6' },
          { type: 'text', x: 400, y: 80, width: 200, height: 30, text: 'Price: $99.99', fontSize: 20, fontWeight: 'bold' },
          { type: 'text', x: 400, y: 120, width: 300, height: 60, text: 'High-quality wireless headphones with noise cancellation', fontSize: 14 },
          { type: 'text', x: 400, y: 200, width: 100, height: 30, text: 'Quantity:', fontSize: 16 },
          { type: 'input', x: 510, y: 200, width: 60, height: 30, text: '1' },
          { type: 'button', x: 400, y: 250, width: 150, height: 40, text: 'Add to Cart', backgroundColor: '#10b981' },
          { type: 'button', x: 570, y: 250, width: 150, height: 40, text: 'Buy Now', backgroundColor: '#3b82f6' },
          { type: 'text', x: 50, y: 360, width: 200, height: 30, text: 'Customer Reviews', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 400, width: 400, height: 80, text: '★★★★★ "Great sound quality!"\n★★★★☆ "Good value for money"\n★★★☆☆ "Decent but could be better"', fontSize: 14 }
        ]
      },
      {
        id: 'cart',
        name: 'Shopping Cart',
        title: 'Shopping Cart',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'Shopping Cart', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 300, height: 30, text: 'Premium Headphones', fontSize: 16 },
          { type: 'text', x: 400, y: 100, width: 100, height: 30, text: 'Qty: 1', fontSize: 14 },
          { type: 'text', x: 550, y: 100, width: 100, height: 30, text: '$99.99', fontSize: 16, fontWeight: 'bold' },
          { type: 'button', x: 650, y: 100, width: 80, height: 30, text: 'Remove', backgroundColor: '#dc2626' },
          { type: 'text', x: 50, y: 150, width: 300, height: 30, text: 'Wireless Mouse', fontSize: 16 },
          { type: 'text', x: 400, y: 150, width: 100, height: 30, text: 'Qty: 2', fontSize: 14 },
          { type: 'text', x: 550, y: 150, width: 100, height: 30, text: '$49.98', fontSize: 16, fontWeight: 'bold' },
          { type: 'button', x: 650, y: 150, width: 80, height: 30, text: 'Remove', backgroundColor: '#dc2626' },
          { type: 'text', x: 450, y: 220, width: 150, height: 30, text: 'Subtotal: $149.97', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 450, y: 250, width: 150, height: 30, text: 'Tax: $12.00', fontSize: 16 },
          { type: 'text', x: 450, y: 280, width: 150, height: 30, text: 'Total: $161.97', fontSize: 20, fontWeight: 'bold' },
          { type: 'button', x: 450, y: 330, width: 200, height: 50, text: 'Proceed to Checkout', backgroundColor: '#10b981' }
        ]
      },
      {
        id: 'checkout',
        name: 'Checkout',
        title: 'Checkout',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'Checkout', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 200, height: 30, text: 'Shipping Information', fontSize: 18, fontWeight: 'bold' },
          { type: 'input', x: 50, y: 140, width: 200, height: 35, placeholder: 'Full Name' },
          { type: 'input', x: 270, y: 140, width: 200, height: 35, placeholder: 'Email Address' },
          { type: 'input', x: 50, y: 190, width: 420, height: 35, placeholder: 'Street Address' },
          { type: 'input', x: 50, y: 240, width: 130, height: 35, placeholder: 'City' },
          { type: 'input', x: 200, y: 240, width: 130, height: 35, placeholder: 'State' },
          { type: 'input', x: 350, y: 240, width: 120, height: 35, placeholder: 'ZIP Code' },
          { type: 'text', x: 50, y: 300, width: 200, height: 30, text: 'Payment Information', fontSize: 18, fontWeight: 'bold' },
          { type: 'input', x: 50, y: 340, width: 300, height: 35, placeholder: 'Card Number' },
          { type: 'input', x: 50, y: 390, width: 100, height: 35, placeholder: 'MM/YY' },
          { type: 'input', x: 170, y: 390, width: 100, height: 35, placeholder: 'CVV' },
          { type: 'button', x: 50, y: 450, width: 200, height: 50, text: 'Place Order', backgroundColor: '#10b981' }
        ]
      }
    ],
    blog: [
      {
        id: 'home',
        name: 'Home',
        title: 'Blog Home',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'My Blog', fontSize: 24, fontWeight: 'bold' },
          { type: 'button', x: 900, y: 30, width: 100, height: 35, text: 'Login', backgroundColor: '#3b82f6' },
          { type: 'input', x: 400, y: 30, width: 300, height: 35, placeholder: 'Search articles...' },
          { type: 'text', x: 50, y: 100, width: 400, height: 60, text: 'Latest Article: "How to Build Better Websites"', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 170, width: 500, height: 80, text: 'Learn the fundamentals of web development and design...', fontSize: 14 },
          { type: 'button', x: 50, y: 260, width: 120, height: 35, text: 'Read More', backgroundColor: '#3b82f6' },
          { type: 'text', x: 50, y: 320, width: 200, height: 30, text: 'Recent Posts', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 360, width: 400, height: 30, text: '• JavaScript Best Practices', fontSize: 14 },
          { type: 'text', x: 50, y: 390, width: 400, height: 30, text: '• CSS Grid vs Flexbox', fontSize: 14 },
          { type: 'text', x: 50, y: 420, width: 400, height: 30, text: '• React Hooks Tutorial', fontSize: 14 }
        ]
      },
      {
        id: 'articles',
        name: 'Articles',
        title: 'All Articles',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'All Articles', fontSize: 24, fontWeight: 'bold' },
          { type: 'input', x: 400, y: 30, width: 300, height: 35, placeholder: 'Search articles...' },
          { type: 'text', x: 50, y: 100, width: 400, height: 30, text: 'JavaScript Best Practices', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 140, width: 500, height: 60, text: 'Learn how to write clean, maintainable JavaScript code...', fontSize: 14 },
          { type: 'text', x: 50, y: 210, width: 400, height: 30, text: 'CSS Grid vs Flexbox', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 250, width: 500, height: 60, text: 'Understanding when to use CSS Grid vs Flexbox...', fontSize: 14 },
          { type: 'text', x: 50, y: 320, width: 400, height: 30, text: 'React Hooks Tutorial', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 360, width: 500, height: 60, text: 'Complete guide to React Hooks and state management...', fontSize: 14 }
        ]
      },
      {
        id: 'about',
        name: 'About',
        title: 'About Me',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'About Me', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 500, height: 100, text: 'Hi! I\'m a passionate web developer and blogger. I love sharing my knowledge about modern web technologies and best practices.', fontSize: 16 },
          { type: 'text', x: 50, y: 220, width: 200, height: 30, text: 'Skills & Expertise', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 260, width: 400, height: 30, text: '• JavaScript & TypeScript', fontSize: 14 },
          { type: 'text', x: 50, y: 290, width: 400, height: 30, text: '• React & Next.js', fontSize: 14 },
          { type: 'text', x: 50, y: 320, width: 400, height: 30, text: '• Node.js & Express', fontSize: 14 },
          { type: 'text', x: 50, y: 350, width: 400, height: 30, text: '• CSS & Responsive Design', fontSize: 14 }
        ]
      },
      {
        id: 'contact',
        name: 'Contact',
        title: 'Contact Me',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'Contact Me', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 300, height: 30, text: 'Get in touch!', fontSize: 18, fontWeight: 'bold' },
          { type: 'input', x: 50, y: 150, width: 300, height: 35, placeholder: 'Your Name' },
          { type: 'input', x: 50, y: 200, width: 300, height: 35, placeholder: 'Your Email' },
          { type: 'input', x: 50, y: 250, width: 300, height: 100, placeholder: 'Your Message' },
          { type: 'button', x: 50, y: 370, width: 150, height: 40, text: 'Send Message', backgroundColor: '#10b981' }
        ]
      }
    ],
    portfolio: [
      {
        id: 'home',
        name: 'Home',
        title: 'Portfolio Home',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'John Doe', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 70, width: 300, height: 30, text: 'Full Stack Developer', fontSize: 16 },
          { type: 'button', x: 900, y: 30, width: 100, height: 35, text: 'Contact', backgroundColor: '#3b82f6' },
          { type: 'text', x: 50, y: 130, width: 400, height: 80, text: 'I create beautiful and functional web applications using modern technologies.', fontSize: 16 },
          { type: 'text', x: 50, y: 230, width: 200, height: 30, text: 'Featured Projects', fontSize: 18, fontWeight: 'bold' },
          { type: 'button', x: 50, y: 270, width: 200, height: 150, text: 'E-Commerce App\nReact + Node.js', backgroundColor: '#f8f9fa' },
          { type: 'button', x: 270, y: 270, width: 200, height: 150, text: 'Portfolio Site\nNext.js + Tailwind', backgroundColor: '#f8f9fa' },
          { type: 'button', x: 490, y: 270, width: 200, height: 150, text: 'Task Manager\nVue.js + Express', backgroundColor: '#f8f9fa' }
        ]
      },
      {
        id: 'projects',
        name: 'Projects',
        title: 'All Projects',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'My Projects', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 300, height: 30, text: 'E-Commerce Platform', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 140, width: 400, height: 60, text: 'Full-stack e-commerce solution built with React, Node.js, and MongoDB', fontSize: 14 },
          { type: 'button', x: 50, y: 210, width: 100, height: 30, text: 'View Live', backgroundColor: '#3b82f6' },
          { type: 'button', x: 160, y: 210, width: 100, height: 30, text: 'GitHub', backgroundColor: '#6b7280' },
          { type: 'text', x: 50, y: 270, width: 300, height: 30, text: 'Task Management App', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 310, width: 400, height: 60, text: 'Collaborative task manager with real-time updates using Vue.js and Socket.io', fontSize: 14 },
          { type: 'button', x: 50, y: 380, width: 100, height: 30, text: 'View Live', backgroundColor: '#3b82f6' },
          { type: 'button', x: 160, y: 380, width: 100, height: 30, text: 'GitHub', backgroundColor: '#6b7280' }
        ]
      },
      {
        id: 'about',
        name: 'About',
        title: 'About Me',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'About Me', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 500, height: 100, text: 'I\'m a passionate full-stack developer with 5+ years of experience building web applications. I love creating user-friendly interfaces and robust backend systems.', fontSize: 16 },
          { type: 'text', x: 50, y: 220, width: 200, height: 30, text: 'Technical Skills', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 260, width: 200, height: 30, text: 'Frontend:', fontSize: 16, fontWeight: 'bold' },
          { type: 'text', x: 150, y: 260, width: 400, height: 30, text: 'React, Vue.js, Next.js, TypeScript', fontSize: 14 },
          { type: 'text', x: 50, y: 290, width: 200, height: 30, text: 'Backend:', fontSize: 16, fontWeight: 'bold' },
          { type: 'text', x: 150, y: 290, width: 400, height: 30, text: 'Node.js, Express, Python, Django', fontSize: 14 },
          { type: 'text', x: 50, y: 320, width: 200, height: 30, text: 'Database:', fontSize: 16, fontWeight: 'bold' },
          { type: 'text', x: 150, y: 320, width: 400, height: 30, text: 'MongoDB, PostgreSQL, Redis', fontSize: 14 }
        ]
      },
      {
        id: 'contact',
        name: 'Contact',
        title: 'Get In Touch',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'Contact Me', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 300, height: 30, text: 'Let\'s work together!', fontSize: 18, fontWeight: 'bold' },
          { type: 'input', x: 50, y: 150, width: 300, height: 35, placeholder: 'Your Name' },
          { type: 'input', x: 50, y: 200, width: 300, height: 35, placeholder: 'Your Email' },
          { type: 'input', x: 50, y: 250, width: 300, height: 35, placeholder: 'Subject' },
          { type: 'input', x: 50, y: 300, width: 300, height: 100, placeholder: 'Your Message' },
          { type: 'button', x: 50, y: 420, width: 150, height: 40, text: 'Send Message', backgroundColor: '#10b981' },
          { type: 'text', x: 400, y: 150, width: 200, height: 30, text: 'Other Ways to Reach Me:', fontSize: 16, fontWeight: 'bold' },
          { type: 'text', x: 400, y: 190, width: 300, height: 30, text: 'Email: john@example.com', fontSize: 14 },
          { type: 'text', x: 400, y: 220, width: 300, height: 30, text: 'LinkedIn: /in/johndoe', fontSize: 14 },
          { type: 'text', x: 400, y: 250, width: 300, height: 30, text: 'GitHub: /johndoe', fontSize: 14 }
        ]
      }
    ],
    dashboard: [
      {
        id: 'overview',
        name: 'Overview',
        title: 'Dashboard Overview',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'Dashboard', fontSize: 24, fontWeight: 'bold' },
          { type: 'button', x: 900, y: 30, width: 100, height: 35, text: 'Profile', backgroundColor: '#3b82f6' },
          { type: 'text', x: 50, y: 100, width: 150, height: 30, text: 'Total Users', fontSize: 16, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 130, width: 100, height: 40, text: '12,543', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 250, y: 100, width: 150, height: 30, text: 'Revenue', fontSize: 16, fontWeight: 'bold' },
          { type: 'text', x: 250, y: 130, width: 100, height: 40, text: '$45,231', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 450, y: 100, width: 150, height: 30, text: 'Orders', fontSize: 16, fontWeight: 'bold' },
          { type: 'text', x: 450, y: 130, width: 100, height: 40, text: '1,234', fontSize: 24, fontWeight: 'bold' },
          { type: 'button', x: 50, y: 200, width: 400, height: 200, text: 'Sales Chart\n[Chart Placeholder]', backgroundColor: '#f8f9fa' }
        ]
      },
      {
        id: 'analytics',
        name: 'Analytics',
        title: 'Analytics',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'Analytics', fontSize: 24, fontWeight: 'bold' },
          { type: 'button', x: 50, y: 100, width: 300, height: 150, text: 'Traffic Overview\n[Graph Placeholder]', backgroundColor: '#f8f9fa' },
          { type: 'button', x: 400, y: 100, width: 300, height: 150, text: 'User Engagement\n[Chart Placeholder]', backgroundColor: '#f8f9fa' },
          { type: 'text', x: 50, y: 280, width: 200, height: 30, text: 'Top Pages', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 320, width: 300, height: 30, text: '1. /home - 45% traffic', fontSize: 14 },
          { type: 'text', x: 50, y: 350, width: 300, height: 30, text: '2. /products - 23% traffic', fontSize: 14 },
          { type: 'text', x: 50, y: 380, width: 300, height: 30, text: '3. /about - 18% traffic', fontSize: 14 }
        ]
      }
    ],
    landing: [
      {
        id: 'home',
        name: 'Landing Page',
        title: 'Landing Page',
        components: [
          { type: 'text', x: 50, y: 30, width: 300, height: 50, text: 'Amazing Product', fontSize: 28, fontWeight: 'bold' },
          { type: 'button', x: 900, y: 30, width: 100, height: 35, text: 'Sign Up', backgroundColor: '#10b981' },
          { type: 'text', x: 50, y: 100, width: 500, height: 60, text: 'Transform your business with our revolutionary solution', fontSize: 20 },
          { type: 'text', x: 50, y: 180, width: 600, height: 80, text: 'Join thousands of satisfied customers who have already transformed their workflow with our cutting-edge technology.', fontSize: 16 },
          { type: 'button', x: 50, y: 280, width: 200, height: 50, text: 'Get Started Free', backgroundColor: '#3b82f6' },
          { type: 'button', x: 270, y: 280, width: 150, height: 50, text: 'Watch Demo', backgroundColor: '#6b7280' },
          { type: 'text', x: 50, y: 360, width: 200, height: 30, text: 'Key Features:', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 400, width: 400, height: 30, text: '✓ Easy to use interface', fontSize: 14 },
          { type: 'text', x: 50, y: 430, width: 400, height: 30, text: '✓ 24/7 customer support', fontSize: 14 },
          { type: 'text', x: 50, y: 460, width: 400, height: 30, text: '✓ 30-day money back guarantee', fontSize: 14 }
        ]
      }
    ],
    corporate: [
      {
        id: 'home',
        name: 'Home',
        title: 'Corporate Home',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'Acme Corp', fontSize: 24, fontWeight: 'bold' },
          { type: 'button', x: 900, y: 30, width: 100, height: 35, text: 'Contact', backgroundColor: '#3b82f6' },
          { type: 'text', x: 50, y: 100, width: 400, height: 60, text: 'Leading the Future of Technology', fontSize: 20, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 180, width: 500, height: 80, text: 'We are a global technology company committed to innovation and excellence in everything we do.', fontSize: 16 },
          { type: 'button', x: 50, y: 280, width: 150, height: 40, text: 'Learn More', backgroundColor: '#3b82f6' },
          { type: 'text', x: 50, y: 350, width: 200, height: 30, text: 'Our Services', fontSize: 18, fontWeight: 'bold' },
          { type: 'button', x: 50, y: 390, width: 150, height: 80, text: 'Consulting', backgroundColor: '#f8f9fa' },
          { type: 'button', x: 220, y: 390, width: 150, height: 80, text: 'Development', backgroundColor: '#f8f9fa' },
          { type: 'button', x: 390, y: 390, width: 150, height: 80, text: 'Support', backgroundColor: '#f8f9fa' }
        ]
      },
      {
        id: 'about',
        name: 'About',
        title: 'About Us',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'About Acme Corp', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 500, height: 100, text: 'Founded in 2010, Acme Corp has been at the forefront of technological innovation. We serve clients worldwide with cutting-edge solutions.', fontSize: 16 },
          { type: 'text', x: 50, y: 220, width: 200, height: 30, text: 'Our Mission', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 260, width: 500, height: 60, text: 'To empower businesses through innovative technology solutions that drive growth and success.', fontSize: 14 },
          { type: 'text', x: 50, y: 340, width: 200, height: 30, text: 'Our Values', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 380, width: 400, height: 30, text: '• Innovation and Excellence', fontSize: 14 },
          { type: 'text', x: 50, y: 410, width: 400, height: 30, text: '• Customer-Centric Approach', fontSize: 14 },
          { type: 'text', x: 50, y: 440, width: 400, height: 30, text: '• Integrity and Transparency', fontSize: 14 }
        ]
      },
      {
        id: 'services',
        name: 'Services',
        title: 'Our Services',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'Our Services', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 200, height: 30, text: 'Technology Consulting', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 140, width: 400, height: 60, text: 'Strategic technology planning and implementation guidance for your business.', fontSize: 14 },
          { type: 'text', x: 50, y: 220, width: 200, height: 30, text: 'Custom Development', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 260, width: 400, height: 60, text: 'Tailored software solutions built to meet your specific business requirements.', fontSize: 14 },
          { type: 'text', x: 50, y: 340, width: 200, height: 30, text: '24/7 Support', fontSize: 18, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 380, width: 400, height: 60, text: 'Round-the-clock technical support to keep your systems running smoothly.', fontSize: 14 }
        ]
      },
      {
        id: 'contact',
        name: 'Contact',
        title: 'Contact Us',
        components: [
          { type: 'text', x: 50, y: 30, width: 200, height: 40, text: 'Contact Us', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', x: 50, y: 100, width: 300, height: 30, text: 'Get in touch with our team', fontSize: 18, fontWeight: 'bold' },
          { type: 'input', x: 50, y: 150, width: 300, height: 35, placeholder: 'Company Name' },
          { type: 'input', x: 50, y: 200, width: 300, height: 35, placeholder: 'Your Name' },
          { type: 'input', x: 50, y: 250, width: 300, height: 35, placeholder: 'Email Address' },
          { type: 'input', x: 50, y: 300, width: 300, height: 100, placeholder: 'How can we help you?' },
          { type: 'button', x: 50, y: 420, width: 150, height: 40, text: 'Send Message', backgroundColor: '#10b981' },
          { type: 'text', x: 400, y: 150, width: 200, height: 30, text: 'Office Locations:', fontSize: 16, fontWeight: 'bold' },
          { type: 'text', x: 400, y: 190, width: 300, height: 30, text: 'New York: 123 Business Ave', fontSize: 14 },
          { type: 'text', x: 400, y: 220, width: 300, height: 30, text: 'London: 456 Tech Street', fontSize: 14 },
          { type: 'text', x: 400, y: 250, width: 300, height: 30, text: 'Tokyo: 789 Innovation Blvd', fontSize: 14 }
        ]
      }
    ]
  };

  // Get appropriate template or create default
  const pages = pageTemplates[websiteType] || pageTemplates.ecommerce;
  
  return {
    json: {
      websiteType: websiteType,
      title: `${websiteType.charAt(0).toUpperCase() + websiteType.slice(1)} Website`,
      canvasWidth: 1200,
      canvasHeight: 600,
      pages: pages
    }
  };
}

// Helper function to detect website type
function detectWebsiteType(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('blog') || lowerPrompt.includes('article') || lowerPrompt.includes('news')) {
    return 'blog';
  }
  if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('showcase') || lowerPrompt.includes('work')) {
    return 'portfolio';
  }
  if (lowerPrompt.includes('dashboard') || lowerPrompt.includes('admin') || lowerPrompt.includes('analytics')) {
    return 'dashboard';
  }
  if (lowerPrompt.includes('landing') || lowerPrompt.includes('marketing')) {
    return 'landing';
  }
  if (lowerPrompt.includes('corporate') || lowerPrompt.includes('business') || lowerPrompt.includes('company')) {
    return 'corporate';
  }
  
  return 'ecommerce'; // Default to e-commerce for multi-page
}

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

    // Validate the wireframe structure before broadcasting
    if (!updatedWireframe.json) {
      console.log("Adding missing json key to updatedWireframe");
      updatedWireframe = { json: updatedWireframe };
    }

    console.log(
      "Broadcasting wireframe with structure:",
      JSON.stringify({
        hasJsonKey: !!updatedWireframe.json,
        jsonKeys: updatedWireframe.json
          ? Object.keys(updatedWireframe.json)
          : [],
        hasComponents:
          updatedWireframe.json && !!updatedWireframe.json.components,
        componentsLength:
          updatedWireframe.json && updatedWireframe.json.components
            ? updatedWireframe.json.components.length
            : 0,
      })
    );

    // Broadcast the updated wireframe to all connected Figma plugins
    broadcastToFigma({ type: "wireframe-json", data: updatedWireframe.json });

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
