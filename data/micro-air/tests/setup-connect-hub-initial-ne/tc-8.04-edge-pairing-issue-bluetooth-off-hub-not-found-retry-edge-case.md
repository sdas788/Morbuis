---
id: TC-8.04
title: Edge – Pairing Issue (Bluetooth Off / Hub Not Found / Retry) - Edge Case
category: setup-connect-hub-initial-ne
scenario: Edge Case
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - edge-case
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Edge – Pairing Issue (Bluetooth Off / Hub Not Found / Retry)

## Expected Result
From Connect a Hub flow, simulate Bluetooth disabled or hub not discoverable/pair fails once. App shows clear warning/troubleshooting and provides Retry (and/or guidance to enable Bluetooth). After resolving and retrying, user can successfully pair and continue onboarding. No crash; no partial hub entry created.

