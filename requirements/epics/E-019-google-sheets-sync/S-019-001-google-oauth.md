# Story: Google OAuth Connection in Settings

**ID:** S-019-001
**Project:** morbius
**Epic:** E-019
**Stage:** Draft
**Status:** Todo
**Priority:** P2
**Version:** 1.0
**Created:** 2026-04-23
**Updated:** 2026-04-23

---

## Story

As a QA lead, I want to connect my Google account from Settings so that Morbius can sync with my Google Sheets QA plan without me managing API keys.

## Acceptance Criteria

**Given** Settings → Integrations → Google Sheets is open
**When** I click "Connect Google Account"
**Then** the Google OAuth 2.0 flow launches and, on success, a refresh token is stored encrypted at `data/{projectId}/config.json` under `googleSheets.refreshToken`

**Given** the token is stored
**When** the connection panel re-renders
**Then** the connected account email is displayed with a "Disconnect" button

**Given** the user clicks "Disconnect"
**When** confirmed
**Then** the token is cleared and any bound Sheet IDs are unbound

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude | Created |
