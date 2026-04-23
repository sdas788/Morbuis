# Cross-Reference Uploaded Tests vs AppMap

**ID:** S-020-002
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

As the coverage scan pipeline, I need to cross-reference uploaded test cases against the AppMap so that I can classify each test as covered / orphaned / invalid and each app area as tested / untested.

## Acceptance Criteria

**Given** an AppMap and a list of uploaded test cases
**When** cross-referencing runs
**Then** each test case is classified: `covered` (maps to an AppMap node), `orphaned` (doesn't match anything), or `ambiguous` (maps to multiple possible nodes, flagged for review)

**Given** AppMap nodes exist that no test references
**When** cross-referencing runs
**Then** those nodes are flagged as `uncovered` with risk estimation (based on depth from entry, destructive-action detection, etc.)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
