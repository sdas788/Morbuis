# Story: Legacy-App Upload Onboarding Variant

**ID:** S-020-001
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

Do not start this story until the RF quality-sensitivity validation signal is confirmed (see E-020 and brief.md).

---

## Story

As a QA lead taking over a legacy app with no automation plan, I want a "Legacy App Scan" onboarding variant so that I can upload what I have (Excel + app binary) and get a coverage report.

## Acceptance Criteria

**Given** the new-project modal is open
**When** I choose "Legacy App Scan" variant
**Then** the flow asks for: an optional Excel of existing tests, an app binary path or package name, and target device

**Given** all inputs are provided
**When** I click "Start Scan"
**Then** a job is enqueued that will run AppMap traversal (S-020-002) and produce a gap report (S-020-003)

**Given** only partial inputs are provided
**When** I proceed
**Then** the flow degrades gracefully (no Excel → gap report marks "no existing tests"; no app binary → error)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
