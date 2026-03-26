# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Herd for Windows is an Electron application that provides a Laravel development environment for Windows. It manages PHP versions, web servers, databases, and other development services through a Vue.js GUI interface.

## Essential Commands

### Development
```bash
npm run dev          # Start development server with hot reload
npm start           # Preview the built application
```

### Build
```bash
npm run build       # Build the application
npm run build:win   # Build and package for Windows distribution
```

### Code Quality
```bash
npm run lint        # Run ESLint with auto-fix
npm run format      # Format code with Prettier
npm run typecheck   # Run TypeScript type checking
```

## Architecture Overview

### Process Architecture
- **Main Process** (`src/main/`): System operations, service management, window creation
- **Renderer Process** (`src/renderer/`): Vue.js UI components
- **Preload Script** (`src/preload/`): Secure bridge between processes

### Key Components

1. **Service Management**
   - Base class: `src/main/Services/Service.ts`
   - Services extend this base class (Nginx, MySQL, PostgreSQL, etc.)
   - Managed through `ServicesManager.shared` singleton

2. **IPC Communication**
   - All handlers defined in `src/main/api.ts`
   - Organized by namespaces: `valet.*`, `herd.*`, `services.*`
   - Renderer accesses via `window.api` exposed in preload

3. **Window Management**
   - Base class: `src/main/windows/HerdWindow.ts`
   - Each window type extends this (SettingsWindow, SiteWizardWindow, etc.)
   - Multi-window architecture with separate entry points

4. **API Server**
   - Express server on port 9001 in `src/main/Api/Server.ts`
   - Provides REST endpoints for external integration

### Important Patterns

1. **Singleton Pattern**: Used for managers (ServicesManager, LicenseManager)
2. **Store Pattern**: Electron-store for persistent configuration
3. **Worker Threads**: Heavy operations use dedicated workers in `src/main/Workers/`
4. **Event-Driven**: Service status updates via EventEmitter

### Directory Structure
```
src/
├── main/           # Electron main process
│   ├── Api/        # HTTP API server
│   ├── Services/   # Service implementations
│   ├── Herd/       # Core functionality
│   └── Workers/    # Background workers
├── renderer/       # Vue.js frontend
│   └── src/        # Vue components
└── preload/        # IPC bridge

resources/
├── valet/          # PHP Valet implementation
├── config/         # Service configurations
└── bin/            # Binary executables
```

## Development Notes

- Terminal must run as administrator for development
- HerdHelper Windows service must be manually installed for admin tasks
- Use Node.js 21+ with `npm install --force` due to dependency requirements
- All renderer-main communication must go through preload script for security

## Adding New Features

### New Service
1. Extend `Service` or `ExtraService` class
2. Implement start/stop/status methods
3. Register in `ServicesManager`
4. Add IPC handlers in `api.ts`
5. Create UI components if needed

### New IPC Handler
1. Add handler in `src/main/api.ts` following namespace pattern
2. Add type definition in `src/preload/index.d.ts`
3. Use from renderer via `window.api.namespace.method()`

### New Window
1. Extend `HerdWindow` class
2. Add HTML entry point in `src/renderer/`
3. Update `electron.vite.config.ts` with new entry
4. Create Vue app initialization in renderer