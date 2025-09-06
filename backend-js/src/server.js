const { logger } = require('./utils/logger');
const { config } = require('./config');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Create and start the application
const EnterpriseApp = require('./enterprise/EnterpriseApp');

const app = new EnterpriseApp();

app.start().catch(error => {
  console.error('Failed to start enterprise server:', error);
  process.exit(1);
});

// Export for testing
module.exports = app;
