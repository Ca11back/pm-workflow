# Delivery protocol

Use one human-readable Markdown Delivery as the durable product-fact source. Chat, raw evidence, prototypes, Review reports, and Validator output support the Delivery; they never become parallel business authorities.

## Minimal physical layout

Initialize only:

    product-deliveries/<delivery-id>/
      START-HERE.md
      draft/
        evidence/<dated-raw-input>.md

Let pm-definition choose and create the bundle shape:

    draft/
      delivery.md                         # compact Change or one readable Capability
      foundation.md + slices/<slice>.md  # multi-file Capability or Product
      experience/...                     # created only by pm-experience
    reviews/...                           # created only by pm-reverse-review
    releases/<release-id>/...             # created only by pm-handoff
    changes/...                           # created only for released-behavior change

Every Delivery has one root START-HERE.md. Draft and Release keep the same internal bundle-relative paths. A Release adds MANIFEST.md and is immutable; current/supersession/sending/receipt metadata remains in START-HERE.

## Sole current-state projection

Keep exactly one Current state card at the top of START-HERE with:

- Phase
- Current gate / status
- Current blocker
- Allowed now
- Forbidden now
- Pass condition
- Next skill
- Next action / owner

Persist these phases only: definition, experience, candidate, review, handoff, release, receipt, change, complete.

Persist exactly one legal route:

| Current work | Next skill |
| --- | --- |
| definition | pm-definition |
| experience or candidate preparation | pm-experience |
| bounded Review execution | pm-reverse-review |
| returned Review, handoff, release, receipt, or change | pm-handoff |
| complete | none |

The phase owner updates the card before stopping. The read-only Review expert returns an exact payload to pm-handoff without editing the card; pm-handoff verifies that payload and owns the return transition.

Detailed approval words/dates, Candidate manifest, Experience identity, Findings, risk choices, Release sending, and receipt evidence stay in their named sections. They support the card and never define another current phase, route, blocker, or next action.

## Identity and locators

Use readable IDs such as DEL-, REL-, ROLE-, OBJ-, CAP-, SLICE-, DEC-, RULE-, STATE-, EVENT-, SCN-, SRC-, REV-, FND-, and CP-. IDs need only be unique within their file.

Pass the physical bundle_root separately from every complete bundle-relative locator such as delivery.md#RULE-003, slices/refund.md#DEC-002, or experience/prototype.pen#<node-id>. Never ask the PM to type or ordinarily view these internal identifiers.

Preserve an ID when wording changes without changing behavior. Create a new version or Change Proposal for changed released behavior. Keep Draft and Release internal paths identical so snapshot copying does not rewrite locators.

## Fact status and authority

Record every behavior-bearing claim as one of:

- confirmed: authorized Owner or authoritative source confirmed it;
- assumption: explicitly provisional and assigned for confirmation;
- open: unresolved and behavior-affecting;
- conflict: incompatible claims remain unresolved;
- evidence-only: retained as input, not implementation authority;
- rejected: considered and not selected, with a reason.

An AI-polished statement remains evidence-only or conflict until authorized. A released Contract remains authoritative until an approved Change Proposal creates a later version.

## START-HERE detailed sections

Retain only the facts needed to reconstruct and audit the current Delivery:

- identity/current pointer and current scope;
- Candidate gate result, exact bundle manifest/reading order, exclusions, preview and later approval;
- Behavior, Experience, Review, and Confirmation checks;
- Experience target/status/reason and exact artifact identity;
- Review status/report/current binding and Finding register;
- Decision inventory, Definition-exit evidence, and Definition approval;
- authority reading order;
- planned/current Release, supersession, sending, pending receipt, acknowledgement, and receipt-close result.

The card alone owns current routing. No sidecar, database, service, or hidden session state is part of this protocol.

## Responsibility boundary

The PM/business Owner decides purpose, users, scope, rules, permissions, observable outcomes, exceptions, acceptance, and risk. Engineering decides APIs, storage, modules, architecture, technical tests, deployment, and estimates. If feasibility changes observable behavior, return an explicit Change Proposal to Definition.

The Validator reports only mechanical PASS/FAIL evidence and never writes the Delivery, makes a business judgment, represents Owner approval, or intercepts directly available effectful tools.
