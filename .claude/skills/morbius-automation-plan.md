---
name: morbius-automation-plan
description: Derive an automation plan from a project's test cases + app map. Triages every test case (Automate / Manual / Blocked / Defer) with feasibility flags + persona binding, then groups the Automate cases into feature-area Maestro flows. Writes automation-plan.json for the dashboard's Automation Plan board. This is the PLANNING stage — it runs before any YAML is written.
user_invocable: true
---

# Derive the Automation Plan

Turn a project's test cases into a structured automation plan: which cases to automate, how they group into feature-area flows, on what rationale — **before** writing any Maestro YAML. The human reviews/edits the result on the **Automation Plan** board; then `morbius-write-flows` authors the flows.

> This is Stage 1 of the harness (see `requirements/HARNESS.md`). It does NOT write YAML.

## Inputs (gather first)
1. **Test cases** — `data/<project>/tests/**` (the synced/imported cases).
2. **App map** — `config.appMap` (run `morbius-app-map` first if absent). Tells you what's reachable.
3. **Build feasibility** — explore the live app (or read its source / design ref):
   - Features gated behind remote config / flags / "coming soon" → **blocked-until-config**.
   - Screens with no `testID`/accessibility ids → **high selector risk** (still automate; lean on E-017 healing).
   - External webviews, OS push delivery, OTP, biometric, forced-update, offline → usually **manual/defer**.
4. **Personas** — `config.testAccounts` (run/extend `morbius-onboard` if empty). Map each case's required account state.

> ⚠️ **Do NOT triage on the `scenario` field** — the PMAgent sync can mislabel it (run `morbius doctor`; if one scenario is >80% it's mislabelled). Triage on **priority + acceptance criteria + user journey**.

## The decision framework (3 gates)

For **every** test case, assign a decision via three gates:

**Gate 1 — Value.** P0/P1 + central user journey + regression-critical → candidate to **Automate**. P3 / one-off / pure-negative → **Manual** or **Defer**.

**Gate 2 — Feasibility.** Override Gate 1 when:
- Not UI-reachable / non-deterministic → **Manual**.
- External webview · OS push delivery · OTP · forced-update → **Manual/Defer**.
- Gated by remote config (feature flag) → **Blocked** (record the unblock prerequisite — it's actionable, not dead).
- Biometric · offline-simulation → **Defer** (emulator-flaky).
- High selector risk (no testIDs) → still **Automate**, set `feasibility.selectorRisk: "high"`.
- Needs a specific/second account → set `feasibility.personaKey`; note multi-account cases.

**Gate 3 — Grouping.** Cluster the **Automate** cases by **user journey into feature-area flows** (never 1 test : 1 flow). Each flow gets: `personaKey`, `platforms`, `priority`, `runOrder` (setup → verify → action → destructive), `rationale`, and `blockers` if any case is blocked.

## Output — write `automation-plan.json`

Persist via the API (server running) or by writing the file directly (`saveAutomationPlan`).

Per candidate (POST `/api/automation-plan/candidate`):
```json
{ "testId": "TC-ROA-003-001-1", "decision": "automate",
  "feasibility": { "selectorRisk": "high", "personaKey": "in-group" } }
```
Per flow (POST `/api/automation-plan/flow`):
```json
{ "id": "02_profile", "name": "Profile view / edit / hobbies / privacy",
  "featureArea": "E-003 Profile", "testIds": ["TC-ROA-003-001-1","..."],
  "personaKey": "in-group", "platforms": ["android","ios"], "priority": "P1",
  "runOrder": 2, "status": "planned",
  "rationale": "Fully live, self-contained — best first automation." }
```
For a blocked flow add `"blockers": ["Firebase allowedGroups: add test group ID"]`.

## After you write it
1. Open the **Automation Plan** tab → review the triage + flows; edit decisions/grouping (they persist).
2. Run `morbius doctor` → confirm persona integrity (every `personaKey` exists in `config.testAccounts`).
3. Hand off to `morbius-write-flows` — it reads `automation-plan.json` and authors only non-blocked, scaffolded flows.

## Quality bar
- Every case has a decision (no untriaged).
- Coverage summary makes sense: `N cases → M flows · X automatable now · Y blocked · Z manual/defer`.
- Blocked flows carry a concrete, actionable blocker (not just "blocked").
- Flows are feature-areas, not per-test-case.
