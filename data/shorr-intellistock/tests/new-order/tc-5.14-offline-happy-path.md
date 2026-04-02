---
id: TC-5.14
title: Offline - Happy Path
category: new-order
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - happy-path
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Offline

## Expected Result
If user is offline, they are unable to submit orders. A pop up should display to user telling them they are offline with option to return to dashboard.  
Ensure user is redirected to the dashboard.
Ensure when user returns online, any in progress order QTYs are saved and prompted to proceed or reset.

