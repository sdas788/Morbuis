# Flow Test Plan: Login & Onboarding

**ID:** TF-001
**Project:** roadscholar-mobile
**Flow:** [UF-001 Login & Onboarding](../flows/UF-001-login-onboarding.md)
**Type:** Flow regression — evergreen, re-run every release + nightly
**Stage:** Active
**Version:** 2.0
**Created:** 2026-05-19
**Updated:** 2026-05-19
**Owner:** QA Agent (curated by PM)
**Style:** Journeys (continuous end-to-end Maestro flows)

> **What this document is.** A small set of **continuous user journeys** that, between them, exercise every story under this flow. Each journey is one believable user session — not a list of isolated test cases. The QA agent's job is to implement each journey as **one** Maestro flow, not N.
>
> **Why journeys instead of FC cases.** When TF reads like a dozen isolated cases that each reset state, the QA agent ends up writing a dozen short Maestro flows. That's slow, flaky, and doesn't reflect how the user actually moves through the app. A journey is the shortest believable narrative that covers a meaningful slice of the flow — AC verifications are stitched **into** the journey rather than executed independently.
>
> **Coverage discipline.** Each journey lists exactly which ACs it verifies along the way. The coverage matrix at the bottom proves every AC is hit across all journeys. No invented cases. No duplicating T-NNN. If an AC isn't covered by any journey, either a journey is missing a verification or a new journey is needed.

---

## Scope

The full first-touch journey: app launch (cold + warm) → Salesforce OAuth → first-login onboarding (Welcome → profile setup → push permission → complete) → Home. Also the returning-user fast paths (biometric, valid token) and recovery paths (biometric fail, token expiry, OAuth failure, connectivity loss, mid-flow backgrounding).

**In scope:**
- Fresh-install first-time auth + full onboarding
- Returning-user paths (biometric, no biometric, expired token)
- Onboarding skip paths (skip profile fields, deny push)
- Auth + biometric failure modes + recovery
- App backgrounding mid-flow (during OAuth webview, mid-onboarding)
- Connectivity loss during the OAuth handshake
- Permission gates (push notifications, biometric)

**Out of scope:**
- Profile editing post-onboarding (covered by TF-003)
- Group join / discovery after Home (covered by TF-002)
- Group leader trip-finding (UF-004 — no TF authored)
- Salesforce-hosted UI itself (we test the callback contract, not Salesforce's login form)

## Lifecycle & Cadence

| Trigger | Action | Pass criteria |
|---------|--------|---------------|
| **Pre-release** | Run all journeys end-to-end on the release candidate build | All journeys complete successfully |
| **Pre-ship (R-NNN Shipped)** | Re-run all journeys on production build | All complete |
| **Nightly (post-launch)** | Run all journeys against production | Failures alert QA channel; ≥2 consecutive nightly fails escalate to PM |
| **After any BUG fix lands on a touched story** | Re-run any journey whose Stories Covered list includes the BUG's story | Targeted journey passes |
| **Flow diff** | When UF-001 changes materially, bump TF-001 version and update affected journeys | Plan stays in sync with the flow |

The QA Agent records every run in the [Run Log](#run-log).

## How to read a journey

Each journey is structured as:

- **Title** — the participant's intent in plain English
- **Story arc** — 1–2 sentences narrating what happens
- **Stories covered + ACs hit** — explicit list; the journey covers every listed AC inline
- **Preconditions** — the starting state for the whole journey (set once)
- **The journey** — numbered, continuous steps that flow as one Maestro execution
- **Inline verifications** — `✓ Verify:` lines threaded into the steps
- **Alt branches** — short variants the same Maestro flow can take on (e.g. permission denied) without resetting state
- **Failure indicators** — what regression looks like

There is no per-journey priority — every journey is required for this flow's pass.

---

## Journey A — Fresh-install, full happy path: install → OAuth → onboard → Home

**Story arc:** A first-time participant downloads the app, signs in through Salesforce, completes the welcome + profile setup + push permission, and lands on Home with their enrolled trip groups visible.

**Stories covered:** S-001-001, S-001-003, S-001-004
**ACs hit inline:** S-001-001 (OAuth success → first-login route), S-001-003 (Welcome greeting → Onboarding Setup → Onboarding Complete), S-001-004 (in-context push permission prompt)
**T-NNN backup (don't re-run):** T-001-001, T-001-003, T-001-004 — covered by this journey at the flow level

**Preconditions:**
- App freshly installed (no prior session token, no biometric registered)
- Test Salesforce account exists with name + email populated, no avatar set
- Device has internet, push notification permission not yet granted, photo library has at least one test photo

**The journey:**

1. Launch app from a cold (force-killed) state.
2. ✓ Verify: Login screen appears within 2s. Sign In button visible, app version footer shown.
3. Tap **Sign In**.
4. ✓ Verify: Salesforce OAuth webview opens within 3s with the Salesforce login form rendered.
5. Enter correct Salesforce credentials, submit.
6. ✓ Verify: Webview hands off cleanly to **Welcome screen** (NOT directly to Home — this is first-login detection).
7. ✓ Verify: Welcome shows correct first name (from Salesforce profile).
8. Wait for automatic progression.
9. ✓ Verify: **Onboarding Setup modal** opens; Display Name field pre-populated from Salesforce; Bio + Hometown empty.
10. Tap the avatar to open the OS image picker.
11. ✓ Verify: Photo library permission prompt appears **in-context** (not at app launch). Grant permission.
12. Select the test photo.
13. ✓ Verify: Avatar preview updates in the Onboarding Setup modal.
14. Set Hometown to "Chicago, IL", set Bio to "First Road Scholar trip — excited!".
15. Tap **Save / Continue**.
16. ✓ Verify: **Push Notification Permission screen** appears with the explanation copy and Allow + Not Now buttons.
17. Tap **Allow Notifications**.
18. ✓ Verify: OS notification permission dialog appears (this is the OS dialog — the in-app screen at step 16 was the pre-prompt).
19. Grant OS permission.
20. ✓ Verify: **Onboarding Complete screen** appears with confirmation copy + Get Started CTA.
21. Tap **Get Started**.
22. ✓ Verify: **Home screen** renders within 3s, the user's enrolled trip groups visible (or empty-state if account has none).
23. Open the Profile screen (header icon) and confirm avatar + hometown + bio set in steps 12–14 are persisted server-side (covers the persistence boundary at the end of onboarding).

**Failure indicators:**
- Welcome briefly flashes before redirecting to Home (means returning-user vs first-login detection is wrong)
- Photo permission prompted at app launch instead of in-context (poor onboarding pattern — kills acceptance rate)
- Push permission dialog appears before the in-app pre-prompt at step 16 (defeats the whole point of the two-step pattern)
- Onboarding Setup loses pre-populated Salesforce fields after a re-render
- Home loads but profile data from steps 12–14 didn't persist (silent save failure)

---

## Journey B — Fresh-install, skip everything: minimal-onboarding fast track to Home

**Story arc:** A first-time participant signs in but declines every optional onboarding step. They skip profile setup, deny push permission, and still arrive at a usable Home.

**Stories covered:** S-001-001, S-001-003, S-001-004
**ACs hit inline:** S-001-003 (Skip path on Onboarding Setup → still progresses), S-001-004 (Not Now on push → does NOT register as "denied", remains "not determined")
**T-NNN backup:** T-001-003, T-001-004 — skip-path coverage

**Preconditions:**
- Same as Journey A but no test photo needed and no profile editing intent
- OS push permission state: "not determined" (fresh)

**The journey:**

1. Launch app, complete OAuth as in Journey A steps 1–6.
2. ✓ Verify: Welcome → Onboarding Setup as in Journey A steps 7–9.
3. On Onboarding Setup, tap **Skip** without filling any field.
4. ✓ Verify: Push Notification Permission screen appears.
5. Tap **Not Now**.
6. ✓ Verify: No OS dialog appears (Not Now is in-app only, doesn't trigger the OS prompt).
7. ✓ Verify: Onboarding Complete → Get Started → Home.
8. Navigate to Profile (header icon).
9. ✓ Verify: Profile shows Salesforce-derived display name + email; no avatar (clean initials placeholder, not a broken-image icon); bio and hometown empty but render valid empty states (not crashes, not "undefined").
10. Navigate to Settings → Notifications.
11. ✓ Verify: Notification permission status displays correctly — "Not enabled" or equivalent (NOT "Denied" — Not Now ≠ Denied per design intent; this lets the user re-enable later without a Settings round-trip).

**Failure indicators:**
- Home crashes or shows a "complete your profile" force-gate (per design, skip is allowed)
- Push permission stored as "denied" when user only tapped Not Now (loses the user permanently to OS rules)
- Avatar shows broken-image placeholder instead of clean initials fallback
- Bio/hometown fields render as literal "undefined" or "null" strings

---

## Journey C — Returning user with biometric: happy path + recovery + expired token

**Story arc:** A returning participant who set up biometric on a prior session relaunches the app. The biometric prompt appears, they authenticate, and Home loads — fast path. The journey also tests two recovery paths from the same starting state: biometric cancel (falls back to Login) and expired token (forces re-auth through OAuth).

**Stories covered:** S-001-001, S-001-002
**ACs hit inline:** S-001-002 (biometric prompt → success → Home), biometric cancel → Login fallback, expired-token re-route to OAuth
**T-NNN backup:** T-001-001, T-001-002 — covered

**Preconditions:**
- App previously installed and onboarded
- Valid session token in keychain
- Biometric registered + enabled in app preferences
- Device biometric (Face ID / Touch ID) enrolled at OS level

**The journey:**

1. Force-quit the app.
2. Relaunch.
3. ✓ Verify: **Biometric Authentication modal** appears within 1s of launch — no Login screen flash.
4. ✓ Verify: OS-rendered biometric prompt is visible (separate from the in-app modal — OS owns the prompt UI).
5. Present matching biometric.
6. ✓ Verify: Home loads within 2s. No Salesforce webview opens at any point.

**Alt branch — biometric cancel:** At step 4, tap **Cancel** on the OS biometric prompt.
  - ✓ Verify: Biometric modal dismisses. App lands on **Login screen** (not Home).
  - Tap Sign In → complete Salesforce OAuth.
  - ✓ Verify: Returning user routes to Home (not Welcome — they're not a first-login user).

**Alt branch — biometric failure 3x falls to Login:** Present a non-matching biometric 3 consecutive times.
  - ✓ Verify: After OS-enforced retry limit, app falls back to Login screen.
  - Subsequent Sign In through Salesforce succeeds normally.
  - ✓ Verify: Biometric is NOT silently disabled — relaunch a few seconds later confirms biometric prompt fires again (next time the user can try again).

**Alt branch — "Use Password Instead" link:** At step 3, tap the "Use Password Instead" fallback link on the in-app biometric modal.
  - ✓ Verify: Biometric modal dismisses → Login screen → OAuth → Home. Biometric prompt does NOT re-fire mid-session (no loop).

**Alt branch — expired token:** Use the test harness to backdate the session token before launching. Relaunch.
  - ✓ Verify: Biometric prompt may appear; biometric success triggers a silent token refresh attempt.
  - ✓ Verify: Refresh fails because of expired token → app routes to **Salesforce OAuth** (NOT to Home with a dead token).
  - Complete OAuth → ✓ Home loads with a fresh token. Verify a subsequent API call (e.g. fetch groups on Home) succeeds.

**Failure indicators:**
- Login screen appears before the biometric modal (race condition on launch)
- Salesforce OAuth fires anyway when biometric is enabled (fast path bypassed)
- Home loads before biometric resolves (auth bypass — security regression)
- Biometric cancel lands on Home (security regression)
- Biometric gets silently disabled after 3 failures (over-defensive — user can't recover next launch)
- Expired token path lands on Home anyway, then every API call 401s (worst-case UX)

---

## Journey D — OAuth credential failure recovers cleanly

**Story arc:** A user fat-fingers their Salesforce password during sign-in. The OAuth callback fails, the app returns them to the Login screen with a subtle indication, and a subsequent attempt with correct credentials completes successfully. No half-authenticated state is left behind.

**Stories covered:** S-001-001
**ACs hit inline:** OAuth failure callback handling, retry path, no partial token persistence
**T-NNN backup:** T-001-001

**Preconditions:**
- Fresh install or signed-out state on Login

**The journey:**

1. From Login, tap **Sign In** → OAuth webview opens.
2. Enter Salesforce email + a wrong password, submit.
3. ✓ Verify: Salesforce webview surfaces its own auth-failed error (Salesforce-controlled UI inside the webview).
4. Close / dismiss the webview using the app's close affordance.
5. ✓ Verify: App lands on **Login screen** — NOT stuck in the webview, NOT crashed, NOT on Home.
6. ✓ Verify: A subtle in-app error indication appears ("Sign in failed — please try again") without leaking the raw Salesforce error message.
7. Verify the keychain via test harness: no partial token, no orphaned session state.
8. Tap **Sign In** again → enter correct credentials → submit.
9. ✓ Verify: OAuth succeeds → first-login or returning-user routing fires per account state → Home (or Welcome for genuine first-time accounts).

**Failure indicators:**
- App stuck in Salesforce webview after dismissal (no escape)
- Partial token written to keychain (security regression — would let a half-auth user reach protected screens)
- Second Sign In attempt fails silently due to stale state from the first attempt
- Error indication leaks raw Salesforce internals to the user

---

## Journey E — Interruption resilience: backgrounding mid-OAuth, mid-onboarding, and connectivity loss

**Story arc:** A first-time participant is interrupted mid-flow — they background the app during the Salesforce webview, then again during onboarding setup, and at one point their network drops. The app handles each interruption gracefully without losing progress or leaking a half-authenticated state.

**Stories covered:** S-001-001, S-001-003
**ACs hit inline:** State preservation across backgrounding (mid-OAuth, mid-onboarding), connectivity-loss handling in OAuth webview
**T-NNN backup:** none — emergent (no T-NNN owns these cross-cutting interruption scenarios)

**Preconditions:**
- Fresh install
- Tester can toggle airplane mode mid-flow
- Tester can use Home button / gesture to background the app

**The journey:**

1. Launch app → tap Sign In → enter Salesforce OAuth webview.
2. Background the app (Home button / gesture).
3. Wait 30s.
4. Foreground the app.
5. ✓ Verify: App resumes to one of two acceptable states — (a) webview restored at where it left off, OR (b) clean restart from Login screen. Either is acceptable; the app must NOT show a frozen webview or hang.
6. ✓ Verify: No half-authenticated session — verify no token in keychain, no Home screen reachable.
7. If the app routed to Login (option b above), tap Sign In again. Complete OAuth normally.
8. While OAuth is loading after Sign In, **enable airplane mode**.
9. Wait 10s.
10. ✓ Verify: Salesforce webview surfaces its own network error inside the page (Salesforce-controlled). App does NOT crash or show a black screen.
11. Closing the webview via the app's close affordance returns to Login cleanly.
12. **Disable airplane mode**, wait 5s, retry Sign In.
13. ✓ Verify: OAuth completes → Welcome screen.
14. Proceed through Welcome → Onboarding Setup. Fill avatar + display name + hometown + bio.
15. Background the app again before tapping Save.
16. Wait 60s.
17. Foreground the app.
18. ✓ Verify: Onboarding Setup modal still open with all filled fields preserved. (Acceptable inferior fallback: app resumed to Welcome and re-routed forward; but a regression to Login is a failure.)
19. Tap Save → Push Notification Permission → tap Allow → grant OS permission → Onboarding Complete → Get Started → Home.
20. ✓ Verify: Final Home renders with the profile data from step 14 persisted.

**Failure indicators:**
- App resumes to a frozen webview with no input accepted
- App resumes to Home despite never completing OAuth (severe auth bypass)
- App crashes on foreground after backgrounded OAuth
- Filled onboarding fields cleared on resume (poor UX — flag for design follow-up, not necessarily a release blocker)
- App resumes to Login from mid-onboarding (loses onboarding progress entirely)
- Save attempt post-resume hangs due to a stale token

---

## Coverage matrix

| Story | All ACs covered by | Notes |
|-------|-------------------|-------|
| S-001-001 Login (Salesforce SSO) | Journey A (steps 3–6), Journey C alt branches (cancel, "Use Password", expired token), Journey D (full), Journey E (steps 1–13) | Every OAuth path: success, failure, recovery, network-interrupted, returning-user routing |
| S-001-002 Biometric authentication | Journey C (full, plus all 4 alt branches) | Happy, cancel, 3x-failure, "Use Password Instead", expired-token-forces-OAuth |
| S-001-003 Welcome + Onboarding Setup | Journey A (steps 7–15), Journey B (steps 2–3 skip path), Journey E (steps 14–18 mid-onboarding background) | Full path + skip path + state preservation |
| S-001-004 Push Notification Permission | Journey A (steps 16–19 Allow path), Journey B (steps 4–5 Not Now path) + step 11 (verify "Not Now ≠ Denied") | Both branches plus the subtle state distinction |

Every AC across S-001-001..004 is verified by at least one journey. No invented FC cases. T-NNN remain as unit-level safety nets but are **not re-run** at the flow level.

## Maestro implementation notes (for the QA Agent)

- **One Maestro flow per journey.** Don't split a journey for "cleanliness"; the state continuity is the test.
- **Alt branches in separate .yaml files.** Each alt branch (Journey C has 4) is its own Maestro flow, named `TF-001-journey-c-alt-cancel.yaml`, `TF-001-journey-c-alt-3-failures.yaml`, etc. They reuse the same setup up to the branch point via `runFlow`.
- **Shared setup via `runFlow`.** Journeys A, B, D, E all start from a fresh install with no session — make `setup-fresh-install.yaml` and invoke it. Journey C starts from a paired + biometric-enabled state — make `setup-returning-user-biometric.yaml`.
- **Verification mapping.** `✓ Verify:` checkpoints map to `assertVisible` / `assertNotVisible` / `assertWithAI` in Maestro YAML. AC IDs in the journey narrative are for traceability; they don't need to appear in the YAML.
- **Evidence capture.** One screenshot per `✓ Verify` checkpoint + final state of the journey saved as the primary evidence artifact for the run.
- **Token-refresh test harness.** Journey C's expired-token alt branch needs a test harness that can backdate the keychain token. Coordinate with the dev team on a debug-only API or Maestro plugin.

---

## Run Log

The QA Agent appends a row here on every run. PM reviews monthly.

| Run date | Build / commit | Trigger | Result | Failed journeys | Notes |
|---------|----------------|---------|--------|------------------|-------|
| _no runs yet_ | — | — | — | — | Plan v2.0 created 2026-05-19 — refactored from case-style v1.0 into journey style |

---

## Open Questions

1. **Does the app support push permission re-prompt later?** If the user taps Not Now during onboarding, is there a path inside Settings to re-enable? Journey B step 10–11 assumes yes. If not, the verify in step 11 needs to soften.
2. **Biometric re-enrollment trigger** — when a user changes their device biometric (adds a new face, replaces a fingerprint), does the app re-prompt for biometric setup, or trust the OS? Affects Journey C alt branch expectations.
3. **Token refresh strategy** — silent refresh on every app launch, or only on 401? Journey C's expired-token alt depends on this.
4. **Onboarding draft persistence** — is partial Onboarding Setup data persisted server-side as the user types, or only on Save? Affects Journey E step 18. If only on Save, the "filled fields preserved" expectation depends on local-state preservation across backgrounding, which most OSes handle but is worth confirming.
5. **No interruption edges in UF-001** — the source flow has no dotted edges. Should the flow doc itself be updated to draw the backgrounding + connectivity-loss interruptions Journey E exercises? Separate task.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-19 | 1.0 | PM Agent | Created — 12 isolated FC cases (8 P1, 4 P2) covering fresh-install onboarding, returning-user fast path, biometric failures, OAuth failure, connectivity loss, backgrounding, token expiry |
| 2026-05-19 | 2.0 | PM Agent | **Refactored to journey style** — 5 continuous user journeys (A: fresh-install happy path, B: skip-everything path, C: returning user with biometric + 4 alt branches, D: OAuth failure recovery, E: interruption resilience). Same coverage in fewer Maestro flows. Style declared in frontmatter. Added Maestro Implementation Notes. T-NNN reclassified as unit-level only — not re-run at flow level |
