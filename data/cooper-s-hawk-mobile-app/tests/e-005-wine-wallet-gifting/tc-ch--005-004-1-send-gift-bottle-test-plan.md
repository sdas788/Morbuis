---
id: TC-CH--005-004-1
title: Send Gift Bottle — Test Plan
category: e-005-wine-wallet-gifting
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-005-004
  - e-005
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-005-004
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-005-wine-wallet-gifting/T-005-004-send-gift-bottle.md
  source_checksum: 9e3baad2f6c9eef5
---
## Steps
# Test Plan: Send Gift Bottle

**ID:** T-005-004
**Project:** ch-mobile
**Story:** S-005-004
**Epic:** E-005
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the full Send Gift Bottle flow for a member: launching the slide-up intro modal from each entry point, dismissing the modal, completing the recipient form, choosing payment (card on file vs new card), submitting the gift via `POST /membership/gift` plus the appropriate charge endpoint (`/charge/cof` or `/charge/cnof`), confirming the success state, surfacing payment failures with retry, ensuring the welcome email is dispatched only after API success, and confirming pre-selection when the flow is launched from a Bottle Detail modal.

## Prerequisites

- Member account with `insiderGifting=true`, at least one giftable bottle, and a valid card on file
- A second member account with `insiderGifting=true` and **no** card on file (to drive the new-card / cnof path)
- Test recipient details (first name, last name, valid birthdate, optional message text)
- Test payment harness or sandbox payment processor that can simulate success and decline
- Email inspection tool (sandbox inbox or webhook capture) to verify recipient welcome email
- Bottle Detail modal (S-005-002) reachable for entry-point pre-selection check
- Dashboard "More to Explore" Send a Bottle entry available (members only)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (intro modal contents) | TC-005-004-001 (P0) | ✓ |
| AC-002 (X / outside-tap dismiss) | TC-005-004-001 (P0), TC-005-004-002 | ✓ |
| AC-003 (recipient form fields) | TC-005-004-001 (P0), TC-005-004-003 | ✓ |
| AC-004 (card on file shown as default) | TC-005-004-001 (P0) | ✓ |
| AC-005 (success → confirmation + recipient email) | TC-005-004-001 (P0) | ✓ |
| AC-006 (failure → error + retry, no email) | TC-005-004-004 | ✓ |
| AC-007 (entry from Bottle Detail pre-selects bottle) | TC-005-004-005 

## Expected Result
# Test Plan: Send Gift Bottle

**ID:** T-005-004
**Project:** ch-mobile
**Story:** S-005-004
**Epic:** E-005
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Verifies the full Send Gift Bottle flow for a member: launching the slide-up intro modal from each entry point, dismissing the modal, completing the recipient form, choosing payment (card on file vs new card), submitting the gift via `POST /membership/gift` plus the appropriate charge endpoint (`/charge/cof` or `/charge/cnof`), confirming the success state, surfacing payment failures with retry, ensuring the welcome email is dispatched only after API success, and confirming pre-selection when the flow is launched from a Bottle Detail modal.

## Prerequisites

- Member account with `insiderGifting=true`, at least one giftable bottle, and a valid card on file
- A second member account with `insiderGifting=true` and **no** card on file (to drive the new-card / cnof path)
- Test recipient details (first name, last name, valid birthdate, optional message text)
- Test payment harness or sandbox payment processor that can simulate success and decline
- Email inspection tool (sandbox inbox or webhook capture) to verify recipient welcome email
- Bottle Detail modal (S-005-002) reachable for entry-point pre-selection check
- Dashboard "More to Explore" Send a Bottle entry available (members only)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (intro modal contents) | TC-005-004-001 (P0) | ✓ |
| AC-002 (X / outside-tap dismiss) | TC-005-004-001 (P0), TC-005-004-002 | ✓ |
| AC-003 (recipient form fields) | TC-005-004-001 (P0), TC-005-004-003 | ✓ |
| AC-004 (card on file shown as default) | TC-005-004-001 (P0) | ✓ |
| AC-005 (success → confirmation + recipient email) | TC-005-004-001 (P0) | ✓ |
| AC-006 (failure → error + retry, no email) | TC-005-004-004 | ✓ |
| AC-007 (entry from Bottle Detail pre-selects bottle) | TC-005-004-005 

