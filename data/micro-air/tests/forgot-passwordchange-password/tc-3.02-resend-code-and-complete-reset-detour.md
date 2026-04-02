---
id: TC-3.02
title: Resend Code and Complete Reset - Detour
category: forgot-passwordchange-password
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
Resend Code and Complete Reset

## Expected Result
From MFA Reset screen, tap Resend code (if available). Use the newest email code to complete reset successfully. User lands on Dashboard/Hub Home logged in. App does not accept an invalid/old code if policy requires the latest code.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

