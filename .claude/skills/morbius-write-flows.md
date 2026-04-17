---
name: morbius-write-flows
description: Write Maestro YAML test flows for mobile apps. Explores the app first, writes flows based on real screens, then IMMEDIATELY tests each flow via Maestro MCP in one go. Use when someone says "write tests", "create flows", "automate test cases", or "write YAML".
user_invocable: true
---

# Write Maestro YAML Flows

You write Maestro YAML test flows by **exploring the real app first**, writing flows based on what you actually see, then **immediately running each flow in full via Maestro MCP** before moving on.

## RULE: Write → Test → Fix → Next
**Never write a flow and move on without testing it.** After writing any flow file, you MUST run it using `mcp__maestro__run_flow_files` in one complete execution. Do not loop step-by-step. Do not skip testing. Do not batch writes and test later.

```
For EVERY flow file written:
  1. Write the complete YAML
  2. Run it: mcp__maestro__run_flow_files (absolute path, full flow)
  3. Take screenshot to confirm result
  4. Fix any failures
  5. Re-run after fix to confirm pass
  6. Only then move to the next flow
```

---

## Before You Start
1. Run the `morbius-preflight` skill to verify Maestro, MCP, and devices are ready
2. List connected devices: `mcp__maestro__list_devices`
3. If pre-flight fails, resolve before proceeding

---

## How We Decide What to Test

### The philosophy: Feature areas, not test cases

An Excel QA plan might have 150 test cases across 27 categories. That doesn't mean you need 150 YAML files — or even 27. You need one flow per **feature area the user actually touches**.

We went from 50 YAML files down to 14 flows + 1 shared helper by asking one question: **"What does the user actually do in this app?"**

### The decision framework

**Step 1: Explore the app, map the real navigation.**
Don't read the Excel. Open the app. Tap every tab, every menu, every button. Screenshot everything. Build the real navigation tree.

**Step 2: Group by feature area, not by Excel sheet.**
The Excel had 27 categories like "Hub Mgmt Change Wi-Fi Network" and "Hub Mgmt Rename Hub" — these are the SAME screen (the hub ⋮ menu). One flow covers both.

**Step 3: One flow per area. Each flow tests multiple actions.**
`04_hub_actions.yaml` tests the hub menu, rename with save, AND alert settings — all in one file. Not three separate files.

**Step 4: Separate flows only when the user journey is fundamentally different.**
Login and Create Account are different journeys (different screens, different inputs). They get separate flows. But "Rename Hub" and "Hub Alert Settings" are the same journey (both start from the hub ⋮ menu). They share a flow.

**Step 5: Separate environments for destructive vs non-destructive.**
Delete flows use `DESTROY_EMAIL` — a throwaway account. Never the main test account. This is a safety rule, not a preference.

### What NOT to automate
- **Detour scenarios** (edge paths like "cancel midway") — not worth the maintenance
- **Negative scenarios** (wrong password, invalid input) — test manually
- **Edge cases** (offline, timeout) — hard to simulate reliably in Maestro
- **External webviews** (Support tab links to external sites) — Maestro can't control them

---

## Phase 1: Explore the App

Before writing a single YAML line, systematically explore every screen:

### 1. Launch the app
```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
adb shell am force-stop <APP_ID>
adb shell am start -n <APP_ID>/.MainActivity
```

### 2. Screenshot every screen
Use `mcp__maestro__take_screenshot` at each screen.

### 3. Inspect the view hierarchy
Use `mcp__maestro__inspect_view_hierarchy` to discover element IDs, text content, clickable elements.

### 4. Map the navigation
Document what you find — tabs, menus, sub-screens, modals.

### 5. Test taps interactively
Use `mcp__maestro__tap_on` and `mcp__maestro__run_flow` to verify selectors work before writing YAML.

---

## Phase 2: Write the Flow

### YAML Template
```yaml
appId: <APP_ID>
name: "<NN> <Feature> — Happy Path"
tags:
  - android   # or ios
  - <feature>
  - happy-path
  - flow
---
# -----------------------------------------------
# <Feature> — <What it covers>
# QA Plan ID: <X.XX>
# -----------------------------------------------

# React Native apps: clearState inside launchApp crashes. Use this pattern instead:
- stopApp
- clearState
- launchApp

# Or use shared login helper (handles stopApp/clearState internally):
- runFlow:
    file: "../shared/login.yaml"

# Feature-specific steps
- tapOn: "Element Text"
- assertVisible: "Expected Text"
```

### React Native App Launch (CRITICAL)
`launchApp: clearState: true` crashes on React Native apps. Always use this 3-step pattern:
```yaml
- stopApp
- clearState
- launchApp
```
This applies to: Micro-Air (`com.microair.connectrv`), STS (`com.sts.calculator`), and any RN app.

---

## Phase 3: Test the Flow (MANDATORY)

After writing each flow, run it immediately. **Do not skip this step.**

### Run via Maestro MCP (preferred)
```
mcp__maestro__run_flow_files
  device_id: emulator-5554          # Android emulator
  flow_files: ../STS/sts-testing/Andriod test/flows/01_login.yaml
  # Note: MCP prepends CWD (/Users/sdas/Morbius). Use relative paths from there.
  # Or use absolute path but strip the leading / (known MCP quirk)
```

**Path quirk:** Maestro MCP prepends the working directory (`/Users/sdas/Morbius`) to paths.
- Use relative paths: `../STS/sts-testing/Andriod test/flows/01_login.yaml`
- Or use absolute paths starting with `/` — but verify the MCP doesn't double-prefix

### Device IDs
| Device | ID |
|--------|-----|
| Android emulator | `emulator-5554` |
| iOS simulator | get from `mcp__maestro__list_devices` |

### After running
1. Take a screenshot: `mcp__maestro__take_screenshot`
2. If **PASSED** → report success, move to next flow
3. If **FAILED** → debug (see Phase 4), fix YAML, re-run the full flow

---

## Phase 4: Debug Failures

When a flow fails, debug interactively — don't rewrite from scratch.

1. **See where you are:** `mcp__maestro__take_screenshot`
2. **See what's on screen:** `mcp__maestro__inspect_view_hierarchy`
3. **Test the failing step manually:** `mcp__maestro__run_flow` with just that command
4. **Fix the selector** in the YAML
5. **Re-run the full flow** with `mcp__maestro__run_flow_files`

| Error | Cause | Fix |
|-------|-------|-----|
| "Unable to launch app" | `launchApp: clearState: true` on RN | Use `stopApp` + `clearState` + `launchApp` |
| "Element not found: text" | Text changed or not on screen | Inspect hierarchy, use ID or regex |
| "Assertion false: X visible" | Screen hasn't loaded | Increase `extendedWaitUntil` timeout |
| Password goes into username | Tap by text matches placeholder, wrong focus | Use `tapOn: id:` with resource-id |
| OAuth redirect timeout | Slow server, 30-60s | Set `extendedWaitUntil timeout: 90000` |
| `scrollUntilVisible` succeeds but `tapOn` immediately fails (iOS) | Dev toast band (y=786–835) is intercepting the tap — element is in view but toast is on top | Apply overshoot trick: scroll to LAST option first, then tap first option — this lifts first option above the band |
| `scrollUntilVisible` times out after section tab tap (iOS STS) | AsyncStorage async tab restoration fires after the tap and switches away | Double-tap the section tab with 2s gap between taps |
| `scrollUntilVisible` times out for `tab-valveDisease` or `tab-arrhythmia` (iOS STS single-scroll calcs) | After tapping `tab-coronaryArteryDisease`, the subsection tab bar scrolls off-screen ABOVE — tabs excluded from accessibility tree | Skip subsection tab taps; scroll directly to field IDs using long timeouts (15000–30000ms) |
| `tapOn` triggers full-screen React dev console overlay (iOS STS) | Tapping inside toast band (y=786–835) fires React key-prop warning dev console | Same fix as toast band: apply overshoot trick so field lifts above y=835 before tapping |
| `tab-plannedSurgery` not found in Lung Cancer flow | Lung Cancer async-restores to 73%+ scroll; tab is 3500+ px above viewport (completely off-screen) | Use `scrollUntilVisible: id: radio-resectionType-Lobectomy direction: UP timeout: 30000` at flow start instead of double-tap |
| Full-screen "Log N of N" overlay blocks all interaction (iOS RN dev) | DdRumErrorTracking intercepts `console.error` calls — too many errors triggered overlay | Fix app source: wrap `dispatch` in `setTimeout`, change `console.error` → `console.warn` for non-fatal messages |
| `chip-{fieldId}-undefined` not found (iOS STS) | `checkboxGroup` options have no `value` — need `apiKeys[0].apiKey` fallback | Apply SectionRenderer testID fix; use `chip-{fieldId}-{apiKeyName}` |
| `xcuitest.installer...IOSDriverTimeoutException` | Stale XCTest runner process | `pkill -f xctest && pkill -f maestro`, then retry |

---

## Selector Rules (BATTLE-TESTED)

### What works
| Selector | Example | When to use |
|----------|---------|-------------|
| Text match | `tapOn: "Sign In"` | Always try first |
| Regex OR | `tapOn: "Save\|Apply\|Done"` | Text varies |
| Resource ID | `tapOn: id: "phosphor-react-native-plus-undefined"` | Icons |
| HTML element ID | `tapOn: id: "FormContentPlaceHolder_LoginEditForm_UserName"` | Webview forms |
| Below/above | `tapOn: { text: "Password*", below: { text: "Phone*" } }` | Duplicate labels |
| Extended wait | `extendedWaitUntil: { visible: "text", timeout: 15000 }` | Screen transitions |

### What breaks
| Selector | Why |
|----------|-----|
| `point: "340,720"` | Breaks on different screen sizes |
| `index: 3` | List order changes |
| `sleep: 5000` | Use `waitForAnimationToEnd` instead |
| `tapOn: "Password"` on webview | Matches placeholder, focus stays on wrong field → use resource-id |

### Clearing React Native text fields (Android only)
Maestro `eraseText` doesn't work on some Android RN EditText fields. Workaround:
```yaml
- tapOn:
    text: "Field Label.*"
- runScript:
    script: |
      const { execSync } = require('child_process');
      execSync('adb shell input keyevent KEYCODE_MOVE_END');
      for (let i = 0; i < 30; i++) {
        execSync('adb shell input keyevent KEYCODE_DEL');
      }
- inputText: "new value"
```
On iOS, `eraseText` works natively — no workaround needed.

### React Native element IDs (Phosphor icons)
```
phosphor-react-native-plus-undefined                  → "+" add button
phosphor-react-native-user-(regular|fill)             → Account tab
phosphor-react-native-bell-(regular|fill)             → Notifications tab
phosphor-react-native-house-(regular|fill)            → Home tab
phosphor-react-native-headset-(regular|fill)          → Support tab
phosphor-react-native-pencil-simple-undefined         → Edit pencil icon
phosphor-react-native-dots-three-vertical-undefined   → Hub ⋮ menu
phosphor-react-native-dots-three-vertical-bold        → Sensor ⋮ menu
phosphor-react-native-gear-undefined                  → Settings gear (STS)
phosphor-react-native-magnifying-glass-undefined      → Search icon (STS)
```

---

## Environment Separation

### Non-destructive flows (01-11)
```
TEST_EMAIL=f5qcb@dollicons.com
TEST_PASSWORD=Qwer1234!
```

### OTP flows (08-09)
```
OTP_EMAIL=shubdas223@gmail.com
OTP_PASSWORD=Test@123
```

### Destructive flows (12-14) — NEVER mix with TEST_EMAIL
```
DESTROY_EMAIL=shubdas223@gmail.com
DESTROY_PASSWORD=Test@123
```

### Sandbox payment (10)
```
CARD_NUMBER=4242424242424242
CARD_EXP=05/26
CARD_CVV=312
CARD_ZIP=60675
```

### STS credentials
```
TEST_USERNAME=cthomas
TEST_PASSWORD=Test1234!
APP_ID=com.sts.calculator
```

---

## Flow File Locations

### Micro-Air Android
```
/Users/sdas/Micro-Air/micro-air-testing/Andriod test/flows/
/Users/sdas/Micro-Air/micro-air-testing/Andriod test/shared/login.yaml
```

### Micro-Air iOS
```
/Users/sdas/Micro-Air/micro-air-testing/IOS app/flows/
/Users/sdas/Micro-Air/micro-air-testing/IOS app/shared/login.yaml
```

### STS Android
```
/Users/sdas/STS/sts-testing/Andriod test/flows/
/Users/sdas/STS/sts-testing/Andriod test/shared/login.yaml
```

### STS iOS
```
/Users/sdas/STS/sts-testing/IOS app/flows/
/Users/sdas/STS/sts-testing/IOS app/shared/login.yaml
```
