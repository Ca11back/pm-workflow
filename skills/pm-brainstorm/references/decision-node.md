# Decision Node contract

Accept exactly one current Draft node with:

- Delivery root and `draft/` root;
- current generated `draft_revision`;
- full bundle-relative `draft/...md#DEC-*` locator;
- one observable question;
- confirmed context, evidence, constraints, Owner, affected locators, and rejected options.

Do not require a Candidate: Candidate identity does not exist until Experience approvals pass and runtime freeze succeeds.

Compare directions only when they change observable flow, permissions, lifecycle, results, recovery, external commitments, or risk allocation. Do not create false choices from wording, framework, storage, API, architecture, testing, deployment, or estimates.

Return a separate Decision Patch bound to the exact base Draft revision. `pm-definition` invokes `record-brainstorm-patch` before semantic merge. The runtime rejects a stale base; the expert never edits Draft, events, projections, Candidate, or Release.
