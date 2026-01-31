// Jest setup file
// Add any global test configuration here

// Mock environment variables for testing
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/product-test';
process.env.IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || 'test-public-key';
process.env.IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || 'test-private-key';
process.env.IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/test/';
// Suppress console errors and warnings during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};