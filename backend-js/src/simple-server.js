require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');
const { MongoDBService } = require('./config/mongodb');

// Initialize DeepSeek API client using OpenAI SDK
let deepSeekClient;
try {
  const deepSeekApiKey = process.env.DEEPSEEK_API_KEY?.replace(/"/g, '').trim();
  console.log('🧠 DeepSeek API Key loaded:', deepSeekApiKey ? 'YES' : 'NOT FOUND');
  
  if (deepSeekApiKey) {
    deepSeekClient = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: deepSeekApiKey
    });
    console.log('✅ DeepSeek AI client initialized successfully');
  } else {
    console.log('⚠️ No DeepSeek API key found, will use template generation');
  }
} catch (error) {
  console.error('❌ Failed to initialize DeepSeek client:', error);
  deepSeekClient = null;
}

// Simple Express server for registration
const app = express();

// Middleware - parse CORS_ORIGINS from env (supports JSON array or comma-separated)
let corsOrigins;
if (process.env.CORS_ORIGINS) {
  try {
    const parsed = JSON.parse(process.env.CORS_ORIGINS);
    corsOrigins = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    corsOrigins = process.env.CORS_ORIGINS.split(',').map(o => o.trim());
  }
} else {
  corsOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://advanced-ui-workflow-frontend.vercel.app'
  ];
}

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicitly handle preflight for all routes
app.options('*', cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// In-memory user storage (fallback when DB unavailable)
const users = new Map();

// In-memory onboarding cache
const onboardingCache = new Map();

// MongoDB connection
const mongoDB = new MongoDBService();
let useDB = false;

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || '';
  if (!mongoUri) {
    console.log('⚠️ No MONGODB_URI configured, using in-memory storage');
    useDB = false;
    return;
  }
  try {
    const connected = await mongoDB.connect(mongoUri);
    useDB = connected;
    if (!connected) {
      console.log('⚠️ Falling back to in-memory storage');
    }
  } catch (err) {
    console.log('❌ MongoDB connection error:', err.message);
    console.log('⚠️ Falling back to in-memory storage');
    useDB = false;
  }
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Auth middleware - verifies JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    // Redact sensitive data from logs
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '[REDACTED]';
    if (logBody.token) logBody.token = '[REDACTED]';
    console.log('Request body:', logBody);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  console.log('=== REGISTRATION ENDPOINT HIT ===');
  
  try {
    const { email, password, full_name } = req.body;
    console.log('Registration data received:', { email, full_name, passwordLength: password?.length });

    // Validate required fields
    if (!email || !password || !full_name) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        error: 'Email, password, and full name are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Validate full_name length
    if (full_name.trim().length < 2 || full_name.trim().length > 100) {
      return res.status(400).json({ error: 'Full name must be between 2 and 100 characters' });
    }

    const userEmail = email.toLowerCase();
    let user;

    if (useDB) {
      console.log('Using MongoDB database...');
      
      // Check if user already exists
      console.log('Checking if user exists...');
      try {
        const existingUser = await mongoDB.getUserByEmail(userEmail);
        if (existingUser) {
          console.log('User already exists');
          return res.status(400).json({ error: 'User already exists with this email' });
        }
      } catch (checkErr) {
        console.error('Error checking existing user:', checkErr.message);
        console.log('Falling back to in-memory storage');
        useDB = false;
      }
    }

    if (!useDB) {
      console.log('Using in-memory storage...');
      
      // Check if user already exists in memory
      if (users.has(userEmail)) {
        console.log('User already exists in memory');
        return res.status(400).json({ error: 'User already exists with this email' });
      }
    }

    // Hash password
    console.log('Hashing password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate a unique ID for the user
    const userId = require('crypto').randomUUID();
    
    // Create user data
    const userData = {
      id: userId,
      email: userEmail,
      password_hash: passwordHash,
      full_name,
      profile_completed: false,
      onboarding_step: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (useDB) {
      console.log('Creating user in MongoDB...');
      try {
        user = await mongoDB.createUser(userData);
      } catch (createErr) {
        console.error('Error creating user in MongoDB:', createErr.message);
        console.log('Falling back to in-memory storage');
        useDB = false;
        users.set(userEmail, userData);
        user = userData;
      }
    } else {
      console.log('Creating user in memory...');
      users.set(userEmail, userData);
      user = userData;
    }

    console.log('User created successfully:', user.id);

    // Generate JWT token
    console.log('Generating JWT token...');
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password hash from response
    const { password_hash, ...userResponse } = user;

    console.log('Registration successful for user:', user.id);
    res.status(201).json({
      access_token: token,
      token_type: 'Bearer',
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log('=== LOGIN ENDPOINT HIT ===');
  
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userEmail = email.toLowerCase();
    let user;

    if (useDB) {
      console.log('Looking up user in MongoDB...');
      try {
        user = await mongoDB.getUserByEmail(userEmail);
      } catch (lookupErr) {
        console.log('MongoDB error, falling back to memory');
        useDB = false;
      }
    }

    if (!useDB) {
      console.log('Looking up user in memory...');
      user = users.get(userEmail);
    }

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password hash from response
    const { password_hash, ...userResponse } = user;

    console.log('Login successful for user:', user.id);
    res.json({
      access_token: token,
      token_type: 'Bearer',
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Onboarding endpoints
app.post('/api/onboarding', async (req, res) => {
  console.log('=== ONBOARDING SAVE ENDPOINT HIT ===');
  
  try {
    const { user_id, role, responses, complexity_level, ai_preferences } = req.body;
    console.log('Onboarding data received:', { user_id, role, complexity_level });

    if (!user_id || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }

    // Prepare onboarding data
    const onboardingData = {
      role,
      responses,
      complexity_level,
      ai_preferences,
      completed_at: new Date().toISOString()
    };

    // CACHE FIRST STRATEGY - Always save to cache first
    console.log('💾 Saving onboarding data to cache memory...');
    onboardingCache.set(user_id, onboardingData);
    console.log('✅ CACHE MEMORY STORED - Onboarding data cached successfully');

    let storageMethod = 'cache';

    // Then try to save to MongoDB as backup
    if (useDB) {
      console.log('🔄 Also saving to MongoDB database...');
      try {
        await mongoDB.updateUser(user_id, {
          onboarding_data: onboardingData,
        });

        console.log('✅ Onboarding data also saved to MongoDB database');
        storageMethod = 'cache+database';
      } catch (error) {
        console.log('❌ MongoDB save failed, but cache storage successful');
        useDB = false;
      }
    } else {
      console.log('📴 Database unavailable, using cache-only storage');
    }

    res.json({
      success: true,
      message: 'Onboarding data saved successfully',
      storage: storageMethod,
      cached: true
    });

  } catch (error) {
    console.error('Onboarding save error:', error);
    res.status(500).json({ error: 'Failed to save onboarding data' });
  }
});

// Get onboarding data
app.get('/api/onboarding/:userId', async (req, res) => {
  console.log('=== ONBOARDING GET ENDPOINT HIT ===');
  
  try {
    const { userId } = req.params;
    console.log('Getting onboarding data for user:', userId);

    let onboardingData = null;
    let source = 'cache';

    // CACHE FIRST STRATEGY - Check cache memory first
    if (onboardingCache.has(userId)) {
      console.log('💾 Getting onboarding data from cache memory...');
      onboardingData = onboardingCache.get(userId);
      console.log('✅ CACHE MEMORY RETRIEVED - Data found in cache:', !!onboardingData);
      source = 'cache';
    }

    // If not in cache, try MongoDB as fallback
    if (!onboardingData && useDB) {
      console.log('🔄 Cache miss, checking MongoDB database...');
      try {
        const user = await mongoDB.getUserById(userId);
        onboardingData = user?.onboarding_data;
        if (onboardingData) {
          console.log('📊 Retrieved from MongoDB database');
          // Store in cache for future requests
          console.log('💾 Caching data from database for faster access...');
          onboardingCache.set(userId, onboardingData);
          console.log('✅ CACHE MEMORY STORED - Database data cached');
          source = 'database';
        }
      } catch (error) {
        console.log('❌ MongoDB get failed:', error.message);
        useDB = false;
      }
    }

    res.json({
      success: true,
      data: onboardingData,
      source: source,
      cached: onboardingCache.has(userId)
    });

  } catch (error) {
    console.error('Onboarding get error:', error);
    res.status(500).json({ error: 'Failed to get onboarding data' });
  }
});

// Check onboarding status
app.get('/api/onboarding/:userId/status', async (req, res) => {
  console.log('=== ONBOARDING STATUS ENDPOINT HIT ===');
  
  try {
    const { userId } = req.params;
    console.log('Checking onboarding status for user:', userId);

    let completed = false;
    let source = 'cache';

    // CACHE FIRST STRATEGY - Check cache memory first
    if (onboardingCache.has(userId)) {
      console.log('💾 Checking onboarding status from cache memory...');
      const cacheData = onboardingCache.get(userId);
      completed = cacheData && Object.keys(cacheData).length > 0;
      console.log('✅ CACHE MEMORY RETRIEVED - Status from cache:', completed);
      source = 'cache';
    }

    // If not in cache, try MongoDB as fallback
    if (!completed && useDB) {
      console.log('🔄 Cache miss, checking MongoDB database for status...');
      try {
        const user = await mongoDB.getUserById(userId);
        const dbData = user?.onboarding_data;
        completed = dbData && Object.keys(dbData).length > 0;
        
        if (dbData) {
          console.log('📊 Status retrieved from MongoDB database:', completed);
          // Cache the data for future requests
          console.log('💾 Caching status data for faster access...');
          onboardingCache.set(userId, dbData);
          console.log('✅ CACHE MEMORY STORED - Status data cached');
          source = 'database';
        }
      } catch (error) {
        console.log('❌ MongoDB status check failed:', error.message);
        useDB = false;
      }
    }

    res.json({
      success: true,
      completed,
      source: source,
      cached: onboardingCache.has(userId)
    });

  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({ error: 'Failed to check onboarding status' });
  }
});

// Questionnaire routes
app.post('/api/questionnaire/start', (req, res) => {
  console.log('=== QUESTIONNAIRE START ===');
  const { prompt } = req.body;
  
  const sessionId = Date.now().toString();
  const questions = [
    "What are the primary user goals for this interface?",
    "What type of content will be displayed?",
    "How many main sections do you need?",
    "What actions should users be able to perform?"
  ];
  
  res.json({
    sessionId,
    question: questions[0],
    totalQuestions: questions.length,
    currentQuestion: 1
  });
});

app.post('/api/questionnaire/answer', (req, res) => {
  console.log('=== QUESTIONNAIRE ANSWER ===');
  const { sessionId, answer, currentQuestion } = req.body;
  
  const questions = [
    "What are the primary user goals for this interface?",
    "What type of content will be displayed?", 
    "How many main sections do you need?",
    "What actions should users be able to perform?"
  ];
  
  if (currentQuestion < questions.length) {
    res.json({
      sessionId,
      question: questions[currentQuestion],
      totalQuestions: questions.length,
      currentQuestion: currentQuestion + 1
    });
  } else {
    res.json({
      completed: true,
      wireframe: {
        screen: "Main Dashboard",
        layout: { type: "grid", columns: 3 },
        fields: ["header", "navigation", "content", "sidebar", "footer"]
      }
    });
  }
});

// =====================================================
// PROJECT CRUD ENDPOINTS
// =====================================================

// In-memory projects storage (fallback)
const projectsCache = new Map();

// GET /api/projects - List user's projects
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    let projects = [];

    if (useDB) {
      try {
        projects = await mongoDB.getUserProjects(userId);
      } catch (err) {
        console.error('DB error fetching projects:', err.message);
      }
    }
    
    // Also include in-memory projects for this user
    const memProjects = projectsCache.get(userId) || [];
    const allProjects = [...projects, ...memProjects];

    res.json(allProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects - Create a new project
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projectData = {
      user_id: userId,
      name: name.trim(),
      description: description || '',
      type: type || 'wireframe',
      status: 'draft',
      is_active: true,
    };

    let project;
    if (useDB) {
      try {
        project = await mongoDB.createProject(projectData);
      } catch (err) {
        console.error('DB error creating project:', err.message);
      }
    }

    if (!project) {
      // Fallback to in-memory
      project = {
        id: require('crypto').randomUUID(),
        ...projectData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const userProjects = projectsCache.get(userId) || [];
      userProjects.push(project);
      projectsCache.set(userId, userProjects);
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id - Get a single project
app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const projectId = req.params.id;
    let project = null;

    if (useDB) {
      try {
        project = await mongoDB.getProjectById(projectId, userId);
      } catch (err) {
        console.error('DB error fetching project:', err.message);
      }
    }

    if (!project) {
      const userProjects = projectsCache.get(userId) || [];
      project = userProjects.find(p => p.id === projectId);
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id - Update a project
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const projectId = req.params.id;
    const updates = req.body;
    let project = null;

    if (useDB) {
      try {
        project = await mongoDB.updateProject(projectId, userId, updates);
      } catch (err) {
        console.error('DB error updating project:', err.message);
      }
    }

    if (!project) {
      const userProjects = projectsCache.get(userId) || [];
      const idx = userProjects.findIndex(p => p.id === projectId);
      if (idx !== -1) {
        userProjects[idx] = { ...userProjects[idx], ...updates, updated_at: new Date().toISOString() };
        project = userProjects[idx];
      }
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Soft-delete a project
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const projectId = req.params.id;
    let deleted = false;

    if (useDB) {
      try {
        const result = await mongoDB.deleteProject(projectId, userId);
        deleted = !!result;
      } catch (err) {
        console.error('DB error deleting project:', err.message);
      }
    }

    if (!deleted) {
      const userProjects = projectsCache.get(userId) || [];
      const idx = userProjects.findIndex(p => p.id === projectId);
      if (idx !== -1) {
        userProjects.splice(idx, 1);
        deleted = true;
      }
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// GET /api/projects/:id/wireframes - Get wireframes for a project
app.get('/api/projects/:id/wireframes', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    let wireframes = [];

    if (useDB) {
      try {
        wireframes = await mongoDB.getProjectWireframes(projectId);
      } catch (err) {
        console.error('DB error fetching wireframes:', err.message);
      }
    }

    res.json(wireframes);
  } catch (error) {
    console.error('Error fetching wireframes:', error);
    res.status(500).json({ error: 'Failed to fetch wireframes' });
  }
});

// GET /api/user/stats - Get dashboard stats for current user
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    let projects = [];

    if (useDB) {
      try {
        projects = await mongoDB.getUserProjects(userId);
      } catch (err) {
        console.error('DB error fetching stats:', err.message);
      }
    }

    const memProjects = projectsCache.get(userId) || [];
    const allProjects = [...projects, ...memProjects];

    const stats = {
      totalProjects: allProjects.length,
      inProgress: allProjects.filter(p => p.status === 'draft' || p.status === 'in_progress').length,
      completed: allProjects.filter(p => p.status === 'completed').length,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.post('/figma/generate', (req, res) => {
  console.log('=== FIGMA GENERATE ===');
  const { wireframe } = req.body;
  
  res.json({
    success: true,
    message: 'Wireframe sent to Figma',
    figmaUrl: 'https://figma.com/generated-design'
  });
});

// Wireframe generation route with Groq
// Store wireframe sessions for context-aware modifications
const wireframeSessions = new Map();

app.post('/api/wireframe/generate', async (req, res) => {
  console.log('=== WIREFRAME GENERATION ===');
  
  try {
    const { prompt, sessionId, existingWireframe } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Generating wireframe for prompt:', prompt);

    // Check if this is a modification request
    const isModification = detectModificationRequest(prompt);
    let wireframeData;

    if (isModification && (existingWireframe || (sessionId && wireframeSessions.has(sessionId)))) {
      // Modify existing wireframe using AI
      const currentWireframe = existingWireframe || wireframeSessions.get(sessionId);
      console.log('=== AI MODIFICATION DETECTED ===');
      console.log('Prompt:', prompt);
      console.log('Current wireframe has', currentWireframe.pages ? currentWireframe.pages.length : 'no', 'pages');
      
      wireframeData = await modifyWireframeWithAI(prompt, currentWireframe);
      console.log('=== AI MODIFICATION COMPLETED ===');
      console.log('Modified wireframe has', wireframeData.pages ? wireframeData.pages.length : 'no', 'pages');
    } else {
      // Generate new wireframe using AI
      wireframeData = await generateWireframeWithAI(prompt);
      console.log('Generated new wireframe with AI');
    }

    // Store in session for future modifications
    const currentSessionId = sessionId || Date.now().toString();
    wireframeSessions.set(currentSessionId, wireframeData);
    
    console.log('=== SENDING RESPONSE ===');
    console.log('Success:', true);
    console.log('Is Modification:', isModification);
    console.log('Session ID:', currentSessionId);
    console.log('Wireframe Data Structure:', {
      appType: wireframeData.appType,
      totalPages: wireframeData.totalPages,
      pagesCount: wireframeData.pages ? wireframeData.pages.length : 0
    });

    res.json({
      success: true,
      wireframe: wireframeData,
      sessionId: currentSessionId,
      isModification,
      message: isModification ? 'Wireframe modified successfully' : 'Wireframe generated successfully'
    });

  } catch (error) {
    console.error('Wireframe generation error:', error);
    res.status(500).json({ error: 'Failed to generate wireframe' });
  }
});

// Detect if prompt is requesting modifications to existing wireframe
function detectModificationRequest(prompt) {
  const modificationKeywords = [
    'change', 'modify', 'update', 'edit', 'alter', 'adjust', 'fix',
    'add color', 'make it', 'improve', 'enhance', 'remove', 'delete',
    'move', 'resize', 'reposition', 'style', 'design', 'layout',
    'different', 'better', 'new color', 'background', 'font'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return modificationKeywords.some(keyword => lowerPrompt.includes(keyword));
}

// Modify existing wireframe based on user feedback
function modifyExistingWireframe(prompt, currentWireframe) {
  const lowerPrompt = prompt.toLowerCase();
  let modifiedWireframe = JSON.parse(JSON.stringify(currentWireframe)); // Deep clone
  
  console.log('Modifying wireframe with prompt:', prompt);
  console.log('Current wireframe structure:', JSON.stringify(currentWireframe, null, 2));
  
  // Handle color modifications - expanded detection
  if (lowerPrompt.includes('color') || lowerPrompt.includes('background') || 
      lowerPrompt.includes('red') || lowerPrompt.includes('blue') || lowerPrompt.includes('green') ||
      lowerPrompt.includes('yellow') || lowerPrompt.includes('purple') || lowerPrompt.includes('orange') ||
      lowerPrompt.includes('make it')) {
    
    const colors = extractColorsFromPrompt(prompt);
    console.log('Extracted colors:', colors);
    
    if (colors.length > 0) {
      modifiedWireframe = applyColorChanges(modifiedWireframe, colors);
      console.log('Applied color changes');
    } else {
      // If no specific color found but "make it red" type prompt, default to red
      if (lowerPrompt.includes('red')) {
        modifiedWireframe = applyColorChanges(modifiedWireframe, [{ name: 'red', hex: '#EF4444' }]);
        console.log('Applied default red color');
      }
    }
  }
  
  // Handle component additions
  if (lowerPrompt.includes('add') && !lowerPrompt.includes('color')) {
    const componentType = extractComponentType(prompt);
    if (componentType) {
      modifiedWireframe = addComponentToWireframe(modifiedWireframe, componentType);
    }
  }
  
  // Handle layout changes
  if (lowerPrompt.includes('layout') || lowerPrompt.includes('design') || lowerPrompt.includes('arrange')) {
    modifiedWireframe = adjustLayout(modifiedWireframe, prompt);
  }
  
  // Handle style improvements
  if (lowerPrompt.includes('improve') || lowerPrompt.includes('better') || lowerPrompt.includes('enhance')) {
    modifiedWireframe = enhanceDesign(modifiedWireframe);
  }
  
  // Handle general design changes - catch-all for vague modification requests
  if (lowerPrompt.includes('design') || lowerPrompt.includes('change') || lowerPrompt.includes('different')) {
    console.log('Applying general design changes');
    modifiedWireframe = applyGeneralDesignChanges(modifiedWireframe);
  }
  
  console.log('Final modified wireframe:', JSON.stringify(modifiedWireframe, null, 2));
  return modifiedWireframe;
}

// Extract colors mentioned in prompt
function extractColorsFromPrompt(prompt) {
  const colorMap = {
    'blue': '#3B82F6', 'red': '#EF4444', 'green': '#10B981', 'yellow': '#F59E0B',
    'purple': '#8B5CF6', 'pink': '#EC4899', 'orange': '#F97316', 'gray': '#6B7280',
    'black': '#000000', 'white': '#FFFFFF', 'dark': '#1F2937', 'light': '#F9FAFB'
  };
  
  const colors = [];
  Object.keys(colorMap).forEach(colorName => {
    if (prompt.toLowerCase().includes(colorName)) {
      colors.push({ name: colorName, hex: colorMap[colorName] });
    }
  });
  
  return colors;
}

// Apply color changes to wireframe
function applyColorChanges(wireframe, colors) {
  console.log('Applying color changes to wireframe:', colors);
  
  if (wireframe.pages) {
    // Multi-page wireframe
    wireframe.pages.forEach((page, pageIndex) => {
      console.log(`Processing page ${pageIndex} with ${page.components.length} components`);
      page.components.forEach((component, compIndex) => {
        if (colors.length > 0) {
          const color = colors[0]; // Use first color found
          console.log(`Applying color ${color.hex} to component ${compIndex} of type ${component.type}`);
          
          if (component.type === 'button') {
            component.backgroundColor = color.hex;
            component.textColor = color.hex === '#FFFFFF' ? '#000000' : '#FFFFFF';
          } else if (component.type === 'container' || component.type === 'navigation') {
            component.backgroundColor = color.hex;
          } else if (component.type === 'text') {
            component.textColor = color.hex;
          } else if (component.type === 'input') {
            component.borderColor = color.hex;
            component.backgroundColor = color.hex + '20'; // Add transparency
          }
          
          // Ensure the component has the color properties
          if (!component.backgroundColor && component.type !== 'text') {
            component.backgroundColor = color.hex;
          }
          if (!component.textColor) {
            component.textColor = color.hex === '#FFFFFF' ? '#000000' : '#FFFFFF';
          }
        }
      });
    });
  } else if (wireframe.components) {
    // Single page wireframe
    console.log(`Processing single page with ${wireframe.components.length} components`);
    wireframe.components.forEach((component, compIndex) => {
      if (colors.length > 0) {
        const color = colors[0];
        console.log(`Applying color ${color.hex} to component ${compIndex} of type ${component.type}`);
        
        if (component.type === 'button') {
          component.backgroundColor = color.hex;
          component.textColor = color.hex === '#FFFFFF' ? '#000000' : '#FFFFFF';
        } else if (component.type === 'container' || component.type === 'navigation') {
          component.backgroundColor = color.hex;
        } else if (component.type === 'text') {
          component.textColor = color.hex;
        } else if (component.type === 'input') {
          component.borderColor = color.hex;
          component.backgroundColor = color.hex + '20'; // Add transparency
        }
        
        // Ensure the component has the color properties
        if (!component.backgroundColor && component.type !== 'text') {
          component.backgroundColor = color.hex;
        }
        if (!component.textColor) {
          component.textColor = color.hex === '#FFFFFF' ? '#000000' : '#FFFFFF';
        }
      }
    });
  }
  
  console.log('Color changes applied successfully');
  return wireframe;
}

// Extract component type from prompt
function extractComponentType(prompt) {
  const componentMap = {
    'button': 'button', 'input': 'input', 'text': 'text', 'image': 'image',
    'navigation': 'navigation', 'nav': 'navigation', 'menu': 'navigation',
    'container': 'container', 'box': 'container', 'section': 'container'
  };
  
  const lowerPrompt = prompt.toLowerCase();
  for (const [keyword, type] of Object.entries(componentMap)) {
    if (lowerPrompt.includes(keyword)) {
      return type;
    }
  }
  return null;
}

// Add component to wireframe
function addComponentToWireframe(wireframe, componentType) {
  const newComponent = {
    id: Date.now(),
    type: componentType,
    x: Math.random() * 300 + 100,
    y: Math.random() * 200 + 100,
    width: componentType === 'button' ? 120 : 200,
    height: componentType === 'input' ? 40 : (componentType === 'button' ? 40 : 60),
    text: getDefaultText(componentType),
    backgroundColor: '#F3F4F6',
    textColor: '#374151'
  };
  
  if (wireframe.pages) {
    // Add to first page
    wireframe.pages[0].components.push(newComponent);
  } else if (wireframe.components) {
    wireframe.components.push(newComponent);
  }
  
  return wireframe;
}

// Get default text for component type
function getDefaultText(type) {
  const defaults = {
    'button': 'New Button',
    'text': 'New Text',
    'input': 'Enter text...',
    'navigation': 'Navigation',
    'container': 'Container'
  };
  return defaults[type] || 'Component';
}

// Adjust layout based on prompt
function adjustLayout(wireframe, prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (wireframe.pages) {
    wireframe.pages.forEach(page => {
      if (lowerPrompt.includes('center') || lowerPrompt.includes('middle')) {
        centerComponents(page.components);
      } else if (lowerPrompt.includes('left')) {
        alignComponentsLeft(page.components);
      } else if (lowerPrompt.includes('right')) {
        alignComponentsRight(page.components);
      }
    });
  } else if (wireframe.components) {
    if (lowerPrompt.includes('center') || lowerPrompt.includes('middle')) {
      centerComponents(wireframe.components);
    } else if (lowerPrompt.includes('left')) {
      alignComponentsLeft(wireframe.components);
    } else if (lowerPrompt.includes('right')) {
      alignComponentsRight(wireframe.components);
    }
  }
  
  return wireframe;
}

// Center components
function centerComponents(components) {
  components.forEach(component => {
    component.x = 400 - (component.width / 2);
  });
}

// Align components left
function alignComponentsLeft(components) {
  components.forEach(component => {
    component.x = 50;
  });
}

// Align components right
function alignComponentsRight(components) {
  components.forEach(component => {
    component.x = 750 - component.width;
  });
}

// Apply general design changes for vague modification requests
function applyGeneralDesignChanges(wireframe) {
  console.log('Applying general design changes');
  
  const designVariations = [
    { colors: ['#3B82F6', '#1E40AF', '#60A5FA'], theme: 'blue' },
    { colors: ['#10B981', '#059669', '#34D399'], theme: 'green' },
    { colors: ['#F59E0B', '#D97706', '#FBBF24'], theme: 'orange' },
    { colors: ['#EF4444', '#DC2626', '#F87171'], theme: 'red' },
    { colors: ['#8B5CF6', '#7C3AED', '#A78BFA'], theme: 'purple' }
  ];
  
  // Pick a random design variation
  const variation = designVariations[Math.floor(Math.random() * designVariations.length)];
  console.log('Selected design variation:', variation.theme);
  
  if (wireframe.pages) {
    wireframe.pages.forEach(page => {
      page.components.forEach((component, index) => {
        applyDesignVariation(component, variation, index);
      });
    });
  } else if (wireframe.components) {
    wireframe.components.forEach((component, index) => {
      applyDesignVariation(component, variation, index);
    });
  }
  
  return wireframe;
}

// Apply design variation to a single component
function applyDesignVariation(component, variation, index) {
  const primaryColor = variation.colors[0];
  const secondaryColor = variation.colors[1];
  const accentColor = variation.colors[2];
  
  switch (component.type) {
    case 'button':
      component.backgroundColor = primaryColor;
      component.textColor = '#FFFFFF';
      component.borderRadius = 8;
      component.padding = '12px 24px';
      break;
      
    case 'navigation':
      component.backgroundColor = secondaryColor;
      component.textColor = '#FFFFFF';
      component.borderRadius = 0;
      break;
      
    case 'container':
      component.backgroundColor = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
      component.borderColor = primaryColor;
      component.borderRadius = 12;
      component.borderWidth = 2;
      break;
      
    case 'text':
      component.textColor = index % 3 === 0 ? primaryColor : '#374151';
      component.fontSize = component.text?.includes('Title') ? '24px' : '16px';
      break;
      
    case 'input':
      component.borderColor = primaryColor;
      component.backgroundColor = '#FFFFFF';
      component.borderRadius = 6;
      component.borderWidth = 2;
      break;
      
    case 'image':
      component.borderRadius = 8;
      component.borderColor = accentColor;
      component.borderWidth = 1;
      break;
  }
}

// Enhance design with better styling
function enhanceDesign(wireframe) {
  const modernColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  if (wireframe.pages) {
    wireframe.pages.forEach(page => {
      page.components.forEach((component, index) => {
        if (component.type === 'button') {
          component.backgroundColor = modernColors[index % modernColors.length];
          component.textColor = '#FFFFFF';
          component.borderRadius = 8;
        } else if (component.type === 'container') {
          component.backgroundColor = '#F9FAFB';
          component.borderColor = '#E5E7EB';
          component.borderRadius = 12;
        }
      });
    });
  } else if (wireframe.components) {
    wireframe.components.forEach((component, index) => {
      if (component.type === 'button') {
        component.backgroundColor = modernColors[index % modernColors.length];
        component.textColor = '#FFFFFF';
        component.borderRadius = 8;
      } else if (component.type === 'container') {
        component.backgroundColor = '#F9FAFB';
        component.borderColor = '#E5E7EB';
        component.borderRadius = 12;
      }
    });
  }
  
  return wireframe;
}

// AI-powered wireframe generation using DeepSeek
async function generateWireframeWithAI(prompt) {
  try {
    console.log('=== GENERATING WIREFRAME WITH DEEPSEEK AI ===');
    console.log('User prompt:', prompt);

    if (!deepSeekClient) {
      console.log('🧠 DeepSeek not initialized, falling back to template generation');
      return generateWireframeFromPrompt(prompt);
    }

    const systemPrompt = `You are an expert UI/UX designer and wireframe generator. Generate detailed wireframe specifications based on user prompts.

IMPORTANT: You must respond with ONLY valid JSON in this exact format:

{
  "appType": "e-commerce",
  "pages": [
    {
      "id": "home",
      "title": "Homepage",
      "type": "landing",
      "components": [
        {
          "id": 1,
          "type": "navigation",
          "x": 0,
          "y": 0,
          "width": 1200,
          "height": 60,
          "text": "Main Navigation",
          "backgroundColor": "#2563EB",
          "textColor": "#FFFFFF",
          "borderRadius": 0,
          "links": ["about", "contact"]
        }
      ]
    }
  ],
  "totalPages": 1,
  "userFlow": []
}

Generate wireframes with:
- Multiple interconnected pages for complex apps
- Proper component positioning (x,y coordinates)
- Modern color schemes (#2563EB, #F8FAFC, #FFFFFF, etc.)
- Navigation links between pages
- Realistic component dimensions
- User flow mapping

User request: ${prompt}

Respond with ONLY the JSON, no explanations or markdown.`;

    const completion = await deepSeekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a wireframe for: ${prompt}` }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('🧠 DeepSeek AI Response:', aiResponse);

    // Clean response and parse JSON
    const cleanResponse = aiResponse.replace(/```json|```/g, '').trim();
    const wireframeData = JSON.parse(cleanResponse);
    console.log('✅ Successfully generated wireframe with DeepSeek');

    return wireframeData;

  } catch (error) {
    console.error('🧠 DeepSeek AI wireframe generation error:', error);
    
    // Fallback to template-based generation
    console.log('Falling back to template-based generation');
    return generateWireframeFromPrompt(prompt);
  }
}

// Initialize Google Gemini AI client (optional, for wireframe modification)
let genAI = null;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const googleApiKey = process.env.GOOGLE_API_KEY?.trim();
  if (googleApiKey) {
    genAI = new GoogleGenerativeAI(googleApiKey);
    console.log('\u2705 Gemini AI client initialized for wireframe modification');
  }
} catch {
  console.log('\u26a0\ufe0f @google/generative-ai not installed, Gemini modification unavailable');
}

// AI-powered wireframe modification using Google Gemini
async function modifyWireframeWithAI(prompt, currentWireframe) {
  try {
    console.log('=== MODIFYING WIREFRAME WITH GEMINI AI ===');
    console.log('Modification prompt:', prompt);

    if (!genAI) {
      console.log('Gemini not initialized, falling back to rule-based modification');
      return modifyExistingWireframe(prompt, currentWireframe);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `You are an expert UI/UX designer. Modify the existing wireframe based on user feedback.

Current wireframe: ${JSON.stringify(currentWireframe, null, 2)}

User wants to: ${prompt}

IMPORTANT: You must respond with ONLY valid JSON in the same format as the input wireframe.

Modify the wireframe by:
- Changing colors if requested
- Adding/removing components if requested  
- Adjusting layouts if requested
- Improving design if requested
- Maintaining the same structure and page flow

Respond with ONLY the modified JSON, no explanations or markdown.`;

    const result = await model.generateContent(systemPrompt);
    const aiResponse = result.response.text();
    console.log('Gemini AI Modification Response:', aiResponse);

    // Clean response and parse JSON
    const cleanResponse = aiResponse.replace(/```json|```/g, '').trim();
    const modifiedWireframe = JSON.parse(cleanResponse);
    console.log('Gemini AI modified wireframe successfully');

    return modifiedWireframe;

  } catch (error) {
    console.error('Gemini AI wireframe modification error:', error);
    
    // Fallback to rule-based modification
    console.log('Falling back to rule-based modification');
    return modifyExistingWireframe(prompt, currentWireframe);
  }
}

// Enhanced wireframe generator function (fallback)
function generateWireframeFromPrompt(prompt) {
  console.log('Generating wireframe for prompt:', prompt);
  
  const lowerPrompt = prompt.toLowerCase();
  
  // Detect application type and generate multiple pages
  const appType = detectApplicationType(lowerPrompt);
  const pages = generateMultiPageStructure(lowerPrompt, appType);
  
  return {
    appType,
    pages,
    totalPages: pages.length,
    userFlow: generateUserFlow(pages)
  };
}

function detectApplicationType(prompt) {
  if (prompt.includes('ecommerce') || prompt.includes('e-commerce') || 
      prompt.includes('shop') || prompt.includes('store') || 
      prompt.includes('product') || prompt.includes('cart') || 
      prompt.includes('checkout')) {
    return 'ecommerce';
  }
  
  if (prompt.includes('saas') || prompt.includes('dashboard') || 
      prompt.includes('analytics') || prompt.includes('subscription')) {
    return 'saas';
  }
  
  if (prompt.includes('blog') || prompt.includes('article') || 
      prompt.includes('post') || prompt.includes('content')) {
    return 'blog';
  }
  
  if (prompt.includes('portfolio') || prompt.includes('showcase')) {
    return 'portfolio';
  }
  
  return 'general';
}

function generateMultiPageStructure(prompt, appType) {
  const pages = [];
  
  switch (appType) {
    case 'ecommerce':
      pages.push(
        generatePage('home', 'Homepage', generateEcommerceHomepage()),
        generatePage('products', 'Product Listing', generateProductListing()),
        generatePage('product-detail', 'Product Detail', generateProductDetail()),
        generatePage('cart', 'Shopping Cart', generateShoppingCart()),
        generatePage('checkout', 'Checkout', generateCheckout()),
        generatePage('login', 'Login', generateLoginPage()),
        generatePage('signup', 'Sign Up', generateSignupPage())
      );
      break;
      
    case 'saas':
      pages.push(
        generatePage('landing', 'Landing Page', generateSaaSLanding()),
        generatePage('features', 'Features', generateFeaturesPage()),
        generatePage('pricing', 'Pricing', generatePricingPage()),
        generatePage('dashboard', 'Dashboard', generateDashboard()),
        generatePage('settings', 'Settings', generateSettingsPage()),
        generatePage('login', 'Login', generateLoginPage())
      );
      break;
      
    case 'blog':
      pages.push(
        generatePage('home', 'Blog Home', generateBlogHome()),
        generatePage('post-list', 'Post List', generatePostList()),
        generatePage('post-detail', 'Post Detail', generatePostDetail()),
        generatePage('about', 'About', generateAboutPage()),
        generatePage('contact', 'Contact', generateContactPage())
      );
      break;
      
    default:
      // Generate single page based on prompt keywords
      pages.push(generatePage('main', 'Main Page', generateSinglePageFromPrompt(prompt)));
  }
  
  return pages;
}

function generatePage(id, title, components) {
  return {
    id,
    title,
    components,
    links: []
  };
}

function generateEcommerceHomepage() {
  const components = [];
  let currentY = 50;
  
  // Navigation
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'E-commerce Navigation',
    links: ['home', 'products', 'cart', 'login']
  });
  currentY += 80;
  
  // Hero section
  components.push({
    type: 'container',
    x: 50,
    y: currentY,
    width: 700,
    height: 200,
    text: 'Hero Banner'
  });
  currentY += 220;
  
  // Featured products
  components.push({
    type: 'text',
    x: 50,
    y: currentY,
    width: 200,
    height: 30,
    text: 'Featured Products'
  });
  currentY += 50;
  
  // Product grid
  for (let i = 0; i < 3; i++) {
    components.push({
      type: 'container',
      x: 50 + (i * 230),
      y: currentY,
      width: 200,
      height: 150,
      text: `Product ${i + 1}`,
      links: ['product-detail']
    });
  }
  
  return components;
}

function generateProductListing() {
  const components = [];
  let currentY = 50;
  
  // Navigation
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Product Navigation',
    links: ['home', 'cart', 'login']
  });
  currentY += 80;
  
  // Filters sidebar
  components.push({
    type: 'container',
    x: 50,
    y: currentY,
    width: 200,
    height: 400,
    text: 'Filters & Categories'
  });
  
  // Product grid
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      components.push({
        type: 'container',
        x: 280 + (col * 220),
        y: currentY + (row * 130),
        width: 200,
        height: 120,
        text: `Product ${row * 2 + col + 1}`,
        links: ['product-detail']
      });
    }
  }
  
  return components;
}

function generateProductDetail() {
  const components = [];
  let currentY = 50;
  
  // Navigation
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Product Navigation',
    links: ['home', 'products', 'cart']
  });
  currentY += 80;
  
  // Product image
  components.push({
    type: 'image',
    x: 50,
    y: currentY,
    width: 350,
    height: 300,
    text: 'Product Image'
  });
  
  // Product info
  components.push({
    type: 'container',
    x: 420,
    y: currentY,
    width: 330,
    height: 300,
    text: 'Product Details'
  });
  
  // Add to cart button
  components.push({
    type: 'button',
    x: 420,
    y: currentY + 320,
    width: 150,
    height: 40,
    text: 'Add to Cart',
    links: ['cart']
  });
  
  return components;
}

function generateShoppingCart() {
  const components = [];
  let currentY = 50;
  
  // Navigation
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Cart Navigation',
    links: ['home', 'products']
  });
  currentY += 80;
  
  // Cart items
  components.push({
    type: 'text',
    x: 50,
    y: currentY,
    width: 200,
    height: 30,
    text: 'Shopping Cart'
  });
  currentY += 50;
  
  // Cart item list
  for (let i = 0; i < 3; i++) {
    components.push({
      type: 'container',
      x: 50,
      y: currentY + (i * 80),
      width: 500,
      height: 70,
      text: `Cart Item ${i + 1}`
    });
  }
  
  // Checkout button
  components.push({
    type: 'button',
    x: 600,
    y: currentY + 100,
    width: 120,
    height: 40,
    text: 'Checkout',
    links: ['checkout']
  });
  
  return components;
}

function generateCheckout() {
  const components = [];
  let currentY = 50;
  
  // Navigation
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Checkout Navigation',
    links: ['cart']
  });
  currentY += 80;
  
  // Checkout form
  components.push({
    type: 'text',
    x: 50,
    y: currentY,
    width: 200,
    height: 30,
    text: 'Checkout'
  });
  currentY += 50;
  
  // Billing info
  components.push({
    type: 'container',
    x: 50,
    y: currentY,
    width: 350,
    height: 300,
    text: 'Billing Information'
  });
  
  // Order summary
  components.push({
    type: 'container',
    x: 420,
    y: currentY,
    width: 330,
    height: 300,
    text: 'Order Summary'
  });
  
  // Place order button
  components.push({
    type: 'button',
    x: 420,
    y: currentY + 320,
    width: 150,
    height: 40,
    text: 'Place Order'
  });
  
  return components;
}

function generateLoginPage() {
  const components = [];
  const centerX = 400;
  let currentY = 150;
  
  // Login form container
  const formX = centerX - 125;
  components.push(
    {
      type: 'container',
      x: formX - 25,
      y: currentY - 20,
      width: 300,
      height: 250,
      text: 'Login Form'
    },
    {
      type: 'text',
      x: formX + 100,
      y: currentY,
      width: 100,
      height: 30,
      text: 'Login'
    },
    {
      type: 'input',
      x: formX,
      y: currentY + 40,
      width: 250,
      height: 35,
      text: 'Email'
    },
    {
      type: 'input',
      x: formX,
      y: currentY + 85,
      width: 250,
      height: 35,
      text: 'Password'
    },
    {
      type: 'button',
      x: formX + 75,
      y: currentY + 135,
      width: 100,
      height: 40,
      text: 'Login'
    },
    {
      type: 'text',
      x: formX + 50,
      y: currentY + 190,
      width: 150,
      height: 20,
      text: 'Need an account?',
      links: ['signup']
    }
  );
  
  return components;
}

function generateSignupPage() {
  const components = [];
  const centerX = 400;
  let currentY = 120;
  
  // Signup form container
  const formX = centerX - 125;
  components.push(
    {
      type: 'container',
      x: formX - 25,
      y: currentY - 20,
      width: 300,
      height: 320,
      text: 'Signup Form'
    },
    {
      type: 'text',
      x: formX + 100,
      y: currentY,
      width: 100,
      height: 30,
      text: 'Sign Up'
    },
    {
      type: 'input',
      x: formX,
      y: currentY + 40,
      width: 250,
      height: 35,
      text: 'Full Name'
    },
    {
      type: 'input',
      x: formX,
      y: currentY + 85,
      width: 250,
      height: 35,
      text: 'Email'
    },
    {
      type: 'input',
      x: formX,
      y: currentY + 130,
      width: 250,
      height: 35,
      text: 'Password'
    },
    {
      type: 'input',
      x: formX,
      y: currentY + 175,
      width: 250,
      height: 35,
      text: 'Confirm Password'
    },
    {
      type: 'button',
      x: formX + 75,
      y: currentY + 225,
      width: 100,
      height: 40,
      text: 'Sign Up'
    },
    {
      type: 'text',
      x: formX + 50,
      y: currentY + 280,
      width: 150,
      height: 20,
      text: 'Already have account?',
      links: ['login']
    }
  );
  
  return components;
}

function generateSinglePageFromPrompt(prompt) {
  const components = [];
  
  // Canvas dimensions
  const canvasWidth = 800;
  const canvasHeight = 600;
  const leftMargin = 50;
  const centerX = canvasWidth / 2;
  let currentY = 50;
  
  // Navigation bar detection (always at top)
  if (prompt.includes('navigation') || prompt.includes('nav') || prompt.includes('menu')) {
    components.push({
      type: 'navigation',
      x: leftMargin,
      y: 20,
      width: 700,
      height: 50,
      text: 'Navigation'
    });
    currentY = 90;
  }
  
  // Add other components based on prompt
  if (prompt.includes('login')) {
    return generateLoginPage();
  }
  
  return components;
}

function generateUserFlow(pages) {
  const flow = [];
  
  pages.forEach(page => {
    page.components.forEach(component => {
      if (component.links && component.links.length > 0) {
        component.links.forEach(targetPageId => {
          flow.push({
            from: page.id,
            to: targetPageId,
            trigger: component.text || component.type
          });
        });
      }
    });
  });
  
  return flow;
}

// Add missing SaaS page generators
function generateSaaSLanding() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'SaaS Navigation',
    links: ['features', 'pricing', 'login']
  });
  currentY += 80;
  
  components.push({
    type: 'container',
    x: 50,
    y: currentY,
    width: 700,
    height: 250,
    text: 'Hero Section'
  });
  currentY += 270;
  
  components.push({
    type: 'button',
    x: 350,
    y: currentY,
    width: 120,
    height: 40,
    text: 'Get Started',
    links: ['signup']
  });
  
  return components;
}

function generateFeaturesPage() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Features Navigation',
    links: ['landing', 'pricing', 'login']
  });
  currentY += 80;
  
  for (let i = 0; i < 3; i++) {
    components.push({
      type: 'container',
      x: 50 + (i * 230),
      y: currentY,
      width: 200,
      height: 150,
      text: `Feature ${i + 1}`
    });
  }
  
  return components;
}

function generatePricingPage() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Pricing Navigation',
    links: ['landing', 'features', 'login']
  });
  currentY += 80;
  
  for (let i = 0; i < 3; i++) {
    components.push({
      type: 'container',
      x: 50 + (i * 230),
      y: currentY,
      width: 200,
      height: 200,
      text: `Plan ${i + 1}`
    });
  }
  
  return components;
}

function generateDashboard() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Dashboard Navigation',
    links: ['settings']
  });
  currentY += 80;
  
  // Dashboard cards
  for (let i = 0; i < 4; i++) {
    components.push({
      type: 'container',
      x: 50 + (i % 2) * 350,
      y: currentY + Math.floor(i / 2) * 150,
      width: 300,
      height: 120,
      text: `Widget ${i + 1}`
    });
  }
  
  return components;
}

function generateSettingsPage() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Settings Navigation',
    links: ['dashboard']
  });
  currentY += 80;
  
  components.push({
    type: 'container',
    x: 50,
    y: currentY,
    width: 700,
    height: 400,
    text: 'Settings Panel'
  });
  
  return components;
}

// Blog page generators
function generateBlogHome() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Blog Navigation',
    links: ['post-list', 'about', 'contact']
  });
  currentY += 80;
  
  components.push({
    type: 'container',
    x: 50,
    y: currentY,
    width: 700,
    height: 200,
    text: 'Featured Post'
  });
  
  return components;
}

function generatePostList() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Post List Navigation',
    links: ['home', 'about', 'contact']
  });
  currentY += 80;
  
  for (let i = 0; i < 5; i++) {
    components.push({
      type: 'container',
      x: 50,
      y: currentY + (i * 100),
      width: 700,
      height: 80,
      text: `Blog Post ${i + 1}`,
      links: ['post-detail']
    });
  }
  
  return components;
}

function generatePostDetail() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Post Navigation',
    links: ['home', 'post-list']
  });
  currentY += 80;
  
  components.push({
    type: 'container',
    x: 50,
    y: currentY,
    width: 700,
    height: 400,
    text: 'Blog Post Content'
  });
  
  return components;
}

function generateAboutPage() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'About Navigation',
    links: ['home', 'post-list', 'contact']
  });
  currentY += 80;
  
  components.push({
    type: 'container',
    x: 50,
    y: currentY,
    width: 700,
    height: 300,
    text: 'About Content'
  });
  
  return components;
}

function generateContactPage() {
  const components = [];
  let currentY = 50;
  
  components.push({
    type: 'navigation',
    x: 0,
    y: 0,
    width: 800,
    height: 60,
    text: 'Contact Navigation',
    links: ['home', 'post-list', 'about']
  });
  currentY += 80;
  
  components.push({
    type: 'container',
    x: 50,
    y: currentY,
    width: 700,
    height: 300,
    text: 'Contact Form'
  });
  
  return components;
  
  // Header detection
  if (lowerPrompt.includes('header') || lowerPrompt.includes('title')) {
    components.push({
      type: 'text',
      x: centerX - 100,
      y: currentY,
      width: 200,
      height: 40,
      text: 'Page Header'
    });
    currentY += 60;
  }
  
  // Login page detection
  if (lowerPrompt.includes('login') || lowerPrompt.includes('sign in')) {
    // Center the login form
    const formX = centerX - 125;
    components.push(
      {
        type: 'container',
        x: formX - 25,
        y: currentY - 20,
        width: 300,
        height: 200,
        text: 'Login Form'
      },
      {
        type: 'text',
        x: formX + 100,
        y: currentY,
        width: 100,
        height: 30,
        text: 'Login'
      },
      {
        type: 'input',
        x: formX,
        y: currentY + 40,
        width: 250,
        height: 35,
        text: 'Email'
      },
      {
        type: 'input',
        x: formX,
        y: currentY + 85,
        width: 250,
        height: 35,
        text: 'Password'
      },
      {
        type: 'button',
        x: formX + 75,
        y: currentY + 135,
        width: 100,
        height: 40,
        text: 'Login'
      }
    );
    currentY += 220;
  }
  
  // Dashboard detection
  if (lowerPrompt.includes('dashboard') || lowerPrompt.includes('overview')) {
    components.push(
      {
        type: 'text',
        x: leftMargin,
        y: currentY,
        width: 200,
        height: 35,
        text: 'Dashboard Overview'
      }
    );
    currentY += 50;
    
    // Add dashboard cards in a grid
    const cardWidth = 180;
    const cardHeight = 120;
    const cardSpacing = 20;
    
    for (let i = 0; i < 3; i++) {
      components.push({
        type: 'container',
        x: leftMargin + (i * (cardWidth + cardSpacing)),
        y: currentY,
        width: cardWidth,
        height: cardHeight,
        text: ['Analytics', 'Reports', 'Users'][i]
      });
    }
    currentY += cardHeight + 40;
    
    // Add action buttons
    const buttonY = currentY;
    ['View Details', 'Export Data', 'Settings'].forEach((text, i) => {
      components.push({
        type: 'button',
        x: leftMargin + (i * 140),
        y: buttonY,
        width: 120,
        height: 35,
        text: text
      });
    });
    currentY += 60;
  }
  
  // E-commerce detection
  if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop') || lowerPrompt.includes('product')) {
    components.push(
      {
        type: 'input',
        x: 50,
        y: 80,
        width: 300,
        height: 35,
        text: 'Search products...'
      },
      {
        type: 'button',
        x: 360,
        y: 80,
        width: 80,
        height: 35,
        text: 'Search'
      },
      {
        type: 'text',
        x: 50,
        y: 140,
        width: 100,
        height: 20,
        text: 'Products'
      }
    );
  }
  
  // Default components if nothing specific detected
  if (components.length === 0) {
    components.push(
      {
        type: 'text',
        x: 50,
        y: 80,
        width: 200,
        height: 25,
        text: 'Generated Wireframe'
      },
      {
        type: 'button',
        x: 50,
        y: 120,
        width: 120,
        height: 40,
        text: 'Button 1'
      },
      {
        type: 'button',
        x: 180,
        y: 120,
        width: 120,
        height: 40,
        text: 'Button 2'
      }
    );
  }
  
  return {
    screen: 'Generated Screen',
    components: components
  };
}

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, async (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  } else {
    console.log(`🚀 Simple Backend Server Started`);
    console.log(`📍 Server listening on http://${HOST}:${PORT}`);
    
    // Connect to MongoDB on startup
    await connectDatabase();
    
    console.log(`🔗 API endpoints:`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   - GET  http://localhost:${PORT}/health`);
    console.log(`💾 Storage: ${useDB ? 'MongoDB Database' : 'In-Memory (Demo Mode)'}`);
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port or stop the existing server.`);
  }
  process.exit(1);
});

module.exports = app;
