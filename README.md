# PromptCrafter

**[Repo](https://github.com/LekkerPrompt/LekkerPrompt) · [Issues](https://github.com/LekkerPrompt/LekkerPrompt/issues) · [Website](https://promptcrafter.org)**

## What Is PromptCrafter?

PromptCrafter is a desktop application for crafting AI prompts with complete privacy. All processing happens locally on your machine using Ollama with Gemma 3 models.

**Complete Privacy**: No data ever leaves your computer. All AI processing runs locally through Ollama.

**Local Storage**: Your chats, saved presets, and settings are stored as simple files in a folder you choose.

**Modern Interface**: Clean, beautiful design with three themes and responsive layout that works on any screen size.

## Features

### Prompt Building

- **Structured Guidance**: Create prompts from scratch with helpful controls and options
- **Task Types**: Choose from general, coding, image, research, writing, or marketing tasks
- **Customization**: Adjust tone, detail level, output format, language, and creativity
- **Save Presets**: Store your favorite prompt configurations for quick reuse

### AI Integration

- **Local Ollama Models**: Works with Gemma 3 models (1B, 4B, 12B, 27B sizes available)
- **Auto-Detection**: The app finds all models you have installed
- **Easy Switching**: Change between models with a simple dropdown menu
- **No Internet Required**: Everything runs on your machine

### User Experience

- **Three Beautiful Themes**: Default (purple), WarmEarth, and Light
- **Chat History**: All your conversations are saved and easy to find
- **Code Highlighting**: Formatted code blocks with copy button
- **Responsive Design**: Works great on desktop, with mobile-friendly sidebar
- **Keyboard Friendly**: Navigate and interact efficiently

## Download

Pre-built installers are available for download:

- **GitHub Releases**: <https://github.com/LekkerPrompt/LekkerPrompt/releases>
- **Website**: <https://promptcrafter.org>

Choose the installer for your operating system (Windows, macOS, or Linux). On first launch, you'll pick a folder to store your data.

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
2. **Choose a data folder** when prompted on first run
3. **Verify Ollama connection** in the initial setup screen
4. **Select your model** from the dropdown menu
5. **Start chatting** and creating prompts!

The app will automatically detect when Ollama is running and which models you have available.

## Using the App

### Creating Your First Prompt

1. Type your request or question in the chat input
2. Adjust settings like task type, tone, and detail level using the sidebar controls
3. Click Send or press Enter
4. Review the AI's response
5. Continue the conversation or start a new chat

### Saving Presets

If you find settings you like:

1. Click the **Save Preset** button in the sidebar
2. Give your preset a name
3. Access it anytime from the **Presets** menu

### Switching Models

Click the model name at the top of the chat window to see all available models. Select a different one to switch instantly.

### Changing Themes

1. Click the **Settings** menu (gear icon)
2. Choose from Default, WarmEarth, or Light theme
3. Your choice is saved automatically

## Privacy & Data

**Everything is local.** PromptCrafter:

- Never connects to external services (except Ollama on your machine)
- Stores all data in the folder you chose
- Doesn't collect telemetry or usage data
- Gives you complete control over your conversations

To completely reset the app, simply delete your data folder.

## Building from Source

If you want to modify PromptCrafter or build it yourself:

**Requirements:**

- Node.js 18.18 or newer (20+ recommended)
- npm package manager

**Quick start:**

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

**Build installers:**

```bash
# Windows installer and portable
npm run dist:win

# All platforms (requires platform-specific build tools)
npm run dist:electron
```

**Technology stack:**

- Desktop: Electron
- Frontend: Next.js with React
- Styling: Tailwind CSS
- Language: TypeScript
- Storage: Local JSON files

## Contributing

Contributions are welcome! Here are some areas where help would be great:

- **Additional Model Support**: LM Studio, vLLM, or other local AI providers
- **UI Improvements**: Better mobile experience, new features, polish
- **Accessibility**: Keyboard shortcuts, screen reader support
- **Themes**: New color schemes and customization options
- **Translations**: Multi-language support

**Before contributing:**

- Check existing Issues or create one to discuss larger features
- Keep changes focused and small
- Follow the existing code style
- Maintain the privacy-first, local-only approach

## License

MIT © [LekkerPrompt](https://github.com/LekkerPrompt/LekkerPrompt)
