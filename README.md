<div align="center">

# ShadowQuill

**A local prompt studio that stays on your machine.**

Turn rough ideas into polished, structured prompts using local AI models. ShadowQuill works entirely on your computer through Ollama—no cloud APIs, subscriptions, or accounts required.

<p>

[![Stars](https://img.shields.io/github/stars/shadowquillapp/shadowquillapp)](https://github.com/shadowquillapp/shadowquillapp/stargazers)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</p>

</div>

---

## Overview

ShadowQuill is a desktop application built for prompt engineering.

Instead of writing prompts in a plain text editor or chat window, ShadowQuill gives you a dedicated workspace for creating, refining, organizing, and reusing prompts. Everything runs locally using [Ollama](https://ollama.com) and Google Gemma models, so your prompts and conversations never leave your machine.

Whether you're writing prompts for coding, image generation, research, creative writing, or everyday productivity, ShadowQuill helps you iterate faster while keeping your work private.

---

## Screenshots

> [insert here]



*A short 15 to 30 second GIF or a video file demonstrating the workflow would also be highly recommended. Let me know what you think*

---

## How it works

Using ShadowQuill is simple:

1. Install Ollama and download a supported model.
2. Open ShadowQuill.
3. Choose a task type or preset.
4. Describe what you want to accomplish.
5. ShadowQuill transforms your idea into a structured prompt.
6. Iterate, compare versions, and save prompts for later.

Everything happens locally through your Ollama instance.

---

## Quick Start

### Requirements

You'll need:

* [Ollama](https://ollama.com)
* At least one Gemma model installed

```bash
# Gemma 4
ollama pull gemma4:latest

# Gemma 3
ollama pull gemma3:latest
```

Clone the repository:

```bash
git clone https://github.com/shadowquillapp/shadowquillapp.git
cd shadowquillapp
```

Install dependencies:

```bash
pnpm install
```

Start the application:

```bash
pnpm start
```

---

## Features

| Feature                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| **8 Tabs**              | Keep multiple prompts open simultaneously.                   |
| **7 Task Types**        | Specialized workflows for different kinds of prompting.      |
| **10 Built-in Presets** | Ready-to-use starting points for common tasks.               |
| **Preset Studio**       | Create, edit, and preview your own reusable presets.         |
| **Version History**     | Navigate through previous prompt revisions.                  |
| **Local AI**            | Automatically discovers compatible Ollama models.            |
| **Offline First**       | Continue working without an internet connection after setup. |
| **Privacy Focused**     | No telemetry, cloud APIs, or online accounts.                |

---

## Task Types

Each task type is optimized for a different style of prompting.

| Task Type       | Best For                                         |
| --------------- | ------------------------------------------------ |
| **Intent**      | General-purpose prompting and everyday tasks     |
| **Engineering** | Programming, debugging, and technical workflows  |
| **Visual**      | Image generation prompts                         |
| **Motion**      | Video generation prompts                         |
| **Analysis**    | Research, reasoning, and document analysis       |
| **Narrative**   | Stories, creative writing, and worldbuilding     |
| **Persuasion**  | Marketing, sales, communication, and copywriting |

---

## Built-in Presets

ShadowQuill includes several presets so you can start working immediately.

* Daily Helper
* Quick Summary
* Code Helper
* Bug Hunter
* Research Assistant
* Deep Analyst
* School Work
* Social Post
* Image Creator
* Video Creator

You can also create your own presets with **Preset Studio** and tailor them to your workflow.

---

## Keyboard Shortcuts

| Shortcut       | Action      |
| -------------- | ----------- |
| ⌘ / Ctrl + T   | New tab     |
| ⌘ / Ctrl + W   | Close tab   |
| ⌘ / Ctrl + 1–8 | Switch tabs |
| ⌘ / Ctrl + F   | Find        |

---

## Development

```bash
pnpm install              # Install dependencies
pnpm run dev              # Development mode (Electron + Next.js)
pnpm run build            # Production build
pnpm start                # Launch production build
pnpm run test             # Run Vitest
pnpm run typecheck        # TypeScript checks
pnpm run check            # Lint with Biome
```

---

## Tech Stack

* Electron
* Next.js
* React
* TypeScript
* Tailwind CSS
* Ollama
* Google Gemma
* Vitest
* Biome

---

## Philosophy

### 🖥️ Local First

Everything runs on your computer through Ollama. Once your models are installed, no internet connection is required.

### 🔒 Privacy

Your prompts stay on your machine.

ShadowQuill includes:

* No telemetry
* No cloud storage
* No accounts
* No background data collection

### ⚡ Built for Prompt Engineering

ShadowQuill isn't a chatbot.

It's a workspace designed specifically for writing, refining, versioning, and organizing prompts so they're easier to improve and reuse over time.

---

## Frequently Asked Questions

### Does ShadowQuill require an internet connection?

Only for the initial installation of Ollama and your language models. After that, everything works locally.

### Does ShadowQuill send my prompts anywhere?

No. ShadowQuill communicates only with your local Ollama instance.

### Can I use models other than Gemma?

Any Ollama-compatible model may work, although ShadowQuill is primarily designed and tested with Google's Gemma models.

### Where are my prompts stored?

Projects, presets, configuration, and application data are stored locally on your computer.

---

## Roadmap

Planned improvements include:

* Additional local model support
* More built-in presets
* Prompt collections and organization
* Improved import/export
* Workflow enhancements
* Quality-of-life improvements

---

## Contributing

Contributions are welcome.

Before opening a large pull request, please create an issue to discuss the proposed change.

When contributing:

* Keep pull requests focused.
* Follow the existing code style.
* Preserve the local-first architecture unless your change specifically targets it.
* Update documentation when adding user-facing features.

---

## License

This project is licensed under the **MIT License**.
