# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm install        # Install dependencies
npm run build      # Build the plugin (generates code.js and ui.js)
npm run watch      # Watch mode for development
```

## Architecture

This is a Figma plugin with a split architecture:

### Main Thread (`code.ts` → `code.js`)
Runs in Figma's sandbox with access to the Figma API. Handles:
- Plugin data persistence via `figma.root.setPluginData()`
- Frame selection detection and filtering
- Visual indicators (emoji glyphs inside locked groups)
- Problem Frame creation and updates

### UI Thread (`ui.ts` → `ui.js`, `ui.html`)
Runs in an iframe with DOM access. Handles:
- Form state and validation
- View mode transitions (empty, selection, add-form, view-rationales)
- Rendering rationale cards and lists

### Build Process (`build.js`)
Custom esbuild script that:
1. Compiles `ui.ts` → `ui.js`
2. Inlines the JS into `ui.html`
3. Replaces `__html__` placeholder in `code.ts` with the complete HTML
4. Compiles the combined `code.ts` → `code.js`

The `__html__` template literal in `code.ts` is replaced at build time with the full UI.

### Communication Pattern
- UI → Main: `parent.postMessage({ pluginMessage: { type: "...", ... } }, "*")`
- Main → UI: `figma.ui.postMessage({ type: "...", ... })`

Message types include: `get-rationales`, `save-rationale`, `selection-changed`, `state`, `create-problem-frame`, `update-problem-frame`, etc.

## Data Model

Rationales are stored at the file level via `figma.root.setPluginData("rationales", ...)`:

```typescript
interface Rationale {
  id: string;
  timestamp: string;
  frameIds: string[];      // Can be attached to multiple frames
  decision: string;
  why: string;
  tradeoff: string;
  skipped: string[];
  confidence: "low" | "medium" | "high";
}
```

Problem Frame context is stored separately with keys: `problemFrameNodeId`, `problem`, `whyNow`, `metricOrRisk`, `nonGoals`.

## Key Patterns

- Visual indicators are created as locked groups named `_Rationale (plugin)` inside frames
- The `uiOpen` and `messageHandlerSetup` flags gate all UI communication to prevent errors when UI is closed
- Selection changes trigger state updates via `sendSelectionToUI()` and `sendStateToUI()`
