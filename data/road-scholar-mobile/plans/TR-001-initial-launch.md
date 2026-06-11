# Release Test Plan: v1.0.0 Initial Launch

**ID:** TR-001
**Project:** roadscholar-mobile
**Release:** R-001
**Version:** 1.0
**Created:** 2026-03-28
**Updated:** 2026-03-28

---

## Release Goal

Validate the full baseline feature set shipped in the October 2024 App Store release, covering authentication, group community, profile, notifications, offline resilience, and settings across all 28 stories.

## Coverage Summary

| Story | Title | Test Plan | P1 | P2 | P3 | Gap |
|-------|-------|-----------|----|----|----|----|
| S-001-001 | Salesforce SSO Login | T-001-001 ✓ | 4 | 3 | 1 | — |
| S-001-002 | Biometric Authentication | T-001-002 ✓ | 3 | 2 | 1 | — |
| S-001-003 | Welcome Onboarding | T-001-003 ✓ | 3 | 2 | 1 | — |
| S-001-004 | Push Notification Permission | T-001-004 ✓ | 2 | 2 | 1 | — |
| S-002-001 | Group List (Home Screen) | T-002-001 ✓ | 3 | 2 | 1 | — |
| S-002-002 | Group Details & Forum | T-002-002 ✓ | 4 | 2 | 1 | — |
| S-002-003 | Create Post | T-002-003 ✓ | 4 | 3 | 1 | — |
| S-002-004 | Edit & Delete Post | T-002-004 ✓ | 4 | 2 | 1 | — |
| S-002-005 | Comments & Replies | T-002-005 ✓ | 3 | 2 | 1 | — |
| S-002-006 | Likes | T-002-006 ✓ | 3 | 2 | 1 | — |
| S-002-007 | Mentions | T-002-007 ✓ | 3 | 2 | 1 | — |
| S-002-008 | Media Gallery | T-002-008 ✓ | 3 | 2 | 1 | — |
| S-002-009 | Report Abuse | T-002-009 ✓ | 2 | 2 | 1 | — |
| S-003-001 | View Profile | T-003-001 ✓ | 2 | 2 | 1 | — |
| S-003-002 | Edit Profile | T-003-002 ✓ | 3 | 2 | 1 | — |
| S-003-003 | Edit Hobbies | T-003-003 ✓ | 2 | 2 | 1 | — |
| S-003-004 | Privacy Settings | T-003-004 ✓ | 3 | 2 | 1 | — |
| S-004-001 | Search & Join Group | T-004-001 ✓ | 3 | 2 | 1 | — |
| S-004-002 | Group Leader Trips | T-004-002 ✓ | 3 | 2 | 1 | — |
| S-005-001 | Push Notification Delivery | T-005-001 ✓ | 3 | 2 | 1 | — |
| S-005-002 | Notification Preferences | T-005-002 ✓ | 2 | 2 | 1 | — |
| S-006-001 | Program Summary Display | T-006-001 ✓ | 2 | 2 | 1 | — |
| S-006-002 | In-App Browser | T-006-002 ✓ | 2 | 2 | 1 | — |
| S-007-001 | Offline Data Caching | T-007-001 ✓ | 3 | 2 | 1 | — |
| S-007-002 | Offline Like Queue | T-007-002 ✓ | 3 | 3 | 1 | — |
| S-007-003 | Network Status & Recovery | T-007-003 ✓ | 3 | 2 | 1 | — |
| S-007-004 | Forced Update Check | T-007-004 ✓ | 2 | 2 | 1 | — |
| S-008-001 | Settings Screen | T-008-001 ✓ | 2 | 2 | 1 | — |

**Total:** 79 P1 cases, 60 P2 cases, 28 P3 cases across 28 stories.

---

## Integration Test Cases

Cross-story E2E scenarios that can only be tested once all dependent stories are Done.

> Integration test case IDs: `ITC-{releaseNum}-{caseNum}` — globally unique and traceable to source release.

### ITC-001-001: First-time user — Login → Onboarding → Home → View Group

**Stories Covered:** S-001-001, S-001-002, S-001-003, S-001-004, S-002-001, S-002-002
**Priority:** P1

**Preconditions:**
- All listed stories are Done and deployed to the test environment
- Test account exists in Salesforce with valid SSO credentials
- Device has no prior app session (fresh install or cleared app data)
- Device supports Face ID / Touch ID

**Steps:**
1. Launch the app on a fresh install; the Login screen appears
2. Tap "Sign in with Road Scholar" — Salesforce SSO web view opens
3. Enter valid credentials and complete SSO; app receives the auth token
4. Biometric enrollment prompt appears — enroll Face ID / Touch ID
5. Welcome onboarding carousel displays (3 screens); swipe through to complete
6. Push notification permission system prompt appears; tap "Allow"
7. Home screen loads with the user's group list from Verint
8. Tap a group card — Group Details & Forum screen opens with posts visible

**Expected Result:**
User lands on a fully loaded Group Details screen, authenticated, with notifications enabled and onboarding complete. Subsequent app launches skip onboarding and go directly to Home.

**Failure Indicators:**
- SSO redirect loop or token not stored (S-001-001 integration failure)
- Biometric prompt never appears after first login (S-001-002 failure)
- Onboarding re-shows on second launch (S-001-003 state not persisted)
- Home group list empty or spinner does not resolve (S-002-001 API failure)

---

### ITC-001-002: Post lifecycle — Create Post → Edit → Delete (with media)

**Stories Covered:** S-002-003, S-002-004, S-002-008
**Priority:** P1

**Preconditions:**
- All listed stories are Done and deployed to the test environment
- User is authenticated and on the Group Details screen of a group they are a member of
- Device camera roll contains at least one image

**Steps:**
1. Tap the compose button on the Group Details screen
2. Enter post body text and attach one image from the camera roll
3. Submit the post — post appears at the top of the forum feed with the image thumbnail
4. Tap the post overflow menu → select "Edit"
5. Modify the post body text and save — feed reflects the updated text
6. Tap the post overflow menu again → select "Delete"
7. Confirm deletion in the confirmation dialog
8. Verify the post no longer appears in the feed

**Expected Result:**
Post is created with media, appears in the feed, can be edited in place, and is fully removed after deletion with no orphaned media references.

**Failure Indicators:**
- Image fails to upload or appears broken in the feed (S-002-008 / S-002-003 integration failure)
- Edit saves but feed still shows old content (cache invalidation failure)
- Delete confirmation completes but post reappears on pull-to-refresh (Verint API delete not reflected)

---

### ITC-001-003: Engagement loop — View Thread → Like → Reply → @Mention → Notification received

**Stories Covered:** S-002-002, S-002-005, S-002-006, S-002-007, S-005-001
**Priority:** P1

**Preconditions:**
- All listed stories are Done and deployed to the test environment
- Two test accounts available: User A (actor) and User B (mention target, notifications enabled)
- Both users are members of the same group
- An existing post is visible in the group forum

**Steps:**
1. Log in as User A; navigate to the group forum and open an existing post
2. Tap the Like button on the post — like count increments by 1
3. Tap the Reply button — comment composer opens
4. Type a reply including `@UserB` — the mention autocomplete suggests User B's display name
5. Select User B from the autocomplete and submit the reply
6. Reply appears in the comment thread with User B's name highlighted as a mention
7. Switch to User B's device (or account) — a push notification for the mention is received
8. Tap the notification — app opens directly to the post thread

**Expected Result:**
User A's like and reply are persisted. User B receives a push notification for the @mention and the deep link routes to the correct thread.

**Failure Indicators:**
- Like count does not update or reverts on refresh (S-002-006 API round-trip failure)
- @Mention autocomplete does not surface User B (S-002-007 member search failure)
- Push notification not delivered to User B within 30 seconds (S-005-001 APNs integration failure)
- Notification deep link opens Home instead of the thread (S-005-001 routing failure)

---

### ITC-001-004: Offline resilience — Cache → Go offline → Browse → Like (queued) → Reconnect → Sync

**Stories Covered:** S-007-001, S-007-002, S-007-003, S-002-006
**Priority:** P1

**Preconditions:**
- All listed stories are Done and deployed to the test environment
- User is authenticated and has visited the Home screen and at least one Group Details screen while online (cache populated)
- Device can be set to airplane mode

**Steps:**
1. While online, open the app and navigate Home → Group Details to populate the cache
2. Enable airplane mode on the device
3. The network status banner appears indicating offline mode
4. Browse the cached group list on Home — content is visible without a loading error
5. Open the cached Group Details screen — posts are visible from cache
6. Tap Like on a post — like appears to succeed locally; a queued-sync indicator is present
7. Disable airplane mode — network reconnects
8. The network status banner dismisses and the app syncs
9. Verify the Like is now reflected on the server (refresh or second device check)

**Expected Result:**
Cached content is browsable offline. The like is queued, synced on reconnection, and the optimistic update matches the server state after sync. No duplicate likes.

**Failure Indicators:**
- Home or Group Details shows empty/error state while offline (S-007-001 cache miss)
- Like does not queue and is silently dropped (S-007-002 queue failure)
- Network reconnection does not trigger sync automatically (S-007-003 reachability failure)
- Like is sent twice (duplicate queued operation on reconnect)

---

### ITC-001-005: Group leader flow — Login → Search group → Join → View trips

**Stories Covered:** S-001-001, S-004-001, S-004-002
**Priority:** P2

**Preconditions:**
- All listed stories are Done and deployed to the test environment
- Test account is a designated group leader in Verint with at least one associated trip in Salesforce
- The group is not pre-joined (or test with a secondary group the leader can join)

**Steps:**
1. Log in with the group leader's Salesforce SSO credentials
2. Navigate to the group search screen from the Home screen
3. Search for the leader's group by name — result appears in the list
4. Tap the group and confirm the "Join" action
5. Group appears in the Home group list
6. Open the group — the "Trips" tab or section is visible (leader-only surface)
7. Tap "Trips" — the program summary / trip list for this group loads from Salesforce

**Expected Result:**
Group leader can find and join a group, and the Trips tab displays their associated trip data correctly sourced from Salesforce via the Road Scholar API.

**Failure Indicators:**
- Search returns no results for a valid group name (S-004-001 Verint search failure)
- Join succeeds but group does not appear on Home (state sync failure)
- Trips tab is not visible for the leader account (role-gate failure in S-004-002)
- Trip data is empty or shows an API error (S-004-002 / Salesforce data integration failure)

---

### ITC-001-006: Profile management — Edit profile → Change avatar → Update hobbies → Adjust privacy

**Stories Covered:** S-003-001, S-003-002, S-003-003, S-003-004
**Priority:** P2

**Preconditions:**
- All listed stories are Done and deployed to the test environment
- User is authenticated
- Device camera roll contains at least one image for avatar update

**Steps:**
1. Navigate to the Profile screen — display name, bio, avatar, and hobbies are visible
2. Tap "Edit Profile" — edit form opens prepopulated with current values
3. Change the display name and bio; save — Profile screen reflects updated values
4. Tap the avatar — image picker opens; select a photo from camera roll
5. Avatar updates on the Profile screen and in the group forum post headers
6. Tap "Edit Hobbies" — hobby selector opens; add two new hobbies and save
7. Hobbies list on the Profile screen reflects the additions
8. Navigate to Privacy Settings; toggle "Hide profile from non-members" on
9. Log in as a second test account that is not a group member; attempt to view the first user's profile — profile is not accessible or shows limited view

**Expected Result:**
All profile edits persist across screens. Avatar change propagates to forum views. Privacy toggle enforces visibility restriction for non-members.

**Failure Indicators:**
- Profile edits do not persist after navigating away (S-003-002 save failure)
- Avatar update succeeds locally but reverts on next app launch (S-003-002 upload or cache issue)
- Hobby changes not reflected on the Profile screen (S-003-003 state sync failure)
- Privacy toggle has no effect — profile visible to non-members (S-003-004 enforcement failure)

---

## Go / No-Go Criteria

All of the following must be true before this release ships:

- [ ] All P1 test cases pass across all 28 story test plans
- [ ] All integration test cases ITC-001-001 through ITC-001-006 pass
- [ ] No open P1 or P2 defects without an accepted workaround
- [ ] All 28 included stories are `Stage: Ready` and `Status: Done`
- [ ] Push notification delivery verified end-to-end on both iOS physical devices (APNs — no simulator)
- [ ] Offline sync tested on device with real network toggle (not simulator network conditioning)
- [ ] Salesforce SSO verified against production-equivalent identity provider (not mock)
- [ ] App passes App Store Review submission checklist (no rejected binary artifacts)

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Salesforce SSO token refresh failure on session expiry | Medium | High | Test with expired-token simulation; verify refresh flow in S-001-001 AC |
| APNs delivery delays on physical device in test env | Medium | High | Use staging APNs certificate; allow 60s window; flag if >30s in ITC-001-003 |
| Verint API rate limiting during integration test runs | Low | Medium | Stagger ITC runs; confirm test account is not rate-limited |
| Offline like queue sending duplicates on reconnect | Low | High | ITC-001-004 step 9 explicitly checks for duplicate; block on any recurrence |
| Biometric enrollment state lost on OS upgrade during QA | Low | Medium | Re-enroll before running ITC-001-001; document in test setup |
| Media upload fails on slow/cellular network | Medium | Medium | Test ITC-001-002 on cellular as well as WiFi; confirm timeout handling |

## Known Gaps

- Performance / load testing not covered — deferred; see Future Scope in E-002 and E-007
- Accessibility (VoiceOver / TalkBack) audit not included in story-level test plans — recommend a dedicated accessibility pass post-launch
- Android-specific UI rendering not explicitly separated from iOS test cases — all test plans are platform-agnostic; physical Android device run recommended before shipping
- Deep link routing tested only via notification tap (ITC-001-003); direct URL scheme deep link testing not included in this plan

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-03-28 | 1.0 | — | Created — reverse-engineering complete, baseline release |
