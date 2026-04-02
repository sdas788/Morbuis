---
name: morbius-write-flows
description: Write Maestro YAML test flows for mobile apps. Explores the app first, writes flows based on real screens, tests live on emulator. Use when someone says "write tests", "create flows", "automate test cases", or "write YAML".
user_invocable: true
---

# Write Maestro YAML Flows

You write Maestro YAML test flows by **exploring the real app first**, then writing flows based on what you actually see — not from Excel sheets or documentation alone.

## Before You Start
1. Run the `morbius-preflight` skill to verify Maestro, MCP, and devices are ready
2. If pre-flight fails, resolve issues before proceeding

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

### The 14-flow structure (Micro-Air example)

```
SETUP FLOWS (verify core auth works):
  01_login              → Email/password → Hub Home
  02_create_account     → Form → MFA screen (stops at OTP boundary)

VERIFY FLOWS (check all screens load correctly):
  03_hub_dashboard      → Hub cards, sensor cards, filters, nav tabs
  05_sensor_actions     → Sensor detail, rename with save, menu options
  11_support            → 4 help links visible

ACTION FLOWS (test real mutations):
  04_hub_actions        → Hub ⋮ menu → Rename+Save → Alert Settings
  05_add_hub_and_sensor → Full E2E: pair → WiFi → firmware → customize → add sensor
  06_notifications      → Alerts list, DND toggle, sensor threshold drill-in
  07_account            → Edit profile+Save, Logout to Welcome

OTP FLOWS (blocked until Gmail OAuth bootstrap):
  08_forgot_password    → Send code → (OTP placeholder) → new password
  09_change_password    → Account → Send code → (OTP placeholder)

PAYMENT FLOW (sandbox):
  10_subscription       → Upgrade → test card → subscription confirmation

DESTRUCTIVE FLOWS (isolated DESTROY_EMAIL, run LAST):
  12_delete_sensor      → Sensor ⋮ → Remove → confirm
  13_delete_hub         → Hub ⋮ → Remove → confirm
  14_delete_account     → Account → Delete → confirm → back to Welcome
```

### Run order matters
```
SETUP → VERIFY → ACTION → OTP → PAYMENT → DESTROY
```
Destructive flows run last because they delete test data. You can't rename a hub after you've deleted it.

---

## Phase 1: Explore the App

Before writing a single YAML line, systematically explore every screen:

### 1. Launch the app
```bash
adb shell am force-stop <APP_ID>
adb shell am start -n <APP_ID>/.MainActivity
```

Note: Maestro `launchApp` works for most apps. For React Native apps where it fails, use adb. Always test `launchApp` first — if it works, use it (it's cleaner). The YAML files should include `launchApp: clearState: true` at the top.

### 2. Screenshot every screen
Use `mcp__maestro__take_screenshot` at each screen.

### 3. Inspect the view hierarchy
Use `mcp__maestro__inspect_view_hierarchy` to discover element IDs, text content, clickable elements.

### 4. Map the navigation
Document what you find — tabs, menus, sub-screens, modals.

### 5. Test taps interactively
Use `mcp__maestro__tap_on` and `mcp__maestro__run_flow` one step at a time. Screenshot after each tap.

---

## Phase 2: Write the Flow

### YAML Template
```yaml
appId: <APP_ID>
name: "<NN> <Feature> — Happy Path"
tags:
  - android
  - <feature>
  - happy-path
  - flow
env:
  TEST_EMAIL: ${TEST_EMAIL}
  TEST_PASSWORD: ${TEST_PASSWORD}
---
# -----------------------------------------------
# <Feature> — <What it covers>
# QA Plan ID: <X.XX>
# Covers: <TC-X.XX, TC-Y.YY>
# -----------------------------------------------

- launchApp:
    clearState: true

# Or use shared login helper:
- runFlow:
    file: "../shared/login.yaml"

# Feature-specific steps
- tapOn: "Element Text"
- assertVisible: "Expected Text"
```

### Write and test incrementally
Write 3-5 steps → run → screenshot → fix → repeat. Never write a full flow blind.

---

## Selector Rules (BATTLE-TESTED)

### What works
| Selector | Example | When to use |
|----------|---------|-------------|
| Text match | `tapOn: "Sign In"` | Always try first |
| Regex OR | `tapOn: "Save\|Apply\|Done"` | Text varies between builds |
| Resource ID | `tapOn: id: "phosphor-react-native-plus-undefined"` | Icons without text |
| Below/above | `tapOn: { text: "Password*", below: { text: "Phone*" } }` | Duplicate labels |
| Wait | `extendedWaitUntil: { visible: "text", timeout: 15000 }` | Screen transitions |

### What breaks
| Selector | Why |
|----------|-----|
| `point: "340,720"` | Different screen sizes |
| `index: 3` | List order changes |
| `sleep: 5000` | Use `waitForAnimationToEnd` |

### Clearing React Native text fields
Maestro `eraseText` doesn't work on some React Native EditText fields. Workaround:
```yaml
# Focus the field first
- tapOn:
    text: "Field Label.*"
# Clear via adb keyevents
- runScript:
    script: |
      const { execSync } = require('child_process');
      execSync('adb shell input keyevent KEYCODE_MOVE_END');
      for (let i = 0; i < 30; i++) {
        execSync('adb shell input keyevent KEYCODE_DEL');
      }
# Then type new value
- inputText: "new value"
```

### React Native element IDs (Phosphor icons)
```
phosphor-react-native-plus-undefined         → "+" add button
phosphor-react-native-user-(regular|fill)    → Account tab
phosphor-react-native-bell-(regular|fill)    → Notifications tab
phosphor-react-native-house-(regular|fill)   → Home tab
phosphor-react-native-headset-(regular|fill) → Support tab
phosphor-react-native-pencil-simple-undefined → Edit pencil icon
phosphor-react-native-dots-three-vertical-undefined → Hub ⋮ menu
phosphor-react-native-dots-three-vertical-bold      → Sensor ⋮ menu
phosphor-react-native-gear-six-light         → Settings gear
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
