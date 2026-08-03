# Experience manifest：{Delivery / Draft title}

> Bundle-relative path：`experience/manifest.md`。物理 `bundle_root` 由 `START-HERE.md` 和 Agent route payload 分开传递，禁止在本文件固化 `draft/...` 定位。
>
> Create/copy this manifest only after `approve-brief` and, for Pen, after launch reaches `ready` or explicit termination. It is first bound by `approve-preview`; do not include it in Brief approval.

## Artifact identity

List every local file bound by Brief or preview approval. Candidate artifact declarations must exactly match the union of current Brief and preview approval artifacts. Keep the two required files below, then replace the final placeholder with only the current route files: Pen source/read-back/PNG for successful `pen`, exact reference/justification for `existing-reference` or `not-needed`, or independent terminal evidence for explicit `unavailable`. Do not leave a file from another route or list exploration, failed attempts, superseded prototypes, or historical previews.

- Candidate artifact：`experience/brief.md`
- Candidate artifact：`experience/manifest.md`
- Candidate artifact：{replace with one line for each current route artifact, then remove this placeholder}

- Brief：`experience/brief.md`
- Pen source：`experience/prototype.pen`, or `not-applicable-with-reason: <route reason>`
- Preview exports：`experience/previews/{file}.png`, or `not-applicable-with-reason: <route reason>`
- Read-back artifact：`experience/read-back.md`, or `not-applicable-with-reason: <route reason>`
- Reference / route evidence：{exact independent bundle-relative reference, justification, or terminal-evidence paths; Brief/manifest cannot cite themselves as route evidence; or `not-applicable-with-reason: <direct Pen reason>`}
- Experience target：`pen | existing-reference | not-needed`
- Direct route：`pen-interactive-direct | existing-reference | not-needed | unavailable`
- Pen CLI version：{version or `not-applicable-with-reason: <reason>` or `unavailable`}
- Live interactive help read：`yes | no | not-applicable-with-reason: <reason>`
- Visual role：`implementation-target`
- Functional realization applicability：`required | not-applicable-with-reason: <specific reason no user-visible behavior changes>`
- Smallest scope / functional detail：{affected flow/screens/states} / {representation and interaction detail needed to explain function}
- Scope/fidelity approval：{exact PM/Owner words/date recorded in `experience/brief.md` before the first formal mutation}

## Launch state

- Process state：`ready | terminated | not-applicable-with-reason: <reason>`
- Resumable handle retained：`yes | no | not-applicable-with-reason: <reason>`
- Initial prompt：`seen | not-seen-at-termination | not-applicable-with-reason: <reason>`
- Terminal result：`none | <exact non-secret exit/error/output> | not-applicable-with-reason: <reason>`

> Empty output while the process is alive remains `running` working state and cannot be submitted for preview approval. Do not mark the route unavailable, inspect final files as failure evidence, offer a downgrade, or launch another Pen process until an explicit terminal result exists.

## Coverage map

Copy each approval-bound Coverage ID, Markdown locator, and short relationship statement unchanged from `experience/brief.md`.

| Coverage ID | Markdown locator | Artifact locator | Preview/state | Runtime relationship | Sync result |
| --- | --- | --- | --- | --- | --- |
| `COV-001` | `delivery.md#RULE-001` | `experience/prototype.pen#<node-id-or-visible-name>` | {preview/task/state} | {approved relationship statement} | `synced | drift | unverified | not-applicable-with-reason: <reason>` |

## Journey closure map

Copy every approval-bound Journey ID and ordered unique Coverage sequence unchanged from the Brief, then record the observed Pen/reference route.

| Journey ID | Approved Coverage path | Observed Pen/reference path | Closure result |
| --- | --- | --- | --- |
| `JNY-001` | `COV-001`, `COV-002` | {concrete artifact locator sequence} | `closed | gap | unverified | not-applicable-with-reason: <reason>` |

## Screen realization

Copy the complete approved Screen ID set unchanged. Artifact locators must identify the actual Pen/reference evidence, not a root-count claim or later prose summary.

| Screen ID | Artifact locator | Required regions / content / controls evidence | Realization result |
| --- | --- | --- | --- |
| `SCR-001` | `experience/prototype.pen#<node>` | {descendant locators and observed task-shaped regions/content/semantic actions} | `pass | gap | contradiction | unverified | not-applicable-with-reason: <reason>` |

## State realization

| State ID | Artifact locator | Visible delta / feedback / actions / recovery evidence | Realization result |
| --- | --- | --- | --- |
| `STATE-001` | `experience/prototype.pen#<node>` | {descendant locators and observed delta, feedback, action availability and recovery/re-entry} | `pass | gap | contradiction | unverified | not-applicable-with-reason: <reason>` |

## Step transition realization

| Step ID | Source / trigger locator | Feedback locator | Destination / result locator | Failure / recovery locator | Re-entry locator | Realization result |
| --- | --- | --- | --- | --- | --- | --- |
| `STEP-001` | {actual source State and visible semantic control} | {actual immediate feedback} | {actual destination/result} | {actual failure/recovery, or reasoned not-applicable} | {actual later retrieval, or reasoned not-applicable} | `pass | gap | contradiction | unverified | not-applicable-with-reason: <reason>` |

## Functional audit

Use exactly these audit identities. Shared shells, repeated layouts, identical node counts, arbitrary node names, monochrome output, or justified identical state structures do not fail by themselves. `template-collapse` is a semantic probe: different primary jobs using the same functional regions require a task reason and still must realize their own required content/controls.

| Audit item | Scope | Evidence | Result |
| --- | --- | --- | --- |
| `inventory-completeness` | all approved Screens, material States, required content/controls and high-consequence actions | {exact locators/read-back} | `pass | gap | contradiction | unverified | not-applicable-with-reason: <reason>` |
| `transition-closure` | all approved Steps and Journey branches | {source, trigger, feedback, destination/result and recovery/re-entry evidence} | `pass | gap | contradiction | unverified | not-applicable-with-reason: <reason>` |
| `feedback-recovery` | material progress, result, failure and recovery | {exact locators/read-back} | `pass | gap | contradiction | unverified | not-applicable-with-reason: <reason>` |
| `functional-walkthrough` | each Step goal, action discoverability/meaning and observable progress/result | {one result per Step} | `pass | gap | contradiction | unverified | not-applicable-with-reason: <reason>` |
| `template-collapse` | screens with different primary jobs | {task reason for shared structure, or missing task-shaped content/control finding} | `pass | gap | contradiction | unverified | not-applicable-with-reason: <reason>` |

## Direct-operation evidence

- App state / schema read：{result or reasoned not-applicable}
- Guidelines and document discovery：{scope/result}
- Direct mutation summary：{Brief-derived visible changes or reasoned not-applicable}
- Structural/layout read-back：{descendant nodes, content, controls, hierarchy, connections, bounds, problems, fixes, final result}
- Coverage read-back：{Coverage IDs and states compared with Brief and Markdown}
- Journey closure read-back：{every Journey ID checked from entry through immediate result, later re-entry/retrieval when applicable, and recovery/terminal result}
- Dangling affordances：{`none`, or every visible navigation/action/return label lacking a covered target and its return locator}
- Re-entry / retrieval coverage：{Coverage IDs and artifact locators, or not applicable with reason}
- Design gap sweep：{all approved Journeys checked once; consolidated Pen-only, Brief, and Definition gap result}
- Unresolved design gaps：{bundle-relative return locators or `none` only after the sweep}
- Preview file result：{`ready: <exact PNG path and existence evidence>` | `unavailable: <terminal reason>` | `not-applicable-with-reason: <route reason>`}
- Agent visual capability：`agent-visual | human-required | not-applicable-with-reason: <reason>`
- Preview presentation to Owner：`attached | rendered | local-path | unavailable | not-applicable-with-reason: <reason>`
- Save / clean exit：`yes | no | not-applicable-with-reason: <reason>`
- External assets / provenance / delivery permission：{asset} / {source} / `allowed | restricted | unknown`, or reasoned not-applicable

## PM preview and Candidate result

- Preview shown：`yes | no`
- Preview date：{date or `not-applicable-with-reason: <reason>`}
- PM/Owner functional review：{exact context-bound statement about tasks, states, actions, feedback, recovery and scope; `pending` only before the reply; or reasoned not-applicable for a terminal unavailable route}
- PM/Owner feedback：{plain-language feedback or `none`}
- PM/Owner preview approval words：{`pending` until a later explicit reply; then exact words passed to `approve-preview`; for terminal unavailable, use the exact risk-continuation words and do not call them preview approval}
- PM/Owner preview approval date：{date of the preview/evidence approval or unavailable risk continuation; `pending` only before the reply}
- Behavior or functional drift：{bundle-relative return locator or `none`}
- Missing coverage：{content/controls/states/steps/journeys/re-entry/affordance targets or `none`}
- Experience status：`pending | completed | skipped-risk`
- Experience reason：{plain-language reason or `tool-unavailable`}
- Product risk：{one concrete product risk caused by unavailable evidence; otherwise `none`}
- PM/Owner continuation：{exact words accepting continuation without the formal artifact, or `none`}

> A successful `pen` route requires `ready`, retained handle, saved `.pen`, clean exit, exact PNG and read-back artifacts, concrete Coverage/Journey paths, complete realization/audit results, functional Owner review, and exact later approval words. A non-visual Agent presents the exact PNG and waits; structural read-back is not visual inspection.
> Owner review confirms functional expression and scope only; brand/aesthetic approval is excluded, and this is not real-user usability evidence.
>
> Only an explicit `terminated` failure may use `Direct route: unavailable`, `Experience status: skipped-risk`, and `Experience reason: tool-unavailable`. Bind an independent terminal-evidence artifact; mark unrealized locators/evidence and audits `unavailable`/`unverified`; record the exact terminal result, missing evidence, one product risk, and the Owner's exact later continuation words/date. A live or unresolved process stays `pending`, never `skipped-risk`, and cannot be approved. Brief/manifest self-reference, generic permission, or Agent-written continuation is invalid.
>
> `existing-reference` uses the same functional IDs, realization and audit contract with exact reference locators but no Pen process. `not-needed` uses reasoned not-applicable fields and no Screen/State/Step rows because no user-visible behavior changed. An `exploration` artifact remains pending in Definition and cannot satisfy this manifest or Candidate readiness.
