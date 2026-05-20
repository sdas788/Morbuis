---
id: TC-CH--004-002-1
title: Wine Club Sign Up — Test Plan
category: e-004-wine-club-membership
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-004-002
  - e-004
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-004-002
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-004-wine-club-membership/T-004-002-wine-club-sign-up.md
  source_checksum: ce94d849f407753b
---
## Steps
# Test Plan: Wine Club Sign Up

**ID:** T-004-002
**Project:** ch-mobile
**Story:** S-004-002
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies the four-step Wine Club sign-up flow (Club Selection → Account → Payment → Congrats), including dynamic price/benefit updates per bottle/type selection, info popup copy, more/less benefit expansion, collapsed step summaries, BluePay-embedded payment with all required fields, card-on-file selection for potential members, Terms acceptance enforcement, the Congrats toast routing, back navigation preserving data, and the unauthenticated redirect-to-login gate.

## Prerequisites

- Staging environment with BluePay sandbox configured
- Test sign-in account with no existing membership available for fresh sign-up
- Second test account that has a Card on File but no active membership (for COF selection cases)
- A guest (unauthenticated) device session for the redirect test
- API stubs reachable for `/membership/pricing`, `/customer/payment/bluepay`, `/membership/monthly`, `/customer`

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (bottle toggle updates benefits + price) | TC-004-002-001 (P0) | ✓ |
| AC-002 (club type toggle updates benefits + price) | TC-004-002-001 (P0), TC-004-002-002 | ✓ |
| AC-003 (info popup) | TC-004-002-001 (P0), TC-004-002-003 | ✓ |
| AC-004 (more/less benefit expand) | TC-004-002-001 (P0) | ✓ |
| AC-005 (Account step shows collapsed summary) | TC-004-002-001 (P0) | ✓ |
| AC-006 (Payment step BluePay fields) | TC-004-002-001 (P0) | ✓ |
| AC-007 (existing card radial + Add a Card) | TC-004-002-004 | ✓ |
| AC-008 (Terms unchecked error message) | TC-004-002-001 (P0), TC-004-002-005 | ✓ |
| AC-009 (Congrats toast with two CTAs) | TC-004-002-001 (P0) | ✓ |
| AC-010 (Congrats X routes to wine wallet) | TC-004-002-006 | ✓ |
| AC-011 (unauthenticated redirect to login/register) | TC-004

## Expected Result
# Test Plan: Wine Club Sign Up

**ID:** T-004-002
**Project:** ch-mobile
**Story:** S-004-002
**Epic:** E-004
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

This test plan verifies the four-step Wine Club sign-up flow (Club Selection → Account → Payment → Congrats), including dynamic price/benefit updates per bottle/type selection, info popup copy, more/less benefit expansion, collapsed step summaries, BluePay-embedded payment with all required fields, card-on-file selection for potential members, Terms acceptance enforcement, the Congrats toast routing, back navigation preserving data, and the unauthenticated redirect-to-login gate.

## Prerequisites

- Staging environment with BluePay sandbox configured
- Test sign-in account with no existing membership available for fresh sign-up
- Second test account that has a Card on File but no active membership (for COF selection cases)
- A guest (unauthenticated) device session for the redirect test
- API stubs reachable for `/membership/pricing`, `/customer/payment/bluepay`, `/membership/monthly`, `/customer`

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (bottle toggle updates benefits + price) | TC-004-002-001 (P0) | ✓ |
| AC-002 (club type toggle updates benefits + price) | TC-004-002-001 (P0), TC-004-002-002 | ✓ |
| AC-003 (info popup) | TC-004-002-001 (P0), TC-004-002-003 | ✓ |
| AC-004 (more/less benefit expand) | TC-004-002-001 (P0) | ✓ |
| AC-005 (Account step shows collapsed summary) | TC-004-002-001 (P0) | ✓ |
| AC-006 (Payment step BluePay fields) | TC-004-002-001 (P0) | ✓ |
| AC-007 (existing card radial + Add a Card) | TC-004-002-004 | ✓ |
| AC-008 (Terms unchecked error message) | TC-004-002-001 (P0), TC-004-002-005 | ✓ |
| AC-009 (Congrats toast with two CTAs) | TC-004-002-001 (P0) | ✓ |
| AC-010 (Congrats X routes to wine wallet) | TC-004-002-006 | ✓ |
| AC-011 (unauthenticated redirect to login/register) | TC-004

