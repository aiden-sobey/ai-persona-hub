# AI Persona Hub

Inspired by Gemini Gems, this is a command-line interface for creating and managing custom AI profiles that can be run on multiple AI providers, allowing you to use the power of Gems with the AI of your choice.

## Features

- 🔮 Create custom AI profiles with personalized system prompts
- 🤖 **Multi-Provider Support**
  - OpenAI (ChatGPT)
  - Anthropic (Claude)
  - Google (Gemini)
- 💬 Interactive CLI chat sessions with your AI profiles
- 🔄 **Dynamic Models**: Change AI provider/model anytime without recreating profiles
- 💾 Local JSON-based profile storage
- ⚡ Powered by [Mastra AI](https://mastra.ai/) framework

## Usage

### Installation

Install the package and verify:

```bash
npm install -g ai-persona-hub
cgem --help
```

### Connect Providers

Set up API keys for your preferred providers:

```bash
# OpenAI
export OPENAI_API_KEY="your-openai-key"

# Anthropic (Claude)
export ANTHROPIC_API_KEY="your-anthropic-key"

# Google (Gemini)
export GOOGLE_GENERATIVE_AI_API_KEY="your-google-key"
```

Or make use of `~/.cgem/config.json`:
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


### Configuration

_Select your preferred AI provider and model_

```bash
cgem model
```

_Create a custom AI profile using a system prompt_

```bash
cgem create
```

_Chat with any profile using your currently configured model_

```bash
cgem chat <profile-name>
```

### All commands

```bash
cgem model         # Configure AI provider/model (required first step)
cgem create        # Create new AI profile
cgem list          # List all profiles
cgem chat <name>   # Chat with specific profile
cgem delete <name> # Delete profile
```

[See all supported models here](https://github.com/aiden-sobey/ai-persona-hub/blob/main/src/types/index.ts#L40)

Feel free to open a PR expanding the list.

## Development

First, clone the repository and install dependencies:

```bash
git clone git@github.com:aiden-sobey/ai-persona-hub.git
cd ai-persona-hub
npm install
```

To run the project:

```bash
# Watch mode during development
npm run dev

# Build the project
npm run build

# Run directly with Node.js
npm start
```

## Profiles

Profiles are stored in `./profiles/` directory

### Structure

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
