# Experience manifest：{Delivery / Candidate title}

> Bundle-relative path：`experience/manifest.md`。物理 `bundle_root` 由 `START-HERE.md` 和 Agent route payload 分开传递，禁止在本文件固化 `draft/...` 定位。

## Artifact identity

- Brief：`experience/brief.md`
- Pen source：`experience/prototype.pen`
- Preview exports：{`experience/previews/<file>.png`}
- Experience target：`pen`
- Direct route：{route identity or `unavailable`}
- Visual role：`implementation-target`
- Smallest scope / fidelity：{affected flow/pages/states} / {plain-language detail and interaction level}
- Scope/fidelity approval：{exact PM/Owner words/date recorded in `experience/brief.md` before the first mutation}
- Save status：`saved | failed | unavailable`

## Coverage map

| Markdown locator | Pen node locator | Preview/state | Sync result |
| --- | --- | --- | --- |
| `delivery.md#RULE-001` | `experience/prototype.pen#<node-id>` | {preview/page/state} | `synced | drift | unverified` |

## Direct-operation evidence

- Editor state / schema read：{result}
- Batched discovery/read：{top-level/components/affected nodes}
- Deterministic mutation summary：{brief-derived changes}
- Structural/layout check：{problems, fixes, final result}
- Targeted visual check：{node/section and result}
- Export result：{exact preview paths}
- Independent node read-back：{nodes/content/states compared with brief and Markdown}
- External file existence check：{source and preview result}
- Clean exit：`yes | no` / {limitation}

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
- Retry result：{one allowed recoverable retry and result, or why retry was not applicable; otherwise `none`}
- Product risk：{one concrete product risk caused by the unavailable direct route; otherwise `none`}
- PM/Owner continuation：{explicit words/date accepting continuation without the formal artifact; `pending` until given, otherwise `none`}

> When the direct route is unavailable, persist `Experience status: skipped-risk`, `Experience reason: tool-unavailable`, and `Direct route: unavailable` as one tuple, with route discovery, capability check, one concrete direct-operation attempt, the allowed retry result, exact limitation, and one product risk. A missing optional integration is not proof that every authorized direct route is unavailable. Keep Candidate unfinished until the PM/Owner explicitly chooses to continue without the formal artifact. For every available route, set unavailable-only evidence fields to `none`.
>
> An `exploration` artifact remains `pending`, stays in Definition, and cannot satisfy Candidate readiness. `completed` requires an `implementation-target` rechecked against current Markdown plus the formal read-back and PM preview contract.
