/**
 * Medieval Charters Knowledge Graph - Search Routes
 * This module handles entity search functionality through the Wikibase API
 * It provides endpoints for searching entities in the Medieval Charters Knowledge Graph
 */
const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * @route   GET /api/search
 * @desc    Search for entities in the Medieval Charters Knowledge Graph
 * @param   {string} query - The search term to find entities
 * @returns {Object} JSON response with search results from Wikibase
 * @access  Public
 * 
 * This endpoint performs a case-insensitive search for entities in the Wikibase
 * instance, supporting accented Spanish characters. It returns entity matches
 * that can be displayed in the frontend search results.
 */
router.get('/', async (req, res) => {
  const { query } = req.query;
  
  // Validate request parameters
  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }
  
  try {
    
    // Make request to Wikibase API with appropriate search parameters
    const response = await axios.get(process.env.WIKIBASE_API_URL, {
      params: {
        action: 'wbsearchentities',  // Wikibase search action
        search: query,               // User's search query
        language: 'en',              // Primary language for results
        format: 'json',              // Response format
        uselang: 'en',               // User language
        type: 'item'                 // Search for items only (not properties)
      }
    });
    
    // Return the response data directly to the client
    return res.json(response.data);
    
  } catch (error) {
    console.error('Wikibase API Easdasdasrror:', error.message);
    
    // Comprehensive error handling with appropriate HTTP status codes
    if (error.response) {
      // The request was made and the server responded with a status code that falls out of the range of 2xx
      return res.status(error.response.status).json({
        message: 'Error from Wikibase API',
        error: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received (timeout, network issue)
      return res.status(503).json({
        message: 'No response from Wikibase API',
        error: 'Service unavailable'
      });
    } else {
      // Something happened in setting up the request (configuration error)
      return res.status(500).json({
        message: 'Error setting up request to Wikibase API',
        error: error.message
      });
    }
  }
});

module.exports = router; 