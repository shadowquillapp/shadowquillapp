# PromptCrafter

**[Repo](https://github.com/LekkerPrompt/LekkerPrompt) · [Issues](https://github.com/LekkerPrompt/LekkerPrompt/issues) · [Website](https://promptcrafter.org)**

## What Is PromptCrafter?

PromptCrafter is a desktop application for crafting AI prompts with complete privacy. All processing happens locally on your machine using Ollama with Gemma 3 models.

**Complete Privacy**: No data ever leaves your computer. All AI processing runs locally through Ollama.

**Local Storage**: Your chats, saved presets, and settings are stored locally in the app’s profile (Electron’s Chromium storage: localStorage/IndexedDB). You can view the exact paths and factory‑reset from the in‑app Data Location panel.

**Modern Interface**: Clean, beautiful design with three themes and responsive layout that works on any screen size.

## Features

### Prompt Building

- **Structured Guidance**: Create prompts from scratch with helpful controls and options
- **Task Types**: Choose from general, coding, image, research, writing, or marketing tasks
- **Customization**: Adjust tone, detail level, output format, language, and creativity
- **Save Presets**: Store your favorite prompt configurations for quick reuse

### AI Integration

- **Provider: Ollama (local only)** — no cloud providers
- **Gemma 3 only (1B, 4B, 12B, 27B)** — explicitly supported and auto‑detected
- **Auto‑Detection**: Finds your installed Gemma 3 models from the local Ollama daemon
- **Easy Switching**: Pick a Gemma 3 size from the built‑in connection dialog
- **No Internet Required**: Prompts are generated entirely on your machine

### User Experience

- **Three Beautiful Themes**: Default (purple), WarmEarth, and Light
- **Chat History**: Conversations are saved locally and easy to find
- **Code Highlighting**: Formatted code blocks with copy button
- **Responsive Design**: Works great on desktop, with mobile-friendly sidebar
- **Keyboard Friendly**: Navigate and interact efficiently

## Download

Pre-built installers are available for download:

- **GitHub Releases**: <https://github.com/LekkerPrompt/LekkerPrompt/releases>
- **Website**: <https://promptcrafter.org>

## Getting Started

### What You Need

Before using PromptCrafter, you need:

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

### Start Using PromptCrafter

1. **Launch the app** from your applications folder or desktop shortcut
2. **Configure Gemma 3 (Ollama) connection** when the dialog appears
   - Keep the default base Ollama port `11434` unless you changed it yourself manually
   - Click “Check for models” to detect available `gemma3` models
3. **Start crafting** and creating prompts!

The app automatically detects when Ollama is running and which Gemma 3 models are available.

## Using the App

### Creating Your First Prompt

1. Type your request or question in the chat input
2. Adjust settings like task type, tone, and detail level using the sidebar controls
3. Click Send or press Enter
4. Review the AI's response
5. Continue crafting or start a new chat

### Saving Presets

If you find settings you like:

1. Use the Preset Settings to add, save, edit or delete presets
2. Give your preset a name
3. Access it anytime from the **Presets** menu with is all stored locally on your computer

## Privacy & Data

**Everything is local.** PromptCrafter:

- Never connects to external services (only your local Ollama at `http://localhost:11434`)
- Stores chats, presets, and settings in your OS profile under the app’s user data directory (Chromium localStorage/IndexedDB), meaning your data is FULLY localized to your computers hard drive
- No sign up EVER required. This is a local application that runs on your computer so there will never be a need to make an account
- Doesn't collect telemetry or usage data, and never will. Please feel free to take a look at the codebase to see for yourself
- Gives you complete control over your privacy when it comes to a fully offline AI toolkit

To completely reset the app, open Settings → Data Location and click Reset Application, or manually delete the PromptCrafter user data directory shown there. The exact path to where everything is stored is avaiabled in the application's settings.

## Building from Source

If you want to modify PromptCrafter or build it yourself:

**Requirements:**

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
npm run dist:[PLATFORM]

# All platforms (requires platform-specific build tools)
npm run dist:electron
```

**Technology stack:**

- Desktop: Electron
- Frontend: Next.js with React
- Styling: Tailwind CSS
- Language: TypeScript
- Storage: Electron localStorage/IndexedDB (persistent) + in‑memory stores (runtime)

### Project Structure (high-level)

- `electron/` — Electron main, preload, and dev/start scripts
- `src/app/` — Next.js App Router pages and UI
- `src/components/` — Shared UI components
- `src/lib/` — Local storage helpers, model config, presets
- `src/server/` — Local-only services (model validation, in-memory data layer)

## Contributing

Contributions are welcome! Before contributing:

- Check existing Issues or create one to discuss larger features
- Keep changes focused and small
- Follow the existing code style
- Maintain the privacy-first, local-only approach

## License

MIT © [LekkerPrompt/PromptCrafter](https://github.com/LekkerPrompt)
