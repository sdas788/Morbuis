---
id: TC-4.04
title: Negative – Deletion Fails (Server Error) - Negative
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
Negative – Deletion Fails (Server Error)

## Expected Result
Simulate backend failure (5xx) or deletion rejection. Confirm delete. App shows clear error and keeps user in a valid state (still logged in, account still active). No partial “ghost deleted” state; user can retry or contact support path is provided (if implemented).

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | fail |  |  |

