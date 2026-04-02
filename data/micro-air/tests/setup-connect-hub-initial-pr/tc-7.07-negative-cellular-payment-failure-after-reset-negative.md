---
id: TC-7.07
title: Negative – Cellular Payment Failure After Reset - Negative
category: setup-connect-hub-initial-pr
scenario: Negative
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - negative
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Negative – Cellular Payment Failure After Reset

## Expected Result
After successful factory reset + re-pair, choose Cellular and attempt checkout with a failing payment method. App shows payment failure messaging and does not mark hub as cellular-connected. User can retry payment or back out without breaking the app state.

