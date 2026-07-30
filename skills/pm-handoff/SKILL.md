---
name: pm-handoff
description: Continue an existing product Delivery after a Candidate is frozen and Review has returned or been explicitly skipped. Use from an explicit START-HERE.md to import immutable Review conclusions, route Finding decisions and re-review, complete the four handoff checks, obtain explicit development-handoff confirmation, create and send an immutable Release, record receipt acknowledgement, or process released-behavior Change Proposals. Stop at each external Owner or recipient confirmation.
---

# PM Handoff

## Verify the phase boundary

Require one explicit START-HERE.md. Read its Current state card first and continue when Phase is review, handoff, release, receipt, or change and Next skill is pm-handoff.

Accept one transition exception: an exact internal payload returned by pm-reverse-review may enter while the read-only Review card still says Phase review and Next skill pm-reverse-review. Verify the report identity and outcome first, then immediately update the same card to Next skill pm-handoff before any Finding or handoff work. Treat the payload as supporting context, never as authority over the Delivery.

For any other phase or route mismatch, report the recorded blocker and correct Next skill, then stop. Do not execute Definition or Experience work inside this Skill.

Load only:

- [review-resolution.md](references/review-resolution.md) when a Review report or Finding response is current;
- [release-and-change.md](references/release-and-change.md) when evaluating handoff, snapshot, sending, receipt, or released-behavior feedback;
- the exact Candidate/Release bundle, Review report, and evidence named by the current action.

## Import Review without impersonating the Reviewer

Verify the returned report path, bundle root, reviewed scope, Candidate/Experience identity, outcome, and ordered Findings. Keep the report immutable. Record its conclusion and Finding register in START-HERE, then set Phase handoff and Next skill pm-handoff.

For each Finding, follow [review-resolution.md](references/review-resolution.md):

1. explain the observable impact in plain language;
2. recommend the smallest correction, clarification, scope choice, Experience correction, or explicit risk choice;
3. ask the authorized Owner one decision;
4. persist exact words/date and disposition;
5. update the same state card and end the turn.

Never close or withdraw a Finding yourself. When correction changes Definition or Experience, set the correct current phase, blocker, allowed/forbidden boundary, pass condition, Next skill, and next action/Owner before routing to pm-definition or pm-experience. When independent verification is needed, set Phase review, before-review / ready, Current blocker none, Allowed now review, Next skill pm-reverse-review, and the exact re-review action/Reviewer, then stop.

When a phase owner returns a changed Candidate, verify its Candidate/Experience identity and correction evidence before changing Review facts. For a Finding-driven change, mark only the affected items `addressed-awaiting-review`, set `review_status: findings-open`, and preserve the prior report as historical. For another behavior or included-Experience change, preserve the report as historical, set `review_status: not-run`, and set the Review handoff check to missing. Then route a focused/full Review, or stop for an explicit risk-bearing skip/handoff choice. Definition and Experience Skills never own this disposition update.

## Prepare the handoff decision

Use [release-and-change.md](references/release-and-change.md) to evaluate Behavior, Experience, Review, and Confirmation separately. Preserve honest Review status and open Finding dispositions. A non-passed Review can satisfy the Review handoff check only through explicit dated PM/Owner risk-bearing handoff evidence.

When Behavior, Experience, and the honest Review choice are ready:

1. show the exact included scope, exclusions, known limitations, Review result, and Release meaning;
2. ask explicitly whether to “交付给开发”;
3. set Phase handoff, before-release / blocked, Current blocker to that confirmation, Allowed now handoff, Next skill pm-handoff, and forbid release;
4. end the turn.

A generic instruction to continue or finish is not handoff confirmation.

## Create and send the Release

Only on a later explicit handoff reply:

1. record the exact words/date in the Confirmation check;
2. clear Current blocker, set Phase release, before-release / ready, Allowed now release, Next skill pm-handoff;
3. immediately run:

    python3 <pm-delivery-skill-root>/scripts/validate_delivery.py --before-release <START-HERE.md>

On FAIL, keep the current phase, record the diagnostic blocker, and do not create or overwrite a snapshot. On PASS:

1. create the versioned immutable snapshot and MANIFEST described by [release-and-change.md](references/release-and-change.md);
2. verify the destination and never overwrite the current immutable Release;
3. send the exact Release to the recorded development recipient;
4. record sent evidence, set receipt_status pending, Phase receipt, before-receipt-close / blocked, Allowed now handoff, Next skill pm-handoff, and the recipient acknowledgement as the blocker;
5. explain that released means handed to development, not production launch, and end the turn.

The Validator is read-only advisory diagnostics. It provides observable PASS/FAIL evidence but does not intercept directly available snapshot, file, or sending tools.

## Close only after receipt

When the development recipient later acknowledges receipt:

1. record the exact acknowledgement/result/date while receipt_status remains pending;
2. set before-receipt-close / ready, Current blocker none, Allowed now receipt-close, Next skill pm-handoff;
3. immediately run:

    python3 <pm-delivery-skill-root>/scripts/validate_delivery.py --before-receipt-close <START-HERE.md>

On FAIL, keep receipt pending and record the blocker. On PASS, set receipt_status acknowledged, record the passed gate/date, set Phase complete, none / complete, Allowed now stop, Next skill none, and stop the PM round.

## Process released-behavior feedback

Use [change-proposal.md](assets/change-proposal.md) only when feedback changes observable product behavior. Keep implementation-only feedback under Engineering Questions. Preserve the immutable Release and ask the business Owner to approve or reject the proposal.

While the proposal is open, keep Phase change and Next skill pm-handoff. On rejection, retain the proposal as evidence and keep the current Release authoritative. On later explicit approval, record the exact words/date, create a new Draft round, set Phase definition, none / ready, Current blocker none, Allowed now definition-work, forbid downstream actions, set Next skill pm-definition and Next action / owner to define the approved change / PM Agent, then stop.

## Exit result

Leave either a precise return route, a pending external confirmation, or an acknowledged immutable Release. Never silently decide product truth, accept risk for an Owner, edit a Review report, or manage engineering implementation.
