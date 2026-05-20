# Morbius Mac — QA Test Plan

Manual + future-automated test plan for the v0.1 Mac app. Each section maps to an epic so coverage is traceable.

## Test environments

- macOS 14+ on Apple Silicon (primary) and Intel (smoke only)
- Light + dark theme (Cmd+Shift+L to toggle)
- With and without an Android emulator booted (`adb devices`)
- With and without an iOS simulator booted (`xcrun simctl list devices booted`)
- With and without `maestro` on PATH

---

## E-001 — Shell + chat-first dashboard

| # | Test | Pass criteria |
|---|------|---------------|
| 001 | App launches | Window appears in <1s, no console errors |
| 002 | Native traffic lights | Visible at top-left, not duplicated by HTML |
| 003 | Title bar drag | Dragging title moves the window; chips inside don't trigger drag |
| 004 | Sidebar / chat / rail layout | 3 columns visible when in chat view |
| 005 | Project chip | Visible at top center with `RF / mygrant-glass` |
| 006 | Sync pill | Shows `↑↓ synced` by default; toggles to `⟳ pulling…` then back when clicked |
| 007 | Light theme | Cmd+Shift+L flips colors; agent dot stays Claude orange |

## E-002 — Sync (local mode)

| 010 | Sync pill states render | synced / pulling / dirty / push-failed all paintable |
| 011 | Cmd+R triggers sync | Pill animates pulling→synced |

## E-003 — Local devices + Maestro

| 020 | Booted iOS sim appears | After `xcrun simctl boot …`, click sidebar refresh; iPhone shows in sidebar mini list and Devices view |
| 021 | Booted Android emulator appears | After `emulator -avd Pixel_…`, same as 020 with 🤖 |
| 022 | Cold device → cold dot | Dot color = `--fg-faint` |
| 023 | `runMaestroFlow` with binary present | Spawns maestro child process, output truncated to 4k |
| 024 | `runMaestroFlow` without binary | Returns `mocked: true`, status = pass, UI shows the card |

## E-004 — Environment Doctor

| 030 | Cmd+Shift+D opens Doctor | View loads, 7 probe rows visible |
| 031 | Verify button re-runs probe | Row updates with fresh status |
| 032 | Install button | Opens vendor URL in default browser |
| 033 | Anthropic key + GH PAT probes | Show "not configured" when ENV unset |

## E-005 — PMAgent

| 040 | `readPMAgentSpec` with `~/PMAgent` present | Returns `exists: true, root: …` |
| 041 | Without it | Returns `exists: false, mocked: true` |

## E-006 — Distribution

| 050 | `npm run build` | Produces unsigned `.app` in `dist-mac/` |
| 051 | `npm run dist` with Developer ID configured | Produces signed `.dmg` |
| 052 | Hardened-runtime entitlements | Present in built `Info.plist` (JIT, automation, network) |

## E-009 — Agent runtime

| 060 | Type `/smoke` and Cmd+Enter | Streaming text appears letter-by-letter; tool cards stream below |
| 061 | Conversation auto-titles | Title = first 60 chars of message |
| 062 | Conversation persists to JSONL | `~/Library/Application Support/morbius-mac/projects/mygrant-glass/conversations/*.jsonl` grows |

## E-010 — Tool surface

| 070 | Every tool returns `{ ok }` | No crashes; unknown tool returns `unknown tool` error |
| 071 | Activity entry per call | `agent-activity.jsonl` gains one running + one terminal entry per call |
| 072 | Failed tool surfaces | UI shows red border on tool card |

## E-011 — Permission & Consent UX

| 080 | Read tool auto-approves | `listDevices` runs without prompt |
| 081 | Shell tool prompts inline | `/heal` triggers `runShellCommand` prompt card with 4 buttons |
| 082 | Allow once | Tool runs, no rule persisted |
| 083 | Always allow | Tool runs, rule appears in Cmd+Shift+P view |
| 084 | Always deny | Future call blocked silently; audit log shows deny |
| 085 | Mode = bypassPermissions | All prompts skipped; banner could be added |
| 086 | Mode = plan | Read-only tools allowed; shell/destructive blocked with reason |
| 087 | audit.jsonl | One line per decision |

## E-012 — Activity rail

| 090 | Tool call streams in real time | Card appears in rail within 100ms |
| 091 | Status transitions | running → pass/fail render with correct icon |
| 092 | Loop budget bar | Updates per call when a loop is active |
| 093 | Time bucket dividers | Group cards by minute |

## E-013 — Conversation + Memory + Skills

| 100 | Cmd+N | Resets to empty state |
| 101 | Click old conversation | Replays messages (user text + assistant text + tool cards) |
| 102 | `/` opens palette | Filters by typed prefix; ↑↓ navigates; ⏎ runs |
| 103 | Skills from `~/.morbius/skills/` | Editing/adding a skill file updates the palette after restart |
| 104 | MEMORY.md | Created on first launch; `memory:read/write` round-trips |

## E-014 — QA loops

| 110 | `/smoke` | Runs listDevices → readTestCase → 3 runMaestroFlow → classify → fileBug → publishToPMAgent; final summary message |
| 111 | `/repro CH-1234` | readPMAgentSpec → listDevices → runMaestroFlow → captureScreenshot → uploadScreenshot |
| 112 | `/heal flow-name` | tailLog → readFile → runShellCommand (prompts!) → editFile → 3 runs → commit |
| 113 | `/explore screen` | listDevices → runMaestroFlow → captureScreenshot |
| 114 | `/coverage-gap` | readPMAgentSpec → readTestCase → summary |

## E-015 — Safety + kill switch

| 120 | Cmd+. mid-loop | All in-flight calls cancel; "Halted by user." appears in chat |
| 121 | Run menu → Halt Agent | Same as 120 |
| 122 | Cmd+Esc | Same as 120 |
| 123 | Loop budget cap reached | Loop stops, system message says budget reached |
| 124 | Kill switch with no loop active | No-op; toast acknowledges |

---

## Automation hooks (future)

Maestro can drive **mobile apps**, not desktop Mac apps directly. For the Mac app itself, two paths:

1. **Spectron-style E2E** with Playwright's Electron driver: `playwright._electron.launch({ args: ['.'] })`. Add a `test/` folder later with: launch, click sidebar, send `/smoke`, assert activity rail populates, kill switch.
2. **Renderer unit tests** via Vitest against `app.js` once it's modularized.

A repro of the design's 6 scenes can also be wired as **visual regression** snapshots (Percy / loki) once we lock the pixel-perfect baseline.

## Smoke-test script (one-page)

1. `npm start`
2. App opens — empty chat with greeting and 4 chips
3. Click `/smoke` chip → message sends, activity rail starts streaming tool cards
4. Cmd+. → halted notice in chat
5. Cmd+Shift+D → Doctor view shows 7 probes
6. Cmd+D → Devices view lists what's booted (or mock pair)
7. Cmd+Shift+P → Permission rules (empty initially)
8. Cmd+, → Settings; Cmd+Shift+L toggles theme
9. Cmd+1 / Cmd+2 / Cmd+3 → Kanban / Tests / Bugs panels render
10. Help → Open Data Folder → Finder opens to app data dir; activity + audit + permissions all present
