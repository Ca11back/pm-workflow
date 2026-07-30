---
name: pm-brainstorm
description: Explore exactly one unresolved product Decision Node from an existing Delivery by comparing two or three materially different user-visible directions, recommending one with evidence and trade-offs, and producing a Decision Patch for pm-definition. Use only when the internal input identifies a valid Delivery entry, bundle root, and bundle-relative path#Decision-ID, including an explicit request about that recorded node. If those artifacts are absent, return the original material to pm-delivery instead of interviewing the PM for internal IDs.
---

# PM Brainstorm

## Validate the specialist boundary

Require one valid Delivery entry, the current Candidate `bundle_root`, and one full bundle-relative Decision locator such as `delivery.md#DEC-003`, plus its plain-language question, current candidate, relevant sources, confirmed context, constraints, Owner, affected locators, and rejected options. Keep the bundle root and locator in the internal route payload; do not show them in the ordinary Owner question.

If the input is only a product question, PRD, idea, or chat statement without those artifacts, stop this specialist flow and return the original material to `pm-delivery` to create or resume the Delivery. Do not ask the PM to invent a Delivery ID, Release ID, path, or Decision ID. If several valid Deliveries already exist, list their plain-language title and current scope so the PM can choose; keep exact paths internal unless traceability is requested and never infer from recency.

Read [decision-node.md](references/decision-node.md). Do not reread the whole product as a fresh interview, reopen confirmed decisions, or explore modules, APIs, schemas, architecture, tests, libraries, estimates, Review, or final handoff.

## Compare one product decision

1. Restate the one observable business decision and why different answers matter.
2. Produce 2–3 credible options that differ in flow, permission, lifecycle, result, risk allocation, scope, or another product behavior—not wording or implementation.
3. For each, show the PM a concrete scenario, benefit, risk/cost, reversibility, and evidence fit. Persist affected `path#ID`s in the patch and route payload, and show them only on an explicit traceability request.
4. Recommend one option using current evidence and disclose its strongest downside.
5. Ask exactly one Owner-facing question in plain business language.
6. Record the selected/rejected options and rationale, or keep the decision open with one next confirmation action.

Copy [decision-patch.md](assets/decision-patch.md) to a separate patch path. Do not edit the Delivery or call the patch a Release. Return the patch path, Delivery entry, Candidate `bundle_root`, and exact bundle-relative Decision locator to `pm-definition`; it verifies authority, merges the decision, updates affected logic/scenarios, and continues Definition without repeating prior decisions.

## Stop condition

Handle one node per invocation and stop when its choice and immediate affected locators are clear. Do not expand into roadmap, full product strategy, unrelated future capabilities, implementation planning, Review, or release. The file contract must work even when the host has no shared Skill invocation API.
