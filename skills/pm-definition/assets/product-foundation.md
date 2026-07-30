# Product Foundation：{product title}

> Bundle-relative path：`foundation.md`；Draft 与 Release 保持相同内部路径，only root `START-HERE.md` declares the current candidate/Release scope.

## Product boundary

- Delivery：`DEL-{slug}`
- Target user / core problem：{user/problem}
- Observable promise / success signal：{promise/signal}
- Product responsibility / non-goals：{boundary} / {non-goals}
- Decision authority：{what PM can decide, what needs business Owner, and escalation when nobody has authority}

## Roles and core objects

| ID | Name | One business meaning | Permission baseline / ownership | Source / fact status |
| --- | --- | --- | --- | --- |
| `ROLE-001` | {role} | {meaning} | {baseline} | {source} / `open` |
| `OBJ-001` | {object} | {meaning} | {owner} | {source} / `open` |

## 能力地图

| ID | User value / business closure | State | Included in current candidate? | Shared dependencies / Slice path |
| --- | --- | --- | --- | --- |
| `CAP-001` | {vertical capability} | `planned | in-definition | not-released | released | superseded` | yes/no | {paths/IDs} |

Future capability gaps do not block the current Active Slice unless `START-HERE.md` lists them as shared dependencies.

## Shared invariants and lifecycle

| ID | Shared business fact or stage | Entry event / guard | Exit/result and cross-capability effects | Source / Owner / status |
| --- | --- | --- | --- | --- |
| `RULE-001` | {invariant} | {condition} | {effect} | {source/Owner} / `open` |
| `STATE-001` | {observable stage} | `EVENT-001` / {guard} | {allowed exit/result} | {source/Owner} / `open` |

## Shared event map

| ID | Business event | Starting stage / condition | Result stage and side effects | Owner / status |
| --- | --- | --- | --- | --- |
| `EVENT-001` | {event} | {STATE/condition} | {STATE/result} | {Owner} / `open` |

## Shared model index

- Authority path/version：`foundation.md` or {one split shared-model path/version}
- Roles/objects：{path#IDs}
- Lifecycle/events：{path#IDs}
- Active Slice：{exact bundle-relative `slices/<slice>.md` path}

## Decisions, evidence, assumptions, and conflicts

| ID | Question or decision | Fact status | Required? / timing | Dependencies | Source / Owner | Affected path#IDs | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DEC-001` | {top-level decision; add recommendation for a full-list reply} | `open` | `required` / `blocking-current-slice` | {path#DEC or none} | {source} / {Owner} | {paths#IDs} | {action} |

## Experience behavior sync

- Entry summary：{root `START-HERE.md` Experience summary; not copied into the bundle}
- Experience source / preview：{`experience/prototype.pen` and `experience/previews/*.png`, reference, or none}
- Shared locators covered by current artifact：{bundle-relative paths#IDs and Pen node locators}
- Drift / return target：{path#DEC/RULE or none}
