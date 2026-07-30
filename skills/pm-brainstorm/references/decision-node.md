# Decision Node method

## Required artifact context

- `bundle_root`: the exact physical Candidate bundle root, passed separately.
- `decision_locator`: one complete bundle-relative `path#DEC-###` and one plain-language question.
- `delivery_path` and current Candidate identity.
- `input_refs`: authoritative facts and evidence needed for this node.
- `confirmed_context`: locators and decisions that must not be reopened.
- `constraints`: business, authority, risk, scope, and Experience boundaries.
- `affected_locators`: Rule, State, Event, Scenario, Slice, and artifact paths that may change.
- `owner`: who can decide, including when the PM must take options to another Owner.
- `rejected_options`: prior choices and reasons.

Retrieve missing facts from the Delivery when possible. If there is no valid Delivery path or Decision locator, return the original input to `pm-delivery`; do not gather internal fields one by one from the PM. Ask a content question only after the artifact boundary is valid and only when it prevents a meaningful comparison.

## Material option test

An option is material only if it changes who can act, when, what stage exists, what result or side effect occurs, how failure recovers, what is promised, or what enters the current candidate. Merge options that differ only by implementation.

For each of 2–3 options record:

- plain-language name and behavior summary;
- representative Given/When/Then example;
- affected `path#ID`s and downstream decisions;
- user/business benefit;
- concrete trade-off or risk;
- reversibility and future Change consequence;
- evidence/constraint fit and unresolved assumption.

Recommend the best fit for current evidence, not a universal best practice. Expose the strongest downside. Money, permission, personal data, compliance, irreversible state, and external commitments require the actual business Owner.

## Decision discipline

Ask one Owner question. A useful card says: situation → recommendation → why → alternatives → trade-off → example → Owner. Keep bundle roots, locators, and internal enum fields out of the PM-facing card unless traceability is explicitly requested. Never ask for an API, database, module, architecture, test framework, or estimate.

Output a patch whether selected or still open. The patch records candidate reasoning; only `pm-definition` merges authorized facts, updates the Definition, and advances to the Experience boundary.
