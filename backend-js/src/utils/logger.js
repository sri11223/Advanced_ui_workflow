const pino = require('pino');

// Simple logger configuration
const loggerConfig = {
  level: 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Add pretty printing for development
if (process.env.NODE_ENV === 'development') {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
}

const logger = pino(loggerConfig);

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    }, 'HTTP Request');
  });
  
  next();
};

module.exports = { logger, requestLogger };
