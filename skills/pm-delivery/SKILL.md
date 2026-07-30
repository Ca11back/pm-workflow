---
name: pm-delivery
description: Start or resume a traceable Chinese-first product Delivery, initialize its minimal Markdown workspace, read the sole START-HERE current-state card, and route to exactly one phase or expert Skill. Use as the ordinary entry for product requests, existing PRDs, meeting notes, prototypes, engineering feedback, or an unknown/stale Delivery phase. Do not use it to execute Definition, Pen, Review resolution, Release, or receipt work itself.
---

# PM Delivery Router

## Keep the router thin

Act only as the initializer and recovery router. Keep product facts in the Delivery Markdown, not chat. Do not copy phase methods into this Skill, preload every reference, cross an approval point, or perform Pen, Review, snapshot, sending, or receipt actions.

Use Chinese and plain business language by default. Never ask the PM for Git, CLI, YAML, MCP, credentials, internal paths, locators, or implementation design.

## Initialize a new Delivery

1. Find the workspace's documented Delivery convention. Otherwise use product-deliveries/<delivery-id>/.
2. Preserve the raw request as dated evidence without promoting unsupported claims.
3. Read [delivery-protocol.md](references/delivery-protocol.md) and copy [start-here.md](assets/start-here.md). Create only the minimal Delivery root, START-HERE.md, draft/evidence, and raw evidence file.
4. Fill one current-state card:
   - Phase: definition
   - Current gate / status: none / ready
   - Current blocker: none
   - Allowed now: definition-work
   - Forbidden now: pen-authoring, candidate-freeze, review, handoff, release, receipt-close
   - Pass condition: the current scope has one unambiguous observable Definition
   - Next skill: pm-definition
   - Next action / owner: classify and define the current scope / PM Agent
5. Record the minimum identity, current draft root, PM/business Owner, and evidence pointer. Leave bundle shape and product-definition authoring to pm-definition.

## Resume from the sole state card

Require an explicit START-HERE.md when one is supplied. Otherwise locate valid Delivery entries without guessing from recency or chat memory. If several match, show only title, scope, phase, current Release, Review status, intended use, and next action, then ask the PM to choose.

Read only:

1. the top Current state card;
2. Identity and current pointer;
3. the single detailed field needed to verify the route when the card is contradictory.

Do not read the current bundle, all references, Review report, or Experience artifacts merely to route.

## Select exactly one Skill

Use the recorded Next skill when it agrees with the phase and current evidence:

| Current state | Route |
| --- | --- |
| definition | pm-definition |
| experience or candidate work | pm-experience |
| review ready and not skipped | pm-reverse-review |
| returned Review, handoff, release, receipt, or change work | pm-handoff |
| complete / stop | stop |

If Next skill is missing, stale, or inconsistent, report the contradiction and the phase owner that must repair the same card. Do not invent a second state record or silently execute the destination phase.

## Handoff

Report the current phase, gate/status, blocker, exact Next skill, next action/Owner, and START-HERE entry. Then invoke or point to only that Skill and stop routing. A supervised continuation can use:

    使用 <Next skill> 继续：<START-HERE path>

The state card and Validator are advisory recovery evidence. They do not intercept directly available effectful tools.
