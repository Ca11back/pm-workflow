# Experience brief：{Delivery / Draft title}

> Bundle-relative path：`experience/brief.md`。本 brief 只定义视觉任务和覆盖范围；Markdown Rules/Decisions/Scenarios 仍是业务行为唯一 authority。

## Approved business context

- Target user / task：{who is trying to complete what}
- Delivery / Draft revision：{Delivery ID} / {generated draft_revision}
- Current scope / exclusions：{current included unit} / {out of scope}
- Business Owner：{authorized person or role}
- Scope/fidelity approval words / date：`pending` until the Owner replies; then copy the real explicit reply accepting or changing the concrete recommendation / {actual reply date}
- Experience target / visual role：`pen` / `implementation-target`
- Smallest affected scope：{only the current flow/pages/states and explicit shared dependencies}
- Fidelity / interaction / surface：{flow, low-fidelity static pages, or more detailed treatment in plain language; clickability only when behavior requires it} / {device or surface}
- Unresolved Definition decisions：`none`；若仍有行为决策未完成，返回 `pm-definition`

> Keep approval words/date `pending` while presenting this Brief. After the Owner replies, copy the real wording/date above and immediately call `approve-brief` with the same evidence. Never predict or fabricate the reply. After that event, do not edit this Brief; return scope or fidelity changes to Definition for a new approval round. The Experience manifest, worksheet, Pen source, read-back, preview, and lifecycle fields are generated after Brief approval.

## Required coverage

- Pages / sections / states：{normal, empty, loading, success, failure and recovery as applicable}
- Roles / permissions：{who can see or act; mapped Markdown locators}
- Actions / results / side effects：{mapped Markdown locators}
- Exceptions / notifications / content commitments：{mapped Markdown locators}
- Visual hierarchy / content direction：{choices that do not introduce new business behavior}
- Runtime relationship：for every required state write one short plain-language statement derived from approved behavior, such as when it replaces, accompanies, or is unrelated to another state. Do not infer the statement from a future canvas.

## Locator map

Create one row for every required page/state. These approval-bound Coverage IDs and relationship values must be copied unchanged into the later coverage worksheet and Experience manifest. Do not put later manifest paths or Pen/read-back status into this Brief.

| Coverage ID | Markdown locator | Plain-language behavior | Required page/state | Runtime relationship | Expected Pen node purpose |
| --- | --- | --- | --- | --- | --- |
| `PAGE-01-NORMAL` | `delivery.md#RULE-001` | {normal behavior} | {page / normal} | {relationship derived from approved behavior} | {normal-state visual target} |
| `PAGE-01-EMPTY` | `delivery.md#SCN-002` | {empty behavior} | {page / empty} | {relationship derived from approved behavior} | {empty-state visual target} |

## Constraints and acceptance

- Must preserve：{confirmed behavior, terminology, brand/reference constraints}
- Must not invent：{permissions, validation, states, exceptions, notifications or side effects not present in Markdown}
- Preview acceptance：{what the PM/Owner must be able to verify in the rendered export}
- Known limits / risk if skipped：{specific limitation or none}
