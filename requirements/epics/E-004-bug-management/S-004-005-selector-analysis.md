# Story: Selector Analysis — Fragile YAML Pattern Detection

**ID:** S-004-005
**Project:** morbius
**Epic:** E-004
**Stage:** Ready
**Status:** Done
**Priority:** P2
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want Morbius to scan Maestro YAML for fragile selector patterns and surface warnings on bug cards and the flow viewer, so the team knows which tests are likely to break due to brittle automation before they do.

## Acceptance Criteria

**Given** a YAML flow uses a pixel-based `point{}` tap  
**When** the flow is displayed or a bug is created from it  
**Then** a "fragile selector" warning is shown: "pixel-based tap — breaks if layout changes"

**Given** a YAML flow has a hardcoded `sleep` longer than 3 seconds  
**When** analysed  
**Then** a warning is shown: "hardcoded sleep >3s — flakiness risk"

**Given** a YAML flow uses an index selector (`index: 2`)  
**When** analysed  
**Then** a warning is shown: "index selector — fragile if list order changes"

**Given** a flow has no fragile patterns  
**When** analysed  
**Then** no warnings are shown

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
