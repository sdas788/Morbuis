# Story: Cloudflare Access + Tunnel SSO

**ID:** S-025-004
**Project:** morbius
**Epic:** E-025
**Stage:** Draft
**Status:** Todo
**Priority:** P0
**Version:** 1.0
**Created:** 2026-04-30
**Updated:** 2026-04-30

---

## Story

As the security boundary for v2.0, I want Cloudflare Access to gate the hosted Morbius URL with `@redfoundry.com` Google Workspace SSO — so the team gets identity-aware access for free without me writing any auth code in Morbius.

## Acceptance Criteria

**Given** the Fly app from S-025-003 is running at `https://morbius-rf.fly.dev/`
**When** I set up a Cloudflare Tunnel pointing at the Fly app and bind `morbius.redfoundry.dev` (or similar) to it via Cloudflare DNS
**Then** opening the public domain terminates TLS at Cloudflare's edge and proxies traffic to the Fly app

**Given** the Cloudflare Access policy is configured to allow only `@redfoundry.com` Google Workspace identities
**When** a non-RF account tries to log in
**Then** Cloudflare Access denies them with a clear message; the request never reaches Morbius

**Given** an `@redfoundry.com` user logs in successfully
**When** their request reaches the Morbius container
**Then** the per-user identity is forwarded as the `Cf-Access-Authenticated-User-Email` header (Morbius doesn't read it in v2.0, but capture is "free" and v2.1 audit-trail work will use it)

**Given** I need to roll back the auth gate
**When** I disable the Cloudflare Access app OR pause the Tunnel
**Then** the URL behaves predictably (Access disabled → public; Tunnel paused → 404), with documented rollback procedure

## Constraints (from epic)

- **C1** — Cloudflare Access free tier covers 50 users.

---

## Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-30 | 1.0 | Claude | Created |
