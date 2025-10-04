// Test setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;

// Increase timeout for NASA API calls
jest.setTimeout(30000);
