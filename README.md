# Rationale Log

**Rationale Log** is a lightweight Figma plugin for capturing *why* a design decision was made — at the moment it happens — and keeping that context tied directly to the work.

Think of it as **commit messages for design**.

Design decisions often get revisited weeks later, after context has faded and stakeholders have changed. Rationale Log helps preserve intent by recording reasoning, tradeoffs, and alternatives you consciously didn't pursue, so decisions don't have to be reconstructed or re-defended from memory.

---

## Philosophy

This tool is intentionally:

- **Designer-first** — optimized for speed and honesty, not presentation
- **Low ceremony** — short, structured entries instead of long docs
- **Calm** — no dashboards, metrics, or performative outputs
- **Local to the work** — rationales attach directly to frames

### What it's not

- Not a design doc generator
- Not a stakeholder reporting tool
- Not a best-practices system
- Not another place to manage work

Rationale Log exists to support **clear thinking and future you**, first.

---

## Features

### Frame-level rationales

Attach short "design commits" to any frame, including:

- The **decision** made
- **Why** that approach was chosen
- The **tradeoff** that was accepted
- Options that were deliberately **skipped**
- A **confidence level** (low, medium, high)

Rationales are added and reviewed by selecting a frame.

### Project-level context (Problem Frame)

Create a single **Problem Frame** on the canvas that captures:

- The problem being solved
- Why it matters now
- The primary metric or risk
- Explicit non-goals

The plugin creates this frame once. After that, it's edited directly in Figma like any other artifact. The plugin never overwrites it automatically.

### Keyboard shortcut

**Cmd+Shift+R** (Mac) / **Ctrl+Shift+R** (Windows) — quickly open the Add Rationale form without breaking flow.

### Visual indicators

Frames with rationales display a small indicator glyph. Toggle visibility or remove all indicators before handoff.

---

## Why it exists

Most design thrash isn't caused by bad ideas — it's caused by **lost context**.

This plugin helps preserve intent so decisions:

- Don't get watered down over time
- Don't have to be re-litigated endlessly
- Can be understood as tradeoffs, not accidents

If you've ever thought *"I know why this is right, but I can't remember how we got here"*, this tool is for that moment.

---

## Install locally

Rationale Log is intended to be run locally for development or personal use.

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- npm (comes with Node.js)
- [Figma Desktop](https://www.figma.com/downloads/) app

### 1. Clone the repository

```bash
git clone https://github.com/your-username/rationale-log.git
cd rationale-log
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the plugin

```bash
npm run build
```

This generates `code.js` (main thread) and inlines `ui.js` into `ui.html`.

For development with auto-rebuild on changes:

```bash
npm run watch
```

### 4. Add the plugin to Figma

1. Open **Figma Desktop**
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Select the `manifest.json` file from this project
4. The plugin will appear under **Plugins → Development → Rationale Log**

### 5. Run the plugin

- Open any Figma file
- Go to **Plugins → Development → Rationale Log**
- The plugin UI will open in a panel

---

## Usage

### Adding a rationale

1. **Select one or more frames** in your Figma file
2. Click **"Add rationale"** (or press **Cmd+Shift+R**)
3. Fill in the fields:
   - **Decision** — What decision was made
   - **Why** — Why this decision was made
   - **Tradeoff accepted** — What tradeoff was accepted
   - **Confidence** — Low, Medium, or High
   - **Skipped options** — Alternatives you didn't pursue (optional)
4. Click **"Save rationale"**

### Viewing rationales

- Select a frame that has rationales
- The count will appear in the selection summary
- Click **"View"** to see all rationales for that frame
- Click a rationale card to expand details

### Creating a Problem Frame

1. Deselect everything (click on empty canvas)
2. The **Project Context** section appears
3. Fill in the problem, why now, metric/risk, and non-goals
4. Click **"Create Problem Frame"**

A styled frame will be created on your canvas. Edit it directly in Figma anytime.

### Selecting the Problem Frame

When no frames are selected and a Problem Frame exists, click **"Select Problem Frame"** to jump to it.

---

## Project structure

```
rationale-log/
├── manifest.json      # Figma plugin manifest
├── package.json       # npm dependencies and scripts
├── build.js           # esbuild script (inlines UI into main)
├── code.ts            # Main thread (Figma API access)
├── ui.ts              # UI thread (iframe, DOM)
├── ui.html            # UI HTML template
├── code.js            # Compiled main (generated)
├── ui.js              # Compiled UI (generated)
└── tsconfig.json      # TypeScript config
```

### Architecture

| Thread | File | Runs in | Access |
|--------|------|---------|--------|
| Main | `code.ts` → `code.js` | Figma sandbox | Figma API, plugin data |
| UI | `ui.ts` → `ui.js`, `ui.html` | iframe | DOM, user interaction |

Communication happens via `postMessage` between threads.

### Build process

The custom `build.js` script:
1. Compiles `ui.ts` → `ui.js`
2. Inlines the JS into `ui.html`
3. Replaces `__html__` placeholder in `code.ts` with the complete HTML
4. Compiles the combined `code.ts` → `code.js`

---

## Data storage

- **Rationales** are stored at the file level using `figma.root.setPluginData("rationales", ...)`
- **Problem Frame** reference is stored as `problemFrameNodeId` in plugin data
- Data persists with the Figma file
- Removing the plugin does not delete existing frames or stored data

---

## License

MIT

---

## Contributing

Issues and pull requests welcome. Keep changes minimal and focused.
