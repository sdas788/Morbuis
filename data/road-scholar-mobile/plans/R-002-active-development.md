# Release: v1.5.0 Active Development

**ID:** R-002
**Project:** roadscholar-mobile
**Stage:** Ready
**Status:** Shipped
**Version:** 1.0
**Created:** 2026-03-28
**Updated:** 2026-05-23

---

## Summary

Active-development release cycle that produced v1.5.0 / v1.5.1 (February → May 2026). PR merge activity spans Jira tickets RSS-1533 through RSS-1823 — predominantly bug fixes + visual polish, with two new substantive behaviors that were reverse-engineered into PM stories. Closed out 2026-05-23.

## Stories

| ID | Title | Epic | Status |
|----|-------|------|--------|
| [S-005-003](../epics/E-005-notifications-preferences/S-005-003-pre-login-notification-queue.md) | Pre-Login Notification Queue & Cold-Start Deep Linking | E-005 | Done |
| [S-004-003](../epics/E-004-group-leader-tools/S-004-003-step-down-as-leader.md) | Step Down As Group Leader | E-004 | Done |

## Shipped Fixes (Not Story-Tracked)

The bulk of this release was bug fixes and small visual polish that didn't warrant new story tracking. Captured here as the changelog rather than discrete PM stories:

| Ticket | Summary | Touches |
|--------|---------|---------|
| RSS-1533, 1536, 1540, 1545 | Misc auth + group polish | various |
| RSS-1565 | Cleanup | various |
| RSS-1583, 1595 | Build / CI / staging build fixes | infra |
| RSS-1625, 1626, 1629, 1632, 1640 | Misc bug fixes | various |
| RSS-1645 | "Click here" navigation fix | UI |
| RSS-1649, 1650, 1652, 1653 | Misc bug fixes | various |
| RSS-1661 | Content search — return all matches | Search |
| RSS-1669 | Header inconsistencies | UI polish |
| RSS-1670 | Posting video/photos — error message cut off | Compose error UX |
| RSS-1671 | Misc fix | various |
| RSS-1673 | Search counts (likes + comments) on search results | Search |
| RSS-1676 | Version bump | infra |
| RSS-1685 | Misc fix | various |
| RSS-1686 | Notification queue + deep linking → captured as [S-005-003](../epics/E-005-notifications-preferences/S-005-003-pre-login-notification-queue.md) | Push |
| RSS-1691 | Notification icons (per-platform) | Push UI |
| RSS-1695 | Thumbnail rendering | Media |
| RSS-1697 | Newsfeed loading improvements | Feed |
| RSS-1699 | Hide block-user UI (until unblock ships) — captured in [S-002-009 Future Scope](../epics/E-002-group-community/S-002-009-report-abuse.md) | Moderation |
| RSS-1700 | Photo orientation fix | Media |
| RSS-1707 | Kotlin function mismatch (Play Store build) | infra |
| RSS-1729 | Typo fix | UI |
| RSS-1734 | Step down as group leader → captured as [S-004-003](../epics/E-004-group-leader-tools/S-004-003-step-down-as-leader.md) | Leader |
| RSS-1736 | Tag fallback | Forum |
| RSS-1744 | Home screen crash (refetch on uninit query) | Home |
| RSS-1748 | Save video error message | Compose |
| RSS-1766, 1767, 1768 | Offline mode groups + feed loading fixes (groupAccess persist → captured in [S-007-001](../epics/E-007-offline-reliability/S-007-001-offline-data-caching.md) update) | Offline |
| RSS-1781 | iOS code-signing fix | infra |
| RSS-1804 | Version bump → v1.5.1 | infra |
| RSS-1805 | Emoji rendering fix | UI |
| RSS-1806 | Header polish | UI |
| RSS-1807 | Info button fix | UI |
| RSS-1809 | Group Leader badge size | UI polish |
| RSS-1820 | Video doesn't stop on navigation away | Media |
| RSS-1821 | Deleted post not disappearing from feed | Feed |
| RSS-1822 | Offline participant-profile message → captured in [S-007-001](../epics/E-007-offline-reliability/S-007-001-offline-data-caching.md) update | Offline |
| RSS-1823 | Profile Hobbies & Interests spacing | UI polish |

## Notes

The two reverse-engineered stories (S-004-003 + S-005-003) capture the only meaningful new behaviors shipped in this cycle. All other commits are bug fixes, visual polish, or infra. The cycle effectively ended 2026-05-20 with the last merge (a5141ef RSS-1821); release closed out 2026-05-23 as engineering moved focus to R-003 (QA automation).

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-03-28 | 1.0 | — | Reverse-engineered from git tag history; scope TBD |
| 2026-05-23 | 1.0 | PM Agent | Closed out — added S-005-003 + S-004-003 (the two reverse-engineered stories from this cycle) + documented the 30+ shipped bug-fix tickets as a changelog. Stage Draft → Ready, Status In Progress → Shipped. |
