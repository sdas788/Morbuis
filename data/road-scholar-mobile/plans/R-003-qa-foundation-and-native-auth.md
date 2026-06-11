# Release: Quality Foundation + Native Auth

**ID:** R-003
**Project:** roadscholar-mobile
**Stage:** Draft
**Status:** Backlog
**Version:** 9.1
**Created:** 2026-05-23
**Updated:** 2026-05-23

---

## Overview

A 5-week dual-resource engagement that delivers two outcomes in one bundle:

1. **Thorough native authentication** — replaces the Salesforce SSO web view entirely with a native login screen (username + password), plus native in-app screens for password reset + verification code resend. Includes comprehensive error handling, accessibility audit, telemetry instrumentation, and cross-platform manual QA. Create-account stays on the existing web-browser fallback in this release. **The SSO web view goes away** — no more in-app browser bounce for sign-in, no more OAuth callback / deep-link cold-start bug class.

2. **Happy-path automated regression across all 5 user flows** (Login, Group Browse, Profile, Group Leader, Offline) — covering all 11 happy-path journeys documented in the TF flow plans (Journey A always + additional Journey B / C / D where the TF doc scopes them as happy-path): fresh-install full onboard + fresh-install minimal-onboard (TF-001), read-and-react + compose-and-manage + cross-surface navigation (TF-002), profile setup + privacy lockdown + sign-out/sign-in persistence (TF-003), find-first-group (TF-004), and cold-start cache + drop-mid-session-queue-reconnect (TF-005). Plus a **20-case curated anomaly catalog** protecting against the special-character / Unicode bug class that has burned production before. Runs on every pull request (Android emulator on Bitrise) + every release tag (iOS + Android real-device on Maestro Cloud).

**Sequencing change in v7.0:** native auth moved ahead of login regression. Two reasons: (1) login regression should test the *new* native auth flow, not the deprecated web fallback; (2) native auth is the highest-uncertainty scope — front-loading it exposes Salesforce-API blockers in week 1 with full calendar to absorb. Engineer leads week 1 solo on auth discovery; QA Engineer onboards week 2 once there's testable native code + scaffold has lead-in time.

## Theme

Maximum coverage expansion across QA regression AND auth-recovery UX in a single funded engagement, with dual-resource parallel tracks (Engineer + QA Engineer) for skill-aligned throughput. Both outcomes share a single coordination overhead — combining them is cheaper than running two sequential single-outcome engagements.

## Phases

| ID | Name | Start | End | Effort (billed) | Tier | Milestone | Summary |
|---|---|---|---|---|---|---|---|
| P-003-01 | Native Auth Discovery + Foundation | 2026-06-17 | 2026-06-30 | 18d | Required | Native Login screen working in dev + Reset screen #1 working in dev + Maestro scaffold ready | Engineer W1-W2: Salesforce API discovery (login + reset + resend), Native Login screen build (replaces SSO web view), Reset screen #1, testID audit, Bitrise PR-trigger initial config. QA Engineer onboards W2: Maestro scaffold + Faker helpers + Slack routing. |
| P-003-02 | Native Auth Ship + Login Regression | 2026-07-01 | 2026-07-07 | 12d | Required | Native login + reset + resend all live in dev · TF-001 Login regression authored against native screens on PR | Engineer wraps Native Login error states + Reset screen #2 + Resend Code + a11y + telemetry. QA Engineer authors TF-001 Login Journey A (full onboard via native login) + Journey B (minimal-onboard fast-track), both against the **new native login screen** (NOT the deprecated SSO web view) + 11-case anomaly subset on PR. |
| P-003-03 | Cloud + Browse + Profile + Leader | 2026-07-08 | 2026-07-14 | 11d | Required | iOS + Android real-device coverage live · TF-002 Journeys A+B+D · TF-003 Journeys A+B+C · TF-004 Journey A green | Engineer: Maestro Cloud + S3 evidence, push-injection hook, cross-platform manual QA on native auth. QA Engineer: TF-002 Group Browse (Journey A read+react, Journey B compose+manage, Journey D cross-surface) + TF-003 Profile (Journey A setup, Journey B privacy, Journey C sign-out persistence) + TF-004 Group Leader (Journey A find-first-group). |
| P-003-04 | Offline + Anomaly Full + Stabilization | 2026-07-15 | 2026-07-24 | 7d | Required | All 11 happy-path journeys in regression + 20-case anomaly safety net + release tag | QA Engineer: TF-005 Offline (Journey A cold-start cache + Journey B drop-mid-session queue+reconnect), anomaly catalog expansion 11 → full 20, multi-flow stabilization. Engineer (0.25 FTE): final handoff + retrospective. |
| Cross-phase ceremony | (TL PR review + PM/PDM cadence + Leadership steering — spread across all 5 weeks, not attributable to one phase) | 2026-06-17 | 2026-07-24 | 3.75d | Required | Continuous throughout the engagement | Tech Lead 0.15 FTE (30h PR review + Maestro pattern review + Salesforce API arch); Product Manager 0.10 FTE (20h scope + design coord); Product Delivery Manager 0.10 FTE (20h cadence + budget + status); Leadership 2h/wk × 5w = 10h steering. Total 80h ≈ 10d senior; subtract per-phase allocations already counted in P-003-01..04 leaves the residual ~3.75d not attributed to a single phase. |

**Phase rows sum: 48d. Cross-phase ceremony: 3.75d. Total: 51.75d billed / 414 hours / 5 weeks / $74,050** (FTE billing envelope) covering: Native login + native reset/resend (SSO web view replaced entirely) · all 11 happy-path journey regressions · 20-case curated anomaly safety net · Maestro Cloud iOS + Android.

Calendar: 2026-06-17 → 2026-07-24.

## Team shape (dual-resource)

| Role | Allocation | Hours/week (peak) | Notes |
|------|-----------|------------------:|-------|
| Engineer | 1.0 FTE W1-W3 → 0.5 FTE W4 → 0.25 FTE W5 | 40 / 40 / 40 / 20 / 10 | Senior mobile engineer; owns native auth + Cloud + push hook + Bitrise |
| QA Engineer | — / 1.0 FTE W2 → 1.1 FTE W3 → 1.2 FTE W4 → 0.6 FTE W5 | 0 / 40 / 44 / 48 / 24 | Onboards W2; owns Maestro scaffold + 11 happy-path TF journeys + anomaly catalog + Slack routing + stabilization. Slight stretch in W3-W5 to absorb the extra journey-B/C/D coverage. |
| Tech Lead | 0.15 FTE × 5w | 6 | PR review + Maestro patterns + Salesforce API architecture |
| Product Manager (PM) | 0.10 FTE × 5w | 4 | Scope + priorities + roadmap + product decisions + design coordination for Thorough auth |
| Product Delivery Manager (PDM) | 0.10 FTE × 5w | 4 | Sprint cadence + budget tracking + schedule + status + ticket flow + dependency coordination (the "Project Manager" role) |
| Leadership | 2h/wk × 5w | 2 | Weekly steering + sponsorship + closeout |

No separate Design role — native auth screens use existing onboarding patterns from `design.md`.

## Stories

### Phase P-003-01 — Native Auth Discovery + Foundation (W1 + W2)

| ID | Title | Epic | Effort | Stage | Status |
|----|-------|------|-------:|-------|--------|
| [S-010-004](../epics/E-010-authentication-enhancements/S-010-004-native-login.md) (start) | Native Login — Salesforce API discovery + login screen build (replaces SSO web view) | E-010 | 2.0d | Draft | Backlog |
| [S-010-001](../epics/E-010-authentication-enhancements/S-010-001-native-reset-password.md) (start) | Native Reset Password — discovery + screen #1 | E-010 | 1.5d | Draft | Backlog |
| [S-009-001](../epics/E-009-qa-test-automation/S-009-001-maestro-scaffolding.md) | Maestro scaffolding + testID audit + Faker helpers | E-009 | 2.5d | Ready | Backlog |
| [S-009-002](../epics/E-009-qa-test-automation/S-009-002-p0-test-accounts.md) | Provision test account fixture (all 8 R-003 + 2 R-004 specialty, client-provisioned, plus nightly regen cron) | E-009 | 2.5d | Ready | Backlog |
| [S-009-004](../epics/E-009-qa-test-automation/S-009-004-bitrise-pr-trigger.md) (initial) | Bitrise PR-trigger CI integration — initial config | E-009 | 1.0d | Ready | Backlog |
| [S-009-005](../epics/E-009-qa-test-automation/S-009-005-slack-failure-alert.md) | Slack flat-report routing | E-009 | 0.75d | Ready | Backlog |

### Phase P-003-02 — Native Auth Ship + Login Regression (W3)

| ID | Title | Epic | Effort | Stage | Status |
|----|-------|------|-------:|-------|--------|
| [S-010-004](../epics/E-010-authentication-enhancements/S-010-004-native-login.md) (wrap) | Native Login — error states (wrong-credentials, rate-limit, banned, Salesforce-down, network) + Forgot-password routing + telemetry + a11y | E-010 | 1.5d | Draft | Backlog |
| [S-010-001](../epics/E-010-authentication-enhancements/S-010-001-native-reset-password.md) (wrap) | Native Reset Password — screen #2 + integrated Resend Code component (cooldown + rate-limit UX) + error handling | E-010 | 2.0d | Draft | Backlog |
| Native auth — a11y audit + telemetry instrumentation | (E-010 cross-cutting) | E-010 | 1.0d | Ready | Backlog |
| [S-009-003](../epics/E-009-qa-test-automation/S-009-003-implement-tf-001.md) | Implement TF-001 Login flows — Journey A + B authored against the new native login screen (NOT the deprecated SSO web view) | E-009 | 2.0d | Draft | Backlog |
| [S-009-016a](../epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md) | Anomaly subset (11 cases — 6 security + 5 special-character) on PR | E-009 | 0.75d | Ready | Backlog |

### Phase P-003-03 — Cloud + Browse + Profile + Leader (W4)

| ID | Title | Epic | Effort | Stage | Status |
|----|-------|------|-------:|-------|--------|
| [S-009-006](../epics/E-009-qa-test-automation/S-009-006-maestro-cloud-nightly.md) | Maestro Cloud + S3 evidence (1-slot serial, tag-trigger) | E-009 | 2.0d | Ready | Backlog |
| [S-009-008](../epics/E-009-qa-test-automation/S-009-008-backend-fixtures-push-hook.md) | Backend test fixtures + push-injection hook | E-009 | 1.0d | Ready | Backlog |
| [S-010-003](../epics/E-010-authentication-enhancements/S-010-003-native-create-account.md) | Variant B — Create-Account web fallback cross-platform verify | E-010 | 0.5d | Draft | Backlog |
| Native auth — cross-platform manual QA pass | (E-010 cross-cutting) | E-010 | 1.5d | Ready | Backlog |
| [S-009-009](../epics/E-009-qa-test-automation/S-009-009-implement-tf-002.md) | Implement TF-002 Group Browse — Journey A (read+react) + Journey B (compose+manage) + Journey D (cross-surface nav) | E-009 | 2.5d | Ready | Backlog |
| [S-009-011](../epics/E-009-qa-test-automation/S-009-011-implement-tf-003.md) | Implement TF-003 Profile — Journey A (setup) + Journey B (privacy) + Journey C (sign-out persistence) | E-009 | 1.75d | Ready | Backlog |
| [S-009-012](../epics/E-009-qa-test-automation/S-009-012-implement-tf-004.md) | Implement TF-004 Group Leader — Journey A (find-first-group) | E-009 | 1.0d | Ready | Backlog |

### Phase P-003-04 — Offline + Anomaly Full + Stabilization (W5)

| ID | Title | Epic | Effort | Stage | Status |
|----|-------|------|-------:|-------|--------|
| [S-009-015](../epics/E-009-qa-test-automation/S-009-015-implement-tf-005.md) | Implement TF-005 Offline — Journey A (Android cold-start cache) + Journey B (drop-mid-session, queue likes, reconnect-without-relaunch) | E-009 | 1.5d | Ready | Backlog |
| [S-009-016b](../epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md) | Expand anomaly catalog 11 → full 20 cases | E-009 | 0.5d | Ready | Backlog |
| Multi-flow stabilization + first iOS Cloud green | (cross-cutting) | E-009 | 1.5d | Ready | Backlog |
| Final handoff + retrospective + R-004 candidate list | (cross-cutting) | E-009 | 0.5d | Ready | Backlog |

## Anomaly safety net (full 20-case curated head)

Production has been hurt by anomaly-class bugs before — particularly the special-character + Unicode + RTL bug class. The 20 curated cases stay in scope (11 land in P-003-02 alongside Login regression, 9 more added in P-003-04 once the broader flow infrastructure is in place).

- **Security-shaped (6 cases — P0):** RTL override, XSS literal, XSS img-onerror, SQL injection in comment + search, mention-script-tag
- **Special-character (6 cases — P1, the "burned us before" set):** ZWJ family emoji, 4KB long string, zero-width spaces, NFC/NFD normalization, whitespace trim, RTL Hebrew text
- **Backend-shape-edge (3 cases):** null body, empty body, 410 Gone
- **Media-shape-edge (3 cases):** 0-byte upload, EXIF-rotated photo, gallery 404
- **Time (2 cases):** timezone mismatch, DST boundary

Faker fuzz harness (randomized inputs across 7 surfaces) defers to [R-004](R-004-qa-full-coverage-expansion.md).

## What's NOT in this release (deferred to R-004)

| Item | Where it lives | Why deferred |
|------|---------------|--------------|
| Per-TF teardown automation | R-004 | Manual teardown sustainable for happy-paths cadence |
| Token-backdate dev harness | R-004 | Only needed for TF-001 Journey C alt + TF-005 Journey C — neither in happy-path scope |
| iOS airplane-mode wrapper + VERSION_INFO_URL publisher | R-004 | Only needed for full TF-005 depth (Journey B/C/D) |
| Alt-branch coverage across TF-001..005 | R-004 | All alt branches (photo permission deny, rapid spam, offline mid-upload, banned-user OAuth, DST boundary, etc.) defer |
| TF-005 Journey B/C/D (offline depth) | R-004 | Only Journey A (cold-start cache, Android) ships here |
| TF-006 Faker fuzz harness | R-004 | 20-case curated head ships here; randomized fuzz layer defers |
| Full native create-account flow (Variant C) | R-004 | Variant B (web fallback) ships verified here — no work in this release |

## Stop-line economics

| Funding decision | Cumulative cost | Cumulative weeks | Coverage |
|---|---:|---:|---|
| **R-003 only** (this release) | **$74,050** | 5 | **Native login replaces Salesforce SSO web view entirely** + native reset/resend recovery + all 11 happy-path journey regressions across the 5 flows + 20-case anomaly safety net + Maestro Cloud iOS |
| + R-004 (QA depth) | ~$95,000 | ~8 | + Alt-branches + offline depth + Faker fuzz + per-TF teardown automation |
| + R-005 (Variant C native create-account) | ~$110,000 | ~10 | + Full 4-screen native signup replacing the web-browser fallback |

## Architecture Gate

**Gate:** N/A — none required.

Engineering work is mobile-side (Maestro flows, native auth screens, CI config, Cloud setup). Backend coordination needed for: client team provisioning the 8 test accounts + 2 test groups + 3 program numbers; dev team owning the `POST /test/inject-push` endpoint. **Salesforce native API availability confirmed by client 2026-06-05** — all three native auth APIs (login, reset-password, resend-code) available against the existing Salesforce domain; existing-user passwords work transparently on the new native login screen (no migration step).

## Open Questions

1. **Maestro Cloud slot configuration** — 1-slot serial (~$250/mo, default) vs 2-slot parallel ($500/mo). Confirm slot model supports dynamic device-per-run.
2. **Client-team capacity for test-account + group + program provisioning** by end of W2 to unblock Phases 3-4.
3. **Backend team availability for push-injection hook** by end of W3 to unblock TF-002.
4. **Email verification UX** — does the app deep-link automatically from the email-client tap, or does the user type a code? Affects native Reset Password screen count. **Confirm before W1.**
5. **R-004 trigger** — at what point does the team commit to funding R-004? Suggested signal: end of W5 retro on this engagement.
6. **QA Engineer onboarding** — confirm the QA Engineer is signed and ready to start week 2 (June 24). Engineer can kick off week 1 (June 17) independently.

## Coding Agent Handoff

When R-003 is approved for engineering, the team should:

1. Read [E-010 epic](../epics/E-010-authentication-enhancements/E-010.md) for native auth context — this is the W1 starting point.
2. Read [E-009 epic](../epics/E-009-qa-test-automation/E-009.md) for QA story context.
3. Read [qa-testplan.md authoring conventions](../qa/qa-testplan.md#authoring-conventions) — the Faker-by-default free-text input convention.
4. The 20-case curated anomaly catalog is non-negotiable — it's the safety net for the bug class we know has burned production.
5. Maestro Cloud setup uses the team's existing integration patterns from prior projects; default to 1-slot serial.
6. Native auth ships end of W3 — TF-001 Login regression in W3 should test the *new* native auth recovery entry points, not the deprecated web fallback.

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-23 | 1.0 | PM Agent | Created as "QA Test Automation Suite" — 16 stories at full coverage, 7 weeks, $73k. |
| 2026-05-23 | 2.0 | PM Agent | Restructured as "QA Foundation + Native Auth Recovery" — MV QA + native auth + anomaly subset. 3 weeks, $29,190. |
| 2026-05-23 | 3.0 | PM Agent | Re-restructured as "QA Regression Suite" — 13 QA stories at happy-path depth across all 5 flows + 20-case anomaly. Native auth moved to R-004. 3 weeks, $29,190. |
| 2026-05-23 | 4.0 | PM Agent | Same as v3.0 (typo in version). |
| 2026-05-23 | 5.0 | PM Agent | **Re-restructured as "Coverage Expansion"** per user direction — bundles QA happy-paths + native auth recovery in one release. 4 phases (3 QA + 1 auth), 25d story-driven / 27d billed / 4 weeks / $38,920. |
| 2026-05-23 | 6.0 | PM Agent | **Renamed "Quality Foundation + Native Auth"** + Thorough native auth scope + PM/PDM role split. Auth phase Lean → Thorough. Calendar 4w → 4.5w. Cost $38,920 → $45,540. |
| 2026-05-23 | 7.0 | PM Agent | **5-week offset model with dual-resource team.** Split single Engineer FTE → Engineer + QA Engineer parallel tracks (both at $175/hr). Engineer leads W1 solo on native auth discovery (de-risks the riskiest scope first); QA Engineer onboards W2. Native auth moved ahead of login regression — TF-001 now tests the NEW native flow, not the deprecated web fallback. Phase reshape: 4 phases all renumbered (Foundation+Auth Discovery W1-W2 → Auth Ship+Login W3 → Cloud+Browse+Profile+Leader W4 → Offline+Anomaly+Stabilize W5). Calendar 4.5w → 5w. Cost $45,540 → $64,950 (FTE billing envelope). End date 2026-07-18 → 2026-07-24. |
| 2026-05-23 | 7.1 | PM Agent | **Role naming correction**: "Project Manager" is the legacy name for **Product Delivery Manager (PDM)** — they are the same role (budget / schedule / scrums). Previous draft split them as if they were two distinct roles. Corrected: PM = product/scope/roadmap. PDM = delivery/cadence/budget. No hour or cost change. |
| 2026-05-23 | 8.0 | PM Agent | **Coverage expansion to all 11 happy-path journeys**. Previous v7.x scoped only Journey A per TF flow (5 of 11). Adds: TF-001 Journey B, TF-002 Journey B + D, TF-003 Journey B + C, TF-005 Journey B. QA Engineer scales W3-W5 (+24h). Hours 362 → 386. Cost $64,950 → $69,150. Calendar 5w unchanged. |
| 2026-06-04 | 9.0 | PM Agent | **Native login replaces Salesforce SSO web view entirely.** Adds S-010-004 Native Login. Hours 386 → 414. Cost $69,150 → $74,050. Calendar 5w unchanged. New Open Q2 in E-010: existing-user migration. |
| 2026-06-05 | 9.1 | PM Agent | **Both E-010 Open Questions closed by client.** Open Q1 (Salesforce native API availability) — all three APIs (login, reset, resend) confirmed available against the existing Salesforce domain. Open Q2 (existing user migration) — same Salesforce domain means existing passwords work transparently on the new native login screen, no migration step required. **R-003 is fully de-risked for kickoff** — no remaining hard dependencies on external decisions before W1. The Architecture Gate stays N/A (no AT required), but the auth-spec exchange (endpoint URLs, request/response shapes, error codes) is now the day-1 W1 activity. No effort or cost change. Stories S-010-001, S-010-003, S-010-004, S-009-003 stay Stage: Draft pending engineering AC review at kickoff. |
