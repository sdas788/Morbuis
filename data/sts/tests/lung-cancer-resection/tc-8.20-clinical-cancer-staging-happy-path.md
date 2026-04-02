---
id: TC-8.20
title: Clinical Cancer Staging - Happy Path
category: lung-cancer-resection
scenario: Happy Path
status: pass
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
Clinical Cancer Staging

## Expected Result
- User enters 6 cm for Tumor size
- User sees the next question "T Stage" automatically selected as T3
- Options T1 and T2 are greyed out
- User can see OM is updated to 0.305% and M&M is updated to 5.55% with red increase arrows being displayed

