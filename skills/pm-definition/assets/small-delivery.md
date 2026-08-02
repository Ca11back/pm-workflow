# Product Contract：{title}

> Bundle-relative path：`delivery.md`；Draft 与 Release 保持相同内部路径，阶段、检查和 current pointer 只在根 `START-HERE.md` 维护。

## Definition working state

- `known_required_open` / `blocking_current_slice`：{N} / {N}
- `deferred` / `owner_confirmation`：{N} / {N}
- `estimated_sequential_rounds`：{N or unknown}
- `presentation_mode`：`unset | guided | small-batch | checklist`
- `current_decision_node`：{bundle-relative path#DEC-* or none}

## Scope and authority

- Delivery / scope：`DEL-{slug}` / `Change | Capability`
- Goal and observable result：{business goal and user-visible result}
- Included / excluded：{this unit} / {adjacent or future behavior}
- Product confirmer：{current PM/user by default; name another person or function only when explicitly required for a specific decision}

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

## Experience requirements

- Required behavior coverage：{bundle-relative path#RULE/SCN locators}
- Required roles / pages / states：{normal and every material boundary state that later evidence must cover, or none for non-visible work}
- Required journey closure：{entry, immediate result, and later re-entry/retrieval for each persistent or asynchronously changing user-visible object; or not applicable with reason}
- Visual-only constraints：{hierarchy/content direction that does not add behavior}
- Later visual discovery rule：{new behavior returns to a path#DEC/RULE and Definition approval before Candidate}
- Lifecycle authority：current Experience route, status, source, preview, and Pen node bindings live in `experience/manifest.md` and generated `START-HERE.md`; they are not duplicated in this approval-bound contract.

## Evidence

| Source / date | Original behavior claim | Mapped path#ID | Authority note |
| --- | --- | --- | --- |
| `evidence/{slug}.md` or {raw archive label for evidence-only context} | {claim} | `delivery.md#RULE-001` | `confirmed` only when the bundle-contained evidence and Owner confirmation support it; otherwise `evidence-only` |

## Engineering Questions

- {Only API, storage, module, architecture, technical test, deployment, or estimate questions that do not change observable product behavior.}
