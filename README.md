# Custom Gems - AI Profile CLI

A command-line interface for creating and managing custom AI profiles powered by multiple AI providers through the Mastra framework.

## Features

- 🔮 Create custom AI profiles with personalized system prompts
- 🤖 **Multi-Provider Support**: OpenAI, Anthropic (Claude), Google (Gemini)
- 💬 Interactive chat sessions with your AI profiles
- 📋 List and manage all your profiles
- 🔄 **Dynamic Model Switching**: Change AI provider/model anytime without recreating profiles
- 🔧 Configurable max tokens per profile
- 💾 Local JSON-based profile storage
- ⚡ Powered by Mastra AI framework

## Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Set up API keys for your preferred providers:
```bash
# OpenAI
export OPENAI_API_KEY="your-openai-key"

# Anthropic (Claude)
export ANTHROPIC_API_KEY="your-anthropic-key"

# Google (Gemini)
export GOOGLE_GENERATIVE_AI_API_KEY="your-google-key"
```

## Usage

### Configure AI model (required first step)
```bash
./bin/cgem model
```
*Select your preferred AI provider and model*

### Create a new profile
```bash
./bin/cgem create
```
*Create a custom AI profile with system prompt (works with any model)*

### List all profiles
```bash
./bin/cgem list
```

### Start a chat with a profile
```bash
./bin/cgem chat <profile-name>
```
*Chat with any profile using your currently configured model*

### List available models
```bash
./bin/cgem model list
```

### Delete a profile
```bash
./bin/cgem delete <profile-name>
```

## Supported AI Providers & Models

### OpenAI
- gpt-4o
- gpt-4o-mini
- gpt-4-turbo
- gpt-3.5-turbo

### Anthropic (Claude)
- claude-3-5-sonnet-20241022
- claude-3-5-haiku-20241022
- claude-3-opus-20240229
- claude-3-sonnet-20240229
- claude-3-haiku-20240307

### Google (Gemini)
- gemini-1.5-flash
- gemini-1.5-pro
- gemini-1.0-pro

## Configuration

### API Keys
Set API keys via environment variables or in `~/.cgem/config.json`:

**Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key  
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key

**Config File Example** (`~/.cgem/config.json`):
```json
{
  "providers": {
    "openai": {
      "apiKey": "your-openai-key"
    },
    "anthropic": {
      "apiKey": "your-anthropic-key"
    },
    "google": {
      "apiKey": "your-google-key"
    }
  },
  "currentProvider": "openai",
  "currentModel": "gpt-4o-mini",
  "defaultMaxTokens": 1000
}
```

### Profile Storage
Profiles are stored in `./profiles/` directory

## Development

```bash
# Watch mode during development
npm run dev

# Build the project
npm run build

# Run directly with Node.js
npm start
```

## Profile Structure

Profiles are stored as JSON files with the following structure:

```json
{
  "id": "profile-id",
  "name": "Profile Name",
  "systemPrompt": "Your custom system prompt...",
  "maxTokens": 1000,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastUsed": "2025-01-01T00:00:00.000Z"
}
```

## Architecture

Built with:
- **Mastra AI Framework** - Unified AI provider interface
- **TypeScript** - Type-safe development
- **Commander.js** - CLI framework
- **Inquirer.js** - Interactive prompts
- **Chalk** - Terminal colors

The application uses Mastra's unified provider API to seamlessly switch between different AI providers while maintaining a consistent interface. The new architecture separates concerns: profiles store system prompts, while provider/model selection is handled globally, allowing maximum flexibility.
