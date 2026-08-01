# Review resolution

Handle one current `FND-*` at a time. Explain its observable impact, smallest recommendation, strongest trade-off, required Owner, and closure evidence. Ask one decision and stop.

## Deterministic dispositions

- `corrected`: the named Draft artifact changed. Record exact Owner evidence, artifact hash, and return phase. Runtime increments Draft revision and invalidates current Candidate/Review. A later Candidate and Review are mandatory.
- `accepted-risk`: the product owner explicitly accepts the named consequence. The Finding is not “fixed” or “closed”; runtime may allow Handoff only when every Finding has a non-open disposition.
- `withdrawn`: a reviewer/human-reviewer provides evidence that the Finding is inapplicable or false. The PM Agent cannot withdraw it.

Do not edit the immutable Review report. Do not erase historical Candidate/Review identity. Do not use a semantic correction to mutate a Candidate.

After a correction return, the owning Definition/Experience Skill updates Draft semantic files, re-obtains hash-bound approvals, freezes a new Candidate, and routes a new bounded Review. Use focused Review only when scope/shared models/permission/lifecycle/Experience identity remain unchanged; otherwise use full Review.
