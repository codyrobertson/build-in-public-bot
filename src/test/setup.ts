// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Add custom matchers
expect.extend({
  toBeValidTweet(received: string) {
    const pass = received.length <= 280 && received.length > 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid tweet`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid tweet (1-280 characters), but it has ${received.length} characters`,
        pass: false,
      };
    }
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTweet(): R;
    }
  }
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});