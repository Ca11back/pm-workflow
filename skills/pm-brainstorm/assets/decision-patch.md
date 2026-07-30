# Decision Patch：{Decision title}

## Context

- Delivery / Candidate bundle root：{Delivery path} / {physical bundle root}
- Decision locator：`{file}.md#DEC-001`
- Open question：{one observable product decision}
- Input refs：{authoritative facts and evidence paths}
- Confirmed context（do not reopen）：{path#IDs and decisions}
- Constraints / Owner：{constraints} / {authorized person or role}
- Affected locators：{path#RULE/STATE/EVENT/SCN/artifact IDs}

## Options

### Option A — {name}

- Observable behavior：{user, stage, event, result}
- Example：Given {context}; When {event}; Then {result}.
- Benefit / trade-off：{benefit} / {cost or risk}
- Reversibility：{easy/limited/hard and why}
- Evidence fit / assumptions：{refs/assumptions}
- Affected locators：{path#IDs}

### Option B — {name}

- Observable behavior：{behavior}
- Example：Given {context}; When {event}; Then {result}.
- Benefit / trade-off：{benefit} / {cost or risk}
- Reversibility：{assessment}
- Evidence fit / assumptions：{refs/assumptions}
- Affected locators：{path#IDs}

### Option C — {optional third material direction}

- Observable behavior / example / benefit / trade-off / reversibility / evidence / affected locators：{details}

## Recommendation and Owner decision

- Recommendation / evidence：{A/B/C} / {why it fits now}
- Strongest downside：{honest trade-off}
- Owner decision：`open | selected A | selected B | selected C`
- Owner words / rationale / date：{record}
- Rejected options and reasons：{record}

## Return to pm-definition

- Patch path：{path}
- Delivery / bundle root / Decision locator：{Delivery path} / {physical bundle root} / `{file}.md#DEC-001`
- Fact updates：{confirmed/assumption/open/rejected changes}
- Logic/scenario updates：{path#IDs}
- Next downstream node：{full path#DEC or none}
- Merge authority：`pm-definition`; this patch is not a Release and cannot advance lifecycle by itself.
