# Pen interactive capability contract

Use only for the `pen` Experience route after a hash-bound Brief approval. This is an internal Agent procedure; do not expose commands, file paths, node IDs, or setup details in ordinary PM interaction.

## Discover, do not assume

Run the vendored runtime's `doctor --json`. It calls local `pen interactive --help`, normalizes and fingerprints help, and returns only non-secret capability metadata. It does not read tokens, account configuration, session files, or environment credentials.

Continue only when discovered help proves `get_editor_state`, `batch_get`, `batch_design`, `snapshot_layout`, `get_screenshot`, preview output, and `save()`. Version text alone is insufficient. Unknown, partial, or missing capabilities fail closed.

## Prepare one approved input

Resolve the absolute Delivery root. `draft/experience/` and every design/output/preview parent must already be a real directory beneath that root; no component may be a symbolic link. All three CLI paths are Delivery-relative, begin with `draft/experience/`, contain no traversal, and are distinct. The design file must exist as regular UTF-8 text. The `.pen` output and `.png` preview must not exist; final publication uses filesystem hard links that reject existing destinations.

Verify that `draft/experience/brief.md` was bound by the successful `approve-brief` event and already contains the explicit PM/Owner approval words/date. Do not edit that Brief after approval. Create the worksheet, manifest, mutation input, Pen source, read-back, and preview only after this gate.

First copy [pen-design-input.md](../assets/pen-design-input.md) to the Delivery and complete one coverage row for every approved Brief page/state. Copy each Coverage ID and its short relationship statement unchanged from the approved Brief. The separate design file contains only visible `batch_design` DSL input that is auditable and strictly derived from those rows. Use the current discovered contract's full `Insert`, `Update`, and `Delete` operation names; shorthand operation calls are unsupported and the runner rejects them before Pen starts. Captured variables and unique display-name string parents are both allowed. Brief approval does not imply approval of raw DSL. The file does not contain the worksheet, `batch_design(...)`, state/layout/screenshot calls, `save()`, `exit()`, or an interactive transcript. Treat this file as the only mutation payload and hash it in `experience/manifest.md`.

## Run one mechanical session

Resolve this Skill's sibling runner and call it once:

```bash
node <skill-root>/scripts/run-pen-session.mjs \
  --root <absolute-Delivery-root> \
  --design-file draft/experience/prototype-design.txt \
  --out draft/experience/prototype.pen \
  --preview draft/experience/prototype.png \
  --json
```

Never run `pen interactive` by hand, start a nested Pen Agent, use Pen prompt/managed-Agent generation, or route through a PM MCP/plugin. The runner uses Node 20+ with no third-party dependency and spawns exactly one `pen interactive` child with `shell: false`, `--enable-preview`, and `--preview-output`. That one child creates one new document and receives exactly these separate physical lines in order:

1. `get_editor_state` for the new document;
2. exactly one `batch_design` containing the Brief-derived design file;
3. whole-document `snapshot_layout` with no cross-session node ID;
4. `get_screenshot` with the documented `document` target;
5. `save()` on its own line;
6. whole-document `batch_get` read-back with no node ID;
7. `exit()` on its own line.

No second interactive process or recovery session is allowed. In particular, never reuse node IDs observed in another process, and never append `save()` or `exit()` to a tool line. The preview is produced by that same session at the explicit preview path; a separate node export would require IDs and is not part of this new-document contract.

The runner creates one high-entropy mode-700 temporary directory under `draft/experience/`; Pen sees only its temporary `.pen` and `.png` paths. After validating those bytes, the runner re-checks that both final paths are absent and hard-links the verified `.pen` first, then the verified preview. `link()` is the publication commit: it does not overwrite an existing destination, and the runner never unlinks or renames a final path.

If the first link conflicts, the foreign path remains and nothing is published. If the second link conflicts or otherwise fails, the first verified final remains as an explicitly reported partial publish; error details include `published_paths`, the failed/conflicting path, and `partial_publish=true`. Do not roll back that final or claim complete evidence.

Temporary cleanup has a two-phase boundary. Before deleting anything, the runner checks the recorded directory identity. After an early failure it removes only an identity-matched empty runner-owned directory; any unexpected entry, partial artifact set, symlink, or identity mismatch preserves the whole directory without deleting an entry. After both temporary artifacts have already passed full verification, cleanup still requires exactly `output.pen` and `preview.png`, both regular non-symlink files, before unlinking either name and removing the empty directory.

## Fail closed and record evidence

Success requires zero exit status with no signal, timeout, or textual Pen `Error`; a confirmed state read, mutation, clean layout, strictly decoded base64 PNG screenshot, exact temporary save path, and non-empty document read-back; plus a fatal-UTF-8-decoded, non-empty JSON `.pen` file and PNG-signature preview at the requested final paths. Final and temporary files must share the same inode immediately after each link; final bytes and hashes are read back before temporary cleanup.

This is a non-adversarial same-UID boundary, not protection against a malicious process running as the same operating-system user and swapping files between checks. The hard-link operation itself remains atomic and no-overwrite. Do not describe the broader workflow as an absolute security boundary.

Any runner failure ends the current action immediately. Do not start an automatic or manual Pen retry. If the Owner later explicitly requests another attempt, treat it as a new authorized action with new targets, not as part of this invocation. Report `tool-unavailable` evidence plus one product impact and ask for explicit Owner risk acceptance; do not silently switch tools or claim completion.

Windows package managers commonly expose Pen as `pen.cmd`, which cannot be safely proven launchable with this runner's required shell-free policy. The default runner therefore reports `platform-unsupported` on Windows instead of enabling a shell. Do not claim Windows support until a native shell-free executable contract is verified.

Record the doctor fingerprint, design/output/preview hashes, one-process runner result, layout/screenshot/save/read-back results, coverage, and external asset provenance in `experience/manifest.md`.

## Review boundary

Reviewers never mutate an authoritative Candidate or Release `.pen`. Use a read-only capability or caller-authorized isolated copy, otherwise inspect exact exports/read-back evidence and disclose the structural limitation.
