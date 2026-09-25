---
type: Task
title: Design system foundation: color, typography, and spacing tokens
labels: design, design-system, frontend
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Design system foundation: color, typography, and spacing tokens. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Design system foundation: color, typography, and spacing tokens

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Design system foundation: color, typography, and spacing tokens* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Design system foundation: color, typography, and spacing tokens* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-01
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
title: Landing & hero: narrative hierarchy and primary CTA flow
labels: design, marketing, landing
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Landing & hero: narrative hierarchy and primary CTA flow. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Landing & hero: narrative hierarchy and primary CTA flow

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Landing & hero: narrative hierarchy and primary CTA flow* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Landing & hero: narrative hierarchy and primary CTA flow* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-02
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
title: Global navigation: AppNavbar patterns (anon vs connected)
labels: design, navigation, frontend
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Global navigation: AppNavbar patterns (anon vs connected). Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Global navigation: AppNavbar patterns (anon vs connected)

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Global navigation: AppNavbar patterns (anon vs connected)* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Global navigation: AppNavbar patterns (anon vs connected)* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-03
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
title: Dashboard shell: sidebar, layout grid, and content width
labels: design, layout, dashboard
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Dashboard shell: sidebar, layout grid, and content width. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Dashboard shell: sidebar, layout grid, and content width

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Dashboard shell: sidebar, layout grid, and content width* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Dashboard shell: sidebar, layout grid, and content width* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-04
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
title: Wallet connection UX: states, errors, and network mismatch
labels: design, wallet, stellar
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Wallet connection UX: states, errors, and network mismatch. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Wallet connection UX: states, errors, and network mismatch

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Wallet connection UX: states, errors, and network mismatch* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Wallet connection UX: states, errors, and network mismatch* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-05
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
title: Treasury metrics: card hierarchy and KPI scanability
labels: design, dashboard, data-viz
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Treasury metrics: card hierarchy and KPI scanability. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Treasury metrics: card hierarchy and KPI scanability

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Treasury metrics: card hierarchy and KPI scanability* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Treasury metrics: card hierarchy and KPI scanability* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-06
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
title: Streams data table: filters, density, and scan patterns
labels: design, table, ux
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Streams data table: filters, density, and scan patterns. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Streams data table: filters, density, and scan patterns

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Streams data table: filters, density, and scan patterns* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Streams data table: filters, density, and scan patterns* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-07
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
title: Stream status & progress: pills, timelines, and accrual cues
labels: design, streams, components
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Stream status & progress: pills, timelines, and accrual cues. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Stream status & progress: pills, timelines, and accrual cues

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Stream status & progress: pills, timelines, and accrual cues* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Stream status & progress: pills, timelines, and accrual cues* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-08
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
title: Create stream flow: form structure and validation affordances
labels: design, forms, streams
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Create stream flow: form structure and validation affordances. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Create stream flow: form structure and validation affordances

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Create stream flow: form structure and validation affordances* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Create stream flow: form structure and validation affordances* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-09
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
title: Post-create confirmation: success moment and next-step clarity
labels: design, streams, ux
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Post-create confirmation: success moment and next-step clarity. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Post-create confirmation: success moment and next-step clarity

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Post-create confirmation: success moment and next-step clarity* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Post-create confirmation: success moment and next-step clarity* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-10
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
title: Recipient portal: incoming streams overview and prioritization
labels: design, recipient, dashboard
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Recipient portal: incoming streams overview and prioritization. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Recipient portal: incoming streams overview and prioritization

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Recipient portal: incoming streams overview and prioritization* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Recipient portal: incoming streams overview and prioritization* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-11
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
title: Empty states: treasury, streams, and recipient scenarios
labels: design, empty-states, ux
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Empty states: treasury, streams, and recipient scenarios. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Empty states: treasury, streams, and recipient scenarios

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Empty states: treasury, streams, and recipient scenarios* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Empty states: treasury, streams, and recipient scenarios* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-12
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
title: Loading & skeleton patterns across dashboard surfaces
labels: design, loading, frontend
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Loading & skeleton patterns across dashboard surfaces. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Loading & skeleton patterns across dashboard surfaces

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Loading & skeleton patterns across dashboard surfaces* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Loading & skeleton patterns across dashboard surfaces* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-13
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
title: Error surfaces: global error page and recoverable inline errors
labels: design, errors, ux
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Error surfaces: global error page and recoverable inline errors. Map all states: default, loading, empty, error, success, and permissioned vs anonymous. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Error surfaces: global error page and recoverable inline errors

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Error surfaces: global error page and recoverable inline errors* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Error surfaces: global error page and recoverable inline errors* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-14
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
title: Connect wallet modal: wallet list, trust, and dismiss behavior
labels: design, wallet, modals
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Connect wallet modal: wallet list, trust, and dismiss behavior. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Connect wallet modal: wallet list, trust, and dismiss behavior

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Connect wallet modal: wallet list, trust, and dismiss behavior* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Connect wallet modal: wallet list, trust, and dismiss behavior* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-15
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
title: Responsive design: breakpoints for dashboard and tables
labels: design, responsive, frontend
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Responsive design: breakpoints for dashboard and tables. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Responsive design: breakpoints for dashboard and tables

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Responsive design: breakpoints for dashboard and tables* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Responsive design: breakpoints for dashboard and tables* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-16
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
title: Accessibility: keyboard paths and WCAG-oriented contrast targets
labels: design, a11y, frontend
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Accessibility: keyboard paths and WCAG-oriented contrast targets. Map all states: default, loading, empty, error, success, and permissioned vs anonymous. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Accessibility: keyboard paths and WCAG-oriented contrast targets

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Accessibility: keyboard paths and WCAG-oriented contrast targets* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Accessibility: keyboard paths and WCAG-oriented contrast targets* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-17
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
title: Motion spec: micro-interactions without distracting treasury users
labels: design, motion, ux
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Motion spec: micro-interactions without distracting treasury users. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Motion spec: micro-interactions without distracting treasury users

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Motion spec: micro-interactions without distracting treasury users* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Motion spec: micro-interactions without distracting treasury users* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-18
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
title: Streaming data visualization: claimable vs accrued over time
labels: design, data-viz, streams
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Streaming data visualization: claimable vs accrued over time. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Streaming data visualization: claimable vs accrued over time

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Streaming data visualization: claimable vs accrued over time* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Streaming data visualization: claimable vs accrued over time* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-19
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
title: Product copy deck: Stellar, streams, and amounts (plain language)
labels: design, copy, content
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Product copy deck: Stellar, streams, and amounts (plain language). Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Product copy deck: Stellar, streams, and amounts (plain language)

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Product copy deck: Stellar, streams, and amounts (plain language)* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Product copy deck: Stellar, streams, and amounts (plain language)* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-20
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
title: Landing trust section: credibility and risk transparency layout
labels: design, marketing, trust
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Landing trust section: credibility and risk transparency layout. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Landing trust section: credibility and risk transparency layout

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Landing trust section: credibility and risk transparency layout* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Landing trust section: credibility and risk transparency layout* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-21
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
title: Footer, legal, and secondary navigation layout
labels: design, marketing, layout
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Footer, legal, and secondary navigation layout. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Footer, legal, and secondary navigation layout

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Footer, legal, and secondary navigation layout* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Footer, legal, and secondary navigation layout* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-22
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
title: Newsletter and secondary CTAs: placement and hierarchy
labels: design, marketing, cta
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Newsletter and secondary CTAs: placement and hierarchy. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Newsletter and secondary CTAs: placement and hierarchy

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Newsletter and secondary CTAs: placement and hierarchy* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Newsletter and secondary CTAs: placement and hierarchy* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-23
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
title: Design QA: Figma-to-code checklist and component parity
labels: design, process, qa
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Design QA: Figma-to-code checklist and component parity. Map all states: default, loading, empty, error, success, and permissioned vs anonymous. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Design QA: Figma-to-code checklist and component parity

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Design QA: Figma-to-code checklist and component parity* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Design QA: Figma-to-code checklist and component parity* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-24
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
title: Iconography and illustration direction for Fluxora
labels: design, brand, icons
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Iconography and illustration direction for Fluxora. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Iconography and illustration direction for Fluxora

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Iconography and illustration direction for Fluxora* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Iconography and illustration direction for Fluxora* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-25
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
title: Optional dark theme: tokens and component inversion rules
labels: design, theme, design-system
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Optional dark theme: tokens and component inversion rules. Define clear user goals, primary tasks, and success metrics for this slice before pixel work. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Optional dark theme: tokens and component inversion rules

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Optional dark theme: tokens and component inversion rules* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Optional dark theme: tokens and component inversion rules* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-26
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
title: Treasury onboarding: first-run guidance and empty-to-active journey
labels: design, onboarding, ux
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Treasury onboarding: first-run guidance and empty-to-active journey. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Treasury onboarding: first-run guidance and empty-to-active journey

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Treasury onboarding: first-run guidance and empty-to-active journey* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Treasury onboarding: first-run guidance and empty-to-active journey* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-27
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
title: Transaction feedback: pending, success, and failure patterns
labels: design, feedback, stellar
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Transaction feedback: pending, success, and failure patterns. Specify accessibility expectations (contrast, focus order, screen reader labels) at the same fidelity as visuals. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Transaction feedback: pending, success, and failure patterns

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Transaction feedback: pending, success, and failure patterns* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Transaction feedback: pending, success, and failure patterns* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-28
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
title: Stream detail or expanded row: deep-dive layout
labels: design, streams, detail
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Stream detail or expanded row: deep-dive layout. Document responsive behavior at agreed breakpoints; avoid ambiguous “make it work on mobile” handoffs. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Stream detail or expanded row: deep-dive layout

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Stream detail or expanded row: deep-dive layout* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Stream detail or expanded row: deep-dive layout* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-29
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
title: Visual consistency: marketing site vs authenticated app chrome
labels: design, consistency, brand
assignees: ''
---

## Description

### Summary

Within Fluxora-Frontend product design, this task sharpens one user-facing or system-facing visual/UX contract. Fluxora-Frontend is the face of programmable treasury streaming: treasuries, recipients, and auditors infer trust from layout, hierarchy, and feedback—not only from underlying chain correctness. This design task is bounded by its title—Visual consistency: marketing site vs authenticated app chrome. Align copy, amounts, and Stellar-specific concepts with treasury and recipient mental models. Deliverables should be reviewable by engineering without guesswork: annotated frames, component specs, and explicit acceptance notes for edge cases. Deferrals must be listed with rationale.

**Issue caption:** Visual consistency: marketing site vs authenticated app chrome

### Domain context

Fluxora-Frontend is a treasury- and recipient-facing product: users judge safety and professionalism from
information hierarchy, predictable feedback, and inclusive interaction design. Design work should be shippable—annotated,
state-complete, and aligned with Stellar wallet realities—without forcing engineers to infer missing breakpoints or
accessibility rules.

### Work to complete

1. Produce **design intent** for *Visual consistency: marketing site vs authenticated app chrome* using the **Summary** as scope; cover layout, hierarchy, and interaction states.
2. Specify **all relevant states** (default, hover/focus, loading, empty, error, success) and how they differ for connected vs anonymous users where applicable.
3. Capture **accessibility** expectations: focus order, labels, live regions for async updates, and contrast targets referenced to WCAG intent.
4. Define **handoff artifacts** (Figma structure, naming, redlines or dev mode specs) so implementation does not rely on informal chat.

### Definition of done

- Design critique or stakeholder sign-off confirms *Visual consistency: marketing site vs authenticated app chrome* meets treasury/recipient goals without open questions on core flows.
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
   git checkout -b design/fluxora-fe-30
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
