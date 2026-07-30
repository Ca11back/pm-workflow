# Reverse Review：{Delivery / Candidate / Release}

## Review identity

- Review ID / report path：`REV-{slug}-001` / `reviews/{file}.md`
- Entry / Candidate or Release bundle root：{required START-HERE.md path} / {physical bundle root and ID}
- Lifecycle / intended use：`draft` / `implementation | engineering-review | prototype`；或 `released | superseded` / `implementation`
- Reviewed scope / artifacts：{bundle-relative files/path#IDs and manifest entries}
- Experience target / status / reason：`not-needed | existing-reference | pen` / `pending | completed | skipped-risk` / {plain-language reason, `owner-skipped`, or `tool-unavailable`}
- Included Experience：{brief, `.pen` source, exact previews, visual role, sync/read-back, covered Markdown/Pen-node locators}
- Experience adequacy：`pen-implementation-target | exact-existing-reference | explicit-skipped-risk | not-needed-non-visible | gap` / {user-visible-scope test and evidence}
- Pen structure verification：`direct-read-only | isolated-copy | preview-and-recorded-read-back-only | not-applicable` / {evidence or explicit limitation}
- Isolated-copy boundary / cleanup：`not-used | authorized-copy-cleaned | authorized-copy-retained` / {caller-authorized scope evidence and exact cleanup result}
- Review mode / date：`independent-agent | separate-pass` / {date}
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

> Any new Finding makes this report `findings-open`, regardless of severity. This report never edits product facts, accepts risk, changes the actual Review register, creates a Release snapshot, or hands work to development.

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

## PM-facing handoff (required)

- PM summary / order：{plain issue titles, user/business impact, PM severity labels and recommended order; no internal paths, IDs or locators}
- User question（保留匹配结果的一条）：
  - `findings-open`：本次发现 {摘要}，建议按 {顺序} 处理。是否切回 `pm-handoff`，由它给出修正建议并记录 Owner 决定？
  - `passed`：本次候选范围审查通过，但尚未创建快照或交付开发。是否切回 `pm-handoff` 进行明确交付确认？
  - `accepted-risk`：本次仍有 Owner 已接受的限制：{普通中文摘要}。是否切回 `pm-handoff` 核对限制并决定是否交付开发？

## Internal route payload (not ordinary PM copy)

- `review_path={path}`
- `outcome={findings-open | passed | accepted-risk}`
- `bundle_root={physical Candidate or Release root}`
- `reviewed_scope={bundle-relative paths#IDs}`
- `experience_identity={brief/source/previews/node locators}`
- `pen_structure_verification={scope/result}`
- `finding_ids={ordered IDs or none}`
- `return_targets={one exact target per Finding}`
- `conclusions={dispositions}`
- `handoff_state={awaiting-user-choice | return-to-pm-handoff | report-only}`

Ask once. The reviewer does not resolve facts, accept risk, edit the Delivery, create a Release, or hand work to development.
