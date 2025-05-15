/**
 * Configuration file for environment variables
 * This file centralizes all environment variables used in the application
 */

// Load environment variables from .env file
require('dotenv').config();

const config = {
  // Wikibase API configuration
  wikibase: {
    apiUrl: process.env.WIKIBASE_API_URL,
    entityUrl: process.env.WIKIBASE_ENTITY_URL,
    sparqlUrl: process.env.WIKIBASE_SPARQL_URL
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:5173', 'https://jbritosm.github.io']
  }
};

module.exports = config; 