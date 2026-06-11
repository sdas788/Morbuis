# Flow Test Plan: Anomaly & Boundary Coverage

**ID:** TF-006
**Project:** roadscholar-mobile
**Flow:** N/A — this plan is **not** keyed to a single UF. It exercises every input surface across the app.
**Type:** Anomaly coverage — evergreen, re-run nightly. Curated head runs on every PR.
**Stage:** Active
**Version:** 2.1
**Created:** 2026-05-22
**Updated:** 2026-05-23
**Owner:** QA Agent (curated by PM, expanded organically as bugs surface)
**Style:** Hybrid — **curated cases** (deterministic, must-fire-every-run) + a **Faker-based fuzz harness** (randomized, broad-coverage)

> **What this document is.** Two layers stacked on top of every input + render surface in the app:
>
> **Layer 1 — Curated head (~12 cases).** A tight set of attack-shaped or backend-shape-edge inputs that MUST fire deterministically on every run. RTL override (content spoofing), XSS, SQL injection, null backend bodies, 0-byte uploads, EXIF-rotated photos, timezone-mismatch render. These have specific assertions tied to specific inputs; randomization would skip them.
>
> **Layer 2 — Fuzz harness.** Per-input-surface Faker-based generators that produce a randomized string (or string variant) every run. Each surface has a documented composition rule. Failures log the seed + the generated input so the case is replayable. Catches the broad "weird input we didn't anticipate" surface area without 50 hand-written cases to maintain.
>
> **Why hybrid not pure-fuzz.** Pure fuzz would let a security-shaped regression (XSS in a post body) silently skip on a run where the random seed didn't produce the attack string. Pure curated is what we had in v1.0 — 50 cases of compounding maintenance debt. The hybrid keeps deterministic coverage where it must, fuzz where it works.
>
> **Coverage discipline.** Curated cases get an `AC-{category}-{seq}` ID + a documented input + expected behavior. Fuzz definitions get a `FZ-{surface}` ID + a composition rule + bounds. The catalog itself stays small; the fuzz harness does the breadth. Catalog grows when a real bug reveals a category we didn't think to fuzz over.
>
> **What this is NOT.** Not a security audit (that's a separate effort with security-specific tooling — Snyk, OWASP ZAP). Not a performance test (these are correctness-shaped, not throughput).

---

## Scope

Every user-facing input surface and every external-data-dependent render surface in the app.

**In scope:**
- All text input fields (profile name, hometown, bio, post body, comment body, mention queries, search queries)
- All media upload paths (profile avatar, post photos, post videos)
- All timestamp-rendering surfaces (post timestamps, "last seen", trip dates)
- All network-dependent surfaces (any RTK Query endpoint result render)
- All device-state-dependent surfaces (storage limits, memory, OS permissions, locale)

**Out of scope:**
- Penetration testing / formal security audit (separate effort)
- Load / performance / throughput testing (separate effort)
- Visual / pixel-level regression (use a visual-diff tool layered on TF-001..005)
- Battery + thermal stress (not amenable to Maestro)

## Lifecycle & Cadence

| Trigger | Action | Pass criteria |
|---------|--------|---------------|
| **PR open / update** | Run the **curated head** (~12 cases) against Android. Fuzz runs on nightly only. | All curated cases pass |
| **Nightly** | Run curated head + every fuzz definition against iPhone + Pixel via Maestro Cloud. Each fuzz definition uses a fresh seed per run. | Curated all pass; fuzz failures are logged with seed + input + evidence |
| **Post-BUG-fix on an anomaly-shaped bug** | Add to the right layer: if the bug is attack-shaped or has a specific input, add as a curated case; if the bug class is "we should have been fuzzing this", extend the fuzz composition rule for that surface | Bug's specific input is exercised by next run |
| **Catalog expansion** | When a BUG closes and the root cause was an anomaly the catalog didn't cover, PM adds either a curated case or a fuzz-rule extension here; dev wires it via [S-009-016](../epics/E-009-qa-test-automation/S-009-016-implement-tf-006-anomaly.md) | New coverage is in place before the BUG is closed |

The catalog grows narrowly; the fuzz harness grows in breadth. Both are intentionally never "done".

---

# Layer 1 — Curated head

Each case is deterministic. Same input every run. Specific assertion.

## Strings — security-shaped (AC-STR-NNN, P0 set)

| ID | Surface | Input | Expected | Severity |
|----|---------|-------|----------|----------|
| AC-STR-001 | Post body | `Hello‮ olleH` (U+202E right-to-left override) | Either filter the character out OR render it but flag it visually. **MUST NOT** let it reverse-display the rest of the post body (security risk: invisible content-spoofing) | **P0** |
| AC-STR-002 | Post body | `<script>alert(1)</script>` | Renders as literal characters; no JS execution; no toast; no error | **P0** |
| AC-STR-003 | Post body | `<img src=x onerror=alert(1)>` | Same as AC-STR-002 — literal text | **P0** |
| AC-STR-004 | Comment body | `'); DROP TABLE comments;--` | Renders as literal text; no server-side error indicating SQL interpretation | **P0** |
| AC-STR-005 | Search query | `'; DROP TABLE users;--` | Returns 0 results or normal results; absolutely no server-side error indicating SQL interpretation | **P0** |
| AC-STR-006 | Mention autocomplete | `@</script><script>` | Renders as plain text in the autocomplete dropdown; no script execution | **P0** |

These six are **non-negotiable on every run**. The Faker harness will not generate any of these — they're attack-shaped strings that need to fire deterministically.

## Strings — special character class (AC-STR-NNN, P1 set)

**Promoted from the Faker harness to curated cases** because this bug class has hit production before. Determinism matters here too — we want to know these specific inputs work on every run, not rely on the random seed sampling them.

| ID | Surface | Input | Expected | Severity |
|----|---------|-------|----------|----------|
| AC-STR-007 | Profile display name | `John 👨‍👩‍👧 Smith` (ZWJ family emoji, 4-codepoint cluster) | Renders as single grapheme; cursor advances past whole cluster on edit; no orphan ZWJ; persists through save+reload | **P1** |
| AC-STR-008 | Profile bio | 4096-character Lorem Ipsum block | Either: (a) accepted + rendered with scroll, OR (b) rejected with a clear length-limit error citing the actual limit. No silent truncation; no layout crash. | **P1** |
| AC-STR-009 | Post body | String with zero-width spaces (`U+200B`) interleaved with ASCII | Either stripped on render OR treated as zero-width (no visible artifact). Input validation doesn't reject as if empty. No collapse of adjacent characters into "" on lookup. | **P1** |
| AC-STR-010 | Search query | `café` in NFC form (`U+00E9`) vs NFD form (`e` + `U+0301`) — submit both, search for one | Search finds both forms (Unicode normalization handled server-side); no "Did you mean…" prompt; no empty results for the alternate form | **P1** |
| AC-STR-011 | Post body | `   Hello   ` (3 leading + 3 trailing spaces) | Trim on display; original preserved server-side for edit; no double-render of whitespace; no layout shift | **P1** |
| AC-STR-012 | Profile hometown | `שלום` (RTL Hebrew text in an LTR layout) | Renders RTL within an LTR-default layout; surrounding chrome unchanged; cursor navigation through the field works in both directions | **P1** |

These six are also non-negotiable. They cost ~0.6d to author with LLM-assist and protect against a bug class that has correlated with production support tickets (display name rendering, search "not finding" matches, post body truncation, RTL layout breaking surrounding UI).

**Why curated, not fuzz:** these specific inputs are known-painful. Fuzz could *eventually* sample them, but we want them to fire on every run, not when a random seed happens to compose them. The remaining randomization (long-tail emoji, less-common Unicode normalization forms, exotic combining diacritics) stays in the deferred Faker harness.

## Media — shape-edge (AC-MED-NNN)

| ID | Surface | Input | Expected | Severity |
|----|---------|-------|----------|----------|
| AC-MED-001 | Profile avatar upload | 0-byte JPEG file | Reject with clear "invalid image" error; do not upload; no crash | **P0** |
| AC-MED-002 | Profile avatar upload | EXIF-rotated JPEG (orientation tag = 6, image stored sideways) | Render right-side-up after upload (EXIF orientation respected on both display and storage) | P1 |
| AC-MED-003 | Post photo render | Gallery contains a remote image that returns 404 on fetch | Show placeholder + retry affordance; do not collapse the gallery layout; don't crash | P1 |

## Time — boundary (AC-TIME-NNN)

| ID | Surface | Input | Expected | Severity |
|----|---------|-------|----------|----------|
| AC-TIME-001 | Post timestamp | User in EST viewing a post created from PST viewing user-stored CST | Render in the Verint-account timezone (CST) per [arch.md Timezone Handling](../reference/arch.md), NOT in device timezone | P1 |
| AC-TIME-002 | Post timestamp | Verint returns timestamp at DST spring-forward (2:30 AM on the missing-hour day) | Render a valid time; either skip the missing hour OR adjust to next-valid. No "Invalid Date" string. | P1 |

## Network — shape-edge (AC-NET-NNN)

| ID | Surface | Input | Expected | Severity |
|----|---------|-------|----------|----------|
| AC-NET-001 | Any RTK Query endpoint | Backend returns 200 with body `null` | App handles null gracefully — empty state OR error toast OR silently treats as "no data". Never crash. | **P0** |
| AC-NET-002 | Any RTK Query endpoint | Backend returns 200 with body `{}` (empty object where schema expects fields) | Either tolerate (treat as no-data) OR show a clear "unexpected response" error. Never crash. | **P0** |
| AC-NET-003 | Group details | Backend returns 410 Gone for a group the user is still locally "in" | Show a clear "this group is no longer available" state; offer to refresh; do not crash. Allow leaving the group cleanly. | P1 |

**Curated total: 20 cases** (6 security + 6 special-character + 3 media + 2 time + 3 network). All run on every PR + nightly. Special-character cases promoted from the Faker harness in v2.1 because that bug class has burned production before — determinism on those inputs matters.

---

# Layer 2 — Fuzz harness

Each fuzz definition is one Maestro flow that uses a Faker-based generator to produce a randomized input matching a documented composition rule. The seed is fresh per run, logged in evidence on every run (pass or fail), so a failure can be deterministically replayed.

## Fuzz definitions

| ID | Surface | Composition rule | Max attempts per run |
|----|---------|------------------|----------------------|
| **FZ-NAME** | Profile display name | Draw from: pure-ASCII `faker.person.firstName()` + `faker.person.lastName()` \| ASCII name + 1 random BMP emoji \| ASCII name + ZWJ family emoji \| ASCII name with leading/trailing spaces \| name at exact length limit (256 chars from `faker.lorem.words`) \| RTL name (`faker.person.firstName({sex:'female'})` from Hebrew/Arabic locale) | 5 |
| **FZ-HOMETOWN** | Profile hometown | `faker.location.city() + ', ' + faker.location.state({abbreviated:true})` \| city only \| city with emoji \| city in non-Latin script (`faker.location.city()` with `ja_JP` locale) \| extremely long made-up city name (50+ chars) | 4 |
| **FZ-BIO** | Profile bio | `faker.lorem.sentences({min:1, max:5})` \| bio with 1-3 emoji sprinkled in \| bio with a URL inside (`faker.internet.url()`) \| bio at exact length limit (4096 chars from `faker.lorem.paragraphs`) \| bio with multiple newlines \| bio with mixed RTL + LTR | 4 |
| **FZ-POST** | Post body | `faker.lorem.paragraph()` \| post with 5+ emoji \| post with an @mention placeholder \| post with URL inside \| post near the length limit \| post with combining diacritics \| post in non-Latin script | 6 |
| **FZ-COMMENT** | Comment body | `faker.lorem.sentence()` shorter variants \| with emoji \| with @mention \| with URL | 4 |
| **FZ-SEARCH** | Search query | `faker.lorem.word()` \| `faker.person.firstName()` \| `faker.location.city()` \| emoji-only query \| 1-char query \| query with spaces \| query in non-Latin script \| query with combining diacritics | 5 |
| **FZ-MENTION** | Mention autocomplete query | `@` + 1-3 letter prefix from a real member's name in the test group \| `@` + non-Latin prefix \| `@` + numeric \| `@` + emoji | 3 |

### Composition rule reference

The composition rules above use `faker-js` (the maintained successor to `faker.js`). Each generator:

1. Picks one branch uniformly at random from the documented composition options
2. Applies any post-processing the branch describes (length truncation, prefix/suffix, etc.)
3. Returns the string + the seed used + the branch selected
4. Logs all three in evidence (`evidence/tf-006/fuzz/{surface}/{run-id}.json`) regardless of pass/fail outcome

### Expected behavior across all fuzz definitions

For ANY input a fuzz definition produces, the app must:
- Render the input without crashing
- Persist the input through a round-trip (save → reload → display)
- Display the input as one grapheme cluster per visual character (no orphan ZWJs, no mis-rendered surrogate pairs)
- Respect the documented length limit OR reject with a clear length-limit error (never silently truncate)
- Not interpret any part of the input as code / markup / SQL (linked to Layer 1's deterministic security cases — fuzz strings should never accidentally land in a SQL or script-execution path)

### Failure handling

A fuzz-flow failure produces:
- The seed used (so the case is replayable)
- The branch selected from the composition rule
- The generated input string (with any control characters hex-escaped for clarity)
- A screenshot of the failure state
- A Slack message with the same fields

Replay: `yarn test:e2e:tf-006:replay --seed={N} --surface={FZ-NAME}` reproduces the exact same input + flow.

### Seed strategy

- **Per-PR runs:** fuzz does not run on PR. Curated head only.
- **Per-nightly run:** each fuzz definition uses `seed = sha256("{date} {surface}")` truncated to 32 bits. Same date + same surface = same seed (so two nightly runs on the same day produce the same input — useful for triage). Different days = different inputs (so coverage grows over time).
- **Replay:** explicit `--seed` overrides the date-derived seed.

---

## Coverage matrix

| Layer | Cases / Fuzz defs | Where run | When new ones are added |
|-------|-------------------|-----------|--------------------------|
| Curated head | 14 cases | PR + nightly | When a real BUG reveals a deterministic attack-shape or backend-shape edge case |
| Fuzz harness | 7 surfaces | Nightly only | When a real BUG reveals a fuzz category we should be exercising; extend the composition rule, don't add a new surface unless a genuinely new input field appears |

**Effective coverage breadth:** in a year of nightly runs, each fuzz definition produces ~365 distinct input variants (~2555 total across surfaces). Pure curated would have required hand-writing all 2555.

## Maestro implementation notes

- **Curated cases:** one Maestro flow per case in `maestro/flows/tf-006/curated/`. Same pattern as TF-001..005. Inline `inputText:` with the literal input.
- **Fuzz definitions:** one flow per `FZ-NNN` in `maestro/flows/tf-006/fuzz/`. The flow invokes `runScript: ../../scripts/fuzz/{surface}.js` which sets an output variable `output.input` + `output.seed` + `output.branch`. Subsequent `inputText: ${output.input}` consumes it.
- **Faker library:** committed to `maestro/scripts/fuzz/` as a shared lib + per-surface composition files. Use `@faker-js/faker` (the maintained fork; `faker` itself is deprecated).
- **Seed logging:** every fuzz flow calls `runScript: ../../scripts/log-fuzz.js` after the assertion completes, writing `{surface, seed, branch, input}` to `evidence/tf-006/fuzz/{surface}/{run-id}.json` regardless of outcome.
- **Failure messages:** must include `FZ-NNN + seed`. A Slack alert like "TF-006 FZ-BIO failed, seed=0x4a2b91, replay with --seed=0x4a2b91" gives the QA agent everything to triage in one line.

---

## Run Log

| Run date | Build / commit | Trigger | Result | Failed cases | Notes |
|---------|----------------|---------|--------|--------------|-------|
| _no runs yet_ | — | — | — | — | Plan v2.0 pivoted from 50-case curated to hybrid: 14 curated + 7 fuzz definitions. First Maestro implementation targeted by S-009-016. |

---

## Open Questions

1. **Faker locale list** — fuzz definitions reference RTL + Japanese + others. Confirm which locales are practical to install with `@faker-js/faker` and which trip Maestro runtime issues. Maintain a `maestro/scripts/fuzz/SUPPORTED_LOCALES.md`.
2. **Length-limit discovery** — bio "exact length limit" assumes we know what the backend enforces. If unknown, the fuzz definition can't generate "at-limit" inputs reliably. Verify with backend before first run; document in [arch.md](../reference/arch.md) NFRs once confirmed.
3. **Fuzz on PR?** Currently nightly-only to keep PR latency low. After first quarter of nightly runs we'll have flake-rate data — at that point consider adding a single-surface PR fuzz run with a fixed seed.
4. **Catalog growth process** — when QA finds an anomaly bug in production: if attack-shaped → curated head; if "we should have been fuzzing this category" → extend the composition rule. PM owns the call. Document in the run log when expansions happen.
5. **Cross-pollination with TF-001..005** — the Faker scripts in `maestro/scripts/fuzz/` are reusable. TF-003 Journey A's profile-edit (which currently writes a hardcoded "Chicago, IL") could call `FZ-HOMETOWN`'s generator instead. Out of scope for this story but flagged as a follow-on improvement.

---

## Change Log

| Date | Version | Author | Summary |
|------|---------|--------|---------|
| 2026-05-22 | 1.0 | PM Agent | Created — first cut, 50 cases across 5 categories, all curated, 13 tagged Core 10 for PR-tier. |
| 2026-05-23 | 2.0 | PM Agent | **Pivoted to hybrid (curated + fuzz).** Trimmed curated catalog from 50 → 14 (kept only attack-shaped + backend-shape-edge cases). Added Layer 2 Faker-based fuzz harness with 7 per-surface definitions covering name / hometown / bio / post / comment / search / mention. Same effective coverage breadth with 1/3 the maintenance. Curated runs on PR; fuzz runs nightly with date-derived seeds for triage-friendly determinism within a day. Reduces S-009-016 estimated effort from 8 → 5 dev days. |
| 2026-05-23 | 2.1 | PM Agent | **Promoted 6 special-character cases from Faker harness to curated head** (AC-STR-007..012: ZWJ emoji, 4KB long string, zero-width spaces, NFC/NFD normalization, whitespace trim, RTL Hebrew). This bug class has burned production before — fuzz would *eventually* sample them but we want them deterministic on every run. Curated total: 14 → 20 cases. Adds ~0.6d to S-009-016. The remaining randomization (long-tail emoji, exotic combining diacritics, less-common Unicode forms) stays in the deferred Faker harness. |
