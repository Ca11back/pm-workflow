# Release and change

## Candidate exit before the four handoff checks

Candidate is a lifecycle phase, not a fifth check. Before Review or handoff, record a passed Candidate gate with:

- the exact `bundle_root`, included Markdown/Experience files, shared dependencies, and reading order;
- included/excluded scope and known risks;
- Experience brief/source/previews/manifest and read-back status when applicable;
- evidence that the complete preview was shown to the PM;
- no unresolved feedback that changes behavior or the visual target.

While this evidence is incomplete, the state card remains on `before-candidate`. Only after the gate passes may it move to `before-review`.

## Four checks before handoff

Before asking for “交付给开发”, evaluate only these checks:

1. **Behavior** — scope, rules, conflicts, and required Decision Nodes are resolved, or the Owner explicitly accepts the named risk.
2. **Experience** — the current user-visible scope has a completed Pen implementation target, an exact existing reference, or explicit skip/unavailable evidence with a visible limitation and risk choice; a non-user-visible scope may be justified as not needed.
3. **Review** — the candidate is `passed`; or, for `skipped`, `findings-open`, or `accepted-risk`, the PM/Owner has seen the exact limitations and explicitly chosen a risk-bearing handoff.
4. **Confirmation** — the PM explicitly confirms the handoff.

After Candidate passes, the state card points to the first unmet check. Mark Review `done` only for `passed` (a completed Review with no Finding). Mark it `accepted-risk` for `skipped`, `findings-open`, or `accepted-risk` only after the explicit handoff choice; before that it is `missing`. This check is handoff evidence, not a Finding disposition: open Findings remain open and `review_status` remains honest. If the PM asks to hand off early, state the exact missing item, consequence, and one risk option. Once the PM/Owner accepts, record the choice and stop persuading.

## Honest statuses

Keep these fields separate, but enforce their legal combinations:

```text
lifecycle: draft | released | superseded
review_status: not-run | skipped | findings-open | passed | accepted-risk
intended_use: implementation | engineering-review | prototype
```

`draft` may use any intended-use value. `prototype` and `engineering-review` are Draft-only. A `released` or `superseded` snapshot must use `implementation`. Review status remains separate from this lifecycle/use constraint, so any honest Review status may accompany an implementation Release after the Review check is done or explicitly accepted as risk.

- `passed`: the current candidate scope has no `open`, `addressed-awaiting-review`, or `accepted-risk` Finding.
- `findings-open`: at least one Finding is pending or changed and awaiting independent review.
- `accepted-risk`: no pending Finding remains, and at least one Finding is explicitly accepted by the Owner.
- `skipped`: this candidate was not reviewed and has no applicable open Finding. If a prior Finding still applies to this candidate, use `findings-open`; skipping never erases it.
- `not-run`: no Review choice has been made yet.

Finding disposition is `open / addressed-awaiting-review / closed / accepted-risk / withdrawn`. A Reviewer alone can verify `closed` or `withdrawn`; the Owner alone can choose `accepted-risk`. `released` means the implementation snapshot was handed to development, not that it passed Review or reached production.

## Create the immutable snapshot

After explicit PM confirmation, copy the exact Candidate bundle contents into:

```text
product-deliveries/<delivery-id>/releases/<release-id>/
```

For a first Release, `Current Release` is `none` before this copy. For a later behavior-change cycle, it continues to point to the prior immutable snapshot until the new snapshot is created; never clear or rewrite that prior pointer merely to pass `before-release`, and never reuse its Release ID/path.

Draft and Release must keep the same internal shape. Copy `delivery.md` or `foundation.md + slices/`, plus `experience/brief.md`, `experience/prototype.pen`, the exact preview exports reviewed by the PM/Reviewer, and `experience/manifest.md` when applicable. Do not rewrite any embedded locator: all Markdown and Pen node locators are already relative to the bundle root. Add `MANIFEST.md` with the exact file paths/versions and reading order, candidate scope/exclusions, Review report reference/status, risks/limits, `intended_use: implementation`, and creation date. Do not edit snapshot business or Experience content afterward. Update `START-HERE.md` as the mutable current pointer with `current_release_path`, lifecycle, status, supersession links, sending, and receipt. The pointer may gain relationship metadata; that is not a rewrite of the snapshot.

For a Product, copy only the named vertical Slice and exact shared dependencies. Future capabilities remain `planned`, `in-definition`, or `not-released`.

Show the PM the Release ID and the plain-language distinction: “这表示交付给开发；开发实现和生产上线还在流程之外。” Keep the exact snapshot path in the internal engineering payload unless the PM explicitly requests traceability. Record sending separately from receipt:

```text
release_sent: yes
sent_to: recipient/role
sent_at: date/time
receipt_status: pending | acknowledged
acknowledged_by: recipient/role or empty
acknowledged_at: date/time or empty
acknowledgement_result: reference/result or empty
```

Sending creates `pending` and moves the state card to `before-receipt-close`. Record explicit development acknowledgement while receipt remains pending, run the gate, then set `acknowledged` and `complete`. This receipt boundary does not make `pm-handoff` responsible for implementation management.

## Engineering feedback and Change Proposal

If feedback changes only API, storage, modules, architecture, library, deployment, technical tests, or estimates while observable behavior is unchanged, keep it in Engineering Questions. If it changes user-visible timing, stages, permissions, results, side effects, recovery, notifications, eligibility, reporting, or commitments, create `changes/CP-*.md` from [change-proposal.md](../assets/change-proposal.md) before editing facts.

The proposal must preserve the current snapshot, pass its physical `bundle_root` separately from affected bundle-relative Markdown/Pen locators, compare current and proposed behavior, trace direct/transitive effects, and state work to pause, continue, or not assume. The business Owner records `pending / approved / rejected` with rationale/date. On approval, create a new Definition → Experience → Candidate flow, run focused or full Review as appropriate, copy a new snapshot, and update mutable `supersedes`/`superseded-by`/current/sending/receipt metadata. On rejection, keep the old snapshot authoritative and retain the proposal as evidence. Never make history look as if it contained the later behavior.
