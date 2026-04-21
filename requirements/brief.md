# Product Brief: Morbius

**Version:** 1.0
**Updated:** 2026-04-21
**Project:** morbius
**PM Persona:** pragmatist
**Sources:** README.md, ROADMAP.md

---

## Problem Statement

QA teams building mobile apps have no unified, AI-native workspace that connects test planning, automated test execution, bug tracking, and AI-assisted test creation. They stitch together Excel test plans, Maestro YAML files, Jira tickets, and local CLI tools — with no single view of what's passing, what's failing, and what needs attention. Morbius gives every team member — QA leads, developers, and PMs — a browser-based dashboard backed by an AI agent that writes tests, runs them on real devices, and creates detailed bug reports automatically.

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Ship BrowserStack cloud execution | All 14 flows runnable on real cloud devices from dashboard | Phase 3 complete |
| Enable team collaboration | Multi-user access to shared test board and bug tracker | Phase 7 launch |
| Reduce test maintenance overhead | Self-healing fix rate on selector-change failures | 70% auto-resolved by Phase 6 |
| Drive SaaS adoption | Paying teams on hosted platform | 20 teams within 6 months of Phase 7 launch |

## Personas

| Persona | Role | Context | Goals | Pain Points |
|---------|------|---------|-------|-------------|
| **The QA Lead** | qa-lead | Manages test plans, triages failures, coordinates runs | Maintain clear pass rate visibility; catch regressions before ship; keep Excel plan in sync | Manually updating spreadsheets after every run; no flakiness visibility; bugs scattered across Jira and Slack |
| **The Developer** | developer | Writes code, runs smoke tests, reviews bug reports | Quick feedback after code changes; see what broke and why without digging through YAML | Slow test feedback loop; inconsistent emulator vs. real-device results; debugging Maestro selectors instead of fixing bugs |
| **The PM Stakeholder** | viewer | Reads dashboards, attends releases | Know overall QA health without a meeting; see which release-blockers are open | No visibility without asking QA; unclear what "testing is done" means before a release |

## Product Areas

| Area | Description |
|------|-------------|
| Dashboard & Test Board | Kanban view of all test cases by category and status; overall health metrics and pass rate |
| Test Execution | Run Maestro (and future Appium/Detox) flows on local emulators and BrowserStack cloud devices |
| Bug Tracking | Create, triage, and resolve bugs from the dashboard; sync with Jira |
| AI Agent | Claude-powered agent that writes test flows, runs them, self-heals selector failures, and creates bug reports |
| Integrations | BrowserStack, Jira, Linear, GitHub/Slack, Excel two-way sync |
| SaaS Platform | Multi-tenant hosted service with auth, RBAC, PostgreSQL backend, and billing |

## Scope

### In Scope

- Phase 3 (Active): BrowserStack device cloud integration — run flows on real devices, pull results and screenshots, auto-create bugs on failure
- Phase 4: Settings page + integrations hub (Jira, Linear, GitHub, Slack, BrowserStack config UI)
- Phase 5: Multi-framework adapters — Appium and Detox alongside Maestro
- Phase 6: Claude API integration replacing local CLI; self-healing selector recovery; Tambo.ai chat UI
- Phase 7: SaaS platform — OAuth auth, multi-tenant orgs, RBAC, PostgreSQL, S3, billing
- Phase 8: Visual regression, CI/CD integration, analytics dashboards, PDF reports

### Out of Scope

- Phases 1–2.5 are complete (MVP dashboard, 14 Maestro flows, multi-project support, Jira sync, Excel import/export, 9 Claude Code skills) — these are not work items, they are shipped baseline
- Web scraping or browser-based testing (mobile-only scope through Phase 5)

## Constraints

- Local-first until Phase 7 — data stored as markdown files, runs on localhost:3000
- Claude Code CLI required for agent features until Phase 6 (Claude API replaces it)
- Maestro CLI required for test execution until Phase 5 introduces additional adapters
- No user auth until Phase 7 — single-user local tool in all prior phases

## Stakeholders

| Name | Role | Company | Contact | Notes |
|------|------|---------|---------|-------|
| | | | | |

## Open Questions

- BrowserStack only for Phase 3, or also AWS Device Farm / Sauce Labs?
- Tambo.ai for Phase 6 chat UI — evaluate build-vs-integrate decision before E-004 stories are written
- Phase 7 pricing tiers — working assumption: Free / Pro / Enterprise per ROADMAP.md; needs sign-off

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created from README.md + ROADMAP.md |
