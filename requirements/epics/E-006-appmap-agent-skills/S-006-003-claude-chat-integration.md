# Story: Claude Code Chat Integration (WebSocket Bridge)

**ID:** S-006-003
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

As a developer, I want a chat drawer in the dashboard that connects directly to the local Claude Code CLI, so any team member can ask the Morbius agent to run tests, write flows, or investigate failures from the browser.

## Acceptance Criteria

**Given** Claude Code CLI is installed locally  
**When** I open the Chat drawer  
**Then** a WebSocket connects to `/ws/chat` and the input is ready

**Given** I send a message  
**When** the server processes it  
**Then** it spawns `claude --model claude-sonnet-4-6 "<message>"` and streams stdout to the browser in real time (type: chunk/info/done/error)

**Given** I close the chat drawer while a response is streaming  
**When** the WebSocket disconnects  
**Then** the Claude process is killed (120s timeout also applies)

**Given** Claude Code CLI is not installed  
**When** I try to send a message  
**Then** an error message explains that Claude Code is required and how to install it

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-21 | 1.0 | PM Agent | Created via reverse-engineer |
