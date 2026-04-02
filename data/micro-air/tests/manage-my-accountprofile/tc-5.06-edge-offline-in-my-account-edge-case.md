---
id: TC-5.06
title: Edge – Offline in My Account - Edge Case
category: manage-my-accountprofile
scenario: Edge Case
status: pass
priority: P2
platforms:
  - ios
  - android
tags:
  - edge-case
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Edge – Offline in My Account

## Expected Result
Disable network. Navigate to My Account. App still loads the My Account shell. Actions requiring network (profile save, password change submit, subscription webview) fail gracefully with clear offline messaging and retry path.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |
| android-tab | pass |  |  |

