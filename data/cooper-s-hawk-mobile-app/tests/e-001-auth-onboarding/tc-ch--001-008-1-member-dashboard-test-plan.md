---
id: TC-CH--001-008-1
title: Member Dashboard — Test Plan
category: e-001-auth-onboarding
scenario: Edge Case
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-001-008
  - e-001
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-001-008
  ac_index: 0
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-001-auth-onboarding/T-001-008-member-dashboard.md
  source_checksum: 2401348d0a0e1682
---
## Steps
# Test Plan: Member Dashboard

**ID:** T-001-008
**Project:** ch-mobile
**Story:** S-001-008
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that the member dashboard renders the correct personalised greeting, primary action area (Make a Reservation tile with preferred-location context, info + edit icons), the More to Explore section with member vs potential-member variants and the `insiderGifting` flag, the marketing Carousel (medium + large via CMS), the scroll-driven top-bar opacity transition, the geolocation grab, and the analytics + open-tickets behavior for guests vs non-guests.

## Prerequisites

- Authenticated test members:
  - `qa-dash-pref@chwinery.test` — has a preferred location set, `insiderGifting: true`
  - `qa-dash-nopref@chwinery.test` — no preferred location, `insiderGifting: false`
  - `qa-dash-potential@chwinery.test` — Potential Member (not yet a Wine Club member)
- Guest entry available (Continue as Guest from Initial)
- CMS fixtures from S-001-007 active so marketing tiles render
- Locations endpoint warm with at least 3 locations (so GPS fallback path is testable)
- Firebase staging project for analytics event verification (DebugView)
- Device with location services available (or simulator with a custom GPS location set)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Personalised greeting) | TC-001-008-001 (P0) | ✓ |
| AC-002 (Preferred location → Make a Reservation tile shows location + icons) | TC-001-008-001 (P0) | ✓ |
| AC-003 (No preferred location → tile without location reference) | TC-001-008-002 | ✓ |
| AC-004 (Scroll past hero → top bar transparent → opaque) | TC-001-008-001 (P0), TC-001-008-003 | ✓ |
| AC-005 (Member with insiderGifting=true → "Send a Bottle") | TC-001-008-001 (P0) | ✓ |
| AC-006 (Potential member → "Check out the Wine Club") | TC-001-008-004 | ✓ |
| AC-007 (Guest → analytics event + no open-che

## Expected Result
# Test Plan: Member Dashboard

**ID:** T-001-008
**Project:** ch-mobile
**Story:** S-001-008
**Epic:** E-001
**Stage:** Draft
**Version:** 1.0
**Created:** 2026-05-06
**Updated:** 2026-05-06

---

## Scope

Validate that the member dashboard renders the correct personalised greeting, primary action area (Make a Reservation tile with preferred-location context, info + edit icons), the More to Explore section with member vs potential-member variants and the `insiderGifting` flag, the marketing Carousel (medium + large via CMS), the scroll-driven top-bar opacity transition, the geolocation grab, and the analytics + open-tickets behavior for guests vs non-guests.

## Prerequisites

- Authenticated test members:
  - `qa-dash-pref@chwinery.test` — has a preferred location set, `insiderGifting: true`
  - `qa-dash-nopref@chwinery.test` — no preferred location, `insiderGifting: false`
  - `qa-dash-potential@chwinery.test` — Potential Member (not yet a Wine Club member)
- Guest entry available (Continue as Guest from Initial)
- CMS fixtures from S-001-007 active so marketing tiles render
- Locations endpoint warm with at least 3 locations (so GPS fallback path is testable)
- Firebase staging project for analytics event verification (DebugView)
- Device with location services available (or simulator with a custom GPS location set)

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (Personalised greeting) | TC-001-008-001 (P0) | ✓ |
| AC-002 (Preferred location → Make a Reservation tile shows location + icons) | TC-001-008-001 (P0) | ✓ |
| AC-003 (No preferred location → tile without location reference) | TC-001-008-002 | ✓ |
| AC-004 (Scroll past hero → top bar transparent → opaque) | TC-001-008-001 (P0), TC-001-008-003 | ✓ |
| AC-005 (Member with insiderGifting=true → "Send a Bottle") | TC-001-008-001 (P0) | ✓ |
| AC-006 (Potential member → "Check out the Wine Club") | TC-001-008-004 | ✓ |
| AC-007 (Guest → analytics event + no open-che

