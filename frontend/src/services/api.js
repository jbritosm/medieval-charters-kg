// /Users/jusco/Documents/code/tfg/webapp/src/services/api.js
import axios from 'axios';

// API base URL configuration
// Use environment variable in production, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = {
  // Search for entities in Wikibase
  search: async (query) => {
    try {
      const response = await axios.get(`${API_URL}/api/search`, {
        params: { query }
      });
      return response;
    } catch (error) {
      console.error('Search API error:', error);
      throw error;
    }
  },
  
  // Execute SPARQL queries
  sparqlQuery: async (query) => {
    try {
      const response = await axios.post(`${API_URL}/api/sparql`, { query });
      return response;
    } catch (error) {
      console.error('SPARQL API error:', error);
      throw error;
    }
  },
  
  // Test backend connection
  ping: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ping`);
      return response;
    } catch (error) {
      console.error('Ping API error:', error);
      throw error;
    }
  }
};

export default api;