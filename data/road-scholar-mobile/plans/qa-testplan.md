# QA Test Plan

**Project:** roadscholar-mobile
**Type:** Project QA operating manual — indexes TF / TR / T plans, names test accounts, documents backend deps + teardown + workarounds + triage
**Owner:** QA Agent (curated by PM)
**Created:** 2026-05-19
**Updated:** 2026-05-23
**Version:** 1.3

> This is the **operating manual** for running the flow regression suite. It indexes the four TF plans, names the test accounts and backend fixtures each one depends on, documents the workarounds you need to run them reliably, and specifies the teardown that has to happen between runs so the next run starts from a known state.
>
> **If you are the QA Agent:** start here on every run. Confirm the prerequisites in [Backend dependencies](#backend-dependencies) and [Test accounts](#test-accounts) are healthy, then execute in [Execution order](#execution-order). On failure, route through [Failure triage](#failure-triage) before opening a bug.
>
> **If you are the PM:** keep [Test accounts](#test-accounts), [Backend dependencies](#backend-dependencies), and [Known workarounds](#known-workarounds) up to date. The QA agent will not invent these; if they go stale, runs will silently degrade.

---

## Suite index

| Plan | Flow | Style | Journeys | Status | Notes |
|------|------|-------|----------|--------|-------|
| [TF-001](TF-001-login-onboarding.md) | [UF-001](../flows/UF-001-login-onboarding.md) Login & Onboarding | Journeys (v2.0) | 5 + 4 alt branches | Active | Includes token-backdate harness path (see [Known workarounds](#known-workarounds)) |
| [TF-002](TF-002-group-browsing-discussion.md) | [UF-002](../flows/UF-002-group-browsing-discussion.md) Group Browsing & Discussion | Journeys (v2.0) | 4 | Active | Requires a second test account for cross-account interactions + a backend push hook |
| [TF-003](TF-003-profile-management.md) | [UF-003](../flows/UF-003-profile-management.md) Profile Management | Journeys | 3 | Active | Verifies cross-flow propagation of privacy settings into TF-002 surface |
| [TF-004](TF-004-group-leader-management.md) | [UF-004](../flows/UF-004-group-leader-management.md) Group Leader Management | Journeys | 3 | Active | Sensitive to backend fixture state; requires fresh-leader-without-Verint-account |
| [TF-005](TF-005-offline-resilience.md) | [UF-005](../flows/UF-005-offline-resilience.md) Offline & Reliability | Journeys | 4 | Active | Cross-cutting system flow — exercises airplane-mode toggle, queue + reconnect, token-expiry-while-offline (RSS-437), banner-on-every-screen (RSS-410), reconnect-without-relaunch (RSS-403), forced-update gate. Needs Maestro airplane-mode support + token-backdate harness + VERSION_INFO_URL variant publishing. |
| [TF-006](TF-006-anomaly-boundary.md) | N/A — no single UF | **Cases** | 50 (13 Core 10) | Active | Anomaly + boundary coverage across all input + render surfaces. Cases-style (not journeys). Strings / Media / Time / Network / Device categories. Core 10 subset runs on PR; full set runs nightly. Catalog grows with bugs found. |

**Coverage:** every UF in [flows/](../flows/) has a TF plan. TF-006 is the cross-cutting anomaly catalog (not UF-keyed). Stories outside these flows fall back to story-level T-NNN coverage in [epics/](../epics/).

## Lifecycle & cadence

Same contract on every TF — the suite as a whole runs:

| Trigger | Action |
|---------|--------|
| **Pre-release** (release candidate built) | All 4 TFs end-to-end on the RC build |
| **Pre-ship** (R-NNN moving to Shipped) | Re-run all 4 on the production build |
| **Nightly** (post-launch) | All 4 against production |
| **Post-BUG-fix** | Re-run only the TFs whose Stories Covered includes the BUG's story |
| **Flow diff** | When any UF-NNN changes, bump the matching TF version + update affected journeys |

Each run gets a row in the plan's Run Log. The QA Agent appends; the PM reviews monthly.

---

## Test accounts

These are the accounts the suite needs. **Each account must be pre-provisioned in Salesforce and (where applicable) Verint before the first run.** The QA Agent does not create them — request from the dev team if any row is `(missing)`.

**One row per role × state combination.** Re-using accounts across journeys is fine and encouraged, but the listed end-state of any journey must be reachable from the account's documented baseline.

| Handle | Role | Baseline state | Used by | Credentials location |
|--------|------|----------------|---------|----------------------|
| `rs-test-fresh-participant` | Participant | No prior sign-in on this device; no profile customization; no joined groups | TF-001 Journey A (fresh install) | _to fill in_ |
| `rs-test-returning-participant` | Participant | Has signed in before; biometric enrolled; remembered session intact; profile populated (avatar, hometown, bio, 4 hobbies); default privacy | TF-001 Journey C, TF-003 Journey A baseline, TF-003 Journey B | _to fill in_ |
| `rs-test-second-participant` | Participant | Member of the **same** test group as `rs-test-returning-participant`; profile populated with a **public** hometown (for cross-privacy verification); has posted ≥1 post in the shared group | TF-002 (cross-account replies, likes, push triggers); TF-003 Journey B (other-member visibility check) | _to fill in_ |
| `rs-test-banned-user` | Banned | Salesforce account flagged as banned per [arch.md `Bad Actor / Banned User Check`](../reference/arch.md) | TF-001 Journey D (OAuth recovery — ban-state branch) | _to fill in_ |
| `rs-test-multi-group-participant` | Participant | Member of ≥3 groups for the home-screen group-list verifications | TF-002 Journey A baseline | _to fill in_ |
| `rs-test-leader-with-verint` | Group Leader | Verint account exists; has 0 joined leader-groups at start (reset nightly) | TF-004 Journey A baseline | _to fill in_ |
| `rs-test-leader-one-group` | Group Leader | Verint account exists; has exactly 1 joined leader-group at start | TF-004 Journey B baseline | _to fill in_ |
| `rs-test-fresh-leader-no-verint` | Group Leader | group-leader role in Salesforce; **no** Verint account; **no** joined groups (regenerate nightly — see [Teardown](#teardown--data-cleanup)) | TF-004 Journey C Part 2 | _to fill in_ |

**Test data the accounts need to interact with:**

| Item | Purpose | Source |
|------|---------|--------|
| Shared test group `RS-TEST-GROUP-A` | Hosts cross-account posts/likes/replies for TF-002; hosts Members list for TF-003 Journey B | Backend fixture |
| Second test group `RS-TEST-GROUP-B` | Differentiates list ordering + multi-group navigation | Backend fixture |
| Program number `58235` (valid) | TF-004 Journey A & C — known-good Verint program for the leader to join | Verint staging |
| Program number `58236` (valid, second program) | TF-004 Journey B — second program for multi-group scenario | Verint staging |
| Program number `99999` (invalid) | TF-004 Journey B — guaranteed no-match for "Nothing found" verification | Must remain unseeded in Verint forever |
| Test photo in device library | TF-003 Journey A — avatar selection | Maestro-managed device asset |

## Backend dependencies

The suite is only as reliable as the services behind the app. Before any run, confirm the following are green. If any is degraded, mark the run as **environment-blocked** in the Run Log (not failed) and notify the dev team — degraded backend ≠ app regression.

| Service | Used for | Health probe | If down |
|---------|----------|--------------|---------|
| **Salesforce OAuth 2.0** | All sign-in / sign-out journeys | Manual sign-in with `rs-test-returning-participant` from a fresh app install | Block the entire suite — no journey can start |
| **Verint REST API** | TF-002 (groups, posts, members), TF-004 (program search, join) | `GET /api/groups` returns 200 within 2s | TF-002 + TF-004 are environment-blocked; TF-001 + TF-003 can still run |
| **POST `/api/create-verint-account`** | TF-004 Journey C Part 2 (auto-create on first join) | Backend smoke test | TF-004 Journey C Part 2 is environment-blocked; A + B still run |
| **Firebase `versioninfo.json`** | Forced-upgrade gate referenced in [arch.md](../reference/arch.md) | Endpoint returns current min-version JSON | TF-001 may show unexpected upgrade prompt — pause and confirm with dev before triaging as app bug |
| **Push notification service (FCM/APNs)** | TF-002 Journey D (push deep-link) | Send a test push to a known device token | TF-002 Journey D is environment-blocked; A/B/C still run |
| **Token-backdate dev harness** | TF-001 Journey C alt branch (expired token refresh) | See [Known workarounds](#known-workarounds) | TF-001 Journey C alt branch is skipped; main journey still runs |

**Verint rate limiting** is a known constraint — see [arch.md `Verint Rate Limiting`](../reference/arch.md). The suite is built to operate well below the rate limit, but back-to-back nightly + post-fix re-runs CAN exceed it. If you see 429s in the Run Log, throttle the cadence rather than retrying immediately.

## Execution order

**Nightly / pre-release order:**

1. **TF-001** (Login & Onboarding) — runs first because every other TF assumes "authenticated session on Home" as its precondition. If TF-001 is red, the others are environment-blocked, not failed.
2. **TF-003** (Profile Management) — must precede TF-002 because TF-003 Journey B writes privacy settings that TF-002 implicitly assumes are default. Reset privacy at TF-003 teardown (see [Teardown](#teardown--data-cleanup)).
3. **TF-002** (Group Browsing & Discussion) — runs against the shared test group; coordinate timing if TF-004's leader-join would touch the same group.
4. **TF-004** (Group Leader Management) — runs last because Journey C Part 2 mutates the `rs-test-fresh-leader-no-verint` account permanently (a Verint account is auto-created and cannot be auto-deleted via the public API). Nightly teardown must regenerate this account from a Salesforce-clean state.
5. **TF-005** (Offline & Reliability) — can run before or after TF-002/004 because it uses its own dedicated account (`rs-test-returning-participant`) on its own pre-cached group, and its mutations (offline like queue) are localized + self-cleaning on reconnect. **Cannot** run in parallel with TF-002 if both target the same cached group on the same account — schedule sequentially in that case. Journey C uses the token-backdate harness like TF-001 Journey C; if the harness is single-use per build, sequence them accordingly.

**Post-BUG-fix order:** run only the TF(s) listed in the bug's affected stories. No need to follow the full nightly sequence. **TF-005 is also re-run on any code change to `src/api/apiSlice.ts`, `src/redux/store.ts`, `src/slices/netInfoSlice.ts`, `src/slices/offlineQueueSlice.ts`, `src/utils/version.ts`, or any component named `NoInternet*` / `UploadingPosts*`** — that's the apiSlice / netInfo / persist boundary the four offline stories ride on.

**Parallel execution:** TF-001 and TF-003 can be parallelized (different accounts, no shared mutable state). TF-002 and TF-004 **cannot** be parallelized with each other or with TF-003 if they share groups or accounts. TF-005 can parallelize with TF-001, TF-003, or TF-004 (different account or different mutation surface), but not with TF-002 if they share the cached group.

## Authoring conventions

These are project-wide rules every TF (and every Maestro flow under it) must follow. Engineers implementing flows in [E-009](../epics/E-009-qa-test-automation/E-009.md) consult these before writing a single line of YAML.

### Free-text input convention — Faker by default

**The rule:** every free-text input in a Maestro flow defaults to a Faker-generated value. Hardcode only when one of the two exceptions applies.

| Decision | When to use | Example |
|----------|-------------|---------|
| **Faker-generated** (default) | The step types a value, the flow moves on. Any later assertion is on round-trip correctness — verifying the typed string reappears — not on a specific text match. | TF-001 Journey A onboarding profile setup: name, hometown, bio. None are asserted against specific strings later — they just need to round-trip. Use `faker.person.firstName() + ' ' + faker.person.lastName()`, capture into a variable, assert the variable round-trips. |
| **Hardcoded** (exception A) | The value is a magic/reserved fixture the system depends on. | TF-004 program numbers (`58235`, `58236`, `99999` — `99999` is reserved-invalid by S-009-008). Login credentials. |
| **Hardcoded** (exception B) | A specific value is asserted as exact-match text downstream (e.g. you type "Chicago" because you'll later search for "Chicago" and verify it appears). | Rare — most search assertions can search for the captured-generated value instead, which is strictly better coverage. Only hardcode if exact text appears in a UI label or status string. |

**Why default to Faker:** every nightly run exercises slightly different inputs without per-flow maintenance cost. Surfaces input-bound regressions (emoji rendering, length-limit edge, normalization) that hardcoded inputs would silently skip. Replay-by-seed (see [TF-006](TF-006-anomaly-boundary.md)) gives deterministic triage when something fails.

**How implementers use it:** the Faker library is part of the Maestro scaffolding from [S-009-001](../epics/E-009-qa-test-automation/S-009-001-maestro-scaffolding.md). For TF-001..005, call `faker.*` inline (one-line invocations like `faker.person.firstName()`) and capture into a Maestro variable. For TF-006 specifically, use the richer per-surface composition rules from `maestro/scripts/fuzz/` which sample across emoji / RTL / length-limit / whitespace branches.

**For PMs writing new TFs:** when authoring a journey's steps, write the input prose-style ("enter a plausible first name") rather than a specific value ("enter Chicago") unless an exception applies. The implementing engineer will translate to `faker.*` automatically. If a specific value is required, write it inline with a brief note WHY ("enter `99999` — reserved-invalid per S-009-008").

### Other conventions

- **Evidence capture** at every `✓ Verify:` checkpoint, named by checkpoint label (see S-009-001 conventions).
- **testID over text** for selectors wherever possible — text changes for copy reasons; testIDs don't.
- **`assertWithAI` only when no stable selector exists** (visual states without testIDs) — see S-009-001 CONVENTIONS.md for examples.
- **Alt branches go in separate `.yaml` files** that reuse setup primitives, named `tf-NNN-journey-X-alt-{branch-slug}.yaml`.

## Teardown / data cleanup

After every run, the backend must return to a known state for the next run. **The QA Agent does not perform teardown itself** — these are dev-team-owned automation steps run on a nightly cron OR triggered as a Maestro post-flow if available.

| TF | Mutations during run | Required teardown |
|----|----------------------|-------------------|
| TF-001 | Sign-in session created for `rs-test-fresh-participant`; biometric may have been enrolled | Revoke session tokens; clear biometric enrollment on the test device; reset `rs-test-fresh-participant` to "never signed in on this device" state |
| TF-002 | Posts created by both accounts in `RS-TEST-GROUP-A`; likes toggled; replies added | Delete posts created during the run (tag with run-ID to identify); restore initial post/like counts |
| TF-003 | Profile of `rs-test-returning-participant` mutated (avatar, hometown, bio, hobbies, privacy toggles) | Reset profile to documented baseline (avatar, name, "Chicago, IL", bio, 4 hobbies, default privacy) |
| TF-004 | Groups joined by leader test accounts; **`rs-test-fresh-leader-no-verint` now has a Verint account** | Remove joined groups for `rs-test-leader-with-verint` (reset to 0 groups); remove joined groups for `rs-test-leader-one-group` (reset to exactly 1 group); **regenerate `rs-test-fresh-leader-no-verint` from a Salesforce-clean state with the Verint account deleted backend-side** |
| TF-005 | Likes toggled on cached posts in `RS-TEST-GROUP-A`; access token may have been backdated (Journey C); `VERSION_INFO_URL` may have been pointed at test variants (Journey D); AsyncStorage `recommendedVersion` key may have been written | Reset like state on `RS-TEST-GROUP-A` posts touched during the run; clear the backdated token + re-issue a fresh one for `rs-test-returning-participant`; restore `VERSION_INFO_URL` to the production-equivalent JSON (both versions ≤ installed build); clear AsyncStorage on the test device between Journey D runs to reset the recommended-version one-shot |

If any teardown step is automated via Maestro, it lives in `qa/teardown/TF-NNN-teardown.yaml` and is invoked by the harness, not by the journey itself.

## Known workarounds

Document the things that aren't bugs but aren't obvious either. The QA Agent reads this before triaging a failure.

| Workaround | Why it exists | How to use it |
|------------|---------------|---------------|
| **Token-backdate dev harness** | TF-001 Journey C's "expired token refresh" alt branch needs a backdated keychain token. The app cannot wait for natural expiration in a test. | Coordinate with dev team on the debug-only API (or Maestro plugin) referenced in [TF-001](TF-001-login-onboarding.md). Only available on `Dev` and `Staging` builds, never `Production`. |
| **Verint timezone behavior** | Verint returns timestamps adjusted to the **user's account timezone**, not the device timezone. A user with a CST profile traveling in Europe sees CST times on the device. ([arch.md `Timezone Handling`](../reference/arch.md)) | When TF-002 verifies a post timestamp, assert against the test account's Verint profile timezone, NOT the device's `TZ` env. Or run the device in the account's timezone. |
| **Push payload injection** | TF-002 Journey D needs a deep-link from a push notification. Triggering one organically requires a second device or a long backend wait. | Either (a) `rs-test-second-participant` replies via a parallel session and the push arrives within 30s, or (b) backend `POST /test-push` injects a known payload directly. Document which is wired up. |
| **Photo-permission re-prompt on iOS** | After a hard deny, iOS will not let the app re-show the OS permission dialog. The app routes to Settings. | TF-003 Journey A alt branch accommodates this — don't flag "no re-prompt" as a bug. |
| **Settings inline-save assumption** | TF-003 Journey B assumes privacy toggles save inline (no Save button). If the design changes to require Save, the journey will fail step 4. | Check design before each run; if Save button reappeared, update TF-003 v1.1 — don't fail the run. |
| **Verint program `99999`** | TF-004 Journey B relies on `99999` being permanently unseeded in Verint. | If Verint ever stages program 99999, pick a new guaranteed-invalid number and update TF-004 + this README in lockstep. |
| **Trips list order convention** | TF-004 Journey B verifies "Order is deterministic" but TF-004 itself flags this as an Open Question. | Until resolved, assert order matches the **first run's** order; flag any change as suspect. PM owns the resolution. |
| **Bad Actor / Banned User check** | TF-001 Journey D verifies banned-user OAuth recovery. The banned state is set in Salesforce, not in the app. | Confirm `rs-test-banned-user` is still flagged banned in Salesforce before the run. If un-banned, the journey will pass for the wrong reason. |
| **Salesforce sync after Verint auto-create** | TF-004 TC-004-001-005 requires Salesforce to be updated after `/api/create-verint-account`. The mobile app cannot inspect Salesforce. | Verify out-of-band: nightly backend test confirms the Salesforce record exists post-Verint-create. The QA Agent flags only the mobile-visible behavior; backend sync is a separate signal. |
| **Maestro airplane-mode primitive (TF-005)** | Maestro's airplane-mode toggling is Android-first. iOS sim requires a host-side command, not a flow step. | On iOS, run TF-005 with the Maestro host wrapping each airplane-toggle step in a `network` simctl command. If the wrapper is unavailable, mark the affected iOS journey `environment-blocked`, not `failed`. |
| **VERSION_INFO_URL variant publishing (TF-005 Journey D)** | Journey D requires four JSON variants pre-staged so the test can switch between them per cold launch. The mobile app cannot mutate this. | Coordinate with backend on a staging bucket where the QA agent has write access, OR a `?variant=` query-param shim served by Firebase Hosting. Document the path in the next Run Log row. |

## Failure triage

Before opening a BUG, run through this decision tree:

```
A TF journey failed.
│
├── Is the backend healthy? (Check [Backend dependencies](#backend-dependencies))
│     ├── No → Mark run "environment-blocked" in Run Log. Do NOT open a bug.
│     └── Yes → continue
│
├── Did the failure occur in a step that depends on a [Known workaround](#known-workarounds)?
│     ├── Yes → Confirm the workaround prerequisite is met (e.g., token-backdate harness available, banned-user-still-banned, etc.).
│     │           ├── Prerequisite missing → Document in Run Log Notes; do NOT open an app bug.
│     │           └── Prerequisite met → continue.
│     └── No → continue
│
├── Did the most recent flow diff (UF-NNN bump) align with this TF version?
│     ├── No → TF-NNN may be stale. Compare UF-NNN to TF-NNN's Change Log. If diverged, refresh TF-NNN (bump version) and re-run.
│     └── Yes → continue
│
├── Is this the first occurrence in the last 30 nightly runs?
│     ├── Yes → Flaky-or-real. Re-run the single failing journey once. If passes, log flake; if fails again, open BUG.
│     └── No (recurring) → Open BUG immediately, set severity per [arch.md](../reference/arch.md) NFRs.
```

Open BUG via the [issues/](../issues/) directory using the project's BUG-NNN convention. Reference the TF + journey + step that failed in the bug's `Affects` field.

## Escalation

| Condition | Action |
|-----------|--------|
| 1 journey failure on nightly | Log + retry the next nightly. If fails again, open BUG and notify QA channel. |
| ≥2 consecutive nightly failures of the same journey | Open BUG + escalate to PM. |
| Entire TF red | Check backend first. If app-side, treat as P1; pause release if one is in flight. |
| Suite red across multiple TFs | Almost certainly a backend / environment issue. Notify dev team before app-side investigation. |

---

## Maintaining this README

Treat this doc the way you treat the TF plans — evergreen, updated when the suite changes. Specifically, update it when:

- A new TF is added (or removed)
- A new test account is needed (or one becomes obsolete)
- A backend dependency changes (new endpoint, deprecated service, rate-limit change)
- A workaround is added, removed, or its mechanism changes
- A teardown step changes (new mutation, new cleanup target)
- A TF's execution order constraint changes (parallelization, sequence dependency)

Bump the **Version** field at the top of this file on every material change and add a Change Log row.

## Change log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-19 | 1.0 | PM Agent | Created — indexes TF-001..004, names 8 test accounts + fixtures, documents Salesforce / Verint / Firebase / push / token-backdate dependencies, specifies teardown per TF, captures 9 known workarounds, defines triage + escalation paths. |
| 2026-05-22 | 1.1 | PM Agent | Added TF-005 (Offline & Reliability) to suite index. Updated execution order: TF-005 added as step 5 with code-change-trigger rules covering the apiSlice / netInfo / persist boundary. Added TF-005 teardown row (like state, backdated token, VERSION_INFO_URL variants, AsyncStorage). Added two new known workarounds: Maestro iOS airplane-mode primitive, VERSION_INFO_URL variant publishing. |
| 2026-05-23 | 1.2 | PM Agent | Added TF-006 (Anomaly & Boundary Coverage) — cases-style (not journeys). Note the implementation epic E-009 enumerates the per-TF implementation effort + the infrastructure work to land all of TF-001..006 + CI/CD + Maestro Cloud + test-account provisioning. |
| 2026-05-23 | 1.3 | PM Agent | Added Authoring conventions section. Free-text inputs default to Faker-generated; hardcoded only for magic fixtures or specific-text assertions. Same convention applies across every TF — TF-001..005 free-text inputs (onboarding profile, post compose, comment, search) all default to Faker per this rule. PM-authored journeys describe inputs prose-style; implementing engineer translates to Faker calls. |
