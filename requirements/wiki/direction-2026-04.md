# Morbius Direction — 2026-04

**Status:** Active direction (locked)
**Date:** 2026-04-23
**Supersedes:** nothing — this is the first written direction doc since the Bet C lock
**Related:** `brief.md` (Current Direction section), `arch.md` (Planned Extensions section), epics E-013 through E-022

---

## Why this doc exists

Direction has shifted several times in private strategy sessions without landing in the project. When priorities change, context is lost; when another session picks up the work, they re-debate settled questions.

This file is the single canonical record of: what we're building, in what order, and why. When direction shifts again, supersede this file with a new dated one — do not edit in place.

---

## Strategic anchor: Bet C → B → A

- **Bet C (active):** Morbius as a force-multiplier for RF client delivery. Dedicated 1–2 engineer capacity. Ship inside real client engagements.
- **Bet B (harvest):** showcase / content / thought-leadership, as a byproduct of Bet C wins. No dedicated investment.
- **Bet A (contingent):** SaaS platform. Only if Bet B surfaces inbound demand.

**Why this order:** Agency-to-product pattern (37signals, Linear, Supabase). The mobile QA SaaS market (Perfecto, Kobiton, Mabl, BrowserStack) is crowded — direct entry is unlikely to win. Bet C pays off even if B and A fail because it improves RF's delivery margin.

**Gate:** Before Bet C work starts in earnest, validate that RF's clients are quality-sensitive. Review last 5 closed-deal notes. If the signal isn't there, stop and re-evaluate — do not build Bet C features speculatively.

---

## Core Four (leverage order)

| # | Name | What it is | Epic | Phase |
|---|------|-----------|------|-------|
| 1 | **Self-Healing Selectors** | When a Maestro flow fails on a stale selector, auto-propose a replacement, validate it, and (human-approved) update the YAML | E-017 | 1 |
| 2 | **Ticket→Repro in 3 minutes** | Broken Jira sync fixed + Bug-Impact AI that shows related tests to rerun or manual-verify when a bug opens/closes | E-013, E-016 | 0.1, 1 |
| 3 | **Shadow App** | Parallel build comparison — run the same flows against two builds, flag divergence | not yet scoped | future |
| 4 | **Trust Receipt** | Signed release artifact — cryptographic proof that a build passed a declared test suite on declared devices | not yet scoped | future |

Only #1 and #2 are scoped in this direction doc. #3 and #4 are on the runway but not planned until #1 and #2 ship.

---

## Explicitly parked

These are NOT on the roadmap — do not build without an explicit new direction doc.

| Item | Why parked | Notes |
|------|-----------|-------|
| Nightmare Agent (adversarial test generator) | Dilutes focus; unclear customer value | Revisit if Bet A ever activates |
| Anti-Regression Time Machine | Maintenance-heavy; low differentiation | **E-021 revives this as drift — flagged** |
| Pair Tester (human-in-loop exploratory partner) | Overlaps Core Four #1 and #2; cheaper to ship those first | — |
| OSS release | Would demand community maintenance before Bet C wins | Revisit after Bet B harvest |
| Chat-first Kanban replacement | Kanban stays as the secondary view, not killed | — |

---

## 7-phase expansion roadmap (brain-dump 2026-04-23)

Full detail in `/Users/sdas/.claude/plans/what-you-think-there-fluffy-dragon.md`. Summary here:

| Phase | Scope | Epics | Weeks |
|-------|-------|-------|-------|
| **-1** | Strategic docs + PMAgent tickets (this work) | E-013–E-022 created | 0 |
| **0** | Unblock daily use — fix Jira sync, Excel upload in UI, test-case detail depth | E-013, E-014, E-015 | 1–2 |
| **1** | Core Four #1 + #2 — Self-Healing Selectors, Bug-Impact AI | E-016, E-017 | 3–10 |
| **2** | Planning agents — AppMap v2 with automation candidates | E-018 | 11–14 |
| **3** | Sync convenience — Google Sheets bidirectional, Jira hardening | E-019, E-013 part 2 | 15–18 |
| **4** | Legacy-app coverage scan — **GATED** on RF quality-sensitivity validation | E-020 | 19–22 |
| **5** | Per-app regression wiki — **DRIFT** from parked list | E-021 | 23–25 |
| **6** | Maestro-as-SDK-agent — decision gate, **do not build** | E-022 | 26+ |

---

## Guardrails

1. **Every new feature lands as a PMAgent ticket first.** No work off-board.
2. **Fix before extending.** Jira sync ships before Bug-Impact AI; Phase 0 ships before Phase 1.
3. **Reuse the monolith.** `src/server.ts` stays the home for UI + API until there's a concrete reason to split. Do not propose splitting prematurely.
4. **Markdown DB stays authoritative.** New entities (impact, healing proposals, coverage scans, regression plans) are all new markdown types — no database introduction.
5. **Agents use existing Claude Code bridge.** Do NOT pull in Claude Agent SDK or OpenAI SDK until E-022 gate criteria are met.
6. **Drift goes in the ticket.** Any drift-flagged work (E-020, E-021) must retain the drift note in its body. Future-you needs to see the flag before executing.

---

## When to supersede this doc

Create a new `wiki/direction-YYYY-MM.md` if any of these happen:
- RF client quality-sensitivity signal confirms → Phase 4 ungates
- Bet A activates (inbound SaaS demand) → roadmap reshuffles around multi-tenant work
- A Core Four item completes and #3 (Shadow App) or #4 (Trust Receipt) needs detailed scoping
- Dedicated capacity changes (>2 engineers or drops to <1)

Do not edit this file in place for minor corrections — use the change log below.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Initial direction doc — Bet C lock, Core Four, 7-phase roadmap, parked items |
