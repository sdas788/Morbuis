---
bugId: MA-493
generatedAt: '2026-05-04T20:40:49.900Z'
bugStatus: open
riskScore: 0.35
generatedBy: claude
modelDurationMs: 12107
---
## Related Tests (Rerun)

_None._

## Related Tests (Manual Verify After Fix)

_None._

## Repro Narrative

1. Install a fresh build of the app on an Android device.
2. Complete the initial onboarding/welcome flow and reach the dashboard.
3. Force-close the app via the recents screen or device settings.
4. Relaunch the app from the home screen icon.
5. Observe the landing screen — confirm whether the welcome/onboarding screen appears instead of the dashboard.
6. Repeat steps 3–5 at least three times to confirm the issue is reproducible on every cold launch.
