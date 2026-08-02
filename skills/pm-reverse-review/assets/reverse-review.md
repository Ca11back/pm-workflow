# Reverse Review：{Delivery / Candidate}

## Review identity

- Review ID / report path：`REV-{slug}-001` / `reviews/{file}.md`
- Candidate ID / manifest SHA-256：{CAND-*} / {hash}
- Entry / immutable bundle root：{generated START-HERE.md path} / {physical bundle root}
- Lifecycle / intended use：`candidate` / `implementation | engineering-review | prototype`
- Reviewed scope / artifacts：{bundle-relative files/path#IDs and manifest entries}
- Experience target / status / reason：`not-needed | existing-reference | pen` / `pending | completed | skipped-risk` / {plain-language reason, `owner-skipped`, or `tool-unavailable`}
- Included Experience：{brief, `.pen` source, exact previews, Agent/human visual-review evidence, visual role, structural read-back, covered Markdown/Pen-node locators}
- Experience adequacy：`pen-implementation-target | exact-existing-reference | explicit-skipped-risk | not-needed-non-visible | gap` / {user-visible-scope test and evidence}
- Experience lifecycle authority：`experience/manifest.md` plus generated `START-HERE.md` / {route, status, source and preview agreement; Definition files are not mutable lifecycle snapshots}
- Multi-state relationship check：{each approved Coverage ID and its relationship statement; agreement across Brief/Pen read-back/manifest; any contradiction with approved behavior}
- Pen structure verification：`direct-read-only | isolated-copy | preview-and-recorded-read-back-only | not-applicable` / {evidence or explicit limitation}
- Isolated-copy boundary / cleanup：`not-used | authorized-copy-cleaned | authorized-copy-retained` / {caller-authorized scope evidence and exact cleanup result}
- Review mode / date：`self-check | isolated-same-model | independent-model | human` / {date}
- Source session/model / reviewer session/model：{known identity or `unknown`} / {known identity or `unknown`}
- Reviewed manifest：{exact files and versions}
- Prior report/findings for re-review：{paths/FND IDs or none}

## Result

- Recommended status：`passed | findings-open | accepted-risk`
- Finding counts：`blocker={n} · major={n} · minor={n}`
- PM summary：`必须确认={n} · 重要风险={n} · 轻微问题={n}`
- Verified prior dispositions：{FND -> closed/withdrawn/still-open or none}
- Accepted-risk items observed in Delivery：{FND IDs or none}
- Candidate change since prior Review：`none | finding-driven -> findings-open/addressed-awaiting-review | other behavior/included .pen/preview -> not-run` / {evidence and historical report path}
- Scope limitation：{not reviewed / unavailable material}

> Any new Finding makes this report `findings-open`, regardless of severity. Same-session work is `self-check` and is never described as independent. This report never edits product facts, accepts risk, changes runtime state, creates a Release snapshot, or hands work to development.

## Behavior tuples checked

| Affected path#ID | Actor | Start | Event | Guard | Success | Failure/recovery | Side effects |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `delivery.md#RULE-001` | {actor} | {stage} | {event} | {condition} | {result} | {result} | {effects} |

## Findings

### FND-001 — {title}

- Severity / PM label：`blocker | major | minor` / `必须确认 | 重要风险 | 轻微问题`
- Affected bundle root / locators：{physical bundle root} / {full bundle-relative Markdown/Pen locators}
- Evidence：{file and section references}
- Gap / contradiction：{fact}
- Two interpretations / counterexample：{A versus B}
- User/business impact：{observable consequence}
- Exact internal return target：`clarify <path#DEC> | brainstorm <path#DEC> | context/Owner confirmation <path#DEC> | experience correction <experience/prototype.pen#node -> path#RULE> | Change Proposal <path>`
- Required Owner：{person/role}
- Closure evidence：{updated path#IDs/scenarios/artifact and focused/full re-review}
- Initial disposition：`open`

## Source-to-claim exceptions

| Claim / path#ID | Fact status | Source/authority issue | Finding |
| --- | --- | --- | --- |
| {claim/locator} | {status} | {issue} | `FND-001` |

## PM-facing result

- PM summary / order：{plain issue titles, user/business impact, PM severity labels and recommended order; no internal paths, IDs, hashes or locators}
- Generated next action：return the immutable report binding to `pm-handoff`; that Skill asks the next Owner decision.

## Internal route payload (not ordinary PM copy)

- `review_path={path}`
- `outcome={findings-open | passed | accepted-risk}`
- `bundle_root={physical Candidate root}`
- `reviewed_scope={bundle-relative paths#IDs}`
- `experience_identity={brief/source/previews/node locators}`
- `pen_structure_verification={scope/result}`
- `finding_ids={ordered IDs or none}`
- `return_targets={one exact target per Finding}`
- `conclusions={dispositions}`
The reviewer does not resolve facts, accept risk, edit the report after runtime binding, edit the Delivery, create a Release, or hand work to development.
