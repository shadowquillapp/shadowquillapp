<div align="center">

# ShadowQuill

**A local-first prompt studio for crafting better prompts with local AI.**

Transform rough ideas into structured, reusable prompts without leaving your machine.

<p>

[![Stars](https://img.shields.io/github/stars/shadowquillapp/shadowquillapp)](https://github.com/shadowquillapp/shadowquillapp/stargazers)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</p>

</div>

---

## Why ShadowQuill?

Prompt engineering quickly becomes messy.

Ideas evolve. Prompts branch into multiple versions. Good prompts are hard to find again.

ShadowQuill provides a dedicated workspace for creating, refining, organizing, and reusing prompts—all while running entirely on your own computer.

No subscriptions. No cloud APIs. No accounts.

Just you and your local AI models.

---

## Features

|                           |                                                                       |
| :------------------------ | :-------------------------------------------------------------------- |
| 🖥️ **Fully Local**       | Uses Ollama and local Gemma models only.                              |
| 📑 **8 Prompt Tabs**      | Work on multiple prompts simultaneously.                              |
| 🧠 **7 Prompt Modes**     | Intent, Engineering, Visual, Motion, Analysis, Narrative, Persuasion. |
| 🎨 **Preset Studio**      | Create and manage reusable prompt presets.                            |
| 📚 **Version History**    | Step backwards and forwards through prompt revisions.                 |
| ⚡ **Model Discovery**     | Automatically detects compatible Ollama models.                       |
| 🔒 **Private by Default** | No telemetry, accounts, or cloud services.                            |

---

## Built-in Presets

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

---

## Quick Start

### Requirements

* Ollama installed
* At least one Gemma model downloaded

```bash
ollama pull gemma4:latest
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

Launch ShadowQuill:

```bash
pnpm start
```

---

## Keyboard Shortcuts

| Shortcut       | Action      |
| :------------- | :---------- |
| Ctrl / ⌘ + T   | New tab     |
| Ctrl / ⌘ + W   | Close tab   |
| Ctrl / ⌘ + 1–8 | Switch tabs |
| Ctrl / ⌘ + F   | Find        |

---

## Development

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run test
pnpm run typecheck
pnpm run check
```

---

## Technology

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

## Design Principles

### 🖥️ Local First

ShadowQuill works entirely on your machine after setup.

Your prompts stay where they belong.

### 🔒 Privacy

* No telemetry
* No cloud storage
* No accounts
* No background services

### ⚡ Built for Prompt Engineering

ShadowQuill isn't a chat client.

It's a workspace for experimenting, refining, organizing, and reusing prompts efficiently.

---

## Contributing

Contributions are welcome.

Before opening a large pull request, please open an issue to discuss the proposed change.

Please keep pull requests:

* Focused
* Well documented
* Consistent with the local-first philosophy

---

## License

MIT

