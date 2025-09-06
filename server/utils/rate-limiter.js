const express = require("express");
const rateLimit = require("express-rate-limit");

/**
 * Rate limiting middleware factory for different endpoints
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 60 * 1000, // 1 minute by default
    max: 10, // 10 requests per windowMs by default
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: (req) => false, // No skipping by default
  };

  const mergedOptions = { ...defaultOptions, ...options };
  return rateLimit(mergedOptions);
};

// Different rate limiters for different endpoints
const rateLimiters = {
  // Regular chat endpoint - more permissive
  chat: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: {
      error:
        "Too many chat requests. Please wait a moment before trying again.",
      retryAfter: "One minute",
    },
  }),

  // Wireframe generation - more strict due to higher resource usage
  wireframe: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 requests per 5 minutes
    message: {
      error:
        "Wireframe generation is limited to prevent abuse. Please try again later.",
      retryAfter: "Five minutes",
    },
  }),

  // Questionnaire - medium restriction
  questionnaire: createRateLimiter({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 15, // 15 requests per 2 minutes
    message: {
      error:
        "Too many questionnaire requests. Please wait before starting a new session.",
      retryAfter: "Two minutes",
    },
  }),

  // Global catch-all limiter
  global: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute across all endpoints
    message: {
      error: "Too many requests to the API. Please slow down.",
      retryAfter: "One minute",
    },
  }),
};

// Helper to apply rate limiters to a router
const applyRateLimiters = (router) => {
  // Apply the global rate limiter to all routes
  router.use(rateLimiters.global);

  // Apply specific rate limiters to specific endpoints
  router.use("/api/chatbot", rateLimiters.chat);
  router.use("/generate-wireframe", rateLimiters.wireframe);
  router.use("/api/questionnaire", rateLimiters.questionnaire);

  return router;
};

module.exports = {
  rateLimiters,
  applyRateLimiters,
};
