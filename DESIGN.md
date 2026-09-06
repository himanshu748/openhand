---
name: Pass It On
description: Learning studio for source-linked explanations
colors:
  paper: "#f4f6fa"
  surface: "#fdfefe"
  ink: "#202c40"
  muted: "#56647b"
  green: "#3455bd"
  accent-ink: "#fdfefe"
  sage: "#eaf0ff"
  rule: "#d8dfeb"
  soft: "#eef1f6"
  warn: "#9a432b"
  warn-bg: "#fff0e9"
  dark-paper: "#131a28"
  dark-surface: "#1b2435"
  dark-ink: "#edf1fa"
  dark-muted: "#b0bdd1"
  dark-green: "#a7beff"
  dark-accent-ink: "#182b5b"
  dark-sage: "#253653"
  dark-rule: "#3b475c"
  dark-soft: "#232e42"
  dark-warn: "#ffbaa0"
  dark-warn-bg: "#472d29"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(40px, 4.7vw, 64px)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-.03em"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "15px"
    lineHeight: 1.65
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 750
  evidence:
    fontFamily: "ui-monospace, monospace"
    fontSize: "12px"
    lineHeight: 1.7
rounded:
  control: "8px"
  question: "10px"
  inset: "12px"
  radius: "14px"
  shell: "18px"
spacing:
  compact: "12px"
  inset: "18px"
  panel: "24px"
  generous: "30px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.question}"
    padding: "14px 16px"
  question-selected:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.green}"
    rounded: "{rounded.question}"
    padding: "16px 13px"
  feedback:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
    padding: "20px"
---

# Design System: Pass It On

## Overview

**Creative North Star: "Learning studio"**

A quiet working area for reading, explaining and checking a source. One plain sans-serif family, cool surfaces and blue actions connect the public introduction with the task workspace. Text, selection and evidence supply the visual identity; the implementation uses no generated imagery.

**Key Characteristics:**
- Plain readable headings with confident weight.
- Cool layered surfaces and explicit selected states.
- Sources remain accessible beside or after the active task.

This records the built implementation in `public/passiton/design.css`, `styles.css`, `landing.css`, `theme.js` and `views.js`. `PRODUCT.md` owns product facts; route composition belongs in the surface briefs. The earlier `/ledger` interface is outside this design system's documented scope.

## Colors

### Primary
The incumbent token named `green` is action blue, and `sage` is its pale blue selected/inset surface. Preserve these CSS names when extending the app. `accent` aliases `green`; `accent-ink` supplies the primary button foreground.

### Neutral
`paper` is the outer canvas and reference area; `surface` holds the workspace and controls. `ink` carries readable content, `muted` supporting text, `rule` dividers and `soft` secondary fills. `warn` with `warn-bg` marks revisions, errors and recording states.

Dark tokens use the `dark-` prefix above and override the same unprefixed CSS variables at runtime. Dark mode retains the blue hierarchy while changing action foreground and surface contrast. System appearance is the default; explicit Light/Dark overrides persist in `passiton-appearance` local storage and apply to both routes.

## Typography

Manrope is locally hosted as a variable Latin font (weights 200–800), with system fallbacks; Hindi glyphs use the available fallback font. Do not claim a bundled Devanagari face. Display type is reserved for the landing headline. Workspace headings are smaller: introduction 30px, selected question 25px, panel title 20px before responsive overrides. Headings use tight tracking and balanced wrapping; body text uses generous line height. Source quotations range from 15px/1.9 in the workspace to 17px/1.85 in the desktop landing example. Wallet evidence uses monospace; amounts and tables use tabular numerals. Do not introduce decorative section typography.

## Layout

Shared spacing is contextual, not a strict modular scale. The workspace is at most 1368px wide; its header and introduction are at most 1440px. Wide screens use a 240px question rail followed by a task/source grid. Below 1400px the rail becomes 220px and outer margins become 28px. At 1150px and below the task and source stack. At 960px and below the rail becomes a question selector; its released width permits task/source columns again from 701–960px. At 700px and below all task panels stack, navigation fills a second header row, and outer workspace margins become 12px. The source follows the task in reading order. Coverage tables scroll within their container.

Landing content uses a 1280px hero and 1200px sections. Its two-column example composition becomes a single column at 700px. Intermediate adjustments occur at 1280px and 960px. Route-specific strategy is recorded separately; do not impose the hero composition on tasks.

## Elevation & Depth

Most separation comes from tonal backgrounds and thin rules. The desktop landing example alone uses the shared ambient shadow; its mobile version replaces that shadow with a border. Native dialogs use the top layer with a dim backdrop. Shadow values, backdrop and motion details live in the sidecar. Motion is limited to short control transitions and smooth scrolling when reduced motion is not requested.

## Shapes

Controls have gently rounded corners; selected question rows and textareas are slightly softer. Inset feedback and voice areas use the inset radius. Main desktop shells use the shell radius, reducing to the radius token on small screens. Dividers structure source and table content without turning every passage into a separate card.

## Components

- **Buttons:** primary blue with contrasting text; secondary surface with a rule border; underlined text actions for supporting tasks. Shared controls are at least 46px high before local overrides. Hover darkens button rendering; active moves down 1px; disabled controls use reduced opacity and a disabled cursor.
- **Focus:** a visible 3px action-color outline with 4px offset applies to interactive elements. This is implemented styling, not a verified contrast claim.
- **Navigation and questions:** current modes use a raised tonal tab and `aria-current`; selected question rows use blue tint and `aria-pressed`. Narrow screens replace the question list with a labelled native select.
- **Inputs:** full-width resizable textareas, explicit labels, canvas fill and thin borders. Language and appearance use native selects.
- **Evidence:** source text remains selectable; supporting excerpts expand through native details. Success, draft and review status remain explicit text, with warm feedback for correction states.
- **Dialogs and audio:** native dialogs preserve consent and editable transcript workflow; playback uses native audio controls. Recording and playback are distinct actions.

## Do's and Don'ts

### Do:
- **Do** reuse shared semantic colors in both appearances.
- **Do** retain plain headings, visible focus and explicit review status.
- **Do** keep source evidence reachable throughout the task.

### Don't:
- **Don't** add decorative type, imagery or animation without a specific purpose.
- **Don't** use payment styling to imply an answer is correct.
- **Don't** treat initial viewport screenshots as full interaction or accessibility proof.

Verification record: the finish reviewer returned SHIP with no material findings; 32 existing tests passed in the implementation run. `.impeccable/review/` contains desktop, mobile, user-792, dark, landing-desktop and landing-mobile screenshots of initial viewports only. The mechanical detector degraded to regex because parser dependencies were unavailable; it provides no computed contrast proof. These observations do not establish every interactive state or live provider behavior.
