# Story: Claude generation pipeline

**ID:** S-027-002
**Project:** morbius
**Epic:** E-027
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.1
**Created:** 2026-05-01
**Updated:** 2026-05-01

---

## Story

As Morbius, I need a `POST /api/appmap/narrative/generate` endpoint that assembles project context (AppMap Mermaid + flow inventory + test case totals + recent runs), calls Claude, parses the structured response, and persists an `AppMapNarrative` to disk.

## Acceptance Criteria

**Given** the active project is `micro-air`
**When** the client calls `POST /api/appmap/narrative/generate`
**Then** the response is `{ ok: true, narrative, durationMs }` within ~10 seconds (Claude budget 180s but typical 4–8s)

**Given** the generation completes
**When** I read `data/micro-air/appmap-narrative.md`
**Then** frontmatter has `flowsCovered === /api/maestro-tests totalFlows`, `testCasesTotal === loadAllTestCases().length`, `coveragePct === Math.round(flowsCovered / testCasesTotal * 1000) / 10`

**Given** Claude returns generic boilerplate ("login is important")
**When** the lint check fires
**Then** generation retries once with a stricter prompt; if still generic, persists with `qualityFlag: 'generic'` so the UI can flag it

## Constraints

- **C1** — retrospective only. Reads existing data; does not crawl the live app.
- Mirror `generateBugImpact()` at `src/server.ts:2701` one-for-one (askClaude + extractJson + writeBugImpact-style persistence).
- Use `askClaude(prompt, { timeoutMs: 180_000 })` matching E-016's budget.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-01 | 1.0 | Claude | Created |
| 2026-05-01 | 1.1 | Claude | Shipped. New `generateAppMapNarrative()` + `buildAppMapPrompt()` + `buildAppMapNarrativeContext()` in `src/server.ts` (mirrors E-016 BugImpact pipeline 1:1: `askClaude` → `extractJson` → validate → `writeAppMapNarrative`). Lint detects boilerplate ("login is important", "ensure quality", missing flowId citations) and retries once with strict prompt; persists `qualityFlag: 'generic'` if still bad. Bonus: improved `askClaude` to surface stdout in the error when Claude writes auth/usage failures there (e.g. "Failed to authenticate. API Error: 401") so callers see the real diagnostic. **Live verification on micro-air**: 80.7s end-to-end, 1594-char `whyTheseFlows` referencing 5 specific YAMLs, 15 perFlow entries each citing concrete flow IDs + category counts. `flowsCovered=15`, `testCasesTotal=159`, `coveragePct=9.4`. New routes: `GET /api/appmap/narrative` + `POST /api/appmap/narrative/generate`. |
