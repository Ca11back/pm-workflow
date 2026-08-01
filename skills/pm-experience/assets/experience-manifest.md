# Experience manifest：{Delivery / Draft title}

> Bundle-relative path：`experience/manifest.md`。物理 `bundle_root` 由 `START-HERE.md` 和 Agent route payload 分开传递，禁止在本文件固化 `draft/...` 定位。
>
> Create/copy this manifest only after `approve-brief` succeeds. It is mutable lifecycle evidence and is first bound by `approve-preview`; do not include it in Brief approval.

## Artifact identity

List every local file bound by Brief or preview approval. These are the only manifest fields parsed by the pre-freeze reference check; keep one exact bundle-relative path per line.

- Candidate artifact：`experience/brief.md`
- Candidate artifact：`experience/manifest.md`
- Candidate artifact：{add one line for every local route, design, preview, read-back, reference, or justification artifact}

- Brief：`experience/brief.md`
- Design coverage worksheet：`experience/design-input-plan.md` / {SHA-256}
- Pen source：`experience/prototype.pen`
- Approved design input：`experience/prototype-design.txt` / {SHA-256}
- Preview exports：{`experience/previews/<file>.png`}
- Experience target：`pen`
- Direct route：{route identity or `unavailable`}
- Runtime capability contract / fingerprint：{doctor contract} / {SHA-256 or none}
- Visual role：`implementation-target`
- Smallest scope / fidelity：{affected flow/pages/states} / {plain-language detail and interaction level}
- Scope/fidelity approval：{exact PM/Owner words/date recorded in `experience/brief.md` before the first mutation}
- Save status：`saved | failed | unavailable`
- Mechanical runner：`one process / one new-document session` / {runner JSON result or limitation}

## Coverage map

Copy each approval-bound Coverage ID and short relationship statement unchanged from `experience/brief.md` through `experience/design-input-plan.md`.

| Coverage ID | Markdown locator | Pen node locator | Preview/state | Runtime relationship | Sync result |
| --- | --- | --- | --- | --- | --- |
| `PAGE-01-NORMAL` | `delivery.md#RULE-001` | `experience/prototype.pen#<node-id>` | {preview/page/state} | {approved relationship statement} | `synced | drift | unverified` |

## Direct-operation evidence

- Editor state / schema read：{result}
- Batched discovery/read：{whole-document read-back; no cross-session node IDs}
- Deterministic mutation summary：{brief-derived changes}
- Structural/layout check：{problems, fixes, final result}
- Whole-document visual check：{document screenshot result}
- Preview result：{exact same-session preview path and PNG/hash verification}
- Independent node read-back：{nodes/content/states compared with brief and Markdown}
- External file existence check：{source and preview result}
- Clean exit：`yes | no` / {limitation}
- External assets / provenance / delivery permission：{asset} / {source} / `allowed | restricted | unknown`

## PM preview and Candidate result

- Preview shown / date：`yes | no` / {date}
- PM/Owner feedback：{plain-language feedback}
- PM/Owner preview approval words / date：{`pending` until a later explicit reply; then exact approval words and date}
- Behavior or visual drift：{bundle-relative return locator or `none`}
- Missing coverage：{roles/pages/states/scenarios or `none`}
- Experience status：`pending | completed | skipped-risk`
- Experience reason：{plain-language reason or `tool-unavailable`}
- Unavailable limitation：{exact direct-operation limitation when the direct route is `unavailable`; otherwise `none`}
- Route discovery evidence：{how the available direct routes were checked and the non-secret result; otherwise `none`}
- Capability check evidence：{whether the selected route could read state and expose the required direct operations; otherwise `none`}
- Direct-operation attempt：{the concrete read/mutation/save/export/read-back step attempted and non-secret result; otherwise `none`}
- Runner failure / later authorization：{first failure and immediate stop; later explicit Owner retry request or `none`}
- Product risk：{one concrete product risk caused by the unavailable direct route; otherwise `none`}
- PM/Owner continuation：{explicit words/date accepting continuation without the formal artifact; `pending` until given, otherwise `none`}

> When the direct route is unavailable, persist `Experience status: skipped-risk`, `Experience reason: tool-unavailable`, and `Direct route: unavailable` as one tuple, with route discovery, capability check, one concrete direct-operation attempt, immediate-stop result, exact limitation, and one product risk. Do not automatically or manually retry Pen inside the failed action. A missing optional integration is not proof that every authorized direct route is unavailable. Keep Candidate unfinished until the PM/Owner explicitly chooses to continue without the formal artifact. For every available route, set unavailable-only evidence fields to `none`.
>
> An `exploration` artifact remains `pending`, stays in Definition, and cannot satisfy Candidate readiness. `completed` requires an `implementation-target` rechecked against current Markdown plus the formal read-back and PM preview contract.
