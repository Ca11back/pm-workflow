# Review resolution (load only when a Review report returns)

This reference closes the loop without letting `pm-handoff` impersonate the Reviewer. The report is immutable evidence; the Delivery owns the response register and the next phase.

## Import the report

Verify the report's `review_path`, Candidate/Release `bundle_root`, scope, manifest, included Experience brief/source/previews/read-back, Review mode, and ordered `FND` IDs. If the report does not identify a valid Delivery/bundle-relative locator, reject the payload, keep the route on `pm-reverse-review`, and return the exact context gap for a corrected report; do not send a report defect into Definition or ask the PM for internal IDs one by one. Copy each Finding into the current Delivery register with this minimum shape:

```text
FND ID | report path | severity | bundle root | return target | affected path#IDs |
Owner response | disposition | applied draft/release | re-review scope/evidence
```

Keep the original report unchanged and link, rather than duplicate, its evidence. A stale report remains historical; it cannot make a changed candidate `passed`.

## Recommend and record a response

For each Finding, in severity/order supplied by the report:

1. Restate the observable impact in plain language.
2. Give a PM-facing recommended correction or clarification and the strongest trade-off; keep affected locators in the internal register and show them only if traceability is requested.
3. Offer the smallest valid alternatives: clarify/brainstorm/context-owner confirmation, experience correction, scope reduction, or explicit risk acceptance.
4. Ask the responsible Owner to choose. Do not supply a final business answer when the evidence leaves a real choice.
5. Persist the Owner's words, date, affected `path#ID`s, and disposition before moving to the next Finding.

Use `open` while undecided. After the Definition/Experience owner returns exact correction evidence, `pm-handoff` uses `addressed-awaiting-review` before independent verification, sets current `review_status: findings-open`, and routes the changed Candidate toward re-review. Use `accepted-risk` only for an explicit Owner risk choice; it is not a synonym for fixed. Use `withdrawn` only when a Reviewer confirms the Finding is not applicable or was a false positive.

## Candidate changes after Review

- **Finding-driven change**：mark each affected Finding `addressed-awaiting-review`, set current `review_status: findings-open`, retain the old report as historical evidence, and request focused/full re-review.
- **Other authoritative behavior or included-Experience change with no pending Finding**：retain the old report as historical evidence, set current `review_status: not-run`, and set the Review handoff check to `missing`. Preserve historical and accepted-risk Findings in the register/risk summary; they do not keep `passed` alive.
- After the second case, a new Review may establish `passed/findings-open/accepted-risk`. If the PM instead explicitly skips Review, set `review_status: skipped` only when no applicable open Finding exists, then mark the Review handoff check `accepted-risk` only when the PM/Owner knowingly chooses to deliver with that risk.

## Re-review and closure

Request a focused re-review when the change is limited to the affected locators and the original scope/Experience remains valid. Request a full re-review when scope, shared definitions, lifecycle, permissions, or the Experience target changed materially. The internal route payload includes the exact report path, Candidate `bundle_root`, bundle-relative `path#ID`/Pen-node targets, and evidence to check; the PM-facing summary uses plain issue titles and impact.

Only a Reviewer can move `addressed-awaiting-review` to `closed` or `withdrawn`; `pm-handoff` records that returned conclusion. If all Findings are `closed/withdrawn`, actual `review_status` may become `passed`. If no Finding remains pending but one or more are `accepted-risk`, use `accepted-risk`. If any Finding is `open` or `addressed-awaiting-review`, use `findings-open`.

Review remains optional. If the PM declines re-review, record the concrete limitation. Keep applicable open/awaiting Findings as `findings-open`; do not relabel them merely to pass the handoff check. The PM/Owner may knowingly choose the risk-bearing handoff, which changes the Review check to `accepted-risk` while preserving the actual Finding dispositions and Review status.
