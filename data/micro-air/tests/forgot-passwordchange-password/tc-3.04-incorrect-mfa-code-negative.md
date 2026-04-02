---
id: TC-3.04
title: Incorrect MFA Code - Negative
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
Incorrect MFA Code

## Expected Result
On MFA Reset screen, enter an incorrect 6-digit code with valid new password/confirm password. App shows an error and blocks submission. User remains on MFA Reset screen and can retry or resend code.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

