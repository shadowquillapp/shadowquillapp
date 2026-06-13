<div align="center">
  
# ShadowQuill

**A local prompt studio that stays on your machine**

  [![Stars](https://img.shields.io/github/stars/shadowquillapp/shadowquillapp)](https://github.com/shadowquillapp/shadowquillapp/stargazers)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## Overview

ShadowQuill turns rough ideas into structured prompts you can actually use. It talks to [Ollama](https://ollama.com) and runs Google Gemma models locally — no cloud API, no account, no network required after setup.

## Quick start

**You need:** [Ollama](https://ollama.com) installed, plus at least one Gemma model pulled.

```bash
# Pull a Gemma model
ollama pull gemma4:latest   # Gemma 4
ollama pull gemma3:latest   # Gemma 3

# Clone, install, run
git clone https://github.com/shadowquillapp/shadowquillapp.git
cd shadowquillapp
pnpm install
pnpm start
```

## Features

| Feature | Details |
|---------|---------|
| **8 tabs** | Keep several prompts open at once |
| **7 task types** | Intent, Engineering, Visual, Motion, Analysis, Narrative, Persuasion |
| **10 default presets** | Starting points for common workflows |
| **Preset Studio** | Build your own presets with live preview |
| **Version history** | Step through prompt versions with prev/next navigation |
| **Gemma via Ollama** | Finds compatible models on your local instance |

### Default presets

`Daily Helper` • `Quick Summary` • `Code Helper` • `Bug Hunter` • `Email Draft` • `Research Assistant` • `Deep Analyst` • `Social Post` • `Image Creator` • `Video Creator`

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl + T | New tab |
| ⌘/Ctrl + W | Close tab |
| ⌘/Ctrl + 1-8 | Switch tabs |
| ⌘/Ctrl + F | Find |

## Development

```bash
pnpm install              # Install packages
pnpm run dev              # Dev mode (Electron + Next)
pnpm run build            # Production build
pnpm start                # Run production build
pnpm run test             # Vitest
pnpm run typecheck        # TypeScript check
pnpm run check            # Lint with Biome
```

## Tech stack

Next.js • Electron • Ollama • React • TypeScript • Tailwind CSS • Vitest • Biome

## How we think about it

- **Offline-first** — Works without internet once Ollama and the app are set up
- **No telemetry** — Nothing phones home
- **Local storage** — Projects, presets, and config live on your disk

## Contributing

1. [Open an issue](https://github.com/shadowquillapp/shadowquillapp/issues) if you want to discuss a change first
2. Keep PRs small and leave the local-first setup alone unless the PR is explicitly about that
