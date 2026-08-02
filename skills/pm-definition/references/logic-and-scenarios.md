# Logic and scenarios

Use this reference after the current product direction is known. Translate business-language answers into professional structure; do not ask the PM to use modeling terminology.

## Minimal brainstorm fallback

Use only when `pm-brainstorm` is unavailable and the current Decision Node has multiple material directions:

1. Freeze the physical `bundle_root` separately from the full bundle-relative Decision locator (`path#DEC-###`), confirmed context, constraints, affected locators, and already rejected options.
2. Compare 2–3 options that lead to different observable product behavior. Do not explore technical architecture.
3. For each option state user-visible flow, affected rules/states, main benefit, cost or risk, and reversibility.
4. Recommend one option with evidence and a clear trade-off. Ask one Owner decision.
5. Persist selected, rejected, or still-open options as a Decision Patch, then continue downstream clarification without repeating prior questions.

## Behavior model

Cover only the active Release, at the depth its risk requires:

- Actors and authority: who may see, initiate, approve, retry, reverse, or receive results.
- Business objects and vocabulary: one authoritative meaning for each important term.
- States or stages: user-recognizable lifecycle positions, including terminal and in-progress outcomes.
- Events and conditions: what happens, when it is allowed, and which business condition prevents it.
- Rules and invariants: statements that must stay true across paths and contracts.
- Decisions: condition combinations mapped to one observable outcome; use a compact table when conditions interact.
- Exceptions and recovery: failure, timeout, duplicate action, partial success, retry, cancellation, external failure, and user feedback.
- Continued access: when a user-visible object persists or changes after the initiating flow, how its owner later re-enters or retrieves the current result; otherwise record why this is not applicable.
- Cross-contract effects: referenced shared events, ownership, sequencing, and downstream consequences.

Probe permission/visibility, money/deposit/refund, inventory, personal or regulated data, external confirmation, duplicate/concurrent action, timeout/failure, cancellation/reversal, notification, and audit-visible results only when relevant to the current scope. Mark a probe not applicable when it truly cannot change current behavior; do not invent a future capability to fill a checklist.

Use file-local stable IDs and pass the physical `bundle_root` plus full bundle-relative `path#ID` locators across files or Skills. Keep the same locators when the Candidate bundle is copied to a Release. Link every rule to a source or Owner confirmation. Preserve unknown implementation mechanisms as Engineering Questions only if the product outcome is already unique.

## Scenario format

Write scenarios in business language:

- `Given`: actor, relevant business stage, permissions, and necessary prior outcome.
- `When`: one user-visible or business event.
- `Then`: observable state, result, message/notification, and downstream business effect.
- `And`: exception or recovery result only when it removes a reasonable ambiguity.

Cover the normal path plus behavior-changing boundaries: unauthorized actor, disallowed stage, duplicate action, failure/timeout, partial external success, retry/recovery, and relevant concurrency or cross-capability ordering. Do not prescribe automated test code.

## Dual-interpretation check

For each critical rule, attempt to write two implementations with different observable results that both satisfy the words. If both remain reasonable, create an `open` item or finding candidate rather than polishing the sentence. Resolve actor, starting stage, event, guard, success result, failure result, and side effects until only one product behavior remains.

## Completion and Definition-exit test

A node is complete when its affected behavior has one authoritative meaning, a source or Owner, representative success and failure scenarios, and no unresolved blocker hidden as an assumption.

The current Slice may leave Definition only when every included critical path has a unique `actor/authority | starting stage | event | guard | success result | failure/recovery | side effects` tuple, and every persistent or asynchronously changing user-visible object has a unique later re-entry/retrieval path or an explicit not-applicable reason. All relevant probes above must be resolved or explicitly not applicable, and the dual-interpretation check must not produce a second reasonable user-visible implementation. `known_required_open=0` alone does not pass this test. Convert any hidden assumption or conflict into an explicit Decision/open item and keep `blocking_current_slice > 0` until it is resolved. Behavior-preserving Engineering Questions and explicitly deferred future capabilities may remain. Do not expand into unrelated future capabilities merely to fill a template.
