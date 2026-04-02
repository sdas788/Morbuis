---
id: TC-6.07
title: Negative – Firmware Update Failure / Hub Doesn’t Come Back Online - Negative
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
Negative – Firmware Update Failure / Hub Doesn’t Come Back Online

## Expected Result
Reach firmware upgrade required screen and initiate update. Simulate update failure or hub not returning online within expected time. App exits waiting state to a failure message and provides clear next steps (retry update / return to dashboard). Hub remains usable at prior version (if applicable) and app does not brick the dashboard or hub list.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |

## Notes
Test passed
