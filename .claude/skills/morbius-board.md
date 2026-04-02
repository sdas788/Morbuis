---
name: morbius-board
description: Manage the Morbius QA dashboard — import tests, sync flows, create bugs, update statuses, switch projects, and serve the board. Use when someone says "open the board", "update test status", "create a bug", "sync flows", or "show QA dashboard".
user_invocable: true
---

# Morbius Dashboard Management

## Important: Pre-flight for Test Operations
Commands that interact with devices (ingest, sync from Maestro, run tests) require pre-flight checks. Run the `morbius-preflight` skill first. Read-only commands (serve, validate, import, export) do NOT need pre-flight.

You manage the Morbius QA dashboard. Here are the commands you can run.

## Quick Reference

| Task | Command |
|------|---------|
| Start dashboard | `cd /Users/sdas/Morbius && node dist/index.js serve` |
| Import Excel | `node dist/index.js import "<path>.xlsx"` |
| Sync YAML flows | `node dist/index.js sync` |
| Validate data | `node dist/index.js validate` |
| Create bug | `node dist/index.js create-bug --test TC-X.XX --title "..." --device iphone` |
| Export to Excel | `node dist/index.js export "<path>.xlsx"` |
| Ingest run results | `node dist/index.js ingest <maestro-output-dir> --device iphone` |

## Switching Projects

Check active project:
```bash
cat /Users/sdas/Morbius/data/projects.json | node -e "process.stdin.on('data',d=>console.log('Active:',JSON.parse(d).activeProject))"
```

Switch project (via API when server is running):
```bash
curl -X POST http://localhost:3000/api/projects/switch -H "Content-Type: application/json" -d '{"projectId":"micro-air"}'
```

Available projects: `micro-air` (Micro-Air ConnectRV), `shorr-intellistock` (Shorr IntelliStock)

## Common Workflows

### "Update the board with latest Excel"
```bash
cd /Users/sdas/Morbius
node dist/index.js import "<excel-path>"
node dist/index.js sync
node dist/index.js validate
```

### "I wrote new YAML flows, link them"
```bash
cd /Users/sdas/Morbius
node dist/index.js sync
```

### "Create a bug for a test failure"
```bash
cd /Users/sdas/Morbius
node dist/index.js create-bug \
  --test TC-2.01 \
  --title "Login fails on iPhone after timeout" \
  --device iphone \
  --priority P2 \
  --reason "Element 'Welcome' not found within 5000ms"
```

### "Show me the board"
```bash
cd /Users/sdas/Morbius
node dist/index.js serve --port 3000
# Open http://localhost:3000
```

## Dashboard Views
1. **Dashboard** (key `1`) — health %, category bars, bugs, flaky tests, device coverage
2. **Test Cases** (key `2`) — Kanban board by category, filter by status
3. **Bugs** (key `3`) — Kanban by status, create bugs, screenshot thumbnails
4. **Devices** (key `4`) — device matrix grid
5. **Runs** (key `5`) — test run history
6. **Maestro Tests** (key `6`) — live YAML flows from local folders, Android/iOS toggle

## Interactive Features (in browser)
- Click **status pill ▾** on any test/bug → dropdown to change status
- Click **"+ Report Bug"** on Bug Board → create bug from UI
- **Notes** textarea auto-saves in test and bug detail panels
- **⌘K** opens search, **?** shows keyboard shortcuts
- **Prerequisites** in sidebar → clickable setup guide
- **Health indicators** in topbar (Maestro, Android, iOS) — live system checks on refresh

## Data Location
```
/Users/sdas/Morbius/data/
  projects.json                    ← all projects + active project
  micro-air/tests/bugs/runs/       ← Micro-Air data
  shorr-intellistock/tests/bugs/   ← Shorr data
```

## Project Config
Each project at `data/<id>/config.json` stores: app ID, Excel path, Maestro paths, env vars, devices, prerequisites.
