---
type: Task
title: Modal focus management, stacking, and scroll lock behavior
labels: design, ux, modals
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Modal focus management, stacking, and scroll lock behavior. Map all states: default, loading, empty, error, success, and permissioned vs anonymous. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Modal focus management, stacking, and scroll lock behavior

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Modal focus management, stacking, and scroll lock behavior* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Modal focus management, stacking, and scroll lock behavior* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-01
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Toast vs banner vs modal: non-blocking feedback hierarchy
labels: design, ux, feedback
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Toast vs banner vs modal: non-blocking feedback hierarchy. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Toast vs banner vs modal: non-blocking feedback hierarchy

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Toast vs banner vs modal: non-blocking feedback hierarchy* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Toast vs banner vs modal: non-blocking feedback hierarchy* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-02
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Data tables: row hover, selection, and bulk-action affordances
labels: design, ux, table
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Data tables: row hover, selection, and bulk-action affordances. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Data tables: row hover, selection, and bulk-action affordances

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Data tables: row hover, selection, and bulk-action affordances* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Data tables: row hover, selection, and bulk-action affordances* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-03
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Destructive actions: confirmation patterns and calm copy tone
labels: design, ux, patterns
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Destructive actions: confirmation patterns and calm copy tone. Map all states: default, loading, empty, error, success, and permissioned vs anonymous. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Destructive actions: confirmation patterns and calm copy tone

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Destructive actions: confirmation patterns and calm copy tone* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Destructive actions: confirmation patterns and calm copy tone* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-04
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Wayfinding: breadcrumbs, back behavior, and deep-link recovery
labels: design, ux, navigation
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Wayfinding: breadcrumbs, back behavior, and deep-link recovery. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Wayfinding: breadcrumbs, back behavior, and deep-link recovery

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Wayfinding: breadcrumbs, back behavior, and deep-link recovery* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Wayfinding: breadcrumbs, back behavior, and deep-link recovery* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-05
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Long stream lists: pagination vs infinite scroll UX specification
labels: design, ux, performance
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Long stream lists: pagination vs infinite scroll UX specification. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Long stream lists: pagination vs infinite scroll UX specification

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Long stream lists: pagination vs infinite scroll UX specification* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Long stream lists: pagination vs infinite scroll UX specification* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-06
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Search, filter, and sort discoverability on treasury streams
labels: design, ux, filters
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Search, filter, and sort discoverability on treasury streams. Map all states: default, loading, empty, error, success, and permissioned vs anonymous. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Search, filter, and sort discoverability on treasury streams

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Search, filter, and sort discoverability on treasury streams* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Search, filter, and sort discoverability on treasury streams* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-07
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Time presentation: cliffs, end dates, and ledger-relative clarity
labels: design, ux, copy
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Time presentation: cliffs, end dates, and ledger-relative clarity. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Time presentation: cliffs, end dates, and ledger-relative clarity

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Time presentation: cliffs, end dates, and ledger-relative clarity* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Time presentation: cliffs, end dates, and ledger-relative clarity* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-08
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Amount inputs: formatting, paste behavior, and invalid-entry recovery
labels: design, ux, forms
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Amount inputs: formatting, paste behavior, and invalid-entry recovery. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Amount inputs: formatting, paste behavior, and invalid-entry recovery

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Amount inputs: formatting, paste behavior, and invalid-entry recovery* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Amount inputs: formatting, paste behavior, and invalid-entry recovery* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-09
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Status communication beyond color (pattern, icon, text pairing)
labels: design, ux, a11y
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Status communication beyond color (pattern, icon, text pairing). Map all states: default, loading, empty, error, success, and permissioned vs anonymous. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Status communication beyond color (pattern, icon, text pairing)

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Status communication beyond color (pattern, icon, text pairing)* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Status communication beyond color (pattern, icon, text pairing)* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-10
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Reduced motion: alternative feedback when animation is limited
labels: design, ux, a11y
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Reduced motion: alternative feedback when animation is limited. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Reduced motion: alternative feedback when animation is limited

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Reduced motion: alternative feedback when animation is limited* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Reduced motion: alternative feedback when animation is limited* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-11
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Contextual help: tooltip vs side panel vs external docs patterns
labels: design, ux, help
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Contextual help: tooltip vs side panel vs external docs patterns. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Contextual help: tooltip vs side panel vs external docs patterns

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Contextual help: tooltip vs side panel vs external docs patterns* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Contextual help: tooltip vs side panel vs external docs patterns* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-12
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Multi-step flows: stepper, progress, and cancel or save-draft paths
labels: design, ux, flows
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Multi-step flows: stepper, progress, and cancel or save-draft paths. Map all states: default, loading, empty, error, success, and permissioned vs anonymous. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Multi-step flows: stepper, progress, and cancel or save-draft paths

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Multi-step flows: stepper, progress, and cancel or save-draft paths* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Multi-step flows: stepper, progress, and cancel or save-draft paths* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-13
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Truncated addresses and account labels: readability and copy rules
labels: design, ux, wallet
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Truncated addresses and account labels: readability and copy rules. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Truncated addresses and account labels: readability and copy rules

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Truncated addresses and account labels: readability and copy rules* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Truncated addresses and account labels: readability and copy rules* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-14
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: CTA hierarchy audit: primary, secondary, tertiary, and destructive
labels: design, ux, components
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—CTA hierarchy audit: primary, secondary, tertiary, and destructive. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** CTA hierarchy audit: primary, secondary, tertiary, and destructive

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *CTA hierarchy audit: primary, secondary, tertiary, and destructive* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *CTA hierarchy audit: primary, secondary, tertiary, and destructive* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-15
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Wallet disconnect, stale session, and reconnect flows
labels: design, ux, wallet
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Wallet disconnect, stale session, and reconnect flows. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Wallet disconnect, stale session, and reconnect flows

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Wallet disconnect, stale session, and reconnect flows* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Wallet disconnect, stale session, and reconnect flows* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-16
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Slow network and RPC pending: patience UI and retry affordances
labels: design, ux, feedback
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Slow network and RPC pending: patience UI and retry affordances. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Slow network and RPC pending: patience UI and retry affordances

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Slow network and RPC pending: patience UI and retry affordances* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Slow network and RPC pending: patience UI and retry affordances* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-17
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Wallet-vendor copy: Freighter, hardware, and generic wallet tone
labels: design, ux, copy
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Wallet-vendor copy: Freighter, hardware, and generic wallet tone. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Wallet-vendor copy: Freighter, hardware, and generic wallet tone

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Wallet-vendor copy: Freighter, hardware, and generic wallet tone* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Wallet-vendor copy: Freighter, hardware, and generic wallet tone* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-18
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Live updates: polite announcements for balance and stream changes
labels: design, ux, a11y
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Live updates: polite announcements for balance and stream changes. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Live updates: polite announcements for balance and stream changes

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Live updates: polite announcements for balance and stream changes* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Live updates: polite announcements for balance and stream changes* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-19
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Dense forms: tab order, field grouping, and skip-navigation patterns
labels: design, ux, a11y
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Dense forms: tab order, field grouping, and skip-navigation patterns. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Dense forms: tab order, field grouping, and skip-navigation patterns

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Dense forms: tab order, field grouping, and skip-navigation patterns* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Dense forms: tab order, field grouping, and skip-navigation patterns* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-20
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Charts and graphs: touch targets, legends, and text alternatives
labels: design, ux, data-viz
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Charts and graphs: touch targets, legends, and text alternatives. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Charts and graphs: touch targets, legends, and text alternatives

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Charts and graphs: touch targets, legends, and text alternatives* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Charts and graphs: touch targets, legends, and text alternatives* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-21
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Treasury multi-stream scan: grouping, pinning, or comparison layout
labels: design, ux, dashboard
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Treasury multi-stream scan: grouping, pinning, or comparison layout. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Treasury multi-stream scan: grouping, pinning, or comparison layout

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Treasury multi-stream scan: grouping, pinning, or comparison layout* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Treasury multi-stream scan: grouping, pinning, or comparison layout* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-22
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Keyboard shortcuts: optional overlay and discoverability rules
labels: design, ux, power-user
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Keyboard shortcuts: optional overlay and discoverability rules. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Keyboard shortcuts: optional overlay and discoverability rules

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Keyboard shortcuts: optional overlay and discoverability rules* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Keyboard shortcuts: optional overlay and discoverability rules* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-23
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Beta and experimental surfaces: disclosure and expectation setting
labels: design, ux, product
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Beta and experimental surfaces: disclosure and expectation setting. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Beta and experimental surfaces: disclosure and expectation setting

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Beta and experimental surfaces: disclosure and expectation setting* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Beta and experimental surfaces: disclosure and expectation setting* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-24
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Internationalization layout: long strings, truncation, and RTL spacing
labels: design, ux, i18n
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Internationalization layout: long strings, truncation, and RTL spacing. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Internationalization layout: long strings, truncation, and RTL spacing

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Internationalization layout: long strings, truncation, and RTL spacing* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Internationalization layout: long strings, truncation, and RTL spacing* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-25
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Native vs custom controls: visual parity and interaction consistency
labels: design, ux, components
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Native vs custom controls: visual parity and interaction consistency. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Native vs custom controls: visual parity and interaction consistency

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Native vs custom controls: visual parity and interaction consistency* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Native vs custom controls: visual parity and interaction consistency* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-26
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Scroll containment: modals, drawers, and nested scroll regions
labels: design, ux, layout
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Scroll containment: modals, drawers, and nested scroll regions. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Scroll containment: modals, drawers, and nested scroll regions

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Scroll containment: modals, drawers, and nested scroll regions* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Scroll containment: modals, drawers, and nested scroll regions* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-27
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Mobile thumb zones: primary actions and safe-area layout
labels: design, ux, mobile
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Mobile thumb zones: primary actions and safe-area layout. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Mobile thumb zones: primary actions and safe-area layout

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Mobile thumb zones: primary actions and safe-area layout* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Mobile thumb zones: primary actions and safe-area layout* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-28
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Privacy-conscious display: masking and reveal patterns for addresses
labels: design, ux, privacy
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Privacy-conscious display: masking and reveal patterns for addresses. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Privacy-conscious display: masking and reveal patterns for addresses

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Privacy-conscious display: masking and reveal patterns for addresses* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Privacy-conscious display: masking and reveal patterns for addresses* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-29
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours

++++++

---
type: Task
title: Semantic distinction: empty vs loading vs zero-accrual copy and visuals
labels: design, ux, copy
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Semantic distinction: empty vs loading vs zero-accrual copy and visuals. Map all states: default, loading, empty, error, success, and permissioned vs anonymous. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Semantic distinction: empty vs loading vs zero-accrual copy and visuals

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Semantic distinction: empty vs loading vs zero-accrual copy and visuals* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Semantic distinction: empty vs loading vs zero-accrual copy and visuals* meets treasury/recipient goals without open questions on core flows.
- Engineering can estimate work from the deliverable without a clarification spike for the documented states.
- Any intentional exclusions or follow-up bets are listed with owners.

### Constraints for contributors

- Describe **outcomes**, **invariants**, and **evidence**, not a single “right” internal design unless the issue title already names a concrete subsystem.
- Prefer **observable** guarantees: state transitions, balances, authorization failures, emitted events, error classifications, and documentation that integrators rely on.
- If something cannot be tested automatically, capture the gap as **audit notes** with explicit rationale and residual risk.

## Requirements and context

- Must be **inclusive** (accessibility considered at design time, not as an afterthought).
- Should be **implementation-ready**: engineers can build from frames + notes without inventing missing states.
- Align with **Fluxora-Frontend** routes and surfaces (`src/pages/`, `src/components/`) conceptually; final file names may differ.

## Suggested execution

1. Branch from the frontend repo:
   ```bash
   git checkout -b design/fluxora-uiux-30
   ```
2. Design deliverables
   - **Exploration:** sketches or low-fi as needed, then hi-fi in Figma (or team-standard tool).
   - **Specs:** component states, spacing/type tokens references, and copy deck snippets where copy changes.
   - **Review:** design critique with PM + eng; capture decisions in issue or Figma comments.
3. Handoff
   - Link Figma / prototype in the closing PR or issue comment.
   - List **open questions** explicitly if engineering spikes are required.

## Guidelines

- **Prototype or redlines** for non-obvious interactions (tables, modals, wallet flows).
- **Timeframe:** 96 hours
