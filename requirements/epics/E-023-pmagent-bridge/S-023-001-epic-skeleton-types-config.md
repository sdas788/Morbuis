# Story: Epic Skeleton + Types + Config Field

**ID:** S-023-001
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

As the developer kicking off E-023, I want the epic + story files on the board, the `TestCase` and `ProjectConfig` types extended with PMAgent backreference fields, and a Settings UI card to set `pmagentSlug` / `pmagentPath` — so the rest of the epic has a clean contract to build against.

## Acceptance Criteria

**Given** the E-023 epic file and 5 story files exist in `requirements/epics/E-023-pmagent-bridge/`
**When** PMAgent renders the Morbius project board
**Then** E-023 appears with 5 stories — `# Story:` H1 prefix matches the parser regex (`^# Story:\s*(.+)`)

**Given** `TestCase` is extended with optional `pmagentSource` (`{ slug, storyId, acIndex, sourcePath, sourceChecksum }`)
**When** an existing test case without `pmagentSource` is read
**Then** the field stays undefined and existing tests are unaffected

**Given** `ProjectConfig` gains optional `pmagentSlug` and `pmagentPath`
**When** Settings → Integrations renders
**Then** a "PMAgent" card surfaces both inputs with a "Test path" button that filesystem-stat-checks the resolved path, and `POST /api/config/update` persists them

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
| 2026-04-23 | 1.1 | Claude | Implemented: created E-023.md + 5 story files in `requirements/epics/E-023-pmagent-bridge/` (all use `# Story:` template H1 prefix so they appear on the PMAgent board automatically via the `projects/morbius → Morbius/requirements` symlink — `pm board morbius` smoke verified 23 epics / 69 stories). Extended `TestCase` with `pmagentSource?: { slug, storyId, acIndex, sourcePath, sourceChecksum }` + `pmagentLocked?: boolean` (`src/types.ts`). New `PMAgentSource` interface exported. `writeTestCase` + `readTestCase` round-trip the new frontmatter (`pmagent_source` + `pmagent_locked`). Extended `ProjectConfig` with `pmagentSlug?` + `pmagentPath?`. New `PMAgentConfigForm` React component in Settings → Integrations between Jira and Jira-mapping cards: slug input, path-override input, Save persists via existing `/api/config/update`, Test path button hits new `POST /api/pmagent/test-path` endpoint which does filesystem stat + counts epics/stories under `<resolvedPath>/epics/`. UI verified: typing `morbius` → Test path → pill shows "Path resolved · 23 epics, 69 stories". No console errors. AC1 + AC2 + AC3 met. |
