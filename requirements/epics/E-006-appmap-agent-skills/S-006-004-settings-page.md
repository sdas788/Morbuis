# Settings Page (Project Config, Devices, Integrations, Appearance)

**ID:** S-006-004
**Project:** morbius
**Epic:** E-006
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-21
**Updated:** 2026-04-21

---

## Story

As a QA lead, I want a Settings tab where I can configure the active project's Maestro paths, device list, Jira credentials, and appearance preferences — all from the browser — without editing JSON files by hand.

## Acceptance Criteria

**Given** I open the Settings tab  
**When** it loads  
**Then** I see sections: Profile, Workspace, Integrations, Devices, Maestro, Test Runs, Appearance, Data, Danger Zone

**Given** I update the Android Maestro path in Settings  
**When** I save  
**Then** `POST /api/config/update` writes the new path to `config.json` and the Maestro tab reloads with the new path

**Given** I add a new device in the Devices section  
**When** saved  
**Then** the device appears in the Device Coverage Matrix and is available as an option in bug creation

**Given** I toggle dark/light theme  
**When** the toggle is flipped  
**Then** the entire dashboard switches theme immediately without a page reload

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
