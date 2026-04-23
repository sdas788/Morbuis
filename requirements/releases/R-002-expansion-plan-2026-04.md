# Release: Expansion Plan — E-013 through E-022

**ID:** R-002
**Project:** morbius
**Stage:** Draft
**Status:** Planned
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Summary

7-phase expansion roadmap planned 2026-04-23. Sequenced by leverage against the locked Bet C strategy and Core Four priorities. Phases 0–1 are the critical path (unblock + Core Four); Phases 2–3 are convenience; Phases 4–6 are gated/drift. Full rationale in [wiki/direction-2026-04.md](../wiki/direction-2026-04.md).

**Baseline (R-001):** 30 stories across E-001–E-006, all Done.
**This release scope:** 34 new stories across E-013–E-022, phased over ~6 months with 1–2 engineer capacity.

---

## Phase 0 — Unblock (weeks 1–2)

| ID | Title | Epic | Priority | Status |
|----|-------|------|----------|--------|
| S-013-001 | Audit & Fix Jira Sync Failure Modes | E-013 | P0 | Todo |
| S-013-002 | Jira Sync Health Panel in Settings | E-013 | P0 | Todo |
| S-013-003 | Jira Write-Back for Morbius Bug Edits | E-013 | P1 | Todo |
| S-013-004 | Failed-Sync Replay Queue | E-013 | P1 | Todo |
| S-014-001 | Drag-and-Drop Excel Upload in New-Project Modal | E-014 | P0 | Todo |
| S-014-002 | Post-Upload Preview + Commit Flow | E-014 | P0 | Todo |
| S-015-001 | Linked Bugs + Run History Panel | E-015 | P0 | Todo |
| S-015-002 | Maestro YAML + Device Coverage Panel | E-015 | P0 | Todo |
| S-015-003 | Inline Changelog in Detail View | E-015 | P1 | Todo |

## Phase 1 — Core Four #1 + #2 (weeks 3–10)

| ID | Title | Epic | Priority | Status |
|----|-------|------|----------|--------|
| S-016-001 | Bug-Impact Markdown Data Model | E-016 | P0 | Todo |
| S-016-002 | Claude Agent for Impact Generation | E-016 | P0 | Todo |
| S-016-003 | Jira Webhook → Regenerate on Status Change | E-016 | P0 | Todo |
| S-016-004 | Impact Tab in Bug Modal | E-016 | P0 | Todo |
| S-016-005 | Related-Tests-to-Rerun Rationale + Risk Score | E-016 | P1 | Todo |
| S-017-001 | Failure Interception Hook in Maestro Runner | E-017 | P0 | Todo |
| S-017-002 | View Hierarchy Snapshot via Maestro MCP | E-017 | P0 | Todo |
| S-017-003 | Claude-Based Selector Replacement Proposal | E-017 | P0 | Todo |
| S-017-004 | Re-Run with Proposed Selector + Validate | E-017 | P0 | Todo |
| S-017-005 | Proposal Review UI + Approve/Reject | E-017 | P0 | Todo |
| S-017-006 | YAML Update on Approval + Changelog | E-017 | P0 | Todo |

## Phase 2 — Planning Agents (weeks 11–14)

| ID | Title | Epic | Priority | Status |
|----|-------|------|----------|--------|
| S-018-001 | Automation Candidates Section in AppMap View | E-018 | P1 | Todo |
| S-018-002 | Priority + Rationale Generation via Claude | E-018 | P1 | Todo |
| S-018-003 | One-Click YAML Generation from Candidate | E-018 | P1 | Todo |

## Phase 3 — Sync Convenience (weeks 15–18)

| ID | Title | Epic | Priority | Status |
|----|-------|------|----------|--------|
| S-019-001 | Google OAuth Connection in Settings | E-019 | P2 | Todo |
| S-019-002 | Sheet ID Binding per Project | E-019 | P2 | Todo |
| S-019-003 | Poll-Based Pull with Timestamp Conflict Rule | E-019 | P2 | Todo |
| S-019-004 | Push Morbius Changes Back to Sheet | E-019 | P2 | Todo |

## Phase 4 — Legacy Coverage Scan (weeks 19–22, GATED)

| ID | Title | Epic | Priority | Status |
|----|-------|------|----------|--------|
| S-020-001 | Legacy-App Upload Onboarding Variant | E-020 | P3 (gated) | Todo |
| S-020-002 | Cross-Reference Uploaded Tests vs AppMap | E-020 | P3 (gated) | Todo |
| S-020-003 | Coverage Gap Report Generator | E-020 | P3 (gated) | Todo |

## Phase 5 — Regression Wiki (weeks 23–25, DRIFT)

| ID | Title | Epic | Priority | Status |
|----|-------|------|----------|--------|
| S-021-001 | Regression Plan Markdown per Project | E-021 | P4 (drift) | Todo |
| S-021-002 | Plan Editor + Top-Nav Tab | E-021 | P4 (drift) | Todo |
| S-021-003 | Schedule Triggers + Next-Run Display | E-021 | P4 (drift) | Todo |

## Phase 6 — SDK Agent Gate (week 26+, decision-only)

| ID | Title | Epic | Priority | Status |
|----|-------|------|----------|--------|
| S-022-001 | Write Decision Doc + Gate Criteria | E-022 | P4 | Todo |

---

## New Infrastructure

| Area | What's New |
|------|-----------|
| Routes | 15 new API routes (healing, impact, webhook, sheets, candidates) — see arch.md routes table |
| Parsers | `src/parsers/google-sheets.ts` (new); `maestro-yaml.ts` gains `replaceSelector()` |
| New directory | `src/healing/` — `selector-proposal.ts`, `failure-classifier.ts` |
| Types | `BugImpact`, `HealingRequest`, `SelectorProposal`, `AutomationCandidate`, `CoverageScan`, `RegressionPlan` added to `src/types.ts` |
| Data files | `jira-sync-state.json`, `bugs/{id}/impact.md`, `healing/proposal-{id}.md`, `automation-candidates.md`, `coverage-scan.md`, `regression-plan.md` |
| Config | `ProjectConfig` gains `googleSheets`, `healing`, `jira.webhookSecret` fields |

## Go / No-Go Criteria (Phase 0 gate)

- [ ] S-013-001 complete: Jira sync round-trip passing >99% for 7 days
- [ ] S-014-001 complete: New project → Excel drag-drop → kanban in <60s
- [ ] S-015-002 complete: Test case detail shows linked YAML + device coverage

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created — R-002 expansion plan tracking E-013–E-022, all 34 stories |
