---
id: TC-1.10
title: Biometrics - First Login - Happy Path
category: 2-biometrics
scenario: Happy Path
status: not-run
priority: P2
platforms:
  - android
  - ios
tags:
  - happy-path
created: '2026-03-26'
updated: '2026-03-26'
---
## Steps
Biometrics - First Login

## Expected Result
- On successful login with username/email and password, user can view a biometrics set up screen. 
- If biometrics are enabled on the user's device, user can confirm they want to enable biometrics in the application. 
- User can enable biometrics from the native permissions model. Their credentials will be saved for subsequent logins. 
- After successfully setting up biometrics, user is directed to the dashboard. 
- Ensure after user turns on biometrics, the biometrics toggle is set to ON in settings.

