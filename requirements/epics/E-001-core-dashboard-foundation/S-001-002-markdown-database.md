# Story: Markdown File Database

**ID:** S-001-002
**Project:** morbius
**Epic:** E-001
**Stage:** Ready
**Status:** Done
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a developer, I want all test cases, bugs, and run results stored as markdown files with YAML frontmatter, so the data is human-readable, git-trackable, and requires no database setup.

## Acceptance Criteria

**Given** a test case is created or updated  
**When** the file is written  
**Then** it contains a YAML frontmatter block (id, title, status, priority, platforms, tags, deviceResults, changelog) and a markdown body (steps, acceptance criteria, notes, device results table)

**Given** any field on a test case or bug changes  
**When** the file is saved  
**Then** a changelog entry is appended with timestamp, field name, old value, new value, and actor

**Given** the server starts  
**When** it loads a project  
**Then** all test cases are read from `data/{project}/tests/{category}/*.md` and all bugs from `data/{project}/bugs/*.md`

## Do Not Do

- Do not introduce a SQL or NoSQL database
- Do not use a single monolithic JSON file per project (one markdown file per entity)

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
