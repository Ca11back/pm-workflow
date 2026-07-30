# START HERE：{delivery title}

> 本文件是唯一可变入口和 current pointer。顶部状态卡是唯一 current phase/gate/action 投影；业务行为 authority 位于下列 Candidate/Release bundle，详细批准、Review、发送和接收证据留在各自权威段落。

## Current state card

- Phase：`definition | experience | candidate | review | handoff | release | receipt | change | complete`
- Current gate / status：`before-pen | before-candidate | before-review | before-release | before-receipt-close | none` / `blocked | ready | in-progress | passed | complete`
- Current blocker：{one missing evidence or `none`}
- Allowed now：`definition-work | experience-work | pen-authoring | candidate-freeze | review | handoff | release | receipt-close | change-work | stop` / {plain-language boundary}
- Forbidden now：{action IDs that would cross the current gate, or `none`}
- Pass condition：{the observable evidence required for the current gate}
- Next skill：`pm-definition | pm-experience | pm-reverse-review | pm-handoff | none`
- Next action / owner：{one concrete action} / {person or role}

> The action IDs are internal recovery markers, not a PM-facing menu. Detailed sections below record evidence and history; they do not define another current phase or next action.

## Identity and current pointer

- Delivery / path：`DEL-{slug}` / `product-deliveries/{delivery-id}/START-HERE.md`
- Scope / layout：`Change | Capability` / `compact`；或 `Capability | Product` / `multi-file`
- Input maturity：`Raw | Partial | Structured`
- Current draft bundle root：`draft/`
- Current Release：`none` 或 `releases/REL-{slug}-vN/`
- Lifecycle：`draft | released | superseded`
- Intended use：Draft 可为 `implementation | engineering-review | prototype`；`released | superseded` 必须为 `implementation`
- PM / business Owner：{names or roles}

## Current delivery scope

- Candidate / Release ID：`REL-{slug}-vN`
- Active unit or Slice：{一个可独立阅读的交付单元或纵向 Slice}
- Included files / shared dependencies：{相对 bundle root 的精确路径}
- Explicit exclusions：{planned / in-definition / not-released items}
- Known risks / limits：{具体风险；没有则写“当前未记录”}

## Candidate evidence

- Candidate gate result / date：`pending | passed` / {date or pending}
- Bundle root / manifest：`draft/` / {manifest path or exact included files and reading order}
- Included behavior / Experience：{bundle-relative Markdown paths} / {Brief/source/previews/manifest, exact existing reference, not-needed reason, or skip/unavailable evidence plus Owner continuation}
- Rendered preview shown / date：`no | yes` / {date}
- PM/Owner preview approval words / date：{`pending` until a later explicit reply; then exact words and date}
- Unresolved feedback：{behavior/visual target issue and return phase, or `none`}

## Four handoff checks

| Check | Status | Evidence or accepted risk |
| --- | --- | --- |
| Behavior | `done | missing | accepted-risk` | {required nodes/conflicts or Owner choice} |
| Experience | `done | missing | accepted-risk` | {target, artifact/justification or risk} |
| Review | `done | missing | accepted-risk` | {`done` only for passed; otherwise explicit PM/Owner risk-handoff words/date; do not alter open Findings} |
| Confirmation | `done | missing` | {explicit handoff words/date} |

## Experience evidence

- Target / status / reason：`not-needed | existing-reference | pen` / `pending | completed | skipped-risk` / {plain-language reason, `owner-skipped`, or `tool-unavailable`}
- Brief / source / previews：{`experience/brief.md` or none} / {`experience/prototype.pen` or exact reference} / {`experience/previews/*.png` or none}
- Experience manifest：{`experience/manifest.md` or none}
- Visual role / direct route：`exploration | implementation-target | none` / {route identity or `unavailable | none`}
- Scope/fidelity approval：{exact PM/Owner words/date recorded before Pen mutation, or `not-applicable`}
- Covered Markdown / Pen nodes：{bundle-relative path#IDs} / {`experience/prototype.pen#<node-id>` or none}
- Sync / structural / visual / save / read-back：`synced | drift | unverified | none` / {layout} / {targeted preview} / {status} / {affected-node comparison}
- Missing coverage：{roles, pages, states, scenarios or `none`}
- Skip/unavailable continuation：{`none` or exact PM/Owner words/date after the limitation and impact were shown}

## Review evidence

- Review status：`not-run | skipped | findings-open | passed | accepted-risk`
- Candidate bundle root / scope / included Experience：{physical root} / {bundle-relative paths and version/identity}
- Report / mode：{`reviews/...` or reason} / `independent-agent | separate-pass | not-run`
- Review validity / historical reports：`none | current | stale` / {old report paths and why the current status changed}

创建 Review Finding 后才保留本表：

| FND | Report | Severity | Return target | Affected path#IDs | Owner response | Disposition | Re-review scope/evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FND-001` | `reviews/...` | `blocker | major | minor` | {full path#ID or Change Proposal} | {locators} | {words/date} | `open | addressed-awaiting-review | closed | accepted-risk | withdrawn` | {scope/evidence} |

## Decision snapshot

- Inventory paths：{draft file sections}
- Progress：`known_required_open={n} · blocking_current_slice={n} · deferred={n} · owner_confirmation={n}`
- Definition exit evidence：{included critical-path locators; tuple gaps or complete coverage; relevant probes resolved/not-applicable; behavior-changing assumption/conflict locators or none}
- Definition approval words / date：{`pending` until a later explicit Owner reply; then exact words and date}
- Current node / internal presentation：`{bundle-relative path#DEC-### | none}` / `guided | small-batch | checklist`

## Authority reading order

1. 当前 bundle manifest：{path and reading order}。
2. 业务文件、shared definitions 和 scenarios：{bundle-relative paths}。
3. Experience brief/source/previews/read-back：{bundle-relative paths or none}。
4. 当前 Review 报告：{path or none}。
5. Evidence（只说明来源，不覆盖 Markdown Contract）。

## Release plan, sending, and engineering receipt

- Current / supersedes / superseded-by：{Release path or none} / {path or none} / {path or none}
- Planned Release / snapshot root：`REL-{slug}-vN` / `releases/REL-{slug}-vN/`
- Planned Release manifest / reading order：{exact files, scope/exclusions, Review/Experience binding, risks, intended use, and order}
- Release sent / date：`no | yes` / {recipient, Release ID/path, date, internal handoff payload; pending before send}
- Receipt status：`pending | acknowledged`
- Acknowledgement words / date：{recipient's explicit acknowledgement and result/reference / date; `pending` until received}
- Receipt-close gate result / date：`pending | passed` / {date or pending}

> `released` 只表示不可变快照已交付开发，不表示已经生产上线。发送后保持 `Receipt status: pending`；收到明确 acknowledgement 后先运行 `before-receipt-close`，PASS 后才改为 `acknowledged`、将状态卡设为 `complete / stop` 并结束本轮。
