---
id: TC-4.05
title: Negative – Post-Deletion Access Blocked - Negative
category: delete-my-account
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
Negative – Post-Deletion Access Blocked

## Expected Result
After successful deletion (4.01), attempt to log in again using the deleted account credentials. Login is blocked with appropriate messaging (generic if needed for security). User cannot access Dashboard/Hub Home.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | fail |  |  |

