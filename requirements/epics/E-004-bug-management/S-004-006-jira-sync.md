# Story: Jira Sync — Pull Bugs, Sync Status, Create Issues

**ID:** S-004-006
**Project:** morbius
**Epic:** E-004
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want to sync bugs bidirectionally with Jira — pulling Jira issues into the bug board and pushing local status changes back — so the Morbius board and Jira stay in sync without manual copy-paste.

## Acceptance Criteria

**Given** Jira cloud ID, project key, and JQL are configured  
**When** I click "Sync All" on the Bug board  
**Then** all Jira issues matching the JQL are pulled and shown as bugs with a "J" badge, including assignee, status, priority, and last comment

**Given** a local bug has been updated (status changed)  
**When** I click "Sync" on that bug  
**Then** the Jira issue status is updated to match (bidirectional)

**Given** a local bug has no Jira issue yet  
**When** I click "Create in Jira"  
**Then** a new Jira issue is created and the local bug is linked with the Jira key and URL

**Given** the Jira credentials are invalid  
**When** sync is attempted  
**Then** an error message is shown and no data is corrupted

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
