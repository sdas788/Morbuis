---
name: morbius-run-test
description: Run a Maestro test flow on a device via Maestro MCP. Handles app launch, env loading, result tracking, and bug creation on failure. Always use mcp__maestro__run_flow_files with the correct path format.
user_invocable: true
---

# Run Maestro Test

Execute a Maestro YAML test flow against a live device/emulator using the Maestro MCP tool.

## RULE: Always use Maestro MCP, not CLI
Use `mcp__maestro__run_flow_files` to run flows — it gives live feedback and integrates with the Morbius board. Only fall back to CLI if MCP is unavailable.

---

## Step 1: Identify What to Run

Ask the user or determine from context:
- **Specific flow file** — e.g., "run 01_login.yaml"
- **Test case ID** — e.g., "run TC-2.01" → look up linked flow in markdown frontmatter
- **Feature area** — e.g., "test login" → find the matching flow in `flows/`

### Flow file locations

| Project | Platform | Path |
|---------|----------|------|
| Micro-Air | Android | `/Users/sdas/Micro-Air/micro-air-testing/Andriod test/flows/` |
| Micro-Air | iOS | `/Users/sdas/Micro-Air/micro-air-testing/IOS app/flows/` |
| STS | Android | `/Users/sdas/STS/sts-testing/Andriod test/flows/` |
| STS | iOS | `/Users/sdas/STS/sts-testing/IOS app/flows/` |

---

## Step 2: Get the Device ID

```
mcp__maestro__list_devices
```

| Device | ID |
|--------|-----|
| Android emulator | `emulator-5554` |
| iOS simulator | varies — check list_devices output |

---

## Step 3: Execute via Maestro MCP

### Run a single flow
```
mcp__maestro__run_flow_files
  device_id: emulator-5554
  flow_files: ../STS/sts-testing/Andriod test/flows/01_login.yaml
```

**Path note:** Maestro MCP prepends `/Users/sdas/Morbius` (the CWD) to all paths.
- Use **relative paths** starting with `../` to reach outside Morbius
- Example: `../STS/sts-testing/Andriod test/flows/01_login.yaml`
- Example: `../Micro-Air/micro-air-testing/Andriod test/flows/01_login.yaml`

### Run with environment variables
```
mcp__maestro__run_flow_files
  device_id: emulator-5554
  flow_files: ../STS/sts-testing/Andriod test/flows/01_login.yaml
  env: { "TEST_USERNAME": "cthomas", "TEST_PASSWORD": "Test1234!" }
```

### Run multiple flows in sequence
```
mcp__maestro__run_flow_files
  device_id: emulator-5554
  flow_files: ../STS/sts-testing/Andriod test/flows/01_login.yaml,../STS/sts-testing/Andriod test/flows/02_calculators_home.yaml
```

---

## Step 4: App Launch (React Native Critical Note)

The YAML files handle app launch internally. Both Micro-Air and STS are React Native — their flows use:
```yaml
- stopApp
- clearState
- launchApp
```
**Do NOT** manually pre-launch the app with adb before running the flow — the YAML handles it.

If you ever need to manually clear app state before testing:
```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
adb shell am force-stop <APP_ID>
adb shell pm clear <APP_ID>
```

---

## Step 5: Handle Results

### If PASSED
1. Take a screenshot: `mcp__maestro__take_screenshot`
2. Update test status on the Morbius board:
```bash
curl -X POST http://localhost:3000/api/test/update \
  -H "Content-Type: application/json" \
  -d '{"id":"TC-2.01","status":"pass"}'
```
3. Report success, move to next flow

### If FAILED
1. Take a screenshot: `mcp__maestro__take_screenshot`
2. Inspect screen: `mcp__maestro__inspect_view_hierarchy`
3. Debug the failing step (see Step 6)
4. Fix the YAML, re-run the full flow
5. If it's a real app bug (not test issue), create a bug ticket:
```bash
cd /Users/sdas/Morbius
node dist/index.js create-bug \
  --test TC-2.01 \
  --title "Login button unresponsive after password entry" \
  --device android-phone \
  --priority P2 \
  --reason "Sign In button tap has no effect after entering valid credentials"
```
6. Update test status to fail:
```bash
curl -X POST http://localhost:3000/api/test/update \
  -H "Content-Type: application/json" \
  -d '{"id":"TC-2.01","status":"fail"}'
```

---

## Step 6: Debug Failing Flows

1. **See where you are:** `mcp__maestro__take_screenshot`
2. **See what's available:** `mcp__maestro__inspect_view_hierarchy`
3. **Test the failing step manually:**
```
mcp__maestro__run_flow
  device_id: emulator-5554
  flow_yaml: |
    appId: com.sts.calculator
    ---
    - tapOn: "Log in to your account"
    - waitForAnimationToEnd:
        timeout: 5000
```
4. **Fix the selector** in the YAML file
5. **Re-run the full flow** with `mcp__maestro__run_flow_files`

### Common failures

| Error | Cause | Fix |
|-------|-------|-----|
| "Unable to launch app" | `launchApp: clearState: true` crashes RN | Use `stopApp` + `clearState` + `launchApp` in YAML |
| Path not found | MCP prepends CWD | Use `../` relative path |
| "Element not found: text" | Text changed or off-screen | Inspect hierarchy, use ID or regex |
| "Assertion false: X visible" | Screen hasn't loaded | Increase `extendedWaitUntil timeout` |
| Password in wrong field | `tapOn: "Password"` matches label only | Use `tapOn: id: "...Password"` resource-id |
| OAuth redirect timeout | Server slow (30-60s) | Use `extendedWaitUntil timeout: 90000` |
| MCP connection timeout | Long-running flow (>2min) | Normal for OAuth flows — the result still comes back |

---

## Environment Variables

### Micro-Air
```
TEST_EMAIL=f5qcb@dollicons.com
TEST_PASSWORD=Qwer1234!
APP_ID=com.microair.connectrv
```

### STS
```
TEST_USERNAME=cthomas
TEST_PASSWORD=Test1234!
APP_ID=com.sts.calculator
```

---

## Option B: Run via Maestro CLI (fallback)

Only use if MCP is unavailable:
```bash
cd "/Users/sdas/STS/sts-testing/Andriod test/flows"
maestro test 01_login.yaml
```
