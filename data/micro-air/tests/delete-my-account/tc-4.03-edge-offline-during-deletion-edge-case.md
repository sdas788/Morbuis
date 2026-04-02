---
id: TC-4.03
title: Edge – Offline During Deletion - Edge Case
category: delete-my-account
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
Edge – Offline During Deletion

## Expected Result
Start logged in. Disable network before confirming deletion. Confirm delete. App shows clear failure/offline messaging and does not falsely log the user out as “deleted” (unless backend confirms). User can retry once connectivity returns and deletion completes successfully.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | fail |  |  |

