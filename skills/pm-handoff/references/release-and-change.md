# Release, send, receipt, and change

## Four independent handoff facts

Before asking “交付给开发”, show:

1. Behavior scope/rules/conflicts and any named accepted risk.
2. Experience route, exact evidence, save/read-back/preview limits, and any accepted risk.
3. Honest Review mode/outcome and open or accepted-risk Findings.
4. The separate explicit product-owner Handoff choice still required.

The runtime requires the current Candidate and a `passed` or `accepted-risk` Review. It never interprets a generic continuation as Handoff confirmation.

## Immutable identities

- Candidate: `CAND-*` snapshot with manifest and Draft revision/approval binding.
- Review: `REV-*` report bound to Candidate ID/hash and honest mode.
- Release: `REL-*` snapshot copied only from the confirmed Candidate.
- Change: `CHG-*` proposal for observable behavior changes after Release.

Never overwrite or reuse an identity. Draft correction invalidates the old Candidate/Review; later approvals and freeze create a new Candidate.

## Prepared is not sent

`create-release` copies/read-backs Candidate files, writes the Release manifest, and records only `prepared`. It does not call email, chat, ticket, storage, or any connector.

Record a later external send as:

- `attempted`: a real but failed/uncertain attempt with evidence and external reference;
- `sent-confirmed`: an authorized manual declaration or connector result with exact recipient, channel, external reference, and evidence.

File existence, PM intent, or an Agent's own claim is not send confirmation.

## Recipient evidence is later still

Only after `sent-confirmed` may a real external recipient record:

- `acknowledged`: received/seen;
- `accepted`: received and accepted;
- `rejected`: received and rejected.

The record needs the same recipient identity as this Release round's `sent-confirmed` event, an external reference, and exact evidence. A PM Agent cannot generate its own receipt, and a different recipient cannot close the round. `acknowledged` may later be refined once to `accepted` or `rejected`; terminal outcomes are immutable.

## Released behavior change

Implementation-only feedback stays with engineering. If timing, stages, permissions, results, side effects, recovery, notifications, eligibility, reporting, or commitments change, create `changes/CHG-*.md` before semantic edits. Preserve the Release, compare current/proposed behavior, trace effects, and obtain a later explicit product-owner approval. Then call runtime `start-change`; it rejects reused CHG identity, binds the proposal/current Release hashes, archives the prior Release plus sending/receipt evidence, resets the current round to `not-prepared` / `pending`, increments Draft revision, and starts Definition → Experience → Candidate → Review → Handoff → Release.
