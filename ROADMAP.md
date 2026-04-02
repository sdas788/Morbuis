# Morbius Roadmap — From Local Tool to SaaS QA Platform

## Where We Are Today (MVP Complete)

Morbius is a local-first QA workspace that sits on top of Maestro + Claude Code. It runs on your machine, reads from files, and gives your team a browser dashboard to track test automation.

**What works today:**
- Visual Kanban board for test cases, bugs, devices, runs
- 14 Maestro YAML flows for Micro-Air (tested, passing on Android emulator)
- Multi-project support (Micro-Air, STS, Shorr)
- Jira bug sync
- App Map with Mermaid navigation charts
- Chat drawer connected to Claude Code locally
- Excel import/export
- Changelog tracking on every change
- Pre-flight checks, run tests from dashboard, sort/filter everything
- 9 Claude Code skills for the Morbius agent

**What's local-only:**
- Runs on localhost:3000
- Data stored as markdown files
- Claude Code runs on the developer's machine
- No auth, no multi-user, no cloud

---

## The Vision

**One-stop QA automation platform.** You sign up, connect your app, and Morbius handles everything — test planning, flow creation, execution across real devices, bug tracking, and reporting. Pay us, and QA automation becomes as simple as clicking a button.

---

## Phase 3: Device Cloud + One-Click Runs

**Goal:** Run tests on real devices in the cloud, not just local emulators.

### BrowserStack Integration
- Connect BrowserStack account via API key (Settings page)
- Select devices from BrowserStack device catalog (iPhone 15, Pixel 8, Galaxy S24, etc.)
- Run Maestro flows on BrowserStack devices with one click from the dashboard
- Pull test results, screenshots, and video recordings back into Morbius
- Device matrix auto-populates from BrowserStack runs (no manual tracking)

### Real Device Cloud (RPM)
- Integration with device farm providers
- Parallel test execution across multiple devices
- Schedule nightly regression runs
- Auto-generate device coverage reports

### One-Click Test Execution
- "Run All" button on the dashboard — triggers every flow on selected devices
- Progress bar showing real-time execution status
- Pass/fail results stream in as they complete
- Auto-create bug tickets for failures with screenshots from real devices

### What This Unlocks
- No more "works on my emulator but fails on real devices"
- QA team runs tests without needing Android Studio or Xcode installed
- Device coverage goes from 1-2 local simulators to 20+ real devices

---

## Phase 4: Settings Page + Integrations Hub

**Goal:** A proper settings page where teams configure all their integrations.

### Settings Page Sections

**Account & Team**
- User profile, team members, roles
- API keys management
- Billing (when SaaS)

**Device Connections**
- Android emulator status (connected/not)
- iOS simulator status (connected/not)
- BrowserStack API key + device selection
- Real device farm connections
- Live health indicators (green/red dot for each)

**Test Framework**
- Maestro CLI version + connection status
- Appium server connection (Phase 5)
- Custom framework adapters

**Project Management**
- Jira integration (already exists — move to settings)
- Linear integration (new)
- GitHub/GitLab integration for PR-triggered test runs
- Slack notifications for test results

**AI & Automation**
- Claude Code / Claude API connection
- Tambo.ai configuration for the chat UI
- Auto-bug-creation rules
- Flakiness detection thresholds

**Notifications**
- Slack channel for test results
- Email notifications for failures
- Webhook URLs for custom integrations

---

## Phase 5: Multi-Framework Support

**Goal:** Not just Maestro. Support Appium, Detox, and custom frameworks.

### Appium Integration
- Import existing Appium test suites
- Run Appium tests from the dashboard alongside Maestro flows
- Unified results view (Maestro + Appium results in the same board)
- Convert between formats (Maestro YAML ↔ Appium scripts)

### Framework Adapters
- Plugin architecture: each framework is an adapter
- Maestro adapter (current, built-in)
- Appium adapter (Phase 5)
- Detox adapter (React Native specific)
- XCTest / Espresso adapters (native iOS/Android)
- Custom adapter API for teams with proprietary frameworks

### What This Unlocks
- Teams aren't locked into one framework
- Legacy Appium suites work alongside new Maestro flows
- Gradual migration path from Appium → Maestro

---

## Phase 6: Claude Code Deep Integration

**Goal:** Claude Code isn't just a chat sidebar — it's the engine that writes and runs tests.

### Claude API Integration (replace local CLI)
- Users connect their Anthropic API key in Settings
- Morbius calls Claude directly (no local Claude Code needed)
- Anyone on the team can use the agent, not just developers with CLI installed
- Usage tracking and cost management per team

### Agent-Driven Test Creation
- Point Morbius at an app → agent explores every screen automatically
- Agent generates the App Map (Mermaid chart)
- Agent writes all Maestro flows based on the exploration
- Agent runs the flows and creates bugs for failures
- Human reviews and approves — then it's done

### Tambo.ai Chat as Command Center
- Chat UI controls the entire dashboard
- "Run login test on iPhone 15" → Tambo renders RunStatus component with live progress
- "Show me failing tests" → Tambo renders test cards with fail status
- "Create a flow for the settings screen" → agent writes YAML, Tambo shows it inline
- "Compare results between Pixel 8 and iPhone 15" → Tambo renders device comparison chart

### Self-Healing Tests
- When a flow fails, Claude analyzes the failure
- If it's a selector change (button text changed), Claude auto-fixes the YAML
- If it's a real bug, Claude creates a detailed bug report
- Reduces test maintenance from hours to minutes

---

## Phase 7: SaaS Platform

**Goal:** Morbius becomes a hosted service anyone can sign up for.

### Architecture Shift
- **Backend:** Node.js API server (extract from current single-file)
- **Database:** PostgreSQL or SQLite (replace markdown files for multi-user)
- **Auth:** OAuth (Google, GitHub) + email/password
- **Frontend:** React app (replace embedded HTML — use Tambo components)
- **Storage:** S3 for screenshots, test artifacts, video recordings
- **Hosting:** Vercel/Railway for the web app, separate worker for test execution

### Multi-Tenant
- Organizations with teams
- Role-based access (Admin, QA Lead, Tester, Viewer)
- Per-project permissions
- Audit log (who changed what, when)

### Pricing Model
- **Free tier:** 1 project, 50 test runs/month, local execution only
- **Pro tier:** Unlimited projects, 500 runs/month, BrowserStack integration, Jira/Linear
- **Enterprise:** Unlimited everything, Appium support, SSO, dedicated support, SLA

### What Changes from Local to SaaS
| Feature | Local (today) | SaaS (Phase 7) |
|---------|--------------|----------------|
| Data storage | Markdown files | PostgreSQL |
| Auth | None | OAuth + RBAC |
| Test execution | Local emulator | BrowserStack cloud |
| AI agent | Claude Code CLI | Claude API |
| Chat | WebSocket to local CLI | Tambo.ai + Claude API |
| Collaboration | Single user | Teams with permissions |
| Deployment | `npm start` | Hosted URL |

---

## Phase 8: Advanced Features

**Goal:** Features that make Morbius the best QA tool, period.

### Visual Regression Testing
- Screenshot comparison between test runs
- Pixel-diff highlighting
- Baseline management (approve new baselines from the dashboard)

### Performance Testing
- Track app launch time across devices
- Monitor memory usage during test flows
- Alert on performance regressions

### CI/CD Integration
- GitHub Actions workflow that runs Morbius tests on every PR
- Block merge if critical tests fail
- Test results posted as PR comments

### Analytics & Reporting
- Test execution trends over time
- Flakiness scores per test
- Device reliability rankings
- Export PDF reports for stakeholders
- Weekly email digests

### Test Recording
- Record user interactions on a real device
- Auto-generate Maestro YAML from the recording
- No code required — point, click, done

---

## Current Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | MVP Dashboard + Excel Import | ✅ Complete |
| 2 | Agent Intelligence + Sorting + Changelog + Chat | ✅ Complete |
| 2.5 | Maestro Flow Restructure (14 flows) + App Map | ✅ Complete |
| 3 | Device Cloud + One-Click Runs (BrowserStack) | 🔜 Next |
| 4 | Settings Page + Integrations Hub | 📋 Planned |
| 5 | Multi-Framework (Appium + adapters) | 📋 Planned |
| 6 | Claude API Deep Integration + Self-Healing | 📋 Planned |
| 7 | SaaS Platform (auth, database, hosting) | 📋 Planned |
| 8 | Visual Regression + CI/CD + Analytics | 📋 Planned |

---

## Integration Map

```
Current:
  Maestro CLI ←→ Morbius Dashboard ←→ Claude Code (local)
       ↕                  ↕
  Android/iOS         Jira MCP
  Emulator

Phase 3-4:
  Maestro CLI ←→ Morbius Dashboard ←→ Claude Code (local)
       ↕                  ↕                    ↕
  BrowserStack        Jira / Linear      Tambo.ai Chat
  Real Devices        GitHub/Slack

Phase 6-7:
  Maestro + Appium ←→ Morbius SaaS ←→ Claude API
       ↕                    ↕                ↕
  BrowserStack         PostgreSQL      Tambo.ai UI
  Device Farms         Auth/RBAC       Self-Healing
  CI/CD Pipeline       S3 Storage      Test Recording
```

---

## Why This Wins

1. **AI-native from day one.** Every other QA tool bolts on AI as a feature. Morbius was built around Claude Code — the agent writes tests, runs them, fixes them, and creates bugs.

2. **Local-first, cloud-ready.** Teams start with `npm start` on their laptop. When they're ready, flip to hosted SaaS without changing their workflow.

3. **Framework-agnostic.** Start with Maestro, add Appium, use whatever works. The dashboard is the same regardless of which framework runs the tests.

4. **Chat-first interface via Tambo.** Non-technical team members control QA through conversation. "Run the regression suite on iPhone 15" is all they need to type.

5. **One-stop shop.** Test planning (Excel import), test creation (AI agent), test execution (BrowserStack), bug tracking (Jira sync), reporting (dashboard) — all in one tool. No more stitching together 5 different services.
