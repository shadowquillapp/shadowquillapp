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

-   **100% Local & Private**: All processing happens on your machine via Ollama. Data is stored in your local user profile.
-   **Specialized Prompt Building**: Dedicated modes for **Coding**, **Writing**, **Marketing**, **Research**, **Image**, and **Video** prompts.
-   **Gemma 3 Optimized**: Native support for Gemma 3 models (4B, 12B, 27B) with auto-detection.
-   **Preset Studio**: Create, manage, and share reusable prompt templates with granular configuration.
-   **Modern UI**: Clean interface with multiple themes, syntax highlighting, and responsive design.

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
-   **Website**: [shadowquill.org](https://shadowquill.org)
-   **GitHub Releases**: [Latest Release](https://github.com/shadowquillapp/shadowquillapp/releases)

### 3. Usage

**Chat Interface**:
-   Select a task type (e.g., Coding, Writing).
-   Configure tone, detail level, and output format.
-   Chat with the AI to refine your prompt.

**Preset Studio**:
-   Create and save custom prompt configurations.
-   Apply presets instantly to new chat sessions.

**Data Management**:
-   All chats and settings are stored locally.
-   View storage paths or reset data in **Settings > Data Location**.

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

-   **Offline Capable**: Works without an internet connection (after downloading models).
-   **No Telemetry**: We do not track your usage.
-   **Local Storage**: Chats and settings are saved to your OS user data directory (via strictly local storage).

## Contributing

Contributions are welcome! Please read our contribution guidelines before submitting a Pull Request.

1.  [Open an issue](https://github.com/shadowquillapp/shadowquillapp/issues) to discuss changes.
2.  Keep PRs focused on a single task.
3.  Preserve the offline/local-first architecture.

<p align="left">
  <a href="https://github.com/shadowquillapp/shadowquillapp/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=shadowquillapp/shadowquillapp" alt="Contributors" />
  </a>
</p>
