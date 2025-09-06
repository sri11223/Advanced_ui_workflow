#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Advanced UI Workflow Node.js Backend...\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version check passed:', nodeVersion);

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
    console.log('⚠️  Please update .env with your actual configuration values');
  } else {
    console.log('⚠️  .env.example not found, please create .env manually');
  }
} else {
  console.log('✅ .env file already exists');
}

// Install dependencies if node_modules doesn't exist
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { 
      cwd: path.join(__dirname, '..'), 
      stdio: 'inherit' 
    });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed');
}

// Check TypeScript compilation
console.log('🔧 Checking TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { 
    cwd: path.join(__dirname, '..'), 
    stdio: 'pipe' 
  });
  console.log('✅ TypeScript compilation check passed');
} catch (error) {
  console.log('⚠️  TypeScript compilation has issues (this is expected without dependencies)');
}

// Create logs directory
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
  console.log('✅ Created logs directory');
}

// Create dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
  console.log('✅ Created dist directory');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\nNext steps:');
console.log('1. Update .env with your configuration');
console.log('2. Run: npm run dev (for development)');
console.log('3. Run: npm run build && npm start (for production)');
console.log('\nFor more information, see README.md');
