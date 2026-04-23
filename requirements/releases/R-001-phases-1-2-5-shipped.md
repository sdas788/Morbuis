# Release: Phases 1–2.5 — MVP Shipped

**ID:** R-001
**Project:** morbius
**Stage:** Ready
**Status:** Shipped
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Summary

Phases 1, 2, and 2.5 of Morbius are complete and running in production (localhost). This release documents the shipped baseline — all 30 stories across 6 epics are Done.

## Stories in Scope

| ID | Title | Stage | Status |
|----|-------|-------|--------|
| S-001-001 | Single HTTP Server + Dashboard Shell | Ready | Done |
| S-001-002 | Markdown File Database | Ready | Done |
| S-001-003 | Multi-Project Registry + Active Project Switching | Ready | Done |
| S-001-004 | Dashboard Overview Tab | Ready | Done |
| S-002-001 | Import Test Cases from Excel | Ready | Done |
| S-002-002 | Export Test Changes Back to Excel | Ready | Done |
| S-002-003 | Test Cases Kanban Board | Ready | Done |
| S-002-004 | Inline Status Update + Per-File Changelog | Ready | Done |
| S-002-005 | Sync Maestro YAML Flows to Test Cases by ID | Ready | Done |
| S-002-006 | Data Validation + Integrity Checks | Ready | Done |
| S-003-001 | Maestro Tab — Flow Browser + Human-Readable Step View | Ready | Done |
| S-003-002 | Run Individual Flow from Dashboard | Ready | Done |
| S-003-003 | Live Output Streaming via WebSocket | Ready | Done |
| S-003-004 | Full Suite Runner | Ready | Done |
| S-003-005 | Test Run History + Ingest Maestro CLI Output | Ready | Done |
| S-004-001 | Auto-Create Bug Tickets from Maestro Failures | Ready | Done |
| S-004-002 | Manual Bug Creation UI | Ready | Done |
| S-004-003 | Bug Kanban Board + Status Workflow | Ready | Done |
| S-004-004 | Failure Screenshot Capture + Inline Preview | Ready | Done |
| S-004-005 | Selector Analysis — Fragile YAML Pattern Detection | Ready | Done |
| S-004-006 | Jira Sync — Pull Bugs, Sync Status, Create Issues | Ready | Done |
| S-005-001 | Flakiness Detection + Transition-Based Scoring | Ready | Done |
| S-005-002 | Coverage Gap Detection | Ready | Done |
| S-005-003 | Device Coverage Matrix | Ready | Done |
| S-005-004 | Calculator Field Coverage Analysis (STS) | Ready | Done |
| S-006-001 | App Navigation Map (Mermaid Flowchart) | Ready | Done |
| S-006-002 | Maestro YAML Flow Generation from Calculator Config | Ready | Done |
| S-006-003 | Claude Code Chat Integration (WebSocket Bridge) | Ready | Done |
| S-006-004 | Settings Page | Ready | Done |
| S-006-005 | Run Media Viewer (Videos + Screenshots) | Ready | Done |

## Go / No-Go

- ✅ All 30 stories Done
- ✅ Running locally on localhost:3000
- ✅ Multi-project support (Micro-Air, STS, Shorr)
- ✅ 14 Maestro flows passing on Android emulator
- ✅ Jira sync operational

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer to document shipped baseline |
