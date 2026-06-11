# Flow Test Plan: Profile Management

**ID:** TF-003
**Project:** roadscholar-mobile
**Flow:** [UF-003 Profile Management](../flows/UF-003-profile-management.md)
**Type:** Flow regression — evergreen, re-run every release + nightly
**Stage:** Active
**Version:** 1.0
**Created:** 2026-05-19
**Updated:** 2026-05-19
**Owner:** QA Agent (curated by PM)
**Style:** Journeys (continuous end-to-end Maestro flows)

> **What this document is.** A small set of **continuous user journeys** that, between them, exercise every story under this flow. Each journey is one believable user session — not a list of isolated test cases. The QA agent's job is to implement each journey as **one** Maestro flow, not N.
>
> **Why journeys instead of FC cases.** When TF reads like 15 case definitions with their own preconditions and 3-step "Steps:" lists, the QA agent ends up writing 15 short Maestro flows that each reset state. That's slow, flaky, and doesn't reflect how the user actually moves through the app. A journey is the shortest believable narrative that covers a meaningful slice of the flow — the QA agent stitches the AC verifications **into** the journey rather than running them separately.
>
> **Coverage discipline.** Each journey lists exactly which ACs it verifies along the way. The coverage matrix at the bottom proves every AC is hit across all journeys. No invented cases. No duplicating T-NNN. If an AC isn't covered by any journey, either the journey is wrong or a new journey is needed.

---

## Scope

The participant's profile and identity touchpoints: viewing your own profile, editing your details and avatar, managing hobby tags, adjusting privacy controls, and the cross-flow consequence of privacy settings on group-members visibility.

**In scope:**
- Profile view + edit (avatar, name, bio, hometown)
- Hobby selection
- Privacy controls + their propagation to other surfaces (UF-002 Group Members)
- Sign-out + sign-back-in round trip from the Settings screen

**Out of scope:**
- Login + onboarding for fresh users (TF-001)
- Group discussion + media (TF-002)
- Push notification preferences (E-005 — no UF or TF written yet; story-level T-005-* is the only coverage today)

## Lifecycle & Cadence

| Trigger | Action | Pass criteria |
|---------|--------|---------------|
| **Pre-release** | Run all journeys end-to-end on the release candidate build | All journeys complete successfully |
| **Pre-ship (R-NNN Shipped)** | Re-run all journeys on production build | All complete |
| **Nightly (post-launch)** | Run all journeys against production | Failures alert QA channel; ≥2 consecutive nightly fails escalate to PM |
| **After any BUG fix lands on a touched story** | Re-run any journey whose Stories Covered list includes the BUG's story | Targeted journey passes |
| **Flow diff** | When UF-003 changes materially, bump TF-003 version and update affected journeys | Plan stays in sync with the flow |

The QA Agent records every run in the [Run Log](#run-log).

## How to read a journey

Each journey is structured as:

- **Title** — the participant's intent in plain English
- **Story arc** — 1–2 sentences narrating what happens
- **Stories covered + ACs hit** — explicit list; the journey covers every listed AC inline
- **Preconditions** — the starting state for the whole journey (set once)
- **The journey** — numbered, continuous steps that flow as one Maestro execution
- **Inline verifications** — `✓ Verify:` lines threaded into the steps; these are the AC checkpoints
- **Alt branches** — short variants the same Maestro flow can take on (e.g. permission denied) without resetting state
- **Failure indicators** — what regression looks like

There is no "Priority" per journey because every journey is required for this flow's pass.

---

## Journey A — Set Up My Profile For The Trip

**Story arc:** A returning participant lands on the home screen, taps their profile, edits their details (avatar, name, hometown, bio), picks their hobbies, and confirms the profile looks correct.

**Stories covered:** S-003-001, S-003-002, S-003-003
**ACs hit inline:** TC-003-001-001 (profile fields display), TC-003-001-002 (own profile shows all fields), TC-003-002-001..N (edit save), TC-003-003-001..N (hobby selection + persistence)
**T-NNN backup (don't re-run):** T-003-001, T-003-002, T-003-003 — covered by this journey at the flow level

**Preconditions:**
- Authenticated session on Home
- Test account exists with name + email pre-populated from Salesforce, no avatar set, no hobbies set, default privacy (everything visible)
- Photo library permission has not yet been requested by the app
- A test photo exists in the device photo library

**The journey:**

1. From Home, tap the profile icon in the header.
2. ✓ Verify: Profile screen renders within 2s showing avatar placeholder, display name (from Salesforce), email, empty Bio section, empty Hobbies list. (TC-003-001-001, TC-003-001-002)
3. Tap **Edit Profile**.
4. ✓ Verify: Edit Profile screen pre-populates Display Name from Salesforce; Bio + Hometown fields are empty and editable.
5. Tap the avatar to open the image picker.
6. ✓ Verify: OS photo permission prompt appears in-context (NOT at app launch).
7. Grant photo permission, select the test photo from the library.
8. ✓ Verify: Avatar preview updates immediately in Edit Profile; the new image is staged but not yet saved (verify by tapping Back and seeing the OLD avatar on Profile — then return to Edit Profile to confirm the stage is preserved).
9. Set Hometown to "Chicago, IL".
10. Set Bio to "Excited to meet everyone on the trip!".
11. Tap **Save**.
12. ✓ Verify: Profile screen returns within 2s with the new avatar, hometown, and bio displayed. (TC-003-002 ACs)
13. From Profile, tap **Hobbies**.
14. ✓ Verify: Edit Hobbies modal opens with all options unselected.
15. Select 4 hobbies (e.g. Hiking, Photography, Reading, Cooking).
16. Tap **Save**.
17. ✓ Verify: Modal dismisses; Hobbies section on Profile shows all 4 selections in the order chosen. (TC-003-003 ACs)
18. Force-quit the app, relaunch (skip onboarding via biometric or remembered session).
19. From Home, tap profile again.
20. ✓ Verify: All edits persisted server-side — avatar, hometown, bio, hobbies all render as set in steps 8–15. (Persistence check across app launch)

**Alt branch — photo permission denied:** At step 7, deny photo permission. ✓ Verify: Edit Profile remains usable; avatar stays at placeholder; a clear inline message explains why the photo picker is unavailable; tapping the avatar again re-prompts (per OS rules, may route to Settings). The rest of the journey continues normally with avatar unchanged.

**Failure indicators:**
- Photo permission requested at app launch (poor onboarding pattern)
- Edits appear saved but don't persist across app relaunch (silent server-side failure)
- Avatar staging lost on Back/return to Edit Profile (state regression)
- Hobby order changes between save and display (sort regression)
- Profile screen shows partial data on initial render (data-fetch race)

---

## Journey B — Lock Down My Privacy, Verify In A Group

**Story arc:** A privacy-conscious participant opens Settings, hides their hometown and bio from other participants, then navigates to a group's Members list to confirm their own row reflects the change while another participant's still-public hometown remains visible. This is the cross-flow journey: privacy is a UF-003 setting but its effect is observed in UF-002.

**Stories covered:** S-003-004, plus cross-flow verification touching S-002-002 (Group Members)
**ACs hit inline:** TC-003-004-001..N (toggle privacy + persist), TC-003-001-003 (other members' hidden fields not shown), cross-flow propagation
**T-NNN backup:** T-003-004 — covered by this journey

**Preconditions:**
- Same Journey A end-state: profile fully populated (avatar, name, "Chicago, IL", bio, 4 hobbies)
- User is enrolled in a test group with ≥ 1 other member whose hometown is set and public
- Default privacy state: everything visible

**The journey:**

1. From Home, tap profile → tap **Settings**.
2. ✓ Verify: Settings screen shows Notification Preferences, Privacy controls, Dark Mode, App Version, Sign Out.
3. In Privacy, toggle **Hide hometown** ON.
4. ✓ Verify: Toggle saves immediately (per design — no Save button on Settings). A subtle confirmation may appear.
5. Toggle **Hide bio** ON.
6. ✓ Verify: Same immediate-save behavior.
7. Leave Hobbies privacy = visible.
8. Tap Back to return to Profile.
9. ✓ Verify: On the participant's OWN profile, hometown + bio are STILL visible (own profile always shows all fields per TC-003-001-002), but a privacy indicator badge or label appears next to those fields to remind the user they're hidden from others.
10. Navigate to Home → tap the test group card → tap **Members** tab in Group Details.
11. ✓ Verify: The user's OWN row in Members shows display name, avatar, NO hometown (privacy honored). (TC-003-001-003)
12. ✓ Verify: The other member's row STILL shows their public hometown (other users' privacy is independent — we didn't accidentally hide globally).
13. Tap into your own row (if member detail is supported) OR open the other member's profile from their row.
14. ✓ Verify: Viewing yourself from this entry point: hometown + bio still visible to you (own-profile rule). Viewing the other member: their public hometown visible.
15. Back to Home → back to Profile → Settings → toggle **Hide hometown** OFF (cleanup).
16. ✓ Verify: Hometown immediately reappears in the Group Members view (no app relaunch required — privacy state propagates live or on next view).

**Failure indicators:**
- Toggling privacy on own profile hides the field from your own view (regression — own profile must always show everything)
- Other members' rows in Members lose their public hometown when you toggle YOUR privacy (broadcasting your setting to everyone else)
- Privacy toggle requires an explicit Save (settings are designed to save inline; if a Save button appears, the design changed and TF needs updating)
- Privacy state lost on app relaunch (persistence regression)
- The "live propagation" in step 16 fails — requires force-quit to take effect (acceptable but inferior; flag for PM)

---

## Journey C — Sign Out, Sign Back In, Profile Survives

**Story arc:** A participant signs out from Settings, lands back on the Login screen, signs in again through Salesforce, returns to Home, opens Profile, and confirms everything they configured in Journeys A + B is intact. This is the session-boundary journey — proves nothing is being held in transient memory that should be in the database.

**Stories covered:** S-003-004 (Sign Out exit), S-003-001 (Profile view after re-auth)
**ACs hit inline:** Sign-out exit point coverage, profile data persistence across full session boundary
**T-NNN backup:** none — emergent (this is a journey only TF can express; it spans the auth + profile boundary)

**Preconditions:**
- End-state of Journey B with hometown un-hidden, everything else as set in Journey A

**The journey:**

1. From Home, tap profile → tap **Settings**.
2. Tap **Sign Out**.
3. ✓ Verify: Confirmation prompt may appear (depending on design); confirm.
4. ✓ Verify: App lands on Login screen (NOT a blank screen, NOT crashed).
5. ✓ Verify: No protected screen is reachable — attempt to background + foreground; should return to Login, not to any previous authenticated state.
6. Tap **Sign In** → complete Salesforce OAuth with the same account.
7. ✓ Verify: App routes to Home (NOT to Welcome / Onboarding — this is a returning user with a complete profile).
8. From Home, tap profile.
9. ✓ Verify: Avatar, hometown, bio, all 4 hobbies are exactly as set in Journey A.
10. ✓ Verify: Privacy settings match the end-state of Journey B (re-enter Settings to confirm toggles).

**Alt branch — wrong Salesforce credentials on re-sign-in:** At step 6, enter wrong credentials. ✓ Verify: OAuth fails, returns to Login screen, no partial session created, profile data still intact server-side (verify with a successful subsequent sign-in).

**Failure indicators:**
- Sign Out leaves the user on a half-authenticated screen
- Sign-back-in routes to Welcome/Onboarding instead of Home (first-vs-returning detection broken)
- Profile data appears reset after sign-back-in (regression — would mean profile was being held in client state, not server-side)
- Privacy settings reset to default (same issue, separate field)

---

## Coverage matrix

| Story | All ACs covered by | Notes |
|-------|-------------------|-------|
| S-003-001 View Profile | Journey A (steps 2, 20), Journey B (step 9, 14), Journey C (steps 8–9) | Multiple journeys hit the same view AC under different conditions (fresh, post-edit, post-privacy-change, post-sign-back-in) |
| S-003-002 Edit Profile | Journey A (steps 3–12) + Alt branch | Avatar + text fields edited inline; photo permission deny covered as alt |
| S-003-003 Edit Hobbies | Journey A (steps 13–17) | Selection + persistence + order |
| S-003-004 Privacy Settings | Journey B (entire) + Journey C (step 10) | Privacy toggle + cross-flow propagation to UF-002 Members + persistence across sign-out |

Every AC in S-003-001..004 is verified by at least one journey. No invented FC cases. T-NNN remains as the unit-level safety net but is **not re-run** at the flow level — these journeys are the flow-level test of record.

## Maestro implementation notes (for the QA Agent)

- **One Maestro flow per journey.** Don't break a journey into multiple flows for "cleanliness"; the state-continuity is the point.
- **Use `runFlow` for shared setup only.** Login + reach Home can be a shared setup flow that all three journeys invoke; everything after Home should be inline.
- **Verify steps marked `✓ Verify:` map to `assertVisible` / `assertNotVisible` / `assertWithAI` in Maestro.** AC IDs in parentheses are for traceability — they don't need to be in the Maestro YAML.
- **Alt branches go in separate Maestro flow files** named `TF-003-journey-a-alt-photo-deny.yaml`. They reuse the same setup up to the branch point.
- **Capture evidence per journey, not per step.** One screenshot at every `✓ Verify` checkpoint; final screen of the journey saved as the journey's primary evidence artifact.

---

## Run Log

The QA Agent appends a row here on every run. PM reviews monthly.

| Run date | Build / commit | Trigger | Result | Failed journeys | Notes |
|---------|----------------|---------|--------|------------------|-------|
| _no runs yet_ | — | — | — | — | Plan v1.0 created 2026-05-19 — first journey-style TF in this project; first run on the next release candidate |

---

## Open Questions

1. **Settings save behavior** — Are Settings privacy toggles inline-save or do they require an explicit Save? Journey B assumes inline. Confirm with design before first run, or Journey B will fail step 4.
2. **Live propagation of privacy on Members view** — Does toggling privacy require force-quit before Group Members reflects the change, or does it propagate live? Journey B step 16 will reveal this. Either is acceptable; the journey adjusts accordingly.
3. **Sign Out confirmation** — Is there a confirmation prompt before Sign Out, or is it immediate? Journey C step 3 assumes "may appear" — confirm.
4. **Photo permission re-prompt** — On iOS, after a hard deny, the app can't re-prompt without routing to Settings. Journey A alt branch step assumes that path. If the app shows a custom in-app gate that links to OS Settings, document it.
5. **Member detail view** — Journey B step 13 references "tap into your own row" — does the Members list support tapping a row to open a detail / mini-profile? If not, that step skips. UF-003 doesn't currently show this affordance.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-19 | 1.0 | PM Agent | Created — 3 journeys covering all 4 stories under UF-003 with full AC traceability. **Style: Journeys** (different shape from TF-001/TF-002 which use isolated FC cases). Goal: fewer, longer Maestro flows that exercise the participant's real session shape. Verifies privacy cross-flow propagation into UF-002 Group Members. |
