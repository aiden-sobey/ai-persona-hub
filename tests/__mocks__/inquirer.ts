import { jest } from '@jest/globals';

// Mock responses storage
let mockResponses: Record<string, any> = {};
let promptCallCount = 0;

// Mock the main prompt function
const prompt = jest.fn().mockImplementation((questions: any) => {
  promptCallCount++;

  if (Array.isArray(questions)) {
    // Multiple questions
    const result: Record<string, any> = {};
    questions.forEach((question: any) => {
      const key = question.name;
      if (mockResponses[key] !== undefined) {
        result[key] = mockResponses[key];
      } else {
        // Provide default values based on question type
        switch (question.type) {
          case 'input':
            result[key] = 'test-input';
            break;
          case 'confirm':
            result[key] = true;
            break;
          case 'list':
            result[key] =
              question.choices?.[0]?.value ||
              question.choices?.[0] ||
              question.default;
            break;
          case 'number':
            result[key] = question.default || 100;
            break;
          default:
            result[key] = question.default || 'test-value';
        }
      }
    });
    return Promise.resolve(result);
  } else {
    // Single question
    const key = questions.name || 'value';
    if (mockResponses[key] !== undefined) {
      return Promise.resolve({ [key]: mockResponses[key] });
    }

    // Provide default based on question type
    let defaultValue: any;
    switch (questions.type) {
      case 'input':
        defaultValue = 'test-input';
        break;
      case 'confirm':
        defaultValue = true;
        break;
      case 'list':
        defaultValue =
          questions.choices?.[0]?.value ||
          questions.choices?.[0] ||
          questions.default;
        break;
      case 'number':
        defaultValue = questions.default || 100;
        break;
      default:
        defaultValue = questions.default || 'test-value';
    }

    return Promise.resolve({ [key]: defaultValue });
  }
});

// Mock individual prompt methods (for newer inquirer API)
const input = jest.fn().mockImplementation((options: any) => {
  const key = options.name || 'value';
  return Promise.resolve(mockResponses[key] || options.default || 'test-input');
});

const confirm = jest.fn().mockImplementation((options: any) => {
  const key = options.name || 'value';
  return Promise.resolve(
    mockResponses[key] !== undefined
      ? mockResponses[key]
      : options.default !== undefined
        ? options.default
        : true
  );
});

const select = jest.fn().mockImplementation((options: any) => {
  const key = options.name || 'value';
  if (mockResponses[key] !== undefined) {
    return Promise.resolve(mockResponses[key]);
  }

  const defaultValue =
    options.choices?.[0]?.value || options.choices?.[0] || options.default;
  return Promise.resolve(defaultValue);
});

const number = jest.fn().mockImplementation((options: any) => {
  const key = options.name || 'value';
  return Promise.resolve(
    mockResponses[key] !== undefined
      ? mockResponses[key]
      : options.default || 100
  );
});

const editor = jest.fn().mockImplementation((options: any) => {
  const key = options.name || 'value';
  return Promise.resolve(
    mockResponses[key] || options.default || 'test-editor-content'
  );
});

// Test utilities
export const __setMockResponses = (responses: Record<string, any>) => {
  mockResponses = { ...responses };
};

export const __addMockResponse = (key: string, value: any) => {
  mockResponses[key] = value;
};

export const __clearMockResponses = () => {
  mockResponses = {};
  promptCallCount = 0;
};

export const __getPromptCallCount = () => promptCallCount;

export const __resetMocks = () => {
  prompt.mockClear();
  input.mockClear();
  confirm.mockClear();
  select.mockClear();
  number.mockClear();
  editor.mockClear();
  __clearMockResponses();
};

// Export the mock inquirer module
const inquirer = {
  prompt,
  input,
  confirm,
  select,
  number,
  editor,
  __setMockResponses,
  __addMockResponse,
  __clearMockResponses,
  __getPromptCallCount,
  __resetMocks,
};

export default inquirer;
export { prompt, input, confirm, select, number, editor };
