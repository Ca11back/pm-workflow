# Risk probes

Apply proportionally to the selected Candidate and intended use. A probe determines review depth, not severity by itself.

## Source and vocabulary

- Does each critical claim have a source and authorized Owner?
- Are fluent AI-generated claims, market numbers, compliance statements, and success metrics still unconfirmed where appropriate?
- Can one term, role, object, or stage mean two things across files?
- Is the physical `bundle_root` separate from every complete bundle-relative `path#ID`, and is each file-local ID unique?

## State, event, and recovery

- Does every transition have one start, event, guard, result, and owner?
- What happens on failure, timeout, duplicate event, retry, partial success, cancellation, reversal, or late callback?
- Can an irreversible/external write be shown as successful before confirmation?

## Permission and authority

- Do visibility, initiation, edit, approve, cancel, reverse, and retry permissions agree across rules and scenarios?
- After approval/completion, are actor, editable fields, resulting stage, reapproval, notification, and audit-visible result defined?
- Did the Agent or PM decide something reserved for a business Owner?

## Money, data, and commitments

- Are payment, refund, price, inventory, personal data, compliance, and external commitments tied to observable timing and failure behavior?
- Are duplicate charges, partial fulfilment, stale data, authorization failure, and recovery covered when relevant?

## Scope, snapshot, and current pointer

- Does `START-HERE.md` point to the exact current draft/Release and only the active Slice/dependencies?
- Does the Release manifest reproduce the stated reading order, scope, Review, Experience, and risks?
- Do Draft and Release preserve the same internal path shape so copied Markdown and Pen locators need no rewrite and never point back to mutable Draft?
- Is released business content unchanged while current/supersession/receipt metadata lives in the mutable pointer?
- Could future capabilities or an old snapshot be mistaken for the current handoff?

## Experience consistency

- Does the current scope change any user-visible page, action, copy, visibility, state, feedback, or result, regardless of request size or layout?
- If yes, is there a completed Pen `implementation-target`, an authoritative `existing-reference` exact for every required normal/material state, or explicit `skipped-risk` evidence naming Owner skip/tool unavailability and one concrete impact? For tool unavailability, does the launch state show explicit termination plus its exact non-secret result, rather than a live/pending process? If no, does `not-needed` state the reason?
- Before the first Pen mutation, did `experience/brief.md` already exist with explicit, dated PM/Owner acceptance of the concrete scope/fidelity, rather than only generic permission to complete the workflow?
- Is the artifact an `exploration` or `implementation-target`, never a parallel behavior authority?
- Is any `exploration` artifact still `pending` in Definition and excluded from Candidate readiness?
- Does each Pen node that expresses a permission, action, stage, exception, notification, or side effect map to a current bundle-relative Markdown `path#ID`?
- Are `experience/brief.md`, `.pen` source, exact preview exports, node coverage, structural checks, Agent visual capability, human preview evidence when needed, missing states, `tool-unavailable`, read-back failures, and `sync_status` visible?
- Are current Experience lifecycle facts read from `experience/manifest.md` and generated `START-HERE.md`, without requiring the earlier hash-bound Definition contract to duplicate mutable route/status/source/preview facts?
- For every multi-state artifact, does the same approval-bound Coverage ID and relationship statement survive through Brief, visible Pen node/read-back, and manifest without conflicting with approved behavior?
- Independently of the Brief's declared inventory, does every persistent or asynchronously changing user-visible object have an approved later re-entry/retrieval path, and does every critical Journey ID remain reachable in the Pen/reference evidence?
- Does every visible navigation, action, and return affordance resolve to a covered destination, with no decorative or dangling target hidden by `Missing coverage: none`?
- If the authoring or reviewing Agent could not inspect images, was that limitation disclosed and did the Owner actually receive and review the exact PNG before approval? Was structured read-back kept separate from visual evidence?
- Was the authoritative `.pen` kept read-only during Review? Did every isolated copy/output stay inside the caller-authorized write scope and get cleaned only by its exact authorized location? If isolated inspection was unavailable, does the report disclose that structure was not independently verified?
- Did an Experience change occur after the reviewed candidate? If Finding-driven, is current status `findings-open`; otherwise, with no pending Finding, is the old report historical and current status `not-run`?

## Status integrity

- Is every Delivery entered through `START-HERE.md`, including compact work?
- Did the Candidate gate pass only after manifest, included scope, structural read-back, an accessible Experience preview, PM/Owner visual review, and unresolved feedback were complete? If the formal Pen artifact is absent under `skipped-risk`, is there an explicit dated PM/Owner choice to continue after seeing the limitation and impact?
- Is `prototype/engineering-review` limited to Draft, and does every `released/superseded` snapshot use `implementation`?
- Does the Review handoff check stay `missing` for non-passed status until the PM/Owner explicitly chooses a risk-bearing handoff, without changing open Finding dispositions?
- Is `passed` free of open, awaiting-review, and accepted-risk Findings?
- Does `findings-open` cover every open/awaiting item, and does `accepted-risk` name explicit Owner choices?
- Are `not-run` and `skipped` distinct and unable to erase prior Finding history?
- After post-Review behavior/Experience change, does the current status follow the exact `findings-open` versus `not-run` downgrade while preserving historical/accepted-risk entries?
- Does `released` mean handed to development rather than prototype, Review, or production launch?
- Does Release creation stop at `prepared`, sending use `attempted` or evidence-backed `sent-confirmed`, and receipt use an external-recipient reference for `acknowledged | accepted | rejected`?
