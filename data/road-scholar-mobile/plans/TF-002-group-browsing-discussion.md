# Flow Test Plan: Group Browsing & Discussion

**ID:** TF-002
**Project:** roadscholar-mobile
**Flow:** [UF-002 Group Browsing & Discussion](../flows/UF-002-group-browsing-discussion.md)
**Type:** Flow regression — evergreen, re-run every release + nightly
**Stage:** Active
**Version:** 2.0
**Created:** 2026-05-19
**Updated:** 2026-05-19
**Owner:** QA Agent (curated by PM)
**Style:** Journeys (continuous end-to-end Maestro flows)

> **What this document is.** A small set of **continuous user journeys** that, between them, exercise every story under this flow. Each journey is one believable user session — not a list of isolated test cases. The QA agent implements each journey as **one** Maestro flow, not N.
>
> **Why journeys instead of FC cases.** This is the daily engagement loop. Participants don't open the app to "test the like button" — they read, react, post, scroll, browse, return. A journey models that real session shape. State continuity across read → react → write → manage → exit is part of what we're testing; resetting state between each AC defeats the purpose.
>
> **Coverage discipline.** Each journey lists exactly which ACs it verifies along the way. The coverage matrix at the bottom proves every AC is hit across all journeys.

---

## Scope

The core engagement loop: Home → Group Details → reading the forum → reacting (like, reply) → composing (new post, edit, delete) → media gallery → group members → external links (in-app browser) → push-notification deep-links → returning to the feed.

**In scope:**
- Read paths + write paths
- Optimistic UI (like toggle, post submission)
- Media handling (attach, upload, gallery view, full-screen image)
- Context Menu permission gating (own vs others' content)
- In-app browser hand-off and return
- Cross-tab navigation within Group Details (Discussion / Media / Members)
- Push notification deep-links
- @mention autocomplete + tagging
- App backgrounding mid-compose
- Connectivity loss during a write
- Multi-action write stress

**Out of scope:**
- Login + onboarding to reach Home (TF-001)
- Group leader trip-finding (UF-004 — no TF)
- Profile editing (TF-003)
- Salesforce-side content moderation review (out of mobile-app scope)

## Lifecycle & Cadence

| Trigger | Action | Pass criteria |
|---------|--------|---------------|
| **Pre-release** | Run all journeys end-to-end on the release candidate build | All journeys complete successfully |
| **Pre-ship (R-NNN Shipped)** | Re-run all journeys on production build | All complete |
| **Nightly (post-launch)** | Run all journeys against production | Failures alert QA channel; ≥2 consecutive nightly fails escalate to PM |
| **After any BUG fix lands on a touched story** | Re-run any journey whose Stories Covered list includes the BUG's story | Targeted journey passes |
| **Flow diff** | When UF-002 changes materially, bump TF-002 version and update affected journeys | Plan stays in sync with the flow |

The QA Agent records every run in the [Run Log](#run-log).

## How to read a journey

Same structure as TF-001 / TF-003: Title → Story arc → Stories covered + ACs → Preconditions → numbered steps with `✓ Verify:` checkpoints → Alt branches → Failure indicators.

---

## Journey A — Read & react: catch up on the forum and engage

**Story arc:** A participant lands on Home, dives into their main trip group, scrolls the feed, opens a post to read the full thread, likes it, taps the Liked By count to see who else liked it, replies to the thread, and likes their own reply. This is the daily read-and-react loop — the most common session shape.

**Stories covered:** S-002-001, S-002-002, S-002-005, S-002-006, S-006-001
**ACs hit inline:** Group list display, Group Details forum render, Post Detail open + reply thread, Like + unlike optimistic UI, Liked By modal, Program info display
**T-NNN backup (don't re-run):** T-002-001, T-002-002, T-002-005, T-002-006 — covered by this journey at the flow level

**Preconditions:**
- Authenticated session on Home
- User enrolled in ≥ 1 trip group containing ≥ 5 posts, where the most recent post has ≥ 2 likes and ≥ 1 reply
- User has not previously liked the most recent post

**The journey:**

1. From Home, ✓ Verify: enrolled trip groups render as cards within 2s with group name + program number + dates.
2. Tap the test group card.
3. ✓ Verify: **Group Details** loads within 2s with trip header, program summary section (S-006-001), and Discussion list.
4. Scroll through the Discussion list, scrolling past the top 5 posts.
5. Tap the most recent post (the one with likes + replies).
6. ✓ Verify: **Post Detail modal** opens within 1s. Full post body, author avatar + name + timestamp, like count, reply count, and full reply thread render.
7. ✓ Verify: Replies are threaded beneath the post with the same structure (avatar + author + body + timestamp).
8. Tap the **Like** button on the post.
9. ✓ Verify: Like count increments by 1 within 100ms (optimistic UI) and the icon state toggles (outline → filled).
10. Tap the **Liked By count** link.
11. ✓ Verify: **Liked By modal** opens showing the list of users (avatar + display name). Like count in header matches the post's like count.
12. Dismiss the Liked By modal.
13. ✓ Verify: Returns to Post Detail with state preserved — like still counted, like icon still filled.
14. Tap into the Reply input field.
15. Type a short reply ("Looking forward to this trip!").
16. Submit the reply.
17. ✓ Verify: Reply appears at the bottom of the thread within 2s (optimistic UI). Reply count on the parent post increments.
18. Tap the **Like** button on your own newly-posted reply.
19. ✓ Verify: Own reply's like count increments. (Confirms self-like is allowed by the system — verify with design if this is the intended behavior; if not, an inline rejection must be shown.)
20. Tap back / dismiss to return to Group Details.
21. ✓ Verify: Discussion list shows the post you interacted with at top, with updated like + reply counts matching what you saw in Post Detail.
22. Tap back to Home.
23. ✓ Verify: Group card may show a "you have N new" indicator or unchanged state (per design).

**Alt branch — unlike:** At step 9, immediately tap Like again. ✓ Verify: count decrements by 1, icon reverts to outline. Server eventually agrees (verify by pull-to-refresh or navigate away and back). Rapid double-tap doesn't desync state.

**Alt branch — rapid like spam:** At step 8, tap Like 10 times rapidly. ✓ Verify: final state matches an odd or even count change (debounce / last-write-wins), no count drift beyond ±1.

**Failure indicators:**
- Post Detail loads with empty body or no replies (data-fetch race)
- Reply count fails to increment on the parent post preview (counts desync between Post Detail and Group Details)
- Optimistic reply gets removed on server confirm (rollback when server actually accepted — false-negative regression)
- Like count drifts (e.g. +2 instead of +1)
- Liked By modal header count mismatches the post's like count

---

## Journey B — Compose & manage own content: post, reply, edit, delete

**Story arc:** A participant opens their trip group and decides to start a new conversation. They compose a new post with a photo, return to the feed to see it appear, open it, reply to themselves to add context, edit the reply to fix a typo, then delete the reply. Finally they delete the original post too. This exercises the entire write loop — create, edit, delete — through the lens of one continuous composition session.

**Stories covered:** S-002-003, S-002-004, S-002-005, S-002-007, S-002-008
**ACs hit inline:** New Post compose + submit, media attach + chunked upload, Edit Post, Delete with cancel + confirm paths, Reply, @mention (alt branch), photo permission gate (alt branch)
**T-NNN backup:** T-002-003, T-002-004, T-002-005, T-002-007, T-002-008 — covered

**Preconditions:**
- Authenticated, on Home, with at least one trip group the user is a member of
- Device photo library has a test photo
- Photo library permission status: not yet determined (or already granted — both fine; the alt branch handles deny)

**The journey:**

1. Tap into the test group from Home → ✓ Verify: Group Details renders.
2. Tap the **New Post** action.
3. ✓ Verify: New Post modal opens within 500ms with text input + media attach button + disabled Post button.
4. Type "Anyone else flying in early? Posting a few photos from the layover later." into the text field.
5. ✓ Verify: Post button enables now that content is present.
6. Tap the media attach button.
7. ✓ Verify: Photo permission OS prompt appears (in-context, just-in-time). Grant.
8. Select the test photo.
9. ✓ Verify: Photo appears as a thumbnail in the compose modal.
10. Tap **Post**.
11. ✓ Verify: Modal dismisses to Group Details. New post appears at the top of Discussion list within 2s with optimistic UI (the photo may show a brief upload indicator).
12. Wait up to 10s for chunked upload to complete.
13. ✓ Verify: Photo renders fully on the post; no broken-image icon.
14. Navigate to the **Media** tab.
15. ✓ Verify: The newly-uploaded photo appears in the Media Gallery grid (Media cache invalidated correctly).
16. Tap back to **Discussion** tab → tap the new post.
17. ✓ Verify: Post Detail opens with body, photo, no replies yet.
18. Tap Reply, type "Heads up — I land at 2pm on the 12th.", submit.
19. ✓ Verify: Reply appears in the thread within 2s.
20. Long-press the reply you just posted.
21. ✓ Verify: **Context Menu popover** shows Edit + Delete + Cancel (NO Report — own content).
22. Tap **Edit**.
23. ✓ Verify: Edit Post modal opens with the reply body pre-populated.
24. Change "2pm" to "2:30pm", tap Save.
25. ✓ Verify: Post Detail returns with the updated reply body. An "edited" indicator may appear per design.
26. Long-press the edited reply again → tap **Delete** on the Context Menu.
27. ✓ Verify: Delete Confirmation modal appears.
28. Tap **Cancel**.
29. ✓ Verify: Modal dismisses; reply still present.
30. Long-press the reply again → Delete → tap **Confirm**.
31. ✓ Verify: Reply removed from the thread within 2s.
32. Long-press the original post → Delete → Confirm.
33. ✓ Verify: Post Detail dismisses to Group Details. The post is gone from the Discussion list.
34. Navigate to Media tab.
35. ✓ Verify: The photo that was attached to the deleted post is also gone from Media Gallery (or shown as a "post removed" placeholder per design intent — both acceptable; flag for PM if it stays orphaned).

**Alt branch — photo permission denied:** At step 7, deny photo permission. ✓ Verify: a clear inline message in the compose modal explains the photo picker is unavailable. Composing text-only post still works. Tapping the attach button again on iOS routes to OS Settings (system-enforced behavior).

**Alt branch — @mention:** At step 4, type "@" followed by 2 characters of another group member's name. ✓ Verify: autocomplete appears within 500ms. Tap a suggestion → mention inserts as a styled token, visually distinct from regular text. Submit → mention renders as a tappable element on the resulting post.

**Alt branch — offline during upload:** Between step 10 (tap Post) and step 12 (upload complete), enable airplane mode. ✓ Verify behavior matches the E-007 Offline Reliability contract (queue-and-retry OR clear error with Retry button — see Open Questions). No silent failure where the post never makes it server-side. No duplicate post when connectivity returns.

**Failure indicators:**
- Post button enables on empty body (would allow garbage posts)
- New post appears twice (optimistic + server, both kept — dedupe failure)
- Photo upload completes but Media Gallery doesn't include it (cache invalidation regression)
- Edit creates a new post instead of updating in place (regression)
- Delete Cancel triggers deletion (UI mis-wired)
- Delete leaves the post in Group Details list until manual refresh
- Photo of deleted post lingers in Media Gallery indefinitely (orphan without indication)

---

## Journey C — Permission gating & content moderation: edit own, report others

**Story arc:** A participant reads a post from another user. They long-press, see only Report in the Context Menu (no Edit or Delete — that's not their content). They submit a report. Then they navigate back to their own post and confirm the Context Menu offers Edit + Delete but no Report. This is the cross-user permission gating journey — a single failure here is a serious content-moderation regression.

**Stories covered:** S-002-004, S-002-009
**ACs hit inline:** Context Menu shows correct actions per content ownership, Report Abuse modal + submission, Report does NOT remove content from the reporter's view
**T-NNN backup:** T-002-004, T-002-009 — covered

**Preconditions:**
- Authenticated participant in a group containing both own posts and other users' posts
- User has at least one own post in the group
- A second test account exists that has posted at least one post in the same group

**The journey:**

1. From Home, navigate to the test group → Group Details → Discussion.
2. Locate a post by **another user** (Account B). Tap it.
3. ✓ Verify: Post Detail opens.
4. Long-press the other user's post.
5. ✓ Verify: Context Menu popover shows **Report** + Cancel only. **Edit and Delete are NOT visible** (this is the critical permission gate — failure here is a severe regression).
6. Tap **Report**.
7. ✓ Verify: Report Abuse modal appears with reason input + Submit + Cancel.
8. Enter "Test report — please disregard" as the reason.
9. Tap **Submit**.
10. ✓ Verify: Modal dismisses with a confirmation toast ("Report submitted") within 1s.
11. ✓ Verify: The reported post is **still visible** to the reporter (reporting is not deletion).
12. (Optional, requires backend access) Verify the report appears in the Salesforce moderation queue.
13. Tap back to Group Details → locate one of **your own posts**. Tap it.
14. Long-press your own post.
15. ✓ Verify: Context Menu shows **Edit + Delete** + Cancel only. **Report is NOT visible** (Report doesn't apply to own content).
16. Tap Cancel to dismiss the Context Menu.
17. Long-press a **reply by another user** in the same thread (if one exists; otherwise tap Reply on the other user's post to seed one with the second account first).
18. ✓ Verify: Context Menu on the other user's reply shows **Report + Cancel only** — same gating as posts.
19. Tap Cancel.
20. Long-press one of **your own replies**.
21. ✓ Verify: Context Menu shows **Edit + Delete + Cancel only** — same gating as posts.

**Failure indicators:**
- **Edit or Delete actions appear for others' content** — high-severity permission bug; would let any user delete another's posts
- **Report appears on own content** — lower-severity UX regression but breaks the design intent
- Menu shows all four actions regardless of authorship (gating not implemented at all — release blocker)
- Report submitted but no toast — user can't tell if it worked
- Reported post disappears from the reporter's view (over-aggressive — should stay visible until moderation acts)

---

## Journey D — Cross-surface navigation: media, members, browser, push deep-link

**Story arc:** A participant explores a trip group beyond the discussion forum — they view the media gallery, look up who else is on the trip, follow an external link to the Road Scholar program page (in-app browser), come back, and later receive a push notification that deep-links them to a specific post on a different group. This is the navigation-and-state-preservation journey.

**Stories covered:** S-002-002, S-002-007, S-002-008, S-006-002
**ACs hit inline:** Media Gallery render + full-screen image + swipe dismiss, Group Members list with leader badges + privacy honoring, External link in-app browser + back, Push notification deep-link to specific post
**T-NNN backup:** T-002-002, T-002-007, T-002-008 — covered. Browser + deep-link have no T-NNN backup (emergent)

**Preconditions:**
- Authenticated participant in a trip group with: ≥ 5 photos in the gallery, ≥ 5 members (including ≥ 1 leader and ≥ 1 participant with private hometown), at least one external Road Scholar program link in the group's program info
- Push notification permission granted
- A second test account that can trigger a push by replying to one of the user's posts in a **different** group

**The journey:**

1. From Home, tap the test group → Group Details.
2. Scroll the Discussion list past 3–5 posts.
3. ✓ Verify: Scrolling is smooth; posts paginate or virtualize without flicker.
4. Switch to the **Media** tab.
5. ✓ Verify: Media Gallery shows photos as a grid, newest first. Videos show a play icon overlay.
6. Tap a photo thumbnail.
7. ✓ Verify: **Full Screen Image modal** opens with the image + author overlay (name + timestamp).
8. Swipe down on the full-screen image.
9. ✓ Verify: Modal dismisses with the animation; returns to Media Gallery with the original scroll position retained.
10. Switch to the **Members** tab.
11. ✓ Verify: Members list shows all members. Group Leaders have the leader badge / indicator. Members with private hometone show no hometown on their row; members with public hometown show theirs.
12. ✓ Verify: Member count header matches the actual list count.
13. Tap back to **Discussion** tab.
14. ✓ Verify: Discussion scroll position is preserved from step 2.
15. Tap the external Road Scholar program link in the group's program info section (S-006-002 surface).
16. ✓ Verify: **In-app browser** opens (NOT Safari / Chrome — content stays in the app).
17. ✓ Verify: URL bar shows the destination URL (read-only).
18. Tap reload — page reloads successfully.
19. Tap back / forward (if navigation history exists).
20. Close the in-app browser.
21. ✓ Verify: Returns to Group Details with Discussion scroll position still preserved from step 2.
22. **Background the app.**
23. From the second account on a separate device or simulator, post a reply to one of the user's existing posts **in a different group** the user is also a member of (this triggers a push notification).
24. Wait for the push to arrive on the lock screen / banner.
25. Tap the push notification.
26. ✓ Verify: App foregrounds and opens **directly to the Post Detail** for the post that received the new reply — in the correct group, scrolled to the new reply.
27. ✓ Verify: Tap back navigates to Group Details for **that** group (not Home, not the previous group).
28. Navigate back to Home and verify both groups appear correctly.

**Alt branch — link opens in external browser:** If step 16 opens Safari instead of the in-app browser, this is a regression — see Failure Indicators.

**Alt branch — push tap when app is killed (not just backgrounded):** Force-quit the app after step 21. From the second account, post another reply (triggers another push). Tap the push.
  - ✓ Verify: App cold-launches → handles authentication (biometric or session) → routes to the Post Detail for the new reply.
  - ✓ Verify: The deep-link target survives the authentication redirect (doesn't drop the user on Home).

**Failure indicators:**
- External link opens in Safari / Chrome instead of the in-app browser (breaks engagement)
- In-app browser opens but URL bar blank or wrong
- Discussion scroll position lost when switching tabs and returning
- Members list shows hometown for users with privacy set to hidden (privacy regression — serious)
- Push tap routes to Home instead of the deep-linked post
- Push tap drops the deep-link target during auth redirect (cold launch)
- Push tap opens the wrong post / wrong group (mis-mapped deep link payload)

---

## Coverage matrix

| Story | All ACs covered by | Notes |
|-------|-------------------|-------|
| S-002-001 Group list | Journey A (step 1) | Home cards render |
| S-002-002 Group Details + forum | Journey A (steps 3–6), Journey B (step 1), Journey D (steps 10–14) | Forum render + Members + cross-tab nav |
| S-002-003 Create post | Journey B (steps 2–13) | Full create with media |
| S-002-004 Edit + delete post | Journey B (steps 20–32) + Journey C (Context Menu gating) | Edit, delete, cancel, permission gate |
| S-002-005 Replies | Journey A (steps 14–17, 18), Journey B (steps 18–19) | Reply submit + thread + own-reply like |
| S-002-006 Likes | Journey A (steps 8–13) + alt branches (unlike, rapid) | Optimistic UI + Liked By modal |
| S-002-007 @mentions | Journey B alt branch (mention) | Autocomplete + tagged-token render |
| S-002-008 Media gallery | Journey B (steps 14–15), Journey D (steps 4–9) | Upload propagation + view + full-screen |
| S-002-009 Report abuse | Journey C (steps 6–10) | Submit + confirmation + post stays visible |
| S-006-001 Program info display | Journey A (step 3) | Program summary section on Group Details |
| S-006-002 External link / in-app browser | Journey D (steps 15–21) + alt branch | In-app routing + back + cold-launch deep-link |

Every AC across S-002-001..009 and S-006-001..002 is verified by at least one journey. T-NNN remain as unit-level safety nets but are **not re-run** at the flow level.

## Maestro implementation notes (for the QA Agent)

- **One Maestro flow per journey.** Don't split a journey for "cleanliness" — state continuity across read → react → write is the point.
- **Alt branches in separate .yaml files.** Journey A has 2 alt branches (unlike, rapid spam); B has 3 (photo permission deny, @mention, offline upload); C has 0; D has 2 (external browser fallback, push-while-killed). Each alt branch is its own file named `TF-002-journey-a-alt-unlike.yaml`, etc., invoking the same setup-and-navigate flow up to the branch point.
- **Shared setup via `runFlow`.** All journeys start from authenticated Home — make `setup-authenticated-on-home.yaml` and invoke it. Journey D needs `setup-second-account-active.yaml` for the cross-account push trigger.
- **Test data seeding.** Each journey lists Preconditions assuming specific group / post / member shapes. Coordinate with the dev team on a seeded test environment (or use the backend's test-data fixtures) so journeys are reproducible.
- **Push notification testing.** Journey D step 23 requires a real second account action OR a backend hook that can inject a push payload directly. Maestro supports `openLink` to simulate deep-link entry; coordinate on which the test environment supports.
- **Evidence capture.** One screenshot per `✓ Verify` checkpoint + final state of the journey as the primary evidence artifact.

---

## Run Log

The QA Agent appends a row here on every run. PM reviews monthly.

| Run date | Build / commit | Trigger | Result | Failed journeys | Notes |
|---------|----------------|---------|--------|------------------|-------|
| _no runs yet_ | — | — | — | — | Plan v2.0 created 2026-05-19 — refactored from case-style v1.0 into journey style |

---

## Open Questions

1. **Offline behavior contract.** UF-002 has no interruption edges; Journey B's offline alt branch assumes the E-007 Offline Reliability epic owns the behavior. Confirm queue-and-retry vs error-and-retry-button before first run.
2. **Push notification deep-link payload contract.** Journey D step 26 assumes the payload contains group ID + post ID + (optional) reply ID. Confirm with backend.
3. **Optimistic-UI rollback policy.** When a like/post optimistically succeeds but the server later rejects (e.g. content moderation), should the UI silently rollback, or show the user an explanation? Journey A and B currently assume silent agreement.
4. **Reply orphaning on parent delete.** Journey B step 35 references the photo-of-deleted-post placeholder behavior. Cascade-delete or orphan-with-placeholder? Pick one.
5. **Media upload chunk failure mid-flow.** A 3-chunk upload where chunk 2 fails — retry from chunk 2 or restart? Affects Journey B offline alt branch.
6. **Self-like allowed?** Journey A step 19 likes own reply. Verify with design — is self-like intentional?
7. **Pull-to-refresh on Discussion.** Not in UF-002, but participants expect it. If implemented, add an alt branch to Journey A.
8. **No interruption edges in UF-002.** Source flow has no dotted edges. The journeys here surface backgrounding + connectivity + push patterns the flow doesn't yet document. Separate task to refresh the UF.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-19 | 1.0 | PM Agent | Created — 19 isolated FC cases covering read + write paths, optimistic UI, media, permission gating, in-app browser, cross-tab state, backgrounding, connectivity loss, push deep-link, @mentions, multi-action write stress |
| 2026-05-19 | 2.0 | PM Agent | **Refactored to journey style** — 4 continuous user journeys (A: read & react, B: compose & manage own content, C: permission gating & moderation, D: cross-surface navigation + push deep-link). Same coverage, dramatically fewer Maestro flows. Style declared in frontmatter. Added Maestro Implementation Notes. T-NNN reclassified as unit-level only — not re-run at the flow level |
