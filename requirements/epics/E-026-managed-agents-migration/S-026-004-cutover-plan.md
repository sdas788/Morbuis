# Story: Cutover Plan — Flip Default in Prod, Keep CLI as Escape Hatch

**ID:** S-026-004
**Project:** morbius
**Epic:** E-026
**Stage:** Draft
**Status:** Todo
**Priority:** P1
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

---

## Story

As the v2.1 owner, I want a documented cutover that flips production's default agent mode from `cli-subprocess` to `managed-agents` while keeping CLI mode as an env-var escape hatch — so if Managed Agents misbehaves in real RF traffic we flip back without a redeploy.

This story is the **last gate** for v2.1. It does not start until S-026-003 has been running in production behind a feature flag for at least one full week with no parity regressions.

## Acceptance Criteria

**Given** S-026-003 has been live as opt-in for ≥7 days with ≥20 real test runs in `managed-agents` mode
**When** I review the parity report (CLI vs. managed-agents pass/fail counts, latency p50/p95, cost per run)
**Then** the report shows: pass rate within 2 percentage points of CLI, p95 latency within 1.2× CLI, cost within 2× CLI baseline. If any of those fail, cutover is blocked — go back to S-026-003 and investigate.

**Given** the parity report passes
**When** I flip `MORBIUS_AGENT_MODE` Fly secret from `cli-subprocess` to `managed-agents`
**Then** the next deploy makes Managed Agents the default; the CLI subprocess still works (image still has the CLI baked in) but is only used when the env var is explicitly set back

**Given** Managed Agents misbehaves post-cutover
**When** I run `fly secrets set MORBIUS_AGENT_MODE=cli-subprocess && fly deploy`
**Then** production reverts to CLI mode within one deploy cycle (~3 min) without code changes

**Given** the cutover holds for ≥30 days with no incidents
**When** I plan the v2.2 (or whatever comes next) work
**Then** I can decide whether to remove the CLI baked-into-the-image (saves ~200 MB image size) — but that's a separate epic, not this story

**Given** the cutover is complete
**When** I update `requirements/arch.md` and `docs/cloud-deploy.md`
**Then** Managed Agents is named as the production runner and CLI mode is documented as the escape hatch (with the env-var rollback procedure)

## Constraints (from epic)

- **C2** — CLI mode stays in production for one full release cycle after cutover. Do not strip the CLI from the Dockerfile in this story.
- **C3** — no regression on user-visible behavior. Cutover is invisible to RF engineers using the dashboard; they should not need to learn anything new.
- **C5** — direction doc stays current. The cutover triggers a Direction doc update naming Managed Agents as the live production runner.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
