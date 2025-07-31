import { AIProfile, AIProvider } from '../../src/types';

// Mock data generators
export const createMockProfile = (overrides: Partial<AIProfile> = {}): AIProfile => ({
  id: 'test-profile',
  name: 'Test Profile',
  systemPrompt: 'You are a helpful test assistant.',
  maxTokens: 1000,
  createdAt: '2025-01-01T00:00:00.000Z',
  lastUsed: '2025-01-01T12:00:00.000Z',
  ...overrides,
});

export const createMockProfiles = (count: number = 3): AIProfile[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockProfile({
      id: `test-profile-${i + 1}`,
      name: `Test Profile ${i + 1}`,
      systemPrompt: `You are test assistant number ${i + 1}.`,
    })
  );
};

// Mock file system data
export const createMockFileSystem = () => {
  const files = new Map<string, string>();
  
  return {
    files,
    setFile: (path: string, content: string) => files.set(path, content),
    getFile: (path: string) => files.get(path),
    hasFile: (path: string) => files.has(path),
    deleteFile: (path: string) => files.delete(path),
    clear: () => files.clear(),
  };
};

// Mock inquirer responses
export const createMockInquirerResponses = (responses: Record<string, any>) => {
  return jest.fn().mockImplementation((questions: any[] | any) => {
    if (Array.isArray(questions)) {
      const result: Record<string, any> = {};
      questions.forEach(question => {
        if (responses[question.name]) {
          result[question.name] = responses[question.name];
        }
      });
      return Promise.resolve(result);
    } else {
      // Single question
      const questionName = questions.name || 'value';
      return Promise.resolve({ [questionName]: responses[questionName] || responses.value });
    }
  });
};

// Environment variable helpers
export const setMockApiKeys = (providers: AIProvider[] = ['openai']) => {
  providers.forEach(provider => {
    switch (provider) {
      case 'openai':
        process.env.OPENAI_API_KEY = 'mock-openai-key';
        break;
      case 'anthropic':
        process.env.ANTHROPIC_API_KEY = 'mock-anthropic-key';
        break;
      case 'google':
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'mock-google-key';
        break;
    }
  });
};

export const clearMockApiKeys = () => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
};

// Mock config data
export const createMockConfig = (overrides: any = {}) => ({
  providers: {
    openai: { apiKey: 'mock-openai-key' },
    ...overrides.providers,
  },
  currentProvider: 'openai',
  currentModel: 'gpt-4o-mini',
  defaultMaxTokens: 1000,
  ...overrides,
});

// Console output helpers
export const getConsoleOutput = () => {
  const mockConsole = global.console as any;
  return {
    log: mockConsole.log.mock.calls,
    error: mockConsole.error.mock.calls,
    warn: mockConsole.warn.mock.calls,
    info: mockConsole.info.mock.calls,
  };
};

export const expectConsoleToContain = (method: 'log' | 'error' | 'warn' | 'info', text: string) => {
  const calls = (global.console as any)[method].mock.calls;
  const found = calls.some((call: any[]) =>
    call.some((arg: any) => typeof arg === 'string' && arg.includes(text))
  );
  expect(found).toBe(true);
};

// Async test helpers
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock process.exit
export const mockProcessExit = () => {
  const mockExit = jest.fn().mockImplementation((code?: number) => {
    throw new Error(`Process exit called with code: ${code || 0}`);
  });
  
  // Type assertion to avoid TypeScript errors
  (process as any).exit = mockExit;
  
  return mockExit;
};