# Test Run History + Ingest Maestro CLI Output

**ID:** S-003-005
**Project:** morbius
**Epic:** E-003
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want to run `morbius ingest <maestro-output-dir>` to parse Maestro test results and auto-create a run record, so every test execution — whether triggered from the dashboard or the terminal — is captured in the Runs history.

## Acceptance Criteria

**Given** a `.maestro-output` directory from a Maestro run  
**When** I run `morbius ingest <dir>`  
**Then** a run record is created in `data/{project}/runs/` with pass/fail counts, per-test results, timestamps, and failure screenshots

**Given** a test fails in the ingest  
**When** a failure screenshot exists in the output  
**Then** the screenshot is copied to `data/{project}/screenshots/` and linked in the auto-created bug ticket

**Given** I open the Runs tab  
**When** runs exist  
**Then** I see a list of all run records with timestamp, device, total/pass/fail counts, and click to expand per-test results

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
