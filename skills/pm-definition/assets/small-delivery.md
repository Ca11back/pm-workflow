# Product Contract：{title}

> Bundle-relative path：`delivery.md`；Draft 与 Release 保持相同内部路径，阶段、检查和 current pointer 只在根 `START-HERE.md` 维护。

## Scope and authority

- Delivery / scope：`DEL-{slug}` / `Change | Capability`
- Goal and observable result：{business goal and user-visible result}
- Included / excluded：{this unit} / {adjacent or future behavior}
- PM / business Owner：{roles}

## Required product behavior

| ID | Actor / authority / starting stage | Event and business guard | Success result / side effects | Failure or recovery | Source / fact status |
| --- | --- | --- | --- | --- | --- |
| `RULE-001` | {actor/authority/stage} | {event/condition} | {observable result and effects} | {feedback/state/retry} | {source} / `open` |

## Scenarios

- `SCN-001` Given {actor, stage and permission}; When {one event}; Then {observable result and side effect}.
- `SCN-002` Given {failure, duplicate or timeout}; When {event}; Then {failure/recovery result}.

## Decisions, assumptions, and open questions

| ID | Question or decision | Fact status | Required? / timing | Dependencies | Source / Owner | Affected path#IDs | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DEC-001` | {plain-language decision; add recommendation when using a full-list reply} | `open` | `required` / `blocking-current-slice` | {path#DEC or none} | {source} / {Owner} | `delivery.md#RULE-001` | {action} |

Fact status: `confirmed / assumption / open / conflict / evidence-only / rejected`.

## Experience behavior sync

- Entry summary：{root `START-HERE.md` Experience summary; not copied into the bundle}
- Experience source / preview：{`experience/prototype.pen` and `experience/previews/*.png`, reference, or none}
- Covered by artifact：{bundle-relative path#RULE/SCN and `experience/prototype.pen#node-id` locators}
- Visual-only choices：{hierarchy/content direction that does not add behavior}
- Behavior discovered in visual：{must be written above under a path#ID before candidate/review}

## Evidence

| Source / date | Original behavior claim | Mapped path#ID | Authority note |
| --- | --- | --- | --- |
| {path or material} | {claim} | `delivery.md#RULE-001` | `evidence-only` |

## Engineering Questions

- {Only API, storage, module, architecture, technical test, deployment, or estimate questions that do not change observable product behavior.}
