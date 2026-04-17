# Morbius Rules

The single source of truth for how Morbius operates. Read this before doing anything.

---

## What Is Morbius?

Morbius is a visual QA automation platform for mobile apps. It reads test cases from an Excel file, stores them as markdown, runs them via Maestro on real devices/simulators, and shows everything on a Kanban dashboard. Claude Code is the agent that operates it.

```
Excel → Markdown → Maestro YAML → Device → Dashboard
```

---

## The 5-Phase Workflow

Every QA engagement follows this exact sequence. Never skip a phase.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: ONBOARD    morbius-onboard                                │
│  Import Excel → create test files → create project config           │
│                                                                     │
│  PHASE 2: EXPLORE    morbius-preflight + morbius-app-map            │
│  Check devices → screenshot every screen → inspect view hierarchy  │
│  → build Mermaid app map → discover element IDs                     │
│                                                                     │
│  PHASE 3: WRITE      morbius-write-flows                            │
│  Write YAML flows (one per feature area) → TEST EACH IMMEDIATELY   │
│  via mcp__maestro__run_flow_files → never move on until it passes  │
│                                                                     │
│  PHASE 4: RUN        morbius-run-test + morbius-bug                 │
│  Run each flow → pass: update status → fail: screenshot + create bug│
│                                                                     │
│  PHASE 5: BOARD      morbius-board                                  │
│  node sync → node serve → dashboard at localhost:3000              │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 1 — Onboard

**Trigger:** New project, or Excel file updated.

```bash
cd /Users/sdas/Morbius
npm run build
node dist/index.js import "/path/to/QA Plan.xlsx"
```

What happens:
- Reads all sheets from Excel
- Creates `data/<project>/tests/<Category>.md` per test sheet
- Each test case gets frontmatter: `id`, `title`, `category`, `priority`, `status: not-run`
- Creates `data/<project>/config.json` with project metadata
- Registers project in `data/projects.json`

### Phase 2 — Explore

**Trigger:** Before writing any YAML flows.

Run `morbius-preflight` to verify:
1. `maestro --version` — CLI installed
2. `mcp__maestro__list_devices` — MCP running
3. `adb devices` — Android device connected
4. `xcrun simctl list devices booted` — iOS simulator running
5. App installed: `adb shell pm list packages | grep <appId>`

Run `morbius-app-map` to explore:
1. Launch app: `adb shell am start -n <appId>/.MainActivity`
2. Screenshot every screen: `mcp__maestro__take_screenshot`
3. Inspect view hierarchy: `mcp__maestro__inspect_view_hierarchy`
4. Tap every tab, menu, and button. Document what you find.
5. Generate Mermaid chart → save to `data/<project>/config.json` as `appMap`

**Output:** A complete navigation tree + element IDs for every screen.

### Phase 3 — Write Flows

**Trigger:** Exploration complete, element IDs known.

```
Rule: Write → Test → Fix → Next
Every flow MUST be tested via mcp__maestro__run_flow_files before moving on.
No exceptions.
```

**Flow naming convention:** `01_login.yaml`, `02_calculators_home.yaml`, etc.
**Shared helper:** `shared/login.yaml` — used by all flows 02 onward.

```yaml
# Standard flow header
appId: <bundle-id>
name: "NN Feature — Happy Path (platform)"
tags:
  - android  # or ios
  - feature
  - happy-path
  - flow
---
```

**React Native launch pattern (CRITICAL — Micro-Air + STS):**
```yaml
# WRONG — crashes React Native:
- launchApp:
    clearState: true

# CORRECT:
- stopApp
- clearState
- launchApp
```

**After writing each flow — run it:**
```
mcp__maestro__run_flow_files
  device_id: emulator-5554          # Android
  flow_files: ../STS/sts-testing/Andriod test/flows/01_login.yaml
```

> Path note: Maestro MCP prepends `/Users/sdas/Morbius` (CWD). Use `../` relative paths.

### Phase 4 — Run & Report

**Trigger:** All flows written and passing individually. Now do a full suite run.

On **PASS:**
```bash
# Update test status on board
curl -X POST http://localhost:3000/api/test/update \
  -H "Content-Type: application/json" \
  -d '{"id":"TC-X","status":"pass"}'
```

On **FAIL:**
```bash
# 1. Screenshot to capture failure state
mcp__maestro__take_screenshot

# 2. Inspect what's on screen
mcp__maestro__inspect_view_hierarchy

# 3. Create bug ticket
node dist/index.js create-bug \
  --test TC-X \
  --title "What failed" \
  --device android-phone \
  --priority P2 \
  --reason "Error message or description"

# 4. Update test status
curl -X POST http://localhost:3000/api/test/update \
  -d '{"id":"TC-X","status":"fail"}'
```

### Phase 5 — Board

```bash
node dist/index.js sync        # links YAML flows to test cases by QA Plan ID
node dist/index.js validate    # check for broken links, orphaned files
node dist/index.js serve       # dashboard at http://localhost:3000
```

Dashboard views:
- **Dashboard** — health %, category bars, bugs, flaky tests
- **Test Cases** — Kanban by category, filter by status
- **Bugs** — Kanban by status, create bugs, screenshots
- **Devices** — device × test matrix
- **Runs** — test run history
- **Maestro Tests** — live YAML flows from local folders

---

## Skills Reference

| Skill | When to use |
|-------|-------------|
| `morbius-preflight` | Before ANY device/test operation. Verifies Maestro, MCP, device, app |
| `morbius-onboard` | New project setup. Imports Excel, creates directories |
| `morbius-app-map` | Before writing flows. Screenshots every screen, builds Mermaid chart |
| `morbius-write-flows` | Write Maestro YAML + immediately test each via MCP |
| `morbius-run-test` | Execute a flow on a device. Handle pass/fail. Create bugs |
| `morbius-board` | Sync flows, validate data, serve dashboard |
| `morbius-bug` | Create/manage bug tickets after test failures |
| `morbius-jira` | Pull bug tickets from Jira into the board (pull-only, never push) |

### Skill Dependency Chain

```
morbius-preflight ──────────────────────────────────────────┐
                                                             │
morbius-onboard (Excel import) ──► data/<project>/tests/    │
                                                             ▼
morbius-app-map ──────────────────► appMap in config.json   │
                                                             │
morbius-write-flows ──────────────► YAML flows/*.yaml ◄─────┘
         │
         │ (inline test via mcp__maestro__run_flow_files)
         ▼
morbius-run-test ──────────────────► pass: board update
         │                            fail: morbius-bug ◄──► morbius-jira
         ▼
morbius-board ────────────────────► localhost:3000
```

---

## The Golden Rules

These are non-negotiable. They exist because we learned the hard way.

### 1. Write → Test → Fix → Next
After writing any YAML flow, immediately run it with `mcp__maestro__run_flow_files`. Do not write the next flow until the current one passes. No batch writing.

### 2. React Native launch (Micro-Air + STS)
Never `launchApp: clearState: true`. Always:
```yaml
- stopApp
- clearState
- launchApp
```

### 3. Webview selectors differ by platform
| Platform | Webview field selector |
|----------|----------------------|
| Android | HTML resource-id: `tapOn: id: "FormContentPlaceHolder_LoginEditForm_UserName"` |
| iOS | Accessibility label: `tapOn: "Username"` |

On iOS, `clearState` does NOT clear webview cookies. A cached OAuth session may auto-authenticate.

### 4. Feature areas, not test cases
One flow covers all actions in one screen area. Never create a separate flow per test case. The 14-flow structure (Micro-Air) and 12-flow structure (STS) are the reference.

### 5. Destructive flows are isolated
Flows that delete data (accounts, hubs, sensors) use `DESTROY_EMAIL`, never `TEST_EMAIL`. They run LAST.

### 6. eraseText on Android React Native
`eraseText` doesn't work on Android React Native EditText. Use adb keyevent workaround:
```yaml
- tapOn: "Field Label.*"
- runScript:
    script: |
      const { execSync } = require('child_process');
      execSync('adb shell input keyevent KEYCODE_MOVE_END');
      for (let i = 0; i < 30; i++) {
        execSync('adb shell input keyevent KEYCODE_DEL');
      }
- inputText: "new value"
```
On iOS, `eraseText` works natively.

### 7. OAuth redirects are slow
STS login via sts.org takes 30-60 seconds. Always use:
```yaml
- extendedWaitUntil:
    visible: "Calculators"
    timeout: 90000
```

### 8. Maestro MCP path format
MCP prepends CWD (`/Users/sdas/Morbius`) to all paths. Use relative paths:
```
../STS/sts-testing/Andriod test/flows/01_login.yaml
../Micro-Air/micro-air-testing/Andriod test/flows/01_login.yaml
```

---

## Project Registry

All projects live in `data/projects.json`. Active project is set via:
```bash
curl -X POST http://localhost:3000/api/projects/switch \
  -d '{"projectId":"sts"}'
```

| Project | App ID (Android) | App ID (iOS) | Status |
|---------|-----------------|--------------|--------|
| micro-air | `com.microair.connectrv` | `com.microair.connectrv.dev` | ✅ 14 Android + 15 iOS flows |
| sts | `com.sts.calculator` | `com.sts.calculator.dev` | ✅ 12 Android flows / 🔄 iOS in progress |
| shorr-intellistock | `com.shorr.intellistock.dev` | `com.shorr.intellistock.dev` | ⬜ Not started |

---

## File Structure

```
/Users/sdas/Morbius/
├── RULES.md                       ← THIS FILE
├── CLAUDE.md                      ← Claude Code project context
├── src/
│   ├── index.ts                   ← CLI commands (import, sync, validate, serve, create-bug, ingest)
│   ├── server.ts                  ← HTTP + WebSocket server (port 3000)
│   ├── types.ts                   ← TypeScript interfaces
│   └── parsers/
│       ├── excel.ts               ← Excel ↔ Markdown sync
│       ├── markdown.ts            ← Frontmatter read/write
│       └── maestro-yaml.ts        ← YAML → human-readable
├── data/
│   ├── projects.json              ← Project registry + active project
│   ├── micro-air/
│   │   ├── config.json            ← App ID, paths, env vars, appMap
│   │   ├── tests/                 ← Markdown test cases by category
│   │   ├── bugs/                  ← Bug markdown files
│   │   ├── runs/                  ← Test run logs
│   │   └── screenshots/           ← Bug screenshots
│   ├── sts/
│   │   └── (same structure)
│   └── shorr-intellistock/
│       └── (same structure)
└── .claude/
    ├── agents/morbius.md          ← Main agent instructions
    ├── skills/
    │   ├── morbius-preflight.md
    │   ├── morbius-onboard.md
    │   ├── morbius-app-map.md
    │   ├── morbius-write-flows.md
    │   ├── morbius-run-test.md
    │   ├── morbius-board.md
    │   ├── morbius-bug.md
    │   └── morbius-jira.md
    └── launch.json

/Users/sdas/STS/sts-testing/
├── Andriod test/
│   ├── flows/                     ← 12 Android YAML flows (01–12)
│   └── shared/login.yaml          ← Shared Android login helper
└── IOS app/
    ├── flows/                     ← 12 iOS YAML flows (01–12)
    ├── shared/login.yaml          ← Shared iOS login helper
    └── _archive/                  ← Old subdirectory structure (empty)

/Users/sdas/Micro-Air/micro-air-testing/
├── Andriod test/
│   ├── flows/                     ← 14 Android YAML flows
│   └── shared/login.yaml
└── IOS app/
    ├── flows/                     ← 15 iOS YAML flows
    └── shared/login.yaml
```

---

## Device Reference

| Device | ID | Platform | Use For |
|--------|----|----------|---------|
| Android Emulator | `emulator-5554` | Android | STS + Micro-Air Android |
| iPhone 17 Pro Simulator | `5B14D7C9-1F4F-480D-82CE-86687CB67749` | iOS | STS + Micro-Air iOS |

Get current devices: `mcp__maestro__list_devices`

---

## Environment Variables

### Micro-Air
```
TEST_EMAIL=f5qcb@dollicons.com
TEST_PASSWORD=Qwer1234!
DESTROY_EMAIL=shubdas223@gmail.com
DESTROY_PASSWORD=Test@123
OTP_EMAIL=shubdas223@gmail.com
CARD_NUMBER=4242424242424242
```

### STS
```
TEST_USERNAME=cthomas
TEST_PASSWORD=Test1234!
APP_ID_ANDROID=com.sts.calculator
APP_ID_IOS=com.sts.calculator.dev
```

---

## Common CLI Commands

```bash
# Start dashboard
node dist/index.js serve --port 3000

# Import Excel test cases
node dist/index.js import "/path/to/Plan.xlsx"

# Sync YAML flows to test cases
node dist/index.js sync

# Validate data integrity
node dist/index.js validate

# Create a bug ticket
node dist/index.js create-bug \
  --test TC-2.01 \
  --title "Login button unresponsive" \
  --device android-phone \
  --priority P2 \
  --reason "Tap on Sign In has no effect after valid credentials"

# Export back to Excel
node dist/index.js export "/path/to/output.xlsx"

# Ingest Maestro test results (batch)
node dist/index.js ingest /path/to/.maestro-output --device iphone

# Switch active project
curl -X POST http://localhost:3000/api/projects/switch \
  -H "Content-Type: application/json" \
  -d '{"projectId":"micro-air"}'
```
