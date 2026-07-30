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

## Experience behavior sync

- Entry summary：{root `START-HERE.md` Experience summary; not copied into the bundle}
- Experience source / preview：{`experience/prototype.pen` and `experience/previews/*.png`, reference, or none}
- Covered locators / pages / states：{bundle-relative path#IDs, Pen node locators and coverage}
- Visual-only direction：{does not add business behavior}
- Drift or missing behavior：{return target path#DEC/RULE or none}

## Decisions and open items

| ID | Question or decision | Fact status | Required? / timing | Dependencies | Source / Owner | Affected path#IDs | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DEC-001` | {plain-language decision; add recommendation for a full-list reply} | `open` | `required` / `blocking-current-slice` | {path#DEC or none} | {source} / {Owner} | {path#RULE/SCN} | {action} |

## Handoff notes

- Product risks or limits：{current Slice risks}
- Engineering Questions：{behavior-preserving technical questions}
- Entry / current pointer：{root `START-HERE.md`; resolve from physical Delivery root, not from a bundle-relative locator}
