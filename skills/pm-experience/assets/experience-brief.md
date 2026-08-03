# Experience brief：{Delivery / Draft title}

> Bundle-relative path：`experience/brief.md`。本 Brief 只定义已批准行为的功能表达合同；Markdown Rules/Decisions/Scenarios 与 Coverage/Journey 仍是业务行为唯一 authority，Screen/State/Step 不得创造平行产品状态机。

## Approved business context

- Target user / task：{who is trying to complete what}
- Delivery / Draft revision：{Delivery ID} / {generated draft_revision}
- Current scope / exclusions：{current included unit} / {out of scope}
- Business Owner：{authorized person or role}
- Scope/fidelity approval words / date：`pending` until the Owner replies; then copy the real explicit reply accepting or changing the concrete recommendation / {actual reply date}
- Experience target / visual role：`pen | existing-reference | not-needed` / `implementation-target`
- Smallest affected scope：{only the current flow/screens/states and explicit shared dependencies}
- Unresolved Definition decisions：`none`；若仍有行为决策未完成，返回 `pm-definition`
- Definition prototype-readiness result：{approved walkthrough result and `Unresolved prototype blockers: none`; exploration observations never replace Definition authority}

> Keep approval words/date `pending` while presenting this Brief. After the Owner replies, copy the real wording/date above and immediately call `approve-brief` with the same evidence. Never predict or fabricate the reply. After that event, do not edit this Brief; use the explicit pre-Candidate revision path. The Experience manifest, Pen/reference realization, read-back, preview, and lifecycle fields are generated after Brief approval.

## Prototype scope

- Prototype question：{the bounded product/function question this evidence must answer}
- Functional representation detail：{the information hierarchy, meaningful content, semantic controls, feedback and recovery needed to explain the function}
- Interaction coverage：{included Journeys, material branches, recovery and re-entry; static annotations allowed only where they do not replace required visible controls/results}
- Context / surface：{device, channel, or operating context without prescribing a fixed page name}
- High-fidelity visual-design non-goals：brand, palette, type choice, shadows, decorative imagery, motion polish, and pixel-level aesthetics are outside the default work and approval
- Functional contract applicability：`required | not-applicable-with-reason: <specific reason no user-visible behavior changes>`

> Do not deliberately make the result rough, hand-drawn, monochrome, or otherwise “low fidelity.” Use whatever representation detail is necessary to explain function. Clear or polished tool defaults are allowed; aesthetic fidelity is not an acceptance target.

## Required coverage

- Pages / sections / states：{only approved or risk-material states; do not mechanically add loading/empty/error/success everywhere}
- Roles / permissions：{who can see or act; mapped Markdown locators}
- Actions / results / side effects：{mapped Markdown locators}
- Exceptions / notifications / content commitments：{mapped Markdown locators}
- Re-entry / retrieval：{how each persistent or asynchronously changing user-visible object is found later, or not applicable with reason; mapped Markdown locators}
- Visual hierarchy / content direction：{functional grouping and hierarchy that do not introduce new business behavior}
- Runtime relationship：for every required state write one short plain-language statement derived from approved behavior, such as when it replaces, accompanies, or is unrelated to another state. Do not infer the statement from a future canvas.

## Locator map

Create one row for every required Coverage identity. These approval-bound Coverage IDs and relationship values must be copied unchanged into the manifest.

| Coverage ID | Markdown locator | Plain-language behavior | Required page/state | Runtime relationship | Expected artifact purpose |
| --- | --- | --- | --- | --- | --- |
| `COV-001` | `delivery.md#RULE-001` | {approved behavior} | {task context / material state} | {relationship derived from approved behavior} | {functional evidence target} |

## Journey closure

Create one row for every independently enterable user goal or durable-object re-entry/recovery path. Split journeys by independent entry, primary goal, later retrieval, cancellation, or recovery responsibility; do not merge them merely to reduce row count. Use Coverage IDs rather than assumed screen names. Include initiating action, immediate result, later re-entry/retrieval when applicable, and recovery or terminal behavior. Every visible navigation, action, or return affordance in the implementation target must resolve to a Coverage ID in these paths; omit out-of-scope affordances rather than inventing destinations. There is no fixed Journey count.

| Journey ID | First entry and initiating path | Immediate result | Later re-entry / retrieval | Recovery or terminal path |
| --- | --- | --- | --- | --- |
| `JNY-001` | `COV-001` | `COV-002` | `COV-003`, or not applicable with reason | `COV-004`, or explicit terminal result |

The approved Coverage sequence for each Journey is the ordered unique list of Coverage IDs read across its four path/result columns from left to right. Copy that sequence unchanged into the later manifest.

## Screen inventory

A Screen is one stable task/context family, not a URL, canvas root, modal/page form, or visual template. `Purpose / archetype` is an open job-shaped description, never a closed runtime enum. For `not-needed`, remove example rows and use the reasoned applicability field above.

| Screen ID | Coverage IDs | Journey IDs | Primary job | Purpose / archetype | Entry conditions | Required content groups | Functional regions / hierarchy | Primary / secondary / recovery actions | Definition locators |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SCR-001` | `COV-001`, `COV-002` | `JNY-001` | {one stable user job} | {open task description} | {approved entry/guard} | {meaningful information or collection groups} | {task-shaped regions and hierarchy} | {semantic controls/actions, including recovery where applicable} | `delivery.md#RULE-001` |

## Material state matrix

A State is a condition-dependent variant inside the same Screen whose visible information, actions, feedback, or recovery materially changes while the primary job remains stable. Include only approved or risk-material states; do not require a universal state checklist. Each material State evidence surface must expose enough task context to identify the step, a visible delta, available or unavailable actions, feedback/status, and recovery, next, or re-entry as applicable. A compact card is valid when it carries those obligations and enough context to review the step; a title, legend, or status label alone is not State evidence. Semantic review reports over-compression with exact locators and affected obligations, not a page or node threshold.

| State ID | Screen ID | Coverage IDs | Trigger / guard | Visible delta | Available / unavailable actions | Feedback / status | Recovery / next / re-entry | Definition locator |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STATE-001` | `SCR-001` | `COV-001` | {real trigger and guard} | {changed visible information} | {available and disabled/absent semantic actions} | {observable progress/result} | {recovery, next result, or later retrieval} | `delivery.md#SCN-001` |

## Journey transition contract

Every Step names the real visible control/signifier, immediate feedback, result and failure/recovery. Destination/result must reference a declared State or use an explicit `terminal:`, `external:`, or `out-of-scope:` reason. Canvas order, adjacency, whole-frame hotspots, icons, or explanatory prose cannot substitute for a required semantic trigger.

| Step ID | Journey ID | Coverage IDs | Source State | User intent | Visible semantic trigger / control | Guard / input | Immediate feedback | Destination / result | Failure / recovery | Definition locator |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-001` | `JNY-001` | `COV-001`, `COV-002` | `STATE-001` | {approved goal} | {visible labeled control or signifier} | {required input/permission} | {observable response} | `STATE-002` or `terminal: <result>` | {failure signal and recovery control/path} | `delivery.md#SCN-001` |

## Constraints and acceptance

- Must preserve：{confirmed behavior, terminology, reference constraints}
- Must not invent：{permissions, validation, states, exceptions, notifications or side effects not present in Markdown}
- Functional preview acceptance：the exact evidence expresses the approved tasks, material states, content, semantic controls, triggers, feedback, results, recovery and re-entry
- Visual approval excluded：the Owner is not being asked to approve brand or aesthetic quality, and this review is not a real-user usability test
- Known limits / risk if skipped：{specific limitation or none}
- Design-gap handling：complete one bounded all-Journey sweep; consolidate independent gaps; route Pen-only / Brief / Definition corrections without inventing behavior
