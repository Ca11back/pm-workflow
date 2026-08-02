# Direct Pen interactive operation

Use only for the `pen` route after Brief approval. Keep internal commands and IDs out of PM interaction unless needed for preview access or diagnostics. Run `pen version`, `pen status`, and `pen interactive --help` directly; support 0.3.1+ and use that live help rather than a runtime parser, copied tool map, or adapter.

Continue only when the live help exposes headless output, preview output, state/schema read, mutation, structural read-back, save, and exit. Resolve the explicit Delivery root, keep the `.pen` and PNG under real, non-symbolic-link directories inside `draft/experience/`, and choose distinct targets that do not exist. Never overwrite a prior attempt or approved artifact. Keep the approved Brief as the coverage plan; do not create normal manifest evidence before the launch reaches `ready`.

## Launch state machine

Start one interactive process with the live-help equivalent of `pen interactive --out <new-output.pen> --enable-preview --preview-output <new-preview.png>`.

Observe the complete launch result: output, process liveness or termination, and the resumable process handle/identifier when it is still running. Never project a structured launch result down to stdout alone.

| Observed state | Meaning | Required action |
| --- | --- | --- |
| process alive; output empty or prompt not seen yet | `running` | retain the handle and wait/poll the same process |
| `pen >` prompt seen | `ready` | continue through the same handle |
| preflight/launch returned an explicit error, or process ended | `terminated` | preserve its exact exit/error/output and classify that terminal result |

Empty output from a yield is pending, not failure. Until explicit termination, the launch remains `running` even if the host failed to surface its handle; recover the existing process/liveness through the host instead of claiming Pen is unavailable. While `running`, do not inspect final output files as startup evidence, create failure manifest fields, offer a risk downgrade, or start a second Pen process. Do not route through a wrapper script, Agent Mode, a nested model, MCP, or a plugin.

## Operate the ready session

Only after `ready`, copy `experience-manifest.md` to `experience/manifest.md` and copy every approval-bound Coverage ID, Markdown locator, page/state, and relationship from the Brief. A separate mutation DSL file is not required.

In the same process:

1. Read app state/schema and only relevant guidelines.
2. Create the approved pages/states in reviewable batches.
3. Read back content/bounds and confirm Coverage IDs; fix missing, clipped, overlapping, or contradictory states.
4. Generate the preview, save the `.pen`, verify both files, and exit cleanly.

Do not treat a command echo, exit code, or file existence by itself as proof of success. Confirm command responses, state/read-back, save, preview, and clean termination.

## Separate structural and visual evidence

Structural read-back can establish node names, text, hierarchy, and computed bounds. It cannot establish typography quality, color harmony, spacing feel, or whether the rendered result is visually acceptable.

- If the Agent can inspect images, inspect the exact generated PNG and record `agent-visual` plus the result.
- If it cannot, record `human-required`, present the exact PNG to the Owner by attachment/rendering or an explicit local path, and state that the Agent has not visually verified it.
- If the Owner cannot access the PNG either, stop with Experience pending.

Only a later context-bound Owner reply after the preview was presented can approve it. Never infer visual approval from Brief approval, save success, or structured read-back.

## Record only a terminal failure

Only an explicit `terminated` preflight/launch/session failure can become `tool-unavailable`. Then create the manifest, record the exact non-secret terminal result and one product impact, and stop. Do not automatically retry, delete a global Pen socket, switch tools, or claim completion. A later Owner-authorized attempt uses fresh targets.

Record the compact launch state, one-process result, structural/visual review, preview presentation, save/exit result, coverage, output identities, and asset provenance in `experience/manifest.md`.
