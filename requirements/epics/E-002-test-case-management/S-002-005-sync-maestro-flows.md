# Story: Sync Maestro YAML Flows to Test Cases by ID

**ID:** S-002-005
**Project:** morbius
**Epic:** E-002
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want to run `morbius sync --android <path> --ios <path>` to automatically link each Maestro YAML flow to its matching test case by QA Plan ID, so test cards on the board show which tests have automation and which ones don't.

## Acceptance Criteria

**Given** Maestro YAML files have a comment with QA Plan ID (e.g. `# QA Plan ID: TC-2.01`)  
**When** I run `morbius sync`  
**Then** the matching test case markdown files are updated with the YAML flow path in frontmatter

**Given** both Android and iOS paths are provided  
**When** sync runs  
**Then** `maestroFlowAndroid` and `maestroFlowIOS` are set independently on each test case

**Given** a flow exists but no test case matches the ID  
**When** sync runs  
**Then** the unmatched flow is listed as a warning (not an error)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
