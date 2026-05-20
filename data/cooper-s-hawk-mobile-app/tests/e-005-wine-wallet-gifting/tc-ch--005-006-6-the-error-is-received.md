---
id: TC-CH--005-006-6
title: The error is received
category: e-005-wine-wallet-gifting
scenario: Negative
status: not-run
priority: P3
platforms:
  - android
  - ios
tags:
  - s-005-006
  - e-005
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-005-006
  ac_index: 5
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-005-wine-wallet-gifting/S-005-006-browse-our-wines.md
  source_checksum: 84bc1a97890ff8ca
---
## Steps
1. **Setup:** the CMS API request fails
2. **Action:** the error is received
3. **Assert:** an error message with retry is displayed

## Expected Result
Given the CMS API request fails, when the error is received, then an error message with retry is displayed

