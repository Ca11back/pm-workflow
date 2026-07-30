# Experience and Pen

Experience is a required **decision**, not a hard drawing or release gate. Enter this reference only after the current-scope Definition exit and its explicit approval. Make the implementation-target decision before Candidate, Review, and handoff. Request size changes only how much Pen work is useful; it never decides which visual tool to use.

## Target routing

Persist exactly one target for a new Draft:

- `not-needed`: current scope changes no user-visible page, action, copy, visibility, state, feedback, or result. Record the reason.
- `existing-reference`: one authoritative current screen/design/flow already expresses the intended target and every required normal and material boundary state exactly. Record its identity, authority, and coverage. If it is incomplete or stale, keep it only as Pen input evidence.
- `pen`: default recommendation whenever current scope has a user-visible change and no exact reference. Pen may express a user flow, storyboard, page/state inventory, low-fidelity wireframe, static screen, or detailed visual. A clickable/runtime prototype is never required merely because Pen is selected.

Persist:

```text
experience_target: not-needed | existing-reference | pen
experience_status: pending | completed | skipped-risk
experience_reason: plain-language reason, owner-skipped, or tool-unavailable
visual_role: exploration | implementation-target | none
scope_and_fidelity: smallest affected flow/pages/states and plain-language detail
sync_status: synced | drift | unverified | none
brief_identity: experience/brief.md or none
artifact_identity: experience/prototype.pen or non-secret exact existing reference
preview_identity: experience/previews/<file>.png or none
route_identity: interactive-headless | interactive-app | official-direct | unavailable | none
covered_markdown: bundle-relative file.md#ID locators
covered_pen_nodes: experience/prototype.pen#<node-id> locators
read_back: structural, visual, save, and affected-node verification
missing_coverage: roles/pages/states/scenarios still absent
```

These values are internal traceability, not a PM menu. Tell the PM which pages/states you recommend drawing, why that coverage helps, and whether a flow, low-fidelity static view, or more detailed treatment fits. Let the PM accept, narrow, request more detail, or skip. Never ask for a target enum, route, command, path, node ID, or fidelity mode.

## Legacy exploration recovery

If a resumed Delivery still records `visual_role: exploration` with Phase definition, stop and route to `pm-definition`. Treat the artifact as evidence only. Do not mutate it, mark it completed, or promote it by relabeling. New `pm-experience` work creates only an approved `implementation-target` after Definition approval.

## Proportional Pen scope

- Small Change: draw only the affected screen/section, trigger-before/after, and material normal, failure, empty, or permission states.
- Existing product with an authoritative `.pen`: inspect and edit the related nodes/states; preserve unrelated nodes and do not redraw the product.
- Capability: cover only the current vertical user-value path and necessary boundary states.
- Product: cover only the current Active Slice and explicit shared dependencies, never the full product page inventory by default.

Every covered visual element must trace to current Markdown locators. Do not invent permissions, validation, states, exceptions, notifications, or side effects to make the artifact look complete.

## Pen implementation target

For an `experience_target: pen` implementation target, copy or update [experience-brief.md](../assets/experience-brief.md) at `experience/brief.md`. After the Definition exit, show the smallest implementation scope and fidelity in business language and wait for the PM/Owner's explicit acceptance or change; record the exact words/date in the brief. A general instruction to complete the lifecycle, continue automatically, or use the skills does not satisfy this scope/fidelity approval. Before it is recorded, allow only CLI preflight and read-only editor-state inspection—never mutate, export, or save the Pen artifact. Then follow [pen-direct.md](pen-direct.md). Prefer the persistent Interactive route; an already configured official Pen direct surface is equivalent only when the same current PM Agent can perform every required direct operation. The PM is never asked to choose the transport.

After authoring, perform structural/layout validation, one targeted visual check, export PM-reviewable image(s), re-read the affected nodes, save, and verify the `.pen` source and exports exist. Copy [experience-manifest.md](../assets/experience-manifest.md) to `experience/manifest.md` and record the source, preview, smallest covered scope, Markdown and Pen-node locators, route identity, structural result, visual result, save status, and read-back. Keep Experience and the Candidate gate unfinished, show the rendered preview, ask for approval or changes, and end that turn. Only a later explicit PM/Owner preview-approval reply, recorded verbatim with its date in both authoritative evidence locations, permits `completed` and a `before-candidate` attempt. A mismatch returns to Definition or becomes a Review Finding; developers never choose between authorities.

## Skip and unavailable paths

If the PM/Owner explicitly skips Pen, set `experience_status: skipped-risk`, record `owner-skipped`, state one concrete implementation impact once, and allow an explicit risk-bearing continuation. If no authorized direct route is available, or state/save/export/read-back cannot be verified after the one allowed recoverable retry, use the same status with `experience_reason: tool-unavailable` and record the route discovery, capability check, concrete attempted operation, retry result, and limitation required by [pen-direct.md](pen-direct.md). Absence of one optional integration is not proof that all direct routes are unavailable. Neither path blocks pure business definition, but `skipped-risk` alone does not pass Candidate: without the formal artifact, record the PM/Owner's explicit choice and date to continue with the stated impact before advancing.

Supporting text, flow notes, screenshots, or page/state coverage may remain evidence, but do not relabel them as the formal Pen implementation target or silently switch tools. Do not ask the PM for credentials, account/session data, URLs, CLI, JSON, YAML, Git, MCP setup, or login actions. If the missing visual could change implementation, narrow the intended use or preserve the visible risk; if behavior is already unique, continue normally while recording the limitation.

If an Experience change follows a Review, record the exact affected artifact/locator and correction evidence, but do not edit the Review register or `review_status`. After the Candidate gate passes, return that evidence to `pm-handoff`. It alone records `addressed-awaiting-review` plus `findings-open` for a Finding-driven change, or retains the old report as history plus `not-run` for another included-Experience change, then routes new/focused Review or an explicit risk-bearing skip/handoff choice.

## Legacy Draft compatibility

Write only the new target enum for new Drafts. On the next update of a resumed legacy Draft, map `visual-prototype` to `pen`. Preserve a legacy `flow-wireframe` as reference evidence; if it is exact for the current user-visible target it may become `existing-reference`, otherwise recommend the smallest Pen coverage and retain the old artifact as input. Never rewrite an immutable Release or reinterpret its old enum text; it remains historical authority for that released version.
