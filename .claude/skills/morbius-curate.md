---
name: morbius-curate
description: Make a freshly-synced QA project legible and honest for the QA team in Morbius — quarantine raw/meta epics (reviewEpics), reconcile the device matrix, fix shredded test-case titles at the source, and surface source drift + honest coverage. Use right after pmagent-sync / onboarding, when the board looks noisy (junk titles, one-line cards, phantom devices), or when someone says "the board is a mess", "too many bad test cases", "clean up the QA board".
user_invocable: true
---

# Curate a QA project for the team — the harness "Curate" stage

PMAgent is the **product** board; Morbius is the **QA** board. A sync (`/push-to-morbius` → `morbius-onboard`) lands the product team's cases in Morbius — but raw, they are often **noise**: meta epics, machine-shredded one-line fragments, garbage titles, a generic device matrix, and a misleading coverage %. A QA tester opening that sees a grey wall, not a worklist.

This skill makes the board **legible and honest** before the team uses it. It sits between **Onboard (Stage 0)** and **App Map (Stage 1)** in [`requirements/HARNESS.md`](../../requirements/HARNESS.md). Do not skip it — an un-curated board silently misrepresents coverage and buries the real tests.

## RULE: `doctor` → fix → `doctor` (lessons → rules → checks)

```
node dist/index.js doctor        # confirm active project (loud), read the legibility checks
  → fix what it flags (Steps 2–5)
node dist/index.js doctor        # re-run until the presentation checks are clean
```
Every fix below corresponds to a `doctor` check. If `doctor` is green on presentation, the board is curated.

## Step 1 — Diagnose

- Run `node dist/index.js doctor` and read the **presentation/legibility** group: junk-title count, `reviewEpics`, device honesty, source drift.
- Open **Test Cases** for the active project and eyeball: one-line cards? titles starting with `#` or lowercase fragments ("they tap a 4th time")? Does the **Ready / Needs review / All** split make sense? Does the coverage cell over-state automation?

## Step 1.5 — Confirm the QA Plan orientation layer

The QA team needs the roadmap *above* the test cases — the **QA Plan**, **Flow Plans (TF-NNN)**, and **Release Plans (TR-NNN)** the product team decided. The push copies these from PMAgent's `qa/` + `releases/` into `data/<project>/plans/` (verbatim) and the **QA Plan** sidebar view renders them Morbius-native (mirroring PMAgent's QA tab), with an execution overlay: per-plan pass/fail, release readiness per TR, and a "passing across planned stories" bar — the truth PMAgent's QA tab can't show.

- Open the **QA Plan** view. Confirm the QA Plan, all Flow Plans, and Release Plans are present. A release with no TR shows "no plan yet" — a gap to raise with PMs (they fix it in PMAgent; we just surface it).
- If the view is empty (`morbius doctor` warns *"no QA / Flow / Release plan docs imported"*), click **↻ Push from PMAgent** on the view, or re-run the transfer. The plan docs ride the same one-click push as the test cases.
- The overlay matches each plan's `S-NNN-NNN` stories to Morbius test-case status — so "0/28 passing" on a release means real work remains even when every story is "planned." That's the alignment loop: PMAgent owns *planned*, Morbius owns *passing*.

## Step 2 — Quarantine raw / meta epics (Triage Shelf)

A project may declare `reviewEpics` on its `data/projects.json` registry entry — an array of **category-slug prefixes** whose cards are flagged "needs review" and excluded from the default **Ready** worklist (kept on disk, one click away under the "⚠ Needs review — raw import" shelf).

```jsonc
// data/projects.json → the project's entry
"reviewEpics": ["e-009"]   // category-slug prefixes
```

Quarantine an epic when it is:
- a **META epic** — about building the QA harness, not app features (e.g. "QA Test Automation": maestro scaffolding, CI hooks, fixtures). Its "cases" are dev tasks, not app tests. **Keep these quarantined permanently.**
- **raw / un-curated** imports awaiting a clean re-sync.

Do **not** quarantine a legitimate feature epic just because its titles look ugly — fix the titles (Step 4) and let it into Ready. (`reviewEpics?: string[]` is on `ProjectConfig` in `src/types.ts`; the toggle + shelf live in `TestsView` in `src/server.ts`.)

## Step 3 — Reconcile device honesty

The device matrix, the Devices view, and the dashboard coverage gaps all reflect the **active project's `config.devices`** (via `getDeviceList()` — it reads the registry, falling back to a generic 4 only if none are set). If the registry entry has the generic iPad/iPhone/Tablet/Phone default but the project only tests 2 devices, the dashboard invents phantom *"iPad missing 100%"* coverage gaps.

- Set the registry entry's `devices` to the **real** devices the project runs on.
- Backfill `appId` on the registry entry (mobile runs and the app map need it).

## Step 4 — Fix shredded titles at the source, then re-sync

Junk titles (`### Reset Password flow`, `they tap a 4th time`, `submitted`) come from the **importer**, not the data:
- `splitACs` let `###` sub-headings become their own one-line "AC" cards.
- `deriveTitle` grabbed the bare **when** clause.

The fix lives in `src/parsers/pmagent.ts`: `splitACs` skips heading lines; `deriveTitle` strips embedded `**TC-NNN-NNN-NNN**` ids and titles from the **then** clause (the assertion — the most descriptive phrase). It improves every PMAgent import.

To apply it to **existing** cards, re-sync:
```bash
# force is REQUIRED — a title change doesn't change the AC checksum, so the diff skips it otherwise
curl -s -XPOST localhost:9000/api/pmagent/transfer -H 'Content-Type: application/json' \
  -d '{"pmagentSlug":"<slug>","force":true}'
```
Then:
1. **Clean ID-shift orphans** — dropping heading cards shifts AC indices, so the highest old ids no longer exist. Delete any `tc-*.md` whose `id:` ∉ the new `pmagent-sync-state.json` `importedTestIds`.
2. **Promote now-legible epics** out of `reviewEpics` (e.g. a real auth-enhancements epic leaves the shelf; the meta epic stays).

## Step 5 — Surface drift & honest coverage

- **Drift** — every imported card carries `pmagent_source { sourcePath, sourceChecksum }`. `/api/test/:id` recomputes the live checksum (`recomputeSourceChecksum` in `pmagent.ts`) and badges **In sync / Drifted / Source missing / Pinned** in the test detail. *Drifted* = the product team changed the AC after your import → re-pull that story. (Checksum is over the AC text, so titling changes don't trip it.)
- **Coverage** — the dashboard shows **true per-card automation coverage** (cards with a runnable flow ÷ total), not a flow-count proxy. A card is "automated" if it has a direct `maestroFlow` OR maps to a **written** automation-plan flow (`data/<project>/flows/<flowId>.yaml`). `/api/test/run` uses the same automation-plan fallback so those cards are runnable without committing machine-specific paths.

## Step 6 — Verify

- `node dist/index.js doctor` → 0 junk titles outside `reviewEpics`, device matrix matches `config`, drift acknowledged.
- Open the board: **Ready** is a legible worklist; meta/raw cards sit in **Needs review**; per-platform **Run** buttons + **File bug** present; blocked cards show ⛔ with a reason; coverage reads honestly.

## Editing the dashboard UI — gotcha

The Morbius React UI is emitted inside **one big JS template literal** in `generateJS()` (`src/server.ts`). When editing JSX/JS there you MUST escape for the outer literal: backtick → `` \` ``, `${` → `\${`, and **double** every regex/string backslash (`\\n`, `\\s`, `\\t`). Server-side route handlers and helpers (outside `generateJS`) are normal TS. After any change, `npm run build` **and restart** the server/preview (the live `:3000`/`:9000` build is stale until you do).

## Where each piece lives

| Concern | Code |
|---|---|
| Triage Shelf (toggle + shelf + dedupe) | `TestsView`, `dedupeTestPlanBody` in `src/server.ts`; `reviewEpics` on `data/projects.json` |
| Device honesty | `getDeviceList()` in `src/server.ts` |
| Run button + flow fallback | `RunButtons`, `resolvePlannedFlowPath`, `/api/test/run` in `src/server.ts` |
| Blocked badge + File bug | `loadMorbiusData` blockedMap, `FileBugButton` in `src/server.ts` |
| Drift + honest coverage | `recomputeSourceChecksum` in `src/parsers/pmagent.ts`; `/api/test/:id`, dashboard in `src/server.ts` |
| Shredder fix | `splitACs`, `deriveTitle` in `src/parsers/pmagent.ts` |
| Enforcement | `node dist/index.js doctor` (presentation/legibility checks) |
