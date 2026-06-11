# Story: User Flows + Screen-Flow Graph (Zoom / Pan)

**ID:** S-029-004
**Project:** morbius
**Epic:** E-029
**Stage:** Ready
**Status:** Done
**Priority:** P1
**Version:** 1.1
**Created:** 2026-06-10
**Updated:** 2026-06-10

---

## Story

As a QA tester, I want the User Flows (UF-NNN) with their screen-flow diagrams rendered inline so that I can see the actual screen-to-screen journey a flow exercises, the way PMAgent's Flows tab shows it.

## Acceptance Criteria

**Given** an imported User Flow with a mermaid screen-flow graph
**When** I open it
**Then** the graph renders inline, themed to the Morbius monochrome system, with the matching Flow Plan (TF) and App Map cross-linked

**Given** a large screen-flow diagram
**When** I interact with it
**Then** I can zoom (scroll / +/− controls with a live %), pan (drag), and fit-to-view (double-click / ⤢) inside a framed viewport — it does not overflow or scroll the page

## Implementation Notes (as built)

`MermaidBlock` in `src/server.ts` (reuses the global mermaid the App Map uses). v1.1 (2026-06-10) added the zoom/pan viewport: cursor-anchored wheel zoom via a native non-passive listener, pointer-drag pan, fit-to-view, framed 380px viewport. Verified live on UF-004.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-10 | 1.0 | Claude | Created — backfilled from shipped code (drift audit). |
| 2026-06-10 | 1.1 | Claude | Zoom/pan viewport added to `MermaidBlock` (scroll-to-zoom toward cursor, drag-to-pan, fit-to-view, framed 380px box). Verified live on UF-004 screen flow. |
