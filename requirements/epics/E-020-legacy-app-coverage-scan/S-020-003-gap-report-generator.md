# Coverage Gap Report Generator

**ID:** S-020-003
**Project:** morbius
**Epic:** E-020
**Stage:** Draft
**Status:** Todo (GATED)
**Priority:** P3
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## ⚠ Gate

Do not start this story until the RF quality-sensitivity validation signal is confirmed (see E-020).

---

## Story

As a QA lead, I want a single readable gap report at the end of a legacy scan so that I can walk into a client meeting with a concrete assessment of current coverage.

## Acceptance Criteria

**Given** cross-referencing has completed
**When** the report generator runs
**Then** a `data/{projectId}/coverage-scan.md` file is written with sections: Covered Flows, Orphaned Tests, Uncovered High-Risk Flows, Recommendations

**Given** the report is generated
**When** I view it in the dashboard
**Then** it renders cleanly and is exportable to PDF (reuse existing PDF export if present; otherwise stretch goal)

**Given** the scan took too long or partially failed
**When** I view the report
**Then** completion percentage and any skipped areas are clearly indicated, not silently omitted

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
