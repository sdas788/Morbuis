---
bugId: BUG-002
generatedAt: '2026-05-05T18:28:08.553Z'
bugStatus: open
riskScore: 0.45
generatedBy: claude
modelDurationMs: 15620
---
## Related Tests (Rerun)

| Test ID | Rationale |
|---------|-----------|
| TC-17.01 | Directly linked to the bug; confirm fix resolves truncation on Android with long hub names. |
| TC-17.02 | Verifies renamed hub is reflected everywhere — truncated name could propagate to other screens. |
| TC-17.05 | Invalid name validation may share the same input/display component; ensure length edge cases still reject correctly. |

## Related Tests (Manual Verify After Fix)

| Test ID | Rationale |
|---------|-----------|
| TC-17.03 | Cancel/dismiss flow needs a human to confirm overlay state is clean after a long-name entry is abandoned — automation may miss visual residue. |
| TC-17.04 | Offline save failure with a long name requires observing the error state and rollback display, which is hard to assert reliably in automation. |

## Repro Narrative

1. Launch app on Android device; ensure at least one hub is visible on Dashboard/Hub Home.
2. Tap the kabob menu (⋮) on any hub and select Rename Hub.
3. In the Configure Hub overlay, clear the Friendly Name field.
4. Enter a long string (≥ 30 characters, e.g. 'My Very Long Hub Name Test 1234').
5. Submit/save the new name.
6. Return to Dashboard/Hub Home.
7. Observe the hub tile — confirm whether the full name is displayed or truncated.
8. Note the exact truncation point and device/OS version for the bug report.
