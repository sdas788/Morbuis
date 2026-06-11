# Flow Test Plan: Group Leader Management

**ID:** TF-004
**Project:** roadscholar-mobile
**Flow:** [UF-004 Group Leader Management](../flows/UF-004-group-leader-management.md)
**Type:** Flow regression — evergreen, re-run every release + nightly
**Stage:** Active
**Version:** 1.0
**Created:** 2026-05-19
**Updated:** 2026-05-19
**Owner:** QA Agent (curated by PM)
**Style:** Journeys (continuous end-to-end Maestro flows)

> **What this document is.** A small set of **continuous user journeys** that, between them, exercise every story under this flow. Each journey is one believable user session — not a list of isolated test cases. The QA agent's job is to implement each journey as **one** Maestro flow, not N.
>
> **Coverage discipline.** Each journey lists exactly which ACs it verifies along the way. The coverage matrix at the bottom proves every AC is hit across all journeys. No invented cases. No duplicating T-NNN. T-004-001 and T-004-002 remain the unit-level safety nets but are **not re-run** at the flow level.

---

## Scope

The group-leader's self-service path into their trip groups: landing on the leader-specific trips list, searching for a program by number, joining it, and watching the trips list grow. This flow is narrow but high-leverage — it's the only way leaders provision themselves, and a regression here means leaders can't access their groups at trip start.

**In scope:**
- Group Leader Trips screen (empty state + populated list)
- Join Group screen (search, no-match, match → join)
- Cross-flow entry into Group Details (UF-002) via the leader path
- Role gating — participants cannot reach leader-only screens
- Auto-creation of a Verint account on first join for a leader without one

**Out of scope:**
- Login + onboarding (TF-001)
- Group discussion + media inside Group Details (TF-002)
- Profile + privacy (TF-003)
- Removing a leader from a group (separate flow; explicitly Do-Not-Do on S-004-002)

## Lifecycle & Cadence

| Trigger | Action | Pass criteria |
|---------|--------|---------------|
| **Pre-release** | Run all journeys end-to-end on the release candidate build | All journeys complete successfully |
| **Pre-ship (R-NNN Shipped)** | Re-run all journeys on production build | All complete |
| **Nightly (post-launch)** | Run all journeys against production | Failures alert QA channel; ≥2 consecutive nightly fails escalate to PM |
| **After any BUG fix lands on a touched story** | Re-run any journey whose Stories Covered list includes the BUG's story | Targeted journey passes |
| **Flow diff** | When UF-004 changes materially, bump TF-004 version and update affected journeys | Plan stays in sync with the flow |

The QA Agent records every run in the [Run Log](#run-log).

## How to read a journey

Each journey is structured as:

- **Title** — the leader's intent in plain English
- **Story arc** — 1–2 sentences narrating what happens
- **Stories covered + ACs hit** — explicit list; the journey covers every listed AC inline
- **Preconditions** — the starting state for the whole journey (set once)
- **The journey** — numbered, continuous steps that flow as one Maestro execution
- **Inline verifications** — `✓ Verify:` lines threaded into the steps; these are the AC checkpoints
- **Alt branches** — short variants the same Maestro flow can take on without resetting state
- **Failure indicators** — what regression looks like

There is no "Priority" per journey because every journey is required for this flow's pass.

---

## Journey A — Find My First Group Of The Season

**Story arc:** A group leader with no groups yet signs in, lands on Group Leader Trips (empty state), uses Join Group with a known program number, confirms the search result, joins, lands in Group Details, then backs out to see the newly-joined group now populating the previously-empty Trips list.

**Stories covered:** S-004-001, S-004-002
**ACs hit inline:** TC-004-002-003 (empty state), TC-004-001-001 (valid search → match shown), TC-004-001-002 (Join → Group Details), TC-004-002-001 (populated list after join), TC-004-002-002 (tap entry → Group Details)
**T-NNN backup (don't re-run):** T-004-001, T-004-002 — covered by this journey at the flow level

**Preconditions:**
- Authenticated session on Home for a test leader account with the group-leader role
- The account currently has **zero** joined leader groups (clean slate — coordinate with backend fixture to reset on each run)
- A valid test program number is known (e.g., `58235`) and Road Scholar has staged the matching program in Verint with at least one participant already enrolled
- The leader account has a Verint account already provisioned (auto-creation is covered separately in Journey C)
- Network is healthy

**The journey:**

1. From Home, open the navigation and tap **Group Leader**.
2. ✓ Verify: Group Leader Trips screen renders within 2s.
3. ✓ Verify: Empty state displayed — copy similar to "You haven't joined any groups yet. Use Join Group to find your trip." A **Join Group** button is visible. (TC-004-002-003)
4. Tap **Join Group**.
5. ✓ Verify: Join Group screen opens with a program number input field, a numeric keyboard, and a Search / Find button. No result card is shown yet.
6. Enter the valid program number `58235` and tap **Search**.
7. ✓ Verify: Within 3s a result card appears showing the program name and trip dates. A **Join** button is visible on the card. (TC-004-001-001)
8. Tap **Join** on the result card.
9. ✓ Verify: After a brief loading state the app navigates to **Group Details** for the joined program (NOT back to Group Leader Trips, NOT to Home). (TC-004-001-002)
10. ✓ Verify: Group Details shows the leader's Group Leader badge / leader-context indicator (cross-ref UF-002 — leader visibility cue is one of the differentiators of the leader path).
11. Tap **Back**.
12. ✓ Verify: App returns to **Group Leader Trips** (NOT to Join Group — the join completed the flow segment).
13. ✓ Verify: The Trips list now contains exactly one entry showing the program name and trip dates of the group just joined. (TC-004-002-001)
14. Tap the group entry.
15. ✓ Verify: Group Details opens again for that program. (TC-004-002-002)
16. Tap **Back** to return to Group Leader Trips.
17. ✓ Verify: List still shows the one entry — no duplicate row was created by the round-trip into Details.

**Alt branch — already a member of the searched group:** At step 6, search for a program the leader is already joined to. ✓ Verify: Either the result card shows but Join is disabled / re-labeled (e.g. "Already Joined"), OR tapping Join is a no-op that routes directly to Group Details without creating a duplicate membership. The Trips list count after the round-trip must NOT increase. (Per S-004-001 Do Not Do: "do not duplicate group membership".)

**Failure indicators:**
- Empty state shows generic text or a blank screen (regression on TC-004-002-003)
- Search returns a result but the trip dates are missing or wrong (Verint payload regression)
- Tapping Join hangs > 5s with no loading indicator (silent failure pattern)
- Join completes but the app stays on Join Group instead of routing to Group Details
- Trips list does not refresh post-join — leader has to force-quit before the new group appears (caching regression)
- Duplicate row appears in the Trips list after the second navigation into Details

---

## Journey B — Mistype, Recover, Manage Multiple Groups

**Story arc:** A returning leader with one group already joined opens Group Leader Trips, sees their existing group, opens Join Group, fat-fingers a program number that doesn't exist, sees the "Nothing found" message, corrects the number, joins the second group, and confirms both groups now appear in their Trips list.

**Stories covered:** S-004-001, S-004-002
**ACs hit inline:** TC-004-002-001 (populated list — pre-existing), TC-004-001-003 ("Nothing found" copy), TC-004-001-001 (valid search after recovery), TC-004-001-002 (Join → Group Details), TC-004-002-001 (list grew to 2)
**T-NNN backup:** T-004-001, T-004-002 — covered by this journey

**Preconditions:**
- Authenticated session on Home for a test leader account
- Account has **exactly one** group already joined (from a prior fixture seed or from running Journey A first as setup)
- A second valid test program number is known and staged in Verint (e.g., `58236`)
- A known-invalid program number string is available (e.g., `99999` — guaranteed never seeded in Verint)
- Leader has a Verint account already provisioned

**The journey:**

1. From Home, tap **Group Leader**.
2. ✓ Verify: Group Leader Trips loads and shows exactly **one** entry — the previously-joined group with program name and dates. (TC-004-002-001 — pre-state)
3. Tap **Join Group**.
4. Enter the invalid program number `99999` and tap **Search**.
5. ✓ Verify: Within 3s the screen displays the no-result state with copy "Nothing found" (or the exact copy from S-004-001 FR). No result card is shown. The input remains visible and editable. (TC-004-001-003)
6. Clear the input and enter the valid second program number `58236`.
7. Tap **Search**.
8. ✓ Verify: Result card appears with the second program's name and dates and a Join button. (TC-004-001-001 — repeat verification under post-error condition)
9. Tap **Join**.
10. ✓ Verify: App navigates to Group Details for the second program. (TC-004-001-002)
11. Tap **Back**.
12. ✓ Verify: App returns to Group Leader Trips.
13. ✓ Verify: Trips list now contains **two** entries — the original group AND the newly-joined second group. Both show program name and dates. Order is deterministic (most-recent-joined first OR by trip date — confirm convention; either is acceptable as long as it's stable across runs). (TC-004-002-001 — post-state)
14. Tap the **first** (original) entry.
15. ✓ Verify: Group Details opens for that program — confirms entries are correctly bound to their groups and aren't cross-wired after a join. (TC-004-002-002)
16. Tap Back. Tap the **second** entry.
17. ✓ Verify: Group Details opens for the second program (not the first). (TC-004-002-002, anti-regression)

**Failure indicators:**
- "Nothing found" copy is missing, generic, or accompanied by an error toast that looks like a system error (poor UX for an expected outcome)
- Searching after a no-result state requires backing out and re-entering Join Group (state regression)
- Joining the second group replaces the first in the list instead of appending (list write regression)
- Tapping list entries opens the wrong group's details (rendering against stale state)
- Join Group's input field is auto-cleared on the "Nothing found" state, forcing the leader to re-type from scratch (UX regression)

---

## Journey C — Role Gating + First-Time Leader Without A Verint Account

**Story arc:** Two-part journey that protects the flow's access boundaries. First, a participant (non-leader) account confirms the Group Leader entry points are not reachable. Then, switching to a leader account that has **never** had a Verint account, the leader joins their first group and the system silently auto-creates the Verint account during the join — the leader sees a normal join flow with no extra steps.

**Stories covered:** S-004-001, S-004-002
**ACs hit inline:** TC-004-002-004 (non-leader doesn't see screen), TC-004-001-004 (non-leader cannot access Join Group route), TC-004-001-005 (auto-create Verint account on first join)
**T-NNN backup:** T-004-001 (auto-create + role-gate ACs), T-004-002 (role-gate AC) — covered by this journey

**Preconditions:**

Part 1 (role gating):
- Authenticated session on Home for a **participant** test account (no group-leader role)

Part 2 (Verint auto-create):
- A **fresh leader** test account that has the group-leader role but has **never** joined a group AND has **no Verint account** yet (coordinate with backend to provision this state — the account is fresh in Salesforce but absent in Verint)
- A valid test program number is known and staged
- The `/api/create-verint-account` endpoint is operational

**The journey:**

**Part 1 — Role gating (participant account)**

1. From Home, open the main navigation.
2. ✓ Verify: The **Group Leader** menu item is NOT present in the navigation for this participant account. (TC-004-002-004)
3. (Negative probe) Attempt to deep-link / route directly into the Group Leader Trips screen by any in-app means available to a participant — e.g., share link, deep link from notification, back stack tampering. If no in-app mechanism exists, this probe is satisfied by step 2 alone; otherwise:
4. ✓ Verify: The route is denied — the leader screen does NOT render. The participant is bounced back to a permitted screen (Home or a Permission Denied surface). (TC-004-001-004)
5. Sign out from this account.

**Part 2 — Fresh leader, auto-create Verint account**

6. Sign in with the fresh-leader test account.
7. From Home, open navigation and tap **Group Leader**.
8. ✓ Verify: The Group Leader menu item IS visible for this account (counterpart to step 2 — confirms role gating is leader-aware, not globally hidden).
9. ✓ Verify: Group Leader Trips loads with the empty state (the account has no groups yet). (TC-004-002-003 — repeat verification under fresh-leader condition)
10. Tap **Join Group**.
11. Enter the valid program number and tap **Search**.
12. ✓ Verify: Result card appears. (TC-004-001-001)
13. Tap **Join**.
14. ✓ Verify: The join completes successfully — the app navigates to Group Details. The leader sees no extra prompt, no error, no manual "create your Verint account" step. The auto-creation happened silently behind the join. The join may take slightly longer than a leader-with-existing-account join (acceptable as long as a loading indicator is shown and the operation completes within a reasonable timeout — e.g., < 10s). (TC-004-001-005)
15. Tap Back.
16. ✓ Verify: Group Leader Trips now shows the one joined group. (TC-004-002-001 — post-auto-create state)

**Alt branch — Verint account creation fails:** During step 13, if the `/api/create-verint-account` call fails (simulate via backend stub or network throttle), the join MUST fail gracefully — show an error message, do NOT silently create a half-state where the leader appears joined but the Verint account never materialized. ✓ Verify: User remains on the Join Group screen with the result card and a clear error. Retrying the join after the backend recovers must succeed without manual intervention.

**Failure indicators:**
- Group Leader menu item appears in the participant's navigation (role-leak; serious — could expose leader-only data)
- Direct route into Group Leader Trips renders for a participant even with the menu hidden (route-level gating missing — TC-004-001-004 regression)
- Fresh-leader join fails or shows a "create account first" error (auto-creation regression — TC-004-001-005)
- Auto-creation succeeds in Verint but Salesforce isn't updated (per FR: "auto-creates one via POST /api/create-verint-account and updates Salesforce") — verify by inspecting the leader's Salesforce record after the join in a staging run
- Join hangs > 10s with no loading indicator (perceived failure even if the backend completes)
- Auto-creation creates the Verint account but the join itself doesn't complete — leader stuck on Join Group with no clear next step

---

## Coverage matrix

| Story | All ACs covered by | Notes |
|-------|-------------------|-------|
| S-004-001 Search & Join Group | Journey A (steps 4–9), Journey B (steps 3–10), Journey C Part 2 (steps 10–14) | TC-004-001-001 hit by A+B+C; TC-004-001-002 hit by A+B; TC-004-001-003 hit by B; TC-004-001-004 hit by C Part 1; TC-004-001-005 hit by C Part 2 |
| S-004-002 Group Leader Trips | Journey A (steps 1–17), Journey B (steps 1–17), Journey C (steps 7–16) | TC-004-002-001 hit by A (post-join growth) + B (pre + post); TC-004-002-002 hit by A+B; TC-004-002-003 hit by A + C Part 2; TC-004-002-004 hit by C Part 1 |

Every AC across S-004-001 and S-004-002 is verified by at least one journey. No invented FC cases. T-004-001 and T-004-002 remain unit-level safety nets but are **not re-run** at the flow level — these journeys are the flow-level test of record.

## Maestro implementation notes (for the QA Agent)

- **One Maestro flow per journey.** Don't break Journey A into "test empty state" + "test join" — the empty-state-then-populated-state transition IS the test.
- **Shared setup via `runFlow`:**
  - `setup-leader-on-home-clean.yaml` — auth + reach Home + reset leader's groups to zero (Journey A precondition)
  - `setup-leader-on-home-one-group.yaml` — auth + reach Home + ensure exactly one joined group (Journey B precondition)
  - `setup-participant-on-home.yaml` — auth as participant + reach Home (Journey C Part 1)
  - `setup-fresh-leader-on-home.yaml` — auth as fresh leader account with no Verint account (Journey C Part 2)
- **Backend fixtures matter here.** Unlike TF-001..003, this plan is sensitive to backend state on every run (joined groups, Verint account existence). Coordinate with the dev team on either (a) a nightly reset of the test leader accounts to a known clean state, or (b) Maestro-driven cleanup steps that leave + clean up groups at the end of each journey. Option (a) is preferable.
- **Verint API behavior is the boundary** for this flow. If Verint is degraded, all three journeys will fail. The QA Agent should record Verint health (latency, error rate) alongside each run in the Notes column so a "TF-004 failed" alert can be quickly triaged as a Verint outage vs. an app regression.
- **`✓ Verify:` checkpoints** map to `assertVisible` / `assertNotVisible` / `assertWithAI` in Maestro. AC IDs in parentheses are for traceability — they don't need to be in the Maestro YAML.
- **Alt branches go in separate Maestro flow files** — `TF-004-journey-a-alt-already-member.yaml`, `TF-004-journey-c-alt-verint-create-fails.yaml`. They reuse the same setup up to the branch point.
- **Evidence capture:** screenshot per `✓ Verify` + the final populated Trips list as each journey's primary artifact.

---

## Run Log

The QA Agent appends a row here on every run. PM reviews monthly.

| Run date | Build / commit | Trigger | Result | Failed journeys | Notes |
|---------|----------------|---------|--------|------------------|-------|
| _no runs yet_ | — | — | — | — | Plan v1.0 created 2026-05-19 — three journeys covering S-004-001 + S-004-002. Sensitive to Verint + backend fixture state; coordinate test-account reset before first run. |

---

## Open Questions

1. **Navigation visibility for non-leaders** — Is the Group Leader menu item completely hidden for participant accounts (Journey C step 2 assumption), or visible-but-blocked-on-tap? UF-004 says "Home → Group Leader menu" as the entry but doesn't specify role-aware visibility. Confirm with code or design before first run.
2. **Post-join routing** — UF-004 and S-004-001 both say a successful Join routes to Group Details. Journey A step 9 enforces this. If the actual behavior is "Join → back to Trips with the new group highlighted", flag for PM and update Journey A — the AC and the flow doc may be out of sync with shipped behavior.
3. **Verint auto-create loading state** — During the silent auto-account-creation on first join (Journey C Part 2 step 14), does the app show a generic spinner, a specific "Setting up your leader account…" message, or nothing? The journey accepts any of these as long as the operation completes; ideal UX is a non-generic message. Confirm with design.
4. **Trips list ordering** — Journey B step 13 verifies "Order is deterministic" but doesn't enforce a specific order. Confirm the convention (most-recently-joined first vs. by trip date) so the journey can assert it precisely.
5. **Participant count on list entries** — S-004-002 FR mentions "participant count" on each Trips list entry; UF-004 doesn't mention it in the Key content section. Which is canonical? If participant count IS displayed, Journeys A and B should verify it; currently they don't.
6. **Salesforce sync verification** — TC-004-001-005 specifies that Salesforce is updated after Verint auto-creation. The journey notes this in failure indicators but doesn't enforce it in a `✓ Verify:` step because Salesforce inspection isn't part of the mobile app surface. Decide whether this is verified out-of-band (backend automated test) or by the QA Agent on staging runs only.
7. **Already-a-member alt branch behavior** — Journey A's alt branch assumes the app either disables Join or no-ops the duplicate join. S-004-001 Do-Not-Do says "do not duplicate group membership" but doesn't specify the UI affordance. Confirm with engineering.

---

## Change Log

| Date | Version | Author | Summary |
|------|---------|--------|---------|
| 2026-05-19 | 1.0 | PM Agent | Created — 3 journeys covering all ACs across S-004-001 + S-004-002 under UF-004. **Style: Journeys** (consistent with TF-001..003 v2.0 journey style). Journey C splits into two parts to cover the role-gating boundary and the fresh-leader Verint auto-create path without resetting state mid-journey. Plan is sensitive to backend fixture state — coordinate test-account reset before first run. |
