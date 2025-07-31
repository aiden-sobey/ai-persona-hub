# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Watch mode during development
npm start              # Run compiled JS directly
```

### Testing

```bash
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
npm run test:verbose   # Run tests with verbose output
```

### Code Quality

```bash
npm run lint:fix       # Run ESLint and Prettier with auto-fix
npm run lint:check     # Check for linting/formatting violations without fixing
```

**IMPORTANT**: The following commands must all pass (exit code 0) before any task is considered completed by Claude:
- `npm run lint:check`
- `npm run test`
- `npm run build`
Always run these commands after making code changes to ensure code quality standards are met.

### CLI Usage (after build)

```bash
./bin/cgem model       # Configure AI provider/model (required first step)
./bin/cgem create      # Create new AI profile
./bin/cgem list        # List all profiles
./bin/cgem chat <name> # Chat with specific profile
./bin/cgem delete <name> # Delete profile
```

## Architecture Overview

This is a TypeScript CLI application that creates and manages AI profiles across multiple providers (OpenAI, Anthropic, Google) using the Mastra AI framework.

### Core Architecture Concepts

**Provider-Model Separation**: The application separates global provider/model configuration from individual AI profiles. Users configure their preferred AI provider and model globally via `cgem model`, then create profiles with custom system prompts that work with any configured model.

**Unified AI Interface**: Uses Mastra's `Agent` class to provide a consistent interface across different AI providers. The `AIClient` class abstracts provider-specific SDK initialization and model configuration.

**Local Storage Strategy**:

- AI profiles stored as JSON files in `./profiles/` directory
- Global configuration stored in `~/.cgem/config.json` (provider keys, current model)
- Profile names are sanitized and used as filenames

### Key Components

**CLI Entry Point** (`src/index.ts`): Commander.js-based CLI with subcommands for each major operation. Handles argument parsing and command routing.

**AIClient** (`src/services/ai-client.ts`): Core service that wraps Mastra's Agent. Manages provider SDK initialization, API key injection, and streaming chat responses. Handles provider-specific model instantiation.

**ProfileManager** (`src/services/profile-manager.ts`): Handles CRUD operations for AI profiles. Manages JSON file I/O, profile validation, and directory structure. Sanitizes profile names for filesystem safety.

**ConfigManager** (`src/utils/config.ts`): Manages global app configuration including API keys, current provider/model selection. Handles both environment variables and config file storage with fallback hierarchy.

### Type System

**AIProvider**: Union type limiting providers to 'openai' | 'anthropic' | 'google'
**AIProfile**: Core profile structure with system prompt, metadata, and optional token limits
**PROVIDER_MODELS**: Const record mapping each provider to its available models

### Testing Setup

Uses Jest with TypeScript support. Key testing patterns:

- Comprehensive mocking of external dependencies (fs, Mastra, inquirer, chalk)
- Service-layer unit tests with dependency injection
- Command integration tests with CLI argument simulation
- Custom test setup in `tests/setup/` for shared mocking utilities

### Environment Configuration

API keys can be provided via:

1. Environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`)
2. Config file at `~/.cgem/config.json`

The application prioritizes config file over environment variables for API key resolution.
