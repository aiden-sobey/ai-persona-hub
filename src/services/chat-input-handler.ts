import * as readline from 'readline';
import chalk from 'chalk';

export class ChatInputHandler {
  private history: string[] = [];
  private historyIndex: number = -1;
  private inputBuffer: string = '';
  private cursorPosition: number = 0;
  private savedCurrentInput: string = '';
  private isRawMode: boolean = false;

  constructor(history: string[] = []) {
    this.history = [...history]; // Copy the history array
  }

  private enableRawMode(): void {
    if (process.stdin.isTTY && !this.isRawMode) {
      process.stdin.setRawMode(true);
      this.isRawMode = true;
    }
  }

  private disableRawMode(): void {
    if (process.stdin.isTTY && this.isRawMode) {
      process.stdin.setRawMode(false);
      this.isRawMode = false;
    }
  }

  private renderInputLine(): void {
    // Clear the current line
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);

    // Write the prompt and current input
    const prompt = chalk.green('You: ');
    process.stdout.write(prompt + this.inputBuffer);

    // Position cursor correctly
    const promptLength = 5; // "You: " without ANSI codes
    readline.cursorTo(process.stdout, promptLength + this.cursorPosition);
  }

  private parseAnsiSequence(data: Buffer): string | null {
    const input = data.toString();

    // Arrow keys
    if (input === '\x1b[A') return 'up';
    if (input === '\x1b[B') return 'down';
    if (input === '\x1b[C') return 'right';
    if (input === '\x1b[D') return 'left';

    // Home/End
    if (input === '\x1b[H' || input === '\x1b[1~') return 'home';
    if (input === '\x1b[F' || input === '\x1b[4~') return 'end';

    // Delete
    if (input === '\x1b[3~') return 'delete';

    return null;
  }

  private handleKeyPress(data: Buffer): void {
    const input = data.toString();

    // Handle ANSI escape sequences first
    if (input.startsWith('\x1b')) {
      const key = this.parseAnsiSequence(data);
      if (key) {
        this.handleSpecialKey(key);
        return;
      }
    }

    // Handle control characters
    if (input === '\x03') {
      // Ctrl+C
      process.exit(0);
    }

    if (input === '\x7f' || input === '\x08') {
      // Backspace
      this.handleBackspace();
      return;
    }

    if (input === '\r' || input === '\n') {
      // Enter
      this.handleEnter();
      return;
    }

    // Handle printable characters
    if (
      input.length === 1 &&
      input.charCodeAt(0) >= 32 &&
      input.charCodeAt(0) <= 126
    ) {
      this.insertCharacter(input);
    }
  }

  private handleSpecialKey(key: string): void {
    switch (key) {
      case 'up':
        this.navigateHistory('up');
        break;
      case 'down':
        this.navigateHistory('down');
        break;
      case 'left':
        if (this.cursorPosition > 0) {
          this.cursorPosition--;
          this.renderInputLine();
        }
        break;
      case 'right':
        if (this.cursorPosition < this.inputBuffer.length) {
          this.cursorPosition++;
          this.renderInputLine();
        }
        break;
      case 'home':
        this.cursorPosition = 0;
        this.renderInputLine();
        break;
      case 'end':
        this.cursorPosition = this.inputBuffer.length;
        this.renderInputLine();
        break;
      case 'delete':
        if (this.cursorPosition < this.inputBuffer.length) {
          this.inputBuffer =
            this.inputBuffer.slice(0, this.cursorPosition) +
            this.inputBuffer.slice(this.cursorPosition + 1);
          this.renderInputLine();
        }
        break;
    }
  }

  private insertCharacter(char: string): void {
    // Reset history navigation when typing
    this.resetHistoryNavigation();

    // Insert character at cursor position
    this.inputBuffer =
      this.inputBuffer.slice(0, this.cursorPosition) +
      char +
      this.inputBuffer.slice(this.cursorPosition);

    this.cursorPosition++;
    this.renderInputLine();
  }

  private handleBackspace(): void {
    // Reset history navigation when editing
    this.resetHistoryNavigation();

    if (this.cursorPosition > 0) {
      this.inputBuffer =
        this.inputBuffer.slice(0, this.cursorPosition - 1) +
        this.inputBuffer.slice(this.cursorPosition);
      this.cursorPosition--;
      this.renderInputLine();
    }
  }

  private handleEnter(): void {
    // Move to next line
    process.stdout.write('\n');

    // Reset history navigation
    this.resetHistoryNavigation();

    // The input is complete, will be handled by promptForInput
  }

  private navigateHistory(direction: 'up' | 'down'): void {
    if (this.history.length === 0) return;

    if (direction === 'up') {
      if (this.historyIndex === -1) {
        // First time navigating, save current input
        this.savedCurrentInput = this.inputBuffer;
        this.historyIndex = 0;
      } else if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
      } else {
        // Already at the oldest entry
        return;
      }

      // Load history entry
      this.inputBuffer = this.history[this.historyIndex];
      this.cursorPosition = this.inputBuffer.length;
    } else if (direction === 'down') {
      if (this.historyIndex === -1) {
        // Not navigating history
        return;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
        // Load history entry
        this.inputBuffer = this.history[this.historyIndex];
        this.cursorPosition = this.inputBuffer.length;
      } else {
        // Back to current input - clear if it was empty, otherwise restore
        if (this.savedCurrentInput.trim() === '') {
          this.clearInput();
        } else {
          this.restoreCurrentInput();
        }
        return;
      }
    }

    this.renderInputLine();
  }

  private restoreCurrentInput(): void {
    this.historyIndex = -1;
    this.inputBuffer = this.savedCurrentInput;
    this.cursorPosition = this.inputBuffer.length;
    this.savedCurrentInput = '';
    this.renderInputLine();
  }

  private clearInput(): void {
    this.historyIndex = -1;
    this.inputBuffer = '';
    this.cursorPosition = 0;
    this.savedCurrentInput = '';
    this.renderInputLine();
  }

  private resetHistoryNavigation(): void {
    if (this.historyIndex !== -1) {
      this.historyIndex = -1;
      this.savedCurrentInput = '';
    }
  }

  async promptForInput(): Promise<string> {
    return new Promise<string>(resolve => {
      // Reset input state
      this.inputBuffer = '';
      this.cursorPosition = 0;
      this.resetHistoryNavigation();

      // Show initial prompt
      process.stdout.write(chalk.green('You: '));

      // Enable raw mode to capture individual keystrokes
      this.enableRawMode();

      const dataHandler = (data: Buffer) => {
        this.handleKeyPress(data);

        // Check if Enter was pressed (input is complete)
        const input = data.toString();
        if (input === '\r' || input === '\n') {
          // Clean up and resolve
          process.stdin.removeListener('data', dataHandler);
          this.disableRawMode();

          const result = this.inputBuffer.trim();

          // Add non-empty answers to history
          if (result && !this.history.includes(result)) {
            this.history.unshift(result);
            // Keep history size manageable
            if (this.history.length > 100) {
              this.history = this.history.slice(0, 100);
            }
          }

          resolve(result);
        }
      };

      process.stdin.on('data', dataHandler);

      // Handle process exit
      const exitHandler = () => {
        this.disableRawMode();
      };

      process.on('exit', exitHandler);
      process.on('SIGINT', exitHandler);
      process.on('SIGTERM', exitHandler);
    });
  }

  updateHistory(newHistory: string[]): void {
    this.history = [...newHistory];
    this.resetHistoryNavigation();
  }

  close(): void {
    this.disableRawMode();
  }
}
