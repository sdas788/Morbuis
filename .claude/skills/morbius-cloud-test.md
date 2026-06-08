---
name: morbius-cloud-test
description: Run Maestro flows on Maestro Cloud (real/ephemeral cloud devices) and debug cloud-only failures. Use when someone says "run on cloud", "push to Maestro Cloud", "cloud smoke test", or a flow passes locally but must be verified on cloud. Covers the build→zip→upload→poll workflow and the cloud-vs-local gotchas (hardware keyboard, no cached session, resolution drift, SFSafari login).
user_invocable: true
---

# Run Maestro Flows on Maestro Cloud

Cloud runs execute on **fresh, ephemeral cloud devices** at resolutions/OS that differ from your
local sim. Things that "work on my simulator" often break on cloud for predictable reasons — this
skill captures them so you don't rediscover each one.

## RULE: smoke-test one flow before pushing the suite
A cloud run costs minutes. If login (or any shared prerequisite) is unproven on cloud, push **one**
flow first and read the result. Don't push 8 flows that will all fail the same way.

---

## Workflow (iOS)

### 1. Build a CLOUD-RUNNABLE app (NOT the `yarn ios` debug build)
A debug build loads JS from Metro (localhost) — it crashes on a cloud device (no Metro). You need a
**Release** build with the JS bundle embedded:
```bash
cd /Users/sdas/sts-mobile/ios
# pods must be in sync first (UTF-8 locale avoids a CocoaPods/Ruby crash):
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
export RCT_NEW_ARCH_ENABLED=0 LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
xcodebuild build -workspace stsCalculator.xcworkspace -scheme stsCalculator-staging \
  -configuration Release -sdk iphonesimulator -arch arm64 -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO
# verify the bundle is embedded:
ls build/Build/Products/Release-iphonesimulator/stsCalculator-staging.app/main.jsbundle
```

### 2. Zip the `.app` (cloud iOS runs on simulators; upload a zipped `.app`)
```bash
cd build/Build/Products/Release-iphonesimulator
ditto -c -k --sequesterRsrc --keepParent stsCalculator-staging.app /tmp/stsCalculator-staging.zip
```

### 3. Auth
`maestro login` (interactive) or `MAESTRO_CLOUD_API_KEY` (CI). Never echo the key.

### 4. Pick a device — use exact case from the API
```
mcp__maestro__list_cloud_devices
```
STS validated on `device_model: iPhone-17-Pro`, `device_os: iOS-26-2` (matches the local sim).

### 5. Submit + poll
```
mcp__maestro__run_on_cloud
  app_file: /tmp/stsCalculator-staging.zip
  flows: /Users/sdas/STS/sts-testing/ios-test/flows/01_login.yaml
  device_model: iPhone-17-Pro
  device_os: iOS-26-2
  project_id: proj_01ksnhh4rmezwr7rkx3qef7x7c   # STS-Calculator (account has multiple projects)
  env: { STS_USERNAME: cthomas, STS_PASSWORD: Test1234! }
```
Then poll every ~60–90s until terminal (SUCCESS / ERROR / CANCELED / WARNING):
```
mcp__maestro__get_cloud_run_status
  upload_id: <from submit>   project_id: <from submit>   include_flow_results: true
```
`was_app_launched: true` confirms the embedded-bundle build launched standalone (step 1 worked).

---

## Cloud ≠ Local: the gotchas that cause cloud-only failures

| Symptom on cloud | Cause | Fix |
|------------------|-------|-----|
| App crashes immediately, `was_app_launched:false` | Debug build, no embedded JS bundle | Build **Release** (step 1) |
| `point:`/percentage taps miss | Cloud device has a different resolution; the form lands at a different offset | Use **testID + `scrollUntilVisible`** only — no coordinates. (This is why the STS flows were reworked to testID-only.) |
| `tapOn: "Next"` / `id: Go` (keyboard accessory) not found | Cloud devices have a **hardware keyboard** attached → the on-screen keyboard + its accessory bar never render | Submit with `pressKey: Enter`; never tap on-screen keyboard buttons |
| Login form always appears (no skip) | Cloud device is **ephemeral** — no cached web session | Login must run fully every time; can't rely on a warm session |
| Flow passes locally, times out on cloud reaching a far field | Cloud scrolling/rendering slightly slower | Bump `scrollUntilVisible timeout` (20000–30000) + `speed: 60` for long sections |

---

## The STS login on cloud (SFSafariViewController) — KNOWN HARD PART

The sts.org login opens in an **in-app Safari (SFSafariViewController)** — the view titled
"sts.org" with X / share / back chrome. This is NOT an embedded WKWebView: it runs out-of-process
(SafariViewService), so **its DOM is not exposed to Maestro/XCUITest**. Consequences:
- The "tap webview inputs by HTML element id" technique (works for in-app WKWebView forms like
  Micro-Air) **does NOT apply here** — there are no DOM resource-ids to target.
- A text-matcher tap on the "Username"/"Password" a11y label does NOT reliably focus the input.
- Focusing the input historically needed a **coordinate tap**, which drifts across devices →
  the cloud-only failure.

**CONFIRMED (2026-06 smoke test):** `01_login` on `iPhone-17-Pro / iOS-26-2`, fresh session, with
the embedded-bundle Release build → `was_app_launched: true`, then **ERROR** after 160s at the gate
`"I Decline|ACSD Operative Risk Calculator" is visible`. I.e. the app launched fine and the login
block executed, but login never completed — the `point:"46%,42%"` Username focus misses on the
cloud device (form lands at a different offset than the local sim), so credentials never landed and
neither TOS nor Home appeared. The calculator flows are cloud-safe; **login is the sole blocker.**

**DEFINITIVE ROOT CAUSE (researched + reproduced live, 2026-06):**
- `tapOn` on the SFSafari field's accessibility element (`"Username"`, `"Password"`) does **NOT
  focus the input** — no keyboard appears, `inputText` goes nowhere. Verified repeatedly live.
- Only a **raw `point` tap** focuses the field. But the form fields are ~5% of screen height apart
  (Username ~42% · Password ~47% · Remember Me ~52% on iPhone-17-Pro), so any drift taps the wrong
  one (commonly checks "Remember Me", leaves Password empty → "username or password incorrect").
- `scrollUntilVisible centerElement` can't normalize it (the page is too short to recenter).
- This is a **known, documented platform limitation**, not a flow-quality problem:
  Apple Developer Forums (UI tests can't reliably drive SFSafariViewController /
  ASWebAuthenticationSession; tapping pops a text-action menu that corrupts input) and Maestro's
  own known-issues (WebView content isn't fully exposed to the OS accessibility APIs Maestro uses).
  Refs: developer.apple.com/forums/thread/127132 ; docs.maestro.dev known issues ;
  github.com/mobile-dev-inc/maestro/issues/1083 and /1225 (flaky iOS webview input).

**INDUSTRY-STANDARD SOLUTION (what teams actually do):** do NOT automate a third-party
SFSafariViewController / OAuth login. Add a **test-build login path** the automation can drive:
  1. A deep link or launch arg that injects a valid session/token in dev builds, OR
  2. A test-mode auto-login, OR
  3. Host the login in an in-app **WKWebView** (DOM-accessible → testID/HTML-id automatable) instead
     of SFSafariViewController.
Then login is one reliable step and the testID calculator flows run unattended on cloud. Until then,
login on cloud is either a calibrated point tap (fragile, device/layout-specific) or a manual/seeded
prerequisite for attended runs.

**Decision tree for cloud login (consult before changing the flow):**
1. Does a coordinate-free focus work? Re-check `inspect_screen` on the login form for any tappable
   element with a stable `id`/`a11y` that actually takes focus. If yes → use it.
2. If only coordinates focus the field: calibrate the point against a **cloud screenshot** for the
   chosen cloud device/OS (it differs from local) — accept it as device-specific, documented.
3. Or treat login as a seeded prerequisite where the harness allows it.
4. Last resort / proper fix: ask whether the app can present login in an **embedded WKWebView**
   instead of SFSafariViewController (app change) — that would expose the DOM and make login
   fully testID-automatable on cloud.

> Record the actual cloud failure (screenshot + error from `get_cloud_run_status`) in the bug/board
> before picking a path. Don't guess — read the cheat sheet (`mcp__maestro__cheat_sheet`) and inspect.

---

## Calculator flows on cloud
The 8 STS calculator flows are **testID-only** (no `point:`), so they are resolution-independent and
cloud-safe by construction. Each starts with `- runFlow: 01_login.yaml` — so their cloud success is
gated on login working on cloud. Once login is solved on cloud, push the suite (a folder run with
`include_tags: [calculator]`), polling as above.
