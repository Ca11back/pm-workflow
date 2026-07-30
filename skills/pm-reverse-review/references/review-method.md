# Reverse review method

## Authority reconstruction

Start from the Delivery's `START-HERE.md`, then follow the selected Candidate/Release `bundle_root`, manifest, and reading order. Record every physical root, bundle-relative path, and version reviewed. Verify included scope, shared dependencies, exclusions, lifecycle, Review status, intended use, Experience brief/source/previews/read-back, current pointer, and supersession links. Verify that Draft and Release keep the same internal shape and that no snapshot locator points back to mutable Draft. Reject `released/superseded + prototype/engineering-review`; those uses are Draft-only and snapshots must use `implementation`. Chat, old PRDs, prototypes, and evidence do not override Markdown behavior.

For each behavior-bearing claim, record its source location, fact status, authority, and affected full bundle-relative `path#ID`. Flag unsourced `confirmed` claims, AI assertions promoted without Owner confirmation, hidden conflicts, stale links, duplicate file-local IDs when the path is missing, and any visual behavior or Pen node not mapped back to Markdown.

For an included `.pen` artifact, use a read-only direct capability or an isolated copy/output inside the caller-authorized write scope. Verify the destination before writing, never mutate or save the authoritative artifact, and remove only the exact isolated copy when cleanup is authorized. Perform state read, batched node read, layout inspection, and targeted screenshot comparison only. Record whether `.pen` structure was independently verified and whether authorized cleanup completed. If no authorized isolated copy or direct inspection is available, inspect the exact exported previews and Experience read-back evidence and disclose the structural limitation.

Reconstruct the Experience routing decision before judging artifact quality. For current user-visible scope, accept only a completed Pen `implementation-target`, an exact authoritative `existing-reference` covering all required normal and material boundary states, or explicit `skipped-risk` evidence for Owner skip/tool unavailability with the concrete impact. For non-user-visible scope, `not-needed` must state why no page, action, copy, visibility, state, feedback, or result changes. An `exploration` artifact remains Definition evidence and cannot satisfy Candidate readiness. Treat a missing, stale, or contradictory route as a Finding while preserving the Owner's later ability to accept risk and hand off.

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
- `Change Proposal changes/CP-*.md` for a released snapshot

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

Do not show report paths, Candidate/Release roots, IDs, or locators in ordinary PM copy; provide them only on an explicit traceability request. Write `handoff_state=awaiting-user-choice` before asking. On the later answer, change only that Reviewer-owned routing field to `return-to-pm-handoff` or `report-only`; keep the report conclusions immutable. If accepted, pass `review_path`, `bundle_root`, `reviewed_scope`, `experience_identity`, `pen_structure_verification`, ordered FND IDs, dispositions/conclusions, and return targets internally to `pm-handoff`. If declined/report-only, stop. Never answer a Finding, choose for an Owner, edit product facts, accept risk, update actual Review status, or create a Release during handoff.
