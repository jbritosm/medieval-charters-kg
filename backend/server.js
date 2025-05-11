/**
 * Medieval Charters Knowledge Graph - Express Server
 * Main server entry point that configures the Express application,
 * sets up middleware, and defines API routes.
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const config = require('./config/config');
const searchRoutes = require('./routes/search');
const sparqlRoutes = require('./routes/sparql');

// Initialize Express application
const app = express();

// Middleware Configuration
// Enable CORS for all origins in production
app.use(cors({
  origin: '*', // Allow all origins for simplicity
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight request for 24 hours
}));

// Parse JSON request bodies
app.use(bodyParser.json({ limit: '1mb' }));

// Log HTTP requests
app.use(morgan('dev'));

// Health Check Route
// Simple endpoint to verify backend connectivity
app.get('/api/ping', (req, res) => {
  res.json({
    message: 'Backend connection successful!',
    time: new Date().toISOString()
  });
});

// Test Route
// Basic endpoint for testing API functionality
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// API Routes
// Search routes handle entity searches with SPARQL queries
app.use('/api/search', searchRoutes);

// SPARQL routes handle direct SPARQL queries to endpoints
app.use('/api/sparql', sparqlRoutes);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});