<div align="center">
  <img src="public/icon.png" alt="ShadowQuill Logo" width="120" height="120">
  
# ShadowQuill
  
**Privacy-First AI Prompt Studio**
  
  [![Website](https://img.shields.io/badge/Website-shadowquill.org-8b7cf6)](https://shadowquill.org)
  [![Stars](https://img.shields.io/github/stars/shadowquillapp/shadowquillapp)](https://github.com/shadowquillapp/shadowquillapp/stargazers)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## Overview

ShadowQuill is a desktop application for crafting high-quality AI prompts with complete privacy. It runs entirely locally on your machine using **Ollama** and **Gemma 3** models. No data ever leaves your device.

## Key Features

- **100% Local & Private**: All processing happens on your machine via Ollama. Data is stored in your local user profile.
- **Tab-Based Interface**: Work with multiple prompt sessions simultaneously. Each tab maintains its own history and state.
- **Version History**: Track all prompt iterations with manual saves (⌘S/Ctrl+S) and automatic versioning. Navigate through your prompt evolution with visual indicators.
- **Specialized Prompt Building**: Dedicated modes for **Coding**, **Writing**, **Marketing**, **Research**, **Image**, and **Video** prompts.
- **Gemma 3 Optimized**: Native support for Gemma 3 models (4B, 12B, 27B) with intuitive vertical model selector and auto-detection.
- **Preset Studio**: Create, manage, and share reusable prompt templates with granular configuration. Link presets to projects for easy tracking.
- **Multiple Themes**: Choose from 4 themes - Default (Earth), Dark Purple, Dark, and Light - all accessible from Settings.
- **Smart Code Rendering**: Enhanced code block detection and syntax highlighting with automatic XML/HTML recognition.
- **Mobile Responsive**: Fully responsive design that adapts to different screen sizes and mobile devices.
- **Real-Time Metrics**: Track word and character counts for both input and output in real-time.

## Getting Started

### 1. Prerequisites

You need **Ollama** installed and at least one **Gemma 3** model.

**Install Ollama:**
Download from [ollama.ai](https://ollama.ai) or run:

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Get a Model:**

```bash
ollama pull gemma3:4b   # Recommended balance
# or
ollama pull gemma3:12b  # High quality
ollama pull gemma3:27b  # Max quality (requires high RAM)
```

### 2. Install ShadowQuill

Download the latest installer for Windows, macOS, or Linux from:

- **Website**: [shadowquill.org](https://shadowquill.org)
- **GitHub Releases**: [Latest Release](https://github.com/shadowquillapp/shadowquillapp/releases)

### 3. Usage

**Chat Interface (Prompt Workbench)**:

- **Create New Tabs**: Click the "+" button in the tab bar or press ⌘T/Ctrl+T to start a new session with a preset.
- **Select Task Type**: Choose from Coding, Writing, Marketing, Research, Image, or Video modes.
- **Configure Options**: Set tone, detail level, output format (Markdown, Plain, XML), and other parameters.
- **Switch Models**: Use the vertical model selector to switch between Gemma 3 models (4B, 12B, 27B).
- **Track Progress**: Monitor word and character counts for both your prompts and AI responses.
- **Manual Saves**: Press ⌘S/Ctrl+S to create version snapshots at any time.
- **Version History**: Click the version button to view and navigate through all saved versions of your prompt.
- **Copy Prompts**: Copy button automatically strips code fences for clean text copying.

**Preset Studio**:

- Create and save custom prompt configurations with all your preferred settings.
- Apply presets instantly when creating new tabs.
- Edit presets directly from the workbench with the "Edit" button.
- Link presets to projects for better organization.

**Display & Theme**:

- Access **Settings > Display** to choose from 4 themes: Default (Earth), Dark Purple, Dark, or Light.
- Adjust UI zoom level (50%-200%) for comfortable viewing.
- View display statistics and window information.

**Data Management**:

- All chats, presets, and settings are stored locally.
- View storage paths or reset data in **Settings > Data Location**.

## Development

Build from source:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run dist:electron
```

**Tech Stack**: Electron, Next.js, React, Tailwind CSS, TypeScript.

## Privacy & Security

- **Offline Capable**: Works without an internet connection (after downloading models).
- **No Telemetry**: We do not track your usage.
- **Local Storage**: Chats and settings are saved to your OS user data directory (via strictly local storage).

## Contributing

Contributions are welcome! Please read our contribution guidelines before submitting a Pull Request.

1. [Open an issue](https://github.com/shadowquillapp/shadowquillapp/issues) to discuss changes.
2. Keep PRs focused on a single task.
3. Preserve the offline/local-first architecture.

<p align="left">
  <a href="https://github.com/shadowquillapp/shadowquillapp/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=shadowquillapp/shadowquillapp" alt="Contributors" />
  </a>
</p>
