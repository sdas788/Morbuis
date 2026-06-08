---
name: morbius-preflight
description: Run pre-flight checks before any test operation — verifies Maestro CLI, MCP, devices, project config, and app installation. Use before running tests, writing flows, or ingesting results.
user_invocable: true
---

# Morbius Pre-flight Checks

Run these checks IN ORDER before any test operation. Print a checklist summary at the end.

## Check 1: Maestro CLI
```bash
maestro --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'
```
- PASS: prints version (e.g., "2.1.0")
- FAIL: command not found → `brew install maestro` or `curl -Ls "https://get.maestro.mobile.dev" | bash`

## Check 2: Maestro MCP
Call `mcp__maestro__list_devices`.
- PASS: returns device list (even if empty)
- FAIL: tool not available → "Maestro MCP server not connected. Check Claude Code MCP settings."

## Check 3: Android Device/Emulator
```bash
adb devices 2>/dev/null | grep -v "List" | grep "device$"
```
- PASS: at least one line with "device" (not "offline" or "unauthorized")
- FAIL: no device → "Start an emulator: `emulator -avd <name>` or connect a physical device"
- Note the device ID (e.g., `emulator-5554`) — needed for Maestro MCP calls

## Check 4: iOS Simulator
```bash
xcrun simctl list devices booted 2>/dev/null | grep "Booted"
```
- PASS: at least one booted simulator
- FAIL: none → "Boot one: `xcrun simctl boot <device-id>` or open Xcode → Devices"

## Check 5: Active Project
```bash
cat /Users/sdas/Morbius/data/projects.json
```
Check that `activeProject` is set. Then read the project config:
```bash
cat /Users/sdas/Morbius/data/<activeProject>/config.json
```
Verify:
- `appId` exists and is correct (e.g., `com.microair.connectrv` — NOT `.dev`)
- `maestro.androidPath` points to the `flows/` directory
- The flows directory has YAML files

## Check 6: App Installed on Device
```bash
adb shell pm list packages 2>/dev/null | grep <APP_ID>
```
- PASS: package found
- FAIL: app not installed → "Install the app APK on the emulator first"

## Check 7: App Launchable
Maestro's `launchApp` **does work** with React Native apps (verified). Launch via Maestro MCP — cross-platform, no hardcoded activity:
```
mcp__maestro__run
  device_id: <id>
  yaml: |
    appId: <APP_ID>
    ---
    - launchApp
```
- PASS: app foregrounds (screenshot/inspect_screen shows its first screen)
- FAIL: error → check `appId` matches the installed package (`.dev` build variants differ)
- ⚠️ Do **not** use `launchApp: { clearState: true }` on RN apps — it can crash. For a fresh start use `adb shell pm clear <APP_ID>` first, then plain `- launchApp`.

## Summary Output
```
Pre-flight Check Results:
  ✓ Maestro CLI: v2.1.0
  ✓ Maestro MCP: Connected (1 device)
  ✓ Android: emulator-5554 (Medium_Phone_API_36.1)
  ✗ iOS: No simulator running
  ✓ Project: micro-air (com.microair.connectrv)
  ✓ App installed: com.microair.connectrv
  ✓ App launchable: MainActivity

  7 flows available:
    01_login.yaml
    02_create_account.yaml
    03_hub_dashboard.yaml
    04_hub_actions.yaml
    05_sensor_actions.yaml
    06_notifications.yaml
    07_account.yaml
```

## Gate Logic
- **Android-only:** Skip Check 4 (iOS)
- **iOS-only:** Skip Check 3 (Android) + Check 6-7 use xcrun instead of adb
- **Read-only operations** (viewing board, checking status): SKIP all checks
- **If any required check fails:** STOP. Print what's missing with fix instructions. Do NOT proceed.

## Known Issues (from real testing)

| Issue | Cause | Workaround |
|-------|-------|------------|
| `launchApp: { clearState: true }` crashes RN apps | clearState inside launchApp is unsafe on RN | Use `adb shell pm clear <APP_ID>` first, then plain `- launchApp` (the 3-step `stopApp → clearState → launchApp` also works in flows) |
| App ID `.dev` suffix | Build variants have different package names | Check `adb shell pm list packages \| grep <name>` for the real ID |
| Maestro instrumentation init fails once after a version bump | cold start / MCP just restarted | Retry once — a plain `launchApp` usually initializes it |
