# Story: PMAgent Project Parser (read-only)

**ID:** S-023-002
**Project:** morbius
**Epic:** E-023
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.1
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As the transfer pipeline, I want a deterministic parser that reads a PMAgent project folder and returns a `ParsedExcel`-shaped object plus a source map, so the existing `writeParsedExcel` writer can ingest it without any new write paths.

## Acceptance Criteria

**Given** a PMAgent project folder with epics + stories
**When** `parsePMAgentProject(pmagentPath)` is called
**Then** it returns `{ ParsedExcel, sourceMap: Map<testId, { slug, storyId, acIndex, sourcePath, sourceChecksum }> }` — read-only on PMAgent side, no Claude in v1

**Given** a story has a sibling `T-NNN-NNN-*.md` test plan that references it
**When** parsing
**Then** the test plan wins as the source of test cases (richer); otherwise the story's `## Acceptance Criteria` section is split into one test case per AC bullet (`- [ ]`, `- `, `**Given**`, or numbered list items)

**Given** the parsed project's symlink resolves into Morbius's own `requirements/` folder (the `morbius` PMAgent project case)
**When** parsing
**Then** the parser detects the recursion via `fs.realpathSync` and skips the E-023 epic to prevent self-reference

**Given** AC text changes between two parses
**When** `sourceChecksum` is computed (SHA-256 of normalized text)
**Then** unchanged ACs produce the same checksum and changed ACs produce a different one — enabling idempotent re-transfer

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented `src/parsers/pmagent.ts` — `parsePMAgentProject(pmagentPath, slug)` walks `<pmagentPath>/epics/E-NNN-*/E-NNN.md` + sibling `S-NNN-NNN-*.md` story files (skips `*.v2.md`). Per story: prefers `T-NNN-NNN-*.md` test plan when present (frontmatter `Story:` ref), falls back to splitting `## Acceptance Criteria` on `- [ ]` / `- ` / numbered / `**Given**` bullet starts. AC text → Given/When/Then steps via `gwtToSteps()` (3-line Setup/Action/Assert format). Title derived from the When clause when parseable, else AC slice. Scenario keyword-mapped: `error|invalid|fail|expired` → Negative; `boundary|max|min|edge` → Edge Case; first AC → Happy Path; rest → Detour. Test ID is deterministic: `TC-{SLUG}-{storyNum}-{acIndex+1}` so re-parses produce identical IDs. Each test stamps `pmagentSource` = `{ slug, storyId, acIndex, sourcePath, sourceChecksum }` where `sourceChecksum` is SHA-256(normalized AC text) → first 16 hex chars. Recursion guard: when parsing the morbius project, the resolved real-path lives inside `Morbius/requirements/`; we skip our own `E-023` epic (other Morbius epics are real spec for self-test). Smoke-tested live: mygrant-glass → 5 cats / 57 tests / 0 warn; morbius → 16 cats / 200 tests / E-023 skipped / re-parse produces identical 200 checksums (idempotent). AC1 + AC2 + AC3 + AC4 met. |
