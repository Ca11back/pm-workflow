# Experience manifest：{Delivery / Draft title}

> Bundle-relative path：`experience/manifest.md`。物理 `bundle_root` 由 `START-HERE.md` 和 Agent route payload 分开传递，禁止在本文件固化 `draft/...` 定位。
>
> Create/copy this manifest only after `approve-brief` and, for Pen, after launch reaches `ready` or explicit termination. It is first bound by `approve-preview`; do not include it in Brief approval.

## Artifact identity

List every local file bound by Brief or preview approval. These are the only manifest fields parsed by the pre-freeze reference check; keep one exact bundle-relative path per line.

- Candidate artifact：`experience/brief.md`
- Candidate artifact：`experience/manifest.md`
- Candidate artifact：`experience/prototype.pen`
- Candidate artifact：`experience/previews/{file}.png`
- Candidate artifact：{add one line for every local reference, read-back, or justification artifact}

- Brief：`experience/brief.md`
- Pen source：`experience/prototype.pen`
- Preview exports：`experience/previews/{file}.png`
- Experience target：`pen`
- Direct route：`pen-interactive-direct | unavailable`
- Pen CLI version：{version or `unavailable`}
- Live interactive help read / date：`yes | no` / {date and non-secret result}
- Visual role：`implementation-target`
- Smallest scope / fidelity：{affected flow/pages/states} / {plain-language detail and interaction level}
- Scope/fidelity approval：{exact PM/Owner words/date recorded in `experience/brief.md` before the first mutation}

## Launch state

- Process state：`running | ready | terminated`
- Resumable handle retained：`yes | no | not-applicable`
- Initial prompt：`pending | seen | not-seen-at-termination`
- Terminal result：`none | exact non-secret exit/error/output`

> Empty output while the process is alive remains `running`. Do not mark the route unavailable, inspect final files as failure evidence, offer a downgrade, or launch another Pen process until an explicit terminal result exists.

## Coverage map

Copy each approval-bound Coverage ID and short relationship statement unchanged from `experience/brief.md`.

| Coverage ID | Markdown locator | Pen node locator | Preview/state | Runtime relationship | Sync result |
| --- | --- | --- | --- | --- | --- |
| `PAGE-01-NORMAL` | `delivery.md#RULE-001` | `experience/prototype.pen#<node-id-or-visible-name>` | {preview/page/state} | {approved relationship statement} | `synced | drift | unverified` |

## Direct-operation evidence

- App state / schema read：{result}
- Guidelines and document discovery：{scope/result}
- Direct mutation summary：{Brief-derived visible changes}
- Structural/layout read-back：{nodes/content/bounds, problems, fixes, final result}
- Coverage read-back：{Coverage IDs and states compared with Brief and Markdown}
- Preview file result：{exact PNG path, existence, and non-secret result}
- Agent visual capability / inspection：`agent-visual | human-required` / {result or explicit limitation}
- Preview presentation to Owner：`attached | rendered | local-path | unavailable` / {evidence/date}
- Save / clean exit：`yes | no` / {result or limitation}
- External assets / provenance / delivery permission：{asset} / {source} / `allowed | restricted | unknown`

## PM preview and Candidate result

- Preview shown / date：`yes | no` / {date}
- PM/Owner visual review：{exact context-bound review statement/date or `pending`}
- PM/Owner feedback：{plain-language feedback}
- PM/Owner preview approval words / date：{`pending` until a later explicit reply; then exact approval words and date}
- Behavior or visual drift：{bundle-relative return locator or `none`}
- Missing coverage：{roles/pages/states/scenarios or `none`}
- Experience status：`pending | completed | skipped-risk`
- Experience reason：{plain-language reason or `tool-unavailable`}
- Product risk：{one concrete product risk caused by the unavailable direct route; otherwise `none`}
- PM/Owner continuation：{explicit words/date accepting continuation without the formal artifact; `pending` until given, otherwise `none`}

> A non-visual Agent records `human-required`, presents the exact PNG to the Owner, and waits. Structural read-back is not visual inspection. If the preview cannot be presented to either the Agent or Owner, keep `Experience status: pending` and do not request preview approval.
>
> Only an explicit `terminated` failure may set `Experience status: skipped-risk`, `Experience reason: tool-unavailable`, and `Direct route: unavailable`. Record the exact terminal result and one product risk, then keep Candidate unfinished until the PM/Owner explicitly chooses to continue without the formal artifact. A live or unresolved process stays `pending`, never `skipped-risk`.
>
> An `exploration` artifact remains `pending`, stays in Definition, and cannot satisfy Candidate readiness. `completed` requires an `implementation-target` rechecked against current Markdown plus structural read-back, accessible preview, and later PM/Owner preview approval.
