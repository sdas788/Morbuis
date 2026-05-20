---
id: TC-CH--005-002-6
title: The popup opens
category: e-005-wine-wallet-gifting
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-005-002
  - e-005
created: '2026-05-08'
updated: '2026-05-08'
pmagent_source:
  slug: ch-mobile
  story_id: S-005-002
  ac_index: 5
  source_path: >-
    /Users/sdas/ch-mobile-requirements/epics/E-005-wine-wallet-gifting/S-005-002-bottle-detail.md
  source_checksum: 786c905366fcf6bb
---
## Steps
1. **Setup:** insiderGifting is false or the user is a guest/potential member
2. **Action:** the popup opens
3. **Assert:** "Send a Bottle" button is hidden

## Expected Result
Given insiderGifting is false or the user is a guest/potential member, when the popup opens, then "Send a Bottle" button is hidden

