/**
 * Medieval Charters Knowledge Graph - Configuration
 * Central configuration module for the backend application.
 * 
 * This file loads environment variables and exports configuration settings
 * used throughout the application. It supports environment-specific settings
 * via dotenv for development, testing, and production environments.
 */

// Load environment variables from .env file if present
require('dotenv').config();

/**
 * Application configuration object
 * Contains all configurable parameters for the backend
 */
module.exports = {
  // Server port for the Express application
  port: process.env.PORT || 3000,
  
  // Frontend URL for CORS configuration
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Current environment (development, testing, production)
  env: process.env.NODE_ENV || 'development',
  
  // Add other configuration variables as needed
  // Examples:
  // apiTimeout: process.env.API_TIMEOUT || 30000,
  // cacheExpiry: process.env.CACHE_EXPIRY || 3600,
  // logLevel: process.env.LOG_LEVEL || 'info'
};