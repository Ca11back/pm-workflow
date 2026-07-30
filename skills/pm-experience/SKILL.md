---
name: pm-experience
description: Continue the Experience and Candidate-preparation boundary of an existing product Delivery from an explicit START-HERE.md after Definition approval. Use to choose the Experience target, create and approve an Experience Brief, perform proportional direct Pen authoring, obtain a later rendered-preview approval, freeze the Candidate, and route new Review choices or return a changed post-Review Candidate to pm-handoff. Stop at every Owner approval and never perform Review resolution or Release work.
---

# PM Experience

## Verify the phase boundary

Require one explicit START-HERE.md. Read its Current state card first and continue only when:

- Phase is experience or candidate; and
- Next skill is pm-experience.

If they disagree, report the recorded blocker and correct Next skill, then stop. A legacy exploration still in Definition returns to pm-definition; do not continue it as an implementation target by relabeling.

Read only:

1. [experience-and-prototype.md](references/experience-and-prototype.md);
2. the current state card, approved Definition bundle, and directly referenced Experience evidence;
3. [pen-direct.md](references/pen-direct.md) only after the target is pen.

Do not load Review-resolution, Release, receipt, or Change references.

## Choose one honest Experience target

Choose not-needed, exact existing-reference, or pen using [experience-and-prototype.md](references/experience-and-prototype.md). Record the reason and proportional current scope. Request size never selects the route.

For not-needed or existing-reference, verify the recorded reason/identity and exact state coverage. Show the complete candidate preview in a form the PM can assess, keep Candidate unfinished, request a later explicit approval, update the card to keep Next skill pm-experience, and stop.

For pen, copy [experience-brief.md](assets/experience-brief.md), recommend the smallest concrete scope/fidelity in business language, and update the state card:

- Phase: experience
- Current gate / status: before-pen / blocked
- Current blocker: explicit scope/fidelity approval
- Allowed now: experience-work
- Forbidden now: pen-authoring, candidate-freeze, review, handoff, release, receipt-close
- Next skill: pm-experience
- Next action / owner: accept or change the concrete Brief / PM or business Owner

Show the Brief recommendation and end the turn. A generic request to continue is not approval.

## Run the before-Pen diagnostic

Only on a later explicit scope/fidelity reply:

1. record the exact words/date in START-HERE and experience/brief.md;
2. clear Current blocker, set before-pen / ready, allow pen-authoring, keep Next skill pm-experience;
3. immediately run:

    python3 <pm-delivery-skill-root>/scripts/validate_delivery.py --before-pen <START-HERE.md>

On FAIL, keep Phase experience, copy the missing evidence into Current blocker, restore blocked status, and stop or perform only allowed read-only repair. On PASS, follow [pen-direct.md](references/pen-direct.md) for the approved scope.

The Validator is read-only advisory diagnostics. A PASS is required evidence for the supervised flow, but the script cannot intercept a directly available effectful tool.

## Stop for rendered-preview approval

After Pen authoring, structural/visual checks, export, save, and read-back:

1. copy [experience-manifest.md](assets/experience-manifest.md) and record exact identities/results;
2. keep Experience status and Candidate gate unfinished;
3. show the rendered preview;
4. set Phase candidate, before-candidate / blocked, Current blocker to the later preview approval, Allowed now experience-work, Next skill pm-experience, and forbid candidate-freeze/Review/Handoff/Release;
5. ask for approval or changes and end the turn.

Only a later explicit PM/Owner reply may be recorded in both START-HERE and the Experience manifest. Resolve all feedback and missing coverage before continuing.

## Freeze the Candidate

After the later approval:

1. record the exact words/date in both authoritative evidence locations;
2. set before-candidate / ready, Current blocker none, Allowed now candidate-freeze, and Next skill pm-experience;
3. immediately run:

    python3 <pm-delivery-skill-root>/scripts/validate_delivery.py --before-candidate <START-HERE.md>

On FAIL, preserve Phase candidate, record the diagnostic blocker, and do not freeze. On PASS, record the passed gate/date, exact bundle root, manifest/reading order, included/excluded scope, Experience identity, and unresolved-feedback result.

If this Candidate changed after a current or historical Review, record only the exact correction evidence in the Experience/Candidate evidence. Do not edit Review status or Finding dispositions. Set Phase handoff, none / ready, Current blocker none, Allowed now handoff, Forbidden now review/release/receipt-close, Pass condition to reconcile the changed Candidate with Review history, Next skill pm-handoff, and Next action / owner to perform that reconciliation / PM Agent, then stop. `pm-handoff` owns the status downgrade or Finding disposition and the re-review/skip route.

Then recommend Reverse Review and ask the PM to choose Review or explicitly skip it. Keep Phase candidate, Next skill pm-experience, and stop for that choice; do not treat Candidate approval as a Review choice.

## Route at the durable boundary

On a later explicit Review choice:

- **Run Review:** set Phase review, before-review / ready, Current blocker none, Allowed now review, Next skill pm-reverse-review, and Next action / owner to run the bounded Review / Reviewer. Do not run Review here.
- **Skip Review:** record review_status skipped and the exact PM/Owner words/date, set Phase handoff, none / ready, Allowed now handoff, Next skill pm-handoff, and Next action / owner to evaluate the handoff checks / PM Agent.

Stop after updating the card. Do not load the next Skill, resolve Findings, ask for development handoff confirmation, create a Release, send it, or close receipt.

## Exit result

Leave a passed Candidate bound to one exact Experience identity and a state card naming exactly pm-reverse-review or pm-handoff.
