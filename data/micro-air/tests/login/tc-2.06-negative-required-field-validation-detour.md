---
id: TC-2.06
title: 'Negative: Required field validation - Detour'
category: login
scenario: Detour
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - detour
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Negative: Required field validation

## Expected Result
Empty email/password (or invalid email format) → validation shown → login not submitted.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

