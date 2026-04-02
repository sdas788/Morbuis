---
id: TC-6.02
title: Detour – Add 2nd+ Hub via Cellular (Plan + Payment Success) - Detour
category: setup-connect-hub-2
scenario: Detour
status: in-progress
priority: P2
platforms:
  - ios
tags:
  - detour
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Detour – Add 2nd+ Hub via Cellular (Plan + Payment Success)

## Expected Result
Precondition: user has 1+ hub already. Start add hub flow → pair successfully. Choose Cellular provisioning. User is shown cellular capabilities + Subscription/Pricing + TOS. User selects a plan and completes payment via credit card checkout (Stripe-like). Payment succeeds and subscription success screen displays. Hub proceeds to connectivity complete state and continues to firmware screen (if required) and customization. User lands on Dashboard/Hub Home with new hub connected and selectable.

## Device Results
| Device | Status | Run | Timestamp |
|--------|--------|-----|----------|
| iphone | pass |  |  |

## Notes
Added HUB Max-Test for Staging Account 
User name: - f5qcb@dollicons.com
PW:- Qwer1234!
hub added with perfect flow and Hub added succuesfully, for IOS, 2 Hub already connected and it was added
