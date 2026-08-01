# Decision Patch：{Decision title}

## Revision binding

- Delivery root：{Delivery root}
- Draft root：`draft/`
- Base draft revision：{exact generated `draft_revision`}
- Decision locator：`draft/{file}.md#DEC-001`
- Patch identity / path：{PATCH identifier} / {separate patch path}
- Owner：{authorized person or role}

## Context

- Open observable question：{one decision}
- Authoritative facts / evidence：{current Draft locators and source paths}
- Confirmed context not to reopen：{path#IDs}
- Constraints / affected locators：{constraints} / {path#RULE/STATE/EVENT/SCN IDs}

## Options

### Option A — {name}

- Observable behavior / example：{behavior} / Given…When…Then…
- Benefit / trade-off / reversibility：{details}
- Evidence fit / assumptions / affected locators：{details}

### Option B — {name}

- Observable behavior / example：{behavior} / Given…When…Then…
- Benefit / trade-off / reversibility：{details}
- Evidence fit / assumptions / affected locators：{details}

### Option C — {optional material third direction}

- Observable behavior / example / trade-off / reversibility / evidence / locators：{details}

## Recommendation and Owner decision

- Recommendation / strongest downside：{A/B/C and evidence} / {honest cost}
- Owner decision / exact words / date：`open | selected A | selected B | selected C` / {evidence}
- Rejected options and reasons：{record}

## Return to Definition

- Fact updates：{confirmed/assumption/open/rejected changes}
- Logic/scenario updates：{path#IDs}
- Next downstream Decision：{full Draft path#DEC or none}
- Merge authority：`pm-definition`

> This patch is untrusted semantic input, not a lifecycle artifact. `pm-definition` must record it against the same base Draft revision before merge. It is never a Candidate or Release.
