// This file is used to setup any global configurations for Jest tests
import { jest, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock console.error to prevent cluttering test output
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.exit to prevent tests from terminating
jest.spyOn(process, 'exit').mockImplementation((): never => {
  throw new Error('process.exit was called');
});

// Set global error handling
beforeAll(() => {
  // Add any global setup logic here
});

afterAll(() => {
  // Clean up mocks
  jest.restoreAllMocks();
});

// Add global beforeEach and afterEach hooks if needed
beforeEach(() => {
  jest.clearAllMocks();
}); 