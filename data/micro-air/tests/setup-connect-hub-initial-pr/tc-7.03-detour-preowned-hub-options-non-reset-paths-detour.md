---
id: TC-7.03
title: Detour – Preowned Hub Options (Non-Reset Paths) - Detour
category: setup-connect-hub-initial-pr
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - detour
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Detour – Preowned Hub Options (Non-Reset Paths)

## Expected Result
When tethered-to-previous-owner state is detected, app presents 3 options. Verify user can select each available option and app routes correctly: (A) Factory Reset leads into reset confirmation flow; (B) other option(s) route into the correct downstream flow(s) without dead ends. No crashes, no stuck states, and user can navigate back to Dashboard/Hub Home.

