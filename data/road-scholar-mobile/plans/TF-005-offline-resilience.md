# Flow Test Plan: Offline & Reliability

**ID:** TF-005
**Project:** roadscholar-mobile
**Flow:** [UF-005 Offline & Reliability](../flows/UF-005-offline-resilience.md)
**Type:** Flow regression — evergreen, re-run every release + nightly
**Stage:** Active
**Version:** 1.0
**Created:** 2026-05-22
**Updated:** 2026-05-22
**Owner:** QA Agent (curated by PM)
**Style:** Journeys (continuous end-to-end Maestro flows)

> **What this document is.** A set of continuous user journeys that exercise the cross-story offline behavior end-to-end — banner appearance on every screen, cached browse, optimistic like + queue + sync, comment + post blocking, token expiry while offline, reconnect without relaunch, and the forced-update gate. Each journey is one believable Maestro session that toggles airplane mode mid-flow rather than spinning up a fresh app instance per assertion.
>
> **Why a TF for this flow.** Three real production fixes ([RSS-403](https://redfoundry.atlassian.net/browse/RSS-403), [RSS-410](https://redfoundry.atlassian.net/browse/RSS-410), [RSS-437](https://redfoundry.atlassian.net/browse/RSS-437)) live only in story-level T-007-* plans today. T-NNN plans are unit-level safety nets that the QA agent does **not** re-run nightly. Without a TF, those three regressions have no evergreen guard — a code change anywhere in the apiSlice / netInfo / persist boundary could silently undo them.
>
> **Coverage discipline.** Each journey lists exactly which ACs it verifies along the way. The coverage matrix at the bottom proves every cross-cutting AC is hit across all journeys. T-007-001..004 remain as story-level unit checks but are explicitly **not re-run** at the flow level.

---

## Scope

The cross-story system behavior when connectivity is lost and restored. This plan is the only place these scenarios are exercised at flow-regression cadence.

**In scope:**
- NoInternetNotifier appears on every authenticated screen (not just Home) — RSS-410
- Reconnect without app relaunch resumes normal operation in-place — RSS-403
- Token expiry while offline → silent refresh on reconnect, no login loop — RSS-437
- Cold start while offline rehydrates cached groups, threads, photos
- Optimistic like UI + offline queue + reconnect drain (including dedup)
- Comment / post / video gating while offline (blocked vs queued vs failed-fast)
- Forced-update Alert when build < `requiredVersion` from `VERSION_INFO_URL`

**Out of scope:**
- Salesforce OAuth connectivity loss during sign-in — covered by [TF-001](TF-001-login-onboarding.md) Journey E
- Media-upload chunk failure mid-post — covered by [TF-002](TF-002-group-browsing-discussion.md) Journey B alt-branch
- Individual story-level AC enumeration — covered by T-007-001..004 (not re-run here)

## Lifecycle & Cadence

| Trigger | Action | Pass criteria |
|---------|--------|---------------|
| **Pre-release** | Run all journeys end-to-end on the release candidate | All journeys complete successfully |
| **Pre-ship (R-NNN Shipped)** | Re-run all journeys on production build | All complete |
| **Nightly (post-launch)** | Run all journeys against production | Failures alert QA channel; ≥2 consecutive nightly fails escalate to PM |
| **After any BUG fix lands on S-007-* or on auth / apiSlice / netInfo / persist code** | Re-run any journey whose Stories Covered list includes the touched story | Targeted journey passes |
| **Flow diff** | When UF-005 changes materially, bump TF-005 version and update affected journeys | Plan stays in sync with the flow |

The QA Agent records every run in the [Run Log](#run-log).

## How to read a journey

Same shape as TF-003: title, story arc, stories covered + ACs hit, preconditions, numbered steps with inline `✓ Verify:` checkpoints, alt branches, failure indicators. Each journey is one Maestro flow.

There is no "Priority" per journey because every journey is required for this flow's pass.

---

## Journey A — Cold start offline, browse cached content

**Story arc:** A participant uses the app at home (online), then boards a motorcoach the next morning where there is no signal. They open the app fresh — the OS has killed it overnight — and find that their groups, the last threads they read, and the photos they viewed yesterday are all still there.

**Stories covered:** S-007-001
**ACs hit inline:** TC-007-001-001 (cached groups remain viewable offline), TC-007-001-002 (cached thread displays without error), TC-007-001-005 (cached photo viewable, video shows placeholder), TC-007-001-006 (cached profile remains viewable), TC-007-001-007 (cold start while offline retains cache)
**T-NNN backup (don't re-run):** T-007-001 — covered by this journey at the flow level

**Preconditions:**
- Authenticated session on `rs-test-returning-participant`
- Tester can toggle airplane mode and force-stop / cold-start the app
- The night before (or in a pre-journey warm-up phase): online, open Home → tap into the shared test group `RS-TEST-GROUP-A` → scroll the thread list → tap into 1 thread → tap a photo → tap `rs-test-second-participant`'s profile from a post author affordance. This populates the cache.

**The journey:**

1. While the device is online and the app is foreground, perform the warm-up taps listed in Preconditions so the cache contains: group list, one thread, one photo, one profile.
2. Background the app.
3. **Enable airplane mode**.
4. **Force-stop the app** (swipe up from app switcher on iOS, force-stop in Settings on Android — this is the OS-kill case, not just background).
5. Cold-launch the app.
6. ✓ Verify: App routes past biometric (offline biometric is acceptable) and lands on Home.
7. ✓ Verify: NoInternetNotifier banner is visible at the top of Home.
8. ✓ Verify: Home displays the same group list seen in step 1 (not an empty state, not a generic error).
9. Tap into `RS-TEST-GROUP-A`.
10. ✓ Verify: Group Details opens with the threads from step 1 visible.
11. ✓ Verify: NoInternetNotifier banner is still visible on Group Details (RSS-410: banner is not Home-only).
12. Tap into the thread from step 1.
13. ✓ Verify: Thread content (post body + author + comment count) renders from cache.
14. Tap the photo from step 1.
15. ✓ Verify: Full-screen image opens (photo cache hit).
16. Close the photo. If the thread has a video, tap it.
17. ✓ Verify: Video shows a placeholder or "Video unavailable offline" state (videos are NOT cached). App does not crash or hang.
18. Back out to Group Details → navigate to a Members list or a post author → tap to open `rs-test-second-participant`'s profile.
19. ✓ Verify: Profile renders from cache.
20. ✓ Verify: NoInternetNotifier banner is visible on the profile screen.

**Alt branch — never-viewed profile (RSS-1822):** At step 18, navigate instead to a group member whose profile was **not** opened in step 1. ✓ Verify: the screen renders a **dedicated offline-message profile state** — not a generic loading spinner, not a crash, not an error toast. The message clearly tells the participant the profile isn't available offline and will load once they reconnect. NoInternetNotifier banner is still visible above this state.

**Failure indicators:**
- Home empty / generic error despite a populated cache from the prior session (redux-persist rehydration regression)
- NoInternetNotifier appears only on Home and not on Group Details / Profile / Gallery (RSS-410 regression)
- Photo tap crashes or hangs while offline (image cache regression)
- Video tap crashes (should degrade to placeholder)
- Cold-start routes the user to Login despite a valid persisted auth slice (auth persist regression)

---

## Journey B — Drop connection mid-session, queue likes, reconnect-without-relaunch

**Story arc:** A participant is reading a thread when their bus enters a tunnel. They keep tapping likes on posts, try to leave a comment (blocked), try to compose a new post (fails with a banner), and then re-emerge into signal. Their likes appear on the server, the banner clears, and they did **not** have to restart the app.

**Stories covered:** S-007-002, S-007-003
**ACs hit inline:** TC-007-002-001 (queued likes sync on reconnect), TC-007-002-002 (like→unlike dedup collapses to single mutation), TC-007-002-003 (optimistic UI updates immediately), TC-007-002-005 (post fails fast offline, not queued), TC-007-002-007 (comment input disabled offline), TC-007-003-001 (banner within 1s of network drop), TC-007-003-002 (banner dismisses on reconnect, queue processes), TC-007-003-005 (banner on non-Home screen), TC-007-003-007 (reconnect without relaunch — RSS-403)
**T-NNN backup (don't re-run):** T-007-002, T-007-003 — covered by this journey at the flow level

**Preconditions:**
- Authenticated session on `rs-test-returning-participant`, foregrounded on Group Details for `RS-TEST-GROUP-A`
- Group contains ≥3 posts from `rs-test-second-participant` for liking
- Tester can toggle airplane mode

**The journey:**

1. ✓ Verify: Group Details renders normally (online baseline).
2. **Enable airplane mode**.
3. ✓ Verify: NoInternetNotifier banner appears within 1s on Group Details (not just Home).
4. Tap the heart on post #1.
5. ✓ Verify: Heart fills, like count increments (optimistic).
6. Tap the heart on post #2.
7. ✓ Verify: Heart fills, like count increments.
8. Tap the heart on post #3 (like).
9. Tap the heart on post #3 again (unlike).
10. ✓ Verify: Heart returns to unfilled, like count decrements (the dedup logic in `enqueueLikeMutation` should keep only the latest action — but the UI reflects both transitions in real time).
11. Tap into post #1's detail screen.
12. ✓ Verify: NoInternetNotifier banner is visible here too (every screen, not just Home — RSS-410).
13. Tap the comment input.
14. ✓ Verify: Comment input is disabled or shows an offline message (comments are NOT queued).
15. Back out to Group Details → tap the compose-post affordance.
16. Attempt to submit a text-only post.
17. ✓ Verify: NoInternetFailedPostBanner appears OR a clear "no internet" error message — the post is NOT silently queued (S-007-002 Do Not Do).
18. Back out to Group Details.
19. **Disable airplane mode** — **do not relaunch the app**.
20. Wait up to 5s for NetInfo to register the reconnect.
21. ✓ Verify: NoInternetNotifier banner dismisses automatically.
22. ✓ Verify: The likes on post #1 and post #2 remain filled (queue drained successfully).
23. ✓ Verify: Post #3 shows the unliked state (dedup kept only the final unlike — not two API calls). This may be observable by checking server-side state via a second device or admin tool, or by pull-to-refresh on Group Details and re-rendering.
24. Pull to refresh Group Details.
25. ✓ Verify: Server reflects the same like counts. No duplicate likes. No orphaned mutations. App did not require a relaunch — same Maestro session throughout (RSS-403).

**Alt branch — extended offline (≥10 min):** After step 18, leave airplane mode on for 10 minutes (parameterize the wait). Then disable airplane mode. ✓ Verify: app still recovers in-place; queue still drains; no infinite-loading screens (RSS-404). If the app appears stuck on a loading state, a tap-to-retry affordance must be reachable — not a frozen view.

**Failure indicators:**
- Banner takes >1s to appear after airplane mode (NetInfo debounce regression)
- Like taps offline silently no-op (optimistic UI regression — the dispatch to enqueue never fires)
- Like→unlike sends two API calls on reconnect instead of one (dedup regression)
- Comment input accepts text and silently fails (should be disabled outright)
- Post attempt offline gets queued and posts twice on reconnect (S-007-002 Do Not Do violation)
- App requires force-quit + relaunch to recover after reconnect (RSS-403 regression)
- Infinite spinner on Group Details after reconnect with no tap-to-retry (RSS-404 regression)

---

## Journey C — Token expires while offline, recover without login loop

**Story arc:** A participant is in a remote area for a full day. Their access token expires sometime during that day. When they get back to a coffee shop with WiFi, they open the app and it just works — no Login screen, no surprise sign-out.

**Stories covered:** S-007-004
**ACs hit inline:** TC-007-004-006 (offline blocks new API calls), TC-007-004-007 (offline blocks token refresh, no login loop), TC-007-004-008 (single token-refresh deduplicated via `refreshTokenPromise`, queued requests reuse new token — RSS-437)
**T-NNN backup (don't re-run):** T-007-004 — covered by this journey at the flow level

**Preconditions:**
- Authenticated session on `rs-test-returning-participant`
- Backend support to **backdate the access token** so it expires within the test window (see [Known workarounds in qa-testplan](qa-testplan.md#known-workarounds) — same dev harness TF-001 Journey C uses)
- Tester can toggle airplane mode
- App in foreground on Home

**The journey:**

1. Confirm app is online and on Home. ✓ Verify: groups render normally.
2. Trigger the backdate harness to set the current session's access token to expire in 60s.
3. **Enable airplane mode** before the 60s window elapses (the token will expire while offline).
4. Wait 90s (token now expired; app still offline).
5. While offline, tap into a group, then tap a thread.
6. ✓ Verify: Cached content renders (Journey A behavior). NoInternetNotifier visible.
7. ✓ Verify: No login screen appears (the app does NOT attempt token refresh while offline — apiSlice.ts line ~152 short-circuits). No background API call attempts to refresh.
8. **Disable airplane mode**. Stay in the same screen.
9. Wait up to 10s for NetInfo to register reconnect + the next authenticated request to fire.
10. ✓ Verify: The first authenticated request returns 401, the app silently refreshes the token, retries the original request, and the user sees data populate. No Login screen appears at any point.
11. Pull to refresh.
12. ✓ Verify: Refresh succeeds (token refresh already happened on step 10; the queued request reuses the new token — `refreshTokenPromise` deduplication).
13. Navigate around the app (Home, a different group, profile).
14. ✓ Verify: All subsequent screens load normally.

**Alt branch — refresh token also expired:** Before step 1, expire **both** the access token and the refresh token. ✓ Verify: at step 10, after reconnect, the app routes to Login (signOut dispatched). This is the only acceptable failure mode of Journey C — and it must be a clean Login redirect, not a black screen or a crash.

**Failure indicators:**
- App attempts a network call while still offline (apiSlice short-circuit regression — would burn battery / generate errors)
- App routes to Login while still offline (premature signOut)
- After reconnect, multiple parallel refresh-token calls fire (deduplication via `refreshTokenPromise` regression)
- After reconnect, the first call succeeds but subsequent calls fail with 401 (queued-request token-reuse regression)
- After reconnect, the app shows Login despite the refresh token still being valid (RSS-437 regression — the explicit production bug this story shipped to fix)

---

## Journey D — Forced update gate on cold launch (independent of offline state)

**Story arc:** Road Scholar pushes a backend change that requires a minimum app version. The participant's installed build is below that minimum. On their next cold launch — connected or not — the app shows a non-cancelable alert pointing to the store.

**Stories covered:** S-007-004
**ACs hit inline:** TC-007-004-001 (required-update Alert non-cancelable, OK opens store), TC-007-004-002 (recommended-update Alert one-shot cancelable), TC-007-004-003 (recommended-update suppressed on second launch at same `recommendedVersion`), TC-007-004-004 (no prompt when build meets both thresholds), TC-007-004-005 (fail-open on JSON unreachable / malformed)
**T-NNN backup (don't re-run):** T-007-004 — covered by this journey at the flow level

**Preconditions:**
- Backend `versioninfo.json` accessible at the configured `VERSION_INFO_URL` (see [Backend dependencies in qa-testplan](qa-testplan.md#backend-dependencies))
- Ability to publish three test variants of the JSON: (a) `requiredVersion` newer than installed, (b) `recommendedVersion` newer than installed but `requiredVersion` met, (c) both met
- Optionally, ability to point the URL at a 404 or malformed response for the fail-open test
- App installed at a known version (use the build version baked into the RC)

**The journey:**

1. Publish variant (c) — both `requiredVersion` and `recommendedVersion` ≤ installed build.
2. Cold-launch the app. ✓ Verify: no update Alert appears; app proceeds to Login / Home normally (TC-007-004-004).
3. Publish variant (b) — `recommendedVersion` newer than installed, `requiredVersion` ≤ installed.
4. Cold-launch the app. ✓ Verify: a cancelable Alert appears with the `recommendedText` body, an OK button, and a Cancel button.
5. Tap Cancel.
6. ✓ Verify: Alert dismisses; app proceeds normally.
7. Cold-launch the app a second time **with the same variant (b) still published** — `recommendedVersion` unchanged.
8. ✓ Verify: no Alert appears (the previously-dismissed `recommendedVersion` value is remembered in AsyncStorage `recommendedVersion` key — TC-007-004-003).
9. Publish variant (b') — same shape as (b) but bump `recommendedVersion` to a new value (still ≤ installed build's next major).
10. Cold-launch. ✓ Verify: the Alert appears again (new `recommendedVersion` value, AsyncStorage doesn't match).
11. Publish variant (a) — `requiredVersion` newer than installed build.
12. Cold-launch. ✓ Verify: a non-cancelable Alert appears with `requiredText`. There is a single OK button. There is no Cancel.
13. Tap OK.
14. ✓ Verify: The store opens (App Store on iOS, Play Store on Android — OS-level handoff).
15. Return to the app (back swipe or app switcher — do not update the build).
16. ✓ Verify: The same non-cancelable Alert is re-presented immediately. There is no way past it without updating.

**Alt branch — fail-open:** Point `VERSION_INFO_URL` at a non-existent endpoint or a malformed JSON response. Cold-launch. ✓ Verify: no Alert appears; app proceeds normally to Login / Home (TC-007-004-005). Failures during the version check must not block app launch.

**Failure indicators:**
- Required-update Alert has a Cancel button (would let users bypass the gate)
- Required-update Alert dismisses on tap-outside on Android (modal config regression)
- Recommended-update Alert re-shows on every cold launch (AsyncStorage `recommendedVersion` key not written / not read)
- Recommended-update Alert never appears (JSON parse regression)
- App blocks launch when `VERSION_INFO_URL` is unreachable (fail-open regression — this would brick all users if Firebase Hosting has an outage)
- Returning from the store via app switcher allows the user past the required-update Alert (re-presentation regression)

---

## Coverage matrix

| Story | ACs covered by | Notes |
|-------|---------------|-------|
| S-007-001 Offline Data Caching | Journey A (entire) | Cold-start cache + photo vs video + cached profile; reinstall-reset case (TC-007-001-004) is left to T-007-001 since reinstall is not Maestro-friendly |
| S-007-002 Offline Like Queue | Journey B (entire) | Optimistic UI + queue + dedup + post-fails-fast + comment-disabled |
| S-007-003 Network Status & Recovery | Journey B (banner on non-Home, reconnect without relaunch) + Journey A (banner persistence across screens) + Journey B Alt (extended-offline + no infinite loading) | RSS-403 + RSS-410 + RSS-404 all covered |
| S-007-004 Forced Update Check | Journey C (token-expiry-while-offline — RSS-437) + Journey D (all four version-check branches + fail-open) | Two independent journeys because the offline-token-refresh and the version-check-on-launch are logically separate even though they live in the same story |

Reinstall-and-resign-in (TC-007-001-004) is the one AC intentionally left to T-007-001 — it doesn't fit the journeys shape because it requires uninstalling the app, which Maestro doesn't drive cleanly. Worth revisiting if Maestro grows that capability.

**Storage-limit graceful degradation** (TC-007-001-008) is also left to T-007-001 — synthetic low-storage state isn't reliably reproducible via Maestro on either platform.

## Maestro implementation notes (for the QA Agent)

- **One Maestro flow per journey.** Don't split. The state-continuity across like-then-unlike-then-reconnect is the test.
- **Airplane mode toggle:** Maestro can toggle via `setAirplaneMode` on Android. iOS requires the `setNetworkCondition` simulator command or a manual host-side step — document the iOS path explicitly in the run notes if Maestro lacks native support at run time.
- **Token backdate:** reuse the same dev harness TF-001 Journey C uses (see [Known workarounds in qa-testplan](qa-testplan.md#known-workarounds)). If the harness is unavailable, mark Journey C `environment-blocked`, not `failed`.
- **VERSION_INFO_URL variants:** the four-variant matrix for Journey D needs a coordinated publish/revert dance with the backend. Either dedicate a staging URL the QA agent can mutate, or have a dev pre-stage the four variants and Journey D switches between them by re-pointing the env var per cold-launch.
- **Alt branches go in separate Maestro flow files** named `TF-005-journey-c-alt-refresh-expired.yaml`, etc. They reuse the same setup up to the branch point.
- **Capture evidence per journey, not per step.** One screenshot at every `✓ Verify` checkpoint; final screen of the journey saved as primary evidence.

---

## Run Log

| Run date | Build / commit | Trigger | Result | Failed journeys | Notes |
|---------|----------------|---------|--------|------------------|-------|
| _no runs yet_ | — | — | — | — | Plan v1.0 created 2026-05-22 — first TF for E-007; first run on the next release candidate |

---

## Open Questions

1. **Maestro iOS airplane-mode primitive** — Maestro's airplane-mode support is Android-first. The QA agent should confirm the iOS path before the first run: native sim command, host-side toggle, or a `runFlow` wrapper. If neither works in CI, the iOS half of this plan may need to be a hands-on QA pass at release time only.
2. **Token-backdate harness coverage** — Does the same backdate path TF-001 Journey C uses also expire the **refresh** token, or only the access token? Journey C Alt depends on being able to expire both. If the harness can't, the alt branch becomes a manual test.
3. **VERSION_INFO_URL variant orchestration** — Who owns publishing the four JSON variants for Journey D? Either the backend team pre-stages a `?variant=a|b|b'|c` query-param shim, or QA gets a staging bucket they can mutate. Confirm before first run.
4. **Like queue dedup semantics on the wire** — When a like→unlike pair offline collapses to a single unlike, is the queue order preserved across multiple threads (FIFO per thread, but inter-thread order maintained)? Worth confirming with engineering — Journey B step 23 currently assumes per-thread state is the only invariant.
5. **Server-side verification for Journey B step 23** — The dedup verification ideally checks server state, not just UI state. If the QA agent can't reach a server-side verification path, fall back to UI verification + a manual review of API logs for the run.
6. **Cold-start while offline — biometric prompt** — If biometric is enabled, does the biometric prompt show or skip when offline (since validating biometric is local)? Journey A step 6 assumes it shows and succeeds locally. Confirm with engineering for first run.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-22 | 1.0 | PM Agent | Created — 4 journeys covering all 4 stories under UF-005 with full AC traceability. **Style: Journeys** (matching TF-003). Backfills the offline epic with evergreen regression coverage that no T-007-* plan provides at the flow level. Explicit RSS-403 / RSS-404 / RSS-410 / RSS-437 regression guards. |
| 2026-05-22 | 1.0 | PM Agent | Tightened Journey A "never-viewed-profile" alt-branch wording: code now shows a dedicated offline-message state for this case (RSS-1822, May 19) rather than a generic loading state — alt-branch expected behavior updated accordingly. |
