# Story: Proposal Review UI + Approve/Reject

**ID:** S-017-005
**Project:** morbius
**Epic:** E-017
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
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
| 2026-04-23 | 1.1 | Claude | Implemented: new top-level `Healing` view (sidebar nav item between AppMap and Jira sync, kb shortcut "8"). `HealingQueueView` component polls `GET /api/healing` every 8s. Default filter shows only `validated`/`approved` proposals; checkbox reveals invalidated/error/applied/etc. Each proposal renders as a card bordered by its confidence band (green/yellow/red per S-017-005 thresholds <0.5 / 0.5–0.8 / >0.8) with: state badge, proposal id, testId, platform, truncated flow path, the failed selector (red strikethrough) over the proposed selector (green) — that's the diff view, confidence progress bar + numeric, Claude rationale in italic, error reason if present. Buttons: **Approve and apply** (POST `/approve`), **Modify** (inline input → POST `/modify`), **Reject** (POST `/reject`). On Modify, the user can edit before approving; the edited value is stored on the proposal as `modifiedSelector` for audit. Side fix during build: `didn't` apostrophe in a JSX string literal closed the outer template literal at runtime and silently broke the entire React tree — replaced with `did not`. AC1 + AC2 + AC3 + AC4 met. |
