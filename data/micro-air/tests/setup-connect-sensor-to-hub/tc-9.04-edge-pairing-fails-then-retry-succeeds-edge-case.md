---
id: TC-9.04
title: Edge – Pairing Fails Then Retry Succeeds - Edge Case
category: setup-connect-sensor-to-hub
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
Edge – Pairing Fails Then Retry Succeeds

## Expected Result
Select a detected sensor but simulate pairing failure. App shows troubleshooting guidance and a Retry option. On retry (with sensor in correct mode), pairing succeeds and user sees success popover and sensor appears on Dashboard/Hub Home. No duplicate/ghost sensor entries are created.

