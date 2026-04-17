---
name: morbius-sts-ios
description: Battle-tested patterns for writing and fixing Maestro YAML flows for the STS iOS calculator app. Use this BEFORE writing any new STS iOS flow or debugging a failing one. Contains proven patterns for async tab restoration, dev toast interference, singleSelectMultiAttribute testID format, and the full new-flow process.
user_invocable: true
---

# STS iOS Calculator — Battle-Tested Flow Patterns

Everything in this document was learned from real failures and fixes during live test automation. Read this **before** writing any new STS iOS flow.

---

## Project Reference

| Item | Value |
|------|-------|
| App ID (dev build) | `com.sts.calculator.dev` |
| iOS Simulator device ID | `5B14D7C9-1F4F-480D-82CE-86687CB67749` |
| Calculator config | `/Users/sdas/sts-mobile/scripts/calculatorConfig.json` |
| App source | `/Users/sdas/sts-mobile/src/features/app/CalculatorScreen/` |
| App branch (automation fixes) | `automation-testing` in `/Users/sdas/sts-mobile` |
| Flow files | `/Users/sdas/STS/sts-testing/IOS app/flows/` |
| Markdown docs | `/Users/sdas/STS/sts-testing/IOS app/flows/*.md` |
| Patient Summary tap | `point: "201,178"` (iPhone 17 Pro 402×874pt logical screen) |

---

## Step 0: Before Writing Any Flow — Read the Config

Every STS calculator is defined in `calculatorConfig.json`. Before writing YAML:

```bash
cat /Users/sdas/sts-mobile/scripts/calculatorConfig.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for calc in data:
    if '<keyword>' in calc.get('id','').lower():
        for section in calc.get('sections', []):
            print('Section:', section.get('id'))
            for field in section.get('fields', []):
                print('  Field:', field.get('id'), '| type:', field.get('type'), '| visibleIf:', field.get('visibleIf','NONE'))
                for opt in field.get('options', [])[:3]:
                    print('    opt:', opt.get('label'), '| value:', opt.get('value'), '| apiKeys:', opt.get('apiKeys'))
"
```

This tells you:
- **Exact section IDs** (used for `tab-{id}` navigation)
- **Exact field IDs** (used in `radio-{fieldId}-{value}` testIDs)
- **Option values** (NOT index-based — a field's "Elective" may be value 1 or value 3 depending on the calculator)
- **visibleIf conditions** (which fields are conditional — skip those or navigate to reveal them)
- **Type**: `singleSelect`, `singleSelectMultiAttribute`, `checkbox`, `checkboxGroup`, `textInput`, `infoText`

---

## Calculator Architecture Types — Read This First

STS has two fundamentally different UI architectures. The wrong approach for each will fail immediately.

### Architecture A: Single-Long-Scroll (SAVR, Multi-Valve, Ascending Aorta)
- ALL sections (Surgery Type, Demographics, Lab Values, Risk Factors) live in **one continuous vertical scroll**.
- Tapping a section tab (e.g. `tab-demographics`) just SCROLLS to that position — it does NOT replace the content area.
- **Do NOT use `tapOn: "Demographics"` or `tapOn: "Laboratory Values"` text taps** — these are unreliable and sometimes missing. Instead, scroll directly to the first field in each section (e.g. `scrollUntilVisible: "Male"` for Demographics, or just `scrollUntilVisible: id: input-creatinine` for Lab Values).
- Risk Factors subsection tabs (pulmonary, vascular, cardiacStatus, coronaryArteryDisease, valveDisease, arrhythmia) ARE real tab buttons, but after tapping `tab-coronaryArteryDisease`, the subsection tab bar **scrolls off-screen ABOVE** — you can no longer tap `tab-valveDisease` or `tab-arrhythmia`. Fix: skip those subsection tab taps and scroll directly to field IDs.
- **Double-tap the first section tab** (async restore fix — see Pattern 1).

### Architecture B: Tab-Replacement (ACSD, Tricuspid)
- Each section tab (Planned Surgery, Demographics, Lab Values, Risk Factors) **replaces the content area entirely**.
- Tapping `tapOn: "Demographics"` or `tapOn: id: tab-demographics` switches to a completely different screen.
- You MUST tap the correct section tab to see those fields — they are NOT in the scroll.
- **Double-tap the first section tab** (async restore fix — see Pattern 1).

### Architecture C: Thoracic (Esophagectomy, Lung Cancer)
- Hybrid: main sections (Planned Surgery, Demographics, Risk Factors) are separate tabs.
- Sub-sections within Risk Factors use named tabs (`tab-pulmonaryFunction`, `tab-cardiovascularDisease`, `tab-vascularDiseaseHistory`, `tab-kidneyFunction`) — completely different IDs from cardiac calculators.
- **Clinical Cancer Staging, Tumor Location, Induction Treatment** are their own section tabs — tap by text.
- **Double-tap the first section tab for Esophagectomy** (async restore fix).
- **Lung Cancer**: async restore jumps to 73%+ scroll — double-tap DOES NOT work because the tab is completely off-screen. Use scroll-UP recovery instead (see Pattern 9).

| Calculator | Architecture | First section tab ID |
|------------|-------------|---------------------|
| ACSD | Tab-Replacement | `tab-acsdSurgery` |
| Mitral | Tab-Replacement | `tab-demographics` (or similar) |
| Tricuspid | Tab-Replacement | `tab-tricuspidSurgery` |
| SAVR | Single-Long-Scroll | `tab-surgicalDetails` |
| Multi-Valve | Single-Long-Scroll | `tab-surgeryType` |
| Ascending Aorta | Single-Long-Scroll | `tab-surgeryType` |
| Esophagectomy | Thoracic Hybrid | `tab-plannedSurgery` |
| Lung Cancer | Thoracic Hybrid | scroll UP recovery (not tab tap) |

---

## Pattern 1: Async Tab Restoration — DOUBLE-TAP ALL SECTION TABS

**The bug**: All STS calculators save the last-visited section tab to AsyncStorage. On relaunch, they restore it asynchronously. This async read completes AFTER the first `tapOn: id: tab-{name}`, overriding it. The `scrollUntilVisible` for the next field then fails because you're on the wrong section.

**The fix**: Tap the section tab TWICE with a 2 s wait in between. The first tap + wait lets the async restore fire. The second tap locks you onto the correct section.

```yaml
# WRONG — single tap, async restore overrides it:
- tapOn:
    id: tab-tricuspidSurgery
- waitForAnimationToEnd:
    timeout: 5000

# CORRECT — double-tap pattern:
- tapOn:
    id: tab-tricuspidSurgery
- waitForAnimationToEnd:
    timeout: 2000
- tapOn:
    id: tab-tricuspidSurgery
- waitForAnimationToEnd:
    timeout: 3000
```

**Apply to**: The FIRST section tab of every calculator (the one that restores). Usually `tab-{calculatorId}` or the surgery/details section tab.

---

## Pattern 2: Dev Toast Band — The Invisible Enemy

**The bug**: In React Native dev builds, two warning toasts stack at y=733-781 and y=786-835. Any UI element that `scrollUntilVisible` places within this band will be:
- Found by `scrollUntilVisible` (at `visibilityPercentage: 50`) ✓
- **BLOCKED by tapOn** — the toast intercepts the tap ✗

**Affected fields**: Any `singleSelect` or `singleSelectMultiAttribute` whose first option (the one you want) happens to land in y=733-835 after scrolling.

Commonly affected in Risk Factors General tab: `illicitDrugUse`, `alcoholUse`, `tobaccoUse`, `atrialFibrillation` (None option).

**Fix option A: The Overshoot Trick** (preferred)
Scroll to the LAST option of the field, which pushes the FIRST option above the toast band, then tap the first option:

```yaml
# alcoholUse has 5 options (1-5). Scroll to last (-5), tap first (-1):
- scrollUntilVisible:
    element:
      id: radio-alcoholUse-5
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-alcoholUse-1

# tobaccoUse last option value = 6. Scroll to -6, tap -1:
- scrollUntilVisible:
    element:
      id: radio-tobaccoUse-6
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-tobaccoUse-1

# illicitDrugUse has 3 options. Scroll to -3, tap -1:
- scrollUntilVisible:
    element:
      id: radio-illicitDrugUse-3
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-illicitDrugUse-1

# atrialFibrillation: scroll to -3 (Recent), tap -1 (None):
- scrollUntilVisible:
    element:
      id: radio-atrialFibrillation-3
    direction: DOWN
    timeout: 15000
- tapOn:
    id: radio-atrialFibrillation-1

# atrialFlutter: ALSO needs overshoot. After tapping atrialFibrillation-1,
# scroll position can reset. Use 30000ms + scroll-to-3-first, same as AF:
- scrollUntilVisible:
    element:
      id: radio-atrialFlutter-3
    direction: DOWN
    timeout: 30000
- tapOn:
    id: radio-atrialFlutter-1
```

**⚠️ Dev Console Overlay Variant** (different from toast band):
In some calculators (e.g. Lung Cancer), a field's first option (e.g. `radio-asaClassification-1`) can land at y=788–840 which is INSIDE the toast band. Tapping inside the toast band triggers a **React key-prop warning** that opens a full-screen dev console overlay — blocking ALL subsequent steps.  
The overshoot trick fixes this too: scroll to the LAST option first, then tap the first. This lifts option-1 to ~y=632, safely above the band.

**Fix option B: Slow scroll with partial visibility** (for singleSelectMultiAttribute)
Use `speed: 20` (prevents overshooting) and `visibilityPercentage: 50` (accepts partial):

```yaml
- scrollUntilVisible:
    element:
      id: "radio-diabetes-No-#,2"
    direction: DOWN
    timeout: 10000
    speed: 20
    visibilityPercentage: 50
- tapOn:
    id: "radio-diabetes-No-#,2"
```

---

## Pattern 3: singleSelectMultiAttribute testID Format

**The bug category**: These fields have compound testIDs that look unusual. Get one character wrong and the element is never found.

**The rule**: `radio-{fieldId}-{label}-{sortedApiValues}`

Where `sortedApiValues` = all apiKey values joined by comma, sorted **lexicographically** (JS default sort). This is NOT numeric sort.

**Lexicographic char order for common values**:
```
'#' = char 35  (LOWEST)
'1' = char 49
'2' = char 50
'3' = char 51
...
'9' = char 57  (highest of digits)
```

**Lookup pattern** for any singleSelectMultiAttribute field:
```python
# From calculatorConfig.json, for an option's apiKeys array:
apiKeys = [{"apiKey": "diabetes", "value": "2"}, {"apiKey": "diabctrl", "value": "#"}]
values = [k["value"] for k in apiKeys]  # ["2", "#"]
values.sort()                            # ["#", "2"]  ← "#" < "2" lex
testID = f'radio-diabetes-No-{",".join(values)}'  # "radio-diabetes-No-#,2"
```

**Common IDs** (confirmed working):
| Field | Option | testID |
|-------|--------|--------|
| `diabetes` | No | `radio-diabetes-No-#,2` |
| `endocarditis` | No | `radio-endocarditis-No-#,2` |
| `cerebrovascularDisease` | No | `radio-cerebrovascularDisease-No-#,#,#,2` |
| `cabg` (multi-valve) | No | `radio-cabg-No-#,9` |
| `smokingHistory` | Never smoked | `radio-smokingHistory-Never smoked-#,1` |

**Always double-quote these IDs in YAML** — the `#` and `,` chars require quoting:
```yaml
- tapOn:
    id: "radio-diabetes-No-#,2"      # CORRECT
- tapOn:
    id: radio-diabetes-No-#,2        # YAML may misparse the #
```

---

## Pattern 4: checkboxGroup testID Format

**The bug**: `checkboxGroup` options have NO `value` property in the config — only `apiKeys`. The original app code produced `chip-aortaDisease-undefined` for every chip (indistinguishable). The app source was fixed to use `apiKeys[0].apiKey` as fallback.

**The rule**: `chip-{fieldId}-{option.apiKeys[0].apiKey}`

**Example — aortaDisease**:
```yaml
- tapOn:
    id: chip-aortaDisease-FamHistAorta    # First option, apiKey = "FamHistAorta"
```

**To find apiKey names**:
```bash
cat /Users/sdas/sts-mobile/scripts/calculatorConfig.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for calc in data:
    if 'aorta' in calc.get('id','').lower():
        for section in calc.get('sections', []):
            for field in section.get('fields', []):
                if field.get('type') == 'checkboxGroup':
                    print('Field:', field.get('id'))
                    for opt in field.get('options', []):
                        print('  opt label:', opt.get('label'), '| apiKeys:', opt.get('apiKeys'))
"
```

---

## Pattern 5: Direct tapOn for Scroll-Top Elements

**The rule**: If `inspect_view_hierarchy` shows an element is already visible at scroll=0%, use `tapOn: id:` directly — NO `scrollUntilVisible` needed. Adding an unnecessary `scrollUntilVisible direction: UP` can cause a rubber-band bounce and leave the view in an unpredictable state.

**How to check**: After tapping the section tab, inspect the hierarchy. Look for `"Vertical scroll bar... value=0%"`. If the element's y-coordinate is within 0-874, it's visible without scrolling.

**Example**: In the Tricuspid `tricuspidSurgery` section:
- `radio-tricuspidSurgery-1` at y=372 → direct tapOn ✓
- `radio-surgicalPriority-1` at y=600 → direct tapOn ✓
- `radio-surgeryIncidence-1` at y=857 → needs `scrollUntilVisible direction: DOWN`

```yaml
# WRONG — unnecessary scroll:
- scrollUntilVisible:
    element:
      id: radio-tricuspidSurgery-1
    direction: UP
    timeout: 8000
- tapOn:
    id: radio-tricuspidSurgery-1

# CORRECT — element is already visible:
- tapOn:
    id: radio-tricuspidSurgery-1
```

---

## Pattern 6: Conditional Dismiss (DdRumErrorTracking Overlay)

The DdRumErrorTracking full-screen overlay was eliminated by app code fixes (see below). But a conditional dismiss is good defensive practice at key navigation points:

```yaml
- tapOn:
    id: tab-riskFactors
- waitForAnimationToEnd:
    timeout: 3000
# Dismiss full-screen error overlay if it appears (DdRum dev mode):
- runFlow:
    when:
      visible: "Dismiss"
    commands:
      - tapOn: "Dismiss"
      - waitForAnimationToEnd:
          timeout: 1000
```

---

## Pattern 7: Skipping Conditional Fields

Some fields are only visible when a preceding field has a specific value. Choosing the right option avoids having to fill the conditional field.

| Conditional field | Triggered by | Avoidance |
|------------------|--------------|-----------|
| `miWhen` (MI timing) | `primarySymptom` = anything except "No Coronary Symptoms" | Use `radio-primarySymptom-1` |
| `smokingHistory` sub-fields | Only for certain smoking history types | Use "Never smoked" (`#,1`) |
| `pciReminder` info text | `surgeryIncidence` = 2,3,4,5 (re-op) | Use `radio-surgeryIncidence-1` (First CV) |

---

## Pattern 8: Post-coronaryArteryDisease Subsection Tabs Go Off-Screen

**The bug**: After tapping `tab-coronaryArteryDisease`, the main scroll jumps to ~73% down the page. This pushes the subsection tab bar **off-screen ABOVE** the viewport. The tabs `tab-valveDisease` and `tab-arrhythmia` are no longer in the iOS accessibility tree (off-screen elements are excluded).

**Symptom**: `scrollUntilVisible: id: tab-valveDisease direction: DOWN timeout: 10000` finds nothing. `tapOn: id: tab-valveDisease` fails immediately.

**Fix**: After filling all Coronary Artery Disease fields, do NOT tap `tab-valveDisease` or `tab-arrhythmia`. Instead, scroll directly to the first field in each subsection by field ID — the content is always rendered in the scroll even when the tab is off-screen.

```yaml
# WRONG — tab has scrolled above viewport:
- tapOn:
    id: tab-valveDisease
- scrollUntilVisible:
    element:
      id: radio-aorticRegurgitation-1
    direction: DOWN
    timeout: 10000

# CORRECT — skip tab tap, scroll directly to field:
# ── Valve Disease (SKIP tab tap — scroll directly) ──
- scrollUntilVisible:
    element:
      id: radio-aorticRegurgitation-1
    direction: DOWN
    timeout: 15000
- tapOn:
    id: radio-aorticRegurgitation-1
```

Use the same direct-scroll approach for all subsequent subsections (valveDisease, arrhythmia) after this point.

---

## Pattern 9: Extreme Async Restore — Lung Cancer (Scroll UP Recovery)

**The bug**: Lung Cancer's async restore jumps to 73%+ scroll (the Risk Factors area). `tab-plannedSurgery` is 3500+ pixels above the viewport — it's completely off-screen LEFT. Double-tap on the section tab does NOT work because the element is not in the accessibility tree at all.

**Symptom**: `tapOn: id: tab-plannedSurgery` fails with "element not found". Even with 30000ms timeout, the scroll can't find it because Maestro scrolls the content area, not the section tab bar.

**Fix**: Use `scrollUntilVisible` with `direction: UP` targeting the FIRST field of the Planned Surgery section. This recovers from any restore position.

```yaml
# At the TOP of the flow, after launchApp and tapOn calculator name:
# ARCH: Single-Long-Scroll. Lung Cancer async-restores to 73%+ scroll.
# tab-plannedSurgery is completely off-screen. Scroll UP to find first field.
- scrollUntilVisible:
    element:
      id: "radio-resectionType-Lobectomy"
    direction: UP
    timeout: 30000
```

**Why this works**: `scrollUntilVisible direction: UP` scrolls the CONTENT upward (toward the top of the form), which is exactly what's needed. The 30000ms timeout gives it time even from a deeply nested restore position.

**This replaces the double-tap pattern** for Lung Cancer only. All other calculators still use double-tap.

---

## The STS iOS Flow Template

Use this as the starting point for any new STS cardiac calculator flow:

```yaml
appId: com.sts.calculator.dev
name: "XX <Calculator Name> — Full E2E Calculation (iOS)"
tags:
  - ios
  - <calculatorType>
  - calculator
  - happy-path
  - flow
---
# -----------------------------------------------
# <Calculator Name> Risk Calculator
# PATTERNS APPLIED:
#   - Double-tap section tabs (async storage restoration)
#   - Overshoot trick for illicitDrugUse/alcoholUse/tobaccoUse/atrialFibrillation
#   - speed:20/visibilityPercentage:50 for singleSelectMultiAttribute near toast band
#   - Direct tapOn for elements visible at scroll=0%
#   - primarySymptom-1 (No Coronary Symptoms) to avoid miWhen conditional
# -----------------------------------------------

- launchApp
- waitForAnimationToEnd:
    timeout: 3000

- tapOn: "<Calculator Name>"
- waitForAnimationToEnd:
    timeout: 5000

# ===== SECTION 1: [Surgery/Details] =====
# DOUBLE-TAP: async storage restoration fires after first tap.
- tapOn:
    id: tab-<sectionId>
- waitForAnimationToEnd:
    timeout: 2000
- tapOn:
    id: tab-<sectionId>
- waitForAnimationToEnd:
    timeout: 3000

# [fields visible at scroll=0% — direct tapOn]
- tapOn:
    id: radio-<fieldId>-<value>

# [fields below fold — scrollUntilVisible]
- scrollUntilVisible:
    element:
      id: radio-<fieldId>-<value>
    direction: DOWN
    timeout: 8000
- tapOn:
    id: radio-<fieldId>-<value>

# ===== SECTION 2: Demographics =====
- tapOn: "Demographics"
- waitForAnimationToEnd:
    timeout: 3000

- tapOn:
    id: radio-sex-1
- scrollUntilVisible:
    element:
      id: input-age
    direction: DOWN
    timeout: 8000
- tapOn:
    id: input-age
- inputText: "65"
- tapOn: Done
# [height, weight, race — same pattern]

# ===== SECTION 3: Laboratory Values =====
- tapOn: "Laboratory Values"
- waitForAnimationToEnd:
    timeout: 3000
# [creatinine, hematocrit, wbc, platelets — and albumin/bilirubin/inr if 7-field calc]

# ===== SECTION 4: Risk Factors =====
# DOUBLE-TAP: async storage restoration.
- tapOn:
    id: tab-riskFactors
- waitForAnimationToEnd:
    timeout: 2000
- tapOn:
    id: tab-riskFactors
- waitForAnimationToEnd:
    timeout: 3000

# diabetes — singleSelectMultiAttribute, appears at top of Risk Factors
- scrollUntilVisible:
    element:
      id: "radio-diabetes-No-#,2"
    direction: DOWN
    timeout: 10000
    speed: 20
    visibilityPercentage: 50
- tapOn:
    id: "radio-diabetes-No-#,2"

# endocarditis — after ~9 checkboxes below diabetes
- scrollUntilVisible:
    element:
      id: "radio-endocarditis-No-#,2"
    direction: DOWN
    timeout: 30000
    speed: 20
    visibilityPercentage: 50
- tapOn:
    id: "radio-endocarditis-No-#,2"

# illicitDrugUse — OVERSHOOT TRICK: scroll to -3 (last), tap -1
- scrollUntilVisible:
    element:
      id: radio-illicitDrugUse-3
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-illicitDrugUse-1

# alcoholUse — OVERSHOOT TRICK: scroll to -5 (last), tap -1
- scrollUntilVisible:
    element:
      id: radio-alcoholUse-5
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-alcoholUse-1

# tobaccoUse — OVERSHOOT TRICK: scroll to -6 (last option value), tap -1
- scrollUntilVisible:
    element:
      id: radio-tobaccoUse-6
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-tobaccoUse-1

# ── Pulmonary subsection ──
- scrollUntilVisible:
    element:
      id: tab-pulmonary
    direction: DOWN
    timeout: 10000
- tapOn:
    id: tab-pulmonary
- waitForAnimationToEnd:
    timeout: 3000
- scrollUntilVisible:
    element:
      id: radio-chronicLungDisease-1
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-chronicLungDisease-1

# ── Vascular subsection (if present) ──
- scrollUntilVisible:
    element:
      id: tab-vascular
    direction: DOWN
    timeout: 10000
- tapOn:
    id: tab-vascular
- waitForAnimationToEnd:
    timeout: 3000
- scrollUntilVisible:
    element:
      id: "radio-cerebrovascularDisease-No-#,#,#,2"
    direction: DOWN
    timeout: 10000
- tapOn:
    id: "radio-cerebrovascularDisease-No-#,#,#,2"

# ── Cardiac Status subsection ──
- scrollUntilVisible:
    element:
      id: tab-cardiacStatus
    direction: DOWN
    timeout: 10000
- tapOn:
    id: tab-cardiacStatus
- waitForAnimationToEnd:
    timeout: 3000
- scrollUntilVisible:
    element:
      id: "radio-heartFailure-#"
    direction: DOWN
    timeout: 10000
- tapOn:
    id: "radio-heartFailure-#"
- scrollUntilVisible:
    element:
      id: "radio-nyhaClassification-#"
    direction: DOWN
    timeout: 10000
- tapOn:
    id: "radio-nyhaClassification-#"
# [ejectionFraction if this calculator has it]

# ── Coronary Artery Disease subsection ──
- scrollUntilVisible:
    element:
      id: tab-coronaryArteryDisease
    direction: DOWN
    timeout: 10000
- tapOn:
    id: tab-coronaryArteryDisease
- waitForAnimationToEnd:
    timeout: 3000
# primarySymptom-1 = No Coronary Symptoms — avoids conditional miWhen field
- scrollUntilVisible:
    element:
      id: radio-primarySymptom-1
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-primarySymptom-1
- scrollUntilVisible:
    element:
      id: radio-numDiseasedVessels-1
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-numDiseasedVessels-1

# ── Valve Disease subsection ──
# PATTERN 8: After tab-coronaryArteryDisease, the subsection tab bar scrolls
# OFF-SCREEN ABOVE. Do NOT tap tab-valveDisease or tab-arrhythmia.
# Scroll directly to field IDs with generous timeouts.
- scrollUntilVisible:
    element:
      id: radio-aorticRegurgitation-1
    direction: DOWN
    timeout: 15000
- tapOn:
    id: radio-aorticRegurgitation-1
- scrollUntilVisible:
    element:
      id: radio-mitralRegurgitation-1
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-mitralRegurgitation-1
- scrollUntilVisible:
    element:
      id: radio-tricuspidRegurgitation-1
    direction: DOWN
    timeout: 10000
- tapOn:
    id: radio-tricuspidRegurgitation-1

# ── Arrhythmia subsection (SKIP tab tap — scroll directly) ──
# AF None fix — OVERSHOOT TRICK: scroll to -3 (Recent), tap -1 (None)
- scrollUntilVisible:
    element:
      id: radio-atrialFibrillation-3
    direction: DOWN
    timeout: 15000
- tapOn:
    id: radio-atrialFibrillation-1
# atrialFlutter also needs overshoot. After tapping AF-1, scroll can reset.
# Use 30000ms + scroll-to-3 pattern:
- scrollUntilVisible:
    element:
      id: radio-atrialFlutter-3
    direction: DOWN
    timeout: 30000
- tapOn:
    id: radio-atrialFlutter-1
# [vTachVFib, sickSinus, secondDegreeBlock, thirdDegreeBlock — same scrollUntilVisible+tapOn]

# ===== VERIFY: Patient Summary =====
# Sticky card at [0,122][402,210] — tap center (201,166)
# Works on iPhone 17 Pro simulator (402×874pt logical screen)
- tapOn:
    point: "201,178"
- waitForAnimationToEnd:
    timeout: 5000

- assertVisible: "Perioperative Outcome"
- assertVisible: "Operative Mortality"
- assertVisible: "Morbidity & Mortality"

- scrollUntilVisible:
    element: "Clinical Summary"
    direction: DOWN
    timeout: 5000
- assertVisible: "Clinical Summary"

- tapOn:
    id: phosphor-react-native-x-bold
- waitForAnimationToEnd:
    timeout: 2000
- tapOn:
    point: "26,90"
- waitForAnimationToEnd:
    timeout: 2000
```

---

## App Code Fixes Applied (Required for All Flows to Work)

These fixes were made to the STS app source code during the session. They must be present for flows to work reliably. If Metro is reset or the app is rebuilt from a fresh checkout, verify these are still applied:

| File | Fix | Without it |
|------|-----|------------|
| `CalculatorScreen/index.tsx` ~line 1271 | `setTimeout(() => dispatch(setTriggerApiCall(true)), 0)` | DdRumErrorTracking full-screen overlay appears after every field tap |
| `CalculatorScreen/index.tsx` ~line 632 | `console.error` → `console.warn` for form validation | Second DdRum overlay trigger |
| `CalculatorScreen/SectionRenderer.tsx` ~lines 707-720 | multiSelect default init in `setTimeout` | Same React render error |
| `CalculatorScreen/SubsectionRenderer.tsx` ~lines 316-320 | Same `setTimeout` | Same render error |
| `CalculatorScreen/SectionRenderer.tsx` ~line 877 | `checkboxGroup` chip testID: `option.value ?? option.apiKeys?.[0]?.apiKey ?? option.label` | All `checkboxGroup` chips get `undefined` ID — can't be tapped by Maestro |

**To verify the fixes are applied**:
```bash
grep -n "setTimeout" /Users/sdas/sts-mobile/src/features/app/CalculatorScreen/index.tsx | grep "setTriggerApiCall"
grep -n "console.warn" /Users/sdas/sts-mobile/src/features/app/CalculatorScreen/index.tsx | grep -i "form"
grep -n "apiKeys" /Users/sdas/sts-mobile/src/features/app/CalculatorScreen/SectionRenderer.tsx | grep "chip-"
```

**Branch**: All app fixes are on the `automation-testing` branch of `/Users/sdas/sts-mobile`. Make sure you're on it:
```bash
cd /Users/sdas/sts-mobile && git branch --show-current
# Should output: automation-testing
```

**Metro hot reload — when code changes don't take effect**:
```bash
# Kill Metro and restart with cache reset:
kill $(lsof -iTCP:8081 -sTCP:LISTEN | awk 'NR>1 {print $2}')
cd /Users/sdas/sts-mobile
npx react-native start --reset-cache --port 8081
```

---

## Debug Flowchart for STS iOS Failures

```
Flow fails on scrollUntilVisible timeout?
├── Yes → inspect_view_hierarchy
│   ├── Element not in hierarchy at all?
│   │   ├── It's a subsection tab (tab-valveDisease / tab-arrhythmia)?
│   │   │   └── Pattern 8: tab scrolled off-screen. Skip tap, scroll to field ID directly.
│   │   ├── Check visibleIf in calculatorConfig.json — field is conditional
│   │   ├── Check if wrong section tab is active (async restoration fired?)
│   │   │   └── Pattern 1: double-tap the section tab
│   │   └── Wrong testID — recompute singleSelectMultiAttribute sort order
│   └── Element IS in hierarchy?
│       ├── In toast band (y=733-835)? → Apply overshoot trick (Pattern 2)
│       ├── Direction wrong? → Change UP↔DOWN
│       └── Already visible at scroll=0%? → Use direct tapOn instead (Pattern 5)
│
├── Lung Cancer: tab-plannedSurgery not found?
│   └── Pattern 9: async restore to 73%+ scroll. Use scrollUntilVisible direction: UP
│       targeting radio-resectionType-Lobectomy with 30000ms timeout.
│
└── Flow fails on tapOn (after scrollUntilVisible succeeds)?
    ├── Toast band interception (y=733-835)?
    │   ├── Apply overshoot trick: scroll to last option, then tap first (Pattern 2)
    │   └── OR add speed:20 + visibilityPercentage:50 to the scroll
    └── Full-screen dev console overlay appeared?
        ├── Cause: tapped element in toast band → React key-prop warning fired
        ├── Same root cause as toast band, same fix: overshoot trick
        └── After overlay appears, restart flow from scratch
```

### Quick Checklist for "element not found after tab tap"

1. Is it the FIRST section tap of the flow? → **Double-tap pattern** (Pattern 1)
2. Is it `tab-valveDisease` or `tab-arrhythmia`? → **Skip tap, scroll to field** (Pattern 8)
3. Is it Lung Cancer `tab-plannedSurgery`? → **Scroll UP recovery** (Pattern 9)
4. Is it some other tab? → Try `scrollUntilVisible: id: tab-{name} direction: DOWN` before tapping

---

## Fixed Selectors

Previously pixel-based selectors — now all replaced with stable testID selectors:

| Old (fragile) | New (stable) | App code change |
|--------------|-------------|-----------------|
| `tapOn: point: "201,178"` | `tapOn: id: btn-patient-summary` | `testID="btn-patient-summary"` on `Pressable` in `TopSheetDrawer/index.tsx` (both ternary branches, lines ~1154 + ~1235) |
| `tapOn: point: "26,90"` | `tapOn: id: btn-back` | `testID="btn-back"` on `View` inside `headerBackImage` in `src/navigation/screenOptions.tsx` |

## Remaining Automation Gaps

1. **Lung `tumorSize` field**: Uses a `customTumorSize` widget type (custom slider). Maestro standard commands can't drive it. The flow skips it — calculator computes without it.

2. **`ejectionFaction` typo** (ACSD calculator only): The ACSD `calculatorConfig.json` has `ejectionFaction` (missing 'r'). Use the typo in the YAML: `input-ejectionFaction`. Update if the app fixes the typo.
