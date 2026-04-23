# Proposal Review UI + Approve/Reject

**ID:** S-017-005
**Project:** morbius
**Epic:** E-017
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want a Healing Queue UI that shows validated proposals so that I can quickly approve, modify, or reject each one without editing YAML by hand.

## Acceptance Criteria

**Given** validated proposals exist
**When** I open the Healing Queue
**Then** each proposal shows: flow path, failed selector, proposed selector, confidence, diff view, and approve/modify/reject buttons

**Given** I click "Approve"
**When** the action fires
**Then** S-017-006 (YAML update) triggers; the proposal moves to "approved" state; the queue refreshes

**Given** I click "Modify"
**When** the action fires
**Then** I can edit the proposed selector in an input field before approving — my edit is stored with the proposal for audit

**Given** the Queue uses the shared Agent Panel pattern
**When** it renders
**Then** visual style matches E-016 Impact tab and E-018 candidates section

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
