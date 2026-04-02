---
name: morbius-run-test
description: Run a Maestro test flow on a device. Handles app launch (adb, not Maestro launchApp), env loading, result tracking, and bug creation on failure.
user_invocable: true
---

# Run Maestro Test

Execute a Maestro YAML test flow against a live device/emulator.

## Before Running
1. Run the `morbius-preflight` skill — all checks must pass
2. If pre-flight fails, fix issues before proceeding

---

## Step 1: Identify What to Run

Ask the user or determine from context:
- **Specific flow file** — e.g., "run 01_login.yaml"
- **Test case ID** — e.g., "run TC-2.01" → look up linked flow in markdown frontmatter
- **Feature area** — e.g., "test login" → find the matching flow in `flows/`

Find the flow file:
```bash
# By flow name
ls /Users/sdas/Micro-Air/micro-air-testing/Andriod\ test/flows/

# By test case ID (check markdown frontmatter)
grep -r "maestro_flow_android" /Users/sdas/Morbius/data/micro-air/tests/ | grep "TC-2.01"
```

## Step 2: Prepare the App

⚠️ **CRITICAL: Maestro `launchApp` does NOT work with React Native apps.** Always use adb to launch.

```bash
# Stop the app
adb shell am force-stop <APP_ID>

# Option A: Clean launch (clears login state — for login/create account flows)
adb shell pm clear <APP_ID>
adb shell am start -n <APP_ID>/.MainActivity

# Option B: Hot launch (keeps login state — for flows that need authenticated state)
adb shell am start -n <APP_ID>/.MainActivity
```

**When to use which:**
- `01_login.yaml`, `02_create_account.yaml` → **Clean launch** (need Welcome screen)
- `03-07_*.yaml` → **Hot launch** works if the shared `login.yaml` helper handles login from Welcome screen. If app resumes to Hub Home, the login helper will still work because it checks for "Welcome!|Sign In" first.

### App IDs
| Project | App ID |
|---------|--------|
| Micro-Air | `com.microair.connectrv` |
| STS | Check `data/sts/config.json` |

## Step 3: Load Environment Variables

Read from the project config:
```bash
cat /Users/sdas/Morbius/data/micro-air/config.json
```

Core env vars for Micro-Air:
```
TEST_EMAIL=f5qcb@dollicons.com
TEST_PASSWORD=Qwer1234!
TEST_FIRST_NAME=QA
TEST_LAST_NAME=User
TEST_EMAIL2=sdas+1@redfoundry.com
TEST_PHONE=5551234567
```

## Step 4: Execute

### Option A: Run via Maestro MCP (preferred — live feedback)
```
mcp__maestro__run_flow_files
  device_id: emulator-5554
  flow_files: /Users/sdas/Micro-Air/micro-air-testing/Andriod test/flows/01_login.yaml
  env: { "TEST_EMAIL": "f5qcb@dollicons.com", "TEST_PASSWORD": "Qwer1234!" }
```

⚠️ `run_flow_files` prepends the CWD to relative paths. Always use **absolute paths**.

### Option B: Run via Maestro CLI (for full output/logs)
```bash
cd "/Users/sdas/Micro-Air/micro-air-testing/Andriod test/flows"
maestro test \
  -e TEST_EMAIL=f5qcb@dollicons.com \
  -e TEST_PASSWORD="Qwer1234!" \
  01_login.yaml
```

### Option C: Run ad-hoc commands (for debugging)
```
mcp__maestro__run_flow
  device_id: emulator-5554
  flow_yaml: |
    appId: com.microair.connectrv
    ---
    - tapOn: "Sign In"
    - waitForAnimationToEnd: { timeout: 5000 }
```

## Step 5: Handle Results

### If PASSED
1. Take a screenshot to confirm: `mcp__maestro__take_screenshot`
2. Update test status on the Morbius board:
```bash
curl -X POST http://localhost:3000/api/test/update \
  -H "Content-Type: application/json" \
  -d '{"id":"TC-2.01","status":"pass"}'
```
3. Report success to the user

### If FAILED
1. Take a screenshot to capture the failure state
2. Check what went wrong:
   - `mcp__maestro__take_screenshot` — what screen are we on?
   - `mcp__maestro__inspect_view_hierarchy` — what elements exist?
3. Common failures and fixes:

| Error | Cause | Fix |
|-------|-------|-----|
| "Unable to launch app" | React Native + Maestro launchApp bug | Use `adb shell am start` instead |
| "Element not found: text" | Text changed, element not on screen | Inspect hierarchy, use ID or regex |
| "Assertion is false: X is visible" | Screen hasn't loaded yet | Increase `extendedWaitUntil` timeout |
| "Registration failed" | Duplicate email in create account | Use a fresh email or expected error |

4. If it's a real app bug (not a test issue), create a bug ticket:
```bash
cd /Users/sdas/Morbius
node dist/index.js create-bug \
  --test TC-2.01 \
  --title "Login button unresponsive after password entry" \
  --device android-phone \
  --priority P2 \
  --reason "Sign In button tap has no effect after entering valid credentials"
```

5. Update test status to fail:
```bash
curl -X POST http://localhost:3000/api/test/update \
  -H "Content-Type: application/json" \
  -d '{"id":"TC-2.01","status":"fail"}'
```

## Step 6: Debug Failing Flows

When a flow fails mid-way, don't restart from scratch. Debug interactively:

1. **See where you are:** `mcp__maestro__take_screenshot`
2. **See what's available:** `mcp__maestro__inspect_view_hierarchy`
3. **Try the failing command manually:** `mcp__maestro__run_flow` with just that one step
4. **Adjust the selector** and re-run the single step
5. Once fixed, update the YAML file and re-run the full flow

---

## Quick Reference: Device IDs

```bash
# List connected devices
adb devices

# Common emulator ID
emulator-5554

# Get device ID via Maestro MCP
mcp__maestro__list_devices
```

## Quick Reference: Flow Files (Micro-Air)

```
flows/01_login.yaml          → Login happy path
flows/02_create_account.yaml → Create account to MFA screen
flows/03_hub_dashboard.yaml  → Hub dashboard verification
flows/04_hub_actions.yaml    → Hub menu actions (rename, settings)
flows/05_sensor_actions.yaml → Sensor detail and menu
flows/06_notifications.yaml  → Alerts and alert settings
flows/07_account.yaml        → Profile, edit, settings
shared/login.yaml            → Reusable login helper
```
