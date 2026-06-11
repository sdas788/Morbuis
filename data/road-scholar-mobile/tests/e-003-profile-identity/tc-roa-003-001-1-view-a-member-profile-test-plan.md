---
id: TC-ROA-003-001-1
title: View a Member Profile — Test Plan
category: e-003-profile-identity
scenario: Happy Path
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-003-001
  - e-003
created: '2026-05-26'
updated: '2026-06-09'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-003-001
  ac_index: 0
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-003-profile-identity/T-003-001-view-profile.md
  source_checksum: 8be1548c195f0f60
---
## Steps
# Test Plan: View Profile

**ID:** T-003-001
**Story:** S-003-001
**Epic:** E-003
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the profile view screen: all profile fields are displayed according to the user's privacy settings, a user viewing their own profile always sees all fields regardless of privacy settings, privacy-hidden fields are not shown to other viewers, and an API failure shows an error state with a retry option.

## Prerequisites

- Test user with a complete profile (all fields populated) in Verint staging
- Privacy settings configured to hide at least one field for a second viewer test
- A second test account to simulate viewing another member's profile
- Verint user profile API accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (navigate to Profile → all fields shown per privacy settings) | TC-003-001-001 (P0) | ✓ |
| AC-002 (own profile → all fields visible regardless of privacy) | TC-003-001-001 (P0) | ✓ |
| AC-003 (viewing another member's hidden field → field not shown) | TC-003-001-002 | ✓ |
| AC-004 (profile API fails → error state with retry) | TC-003-001-003 | ✓ |

---

## Core Test Flow

### TC-003-001-001: Navigate to Profile — all fields displayed, own profile shows all regardless of privacy

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** TC-001-001-001

**Preconditions:**
- Authenticated test user has all profile fields populated in Verint
- At least one privacy setting is set to hidden (e.g., email hidden from others)

**Steps:**
1. Navigate to the Profile screen for the authenticated user's own profile
2. Observe all displayed fields

**Expected Result:**
All profile fields are visible (avatar, display name, bio, hobbies list, location, email, phone). The own-profile view always shows all fields regardless of privacy settings. Data is fetched from the Verint user prof

## Expected Result
# Test Plan: View Profile

**ID:** T-003-001
**Story:** S-003-001
**Epic:** E-003
**Project:** roadscholar-mobile
**Created:** 2026-03-28
**Updated:** 2026-03-28
**Version:** 1.0

---

## Scope

Verifies the profile view screen: all profile fields are displayed according to the user's privacy settings, a user viewing their own profile always sees all fields regardless of privacy settings, privacy-hidden fields are not shown to other viewers, and an API failure shows an error state with a retry option.

## Prerequisites

- Test user with a complete profile (all fields populated) in Verint staging
- Privacy settings configured to hide at least one field for a second viewer test
- A second test account to simulate viewing another member's profile
- Verint user profile API accessible in staging

## AC Coverage Map

| AC | Test Cases | Coverage |
|----|-----------|----------|
| AC-001 (navigate to Profile → all fields shown per privacy settings) | TC-003-001-001 (P0) | ✓ |
| AC-002 (own profile → all fields visible regardless of privacy) | TC-003-001-001 (P0) | ✓ |
| AC-003 (viewing another member's hidden field → field not shown) | TC-003-001-002 | ✓ |
| AC-004 (profile API fails → error state with retry) | TC-003-001-003 | ✓ |

---

## Core Test Flow

### TC-003-001-001: Navigate to Profile — all fields displayed, own profile shows all regardless of privacy

**Type:** E2E
**Priority:** P0
**AC Covered:** AC-001, AC-002
**Dependencies:** TC-001-001-001

**Preconditions:**
- Authenticated test user has all profile fields populated in Verint
- At least one privacy setting is set to hidden (e.g., email hidden from others)

**Steps:**
1. Navigate to the Profile screen for the authenticated user's own profile
2. Observe all displayed fields

**Expected Result:**
All profile fields are visible (avatar, display name, bio, hobbies list, location, email, phone). The own-profile view always shows all fields regardless of privacy settings. Data is fetched from the Verint user prof

## Changelog
| Timestamp | Field | Old Value | New Value | Actor |
|-----------|-------|-----------|-----------|-------|
| 2026-06-09T20:04:33.050Z | status | not-run | in-progress | maestro-run |
| 2026-06-09T20:04:34.681Z | status | in-progress | fail | maestro-run |

