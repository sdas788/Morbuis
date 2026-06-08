---
name: morbius-onboard
description: Onboard a new app project into the Morbius QA dashboard. Creates project config, imports Excel test cases, links Maestro YAML flows, and starts the dashboard. Use when someone says "new project", "add app to Morbius", or "set up QA for <app>".
user_invocable: true
---

# Onboard New Project into Morbius

You are setting up a new mobile app for QA testing in the Morbius dashboard.

## Step 1: Gather Information

Ask the user for:
1. **Project name** (e.g., "Shorr IntelliStock", "Micro-Air ConnectRV")
2. **App bundle/package ID** (e.g., "com.shorr.intellistock.dev")
3. **Excel test plan path** — the .xlsx file with test cases
4. **Maestro YAML flows path** — folder containing the Maestro test flows
5. **Required env vars** — comma-separated (e.g., TEST_EMAIL, TEST_PASSWORD)
6. **Prerequisites** — anything else needed (physical device, VPN, OTP script, etc.)

## Step 2: Create the Project

```bash
cd /Users/sdas/Morbius

# Create project via API (if server is running) or directly
node -e "
const fs = require('fs');
const path = require('path');
const reg = JSON.parse(fs.readFileSync('data/projects.json', 'utf-8'));
const config = {
  id: '<SLUG>',
  name: '<PROJECT_NAME>',
  created: new Date().toISOString().split('T')[0],
  appId: '<APP_ID>',
  excel: { source: '<EXCEL_PATH>' },
  maestro: { androidPath: '<MAESTRO_PATH>', iosPath: '<MAESTRO_PATH>' },
  env: { /* env vars */ },
  devices: [
    { id: 'iphone', name: 'iPhone', platform: 'ios' },
    { id: 'android-phone', name: 'Android Phone', platform: 'android' }
  ],
  prerequisites: [/* list */]
};
// Create project directory
const dir = path.join('data', config.id);
fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
fs.mkdirSync(path.join(dir, 'bugs'), { recursive: true });
fs.mkdirSync(path.join(dir, 'runs'), { recursive: true });
fs.mkdirSync(path.join(dir, 'screenshots'), { recursive: true });
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2));
reg.projects.push(config);
reg.activeProject = config.id;
fs.writeFileSync('data/projects.json', JSON.stringify(reg, null, 2));
console.log('Project created:', config.id);
"
```

## Step 3: Import Excel Test Cases

```bash
cd /Users/sdas/Morbius
node dist/index.js import "<EXCEL_PATH>"
```

This reads every sheet from the Excel, creates markdown files per test case, organized by category.

> **PMAgent projects:** if this project comes from PMAgent, skip Steps 2-3 and run `node dist/index.js pmagent-sync <slug>` instead — it imports the test cases AND now writes a `config.json` stub automatically. Onboarding then = filling in `appId`, `maestro` paths, and `testAccounts` (Step 3b) in that stub.

## Step 3b: Register test personas (testAccounts)

Most real test plans need different account states (logged-out, in-a-group, group-leader, second account for multi-user checks). Model them once as `config.testAccounts` so flows bind a persona instead of hardcoding creds. **Store env-var NAMES only — never paste passwords into config.json or the plan.**

```jsonc
"testAccounts": [
  { "key": "in-group", "label": "In a group", "envKeys": { "email": "RS_INGROUP_EMAIL", "password": "RS_INGROUP_PASSWORD" } },
  { "key": "group-leader", "label": "Group leader", "envKeys": { "email": "RS_LEADER_EMAIL", "password": "RS_LEADER_PASSWORD" }, "programId": "25684" }
]
```
Put the actual values in `config.json` `env` (or a secrets store) under those names. The Automation Plan board's persona filter + `morbius doctor` persona-integrity check read this registry.

## Step 4: Link Maestro YAML Flows

```bash
node dist/index.js sync
```

This scans the Maestro folders, matches YAML flows to test cases by QA Plan ID (supports `# QA Plan ID: X.XX`, `# ID: X.XX`, and `tc-X.XX` tags).

## Step 5: Validate

```bash
node dist/index.js validate
```

Check for broken links, empty categories, missing Maestro paths.

## Step 6: Start Dashboard

```bash
node dist/index.js serve --port 3000
```

Open http://localhost:3000 — the new project is ready.

## Step 7: Decide what to automate
Run `morbius doctor` (catches a missing config.json, stale skills, scenario mislabels), then the **`morbius-automation-plan`** skill to derive the plan from the test cases + app map. That's the next stage of the harness — see `requirements/HARNESS.md`.

## Key Rules
- **Don't trust the `scenario` field** to decide what to automate — it can be mislabelled on import/sync. Decide via the `morbius-automation-plan` framework (priority + AC + journey).
- Target **Android Phone** and **iPhone** only (not tablets for now)
- Use **text-based selectors** in Maestro YAML (never pixel `point:` selectors)
- Create **shared flows** for login/logout/navigation (reused across tests)
- Follow the folder structure of existing projects (Micro-Air pattern)
