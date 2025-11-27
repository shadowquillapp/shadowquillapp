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

- **100% Local & Private**: All processing happens on your machine via Ollama. Data is stored locally in your user profile.
- **Tab-Based Workbench**: Work with up to 8 prompt sessions simultaneously. Each tab maintains its own preset, history, and version state.
- **Preset-Driven Workflow**: Every tab is powered by a preset configuration. Create, customize, and reuse presets across sessions.
- **Version History**: Track all prompt iterations with manual saves (⌘S/Ctrl+S) and automatic versioning. Navigate through your prompt evolution with a visual version timeline.
- **7 Task Types**: Specialized prompt modes for **General**, **Coding**, **Writing**, **Marketing**, **Research**, **Image**, and **Video** generation.
- **Gemma 3 Optimized**: Native support for Gemma 3 models (4B, 12B, 27B) with an intuitive model selector and auto-detection.
- **Preset Studio**: Full-featured preset editor with live preview, AI-generated examples, and preset version history.
- **4 Color Themes**: Default (Earth), Dark Purple, Dark, and Light—accessible from Settings > Display.
- **Real-Time Metrics**: Track word and character counts for both input and output in real-time.
- **Mobile Responsive**: Fully responsive design that adapts to different screen sizes.

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

#### Prompt Workbench

The main interface for crafting and generating prompts.

- **Create New Tabs**: Click the "+" button or press ⌘T/Ctrl+T. Select a preset to configure the new tab.
- **Switch Models**: Use the vertical model selector (4B/12B/27B) in the editor pane to switch between Gemma 3 models.
- **Write Prompts**: Enter your prompt in the left editor pane. Word and character counts update in real-time.
- **Generate**: Click the run button or view responses in the right output pane.
- **Version History**: Click the version indicator (e.g., "v2") to view and navigate through saved versions.
- **Manual Save**: Press ⌘S/Ctrl+S to create a version snapshot at any time.
- **Copy Output**: Copy responses with code fence stripping for clean text.

**Keyboard Shortcuts:**
| Shortcut | Action |
|----------|--------|
| ⌘T / Ctrl+T | New tab |
| ⌘W / Ctrl+W | Close current tab |
| ⌘S / Ctrl+S | Save version snapshot |
| ⌘1-8 / Ctrl+1-8 | Switch to tab 1-8 |

#### Preset Studio

Create and manage reusable prompt configurations.

- **Browse Presets**: View all presets in the left sidebar organized by task type.
- **Edit Configuration**: Modify task type, tone, detail level, format, temperature, and task-specific options.
- **Generate Examples**: AI-powered example generation to preview how your preset will behave.
- **Apply to Workbench**: Send any preset directly to the workbench to start a new session.
- **Duplicate & Delete**: Clone presets for variations or remove unused ones.

**Default Presets Include:**
- Quick Answer, Deep Thinker (General)
- Code Architect, Quick Script (Coding)
- Photorealistic, Anime Art, Concept Art (Image)
- Cinematic Shot, Social Clip (Video)
- Deep Research (Research)
- Storyteller, Blog Writer (Writing)
- Social Media Pro, Sales Copy (Marketing)

#### Settings

Access via the gear icon in the workbench header.

| Tab | Description |
|-----|-------------|
| **Ollama Setup** | Configure Ollama connection, view installed models, manage model selection |
| **System Prompt** | Customize the base system prompt used across all generations |
| **Data Management** | View storage paths, export/import data, factory reset |
| **Display** | Theme selection, UI zoom (50%-200%), display statistics |

## Development

Build from source:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Lint and format
npm run check

# Build for production
npm run dist:electron
```

**Tech Stack:**
- Electron 38
- Next.js 16
- React 19
- Tailwind CSS 4
- TypeScript 5.8
- Vitest (testing)
- Biome (linting/formatting)

## Privacy & Security

- **Offline Capable**: Works without an internet connection (after downloading models).
- **No Telemetry**: We do not track your usage.
- **Local Storage**: All chats, presets, and settings are saved to your OS user data directory.

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
