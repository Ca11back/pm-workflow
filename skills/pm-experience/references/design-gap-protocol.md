# Design gap protocol

Classify every mismatch before changing approved artifacts.

1. **Pen-only visual or layout defect**: clipping, spacing, visual hierarchy, or an accidental affordance; fixing it preserves approved behavior and Brief coverage. Fix it in the same Pen evidence round.
2. **Brief-only gap**: fidelity, presentation coverage, or page/state mapping changes without changing what a user can see, do, receive, or recover from. Consolidate independent gaps, obtain exact Owner correction, then use `start-draft-revision --return-phase experience`.
3. **Definition behavior gap**: eligibility, input, validation, permission, lifecycle, result, commitment, persistence, notification, failure, or recovery would change. Do not invent it in Pen. Finish one read-only sweep of remaining approved Journeys, present consolidated decisions with recommendations and free-form alternatives, then use `--return-phase definition` after the Owner decides.

Reuse the prior `.pen` only as input and always write fresh `.pen`/PNG targets. Preserve unaffected Journey/Coverage nodes. After two consecutive correction rounds still reveal foundational Definition gaps, stop local patching and review the whole current Definition once.
