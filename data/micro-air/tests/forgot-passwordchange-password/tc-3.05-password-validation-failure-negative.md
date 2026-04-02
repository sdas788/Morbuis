---
id: TC-3.05
title: Password Validation Failure - Negative
category: forgot-passwordchange-password
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
Password Validation Failure

## Expected Result
On MFA Reset screen, enter a password that fails policy (or Confirm Password mismatch). App shows password policy/mismatch messaging and blocks submission. User can correct and proceed.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

