# Release: Full QA Coverage Expansion — Candidate scope (not yet committed)

**ID:** R-004
**Project:** roadscholar-mobile
**Stage:** Draft
**Status:** Backlog
**Version:** 5.0
**Created:** 2026-05-23
**Updated:** 2026-05-23

---

## Overview

Opt-in follow-on to [R-003 Quality Foundation + Native Auth](R-003-qa-foundation-and-native-auth.md). R-003 v8.0 lands all 11 happy-path journeys across the 5 TF flows + Thorough native auth + 20-case anomaly catalog. R-004 deepens that coverage by adding the **alt-branch journeys** (failure-injected, interruption-injected, edge-state-injected paths) that R-003 explicitly skipped, plus the **infrastructure** those alt-branches need (token-backdate harness, iOS airplane wrapper, per-TF teardown).

**Important: this release is candidate scope, not committed.** Final scope decision happens at the R-003 retro based on production telemetry — which bug classes the R-003 regression suite surfaces will inform which R-004 journeys are highest priority.

**Phasing decision (v5.0):** R-004 is **largely unphased** — within each phase the order is flexible and based on retro signal — but we acknowledge two phases driven by a clear, real dependency:

- **Infrastructure first** (S-009-010 token-backdate + S-009-013 teardown automation + S-009-014 iOS airplane wrapper). Several alt-branch journeys are hard-gated on this work — TF-005 Journey C can't run without token-backdate, Journey D can't run without VERSION_INFO_URL publisher, and per-TF teardown is a prerequisite for sustainably running 10-15+ alt branches.
- **Then alt-branch + fuzz coverage** (S-009-017..022). Once infrastructure lands, the per-flow alt-branch stories and the Faker fuzz harness can be picked up in any order based on retro priority.

Story-specific stories now exist as candidate-scope drafts (S-009-017 through S-009-022 — added 2026-06-04). One story per TF flow plus one for the Faker fuzz harness. Each story groups its respective journeys + alt-branches with priority tags so the retro can commit subsets cleanly.

## Trigger conditions for funding R-004

Assessed at end of R-003 (W5 retro):

1. The R-003 suite has caught ≥1 real regression in PR or pre-release builds
2. The auth-recovery improvements (R-003 P-003-02) are showing measurable support-ticket reduction
3. The team's confidence in the LLM-assisted productivity benchmark is validated
4. Production telemetry surfaces ≥1 bug class outside R-003's happy-path scope that R-004 would catch (alt-branch regression, offline-token-expiry bug, anomaly bug not in the curated catalog, etc.)

## Phases

| ID | Name | Summary |
|---|---|---|
| P-004-01 | Infrastructure | Token-backdate harness + per-TF teardown automation + iOS airplane-mode wrapper / VERSION_INFO_URL publisher. Lands first because several alt-branch journeys are hard-gated on this work (e.g. TF-005 Journey C needs token-backdate, Journey D needs version publisher). Faker fuzz harness scaffolding may also start here in parallel since it has no infra dependencies. |
| P-004-02 | Alt-Branch + Fuzz Coverage | Per-TF alt-branch journey work (S-009-017..021) + Faker fuzz harness expansion (S-009-022). Within this phase, order is flexible — the retro picks which stories to commit and in what sequence based on R-003 production telemetry. |

The phase boundary represents the only **hard sequencing constraint** in R-004 (infrastructure must precede the gated alt-branches). All other ordering decisions defer to the retro.

## Candidate journey scope (8 alt-branch journeys, NOT all of them)

R-003 v8.0 covers the 11 happy-path journeys across the 5 TF flows. The remaining 8 journeys are all alt-branch / failure-injected / interruption-injected paths. **R-004 will NOT automate all 8** — final selection happens at the R-003 retro based on production signal. Candidate scope below with priority hints:

| TF | Journey | What it tests | R-004 candidate priority |
|---|---|---|---|
| TF-001 | D — OAuth credential failure recovers cleanly | Wrong-password retry, account-locked-out, Salesforce-down recovery paths | **High** — security + common error path |
| TF-001 | E — Interruption resilience (backgrounding mid-OAuth, mid-onboarding, connectivity loss) | App returns to foreground mid-auth + recovers without re-login loop | **High** — older audience hits this often |
| TF-005 | D — Forced update gate on cold launch (independent of offline state) | Version-check publishes "force update" + app blocks until store update completes | **High** — independent of other infra, easy win |
| TF-005 | C — Token expires while offline, recover without login loop | Token-backdate harness fires → app offline → reconnect → silent refresh succeeds OR clean re-auth gate | **High** — long-flight participant case |
| TF-002 | C — Permission gating + content moderation (edit own, report others) | Role-based UI gating; report-flow integration | **Medium** — protects forum integrity |
| TF-004 | B — Mistype + recover + manage multiple groups | Bad program-number error states; multi-group leader view | **Medium** — leaders frequently have multiple groups |
| TF-004 | C — Role gating + first-time leader without Verint account | First-time-leader provisioning + edge case | **Low** — edge case, manual QA may suffice |
| TF-001 | C — Returning user with biometric + expired token | Touch/Face ID re-auth + expired-token recovery | **Low** — depends on biometric being implemented; defer until then |

**Suggested R-004 commit:** the 4 High + the 2 Medium = 6 journeys, deferring TF-001 C and TF-004 C until a later release. Decision happens at the R-003 retro.

## Stories

All 9 candidate stories grouped by phase. Within each phase, story order is flexible — the retro commits which to ship based on R-003 production telemetry.

### Phase P-004-01 — Infrastructure (must land first; gates several P-004-02 journeys)

| ID | Title | Effort | Why R-004 needs it |
|----|-------|-------:|---|
| [S-009-013](../epics/E-009-qa-test-automation/S-009-013-tf-teardown-automation.md) | Per-TF teardown automation (TF-001..005) | 3d | Manual teardown sustainable for happy-path cadence; not sustainable when running 10-15+ alt branches |
| [S-009-010](../epics/E-009-qa-test-automation/S-009-010-token-backdate-harness.md) | Token-backdate dev harness | 2d | Required for TF-005 Journey C (token expires while offline) and TF-001 Journey C (expired-token re-auth) |
| [S-009-014](../epics/E-009-qa-test-automation/S-009-014-ios-airplane-version-url.md) | iOS airplane-mode wrapper + VERSION_INFO_URL publisher | 2.5d | Required for TF-005 Journey C/D (iOS offline depth + forced-update gate) |

### Phase P-004-02 — Alt-Branch + Fuzz Coverage (per-flow stories with priority tags)

Each TF flow gets one alt-branch coverage story bundling its journey-level adds + its per-journey alt branches. The retro commits stories by flow; within each story, the body lists which journeys are High/Medium/Low priority so partial commits are still well-defined.

| ID | Covers | Effort | Top priority |
|---|---|---:|---|
| [S-009-017](../epics/E-009-qa-test-automation/S-009-017-tf-001-alt-branch-coverage.md) | TF-001 Journey C + D + E + 5-7 alt branches on A/B | ~2.5d | High (D + E), Low (C — blocked on biometric) |
| [S-009-018](../epics/E-009-qa-test-automation/S-009-018-tf-002-alt-branch-coverage.md) | TF-002 Journey C + 5-7 alt branches on A/B/D | ~1.5d | Medium |
| [S-009-019](../epics/E-009-qa-test-automation/S-009-019-tf-003-alt-branch-coverage.md) | TF-003 alt branches only (no new journeys — happy-path complete in R-003) | ~1.0d | Medium |
| [S-009-020](../epics/E-009-qa-test-automation/S-009-020-tf-004-alt-branch-coverage.md) | TF-004 Journey B + C + 3-5 alt branches on A | ~1.5d | Medium (B), Low (C) |
| [S-009-021](../epics/E-009-qa-test-automation/S-009-021-tf-005-alt-branch-coverage.md) | TF-005 Journey C + D + 5-7 alt branches on A/B | ~2.0d | **High** (both C + D) |
| [S-009-022](../epics/E-009-qa-test-automation/S-009-022-faker-fuzz-harness.md) | Faker fuzz harness expansion of TF-006 (7 surfaces, randomized + seeded) | ~1.0d | Medium |

**Total candidate work: ~16.5d if R-004 commits everything** (3 + 2 + 2.5 = 7.5d infra + 9.5d alt-branch + fuzz). Realistic commit at the retro likely 12-14d (infra + High journeys + selective Medium).

## Alt-branch expansion of R-003 journeys (rolled into the per-flow stories above)

Each TF flow has alt branches within its happy-path journeys — variations with failure injection at specific steps. The per-flow stories in Phase P-004-02 each include 3-7 alt branches inside their scope (e.g., S-009-017 includes TF-001 alt branches on Journey A/B; S-009-018 includes TF-002 alt branches on Journey A/B/D; etc.).

Total alt-branch surface across the 5 stories: ~28-35 cases. R-004 will commit a subset based on production telemetry from R-003 — each story's body explicitly calls out priority so partial commits work cleanly.

## Rough cost shape (TBD)

Until journey stories are authored and the R-003 retro confirms scope, R-004 cost is a rough range, not a committed number:

| Scope tier | Effort range | Cost range |
|---|---|---|
| Infrastructure only (3 carry-over stories + Faker fuzz) | ~10d | ~$14-18K |
| + 4 High-priority journeys (TF-001 D, TF-001 E, TF-005 C, TF-005 D) | ~14-16d | ~$22-26K |
| + 2 Medium-priority journeys (TF-002 C, TF-004 B) | ~17-19d | ~$26-30K |
| + 10-15 alt-branch expansions across R-003 journeys | ~22-27d | ~$33-40K |

Hard commit on a specific tier comes after R-003 retro.

## What's NOT in R-004

- **Full native create-account flow (Variant C)** — separate ~10-15d effort, captured in optional R-005
- **Maestro Cloud subscription** — already running from R-003; no additional setup cost
- **Cross-platform iOS Cloud expansion** — R-003 already covers tag-trigger Cloud; R-004 uses the existing setup
- **TF-001 Journey C (biometric)** and **TF-004 Journey C (no-Verint leader)** — low-priority candidates explicitly deferred unless production signal raises their priority

## Stop-line economics

| Funding decision | Cumulative cost | Coverage gained |
|---|---:|---|
| R-003 only | $69,150 | All 11 happy-path journeys + Thorough native auth + 20-case anomaly + Maestro Cloud iOS |
| + R-004 infra only | ~$83-87K | + teardown automation + token-backdate + iOS airplane wrapper + Faker fuzz |
| + R-004 infra + 4 High alt-journeys | ~$91-95K | + the 4 highest-priority alt-branch journeys |
| + R-004 full candidate scope | ~$102-109K | + 6 alt-journeys + 10-15 alt-branches |
| + R-005 (Variant C native create-account, separate) | ~$117-125K | + full 4-screen native signup |

## Architecture Gate

**Gate:** N/A — same posture as R-003.

## Open Questions

1. **Will R-004 be funded?** Trigger conditions above. Decision point: end of R-003 W5 retro.
2. **Which subset of the 8 candidate journeys + 25-40 alt-branches?** Final selection at the retro, based on what production telemetry surfaces during R-003.
3. **Maestro Cloud usage scaling** — alt-branch tests + offline-depth tests increase per-run minutes. Confirm with Cloud account team whether existing 1-slot subscription handles the higher cadence or needs an upgrade.
4. **Story sharpening** — S-009-017..022 exist as Draft. At the retro, each committed story moves Draft → Refinement → Ready with AC reviewed + sized by engineering.
5. **Salesforce native API for create-account** — only material if R-005 (Variant C) is later funded. Same Open Question 1 as R-003 P-003-04.

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-23 | 1.0 | PM Agent | Created as the opt-in follow-on to R-003 (10 deferred QA stories + Variant C). Tier H: ~$29k. Tier F: ~$50k. |
| 2026-05-23 | 2.0 | PM Agent | Renamed "QA Full-Coverage Expansion" → "Full-Coverage Expansion + Native Auth" when R-003 became MV QA + Auth. Native auth moved here. |
| 2026-05-23 | 3.0 | PM Agent | **Re-restructured to "QA Depth Tier"** when R-003 became Coverage Expansion (QA + Native Auth in one release). Native auth moved back to R-003. R-004 narrowed to QA depth only — alt-branches + offline depth + Faker fuzz + teardown automation. ~17d / ~$32k / ~3.5w. Variant C native create-account split out to optional R-005. |
| 2026-05-23 | 4.0 | PM Agent | **Removed premature phasing.** "We are not in a position to declare phasing on R-004 yet" — order + grouping of alt-branch work depends on R-003 production signal. Restructured as candidate scope with 8 alt-branch journeys ranked High/Medium/Low + acknowledgment that journey-specific stories don't exist yet. Cost rendered as a range across 4 scope tiers. Coverage baseline updated to R-003 v8.0's 11 happy-path journeys (was 5). |
| 2026-06-04 | 4.1 | PM Agent | **Authored 6 candidate stories** S-009-017 through S-009-022 — per-flow grouping (one story per TF flow + one for Faker fuzz). Each story bundles its journey-level adds + its per-journey alt branches with explicit priority tags so partial commits at the retro work cleanly. Coverage gap closed: every R-004 candidate journey + alt-branch now has a Draft story to commit/defer at the retro. No scope or cost change to R-004 — same ~17d full / 12-14d realistic commit. |
