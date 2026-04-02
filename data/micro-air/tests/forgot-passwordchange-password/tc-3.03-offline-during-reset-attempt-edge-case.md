---
id: TC-3.03
title: Offline During Reset Attempt - Edge Case
category: forgot-passwordchange-password
scenario: Edge Case
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - edge-case
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Offline During Reset Attempt

## Expected Result
Disable network either (A) before submitting email on Forgot Password screen or (B) before submitting on MFA Reset screen. App shows clear offline messaging and prevents completion. Once network is restored, user can retry and successfully complete reset without app crash or stuck state.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

