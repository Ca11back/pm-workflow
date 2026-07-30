# Change Proposal：{title}

## Identity and immutable baseline

- Proposal / path：`CP-{slug}-001` / `changes/CP-{slug}-001.md`
- Current Release ID / bundle root：`REL-{slug}-vN` / `releases/REL-{slug}-vN/`
- Current pointer：`START-HERE.md`
- Trigger / evidence：{engineering feedback or new business evidence path/date}
- Business Owner：{authorized person or role}
- Decision：`pending | approved | rejected`

> Do not edit the current Release snapshot. This proposal returns an approved behavior change to Definition.

## Current and proposed behavior

| Affected locator | Current released behavior | Proposed observable behavior | Reason / evidence |
| --- | --- | --- | --- |
| `delivery.md#RULE-001` | {current behavior} | {proposed behavior} | {constraint/evidence} |

## Transitive effects

| Area | Affected path#IDs / artifacts | Decision or update needed | Risk |
| --- | --- | --- | --- |
| Stages and timing | {STATE/EVENT locators} | {pending/success/failure} | {risk} |
| Money/inventory/fulfilment | {locators} | {refund/release/external confirmation} | {risk} |
| Duplicate/recovery | {SCN locators} | {retry/timeout/failure} | {risk} |
| Permission/notification/report/support | {locators} | {downstream behavior} | {risk} |
| Experience | {`experience/prototype.pen#node-id`, preview and mapped Markdown locators} | {page/state/content change} | {risk} |

## Engineering guidance before Owner decision

- Pause：{affected work that must not assume a candidate behavior}
- Continue：{unaffected work safe to continue}
- Do not assume：{unapproved product choice}

## Owner decision and new round

- Owner words / rationale / date：{decision}
- If approved, new draft / candidate：{paths} / `REL-{slug}-vN+1`
- Experience decision / artifact impact：{target, status, updated identity}
- Focused or full Review：{scope, status, report path}
- New snapshot path：`releases/REL-{slug}-vN+1/`
- Mutable index relations：new `supersedes={old path}`; old metadata `superseded-by={new path}`; `current={new path}`
- Release sent / receipt status：{recipient, new Release path, sent date} / `pending | acknowledged`
- Acknowledgement：{recipient, date and result; only `acknowledged` ends the round}

> If observable product behavior does not change, move the feedback to Engineering Questions and do not use this proposal.
