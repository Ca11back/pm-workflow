# Direct Pen interactive operation

Use for either the formal `pen` route after Brief approval or one explicitly handed-off provisional exploration while Definition remains active. Keep internal commands and IDs out of PM interaction unless needed for preview access or diagnostics. Run `pen version`, `pen status`, and `pen interactive --help` directly; support 0.3.1+ and use that live help rather than a runtime parser, copied tool map, or adapter.

Continue only when the live help exposes headless output, preview output, state/schema read, mutation, structural read-back, save, and exit. Resolve the explicit Delivery root to an absolute path before launch. Pass `--out`, `--preview-output`, and any `--in` as absolute paths inside that root; never interpret `draft/...` relative to the host workspace. Formal targets stay inside the Delivery's `draft/experience/`; exploration targets stay inside its `draft/exploration/` and never enter approval artifacts. Choose distinct targets that do not exist, reject symbolic links at controlled boundaries, and never overwrite a prior attempt or approved artifact. Keep the approved Brief as the formal coverage plan; exploration uses only its bounded provisional Decision/Rule set. Do not create normal manifest evidence before a formal launch reaches `ready`.

## Launch state machine

Start one interactive process with the live-help equivalent of `pen interactive --out <new-output.pen> --enable-preview --preview-output <new-preview.png>`. For a correction, use the supported `--in <prior-input.pen>` form while keeping both output targets new; the prior file is read-only input.

Before launch, identify how the current host resumes an interactive terminal. Observe the complete launch result: output, liveness or termination, and any resumable terminal/session/job handle or channel. If launch yields, persist that handle before the surrounding tool call ends and send every later input through the same channel. Output text is not a handle; never project a structured launch result down to stdout alone. If the host exposes no resumable interactive channel, stop before launch and report a host-capability blocker.

| Observed state | Meaning | Required action |
| --- | --- | --- |
| process alive; output empty or prompt not seen yet | `running` | retain the handle and wait/poll the same process |
| `pen >` prompt seen | `ready` | continue through the same handle |
| Pen live-help/prelaunch/launch returned an explicit error, or the Pen process ended | `terminated` | preserve its exact exit/error/output and classify that terminal result |

Empty output from a yield is pending, not failure. Until explicit termination, the launch remains `running` even if the host failed to surface its handle; recover the existing process/liveness through the host instead of claiming Pen is unavailable. While `running`, do not inspect final output files as startup evidence, create failure manifest fields, offer a risk downgrade, or start a second Pen process. Do not route through a wrapper script, Agent Mode, a nested model, MCP, or a plugin.

## Operate the ready session

For the formal route, only after `ready`, copy `experience-manifest.md` to `experience/manifest.md` and copy every approval-bound Coverage/Journey/Screen/State/Step identity and relationship from the Brief. A separate mutation DSL file is not required. In exploration mode, update only the provisional discovery note, never create a formal manifest, and return observations to Definition.

In the same process:

1. Read app state/schema and only relevant guidelines.
2. Create task-shaped Screen/State structures in reviewable batches from each primary job and its required content groups, functional regions, semantic actions, feedback and recovery. Do not force a rough visual style, spend the default work on high-fidelity brand/aesthetic polish, or add decorative affordances whose destinations are not covered.
3. Read back descendants for every Screen/State/Step: meaningful content, semantic controls/signifiers, hierarchy, visible triggers, feedback, destination/result, failure/recovery, re-entry, connections and bounds. Bind every material State to the specific descendant or variant that shows its approved visible delta, actions, feedback and recovery; sharing a Screen root does not make that root sufficient evidence for every State. Root names, root bounds, frame count, icons, or explanatory prose alone do not prove those obligations. Fix missing, clipped, overlapping, contradictory, unreachable, or dangling evidence before claiming coverage. On a non-visual gap, stop inventing the affected path but finish one read-only sweep of the other approved Journeys to consolidate independent gaps. Static/non-clickable evidence may annotate a low-risk transition, but canvas adjacency or a whole-frame hotspot cannot replace a required visible control/result.
4. Complete the manifest realization tables and functional audits. Probe `template-collapse` semantically: shared shells and repeated layouts are allowed, but different primary jobs must still expose their own required content/control structure or a task reason for identical regions.
5. Generate the preview, save the mutable `.pen`, verify the `.pen`, PNG and read-back artifacts, record `Save / clean exit: saved-open`, and retain the same live interactive handle until Experience preflight passes.

## Converge before presentation

Keep every not-yet-performed presentation/Owner-review/approval/final-status lifecycle field `pending`. While the retained Pen process remains alive, run the sibling workflow runtime in a separate process with the complete current artifact set, for example:

```text
node <pm-workflow.mjs> preflight-experience --root <absolute Delivery root> --experience-route pen --artifact draft/experience/manifest.md --artifact draft/experience/prototype.pen --artifact draft/experience/read-back.md --artifact draft/experience/previews/<current>.png --json
```

The canonical validator is deliberately reused and remains fail-fast. On failure, `unresolved_identities` names the current concrete diagnostic, `diagnostic_fingerprint` stably identifies that validation predicate, and `diagnostics_complete: false` warns that later failures may still be masked. Combine that diagnostic with every already visible non-pass manifest row/read-back gap, repair only the current approved `SCR-*`, `STATE-*`, `STEP-*`, `COV-*`, `JNY-*`, audit, or artifact-binding obligation through the same retained Pen handle, then save/read back again. Rerun only after the targeted artifact/read-back evidence actually changes. Continue only when every previously targeted identity disappears from the next diagnostic and that diagnostic fingerprint has not been seen; newly revealed identities, including a same-size substitution, are allowed. Stop if any targeted identity persists, a diagnostic fingerprint repeats, the diagnostic is unidentifiable, or repair requires behavior outside the approved Brief. This finite fingerprint ledger replaces both a fixed retry count and an unbounded loop. When preflight returns `ok` with `diagnostics_complete: true`, exit Pen cleanly, change `Save / clean exit` to `yes`, then present the exact preview. An Experience preflight rejection is a contract diagnostic, not Pen termination or tool unavailability. Preflight is read-only and neither records Owner review nor replaces `approve-preview`.

Remove or correct an accidental affordance when that stays inside the approved Brief. If closing the journey requires a new destination or product behavior absent from the Brief, stop before preview approval and follow the Skill's explicit pre-Candidate Draft-revision path; do not invent the missing scope in Pen or report the old coverage as complete.

Do not treat a command echo, exit code, or file existence by itself as proof of success. Confirm command responses, state/read-back, save, preview, preflight, and clean termination.

## Separate structural and visual evidence

Structural read-back can establish node names, text, hierarchy, and computed bounds. It cannot establish typography quality, color harmony, spacing feel, or whether the rendered result is visually acceptable.

- If the Agent can inspect images, inspect the exact generated PNG and record `agent-visual` plus the result.
- If it cannot, record `human-required`, present the exact PNG to the Owner by attachment/rendering or an explicit local path, and state that the Agent has not visually verified it.
- If the Owner cannot access the PNG either, stop with Experience pending.

Only a later context-bound Owner reply after the preview was presented can approve it. Never infer visual approval from Brief approval, save success, or structured read-back.

## Record only a terminal failure

Diagnose operation errors and recover with judgment. You may correct, retry, split, or otherwise adjust the Pen work while preserving the approved Screen/State/Step obligations and the true process/document state; never simplify the contract merely to make a command succeed or claim completion without final evidence. Before starting a new process, establish that the prior process is terminal and use fresh targets.

Only an explicit terminated Pen prelaunch/launch/session failure that remains unresolved can become `tool-unavailable`; an Experience preflight validation failure cannot. Then create the manifest, bind an independent terminal-evidence artifact, mark unrealized functional evidence `unverified`, record the exact non-secret terminal result, missing evidence, and one product impact, present those facts to the Owner, and stop. Only the Owner's later exact reply accepting continuation without the formal artifact can authorize the unavailable continuation path; generic permission and Agent-authored words cannot.

Record the compact launch state, one-process result, structural/visual review, preview presentation, save/exit result, Coverage/Journey read-back, dangling-affordance result, output identities, and asset provenance in `experience/manifest.md`.
