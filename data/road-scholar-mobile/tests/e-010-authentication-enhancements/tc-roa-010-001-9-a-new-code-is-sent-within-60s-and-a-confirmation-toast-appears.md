---
id: TC-ROA-010-001-9
title: A new code is sent within 60s and a confirmation toast appears
category: e-010-authentication-enhancements
scenario: Detour
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - s-010-001
  - e-010
created: '2026-06-05'
updated: '2026-06-08'
pmagent_source:
  slug: roadscholar-mobile
  story_id: S-010-001
  ac_index: 8
  source_path: >-
    /Users/sdas/roadscholar-req/roadscholar-mobile-requirements/epics/E-010-authentication-enhancements/S-010-001-native-reset-password.md
  source_checksum: d86d6010ba3f2efb
---
## Steps
1. **Setup:** a participant is on the code entry screen
2. **Action:** they tap *Resend code*
3. **Assert:** a new code is sent within 60s and a confirmation toast appears

## Expected Result
**TC-010-001-009** Given a participant is on the code entry screen, when they tap *Resend code*, then a new code is sent within 60s and a confirmation toast appears

