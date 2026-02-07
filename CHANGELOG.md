## [0.9.4](https://github.com/shadowquillapp/shadowquillapp/compare/v0.9.3...v0.9.4) (2026-02-07)


### Bug Fixes

* security updates ([6218db8](https://github.com/shadowquillapp/shadowquillapp/commit/6218db8f62f95d21fc2c21ba464b7d808aa2a0bb))

# ShadowQuill - Complete Changelog

> **Initial Release v0.9.3** - December 20, 2025

## Project Overview

**ShadowQuill** is a powerful, privacy-focused desktop application for crafting and refining prompts with local AI models. Built with Electron, Next.js, and React, this application provides a sophisticated workbench for prompt engineering, featuring version control, preset management, and real-time AI interaction through Ollama.

### Statistics
- **Total Commits**: 531
- **Files Changed**: 183 files, 53,431+ insertions
- **Contributors**: 5 (Sammy Hamwi, sammyhamwi, semantic-release-bot, dependabot[bot], Megha Chaudhary)
- **License**: MIT
- **Repository**: https://github.com/shadowquillapp/shadowquillapp

---

## Version 0.9.3 - Current Release (2025-12-19)

### What's New
- Fixed scroll lock bug in workbench right panel for improved UI responsiveness

---

## Complete Feature Set

### Core Features

#### Prompt Workbench
- **Multi-tab Interface**: Work on multiple prompts simultaneously with tab isolation
- **Version Control System**: Complete version history with timeline visualization
- **Version Navigation**: Navigate through prompt iterations with dropdown selection
- **Live Preview**: Real-time preview of generated prompts
- **Text Statistics**: Word and character count tracking for each version
- **Refinement Context Panel**: Iterative prompt refinement with context awareness
- **Copy to Clipboard**: One-click copying of generated messages

#### Preset Management
- **Preset Studio**: Comprehensive editor for creating and managing prompt presets
- **Preset Library**: Browse and organize custom and default presets
- **Recent Presets Tracking**: Quick access to frequently used presets
- **10 Default Presets**: Pre-configured presets for common use cases:
  - Writing prompts
  - Coding assistance
  - Research queries
  - Marketing content
  - Image generation
  - Video scripting
  - And more...
- **Preset Card System**: Visual preset organization
- **Bulk Operations**: Import/export and manage multiple presets
- **Temperature Control**: Fine-tune AI creativity with visual temperature slider
- **Advanced Settings**: Detailed configuration for each preset type
- **Type-Specific Fields**: Customized fields for different prompt types
- **Save As Dialog**: Clone and modify existing presets

#### AI Integration
- **Ollama Integration**: Full support for local Ollama models
- **Model Configuration**: Easy model selection and management
- **Model Selector**: Switch between available Ollama models
- **Connection Monitoring**: Real-time Ollama connection status
- **Temperature Parameter Support**: Control AI response randomness
- **Streaming Responses**: Real-time AI output streaming
- **Stop Generation**: Cancel ongoing AI requests
- **Model Client**: Robust client for Ollama API interaction

#### Data Management
- **Electron Storage System**: Persistent local storage with IPC handlers
- **Project Manager**: Organize and manage prompt projects
- **Local Database**: SQLite-based local data storage
- **Local Configuration**: User preferences and settings management
- **Factory Reset**: Complete app reset with data preservation option
- **Data Export/Import**: Backup and restore functionality
- **Cache System**: Efficient caching for improved performance

#### User Interface & Themes
- **Material Design System**: Modern, cohesive UI components
- **4 Beautiful Themes**:
  - Dark (default)
  - Light
  - Earth
  - Purple Dark
- **Theme-Aware Components**: All UI elements follow selected theme
- **Custom Titlebar**: Native-like titlebar with theme integration
- **Tabination Color Theme**: Dynamic tab colors matching user theme
- **Smooth Animations**: Polished transitions throughout the app
- **Animated Tab Transitions**: Seamless tab switching
- **Responsive Design**: Adaptive layouts for different window sizes
- **Global Zoom Control**: Zoom range 80-150% with keyboard shortcuts
- **Syntax Highlighting**: JSON and Markdown code highlighting
- **Custom Scrollbars**: Themed scrollbar styling

#### Advanced Features
- **Find & Replace**: Global search functionality with keyboard shortcut (Ctrl+F)
- **Find Highlighting**: Visual highlighting of search results
- **Panel Resize**: Adjustable panel sizes for custom layouts
- **Keyboard Shortcuts**: Comprehensive shortcut system:
  - `Ctrl/Cmd + F`: Find
  - `Ctrl/Cmd + +`: Zoom in
  - `Ctrl/Cmd + -`: Zoom out
  - `Ctrl/Cmd + 0`: Reset zoom
  - `Ctrl/Cmd + Wheel`: Scroll zoom
- **Input Auto-resize**: Chat input dynamically adjusts height
- **Message Renderer**: Advanced markdown and code rendering
- **Dialog Provider System**: Global dialog management
- **Toast Notifications**: Non-intrusive user feedback
- **Loading States**: Feather loader animation
- **Error Handling**: Comprehensive error system with user-friendly messages

#### Settings & Configuration
- **Settings Dialog**: Comprehensive settings interface with tabs:
  - Display Settings
  - Ollama Setup
  - System Prompt Editor
  - Local Data Management
  - App Version Info
- **Display Settings**:
  - Theme selection
  - Zoom level control
  - UI preferences
- **Ollama Setup Content**: Configure Ollama connection and models
- **System Prompt Editor**: Read-only view of system prompts
- **Version History Modal**: View app version changelog
- **Update Checker**: Automatic update notifications
- **Hardware Specs Display**: System information in titlebar

#### Security & Privacy
- **Local-Only Operation**: All data stored locally, no cloud services
- **Privacy-First Design**: No telemetry, tracking, or data collection
- **Secure IPC**: Electron security best practices
- **Content Security Policy**: Hardened security configuration

---

## Version History

### [0.9.2](https://github.com/shadowquillapp/shadowquillapp/compare/v0.9.1...v0.9.2) (2025-12-17)
- Fixed sidebar alignment with titlebar
- Major UI upgrade with improved styling

### [0.9.1](https://github.com/shadowquillapp/shadowquillapp/compare/v0.9.0...v0.9.1) (2025-12-16)
- Fixed preset defaults

### [0.9.0](https://github.com/shadowquillapp/shadowquillapp/compare/v0.8.0...v0.9.0) (2025-12-16)
- **Features**:
  - Check for updates functionality
  - New default presets
- **Improvements**:
  - Daily helper as default tab
  - Simplified display settings
  - Improved zoom shortcuts (Ctrl+ and Ctrl+scroll)
  - Removed unnecessary tips from settings
  - Package audits and security updates

### [0.8.0](https://github.com/shadowquillapp/shadowquillapp/compare/v0.7.2...v0.8.0) (2025-12-12)
- **Features**:
  - Version switching dropdown
- **Fixes**:
  - Preset prompt generation corrections
  - Removed redundant version history modal
- **Refactoring**:
  - PromptWorkbench.tsx restructured into modular files
- **Styling**:
  - Updated default theme
  - Increased refinement interface font size

### [0.7.2](https://github.com/shadowquillapp/shadowquillapp/compare/v0.7.1...v0.7.2) (2025-12-10)
- Security: Fixed Dependabot vulnerability (tmp package 0.2.3 → 0.2.4)

### [0.7.1](https://github.com/shadowquillapp/shadowquillapp/compare/v0.7.0...v0.7.1) (2025-12-10)
- Fixed tab isolation bug
- Corrected theme colors for light theme

### [0.7.0](https://github.com/shadowquillapp/shadowquillapp/compare/v0.6.0...v0.7.0) (2025-12-10)
- **Features**:
  - Overall UI improvements to workbench
  - Better theme coloring system
- **Fixes**:
  - Electron builder postinstall script bug
  - PNPM package manager deprecation issues
  - Preset Studio selection persistence
- **Build**:
  - Package updates
  - Biome linting improvements

### [0.6.0](https://github.com/shadowquillapp/shadowquillapp/compare/v0.5.0...v0.6.0) (2025-12-07)
- **Features**:
  - Implemented Electron storage system with IPC handlers
  - Improved storage persistence and shutdown handling
  - Migrated from localStorage to Electron storage
- **Testing**:
  - Updated tests for new storage system
- **Fixes**:
  - Improved default theme contrast

### [0.5.0](https://github.com/shadowquillapp/shadowquillapp/compare/v0.4.4...v0.5.0) (2025-12-04)
- **Features**:
  - Stable macOS .dmg installer for distribution
  - Automated version updating in package.json and version.ts
- **Fixes**:
  - Workflow versioning pipeline

### [0.4.4](https://github.com/shadowquillapp/shadowquillapp/compare/v0.4.3...v0.4.4) (2025-12-04)
- Fixed caching error output

### [0.4.3](https://github.com/shadowquillapp/shadowquillapp/compare/v0.4.2...v0.4.3) (2025-12-04)
- Fixed version selection in CI workflow
- Fixed default theme selection on startup and factory reset

### [0.4.2](https://github.com/shadowquillapp/shadowquillapp/compare/v0.4.1...v0.4.2) (2025-12-04)
- Refactored package manager from npm to pnpm
- NPM audit fixes

### [0.4.1](https://github.com/shadowquillapp/shadowquillapp/compare/v0.4.0...v0.4.1) (2025-12-04)
- Deprecated npm package publishing

### [0.4.0](https://github.com/shadowquillapp/shadowquillapp/compare/v0.3.2...v0.4.0) (2025-12-04)
- **Features**:
  - App version interface in settings dialog
  - System prompt editor converted to read-only view
- **Fixes**:
  - Factory reset flag handling with env vars
  - Next.js server startup error handling
- **Refactoring**:
  - Organized electron .cjs file structure
  - IPC handler registration to prevent duplicates
- **Testing**:
  - Updated tests for read-only system prompt component

### [0.3.2](https://github.com/shadowquillapp/shadowquillapp/compare/v0.3.1...v0.3.2) (2025-12-03)
- NPM package security audit

### [0.3.1](https://github.com/shadowquillapp/shadowquillapp/compare/v0.3.0...v0.3.1) (2025-12-02)
- Improved preset studio temperature control

### [0.3.0](https://github.com/shadowquillapp/shadowquillapp/compare/v0.2.2...v0.3.0) (2025-12-02)
- **Features**:
  - Tab colors follow selected theme

### [0.2.2](https://github.com/shadowquillapp/shadowquillapp/compare/v0.2.1...v0.2.2) (2025-12-02)
- Added postinstall script

### [0.2.1](https://github.com/shadowquillapp/shadowquillapp/compare/v0.2.0...v0.2.1) (2025-12-02)
- Fixed dependency packages for production builds

### [0.2.0](https://github.com/shadowquillapp/shadowquillapp/compare/v0.1.0...v0.2.0) (2025-12-02)
- **Features**:
  - CI/CD workflow with GitHub Actions
  - Updated app name for npm publishing
- **Fixes**:
  - CI workflow corrections
  - Added missing packages

---

## 🏗️ Technical Architecture

### Technology Stack
- **Frontend**: React, Next.js, TailwindCSS
- **Desktop**: Electron
- **Build Tools**: 
  - TypeScript
  - Biome (linting & formatting)
  - Vitest (testing)
  - electron-builder (packaging)
- **Package Manager**: pnpm
- **AI Integration**: Ollama (local models)

### Project Structure
```
shadowquillapp/
├── electron/                       # Electron main process
│   ├── ipc/                        # IPC handlers
│   └── utils/                      # Utilities (menu, window, etc.)
├── src/
│   ├── app/                        # Next.js app directory
│   │   ├── studio/                 # Preset Studio
│   │   └── workbench/              # Prompt Workbench
│   ├── components/                 # Shared React components
│   ├── lib/                        # Core libraries
│   │   ├── prompt-directives/      # Prompt type definitions
│   │   └── [various libs]          # Storage, cache, etc.
│   ├── styles/                     # CSS modules
│   └── types/                      # TypeScript definitions
├── config/                         # Configuration files
├── public/                         # Static assets
└── scripts/                        # Build scripts
```

### Testing
- **Test Coverage**: 800+ test cases across:
  - Component tests (React Testing Library)
  - Integration tests
  - Unit tests for core libraries
  - Coverage reporting with Vitest
- **Test Files**: 
  - Component tests for all major UI elements
  - Integration tests for preset and prompt workflows
  - Unit tests for storage, caching, and prompt generation

---

## Evolution: From PromptCrafter to ShadowQuill

### Historical Journey
This application evolved from **PromptCrafter**, undergoing significant architectural changes:

#### Version 1.0 Era (PromptCrafter)
- Initial concept as a web-based prompt crafting tool
- Server-based architecture with database storage
- Early RAG (Retrieval-Augmented Generation) implementation
- Multiple AI provider support (OpenRouter, Ollama)

#### Version 2.0 Transformation
- Complete rewrite focusing on local-only operation
- Removal of all server dependencies
- Simplified to Ollama-only integration
- Material Design system implementation
- Enhanced privacy and security focus

#### Current Era (ShadowQuill v0.9.x)
- Rebranded to ShadowQuill
- Polished Electron desktop application
- Comprehensive preset system
- Advanced version control for prompts
- Production-ready installers for macOS and Windows
- Extensive test coverage
- Modern UI with multiple themes

---

## Migration & Modernization

### Key Architectural Changes
1. **Storage**: Server database → Local Electron storage
2. **AI Providers**: Multiple providers → Ollama-focused
3. **Authentication**: Removed (local-only app)
4. **Data Flow**: tRPC API → Direct Electron IPC
5. **Deployment**: Web server → Desktop installers
6. **Package Manager**: npm → pnpm
7. **Code Quality**: Manual linting → Automated Biome
8. **Testing**: Limited → Comprehensive Vitest suite

### Security Enhancements
- Implemented content security policy
- Hardened runtime on macOS
- Removed all external data transmission
- Secure IPC communication patterns
- Factory reset with data preservation options

---

## Distribution

### Available Installers
- **macOS**: .dmg installer (Apple Silicon ARM64)
  - Code-signed builds available
  - Hardened runtime enabled
  - Gatekeeper compatible
- **Windows**: NSIS installer (x64)
  - User-selectable installation directory
  - Non-one-click installer for transparency

### Build System
- Automated CI/CD with GitHub Actions
- Semantic versioning with conventional commits
- Automated changelog generation
- Cross-platform builds
- Asset optimization and bundling

---

## Acknowledgments

### Contributors
- **Sammy Hamwi** - Lead Developer (508 commits)
- **semantic-release-bot** - Automated releases (21 commits)
- **dependabot[bot]** - Security updates (2 commits)
- **Megha Chaudhary** - Contributions (1 commit)

### Dependencies
Special thanks to all open-source projects that made ShadowQuill possible:
- Next.js, React, Electron teams
- Ollama for local AI capabilities
- TailwindCSS for styling system
- Heroicons for icon library
- And many more...

---

## License

MIT License - See LICENSE file for details

---

## Links

- **Website**: https://shadowquill.org
- **Repository**: https://github.com/shadowquillapp/shadowquillapp
- **Issues**: https://github.com/shadowquillapp/shadowquillapp/issues
- **Discussions**: https://github.com/shadowquillapp/shadowquillapp/discussions

---

## What's Next

The journey continues with planned enhancements:
- Enhanced preset sharing capabilities
- Additional AI provider integrations
- Expanded prompt directive library
- Community preset marketplace
- Advanced analytics and insights
- Multi-language support

---

**Built with ❤️ for the AI community**

*Last Updated: December 20, 2025*
