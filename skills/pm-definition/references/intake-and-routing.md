# Intake and routing

## Definition-stage capture

This reference governs the **Definition** phase of the canonical lifecycle. Preserve the raw request or link under Delivery-level `source/` as dated `evidence-only` before interpreting it. Raw evidence is not copied into Candidate snapshots. For a claim that will remain `confirmed` in Candidate, create only the necessary sanitized support under `draft/evidence/` from the supplied template and cite it as bundle-relative `evidence/...`. Map only behavior-bearing claims—scope, roles, objects, lifecycle, rules, permissions, money/data effects, exceptions, acceptance, commitments, and approvals—to stable IDs. Background prose can remain a raw archive citation without becoming a claim ledger.

## Two independent classifications

Classify maturity from structure and behavior coverage, not length, polish, trust, or approval:

- `Raw`: one line, scattered messages, transcription, screenshots, or missing context.
- `Partial`: useful notes, flow, prototype, or requirements with gaps in source, rules, or acceptance.
- `Structured`: organized PRD/feature set with substantial coverage, even when claims remain unsupported or contradictory.

Classify scope from product effect:

- `Change`: one independently describable behavior change.
- `Capability`: one user flow or business ability spanning related roles or states.
- `Product`: an independent product/SaaS that needs boundaries, shared definitions, a capability map, and partial Releases.

Record both axes and their reasons. A one-line SaaS is still `Raw + Product`; a long AI PRD can be `Structured + Change`.

## Route the physical layout

Use `compact` only for one independently readable Change or Capability. A Capability that grows beyond one unit remains `Capability` but uses `multi-file`. Every Product uses `multi-file` with a Foundation and an explicitly named Active Slice. Every layout has `START-HERE.md`; the Agent creates and maintains these paths, and the PM never chooses directories.

## Narrow Product before counting questions

For `Raw + Product`, first establish the Product boundary and name one current Release/Active Slice. Identify one vertical user-value path and only its explicit shared dependencies. Keep future capabilities in the map or exclusions as `planned`, `in-definition`, or `not-released`; do not turn the whole SaaS into current clarification work. Once that boundary and Active Slice are named, inventory the currently foreseeable required nodes before asking the next question. Count only nodes for the active Slice and dependencies; retain useful future nodes as `deferred` without inflating the count.

## Risk and authority

Flag money/price, permissions, personal or regulated data, irreversible state, compliance, external writes, and cross-capability effects. Risk increases the depth of logic, exception, recovery, and Review; it does not ask for a technical design or create an automatic gate. Record who may decide, distinguish the requester and working PM from the business Owner, and resolve approval authority before the exit gate. Label an unverified self-declaration honestly; never treat a model-suggested approval phrase as authority evidence. Escalate pricing, permission boundaries, external commitments, compliance, and major scope changes to the business Owner; the Agent never approves.

## Persist the Decision inventory

Before asking, extract `confirmed`, `assumption`, `open`, `conflict`, `evidence-only`, and `rejected` claims. Write every currently foreseeable node for the bounded scope to the existing Decisions/Open table in the authoritative Delivery, including downstream nodes whose dependencies are not resolved yet. Do not keep only the current open node and append an already-foreseeable successor after each answer. Do not invent speculative nodes or create a separate mandatory backlog file. Each row has:

`bundle_root | path#ID | plain-language question | fact status | affected path#IDs | timing | dependencies | source | Owner | required/optional | next action`

Keep this dynamic snapshot in the entry:

- `known_required_open`: required unresolved nodes for the current Release/Active Slice;
- `blocking_current_slice`: the subset currently preventing downstream definition, Experience, Review, or handoff;
- `deferred`: explicitly postponed nodes outside the current boundary;
- `owner_confirmation`: nodes that require the requester/business Owner;
- `estimated_sequential_rounds`: the longest currently foreseeable dependency chain still requiring separate PM replies;
- `presentation_mode`: `unset`, `guided`, `small-batch`, or `checklist`;
- `current_decision_node`; write the resulting next action/Owner only in the top state card.

Recompute after every answer, research result, scope change, or prototype discrepancy. If an upstream answer makes a downstream node unnecessary, retain its locator and mark it `rejected` with the reason.

Research only an external fact that could change a business decision, and persist its source and effect on the affected node. Do not research implementation mechanisms merely to fill the Delivery or turn an implementation unknown into a PM question.

Question counts describe the known inventory; they do not prove that the inventory is complete. Never advance because a planned list was exhausted. If an included critical path still permits two user-visible outcomes, convert the hidden assumption or conflict into an explicit node and update both counts.

## Definition exit gate

Before setting `blocking_current_slice=0` and moving to Experience, inspect every included critical path in the current Release/Active Slice. Its authoritative Rules/Decisions/Scenarios must determine exactly one:

`actor/authority | starting stage | event | guard | success result | failure/recovery | side effects`

Apply these probes only where they can change current behavior, and record irrelevant ones as not applicable:

- visibility, initiation, approval, retry, cancellation, reversal, and result authority;
- money, price, deposit, refund, inventory, personal/regulated data, or other commitments;
- external confirmation and late/partial results;
- duplicate or concurrent actions;
- timeout, failure, retry, and recovery;
- cancellation/reversal and downstream notification or audit-visible result.

`known_required_open=0` is necessary but not sufficient. `blocking_current_slice=0` is valid only when tuple coverage is unique, relevant probes are resolved or not applicable, and no behavior-changing `assumption` or `conflict` remains hidden. Questions that change user-visible behavior stay in Definition. Behavior-preserving Engineering Questions and clearly deferred future capabilities do not block the exit.

## Choose how to ask

Below the threshold, proceed directly with one upstream question. Do not add a mode-selection step for a simple request. When `presentation_mode=unset` and either `known_required_open >= 4` or `estimated_sequential_rounds > 3`, show the counts before the next business question and stop for the PM to choose a presentation mode:

> 当前已识别 N 个本次范围必须确认的问题；其中 X 个会阻塞当前范围，Y 个可以稍后处理，Z 个需要业务 Owner 确认。回答后数量可能变化。

Always offer these plain-language modes:

- **逐个确认（推荐）**：每轮一个最上游问题。
- **先看完整清单**：把当前问题、推荐项、影响和 Owner 写入 Delivery，集中回复独立问题。

Offer **每次确认 2–3 个** only when at least two current nodes are independent and at the same dependency level. If not, explain briefly that the current chain must remain sequential; the full checklist may still preview later questions without asking the PM to answer blocked nodes. Persist the PM's choice, apply it on later turns, and let the PM change it without repeating the mode-selection step after every inventory update.

Keep internal labels `guided`, `small-batch`, and `checklist` out of ordinary PM-facing prose. A missing mode in an older Delivery means guided. Presentation batching never merges semantic nodes, and a downstream node cannot be asked before its dependency is settled. Route only one node to `pm-brainstorm`.

## Select and present the next node

Choose the earliest unresolved required node whose answer changes downstream behavior. Before asking, perform one lightweight direction check: does the requested solution hide a materially different user/business outcome? Use Brainstorm only if 2–3 real product directions exist; otherwise continue Definition.

Each PM-facing recommendation card states the business situation, one question, why it matters now, a recommended answer, alternatives and trade-offs, a concrete example, user/business impact, and who decides. When two or three credible directions exist, show all of them as concise labeled options, mark exactly one as recommended, and format every option with its main benefit and trade-off; do not omit credible alternatives merely to keep the reply open. Present the recommendation in ordinary language and treat the labeled options as response shortcuts rather than an exhaustive answer contract. Unless the business domain provides a genuinely closed, mutually exclusive, complete choice set, never require a letter- or number-only reply. After every non-exhaustive option list, end with one explicit sentence saying that the PM may choose a label or answer in their own words with another direction, combination, correction, or condition; never leave this permission implicit. Persist affected locators, source/constraints, expected output, and required/optional internally in the Delivery and route payload; do not display them unless the PM explicitly asks for traceability. If the PM lacks authority, preserve the choice and give a concise option card to take to the Owner instead of inventing an answer.
