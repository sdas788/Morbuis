---
bugId: BUG-001
generatedAt: '2026-04-28T20:26:35.335Z'
bugStatus: open
riskScore: 0.72
generatedBy: claude
modelDurationMs: 9206
---
## Related Tests (Rerun)

| Test ID | Rationale |
|---------|-----------|
| TC-2.01 | Directly linked failing flow — confirm fix resolves the 'Welcome' element timeout on iPhone. |
| TC-2.02 | Shares login screen entry point; navigation detour may be affected by same element timing regression. |
| TC-2.05 | Invalid password path exercises same login submission handler — verify error state still resolves correctly post-fix. |

## Related Tests (Manual Verify After Fix)

| Test ID | Rationale |
|---------|-----------|
| TC-2.04 | Offline behavior depends on network interception; automated rerun may mask real device network state differences on iPhone. |
| TC-2.06 | Required field validation UI may have subtle layout regressions on iPhone that automated assertion won't catch without visual inspection. |

## Repro Narrative

1. Launch app on physical iPhone (not simulator) — confirm build matches the fixed version.
2. Navigate to Login screen and enter a valid registered email and password.
3. Tap 'Log In' and observe the post-submission screen.
4. Confirm 'Welcome' element (or Dashboard/Hub Home) appears within 5 seconds.
5. If 'Welcome' element is missing or timeout fires, capture full Maestro output log and screenshot.
6. Repeat steps 2–5 three times to rule out intermittent timing issues.
