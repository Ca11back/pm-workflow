# Pen direct operation contract

Use this reference only when `experience_target: pen`, Phase is experience, and the implementation-target Brief has been explicitly approved. A legacy Definition exploration returns to `pm-definition` and must not enter this authoring sequence. The local authority used to define this contract is Pen CLI 0.3.0 Interactive help. This is an internal Agent procedure; do not expose route names, commands, flags, file paths, node IDs, or setup details in ordinary PM interaction.

## Route policy and boundary

Prefer a persistent terminal/PTY process running headless `pen interactive` with an output inside the current bundle. App mode is allowed when an approved running Pen app/document already exists, but the resulting `.pen` source and preview exports must still be placed in the Candidate bundle. An already configured official Pen MCP/direct surface is an equivalent secondary route only when the current PM Agent can directly perform state read, batched node read, deterministic mutation, structural validation, targeted visual inspection/export, persistence, and read-back on the same `.pen` artifact.

Interactive is a CLI tool shell from the host Agent's perspective. Its operations may use Pen's MCP-shaped tool syntax internally, but the host does not need to configure an MCP server for the CLI route. Do not add an adapter, runtime, or configuration schema.

The current PM Agent retains design control. Never use Pen's top-level prompt or managed-Agent generation modes, including `--prompt/-p`, `--prompt-file/-f`, `--agent`, `--model/-m`, `--tasks/-t`, or `--custom`; never start a nested Pen Agent or install/copy a prompt-oriented Pen Skill as another PM entry.

Pen scope is always proportional. For a small Change, touch only the affected screen/section and material before/after or boundary states. For an existing authoritative `.pen`, inspect and edit the related nodes while preserving unrelated work. For a Capability, cover the current vertical path; for a Product, cover only the Active Slice and explicit shared dependencies. Flow, storyboard, page/state inventory, low-fidelity wireframes, static screens, and detailed visuals are all valid Pen scopes. Clickability and full-product coverage are not defaults.

## Bundle paths and preflight

- Check the direct routes available in the caller's environment and record the non-secret discovery result. Failure or absence of one optional integration does not prove that every direct route is unavailable.
- Verify that the selected route can read current state and expose the direct operations required for the approved scope, then attempt one concrete operation. Capability discovery alone is not execution evidence.
- New headless source: `pen interactive --out <bundle-root>/experience/prototype.pen`.
- Existing source iteration: use `--in` and `--out` so the result remains inside the current Candidate bundle.
- Approved running app: app mode may be used internally, then save/copy the source into `experience/prototype.pen` before Candidate freeze.
- Headless work requires a persistent process with stdin/stdout control and an explicit output path.
- Authentication or service availability is a host/admin concern. Record the exact non-secret limitation; never ask the PM for tokens, session files, account data, URLs, login commands, or MCP configuration.

## Direct authoring sequence

0. Verify `experience/brief.md` exists and records the PM/Owner's explicit approval words/date for the concrete scope and fidelity. Generic workflow-continuation permission is invalid. Until this gate passes, do not call `batch_design` or any other mutation/export/save operation.
1. Start with `get_editor_state({ include_schema: true })` and record document identity/schema availability.
2. Load `get_guidelines()` and only the one relevant guide/style when needed.
3. Use `batch_get(...)` for top-level, component, and affected-node discovery. Combine reads instead of reading nodes one at a time.
4. Derive deterministic `batch_design(...)` operations from the recorded business-language brief and current Markdown behavior. Use bounded batches sized to the route's documented limits and verify each batch before continuing. The scope/fidelity must already be approved after Definition exit; the artifact may not invent or settle product rules.
5. Use `snapshot_layout(...)` to inspect clipping, overlap, size, and structural placement; correct material problems before visual approval.
6. Use `get_screenshot(...)` sparingly for a meaningful section, then `export_nodes(...)` to create one or more PM/reviewer preview images under `experience/previews/`.
7. Perform an independent `batch_get(...)` read-back of affected nodes and compare names, content, states, actions, and coverage against `experience/brief.md` and the mapped Markdown locators.
8. Call `save()`, verify the `.pen` file and exports exist outside the shell, and call `exit()` cleanly.

Available optional operations such as variables or HTML export are loaded only when the approved target requires them. Screenshots are evidence after meaningful work, not a per-operation ritual.

If authoring reveals a behavior gap, stop mutation, return to the mapped Markdown Decision/Rule/Scenario through `pm-definition`, and rerun the Definition exit. Do not fill the gap inside Pen.

## Evidence contract

Record these internal fields in `experience/manifest.md` and summarize them in `START-HERE.md`, including the brief identity and explicit scope/fidelity approval evidence that preceded mutation. If the direct route becomes unavailable, record route discovery, capability check, one concrete attempted operation, the allowed retry result, exact limitation, and product risk. A bare unavailability claim or the absence of one optional integration is invalid evidence.

```text
experience_target: pen
experience_status: pending | completed | skipped-risk
experience_reason: plain-language reason | tool-unavailable
route_identity: interactive-headless | interactive-app | official-direct | unavailable
visual_role: exploration | implementation-target
scope_and_fidelity: smallest affected flow/pages/states and plain-language detail
source: experience/prototype.pen
brief: experience/brief.md
previews: experience/previews/<file>.png
covered_markdown: bundle-relative file.md#ID locators
covered_pen_nodes: experience/prototype.pen#<node-id> locators
structural_check: result and material fixes
visual_check: targeted screenshot/export result
read_back: nodes checked and brief/Markdown comparison
save_status: saved | failed | unavailable
```

Keep a successfully executed exploration at `experience_status: pending`. Set a successfully validated implementation target to `experience_status: completed` only after the formal read-back and PM preview contract passes. Reserve `experience_status: skipped-risk`, `experience_reason: tool-unavailable`, and `route_identity: unavailable` for the unavailable branch below.

Pass the physical `bundle_root` separately from every bundle-relative locator. These fields are Agent/reviewer traceability data, not ordinary PM-facing copy.

## Failure and retry

One retry is allowed only for a concrete recoverable direct-operation error. If state read, direct mutation, save, export, or read-back still cannot be verified after an applicable retry, set `experience_status: skipped-risk`, `experience_reason: tool-unavailable`, and `route_identity: unavailable`. Record the route discovery, capability check, attempted operation, retry result, limitation, and one product risk in the manifest and summarize its identity in `START-HERE.md`. Then stop formal Pen authoring. Do not switch to a managed Agent mode or another prototype product. Continue Markdown product definition when possible. Keep the Candidate gate unfinished until the PM/Owner sees the limitation and impact and explicitly chooses to continue without the artifact.

## Review usage

Reviewers never mutate the authoritative Candidate or Release `.pen`. Use a read-only direct capability or an isolated copy/output only within the caller-authorized write scope, then perform state, batched read, layout, and screenshot inspection only. If no authorized isolated inspection is available, review the exported previews and recorded read-back evidence and state that `.pen` structure was not independently verified.
