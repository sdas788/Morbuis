---
id: TC-6.06
title: Negative – Cellular Payment Failure - Negative
category: setup-connect-hub-2
scenario: Negative
status: in-progress
priority: P2
platforms:
  - ios
tags:
  - negative
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Negative – Cellular Payment Failure

## Expected Result
Choose Cellular path and attempt checkout with a failing payment method. App shows payment failure messaging and provides retry/cancel path. Hub is not incorrectly marked as cellular-connected. User can retry payment or switch to Wi-Fi (if supported) without breaking the flow.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |

## Notes
Test passed
