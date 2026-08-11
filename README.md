# AI Codebase Mapper

**AI-powered interactive architecture map for VS Code.**

Open any project, run one command, and get a structured, AI-generated map of folders, modules, dependencies, entry points, and architectural relationships — rendered as an interactive graph.

Helps developers quickly understand unfamiliar codebases.

---

## Features

- **Workspace scanning** with sensible ignore rules (`node_modules`, `.git`, `dist`, `.env`, lockfiles, etc.)
- **Import/export analysis** for TypeScript, JavaScript
- **Dependency graph** (internal + external packages)
- **Circular dependency detection**
- **AI architecture analysis** (OpenAI-compatible API)
- **Interactive React Flow graph** (zoom, pan, click-to-open)
- **File tree** view with open-in-editor
- **Explain current file** with AI
- **Ask AI about the project** (context-aware chat)
- **Secure API key storage** via VS Code SecretStorage
- **Configurable**: exclude patterns, max file size, send source code or metadata-only
- **Status bar** indicator
- **Graceful fallback** when AI is unavailable

---

## Screenshots

> Placeholders — run the extension and capture your own graphs.

- Architecture graph (React Flow)
- File tree panel
- AI summary panel
- Dependency list

---

## Installation

### From source (development)

```bash
git clone <repo>
cd ai-codebase-mapper
npm install
cd webview && npm install && cd ..
npm run compile
```

Then press **F5** in VS Code to launch the Extension Development Host.

### Package as VSIX

```bash
npm run package
# installs via: code --install-extension ai-codebase-mapper-0.1.0.vsix
```

---

## Quick start

1. Open a project folder in VS Code.
2. Command Palette → **AI Codebase Mapper: Analyze Project**.
3. When prompted, enter an OpenAI (or compatible) API key (stored securely).
4. Wait for the scan + AI analysis.
5. Explore the **Architecture**, **Dependencies**, **Files**, and **AI Summary** tabs.
6. Click any file node to open it in the editor.

---

## Commands

| Command | Description |
|---------|-------------|
| AI Codebase Mapper: Analyze Project | Full scan + AI architecture map |
| AI Codebase Mapper: Open Architecture Map | Open the webview |
| AI Codebase Mapper: Refresh Analysis | Re-scan and re-analyze |
| AI Codebase Mapper: Explain Current File | AI explanation of the active file |
| AI Codebase Mapper: Show Dependencies | Outgoing imports for current file |
| AI Codebase Mapper: Show Dependents | Who imports the current file |
| AI Codebase Mapper: Ask AI About Project | Free-form question about the codebase |
| AI Codebase Mapper: Clear Project Cache | Drop in-memory cache |

Context menu actions are available on files in the explorer and editor.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `aiCodebaseMapper.provider` | `openai` | Provider id |
| `aiCodebaseMapper.model` | `gpt-4o-mini` | Model name |
| `aiCodebaseMapper.apiBaseUrl` | `https://api.openai.com/v1` | Compatible endpoint base URL |
| `aiCodebaseMapper.sendSourceCode` | `true` | Send code previews to AI (false = metadata only) |
| `aiCodebaseMapper.maxFileSize` | `100000` | Max bytes per file |
| `aiCodebaseMapper.excludePatterns` | `[]` | Extra ignore globs |
| `aiCodebaseMapper.autoAnalyze` | `false` | Analyze on workspace open |
| `aiCodebaseMapper.maxFilesForAI` | `150` | Cap files sent to the model |

API keys are **never** stored in settings. They are kept in VS Code Secret Storage.

---

## Privacy & security

- `.env` and other secret-like files are **never** scanned or sent.
- Content is redacted for common secret patterns before explain/chat.
- You control whether source code previews are sent (`sendSourceCode`).
- Only metadata + dependency edges are required for a useful local map.
- The extension does not phone home; the only network calls are to the AI endpoint you configure.

---

## Architecture (extension)

```
src/
  extension.ts          # Activation, commands, status bar
  scanner/              # Workspace walk, ignore rules, file metadata
  analyzer/             # Imports, dependency graph, project orchestration
  ai/                   # Provider abstraction, prompts, response parsing
  models/               # Typed domain models
  webview/              # Panel host + message bridge
  utils/                # Logger, cache, security helpers
webview/                # React + React Flow UI (Vite)
```

**Flow**

1. User runs **Analyze Project**.
2. Scanner walks the workspace (respecting ignore rules).
3. Import analyzer extracts relationships per language.
4. Dependency graph + cycle detection run locally.
5. Structured metadata (and optional previews) go to the AI provider.
6. Response is validated against a strict schema.
7. Webview receives a snapshot and renders graph / tree / summary.

If the AI call fails, a local fallback architecture is still shown.

---

## AI provider setup

1. Get an API key from OpenAI or any OpenAI-compatible provider (Azure OpenAI, local gateways, etc.).
2. Optionally set `aiCodebaseMapper.apiBaseUrl` and `aiCodebaseMapper.model`.
3. On first analysis, paste the key when prompted — it is stored via `context.secrets`.

To rotate the key: Command Palette is not required; clear via Secret Storage or re-enter on next prompt after clearing cache / reinstalling.

---

## Development

```bash
npm install
cd webview && npm install && cd ..
npm run compile        # tsc + webview build
npm run watch          # tsc -watch (rebuild webview separately if needed)
npm test               # vitest
```

Press **F5** to open the Extension Development Host.

---

## Testing

```bash
npm test
```

Coverage includes:

- Ignore rules
- Import/export extraction (TS/JS, Python, Java)
- Dependency resolution & cycle detection
- AI JSON response parsing

---

## Roadmap

- Persistent workspace-state cache and incremental re-index
- Tree-sitter based parsers for higher accuracy
- Mermaid export
- Multi-root workspace support
- Additional AI providers (Anthropic, local models)
- Richer chat panel inside the webview
- Architecture “health” score and refactor suggestions

---

## Contributing

Issues and PRs are welcome. Keep modules small, prefer explicit types, and avoid sending secrets.

---

## License

MIT
