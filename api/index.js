// Vercel serverless function entry point for PSN College ERP
require('dotenv').config();

const app = require('../server');

// Export for Vercel serverless functions
module.exports = app;