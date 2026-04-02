---
name: morbius-bug
description: Create and manage bug tickets in the Morbius QA dashboard. Creates bugs from test failures with screenshots, failure reasons, and selector analysis. Use when someone says "create a bug", "report failure", "log a defect", or "test failed".
user_invocable: true
---

# Create Bug Ticket in Morbius

You create bug tickets for test failures and manage existing bugs.

## Create a Bug

### From the CLI
```bash
cd /Users/sdas/Morbius
node dist/index.js create-bug \
  --test TC-2.01 \
  --title "Login fails on iPhone after valid credentials" \
  --device iphone \
  --priority P2 \
  --reason "Element 'Welcome' not found within 5000ms timeout" \
  --screenshot /path/to/failure-screenshot.png
```

### From the Dashboard UI
1. Open http://localhost:3000
2. Go to **Bugs** view (key `3`)
3. Click **"+ Report Bug"** button
4. Fill in: Title, Linked Test, Device, Priority, Failure Reason
5. Click **Create Bug**

### From Maestro Test Results
```bash
cd /Users/sdas/Morbius
node dist/index.js ingest /path/to/.maestro-test-output --device iphone
```
This auto-creates bug tickets for every failed test, including screenshots and selector analysis.

## Bug Fields

| Field | Required | Description |
|-------|----------|-------------|
| `--test` | Yes | Linked test case ID (e.g., TC-2.01) |
| `--title` | Yes | What failed — short and descriptive |
| `--device` | No | Device where it failed (iphone, android-phone, ipad, android-tab) |
| `--priority` | No | P1 (critical), P2 (high), P3 (medium). Default: P2 |
| `--reason` | No | Error message from Maestro or manual description |
| `--screenshot` | No | Path to failure screenshot (copied to data/screenshots/) |

## Bug Statuses

| Status | When |
|--------|------|
| **open** | Just created, not yet investigated |
| **investigating** | Someone is looking into it |
| **fixed** | Fix applied, needs verification |
| **closed** | Verified fixed or won't fix |

Change status from the dashboard: click the status pill in bug detail → select new status.

## What Makes a Good Bug Ticket

1. **Title** — Clear and specific: "Login fails on iPhone 15 after entering valid credentials" not "Login broken"
2. **Linked Test** — Always link to the test case ID so we know which test found it
3. **Device** — Specify exact device, failures are often device-specific
4. **Failure Reason** — Include the Maestro error message or describe what you observed
5. **Screenshot** — If available, always attach. Worth a thousand words.
6. **Selector Analysis** — Morbius auto-detects if the failure involves pixel-based selectors

## Bug Files Location

Bugs are stored as markdown in `data/<project>/bugs/`:
```
data/micro-air/bugs/
  bug-001-login-fails-on-iphone-after-valid-creden.md
  bug-002-hub-rename-truncates-long-names-on-andro.md
```

Each bug file has YAML frontmatter (id, status, priority, linked test, device, screenshot path) and markdown body (failure reason, steps to reproduce, selector analysis, notes).
