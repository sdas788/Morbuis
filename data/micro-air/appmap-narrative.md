---
projectId: micro-air
generatedAt: '2026-05-01T22:03:46.104Z'
flowsCovered: 15
testCasesTotal: 159
coveragePct: 9.4
timeOnTask:
  generationMs: 173788
  runMs: 0
  totalMs: 173788
generatedBy: claude
modelDurationMs: 102084
---
## Why these flows

- **Critical-path gate:** `01_login.yaml` and `02_create_account.yaml` cover the two entry points every user touches before anything else; the login category alone has 6 test cases and any regression here breaks all downstream flows in the suite.
- **Longest uninterrupted happy path:** `05_add_hub_and_sensor.yaml` at 57 steps is the single most complex user journey — Scanning → WiFi Setup → Firmware Update → Customize — and maps directly to the setup-connect-hub and setup-connect-sensor-to-hub categories, which together hold 21 test cases.
- **Notifications domain is unusually volatile:** `06_notifications.yaml` carries 2 selector warnings and touches the DND toggle plus alert-settings navigation; three notification categories (view-alerts, enable/disable, silence) collectively hold 22 test cases — the largest domain in the catalog — making regression coverage here non-negotiable.
- **Destructive operations need controlled execution order:** `12_delete_sensor.yaml`, `13_delete_hub.yaml`, and `14_delete_account.yaml` are the only flows that cause non-reversible backend state changes; sequencing them explicitly (sensor → hub → account, with `14` pinned RUN LAST) prevents test pollution that would invalidate every earlier flow.
- **Subscription flow de-risks payments in sandbox:** `10_subscription.yaml` is tagged `sandbox` and exercises the upgrade path with a test card, covering 11 subscriptions/payments test cases that cannot be validated manually without risk of real charges.
- **OTP flows validate screen structure even without live OTP injection:** `08_forgot_password.yaml` and `09_change_password.yaml` are tagged `otp-required`; automating through the OTP entry point confirms the screen transition and field rendering are intact even before an OTP intercept or stub is wired into CI.

## What the agent learned

- **Selector fragility clusters on dynamic-content screens:** Flows `06_notifications.yaml` (2 warnings), `10_subscription.yaml` (2 warnings), and `11_support.yaml` (2 warnings) all hit screens with dynamic or web-view-rendered content — a clear signal that those screens need `waitForAnimationToEnd` guards or text-based fallback selectors before they can run reliably in CI.
- **`otp-required` is a hard automation ceiling, not a gap to fill later:** Two flows (`08_forgot_password`, `09_change_password`) are explicitly tagged `otp-required`, meaning they assert screen structure and field presence but cannot verify a successful credential change until a test-account OTP intercept is introduced; treating them as structural flows is an intentional, documented scope decision.
- **`RUN LAST` on `14_delete_account` is a first-class ordering constraint:** The tag isn't advisory — running account deletion out of sequence destroys the test account and invalidates every flow that follows it in the same suite run, making suite ordering as important as the flows themselves.
- **Warning-free flows align with stable accessibility IDs:** All nine flows with 0 warnings (`01_login`, `02_create_account`, `03_hub_dashboard`, `04_hub_actions`, `05_add_hub_and_sensor`, `05_sensor_actions`, `08_forgot_password`, `12_delete_sensor`, `13_delete_hub`) cluster around Login, Hub, and Sensor screens — suggesting those screens already use consistent accessibility identifiers that survive app refactors.
- **`05_add_hub_and_sensor` is the de-facto integration test:** At 57 steps spanning pairing, WiFi handoff, firmware update, and sensor add, it exercises more system components in one run than any other flow; keeping it green is the highest-value regression signal in the entire suite.

## Per-Flow Detail

| Flow | Why Picked | Last Runs Summary | Agent Time (ms) |
|------|------------|-------------------|-----------------|
| 01_login | Login is the mandatory prerequisite for every other flow in the suite; automating it with 0 warnings and 19 focused steps gives CI a fast, reliable gate that covers TC-2.01, TC-22.01, and TC-12.01 across the login and multi-device-login categories. | No runs yet | 6806 |
| 02_create_account | Account creation drives the MFA and onboarding screens that every new user hits; at 29 steps it covers the full create-my-account category (6 test cases) and validates the Welcome → Create → MFA → Onboarding → Home navigation path end-to-end. | No runs yet | 6806 |
| 03_hub_dashboard | The Hub Home Dashboard is the root of the app's entire navigation tree; this 13-step element-verification flow confirms that all four tabs (Notifications, Support, Account) and the hub card with its overflow menu render correctly before any deeper flow depends on them. | No runs yet | 6806 |
| 04_hub_actions | Hub rename and alert settings are two of the five tracked hub-management categories; automating the full HUB_MENU → rename → save → alert-settings path in one 43-step flow catches regressions across those branches without requiring separate flows for each action. | No runs yet | 6806 |
| 05_add_hub_and_sensor | This is the longest and most system-spanning flow in the suite at 57 steps, exercising hub pairing, WiFi selection, firmware update, hub customization, and sensor add in a single unbroken sequence; it directly covers the setup-connect-hub-initial and setup-connect-sensor-to-hub categories, which together carry 21 test cases. | No runs yet | 6806 |
| 05_sensor_actions | Sensor detail, rename, and menu interactions form a parallel navigation surface to hub actions; covering TC-10.02 in a dedicated 36-step flow ensures the SENSOR_MENU branch (Rename, Alerts, Remove) is exercised independently of the full setup onboarding flow. | No runs yet | 6806 |
| 06_notifications | Alerts and DND toggling are central to ConnectRV's core value for RV owners who rely on temperature and humidity notifications; two selector warnings flag dynamic content in the alerts list that must be resolved before this flow can run reliably in CI, making it the highest-priority selector fix in the backlog. | No runs yet | 6806 |
| 07_account | Profile editing and logout cover the manage-my-account/profile category (8 test cases) and verify the ACCOUNT → EDIT_PROFILE → save round-trip works; the single warning likely originates from a dynamically rendered field in the edit form and should be isolated before CI runs. | No runs yet | 6806 |
| 08_forgot_password | Forgot password is the primary self-service recovery path for locked-out users; tagging it `otp-required` documents the automation ceiling clearly while still validating the Welcome → Forgot Password screen transition, OTP entry field rendering, and navigation correctness across TC-3.01 and TC-13.01. | No runs yet | 6806 |
| 09_change_password | Change password from within the Account tab follows a distinct code path from forgot-password and carries its own OTP step (CHANGE_PW screen); the single warning combined with the `otp-required` tag means the flow validates screen structure but stops short of asserting a successful credential swap until OTP stubbing is available. | No runs yet | 6806 |
| 10_subscription | The subscription upgrade path touches the payments stack, which carries 11 test cases and real financial risk if manually tested against production; the `sandbox` tag ensures the test card path is exercised safely, and the 2 warnings flag that the in-app purchase modal uses dynamic text requiring text-based selectors. | No runs yet | 6806 |
| 11_support | Support link verification is low-complexity at 10 steps but catches broken deep-links to the external Knowledge Bank and Contact Us URLs that would silently fail for users; 2 warnings indicate the web-view content rendered inside the app is not stably identified by accessibility ID. | No runs yet | 6806 |
| 12_delete_sensor | Sensor deletion is an irreversible backend operation that must be sequenced before hub deletion; automating it in a dedicated 20-step destructive flow with 0 warnings ensures the DELETE_SENSOR confirmation dialog and post-delete state are regression-tested in a controlled, repeatable way. | No runs yet | 6806 |
| 13_delete_hub | Hub deletion triggers a different confirmation flow than sensor deletion and cascades to remove all associated sensors from the account; covering the hub-mgmt-remove-hub category in a clean 17-step flow with 0 warnings makes it a reliable regression gate that runs after sensor deletion but before account deletion. | No runs yet | 6806 |
| 14_delete_account | Account deletion is the most destructive action in the app and is explicitly constrained to run last in every suite execution via its RUN LAST tag; the single warning reflects that the DELETE_ACCT confirmation screen has at least one dynamically rendered element that needs a resilient selector before this flow is fully CI-stable. | No runs yet | 6806 |

