import { jest } from '@jest/globals';

// Mock Agent responses
let mockResponses: string[] = ['Mock AI response'];
let currentResponseIndex = 0;
let shouldThrowError = false;
let mockError = new Error('Mock AI error');

// Mock Agent class
class MockAgentClass {
  public name: string;
  public instructions: string;
  public model: any;

  constructor(config: { name: string; instructions: string; model: any }) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.model = config.model;
  }

  async generate(_prompt: string, _options?: any): Promise<{ text: string }> {
    if (shouldThrowError) {
      throw mockError;
    }

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 10));

    // Return the next mock response
    const response =
      mockResponses[currentResponseIndex] || 'Default mock response';
    currentResponseIndex = (currentResponseIndex + 1) % mockResponses.length;

    return {
      text: response,
    };
  }
}

// Test utilities for controlling the mock
export const __setMockResponses = (responses: string[]) => {
  mockResponses = responses;
  currentResponseIndex = 0;
};

export const __addMockResponse = (response: string) => {
  mockResponses.push(response);
};

export const __setShouldThrowError = (shouldThrow: boolean, error?: Error) => {
  shouldThrowError = shouldThrow;
  if (error) {
    mockError = error;
  }
};

export const __getCurrentResponseIndex = () => currentResponseIndex;

export const __resetMockAgent = () => {
  mockResponses = ['Mock AI response'];
  currentResponseIndex = 0;
  shouldThrowError = false;
  mockError = new Error('Mock AI error');
};

// Mock the Agent constructor
const MockAgent = jest
  .fn()
  .mockImplementation((config: any) => new MockAgentClass(config));

// Export the mock
export { MockAgent as Agent };
export default { Agent: MockAgent };
