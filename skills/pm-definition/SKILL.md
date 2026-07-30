---
name: pm-definition
description: Continue the Definition phase of an existing product Delivery from an explicit START-HERE.md, turning raw or structured input into a bounded Product Contract, business logic, decisions, and acceptance scenarios. Use for a new Delivery routed by pm-delivery, unresolved Definition decisions, or a Definition return from Review, Experience drift, or an approved Change Proposal. Route one material product-direction decision to pm-brainstorm when useful; stop before Experience work.
---

# PM Definition

## Verify the phase boundary

Require one explicit START-HERE.md. Read its Current state card first and continue only when Phase is definition and Next skill is pm-definition. If they disagree, report the recorded blocker and correct Next skill; do not repair or execute another phase by inference.

Read only:

1. [intake-and-routing.md](references/intake-and-routing.md);
2. the current raw evidence and Definition bundle files named by START-HERE;
3. [logic-and-scenarios.md](references/logic-and-scenarios.md) when product direction is known or a behavior tuple must be completed.

Do not preload Experience, Pen, Review-resolution, Release, or receipt references.

## Establish the current Definition

1. Preserve raw input as dated evidence-only material.
2. Classify input maturity and product-effect scope. Choose compact or multi-file layout from [small-delivery.md](assets/small-delivery.md), or [product-foundation.md](assets/product-foundation.md) plus [capability-slice.md](assets/capability-slice.md).
3. For a Product, bound one Active Slice and only its explicit shared dependencies before expanding questions.
4. Persist confirmed facts, assumptions, conflicts, open questions, rejected choices, sources, affected locators, and the authorized Owner in the current bundle.
5. Ask only when different answers change what a user can see, do, receive, or recover from. Give one recommendation, example, impact, alternatives, trade-off, and Owner.
6. Update the same state card after every accepted answer or newly exposed blocker. Keep Phase and Next skill as definition and pm-definition while Definition remains open.

Use Chinese and plain business language with the PM. Keep IDs, bundle roots, locators, enum names, and internal routes out of ordinary questions unless traceability is requested. Never ask for implementation architecture, APIs, storage, modules, technical tests, deployment, estimates, credentials, Git, CLI, YAML, or MCP.

## Use the optional brainstorm expert

Route exactly one materially ambiguous recorded Decision Node to pm-brainstorm only when the Delivery entry, bundle root, full bundle-relative Decision locator, confirmed context, constraints, affected locators, rejected options, and Owner already exist.

The expert returns a Decision Patch to pm-definition. Verify authority, merge the authorized choice into the owning Definition files, update affected logic/scenarios, and retain rejected options. If the expert is unavailable, use the minimal fallback in [logic-and-scenarios.md](references/logic-and-scenarios.md). Do not route a generic idea or whole PRD to the specialist.

## Stop for Owner decisions

Before asking for any behavior-changing answer:

1. persist the current node and recommendation;
2. set Current blocker to the exact unresolved decision;
3. keep Allowed now within definition-work;
4. set Next skill to pm-definition and Next action / owner to the one requested decision;
5. end the turn.

A generic request to continue is not a product decision or Definition approval.

## Exit to Experience

Apply the Definition-exit test in [logic-and-scenarios.md](references/logic-and-scenarios.md). Require every included critical path to have one actor/authority, start, event, guard, success result, failure/recovery, and side effects; resolve applicable risk probes; expose every behavior-changing assumption or conflict.

Show the bounded Definition, explicit exclusions, known limits, and recommended next Experience decision. Ask the PM/business Owner for an explicit Definition approval and end the turn. On a later explicit reply:

1. record the exact approval words/date in the Decision snapshot;
2. update the sole state card to Phase experience, none / ready, Current blocker none, Allowed now experience-work, and forbid Pen mutation/Candidate/Review/Handoff/Release;
3. set Next skill to pm-experience and Next action / owner to select the Experience target / PM Agent;
4. stop without loading pm-experience or its references.

## Exit result

Leave one current Definition bundle, one explicit approval record, an honest decision inventory, and a state card that names exactly pm-experience. Do not create an Experience Brief, mutate Pen, freeze a Candidate, run Review, or create a Release.
