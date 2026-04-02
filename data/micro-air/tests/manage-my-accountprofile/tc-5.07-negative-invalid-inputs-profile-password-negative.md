---
id: TC-5.07
title: Negative – Invalid Inputs (Profile + Password) - Negative
category: manage-my-accountprofile
scenario: Negative
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - negative
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Negative – Invalid Inputs (Profile + Password)

## Expected Result
Profile: enter invalid formats (e.g., malformed phone if validated) and attempt Save → validation blocks with clear error. Password: new password fails policy or confirm mismatch → blocked with clear messaging; no password is changed.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

