/**
 * Medieval Charters Knowledge Graph - SPARQL Query Routes
 * This module handles SPARQL query execution against Wikibase and Wikidata endpoints.
 * It includes caching mechanisms, timeout handling, and error reporting for optimal performance.
 */
const express = require('express');
const axios = require('axios');
const router = express.Router();
const NodeCache = require('node-cache');

// SPARQL endpoints for querying entity data
const WIKIBASE_SPARQL_ENDPOINT = 'https://medievalcharterskg.wikibase.cloud/query/sparql';
const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

/**
 * Cache configuration for SPARQL query results
 * Improves performance and reduces load on SPARQL endpoints by storing
 * previously executed queries with one-hour time-to-live
 */
const queryCache = new NodeCache({ 
  stdTTL: 3600, // 1 hour in seconds
  checkperiod: 600 // Check for expired entries every 10 minutes
});

/**
 * @route   POST /api/sparql
 * @desc    Execute SPARQL query on Wikibase or Wikidata endpoints
 * @param   {string} query - The SPARQL query to execute
 * @returns {Object} JSON response with query results
 * @access  Public
 * 
 * This endpoint accepts SPARQL queries and executes them against either the
 * Medieval Charters Knowledge Graph Wikibase instance or Wikidata, depending
 * on the query content. Results are cached to improve performance for repeated queries.
 */
router.post('/', async (req, res) => {
  const { query } = req.body;
  
  // Validate request parameters
  if (!query) {
    return res.status(400).json({ message: 'SPARQL query is required' });
  }
  
  // Generate a unique cache key from the query content
  const cacheKey = Buffer.from(query).toString('base64');
  
  // Return cached results if available to improve response time
  const cachedResult = queryCache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache hit for SPARQL query');
    return res.json(cachedResult);
  }
  
  /**
   * Endpoint selection logic:
   * - Use Wikidata endpoint for queries with coordinate (P625) properties
   *   and Wikidata entity references
   * - Otherwise use the Medieval Charters Knowledge Graph endpoint
   * 
   * This enables federated querying of geographic data from Wikidata while
   * using local data for Medieval Charters specific information
   */
  const isWikidataQuery = query.includes('wdt:P625') && 
    (query.includes('<http://www.wikidata.org/entity/') || 
     query.includes('VALUES ?wdItem') || 
     query.includes('VALUES ?residenceWdItem'));
  
  const endpoint = isWikidataQuery ? WIKIDATA_SPARQL_ENDPOINT : WIKIBASE_SPARQL_ENDPOINT;
  console.log(`Using SPARQL endpoint: ${endpoint}`);
  console.log('Query:', query.substring(0, 200) + '...');
  
  try {
    // Execute SPARQL query with appropriate headers and extended timeout
    const response = await axios({
      method: 'GET',
      url: endpoint,
      params: {
        query: query,
        format: 'json'
      },
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'MedievalChartersWebApp/1.0'
      },
      timeout: 60000 // 60 second timeout for complex queries
    });
    
    // Store successful results in cache to speed up future identical queries
    queryCache.set(cacheKey, response.data);
    console.log(`Query successful, returned ${response.data.results?.bindings?.length || 0} results`);
    
    // Return query results to client
    return res.json(response.data);
    
  } catch (error) {
    console.error('SPARQL Error:', error.message);
    
    // Comprehensive error handling with detailed information
    if (error.response) {
      // Handle response errors (invalid query, endpoint errors)
      console.error('SPARQL Response Error:', error.response.status);
      
      // Provide detailed feedback for syntax errors to facilitate debugging
      if (error.response?.data?.message?.includes('syntax')) {
        console.error('SPARQL Syntax Error Details:', error.response.data);
        console.error('Problem Query (first 1000 chars):', query.substring(0, 1000));
        
        // Return detailed error information for syntax problems
        return res.status(error.response.status).json({
          message: `SPARQL Syntax Error: ${error.response.data?.message || 'Unknown syntax error'}`,
          error: error.response.data,
          // Include the first part of the query to help debug
          query_excerpt: query.substring(0, 500) + '...'
        });
      }
      
      return res.status(error.response.status).json({
        message: `Error from SPARQL endpoint: ${error.response.data?.message || error.response.statusText}`,
        error: error.response.data
      });
    } else if (error.request) {
      // Handle timeout and connectivity errors
      return res.status(503).json({
        message: 'No response from SPARQL endpoint',
        error: 'Service unavailable'
      });
    } else {
      // Handle configuration and axios setup errors
      return res.status(500).json({
        message: 'Error setting up request to SPARQL endpoint',
        error: error.message
      });
    }
  }
});

module.exports = router; 