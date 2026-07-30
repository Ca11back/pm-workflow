---
name: pm-reverse-review
description: Independently and read-only review one existing product Candidate or Release with an explicit entry path, scope, and artifact manifest against its evidence, Markdown contracts, scenarios, shared models, and Experience artifact. Use for a bounded pre-handoff review or re-review of recorded findings. If given only a generic or AI-generated PRD without a valid Delivery candidate, return it to pm-delivery first. Produce a report and verification conclusions only; never alter product facts, accept risk for an Owner, create a Release, or hand it to development.
---

# PM Reverse Review

## Establish a bounded artifact

Require an explicit `START-HERE.md` plus current Candidate/Release `bundle_root`, candidate/Release ID, requested scope, lifecycle, intended use, file manifest/reading order, and included Experience brief/source/previews/read-back identity. Verify that bundle-relative locators resolve inside that root, Draft and Release use the same internal shape, `prototype/engineering-review` is Draft-only, and every `released/superseded` snapshot uses `implementation`. If the input is only a PRD, prototype, idea, or chat request without this authority, stop and return the original material to `pm-delivery` for capture and candidate creation. Do not ask the PM to construct internal paths or IDs. If several valid candidates exist, list plain-language title, scope, lifecycle, and Review status for selection; keep exact roots/paths internal unless traceability is requested and never guess.

Read only the selected entry, referenced Markdown contracts/shared models/scenarios, evidence, and Experience artifacts needed for the scope. Treat evidence and visuals as supporting material, not authority. Inspect an included `.pen` artifact only through a read-only direct capability or an isolated copy/output inside the caller-authorized write scope; never mutate or save the authoritative Candidate/Release. Verify the destination before writing and clean up only the exact isolated copy when the caller permits cleanup. If no authorized isolated copy is available, use exported previews and recorded read-back evidence and explicitly state that `.pen` structure was not independently verified. Do not use chat memory or drafting intent to repair gaps. If no independent Agent is available, use a separate adversarial pass and record `review_mode: separate-pass`; never claim independence that did not occur.

Before starting a new report, inspect only existing Review report identities that bind to this exact Candidate/Release and Experience identity. If exactly one complete current report already contains the required internal route payload, do not repeat Review: for `awaiting-user-choice`, show its recorded plain-language outcome and stop for the one return choice; for `return-to-pm-handoff`, pass the unchanged payload to `pm-handoff`; for `report-only`, stop without asking again. If reports are absent, stale, incomplete, or ambiguous, continue with a new bounded Review or ask the PM to choose among plain-language scopes; never guess from recency.

Determine Experience adequacy independently of request size or layout. A current user-visible page, action, copy, visibility, state, feedback, or result change must have one of: a completed `pen` `implementation-target` with mapped source/previews/read-back, an `existing-reference` proven exact for every required page and material state, or explicit `skipped-risk` evidence naming Owner skip or tool unavailability and the concrete impact. For Pen, verify that `experience/brief.md` and explicit dated PM/Owner acceptance of its concrete scope/fidelity predate the first mutation. Also require a later explicit PM/Owner preview-approval reply, recorded with exact words/date in both authoritative evidence locations, before Candidate passed. A tool-unavailable claim must include route discovery, capability check, a concrete direct-operation attempt, and the applicable retry result. If Candidate passed without the formal Pen artifact, require the PM/Owner's explicit dated continuation choice after the limitation and impact were shown. `not-needed` is valid only for a scope with no user-visible change, and an `exploration` visual never qualifies a Candidate. Missing or contradictory evidence becomes a Finding; it does not turn Review into a hard release gate.

Before writing any report, resolve the sibling `pm-delivery` skill root and run `python3 <pm-delivery-skill-root>/scripts/validate_delivery.py --before-review <START-HERE.md>`. A nonzero result means there is no valid reviewable Candidate: stop, return the validation gaps to `pm-experience`, and do not create or simulate a report or `passed` result.

Only after that gate passes, read [review-method.md](references/review-method.md) and [risk-probes.md](references/risk-probes.md), then copy [reverse-review.md](assets/reverse-review.md) to `reviews/` inside the caller-authorized write scope.

## Review from evidence to behavior

1. Build a source-to-claim map and verify fact status/Owner for behavior-bearing claims.
2. Normalize critical behavior into actor, start, event, guard, success, failure/recovery, and side effects.
3. Probe terminology, state/event ownership, permissions, money/data effects, exception/recovery, cross-contract references, Experience-target adequacy, and Markdown/Experience sync, including exact-reference coverage or Pen node/preview fidelity when present.
4. Try to construct two materially different observable implementations that both satisfy each critical statement. If possible, raise a Finding rather than choosing one.
5. Give every Finding evidence, affected bundle-relative `path#ID`/Pen-node locators, a counterexample, severity, PM label, Owner, closure evidence, and one exact return target in the report. The PM-facing summary uses only a plain title and impact.
6. On re-review, verify the supplied affected locators/evidence and state whether each prior Finding is `closed`, `withdrawn`, or still open. This is a new report conclusion; do not edit the original report or Delivery register.

## Status and separation of duties

Write only the Review report. Never edit Product facts, Decisions, scenarios, current pointers, lifecycle, intended use, evidence, Experience artifacts, or the actual Review register. Never silently resolve a contradiction, approve for an Owner, accept risk, create a snapshot, or hand it to development.

Recommend:

- `passed` only when the current reviewed candidate has no new/open Finding and no accepted-risk Finding;
- `findings-open` when any Finding is new/open or an addressed item still fails verification;
- `accepted-risk` only when the Delivery already records explicit Owner acceptance for every residual Finding and no item remains pending.

Any Finding found in this review starts open regardless of severity; a report cannot be `passed` while listing a residual major/minor Finding. Review is recommended but not a release gate: `pm-handoff` and the Owner may later hand off with an honest non-passed status.

## Required handoff

After writing the report with `handoff_state=awaiting-user-choice`, perform the outcome-specific handoff in [review-method.md](references/review-method.md). Show the PM plain-language outcome, counts, issue titles/impact, and recommended order; do not display report paths, bundle roots, IDs, or locators unless traceability is explicitly requested. Ask once whether to return to `pm-handoff` for decisions or handoff. For `passed`, say that no Release was created and offer to return for the explicit “交付给开发” choice. On the later choice, update only this routing field in the Reviewer-owned report: `report-only` when declined, or `return-to-pm-handoff` when accepted; never change conclusions or product facts. For `report-only`, stop without asking again. For `return-to-pm-handoff`, end the reviewer role and pass the exact internal context—including `review_path`, `bundle_root`, locators, and Experience verification scope—to `pm-handoff` without editing the state card. The read-only reviewer leaves Next skill unchanged; `pm-handoff` owns the verified return transition.
