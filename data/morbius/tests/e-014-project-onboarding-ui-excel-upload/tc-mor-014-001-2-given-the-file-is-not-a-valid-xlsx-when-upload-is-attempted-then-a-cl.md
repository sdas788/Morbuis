---
id: TC-MOR-014-001-2
title: Given the file is not a valid .xlsx When upload is attempted Then a cl
category: e-014-project-onboarding-ui-excel-upload
scenario: Negative
status: not-run
priority: P1
platforms:
  - android
  - ios
tags:
  - s-014-001
  - e-014
created: '2026-04-28'
updated: '2026-04-28'
pmagent_source:
  slug: morbius
  story_id: S-014-001
  ac_index: 1
  source_path: >-
    /Users/sdas/Morbius/requirements/epics/E-014-project-onboarding-upload/S-014-001-drag-drop-excel-upload.md
  source_checksum: 6edb7ec7ee6e07c1
---
## Steps
1. **Setup:** the file is not a valid `.xlsx`
2. **Action:** upload is attempted
3. **Assert:** a clear error message is shown and the project is not created

## Expected Result
Given the file is not a valid `.xlsx` When upload is attempted Then a clear error message is shown and the project is not created

