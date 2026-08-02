# Direct Pen interactive operation

Use only for the `pen` Experience route after a hash-bound Brief approval. This is an internal Agent procedure; keep commands, paths, node IDs, and setup details out of ordinary PM interaction unless they are needed to let the Owner access a preview or request diagnostics.

## Use the installed CLI as the contract

Run `pen version`, `pen status`, and `pen interactive --help` directly. Support Pen 0.3.1 or later only. The live interactive help is the operation reference for that session; do not ask the PM runtime to parse it, copy an older tool map into the Skill, or add an adapter between the Agent and Pen.

Continue only when the live CLI exposes headless interactive output, explicit preview output, state/schema read, document mutation, structural read-back, save, and exit. In Pen 0.3.1 these operations include `get_app_state`, `get_guidelines`, `execute`, `get_screenshot`, `save()`, and `exit()`; use their current live-help signatures rather than memorized parameters.

## Prepare safe new targets

Resolve the explicit Delivery root. Keep the `.pen` output and PNG preview under real, non-symbolic-link directories inside `draft/experience/`. Choose distinct targets that do not exist and never overwrite a prior attempt or approved artifact. Verify that the final `draft/experience/brief.md` is bound by `approve-brief`; do not edit it after approval.

Create `experience/manifest.md` after Brief approval. Copy every approval-bound Coverage ID, Markdown locator, page/state, and short runtime relationship from the Brief. This manifest is the audit plan and lifecycle evidence; a separate mutation DSL file is not required.

## Keep one direct interactive process

Start Pen directly with the live-help-documented equivalents of:

```text
pen interactive --out <new-output.pen> --enable-preview --preview-output <new-preview.png>
```

Use the host's supported interactive-terminal mechanism to retain this process and send later input to it. A yielded or still-running process is not a failure. Do not start another Pen process for the next command, and do not route through a wrapper script, Agent Mode, a nested model, MCP, or a plugin.

In the same process:

1. Read app state/schema before mutation.
2. Load only relevant design guidelines and inspect the current document.
3. Create the approved pages/states with direct interactive mutations in bounded, reviewable batches.
4. Read back visible names/content and computed bounds; fix missing, clipped, overlapping, or contradictory states.
5. Confirm every Coverage ID and approved relationship in the manifest maps to the intended visible evidence.
6. Generate the configured preview, save to the requested `.pen`, verify both files exist, then exit cleanly.

Do not treat a command echo, exit code, or preview-file existence by itself as proof of success. Inspect Pen responses for errors and confirm state/read-back/save results. Preserve non-secret stderr/stdout when startup fails; this keeps errors such as authentication failure or an occupied transport socket visible without a wrapper translating them.

## Separate structural and visual evidence

Structural read-back can establish node names, text, hierarchy, and computed bounds. It cannot establish typography quality, color harmony, spacing feel, or whether the rendered result is visually acceptable.

- If the Agent can inspect images, inspect the exact generated PNG and record `agent-visual` plus the result.
- If it cannot, record `human-required`, present the exact PNG to the Owner by attachment/rendering or an explicit local path, and state that the Agent has not visually verified it.
- If the Owner cannot access the PNG either, stop with Experience pending.

Only a later context-bound Owner reply after the preview was presented can approve it. Never infer visual approval from Brief approval, save success, or structured read-back.

## Fail closed without retry loops

Any missing executable, unsupported version, unavailable authentication/service, missing initial prompt, Pen error, lost interactive process, failed save/read-back/preview, or absent output ends the current action. Report the exact non-secret limitation and one product impact. Do not automatically retry, delete a global Pen socket, switch tools, or claim formal Experience completion. A later Owner-authorized attempt uses fresh targets.

Record the Pen version, live-help check, one-process direct session result, structural read-back, visual-review mode, preview presentation, save/exit result, coverage, output identities, and external-asset provenance in `experience/manifest.md`.
