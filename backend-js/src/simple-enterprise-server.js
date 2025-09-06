const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Simple Enterprise Express server
const app = express();

// =====================================================
// ENTERPRISE SECURITY MIDDLEWARE
// =====================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS with enterprise configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting - Enterprise grade
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use('/api/auth', authLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================================
// ENTERPRISE LOGGING & MONITORING
// =====================================================

// Request ID middleware
app.use((req, res, next) => {
  req.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Enterprise logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [${req.id}] ${req.method} ${req.url} - Started`);
  
  if (req.body && Object.keys(req.body).length > 0) {
    // Log body but hide sensitive data
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '[REDACTED]';
    console.log(`[${timestamp}] [${req.id}] Request body:`, logBody);
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] [${req.id}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// =====================================================
// DATABASE CONFIGURATION
// =====================================================

// In-memory user storage (fallback for demo)
const users = new Map();

// Supabase configuration
const supabaseUrl = 'https://fbkddxynrmbxyiuhcssq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZia2RkeHlucm1ieHlpdWhjc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNTE3OTQsImV4cCI6MjA3MjcyNzc5NH0.Yxgc4ld3uc1_QOvP966OE-Evtqd8uOTMDVVtM7kJzu0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Enterprise database health monitoring
let useSupabase = true;
let dbHealthStatus = 'unknown';
let lastHealthCheck = null;

async function testSupabaseConnection() {
  try {
    console.log('🔍 [ENTERPRISE] Testing Supabase connection...');
    console.log('📍 URL:', supabaseUrl);
    console.log('🔑 Key configured:', !!supabaseKey);
    
    const startTime = Date.now();
    const { data, error } = await supabase.from('users').select('count').limit(1);
    const responseTime = Date.now() - startTime;
    
    if (error) {
      console.log('❌ [ENTERPRISE] Supabase connection failed:');
      console.log('   Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Hint:', error.hint);
      console.log('⚠️  [ENTERPRISE] Falling back to in-memory storage');
      useSupabase = false;
      dbHealthStatus = 'unhealthy';
    } else {
      console.log('✅ [ENTERPRISE] Supabase connection successful');
      console.log(`📊 Response time: ${responseTime}ms`);
      useSupabase = true;
      dbHealthStatus = 'healthy';
    }
    
    lastHealthCheck = new Date().toISOString();
  } catch (err) {
    console.log('❌ [ENTERPRISE] Supabase connection error:', err.message);
    console.log('⚠️  [ENTERPRISE] Falling back to in-memory storage');
    useSupabase = false;
    dbHealthStatus = 'unhealthy';
    lastHealthCheck = new Date().toISOString();
  }
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise-jwt-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// =====================================================
// ENTERPRISE HEALTH & MONITORING ENDPOINTS
// =====================================================

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0-enterprise',
    requestId: req.id
  });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0-enterprise',
    uptime: process.uptime(),
    database: {
      status: dbHealthStatus,
      type: useSupabase ? 'supabase' : 'in-memory',
      lastHealthCheck: lastHealthCheck
    },
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
    },
    process: {
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    },
    requestId: req.id
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    storage: {
      type: useSupabase ? 'supabase' : 'in-memory',
      userCount: useSupabase ? 'N/A' : users.size
    },
    requestId: req.id
  });
});

// =====================================================
// AUTHENTICATION ENDPOINTS
// =====================================================

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  console.log(`[${req.id}] === ENTERPRISE REGISTRATION ENDPOINT ===`);
  
  try {
    const { email, password, full_name } = req.body;
    console.log(`[${req.id}] Registration attempt:`, { email, full_name, passwordLength: password?.length });

    // Enterprise validation
    if (!email || !password || !full_name) {
      console.log(`[${req.id}] Validation failed: Missing required fields`);
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Email, password, and full name are required',
          code: 'VALIDATION_ERROR',
          requestId: req.id
        }
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
          requestId: req.id
        }
      });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters long',
          code: 'WEAK_PASSWORD',
          requestId: req.id
        }
      });
    }

    const userEmail = email.toLowerCase();
    let user;

    if (useSupabase) {
      console.log(`[${req.id}] Using Supabase database...`);
      
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`[${req.id}] Database error:`, checkError);
        console.log(`[${req.id}] Falling back to in-memory storage`);
        useSupabase = false;
        dbHealthStatus = 'degraded';
      } else if (existingUser) {
        console.log(`[${req.id}] User already exists`);
        return res.status(409).json({
          success: false,
          error: {
            message: 'User already exists with this email',
            code: 'USER_EXISTS',
            requestId: req.id
          }
        });
      }
    }

    if (!useSupabase) {
      console.log(`[${req.id}] Using in-memory storage...`);
      
      if (users.has(userEmail)) {
        console.log(`[${req.id}] User already exists in memory`);
        return res.status(409).json({
          success: false,
          error: {
            message: 'User already exists with this email',
            code: 'USER_EXISTS',
            requestId: req.id
          }
        });
      }
    }

    // Hash password with enterprise-grade security
    console.log(`[${req.id}] Hashing password with bcrypt...`);
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user data
    const userData = {
      email: userEmail,
      password_hash: passwordHash,
      full_name,
      profile_completed: false,
      onboarding_step: 0
    };

    if (useSupabase) {
      console.log(`[${req.id}] Creating user in Supabase...`);
      const { data: supabaseUser, error: createError } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (createError) {
        console.error(`[${req.id}] Supabase creation error:`, createError);
        console.log(`[${req.id}] Falling back to in-memory storage`);
        useSupabase = false;
        dbHealthStatus = 'degraded';
        userData.id = Date.now().toString();
        users.set(userEmail, userData);
        user = userData;
      } else {
        user = supabaseUser;
      }
    } else {
      console.log(`[${req.id}] Creating user in memory...`);
      userData.id = Date.now().toString();
      users.set(userEmail, userData);
      user = userData;
    }

    console.log(`[${req.id}] User created successfully:`, user.id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password hash from response
    const { password_hash, ...userResponse } = user;

    console.log(`[${req.id}] Registration successful for user:`, user.id);
    res.status(201).json({
      success: true,
      data: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: JWT_EXPIRES_IN,
        user: userResponse
      },
      requestId: req.id
    });

  } catch (error) {
    console.error(`[${req.id}] Registration error:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: req.id
      }
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log(`[${req.id}] === ENTERPRISE LOGIN ENDPOINT ===`);
  
  try {
    const { email, password } = req.body;
    console.log(`[${req.id}] Login attempt for:`, email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          code: 'VALIDATION_ERROR',
          requestId: req.id
        }
      });
    }

    const userEmail = email.toLowerCase();
    let user;

    if (useSupabase) {
      console.log(`[${req.id}] Looking up user in Supabase...`);
      const { data: supabaseUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.log(`[${req.id}] Supabase error, falling back to memory`);
        useSupabase = false;
        dbHealthStatus = 'degraded';
      } else {
        user = supabaseUser;
      }
    }

    if (!useSupabase) {
      console.log(`[${req.id}] Looking up user in memory...`);
      user = users.get(userEmail);
    }

    if (!user) {
      console.log(`[${req.id}] User not found`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          requestId: req.id
        }
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log(`[${req.id}] Invalid password`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          requestId: req.id
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password hash from response
    const { password_hash, ...userResponse } = user;

    console.log(`[${req.id}] Login successful for user:`, user.id);
    res.json({
      success: true,
      data: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: JWT_EXPIRES_IN,
        user: userResponse
      },
      requestId: req.id
    });

  } catch (error) {
    console.error(`[${req.id}] Login error:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: req.id
      }
    });
  }
});

// =====================================================
// ENTERPRISE ERROR HANDLING
// =====================================================

// 404 handler
app.use('*', (req, res) => {
  console.log(`[${req.id}] 404 - Route not found:`, req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
      path: req.originalUrl,
      method: req.method,
      requestId: req.id
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error(`[${req.id}] Unhandled error:`, error);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.id
    }
  });
});

// =====================================================
// ENTERPRISE SERVER STARTUP
// =====================================================

const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, async (err) => {
  if (err) {
    console.error('❌ Failed to start enterprise server:', err);
    process.exit(1);
  } else {
    console.log('🚀 Simple Enterprise Backend Server Started');
    console.log('📍 Server listening on http://' + HOST + ':' + PORT);
    console.log('🏢 Enterprise Features: Security Headers, Rate Limiting, Monitoring, Logging');
    
    // Test database connection on startup
    await testSupabaseConnection();
    
    console.log('🔗 API Endpoints:');
    console.log('   - POST http://localhost:' + PORT + '/api/auth/register');
    console.log('   - POST http://localhost:' + PORT + '/api/auth/login');
    console.log('   - GET  http://localhost:' + PORT + '/health');
    console.log('   - GET  http://localhost:' + PORT + '/health/detailed');
    console.log('   - GET  http://localhost:' + PORT + '/metrics');
    console.log('💾 Storage: ' + (useSupabase ? 'Supabase Database' : 'In-Memory (Demo Mode)'));
    console.log('🛡️  Security: Helmet, CORS, Rate Limiting, Request ID Tracking');
    console.log('📊 Monitoring: Health Checks, Metrics, Structured Logging');
    console.log('✅ Simple Enterprise Server Ready!');
  }
});

// Enterprise graceful shutdown
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
  }
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, starting graceful shutdown...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, starting graceful shutdown...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

module.exports = app;
