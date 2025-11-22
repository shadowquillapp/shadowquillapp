<div align="center">
  <img src="public/icon.png" alt="ShadowQuill Logo" width="120" height="120">
  
# ShadowQuill
  
**Fully localized AI prompt generator app focused on privacy first architecture**
  
  [![Website](https://img.shields.io/badge/Website-shadowquill.org-8b7cf6)](https://shadowquill.org)
  [![Stars](https://img.shields.io/github/stars/shadowquillapp/shadowquillapp)](https://github.com/shadowquillapp/shadowquillapp/stargazers)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## What Is ShadowQuill?

ShadowQuill is a desktop application for crafting AI prompts with complete priva`cy. All processing happens locally on your machine using Ollama with Gemma 3 models.

### Complete Privacy

No data ever leaves your computer. All AI processing runs locally through Ollama.

### Local Storage

Your chats, presets, system prompts, and settings are stored locally in the app's user data directory using localStorage and JSON files. You can view the exact paths and factory‑reset from Settings → Data Location.

### Modern Interface

Clean, beautiful design with four themes and responsive layout that works on any screen size.

## Features

### Chat Interface

- **Natural Conversation**: Chat directly with AI to generate and refine prompts
- **Task Types**: Choose from general, coding, image, video, research, writing, or marketing tasks
- **Customization**: Adjust tone, detail level, output format, language, and creativity
- **Chat History**: All conversations are saved locally and easy to access

### Preset Studio

- **Visual Preset Manager**: Dedicated studio interface for creating and managing prompt presets
- **Rich Configuration**: Configure all prompt parameters including task type, tone, detail, format, and task-specific options
- **Apply to Chat**: Load presets directly into your chat sessions
- **Import/Export**: Duplicate and organize your preset library

### AI Integration

- **Provider: Ollama (local only)** — no cloud providers
- **Gemma 3 only (1B, 4B, 12B, 27B)** — explicitly supported and auto‑detected
- **Auto‑Detection**: Finds your installed Gemma 3 models from the local Ollama daemon
- **Easy Switching**: Pick a Gemma 3 size from the model selector in chat
- **No Internet Required**: All AI processing happens entirely on your machine

### User Experience

- **Four Beautiful Themes**: Earth (warm), Purple Dark, Dark, and Light
- **Code Highlighting**: Syntax-highlighted code blocks (JSON, Markdown) with copy button
- **System Prompt Editor**: Customize the AI's behavior with your own system prompts
- **Responsive Design**: Works great on desktop, with mobile-friendly sidebar
- **Keyboard Friendly**: Navigate and interact efficiently
- **Data Management**: View storage locations and reset app data from settings

## Download

Pre-built installers are available for download:

- **GitHub Releases**: <https://github.com/shadowquillapp/shadowquillapp/releases>
- **Website**: <https://shadowquill.org>

## Getting Started

### What You Need

Before using ShadowQuill, you need:

1. **Ollama** installed and running on your computer
2. At least one **Gemma 3 model** downloaded through Ollama

### Install Ollama

**Windows, macOS & Linux:**

Download the installer from <https://ollama.ai/download>

Or you can download using CLI:

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Download a Gemma 3 Model

1. Start Ollama and open your terminal
2. Run these commands based on what model, or models, you would like integrated:

```bash
ollama pull gemma3:1b   # Smallest, fastest (good for testing)
ollama pull gemma3:4b   # Recommended model for most use-cases
ollama pull gemma3:12b  # Better quality, needs more RAM
ollama pull gemma3:27b  # Best quality, but needs very powerful hardware
```

We recommend starting with `gemma3:4b` by running `ollama pull gemma3:4b` for the best balance of speed and quality.

### Start Using ShadowQuill

1. **Launch the app** from your applications folder or desktop shortcut
2. **Configure Gemma 3 (Ollama) connection** when the dialog appears
   - Keep the default base Ollama port `11434` unless you changed it yourself manually
   - Click “Check for models” to detect available `gemma3` models
3. **Start crafting** and creating prompts!

The app automatically detects when Ollama is running and which Gemma 3 models are available.

## Using the App

### 1. Chat Interface

The main chat interface is where you interact with AI:

1. **Start a conversation**: Type your request in the chat input at the bottom
2. **Adjust settings**: Use the sidebar to configure:
   - Task type (general, coding, image, video, research, writing, marketing)
   - Tone (neutral, friendly, formal, technical, persuasive)
   - Detail level (brief, normal, detailed)
   - Output format (plain, markdown, XML)
   - Temperature and other advanced options
3. **Send**: Click Send or press Enter to generate the AI response
4. **Continue**: Keep chatting to refine your prompts or ask follow-up questions
5. **History**: Access previous chats from the chat list in the sidebar

### 2. Managing Presets

**Loading Presets in Chat:**

- Click the preset dropdown in the sidebar
- Select from your saved presets or recently used ones
- Settings are automatically applied to your current session

**Preset Studio:**

1. Navigate to the Preset Studio from the header menu
2. Browse your preset library at the top of the screen
3. Click a preset to edit its configuration
4. Adjust all settings: task type, tone, detail, format, and task-specific options
5. Save changes or create new presets
6. Use "Apply to Chat" to load a preset and return to the chat interface

## Privacy & Data

**Everything is local.** ShadowQuill:

- Never connects to external services (only your local Ollama at `http://localhost:11434`)
- Stores chats, presets, system prompts, and settings in your OS profile under the app's user data directory using localStorage and JSON files
- All data is FULLY localized to your computer's hard drive
- No sign up EVER required. This is a local application that runs on your computer
- Doesn't collect telemetry or usage data, and never will. Feel free to review the source code
- Gives you complete control over your privacy with a fully offline AI toolkit

**Data Management:**

- View exact storage paths: Settings → Data Location
- Reset app data: Settings → Data Location → Reset Application
- Customize AI behavior: Settings → System Prompts
- All data can be manually accessed or deleted from the user data directory shown in settings

## Building from Source

If you want to modify ShadowQuill or build it yourself:

**Quick start:**

```bash
# Install dependencies
npm install

# Run the desktop app in development mode
npm run dev
```

**Build installers:**

```bash
# Windows installer and portable
npm run dist:win

# All platforms (requires platform-specific build tools)
npm run dist:electron
```

**Other commands:**

```bash
# Type checking
npm run typecheck

# Code linting and formatting (Biome)
npm run check
npm run check:write

# Run tests
npm run test
```

**Tech-stack:**

- Desktop: Electron
- Frontend: Next.js with React
- Styling: Tailwind CSS
- Language: TypeScript
- Storage: localStorage and locations given with paths in ShadowQuill settings menu

### Project Structure

- `electron/` — Electron main process, preload scripts, and dev/start scripts
- `src/app/` — Next.js App Router pages:
  - `chat/` — Main chat interface
  - `studio/` — Preset Studio for managing presets
- `src/components/` — Shared UI components (dialogs, settings, titlebar, etc.)
- `src/lib/` — Core client-side libraries:
  - Local storage, config, and database helpers
  - Prompt builder logic
  - Model client for Ollama communication
  - Preset management
- `src/server/` — Server-side utilities (types, storage layer, logging)
- `src/styles/` — Global CSS with theme definitions
- `public/` — Static assets and branding

## Contribution

We welcome and appreciate all contributions to ShadowQuill app. Help us grow and improve by joining our contributor list.

### ShadowQuill Contributors

<p align="left">
  <a href="https://github.com/shadowquillapp/shadowquillapp/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=shadowquillapp/shadowquillapp" alt="A table of avatars from the project's contributors" />
  </a>
</p>

### Before You Contribute

To ensure a smooth collaboration, please follow these simple steps:

1.  [**Create an issue**](https://github.com/shadowquillapp/shadowquillapp/issues/new) to discuss the feature, fix, or change you plan to implement. This helps prevent duplicated effort and ensures alignment with the project's goals.
2.  Keep your changes **focused and concise**. Ideally, each Pull Request (PR) addresses a single, structured task.
3.  Follow the **existing code style** of the repository as closely as possible.
4.  Your changes **must always preserve** the core values of the application: **offline**, **privacy-first**, and **local-only data storage**.
