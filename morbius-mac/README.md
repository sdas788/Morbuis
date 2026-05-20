# Morbius Mac

Chat-first agentic QA Mac app — implementation of the design from `requirements/brief.md` v2.0.

## Run

```
cd morbius-mac
npm install
npm start
```

## Architecture (delivered)

- **Electron** native shell. `hiddenInset` title bar gives the real macOS traffic-light look while the design's custom title bar fills the remainder.
- **Main process** (`src/main/main.js`) — window, menus, IPC routing.
- **Tool surface** (`src/main/tools.js`) — every host-touching capability behind a permission chokepoint:
  - E-003 `listDevices`, `runMaestroFlow`, `captureScreenshot`, `tailLog`
  - FS `readFile`, `writeFile`, `editFile`
  - E-002 `commitToGithub`, `pullFromGithub`, `readTestCase`, `writeTestCase`, `uploadScreenshot`
  - E-004 `runProbe`, `checkEnvironment` — real probes for xcrun, adb, jdk, maestro, node, anthropic-key, github-pat
  - E-005 `readPMAgentSpec`, `pullFromPMAgent`, `publishToPMAgent`
  - `classify`, `fileBug`, `runShellCommand` (always permission-gated)
- **Agent runtime** (`src/main/agent.js`) — E-009/13/14/15. Mocked deterministic scripts for `/smoke /repro /heal /explore /coverage-gap` so the app runs without an Anthropic key (per user direction to skip ENV). Replace the script generators with real `@anthropic-ai/sdk` calls when a key is configured.
- **Permission UX** (`src/main/tools.js` + renderer `app.js`) — E-011. Inline prompts in chat with 4-button ladder. `permissions.json` persists always-rules. Modes: default / acceptEdits / plan / bypassPermissions.
- **Activity rail** (renderer) — E-012. Real-time stream + per-project `agent-activity.jsonl`.
- **Native menus** — E-001. Full menu bar matching design.md: File / Edit / View (Cmd+1…Cmd+6, Cmd+Shift+D Doctor, Cmd+Shift+P Permissions, Cmd+Shift+M MCP) / Run (Cmd+. kill switch + Cmd+Esc).
- **Kill switch** — E-015. `Cmd+.` halts all active agent loops; surfaced both in menu and as a global hotkey.
- **First-launch friendly** — seeds default project, skills directory, memory index on first boot.

## Distribution

`npm run dist` produces a signed `.dmg` via `electron-builder` using `assets/entitlements.mac.plist` (hardened-runtime, Apple-events, network-client, JIT, user-selected files). Signing requires a Developer ID cert — left as ENV-side configuration per user direction.

## What's mocked (no cloud / no ENV)

- The agent loop runs deterministic scripts instead of calling the Anthropic API.
- `commitToGithub`, `uploadScreenshot`, `publishToPMAgent` return success without touching the network.
- If a `maestro` binary is missing, `runMaestroFlow` returns a synthetic pass so flows surface in the UI.
- Devices list always falls back to a small mock pair if no real iOS sims / Android emulators are booted.

Configure real backends by setting `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, and dropping a Supabase config into `~/.morbius/`. Probes in the Doctor view will start passing those rows.

## Epic coverage

| Epic | Status |
|------|--------|
| E-001 Mac shell + chat-first dashboard | ✅ |
| E-002 Hybrid sync (local-only mode)    | ✅ stubbed |
| E-003 Local devices + Maestro          | ✅ real iOS + Android probes |
| E-004 Environment Doctor               | ✅ real probes for 7 deps |
| E-005 PMAgent integration              | ✅ stubbed (reads sibling `~/PMAgent` if present) |
| E-006 Distribution + signing           | ✅ electron-builder config + entitlements (signing cert ENV-side) |
| E-009 Embedded Agent Runtime           | ✅ mocked loop (Anthropic SDK drop-in ready) |
| E-010 Agent Tool Surface               | ✅ |
| E-011 Permission & Consent UX          | ✅ inline + persisted rules + 4 modes |
| E-012 Agent Activity Stream            | ✅ live + JSONL persistence |
| E-013 Conversation + Memory + Skills   | ✅ JSONL convos, MEMORY.md, 5 built-in skills |
| E-014 Agent-Driven QA Loops            | ✅ /smoke /repro /heal /explore /coverage-gap |
| E-015 Agent Safety + Kill Switch       | ✅ Cmd+. global, loop budgets, deny-by-default |
