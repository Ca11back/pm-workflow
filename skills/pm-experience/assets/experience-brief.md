# Experience brief：{Delivery / Candidate title}

> Bundle-relative path：`experience/brief.md`。本 brief 只定义视觉任务和覆盖范围；Markdown Rules/Decisions/Scenarios 仍是业务行为唯一 authority。

## Approved business context

- Target user / task：{who is trying to complete what}
- Candidate scope / exclusions：{current included unit} / {out of scope}
- Business Owner：{authorized person or role}
- Scope/fidelity approval words / date：{explicit reply accepting or changing the concrete recommendation; generic workflow-continuation permission is invalid} / {date}
- Experience target / visual role：`pen` / `implementation-target`
- Smallest affected scope：{only the current flow/pages/states and explicit shared dependencies}
- Fidelity / interaction / surface：{flow, low-fidelity static pages, or more detailed treatment in plain language; clickability only when behavior requires it} / {device or surface}
- Unresolved Definition decisions：`none`；若仍有行为决策未完成，返回 `pm-definition`

## Required coverage

- Pages / sections / states：{normal, empty, loading, success, failure and recovery as applicable}
- Roles / permissions：{who can see or act; mapped Markdown locators}
- Actions / results / side effects：{mapped Markdown locators}
- Exceptions / notifications / content commitments：{mapped Markdown locators}
- Visual hierarchy / content direction：{choices that do not introduce new business behavior}

## Locator map

| Markdown locator | Plain-language behavior | Required page/state | Expected Pen node purpose |
| --- | --- | --- | --- |
| `delivery.md#RULE-001` | {behavior} | {page/state} | {visual target} |

## Constraints and acceptance

- Must preserve：{confirmed behavior, terminology, brand/reference constraints}
- Must not invent：{permissions, validation, states, exceptions, notifications or side effects not present in Markdown}
- Preview acceptance：{what the PM/Owner must be able to verify in the rendered export}
- Known limits / risk if skipped：{specific limitation or none}
