<div align="center">
  <img src="https://shadowquill.org/images/logo-circle.png" alt="ShadowQuill Logo" width="120" height="120">

# ShadowQuill v0.9.3

**Privacy-First AI Prompt Studio**

  [![Website](https://img.shields.io/badge/Website-shadowquill.org-8b7cf6)](https://shadowquill.org)
  [![Stars](https://img.shields.io/github/stars/shadowquillapp/shadowquillapp)](https://github.com/shadowquillapp/shadowquillapp/stargazers)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## Overview

ShadowQuill transforms natural language ideas into structured, high-quality prompts. Powered by Ollama and Gemma 3, it runs 100% offline—completely local and free.

## ShadowQuill Installation

### macOS
[![Download for macOS (DMG)](https://img.shields.io/badge/Download-.dmg-b3b3b3?logo=apple&logoColor=white)](https://github.com/shadowquillapp/shadowquillapp/releases/download/v0.9.3/ShadowQuill-0.9.3-arm64.dmg)

### Windows
[![Download for Windows (EXE)](https://img.shields.io/badge/Download-.exe-0078D4?logo=windows&logoColor=white)](https://github.com/shadowquillapp/shadowquillapp/releases/download/v0.9.3/ShadowQuill.Setup.0.9.3.exe)

<br/>

**Alternate:** Visit the [Latest Release page](https://github.com/shadowquillapp/shadowquillapp/releases/latest).

## Quick Start

**Prerequisites:** [Ollama](https://ollama.com) with a Gemma 3 model

```bash
# Download a model (choose based on your RAM)
ollama pull gemma3:4b   # 8GB+ RAM
ollama pull gemma3:12b  # 16GB+ RAM
ollama pull gemma3:27b  # 32GB+ RAM + GPU

# Clone, install, and run
git clone https://github.com/shadowquillapp/shadowquillapp.git
cd shadowquillapp
pnpm install
pnpm start
```

## Features

| Feature | Details |
|---------|---------|
| **8 Tabs** | Work on multiple prompts simultaneously |
| **7 Task Types** | General, Coding, Writing, Marketing, Research, Image, Video |
| **10 Default Presets** | Ready-to-use configurations for common workflows |
| **Preset Studio** | Create custom presets with live preview |
| **Version History** | Track prompt iterations with a visual timeline |
| **4 Themes** | Earth, Dark Purple, Dark, Light |
| **Gemma 3 Support** | 4B, 12B, 27B with auto-detection |

### Default Presets

`Daily Helper` • `Quick Summary` • `Code Helper` • `Bug Hunter` • `Email Draft` • `Research Assistant` • `Deep Analyst` • `Social Post` • `Image Creator` • `Video Creator`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl + T | New tab |
| ⌘/Ctrl + W | Close tab |
| ⌘/Ctrl + 1-8 | Switch tabs |
| ⌘/Ctrl + F | Find |

## Development

```bash
pnpm install              # Install packages
pnpm run dev              # Development mode
pnpm run build            # Production build
pnpm start                # Production mode
pnpm run test             # Run tests
pnpm run typecheck        # Type checking
pnpm run check            # Lint with Biome
```

## Tech Stack

Next.js • Electron • Ollama • React • TypeScript • Tailwind CSS • Vitest • Biome

## Philosophy

- **Offline-First** — Fully operational without internet
- **Zero Telemetry** — No tracking or data collection
- **Local Storage** — All data stays on your machine

## Contributing

1. [Open an issue](https://github.com/shadowquillapp/shadowquillapp/issues) to discuss changes
2. Keep PRs focused and preserve the local-first architecture

<p align="left">
  <a href="https://github.com/shadowquillapp/shadowquillapp/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=shadowquillapp/shadowquillapp" alt="Contributors" />
  </a>
</p>
