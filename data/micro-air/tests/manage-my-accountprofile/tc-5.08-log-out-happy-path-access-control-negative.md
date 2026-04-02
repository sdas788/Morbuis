---
id: TC-5.08
title: Log Out – Happy Path + Access Control - Negative
category: manage-my-accountprofile
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
Log Out – Happy Path + Access Control

## Expected Result
From My Account tap Log Out and confirm if prompted. User is returned to Welcome/Login. Attempt to access authenticated screens via back navigation or deep links is blocked and user is redirected to Login.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

