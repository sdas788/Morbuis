# Morbius QA Harness

The repeatable pipeline that takes a project from "test cases exist" to "automated flows that pass" — and the guardrails that keep it honest. Each stage has an explicit owner (skill / CLI / endpoint). Run `morbius doctor` between stages.

## The pipeline

| # | Stage | Owner | In → Out |
|---|-------|-------|----------|
| 0 | **Onboard** | `morbius-onboard` skill · `pmagent-sync` CLI (writes a `config.json` stub) | project source → `config.json` (appId, maestro paths, `testAccounts`) + test cases |
| 0.5 | **Curate** | `morbius-curate` skill · `morbius doctor` | noisy imported cards → legible Ready worklist: raw/meta epics quarantined (`reviewEpics`), shredded titles fixed + re-synced, device matrix reconciled, source drift + honest coverage surfaced |
| 1 | **App Map** | `morbius-app-map` skill | live app + design reference → `config.appMap` + `APP_MAP.md` (build-state annotated) |
| 2 | **Automation Plan** | `morbius-automation-plan` skill | test cases + app map + feasibility + personas → `automation-plan.json` (triage + feature-area flows) |
| 3 | **Review** *(human)* | Automation Plan board (web tab) | edit decisions / grouping / personas — persists |
| 4 | **Author** | `morbius-write-flows` skill (reads the plan) | scaffolded, non-blocked flow → Maestro YAML (selectors from live `inspect_screen`) |
| 5 | **Run** | Maestro runner — `/api/test/run`, `/api/test/run-mcp` (agentic), `mcp__maestro__run` | YAML + device → pass/fail + screenshots |
| 6 | **Heal** | E-017 self-healing (`/api/healing/*`, Healing tab) | selector miss → proposed fix → validate → apply → re-run |
| 7 | **Bug** | auto-create on failure + Bug Impact AI + Jira sync | real defect → bug ticket |

Stages 0→2 are **planning** (decide). 4→7 are **execution** (do). Stage 3 is the human gate. YAML is written **last** (Stage 4), never before the plan exists. Stage 0.5 (**Curate**) is the bridge: imported cases are product-authored and often noisy — curate them into a legible, honest QA board before planning automation against them.

## Decision framework (Stage 2, the 3 gates)

1. **Value** — P0/P1 + central journey + regression-critical → Automate. P3 / one-off / pure-negative → Manual/Defer.
2. **Feasibility** — Manual (not UI-reachable, external webview, OS push, OTP, forced-update) · **Blocked-until-config** (remote-config/feature-flag gate — record the unblock) · Defer (biometric, offline) · Automate-with-flag (high selector risk → lean on heal).
3. **Grouping** — cluster Automate cases into **feature-area flows** (never 1 test : 1 flow); assign persona, platforms, priority, run-order (setup → verify → action → destructive).

## Guardrails — lessons → rules → checks

Every mistake from building this harness, turned into a rule and an automated check (`morbius doctor`).

| Lesson (what went wrong) | Rule | Enforced by |
|--------------------------|------|-------------|
| 4 skills referenced dead Maestro MCP tools (`inspect_view_hierarchy`, `run_flow`, `run_flow_files`, `tap_on`) | Skills use current vocab: `run`, `inspect_screen`, `list_devices`, `take_screenshot` | `doctor`: stale-tool scan of `.claude/skills/*.md` |
| Verified an app map against the wrong (drifted) active project — silent false-positive | Confirm the active project before any per-project verification | `doctor` prints the active project loudly |
| PMAgent sync created test cases but no `config.json` — project couldn't run/app-map | Sync writes a `config.json` stub; onboarding fills appId/paths/personas | source fix in `runPMAgentTransfer`; `doctor` onboarding check |
| Sync mislabelled 28/30 scenarios "Negative" (keyword-sniffed Failure-Indicators text) | Derive scenario from the test plan `**Type:**`; never triage on `scenario` | source fix in `pmagent.ts pickScenario`; `doctor` >80%-one-scenario warning |
| Hyphenated slug leaked a dash → `TC-CH--001-…` | Strip dashes before slicing the slug prefix | source fix in `pmagent.ts`; `doctor` "--" ID check |
| "Scaffold" looked done but was a dead-end status flag (theater) | Buttons either do real work or are labelled as drafts; scaffold generates a real grounded draft | n/a (design) — see `morbius-write-flows` |
| Blind headless YAML generation produced weak selectors (no live exploration; app has no testIDs) | Author from live `inspect_screen`; expect selector misses → heal | `morbius-write-flows`; E-017 |
| Plan referenced personas that may not exist | Personas live in `config.testAccounts` (env-var NAMES only); flows bind a `personaKey` | `doctor` persona-integrity check |
| Imported cards were 85% noise — a meta epic ("QA Test Automation") + machine-shredded one-line fragments drowned the 30 real plans (a 0/205 grey wall) | Curate before use: quarantine raw/meta epics via `reviewEpics` (Triage Shelf); titles legible — no `#` heading-leaks, no bare when-clause fragments | `doctor` junk-title scan (flags titles outside `reviewEpics`); source fix in `pmagent.ts` `splitACs` (skip headings) + `deriveTitle` (THEN clause, strip `**TC-…**`) |
| `getDeviceList()` was hardcoded to 4 devices → the dashboard invented phantom "iPad missing 100%" coverage gaps for hardware the project never targets | Device matrix + coverage reflect the active project's `config.devices` | `doctor` device-honesty check; source fix in `getDeviceList()` |
| Automation "coverage" was `min(flowCount, TCs)/TCs` — could read 100% with zero runs | Per-card automation coverage = cards with a runnable flow ÷ total (direct link or a written automation-plan flow) | dashboard metric in `server.ts` (design) |
| Nothing told QA when the product team changed an AC in PMAgent after import | Drift badge: recompute the source checksum at read time vs the stored one → in-sync / drifted / source-missing | `doctor` drift check; `recomputeSourceChecksum` in `pmagent.ts`; `/api/test/:id` |
| Per-test mobile Run button was a dead no-op stub (only the Maestro tab could run) | Test cards run per-platform via `/api/test/run`, resolving the flow from the automation plan when no direct link exists | source fix in `RunButtons` + `resolvePlannedFlowPath` (exercised by a real run, not `doctor`) |

## `morbius doctor`

```bash
node dist/index.js doctor
```
Run it **after a sync**, **after curating**, and **before authoring**. It checks: active project (loud), stale skill tool-vocab, onboarding (config.json + appId + maestro paths), test-ID hygiene (`--`), scenario distribution (mislabel signal), persona integrity, and — the Curate stage — QA-board legibility: raw/shredded titles outside `reviewEpics`, device-matrix honesty, and source drift vs PMAgent. Non-zero exit on problems; warnings don't fail.

## Still open (not yet in the harness)
- **Scaffold → agent host**: whether the dashboard's scaffold should hand off to the live Claude Code app vs. spawn a headless agentic session — decided per project for now; `morbius-write-flows` documents the agentic run pattern.
- **Orchestrator**: auto-chaining Author → Run → Heal → Re-run is manual today (each handoff is a human step).

**Closed:** `morbius doctor` now runs automatically at the start of every session via a `SessionStart` hook in `.claude/settings.json` — its report (including the Curate-stage legibility checks) is surfaced into context so a regression is never missed.

See also: [`README.md`](../README.md) · [`AGENTS.md`](../AGENTS.md) · skills in `.claude/skills/`.
