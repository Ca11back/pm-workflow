# Reverse review method

## Candidate scope hygiene

Treat the Candidate manifest as the complete Review boundary. Every reviewed physical file must be manifest-listed, and the Experience artifact declaration must exactly equal the approval-bound Brief and preview artifact union. Exploration, failed, superseded, historical, unrelated, or unexplained files are out of scope and must not be present in the Candidate.

## Authority reconstruction

Start from generated `START-HERE.md`, then follow the selected `CAND-*` root and `MANIFEST.json`. Record Candidate ID/hash, physical root, bundle-relative paths, and exact versions reviewed. First compare the physical bundle with the manifest, then verify included scope, shared dependencies, exclusions, intended use, Experience brief/source/previews/read-back, approval-event bindings, and that no Candidate locator points back to mutable Draft. Every reviewed file must be manifest-listed. The Experience manifest's Candidate artifact declaration must equal its approval-bound Brief and preview artifacts, with no unexplained extra or missing file. Reject exploration, failed, superseded, historical, or unrelated Draft material in Candidate scope. Chat, old PRDs, prototypes, and evidence do not override current Candidate Markdown behavior.

For each behavior-bearing claim, record its source location, fact status, authority, and affected full bundle-relative `path#ID`. Flag unsourced `confirmed` claims, AI assertions promoted without Owner confirmation, hidden conflicts, stale links, duplicate file-local IDs when the path is missing, and any visual behavior or Pen node not mapped back to Markdown.

For an included `.pen` artifact, use current live Pen interactive help with a read-only direct capability or an isolated copy/output inside the caller-authorized write scope. Verify the destination before writing, never mutate or save the authoritative artifact, and remove only the exact isolated copy when cleanup is authorized. Perform state read, node/content/bounds read-back, layout inspection, and targeted preview comparison only. Record whether `.pen` structure was independently verified and whether authorized cleanup completed. If no authorized isolated copy or direct inspection is available, inspect the exact exported previews and Experience read-back evidence and disclose the structural limitation. A non-visual Reviewer must also disclose that it did not inspect appearance and rely on explicit human review of the exact PNG; structural evidence is not a visual substitute. A provisional `draft/exploration/` artifact can inform a later Definition decision but can never appear in or satisfy the reviewed Candidate.

Reconstruct the Experience routing decision before judging artifact quality. For current user-visible scope, accept only a completed Pen `implementation-target`, an exact authoritative `existing-reference` covering all required normal and material boundary states, or explicit `skipped-risk` evidence for Owner skip/tool unavailability with the concrete impact. For non-user-visible scope, `not-needed` must state why no page, action, copy, visibility, state, feedback, or result changes. An `exploration` artifact remains Definition evidence and cannot satisfy Candidate readiness. Treat a missing, stale, or contradictory route as a Finding while preserving the Owner's later ability to accept risk and hand off.

Definition files are hash-bound before Experience and therefore contain durable product requirements and required coverage, not a mutable snapshot of the current Experience route/status/source/preview. Resolve those lifecycle facts from Candidate `experience/manifest.md`, its frozen artifacts, and generated `START-HERE.md`. Do not require the Definition contract to duplicate them. A contradictory lifecycle claim that the Definition author chose to include is still a Finding.

Independently derive the functional representation obligations from authoritative roles, objects, lifecycle, Rules, Scenarios and Journeys before trusting the Brief or manifest inventories. Identify each stable task-context Screen and primary job; approved/risk-material States; required content groups, functional regions and semantic controls; and every Step's source, visible trigger, feedback, result, failure/recovery and re-entry. Then compare that reconstruction with the Brief's Screen/State/Step contract, exact artifact locators, descendant read-back and rendered evidence. Text that says “enter”, “choose”, “collection”, “continue”, or “done” is not a substitute for the required input, selection, collection, control, feedback or result structure.

Require each Coverage ID and relationship statement to agree across approved Brief, artifact/read-back, and manifest. Verify exact Screen/State/Step identity closure without treating those IDs as behavior authority. Independently derive critical journeys rather than trusting declared inventory: when an object persists or changes asynchronously, verify later re-entry/retrieval or an explicit not-applicable reason. Trace every visible navigation, action and return affordance to a covered destination; a complete Coverage list cannot excuse an unreachable flow, whole-frame hotspot, root-bounds-only read-back or dangling target. Evidence-canvas layout is not runtime behavior authority.

Run a product-neutral `template-collapse` probe. Shared application shells, repeated layouts, identical node counts, arbitrary names, monochrome output and genuinely identical state structures may pass. Different primary jobs require their own task-shaped content/control evidence or a concrete task reason for identical functional regions. More frames, labels, keywords or visual variants cannot compensate for missing content, controls, transitions, feedback, recovery or re-entry. Record a Finding when the actual artifact/read-back is missing, invented, contradictory or collapsed without justification; do not use subtree-similarity, page-name or aesthetic scoring.

## Behavior tuple and ambiguity test

Normalize critical behavior as:

`actor | starting stage | event | guard/permission | success result | failure/recovery | side effects`

Try to build two observably different implementations that both comply. Use a concrete business counterexample. The existence of ambiguity establishes a Finding; severity then depends on current intended use and consequence, not on the probe category alone.

## Severity rubric

| Internal | PM label | Boundary |
| --- | --- | --- |
| `blocker` | 必须确认 | For the current intended use, no unique safe implementation is possible, or an unknown involving permission, money, key data, irreversible state, external commitment, or active scope must be decided by an Owner first. The reviewer does not recommend direct implementation, though the Owner may explicitly accept risk. |
| `major` | 重要风险 | The gap materially changes behavior, acceptance, or risk, but work can continue after correction, narrowed scope, an explicit limitation, or Owner risk acceptance. |
| `minor` | 轻微问题 | The issue does not change behavior; it affects clarity, linkage, or traceability. Omit wording taste. |

Risk probes increase review depth and never decide severity by themselves.

## Finding quality and return routing

Every Finding has one report-local `FND-###`, severity/PM label, affected `bundle_root` plus full bundle-relative Markdown/Pen locators, evidence, gap/contradiction, two-interpretation example, user/business impact, exact return target, required Owner, and closure evidence. Valid internal targets include:

- `clarify ...md#DEC-###`
- `brainstorm ...md#DEC-###`
- `context/Owner confirmation ...md#DEC-###`
- `experience correction experience/prototype.pen#<node-id> -> ...md#RULE-###`
- `clarify whether the Finding is implementation-only and therefore outside this product Review`

Do not supply a final product answer unless the authority already makes it unambiguous.

## Status recommendation and re-review

- Recommend `findings-open` when this report raises any new Finding, or a prior `addressed-awaiting-review` item fails/extends verification.
- Recommend `passed` only when there is no current Finding and all prior Findings in scope are verified `closed/withdrawn`, with no accepted risk.
- Recommend `accepted-risk` only when the Delivery already shows explicit Owner acceptance for every residual Finding and nothing remains open/awaiting review. A Reviewer does not create that acceptance.

On focused re-review, name the prior report/FND, exact `bundle_root` and bundle-relative locators checked, evidence, and conclusion. A Reviewer may verify `closed` or `withdrawn` in the new report; `pm-handoff` later records it in the mutable register. Scope/shared-model/permission/lifecycle or Experience-target/source/preview changes require a full review. Never mutate the Delivery, `.pen` source, or original report.

Check current-state downgrade before recommending a status. A Finding-driven candidate change must be `findings-open` with affected items `addressed-awaiting-review`. Any other authoritative behavior or included-Experience change with no pending Finding must make the previous report historical and current status `not-run` until a new Review or explicit skip. Preserve historical/accepted-risk register entries; never treat them as proof that the changed candidate is still `passed`.

## Required PM-facing handoff

Finish every report with one explicit choice:

- For `findings-open`, show severity counts with PM labels, plain issue titles/impact, and recommended order. Ask once whether to return the internal payload to `pm-handoff` for recommended corrections and Owner decisions.
- For `passed`, say the reviewed scope passed and no snapshot or production release occurred. Ask once whether to return to `pm-handoff` for explicit handoff to development.
- For `accepted-risk`, show the plain-language accepted limitations, then ask once whether to return for the explicit handoff decision.

Do not show report paths, Candidate roots, IDs, hashes, or locators in ordinary PM copy; provide them only on an explicit traceability request. Keep conclusions immutable after runtime records the report. Pass `review_path`, `bundle_root`, `reviewed_scope`, `experience_identity`, `pen_structure_verification`, ordered FND IDs, conclusions, and return targets internally to `pm-handoff`. Never answer a Finding, choose for an Owner, edit product facts, accept risk, or create a Release during handoff.

The Owner's Experience confirmation concerns whether the exact preview/reference expresses approved tasks, states, actions, feedback, recovery and scope. It does not approve brand or aesthetic quality and must not be described as real-user usability evidence.
