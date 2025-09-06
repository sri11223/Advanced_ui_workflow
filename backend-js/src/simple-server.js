const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Simple Express server for registration
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// In-memory user storage (fallback for demo)
const users = new Map();

// In-memory onboarding cache
const onboardingCache = new Map();

// Supabase configuration - will fallback to memory if connection fails
const supabaseUrl = 'https://fbkddxynrmbxyiuhcssq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZia2RkeHlucm1ieHlpdWhjc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNTE3OTQsImV4cCI6MjA3MjcyNzc5NH0.Yxgc4ld3uc1_QOvP966OE-Evtqd8uOTMDVVtM7kJzu0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection
let useSupabase = true;
async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');
    
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.log('❌ Supabase connection failed:');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Error details:', error.details);
      console.log('Error hint:', error.hint);
      console.log('⚠️  Falling back to in-memory storage');
      useSupabase = false;
    } else {
      console.log('✅ Supabase connection successful');
      console.log('Test query result:', data);
    }
  } catch (err) {
    console.log('❌ Supabase connection error (catch block):');
    console.log('Error:', err.message);
    console.log('⚠️  Falling back to in-memory storage');
    useSupabase = false;
  }
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
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

    const userEmail = email.toLowerCase();
    let user;

    if (useSupabase) {
      console.log('Using Supabase database...');
      
      // Check if user already exists
      console.log('Checking if user exists...');
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        console.log('Falling back to in-memory storage');
        useSupabase = false;
      } else if (existingUser) {
        console.log('User already exists');
        return res.status(400).json({ error: 'User already exists with this email' });
      }
    }

    if (!useSupabase) {
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
    
    // Create user data (matching your Supabase schema)
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

    if (useSupabase) {
      console.log('Creating user in Supabase...');
      const { data: supabaseUser, error: createError } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (createError) {
        console.error('Error creating user in Supabase:', createError);
        console.log('Falling back to in-memory storage');
        useSupabase = false;
        users.set(userEmail, userData);
        user = userData;
      } else {
        user = supabaseUser;
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

    if (useSupabase) {
      console.log('Looking up user in Supabase...');
      const { data: supabaseUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.log('Supabase error, falling back to memory');
        useSupabase = false;
      } else {
        user = supabaseUser;
      }
    }

    if (!useSupabase) {
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

    // Then try to save to Supabase as backup
    if (useSupabase) {
      console.log('🔄 Also attempting to save to Supabase database...');
      try {
        const { data: userUpdateData, error: userError } = await supabase
          .from('users')
          .update({
            onboarding_data: onboardingData,
            updated_at: new Date().toISOString()
          })
          .eq('id', user_id);

        if (userError) {
          console.log('⚠️ Supabase update failed:', userError);
          throw userError;
        }

        console.log('✅ Onboarding data also saved to Supabase database');
        storageMethod = 'cache+database';
      } catch (error) {
        console.log('❌ Supabase save failed, but cache storage successful');
        useSupabase = false;
      }
    } else {
      console.log('📴 Supabase unavailable, using cache-only storage');
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

    // If not in cache, try Supabase as fallback
    if (!onboardingData && useSupabase) {
      console.log('🔄 Cache miss, checking Supabase database...');
      try {
        const { data, error } = await supabase
          .from('users')
          .select('onboarding_data')
          .eq('id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        onboardingData = data?.onboarding_data;
        if (onboardingData) {
          console.log('📊 Retrieved from Supabase database');
          // Store in cache for future requests
          console.log('💾 Caching data from database for faster access...');
          onboardingCache.set(userId, onboardingData);
          console.log('✅ CACHE MEMORY STORED - Database data cached');
          source = 'database';
        }
      } catch (error) {
        console.log('❌ Supabase get failed:', error);
        useSupabase = false;
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

    // If not in cache, try Supabase as fallback
    if (!completed && useSupabase) {
      console.log('🔄 Cache miss, checking Supabase database for status...');
      try {
        const { data, error } = await supabase
          .from('users')
          .select('onboarding_data')
          .eq('id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        const dbData = data?.onboarding_data;
        completed = dbData && Object.keys(dbData).length > 0;
        
        if (dbData) {
          console.log('📊 Status retrieved from Supabase database:', completed);
          // Cache the data for future requests
          console.log('💾 Caching status data for faster access...');
          onboardingCache.set(userId, dbData);
          console.log('✅ CACHE MEMORY STORED - Status data cached');
          source = 'database';
        }
      } catch (error) {
        console.log('❌ Supabase status check failed:', error);
        useSupabase = false;
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
    
    // Test Supabase connection on startup
    await testSupabaseConnection();
    
    console.log(`🔗 API endpoints:`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   - GET  http://localhost:${PORT}/health`);
    console.log(`💾 Storage: ${useSupabase ? 'Supabase Database' : 'In-Memory (Demo Mode)'}`);
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
