# Morbius

A visual QA workspace for teams using Maestro + Claude Code for mobile test automation.

Your QA team writes test cases in Excel. Claude Code + Maestro converts them to automated YAML tests. Morbius gives everyone — QA, devs, PMs — a browser-based Kanban board to see what's passing, failing, and needs attention. Edit status, create bugs, add notes, run tests, chat with the agent — all from the browser. No backend. No cloud. Just files.

---

## How It Works

```
Excel File ──→ morbius import ──→ Markdown Files ──→ morbius serve ──→ Browser Dashboard
                                       ↕                                      ↕
                                 morbius sync ←── Maestro YAML (live)   Edit status, create
                                       ↓                                bugs, run tests, chat
                                 morbius export ──→ Changes back to Excel
```

**Multi-project:** Switch between apps (Micro-Air, STS, etc.) from the sidebar. Each project has its own test cases, bugs, and Maestro flows.

---

## Quick Start

```bash
# 1. Install
cd Morbius
npm install
npm run build

# 2. Import your Excel test plan
node dist/index.js import "path/to/your/QA Plan.xlsx"

# 3. Link existing Maestro YAML flows
node dist/index.js sync

# 4. Start the dashboard
node dist/index.js serve
```

Open **http://localhost:3000** in your browser.

---

## Why 14 Flows, Not 150

Your Excel QA plan might have 150 test cases across 27 categories. Traditional QA automation would create one YAML file per test case — resulting in 50+ files that are hard to maintain, full of duplicate logic, and confusing for anyone who didn't write them.

We took a different approach: **one flow per feature area the user actually touches.**

### The problem with one-file-per-test-case

We started with 50 YAML files mirroring the Excel. Here's what happened:
- 6 files for hub management that all followed the exact same pattern (login → open hub menu → do one thing)
- 14 files for user management, most of them near-identical login variants
- 5 files for notification permission variants that differed only by one env variable
- 14 shared helper files, half of which were only used once

**50 files, and most of them were copy-paste with one line changed.**

### The solution: feature-area flows

We explored every screen of the actual app on a real emulator, documented the navigation tree, and asked: "What does the user actually do?" The app has 4 tabs and a few key user journeys. That maps to 14 flows.

| Flow | What the user does | Test cases covered |
|------|-------------------|-------------------|
| **01_login** | Opens app, signs in | TC-2.01 |
| **02_create_account** | Signs up, fills form, reaches MFA | TC-1.01 |
| **03_hub_dashboard** | Views hubs, filters, checks sensors | TC-12.01, 10.01 |
| **04_hub_actions** | Opens hub menu, renames hub (saves), checks alert settings | TC-17.01, 16.01 |
| **05_add_hub_and_sensor** | Full setup: pair hub via Bluetooth, connect WiFi, update firmware, customize, add sensor | TC-8.01, 9.01 |
| **05_sensor_actions** | Views sensor detail, renames sensor (saves), checks menu | TC-10.02, 14.01 |
| **06_notifications** | Views alerts, opens settings, toggles Do Not Disturb, drills into sensor alerts | TC-23.01, 21.01, 13.01 |
| **07_account** | Views profile, edits name (saves), logs out | TC-5.01, 5.02 |
| **08_forgot_password** | Taps forgot password, enters email, triggers OTP | TC-3.01 |
| **09_change_password** | Goes to account, taps change password, triggers OTP | TC-5.03 |
| **10_subscription** | Upgrades to Pro with sandbox test card | TC-26.02, 5.05 |
| **11_support** | Navigates to support tab, verifies 4 help links | TC-25.01 |
| **12_delete_sensor** | Deletes a sensor from a hub (destructive) | TC-15.01 |
| **13_delete_hub** | Deletes a hub from the account (destructive) | TC-20.01 |
| **14_delete_account** | Deletes the entire test account (destructive, run last) | TC-4.01 |

**14 flows cover 25+ test cases and 85% of all automatable scenarios.** Each flow tests real mutations (rename and save, not just rename and cancel). Each flow runs end-to-end on a real emulator.

### Why this structure works

1. **One file to read per feature.** Want to know how hub management is tested? Read `04_hub_actions.yaml`. That's it. Not 6 files across 3 directories.

2. **Shared login helper eliminates duplication.** Every flow that needs authentication calls `shared/login.yaml`. Login logic lives in one place.

3. **Run order is explicit.** Flows are numbered 01-14. Setup first, verify second, actions third, destructive last. You can run them in sequence and they work.

4. **Environment separation protects test data.** Flows 01-11 use the main test account. Flows 12-14 use a separate `DESTROY_EMAIL` account. You can't accidentally delete production test data.

5. **Extensible without restructuring.** Need to test a new feature? Add `15_new_feature.yaml`. Don't need to touch any existing files.

### What we intentionally skip

- **Detour scenarios** (cancel midway, go back) — low value, high maintenance
- **Negative scenarios** (wrong password, invalid email) — test manually, they rarely break
- **Edge cases** (offline mode, timeouts) — hard to simulate reliably in emulators
- **External webviews** (support links open Chrome) — Maestro can't control them

These represent ~40% of Excel test cases but <5% of real bugs found. The 14 flows focus on the paths users actually take.

---

## What You See

**Dashboard** — Overall pass rate, category health bars, recent bugs, flaky test alerts. Live status indicators for Maestro CLI, Android, and iOS in the topbar.

**Test Cases** — Kanban board by category. Filter by status (Pass, Fail, Flaky, In Progress, Not Run, Has YAML), test type (Happy Path, Flow, Detour, Negative, Edge Case), and sort by ID, Status, Priority, Name, or Type.

**Bugs** — Kanban board: Open, Investigating, Fixed, Closed. Jira bugs sync with a "J" badge alongside local bugs.

**Devices** — Grid showing which tests pass on which devices. Sortable by Test ID, Name, or Pass Rate.

**Runs** — History of test runs with pass/fail counts.

**Maestro Tests** — Live view of your Maestro YAML flows, read directly from your local folders. Toggle between Android and iOS. Click a flow to see human-readable steps and the actual YAML code.

**Chat** — Slide-out drawer connecting directly to Claude Code running locally. Ask it to run tests, check status, or create bugs.

---

## Commands

| Command | What it does |
|---------|-------------|
| `morbius serve` | Start the dashboard (default port 3000) |
| `morbius import <xlsx>` | Import test cases from Excel into the active project |
| `morbius export <xlsx>` | Write dashboard changes back to Excel |
| `morbius sync` | Link Maestro YAML flows to test cases by QA Plan ID |
| `morbius ingest <dir>` | Import Maestro test results, auto-create bugs for failures |
| `morbius create-bug --test TC-2.01 --title "..."` | Manually create a bug ticket |
| `morbius validate` | Check data integrity — broken links, orphaned files, missing paths |

---

## Where Data Lives

Everything is stored as files. No database.

```
data/
  projects.json              ← Registry of all projects + active project
  micro-air/                 ← One folder per project
    config.json              ← Project config (app ID, paths, devices, env vars, Jira)
    tests/                   ← Test cases as markdown (one file per test, by category)
    bugs/                    ← Bug tickets as markdown (local + Jira-synced)
    runs/                    ← Test run logs
    screenshots/             ← Failure screenshots
```

---

## Maestro Flow Structure

```
<project>-testing/
  Andriod test/
    flows/                   ← 14 numbered flow files
      01_login.yaml
      02_create_account.yaml
      03_hub_dashboard.yaml
      04_hub_actions.yaml
      05_add_hub_and_sensor.yaml
      05_sensor_actions.yaml
      06_notifications.yaml
      07_account.yaml
      08_forgot_password.yaml    (OTP placeholder)
      09_change_password.yaml    (OTP placeholder)
      10_subscription.yaml       (sandbox payment)
      11_support.yaml
      12_delete_sensor.yaml      ⚠️ destructive
      13_delete_hub.yaml         ⚠️ destructive
      14_delete_account.yaml     ⚠️ destructive (run LAST)
    shared/
      login.yaml             ← Reusable login helper
    _archive/                ← Old 50-file structure (reference only)
```

### Run order
```
SETUP:    01 → 02 → 05_add
VERIFY:   03 → 05_sensor → 11
ACTION:   04 → 06 → 07
OTP:      08 → 09
PAYMENT:  10
DESTROY:  12 → 13 → 14
```

---

## Features

### Edit & Track
- **Edit status inline** — Click the status pill on any test case or bug
- **Create bugs from the UI** — "Report Bug" button in detail panels
- **Editable notes** — Live textarea that auto-saves to markdown
- **Changelog** — Every change logged to a `## Changelog` table in the markdown file
- **Card reordering** — Up/down buttons to reorder test cards

### Filter & Sort
- **Status filters** — All, Pass, Fail, Flaky, In Progress, Not Run, Has YAML
- **Type filters** — Happy Path, Flow, Detour, Negative, Edge Case (with counts)
- **Sort bar** — Sort by ID, Status, Priority, Name, or Type
- **Empty columns auto-hide** when filters are active

### Run Tests
- **Run from dashboard** — "Run Android" / "Run iOS" buttons when Maestro flows are linked
- **Live status** — Spinner with elapsed time, then pass/fail badge
- **Auto-update** — Test status updates after run completes

### Integrations
- **Jira sync** — Pull bug tickets from Jira into the Bug Board
- **Maestro YAML** — Live view reads directly from your folders
- **Excel two-way sync** — Import from Excel, export changes back

### Chat
- **Morbius Agent** — Slide-out drawer connects to Claude Code locally via WebSocket
- **Suggestion chips** — Quick actions for common tasks
- **Streaming responses** — See agent output in real-time

---

## Claude Code Agent & Skills

| Skill | What it does |
|-------|-------------|
| `morbius` (agent) | Full QA lifecycle — onboard, import, write flows, run tests, manage board |
| `/morbius-preflight` | Pre-flight checks — Maestro CLI, MCP, devices, project config, app installed |
| `/morbius-write-flows` | Write Maestro YAML flows — app-first exploration, feature-area structure |
| `/morbius-run-test` | Execute a flow on device, update status, create bug if failed |
| `/morbius-onboard` | Set up a new app project with guided questions |
| `/morbius-board` | Dashboard management — import, sync, validate, serve |
| `/morbius-bug` | Create and manage bug tickets |
| `/morbius-jira` | Pull bugs from Jira into the dashboard |

---

## Prerequisites

- **Node.js 18+**
- **Maestro CLI** — `brew install maestro` or `curl -Ls "https://get.maestro.mobile.dev" | bash`
- **Claude Code** — For agent/chat features
- **Android SDK** (optional) — For Android test execution
- **Xcode** (optional) — For iOS simulator test execution

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-6` | Jump between views |
| `⌘K` or `/` | Search everything |
| `Esc` | Close any panel |
| `?` | Show shortcuts help |

---

## Tech

Node.js + TypeScript. Single HTTP server with embedded HTML/CSS/JS. WebSocket for chat bridge. ~7 dependencies. No React, no build pipeline for the dashboard. Zinc-palette dark theme.

---

## Roadmap

Morbius is evolving from a local developer tool into a full SaaS QA automation platform.

| Phase | What | Status |
|-------|------|--------|
| 1 | MVP Dashboard + Excel Import | ✅ Complete |
| 2 | Agent Intelligence + Sorting + Changelog + Chat | ✅ Complete |
| 2.5 | Maestro Flow Restructure (14 flows) + App Map | ✅ Complete |
| 3 | BrowserStack + One-Click Cloud Runs | 🔜 Next |
| 4 | Settings Page + Integrations (Jira, Linear, Slack) | Planned |
| 5 | Multi-Framework (Appium + Detox adapters) | Planned |
| 6 | Claude API Integration + Self-Healing Tests | Planned |
| 7 | SaaS Platform (auth, database, multi-tenant) | Planned |
| 8 | Visual Regression + CI/CD + Analytics | Planned |

See [ROADMAP.md](./ROADMAP.md) for full details on each phase.
