# Product Foundation：{product title}

> Bundle-relative path：`foundation.md`；Draft 与 Release 保持相同内部路径，only root `START-HERE.md` declares the current candidate/Release scope.

## Definition working state

- `known_required_open` / `blocking_current_slice`：{N} / {N}
- `deferred` / `owner_confirmation`：{N} / {N}
- `estimated_sequential_rounds`：{N or unknown}
- `presentation_mode`：`unset | guided | small-batch | checklist`
- `current_decision_node`：{bundle-relative path#DEC-* or none}

## Product boundary

- Delivery：`DEL-{slug}`
- Target user / core problem：{user/problem}
- Observable promise / success signal：{promise/signal}
- Product responsibility / non-goals：{boundary} / {non-goals}
- Decision confirmation：{current PM/user by default; specific decisions explicitly assigned to another person/function, or none}

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

## Experience requirements

- Required shared behavior coverage：{bundle-relative paths#RULE/SCN}
- Required roles / pages / states：{shared normal and material boundary states, or none for non-visible work}
- Required journey closure：{shared entry/re-entry/retrieval obligations for persistent or asynchronously changing user-visible objects; or not applicable with reason}
- Prototype readiness walkthrough：{bounded shared-journey result covering entry, input/action, visible result, material failure/recovery, and later retrieval}
- Unresolved prototype blockers：{concrete path#DEC/RULE list or none only after the walkthrough}
- Later visual discovery rule：{new behavior returns to a path#DEC/RULE and Definition approval before Candidate}
- Lifecycle authority：current Experience route, status, source, preview, and Pen node bindings live in `experience/manifest.md` and generated `START-HERE.md`; they are not duplicated in this approval-bound contract.

## Confirmed-claim evidence

- Bundle-contained evidence：{`evidence/<file>.md` locators or `none`; raw `source/` remains outside Candidate authority}
