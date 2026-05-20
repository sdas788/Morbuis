---
bugId: MA-492
generatedAt: '2026-05-04T20:40:48.050Z'
bugStatus: open
riskScore: 0.35
generatedBy: claude
modelDurationMs: 14982
---
## Related Tests (Rerun)

_None._

## Related Tests (Manual Verify After Fix)

_None._

## Repro Narrative

1. Log in with a valid account.
2. Navigate to account settings or change password screen.
3. Enter the current password in the 'Current Password' field.
4. Enter the same current password in both 'New Password' and 'Confirm New Password' fields.
5. Submit the form.
6. Observe: system accepts the change without error — expected: validation error blocking same-password submission.
