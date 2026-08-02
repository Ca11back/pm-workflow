# Capability / Slice：{name}

> Bundle-relative path：`slices/{slug}.md`；Draft 与 Release 保持相同内部路径，root `START-HERE.md` owns phase, checks, Review, and current Release.

## Slice identity and boundary

- Slice / parent Delivery：`SLICE-{slug}` / `DEL-{delivery}`
- User and vertical value：{who completes what value}
- Start / end：{business starting stage} / {observable completion and side effects}
- Included / excluded：{this Slice} / {future or adjacent capabilities}
- Shared dependencies：{exact relative paths and IDs; do not copy their definitions}

## Behavior contract

| ID | Actor / authority / object / start | Event and guard | Success result / side effects | Failure, recovery, notification | Source / fact status |
| --- | --- | --- | --- | --- | --- |
| `RULE-001` | {actor/authority/object/stage} | {event/condition} | {unique result and effects} | {failure/recovery/feedback} | {source} / `open` |

## State and event references

| ID | Shared locator or local meaning | Allowed transition / constraint | Owner / status |
| --- | --- | --- | --- |
| `EVENT-001` | {`foundation.md#EVENT-001` or local meaning} | {transition/guard} | {Owner} / `open` |

## Scenarios and acceptance

- `SCN-001` Given {actor, stage and permission}; When {event}; Then {result and side effect}.
- `SCN-002` Given {failure, duplicate or timeout}; When {event}; Then {failure/recovery result}.

## Experience requirements

- Required behavior coverage：{bundle-relative path#RULE/SCN locators}
- Required roles / pages / states：{normal and every material boundary state that later evidence must cover, or none for non-visible work}
- Required journey closure：{entry, immediate result, and later re-entry/retrieval for each persistent or asynchronously changing user-visible object; or not applicable with reason}
- Visual-only constraints：{does not add business behavior}
- Later visual discovery rule：{new behavior returns to a path#DEC/RULE and Definition approval before Candidate}
- Lifecycle authority：current Experience route, status, source, preview, and Pen node bindings live in `experience/manifest.md` and generated `START-HERE.md`; they are not duplicated in this approval-bound contract.

## Decisions and open items

| ID | Question or decision | Fact status | Required? / timing | Dependencies | Source / Owner | Affected path#IDs | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DEC-001` | {plain-language decision; add recommendation for a full-list reply} | `open` | `required` / `blocking-current-slice` | {path#DEC or none} | {source} / {Owner} | {path#RULE/SCN} | {action} |

## Handoff notes

- Product risks or limits：{current Slice risks}
- Confirmed-claim evidence：{bundle-relative `evidence/<file>.md` locators or `none`; raw `source/` is not Candidate-local authority}
- Engineering Questions：{behavior-preserving technical questions}
- Entry / current pointer：{root `START-HERE.md`; resolve from physical Delivery root, not from a bundle-relative locator}
