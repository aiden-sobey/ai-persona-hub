import { ChatInputHandler } from '../../src/services/chat-input-handler';

// Mock readline functions
jest.mock('readline', () => ({
  clearLine: jest.fn(),
  cursorTo: jest.fn(),
}));

// Mock chalk
jest.mock('chalk', () => ({
  green: jest.fn((text: string) => text),
}));

// Mock process methods
const mockSetRawMode = jest.fn();
const mockStdinOn = jest.fn();
const mockStdinRemoveListener = jest.fn();
const mockStdoutWrite = jest.fn();
const mockProcessOn = jest.fn();

Object.defineProperty(process.stdin, 'isTTY', { value: true });
Object.defineProperty(process.stdin, 'setRawMode', { value: mockSetRawMode });
Object.defineProperty(process.stdin, 'on', { value: mockStdinOn });
Object.defineProperty(process.stdin, 'removeListener', {
  value: mockStdinRemoveListener,
});
Object.defineProperty(process.stdout, 'write', { value: mockStdoutWrite });
Object.defineProperty(process, 'on', { value: mockProcessOn });

describe('ChatInputHandler', () => {
  let chatInputHandler: ChatInputHandler;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (chatInputHandler) {
      chatInputHandler.close();
    }
  });

  describe('history navigation behavior', () => {
    it('should clear input when pressing down from most recent message after starting with empty input', () => {
      // Setup: Create handler with some history
      const testHistory = ['previous message 1', 'previous message 2'];
      chatInputHandler = new ChatInputHandler(testHistory);

      // Access private methods for testing
      const navigateHistory = (chatInputHandler as any).navigateHistory;

      // Simulate the scenario: start with empty input, press Up then Down
      (chatInputHandler as any).inputBuffer = '';

      // Press Up - should save empty string and go to most recent
      navigateHistory.call(chatInputHandler, 'up');
      expect((chatInputHandler as any).historyIndex).toBe(0);
      expect((chatInputHandler as any).savedCurrentInput).toBe('');
      expect((chatInputHandler as any).inputBuffer).toBe('previous message 1');

      // Press Down - should call clearInput since savedCurrentInput is empty
      navigateHistory.call(chatInputHandler, 'down');

      // Verify final state - should be reset and cleared
      expect((chatInputHandler as any).historyIndex).toBe(-1);
      expect((chatInputHandler as any).savedCurrentInput).toBe('');
      expect((chatInputHandler as any).inputBuffer).toBe('');
      expect((chatInputHandler as any).cursorPosition).toBe(0);
    });

    it('should restore typed input when pressing down from most recent message after starting with typed input', () => {
      // Setup: Create handler with some history
      const testHistory = ['previous message 1'];
      chatInputHandler = new ChatInputHandler(testHistory);

      // Access private methods for testing
      const navigateHistory = (chatInputHandler as any).navigateHistory;

      // Simulate the scenario: start with typed input, press Up then Down
      (chatInputHandler as any).inputBuffer = 'some typed text';
      (chatInputHandler as any).cursorPosition = 15;

      // Press Up - should save typed text and go to most recent
      navigateHistory.call(chatInputHandler, 'up');
      expect((chatInputHandler as any).historyIndex).toBe(0);
      expect((chatInputHandler as any).savedCurrentInput).toBe(
        'some typed text'
      );
      expect((chatInputHandler as any).inputBuffer).toBe('previous message 1');

      // Press Down - should call restoreCurrentInput since savedCurrentInput is not empty
      navigateHistory.call(chatInputHandler, 'down');

      // Verify final state - should be reset and input restored
      expect((chatInputHandler as any).historyIndex).toBe(-1);
      expect((chatInputHandler as any).savedCurrentInput).toBe('');
      expect((chatInputHandler as any).inputBuffer).toBe('some typed text');
      expect((chatInputHandler as any).cursorPosition).toBe(15);
    });

    it('should treat whitespace-only input as empty', () => {
      // Setup: Create handler with some history
      const testHistory = ['previous message 1'];
      chatInputHandler = new ChatInputHandler(testHistory);

      // Access private methods for testing
      const navigateHistory = (chatInputHandler as any).navigateHistory;

      // Simulate the scenario: start with whitespace input, press Up then Down
      (chatInputHandler as any).inputBuffer = '   \t  ';
      (chatInputHandler as any).cursorPosition = 6;

      // Press Up - should save whitespace and go to most recent
      navigateHistory.call(chatInputHandler, 'up');
      expect((chatInputHandler as any).savedCurrentInput).toBe('   \t  ');
      expect((chatInputHandler as any).inputBuffer).toBe('previous message 1');

      // Press Down - should call clearInput since savedCurrentInput.trim() is empty
      navigateHistory.call(chatInputHandler, 'down');

      // Verify final state - should be reset and cleared
      expect((chatInputHandler as any).historyIndex).toBe(-1);
      expect((chatInputHandler as any).savedCurrentInput).toBe('');
      expect((chatInputHandler as any).inputBuffer).toBe('');
      expect((chatInputHandler as any).cursorPosition).toBe(0);
    });

    it('should navigate through history correctly', () => {
      const testHistory = ['message 1', 'message 2', 'message 3'];
      chatInputHandler = new ChatInputHandler(testHistory);

      const navigateHistory = (chatInputHandler as any).navigateHistory;

      // Test basic up navigation
      navigateHistory.call(chatInputHandler, 'up');
      expect((chatInputHandler as any).historyIndex).toBe(0);
      expect((chatInputHandler as any).inputBuffer).toBe('message 1');

      navigateHistory.call(chatInputHandler, 'up');
      expect((chatInputHandler as any).historyIndex).toBe(1);
      expect((chatInputHandler as any).inputBuffer).toBe('message 2');

      // Test down navigation
      navigateHistory.call(chatInputHandler, 'down');
      expect((chatInputHandler as any).historyIndex).toBe(0);
      expect((chatInputHandler as any).inputBuffer).toBe('message 1');
    });

    it('should not navigate beyond history bounds', () => {
      const testHistory = ['message 1'];
      chatInputHandler = new ChatInputHandler(testHistory);

      const navigateHistory = (chatInputHandler as any).navigateHistory;

      // Go to most recent
      navigateHistory.call(chatInputHandler, 'up');
      expect((chatInputHandler as any).historyIndex).toBe(0);
      expect((chatInputHandler as any).inputBuffer).toBe('message 1');

      // Try to go beyond oldest entry - should stay at same index
      navigateHistory.call(chatInputHandler, 'up');
      expect((chatInputHandler as any).historyIndex).toBe(0);
      expect((chatInputHandler as any).inputBuffer).toBe('message 1');
    });
  });

  describe('ANSI sequence parsing', () => {
    it('should parse arrow key sequences correctly', () => {
      chatInputHandler = new ChatInputHandler(['test']);
      const parseAnsiSequence = (chatInputHandler as any).parseAnsiSequence;

      expect(parseAnsiSequence(Buffer.from('\x1b[A'))).toBe('up');
      expect(parseAnsiSequence(Buffer.from('\x1b[B'))).toBe('down');
      expect(parseAnsiSequence(Buffer.from('\x1b[C'))).toBe('right');
      expect(parseAnsiSequence(Buffer.from('\x1b[D'))).toBe('left');
    });

    it('should parse other control sequences', () => {
      chatInputHandler = new ChatInputHandler();
      const parseAnsiSequence = (chatInputHandler as any).parseAnsiSequence;

      expect(parseAnsiSequence(Buffer.from('\x1b[H'))).toBe('home');
      expect(parseAnsiSequence(Buffer.from('\x1b[F'))).toBe('end');
      expect(parseAnsiSequence(Buffer.from('\x1b[3~'))).toBe('delete');
    });
  });

  describe('input buffer management', () => {
    it('should handle character insertion correctly', () => {
      chatInputHandler = new ChatInputHandler();
      const insertCharacter = (chatInputHandler as any).insertCharacter;

      // Insert at beginning
      (chatInputHandler as any).inputBuffer = '';
      (chatInputHandler as any).cursorPosition = 0;
      insertCharacter.call(chatInputHandler, 'a');
      expect((chatInputHandler as any).inputBuffer).toBe('a');
      expect((chatInputHandler as any).cursorPosition).toBe(1);

      // Insert in middle
      (chatInputHandler as any).inputBuffer = 'ac';
      (chatInputHandler as any).cursorPosition = 1;
      insertCharacter.call(chatInputHandler, 'b');
      expect((chatInputHandler as any).inputBuffer).toBe('abc');
      expect((chatInputHandler as any).cursorPosition).toBe(2);
    });

    it('should handle backspace correctly', () => {
      chatInputHandler = new ChatInputHandler();
      const handleBackspace = (chatInputHandler as any).handleBackspace;

      // Backspace in middle
      (chatInputHandler as any).inputBuffer = 'abc';
      (chatInputHandler as any).cursorPosition = 2;
      handleBackspace.call(chatInputHandler);
      expect((chatInputHandler as any).inputBuffer).toBe('ac');
      expect((chatInputHandler as any).cursorPosition).toBe(1);

      // Backspace at beginning (should do nothing)
      (chatInputHandler as any).cursorPosition = 0;
      handleBackspace.call(chatInputHandler);
      expect((chatInputHandler as any).inputBuffer).toBe('ac');
      expect((chatInputHandler as any).cursorPosition).toBe(0);
    });
  });
});
