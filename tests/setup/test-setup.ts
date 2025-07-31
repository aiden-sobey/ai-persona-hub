import { jest } from '@jest/globals';

// Mock console methods to avoid cluttering test output
const originalConsole = global.console;

beforeEach(() => {
  // Mock console methods
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  } as any;

  // Clear all mocks
  jest.clearAllMocks();

  // Reset environment variables
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
});

afterEach(() => {
  // Restore original console
  global.console = originalConsole;

  // Clear all timers
  jest.clearAllTimers();

  // Reset modules
  jest.resetModules();

  // Clear all mocks
  jest.clearAllMocks();

  // Restore all mocks
  jest.restoreAllMocks();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledWithError(error: string | RegExp): R;
    }
  }
}

// Custom matchers
expect.extend({
  toHaveBeenCalledWithError(
    received: jest.MockedFunction<any>,
    expectedError: string | RegExp
  ) {
    const calls = received.mock.calls;
    const hasErrorCall = calls.some((call: any[]) => {
      const message = call[0];
      if (typeof expectedError === 'string') {
        return message && message.includes(expectedError);
      }
      return message && expectedError.test(message);
    });

    return {
      message: () =>
        `Expected function to have been called with error containing "${expectedError}"`,
      pass: hasErrorCall,
    };
  },
});
