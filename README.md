<div align="center">
  <img src="public/icon.png" alt="ShadowQuill Logo" width="120" height="120">
  
# ShadowQuill
  
**Privacy-First AI Prompt Studio**
  
  [![Website](https://img.shields.io/badge/Website-shadowquill.org-8b7cf6)](https://shadowquill.org)
  [![Stars](https://img.shields.io/github/stars/shadowquillapp/shadowquillapp)](https://github.com/shadowquillapp/shadowquillapp/stargazers)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## Overview

Desktop AI prompt studio running 100% locally via **Ollama** and **Gemma 3** models. No data leaves your device.

## Tech Stack

### Nextron

| Layer | Technology |
|-------|------------|
| Framework | Nextron _(Next.js + Electron)_ |
| UI | React & Heroicons & Tailwind CSS |
| Language | TypeScript |
| Testing | Vitest |
| Linting | Biome |
| Icons | Heroicons |

## Key Features

- **100% Local & Private** - All processing via Ollama on your machine
- **8 Tabs** - Work on multiple prompts simultaneously with independent presets and history
- **Version History** - Track prompt iterations with manual saves (⌘S/Ctrl+S) and visual timeline
- **7 Task Types** - General, Coding, Writing, Marketing, Research, Image, Video
- **Gemma 3 Only** - Supports gemma3:4b, gemma3:12b, gemma3:27b with auto-detection
- **Preset Studio** - Create reusable configurations with live preview and AI examples
- **4 Themes** - Default (Earth), Dark Purple, Dark, Light

## Getting Started

### 1. Prerequisites

#### Install Ollama

**Ollama** is a free app that runs AI models locally on your computer. ShadowQuill uses it as the AI engine for 100% offline privacy.

Download from [ollama.com](https://ollama.com)

Ollama runs in the background as a service, which can be used with ollama's CLI tools or live chat interface.

#### Download a Gemma 3 Model

**Supported models:**

- `gemma3:4b` - Fast, balanced (Recommended)
- `gemma3:12b` - Higher quality
- `gemma3:27b` - Best quality (requires 32GB+ RAM)

**Download via Command Line:**

```bash
ollama pull gemma3:4b # Gemma 3 4B Model
```

```bash
ollama pull gemma3:12b # Gemma 3 12B Model
```

```bash
ollama pull gemma3:27b # Gemma 3 27B Model
```

**Download via Ollama Chat Interface:**

1. Open Ollama desktop app
2. Start chatting with a model name
3. Ollama will prompt you to download it

> **Note:** Download models through Ollama (CLI or chat interface), not ShadowQuill. ShadowQuill auto-detects installed Gemma 3 models.

### 2. Install ShadowQuill

Download installers: [shadowquill.org](https://shadowquill.org) or [GitHub Releases](https://github.com/shadowquillapp/shadowquillapp/releases)

### 3. Usage

#### Prompt Workbench

- **New Tab** - Click "+" or ⌘T/Ctrl+T, select a preset
- **Switch Models** - Use vertical selector (4B/12B/27B)
- **Write & Generate** - Left pane for input, right pane for output
- **Version History** - Click version indicator (e.g., "v2") to navigate saves
- **Manual Save** - ⌘S/Ctrl+S to create version snapshot

| Shortcut | Action |
|----------|--------|
| ⌘T / Ctrl+T | New tab |
| ⌘W / Ctrl+W | Close tab |
| ⌘S / Ctrl+S | Save version |
| ⌘1-8 / Ctrl+1-8 | Switch tabs |

#### Preset Studio

- **Browse** - View presets by task type
- **Edit** - Modify tone, detail, format, temperature, task options
- **Generate Examples** - AI-powered preview
- **Apply to Workbench** - Start new session with preset
- **Duplicate & Delete** - Clone or remove presets

**Pre-Packed with 10 ShadowQuill Default Presets**

`Daily Helper` • `Brainstormer` • `Summary Ultra` • `Code Architect` • `Bug Fixer` • `Code Explainer` • `Blog Writer` • `Email Pro` • `Deep Research` • `Social Media`

#### Settings

Access via gear icon.

| Tab | Description |
|-----|-------------|
| **Ollama Setup** | Connection, view/manage Gemma 3 models (4b/12b/27b) |
| **System Prompt** | Customize base system prompt |
| **Data Management** | Storage paths, export/import, factory reset |
| **Display** | Themes, zoom (50%-200%) |

## Development

```bash
npm install              # Install dependencies
```

```bash
npm run typecheck        # Type check
```

```bash
npm run check            # biome check
```

```bash
npm test -- --silent     # Run tests with minimal output
```

```bash
npm test                 # Run tests with all output
```

```bash
npm run test:coverage    # With coverage report
```

```bash
npm run dev              # Open ShadowQuill app in dev mode
```

## Privacy & Security

- **Offline** - Works without internet (after model download)
- **No Telemetry** - Zero tracking
- **Local Storage** - All data saved to OS local user directory

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
