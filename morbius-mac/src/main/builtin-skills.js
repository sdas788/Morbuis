// E-013: built-in skills surfaced in the slash palette and runnable as agent loops.
module.exports = [
  {
    slash: '/smoke',
    desc: 'Run smoke suite across booted devices · classify · file P0 bugs',
    tools: ['listDevices', 'readTestCase', 'runMaestroFlow', 'classify', 'fileBug', 'publishToPMAgent'],
    cost: '~$0.40',
    body: 'Run all @smoke-tagged flows on every booted device. Classify failures, file P0 bugs, post summary.',
  },
  {
    slash: '/repro',
    desc: 'Reproduce a Jira ticket; capture screenshots + minimal failing flow',
    tools: ['readPMAgentSpec', 'runMaestroFlow', 'uploadScreenshot'],
    cost: '~$0.25',
    body: 'Reproduce a specific ticket. Capture evidence. Distill the minimal failing flow.',
  },
  {
    slash: '/heal',
    desc: 'Self-heal a flaky Maestro flow against current build',
    tools: ['runMaestroFlow', 'readFile', 'editFile', 'commitToGithub', 'runShellCommand'],
    cost: '~$0.60',
    body: 'Patch a flaky flow so it stabilizes against the current build. Verify three times before committing.',
  },
  {
    slash: '/explore',
    desc: 'Free-form exploratory testing for one screen',
    tools: ['runMaestroFlow', 'captureScreenshot'],
    cost: '~$0.35',
    body: 'Explore a screen. Tap interesting affordances, screenshot anomalies.',
  },
  {
    slash: '/coverage-gap',
    desc: 'Find untested user paths from PMAgent spec',
    tools: ['readPMAgentSpec', 'readTestCase'],
    cost: '~$0.18',
    body: 'Diff the PMAgent spec against existing test cases; propose new cases for gaps.',
  },
];
