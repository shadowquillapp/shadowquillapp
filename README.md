<div align="center">
  <img src="https://shadowquill.org/images/logo-circle.png" alt="ShadowQuill Logo" width="120" height="120">

# ShadowQuill v0.6.0

**Privacy-First AI Prompt Studio**

  [![Website](https://img.shields.io/badge/Website-shadowquill.org-8b7cf6)](https://shadowquill.org)
  [![Stars](https://img.shields.io/github/stars/shadowquillapp/shadowquillapp)](https://github.com/shadowquillapp/shadowquillapp/stargazers)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## Overview

ShadowQuill is an AI-powered prompt editor and workbench designed to refine your AI workflow.

It transforms your natural language ideas into structured, high-quality prompts. Once optimized, simply copy your prompt and paste it into tools like ChatGPT, CoPilot, Gemini, Claude, and others.

Powered by Ollama and Gemma 3, ShadowQuill operates 100% offline, offering a completely local and free solution for AI-enhanced prompt generation.

## Installation with `node` and `pnpm`

- [How to install `node`](https://nodejs.org/)
- [How to install `pnpm`](https://pnpm.io/installation)

1 Clone the repository:

```bash
git clone https://github.com/shadowquillapp/shadowquillapp.git
```

2 Navigate into the ShadowQuill repository:

```bash
cd shadowquillapp
```

3 Install and build the application:

```bash
pnpm install
```

4 Start ShadowQuill:

```bash
pnpm start
```

> **Note:** Make sure to have [Ollama installed](#1-prerequisites) and at least one Gemma 3 model downloaded

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Nextron _(Next.js + Electron)_ |
| Local LLM | Ollama & Gemma 3 |
| UI | React & Heroicons & Tailwind CSS |
| Language | TypeScript |
| Testing | Vitest |
| Linting | Biome |
| Icons | Heroicons |

## Key Features

- **100% Local & Private** - All processing via Ollama and local storage on your machine
- **8 Tabs** - Work on multiple prompts simultaneously with independent presets and history
- **Version History** - Track prompt iterations with a visual timeline
- **7 Task Types** - General, Coding, Writing, Marketing, Research, Image, Video
- **Gemma 3 Support** - Supports gemma3:4b, gemma3:12b, gemma3:27b with auto-detection
- **Preset Studio** - Create reusable configurations with live preview and AI examples
- **4 Themes** - Default, Dark Purple, Dark, Light

## Getting Started

### 1. <ins>Prerequisites</ins>

#### Install Ollama

**Ollama** is a free app that runs AI models locally on your computer. ShadowQuill uses it as the AI engine for offline capabilities.

Download from [ollama.com](https://ollama.com)

Ollama runs in the background as a service. Using its CLI or Chat GUI, download one of the supported Gemma 3 models.

#### Download a Gemma 3 Model

**Supported models:**

- `gemma3:4b` - Fast, balanced (8GB+ RAM)
- `gemma3:12b` - Higher quality (16GB+ RAM)
- `gemma3:27b` - Best quality (32GB+ RAM and RTX GPU)

**Option 1: Download via command line**

```bash
# Choose one based on your system resources
ollama pull gemma3:4b   # Fast, balanced (8GB+ RAM)
ollama pull gemma3:12b  # Higher quality (16GB+ RAM)
ollama pull gemma3:27b  # Best quality (32GB+ RAM and RTX GPU)
```

**Option 2: Download via official Ollama chat GUI**

1. Open the Ollama desktop app
2. Start chatting with a model name (e.g., `gemma3:4b`)
3. Ollama will prompt you to download it automatically

### 2. <ins>Usage</ins>

#### Prompt Workbench

- **New Tab** - Click "+" or ⌘T/Ctrl+T, select a preset
- **Switch Models** - Use vertical selector (4B/12B/27B)
- **Write & Generate** - Left pane for input, right pane for output
- **Version History** - Easily reference and create version trees based on prompt refinement iterations

#### Available Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘+T / Ctrl+T | New tab |
| ⌘+W / Ctrl+W | Close tab |
| ⌘+1-8 / Ctrl+1-8 | Switch tabs |
| ⌘+F / Ctrl+F | Find tool |

#### Preset Studio

- **Browse** - View presets by task type
- **Edit** - Modify tone, detail, format, temperature, task options
- **Generate Examples** - AI-powered preview
- **Apply to Workbench** - Start new session with preset
- **Duplicate & Delete** - Clone or remove presets

**Pre-packed with 9 ShadowQuill Default Presets**

`Daily Helper` • `Brainstormer` • `Summary Ultra` • `Code Architect` • `Bug Fixer` • `Code Explainer` • `Email Pro` • `Deep Research` • `Social Media`

## Development

### Available Commands

```bash
# Setup
pnpm install             # Install dependencies

# (Optional)
pnpm update              # Check for package updates
pnpm upgrade             # Check for package upgrades

# Code Quality
pnpm run typecheck       # Run TypeScript type checking
pnpm run check           # Run Biome linter
pnpm run check:write     # Fix Biome lint errors (safe changes only)
pnpm run check:unsafe    # Fix Biome lint errors (safe + unsafe changes)

# Testing
pnpm run test            # Run tests
pnpm run test:coverage   # Run tests with coverage report

# Development
pnpm run dev             # Start ShadowQuill in development mode

# Production
pnpm run build           # Build for production
pnpm start               # Start ShadowQuill in production mode
```

## Value Sensitive Design (VSD) Philosophy

- **Offline** - Fully operational without internet connection after initial download
- **No Telemetry** - Zero tracking or data collection
- **Local Storage** - All data saved to your local userdata directory
- **Lean Package** - Minimal dependencies for a lightweight experience

## Contributing

Contributions welcome!

1. [Open an issue](https://github.com/shadowquillapp/shadowquillapp/issues) to discuss changes
2. Keep PRs focused on one task
3. Preserve offline/local-first architecture

<p align="left">
  <a href="https://github.com/shadowquillapp/shadowquillapp/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=shadowquillapp/shadowquillapp" alt="Contributors" />
  </a>
</p>
