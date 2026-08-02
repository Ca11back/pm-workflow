import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXIT,
  WorkflowError,
  decodeEvent,
  initialState,
  makeEvent,
  normalizeRelative,
  parseArgs,
  parseV1StartHere,
  reduceEvent,
  renderStartHere,
  runCli,
  sha256Bytes,
  stableJson,
  validateReviewIdentity,
} from "../../runtime/pm-workflow.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("strict arguments reject unknown, duplicate, and positional input", () => {
  assert.throws(() => parseArgs(["status", "--root", "x", "extra"]), WorkflowError);
  assert.throws(() => parseArgs(["status", "--root", "x", "--root", "y"]), WorkflowError);
  assert.throws(() => parseArgs(["status", "--mystery", "x"]), WorkflowError);
});

test("standard help aliases resolve without a fake command failure", () => {
  assert.deepEqual(parseArgs(["--help"]), { command: "help", options: {} });
  assert.deepEqual(parseArgs(["-h"]), { command: "help", options: {} });
  assert.deepEqual(parseArgs(["--help", "--json"]), { command: "help", options: { json: true } });
  assert.throws(() => parseArgs(["--help", "--help", "--json"]), /不能重复/);
  assert.throws(() => parseArgs(["-h", "--help", "--json"]), /不能重复/);
});

test("every valid subcommand supports isolated read-only help aliases", async () => {
  assert.deepEqual(parseArgs(["init", "--help"]), { command: "help", options: { targetCommand: "init" } });
  assert.deepEqual(parseArgs(["init", "-h"]), { command: "help", options: { targetCommand: "init" } });
  assert.deepEqual(parseArgs(["status", "--help", "--json"]), { command: "help", options: { targetCommand: "status", json: true } });
  assert.throws(() => parseArgs(["init", "--root", "delivery", "--help"]), /不能与执行参数同时使用/);

  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["init", "--help", "--json"], {
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write: (value) => { stderr += value; } },
  });
  assert.equal(exitCode, EXIT.OK);
  assert.equal(stderr, "");
  const result = JSON.parse(stdout);
  assert.equal(result.command, "help");
  assert.equal(result.target_command, "init");
  assert.equal(result.usage, "pm-workflow init [options]");
  assert.ok(result.options.includes("--root"));
  assert.ok(result.options.includes("--help"));
  assert.ok(result.options.includes("-h"));
});

test("path normalization rejects POSIX and Windows traversal", () => {
  assert.equal(normalizeRelative("draft\\experience\\brief.md"), "draft/experience/brief.md");
  for (const unsafe of ["../secret", "draft/../../secret", "/absolute", "C:\\secret", "draft/CON.md", "draft/bad:name.md", "draft/trailing. "]) {
    assert.throws(() => normalizeRelative(unsafe), WorkflowError);
  }
});

test("event decoder rejects unknown schema and fields", () => {
  const state = initialState("DEL-core");
  const event = makeEvent({
    state,
    type: "created",
    actor: { role: "pm-agent", label: "PM Agent" },
    payload: { title: "Core", owner: "Owner" },
    occurredAt: "2026-07-30T12:00:00.000Z",
  });
  assert.equal(decodeEvent(structuredClone(event)).event_id, "EVT-000001");
  assert.throws(() => decodeEvent({ ...event, schema_version: 99 }), (error) => error.exitCode === EXIT.INTEGRITY);
  assert.throws(() => decodeEvent({ ...event, unexpected: true }), WorkflowError);
  assert.throws(() => decodeEvent({ ...event, payload: { ...event.payload, title: 42 } }), WorkflowError);
});

test("one semantic contract validates payload, actor, artifact, and path relationships for every event kind", () => {
  const migrationReport = {
    schema: "v1-start-here-known-fields",
    title: "Imported",
    owner: "Owner",
    source_phase: "experience",
    mapped_phase: "definition",
    definition_approval_classification: "not-evaluated",
    explicit_evidence: { definition_approval: "批准当前定义" },
    observed: { candidate_gate: "pending", review_status: "not-run", release_sent: "no", receipt_status: "pending" },
    contradictions: [],
    missing: [],
    can_apply: true,
  };
  const sha = (letter) => letter.repeat(64);
  const artifact = (pathValue, hash = sha("d")) => ({ path: pathValue, sha256: hash });
  const cases = [
    { type: "created", role: "pm-agent", payload: { title: "Title", owner: "Owner" }, artifacts: [], corrupt: (payload) => { payload.title = 1; } },
    { type: "v1-imported", role: "pm-agent", payload: { source_sha256: sha("a"), migration_report: migrationReport }, artifacts: [artifact("source/v1-START-HERE.md", sha("a")), artifact("source/v1-migration-report.json", sha256Bytes(stableJson(migrationReport, true)))], corrupt: (payload) => { delete payload.migration_report.observed.receipt_status; } },
    { type: "brainstorm-patch-recorded", role: "pm-agent", payload: { base_draft_revision: 1, decision_locator: "delivery.md#DEC-001", patch_path: "draft/patch.md" }, artifacts: [artifact("draft/patch.md")], pathField: "patch_path", corrupt: (payload) => { payload.base_draft_revision = "1"; } },
    { type: "definition-approved", role: "product-owner", payload: { approval_evidence: "批准" }, artifacts: [artifact("draft/delivery.md")], corrupt: (payload) => { payload.approval_evidence = false; } },
    { type: "brief-approved", role: "product-owner", payload: { approval_evidence: "批准", experience_route: "not-needed" }, artifacts: [artifact("draft/experience/brief.md")], corrupt: (payload) => { payload.experience_route = "unknown"; } },
    { type: "preview-approved", role: "product-owner", payload: { approval_evidence: "批准", experience_route: "not-needed" }, artifacts: [artifact("draft/experience/evidence.md"), artifact("draft/experience/manifest.md")], corrupt: (payload) => { payload.approval_evidence = []; } },
    { type: "draft-revision-started", role: "product-owner", payload: { return_phase: "definition", revision_evidence: "按预览反馈修订" }, artifacts: [artifact("draft/delivery.md")], corrupt: (payload) => { payload.return_phase = "candidate"; } },
    { type: "candidate-frozen", role: "pm-agent", payload: { candidate_id: "CAND-core-r1", candidate_path: "candidates/CAND-core-r1", manifest_sha256: sha("b"), draft_revision: 1 }, artifacts: [artifact("candidates/CAND-core-r1/MANIFEST.json", sha("b"))], pathField: "candidate_path", corrupt: (payload) => { payload.draft_revision = "1"; } },
    { type: "review-recorded", role: "reviewer", payload: { review_id: "REV-core-01", review_path: "reviews/review.md", review_mode: "self-check", outcome: "passed", candidate_id: "CAND-core-r1", candidate_manifest_sha256: sha("b"), source_session_id: "s", review_session_id: "s", source_model: "m", review_model: "m", finding_ids: [] }, artifacts: [artifact("reviews/review.md")], pathField: "review_path", corrupt: (payload) => { payload.source_session_id = 9; } },
    { type: "finding-resolution-recorded", role: "product-owner", payload: { finding_id: "FND-001", disposition: "accepted-risk", return_phase: null, resolution_evidence: "接受风险" }, artifacts: [], corrupt: (payload) => { payload.finding_id = 1; } },
    { type: "handoff-confirmed", role: "product-owner", payload: { confirmation_evidence: "确认", candidate_id: "CAND-core-r1", candidate_manifest_sha256: sha("b") }, artifacts: [], corrupt: (payload) => { payload.confirmation_evidence = {}; } },
    { type: "release-created", role: "pm-agent", payload: { release_id: "REL-core-v1", release_path: "releases/REL-core-v1", manifest_sha256: sha("c"), candidate_id: "CAND-core-r1", candidate_manifest_sha256: sha("b"), change_id: null }, artifacts: [artifact("releases/REL-core-v1/MANIFEST.json", sha("c"))], pathField: "release_path", corrupt: (payload) => { payload.change_id = 7; } },
    { type: "send-recorded", role: "authorized-sender", payload: { send_status: "sent-confirmed", channel: "manual", recipient: "Dev", external_reference: "message-1", send_evidence: "已发送" }, artifacts: [], corrupt: (payload) => { payload.recipient = 1; } },
    { type: "receipt-recorded", role: "external-recipient", payload: { receipt_status: "acknowledged", recipient: "Dev", external_reference: "reply-1", receipt_evidence: "已收到" }, artifacts: [], corrupt: (payload) => { payload.receipt_status = "done"; } },
    { type: "change-started", role: "product-owner", payload: { change_id: "CHG-core-001", change_path: "changes/CHG-core-001.md", approval_evidence: "批准变更", release_id: "REL-core-v1", release_manifest_sha256: sha("c") }, artifacts: [artifact("changes/CHG-core-001.md")], pathField: "change_path", corrupt: (payload) => { payload.approval_evidence = 1; } },
  ];
  const rawEvent = ({ type, role, payload, artifacts }) => ({
    schema_version: 2,
    runtime_version: "2.0.0",
    delivery_id: "DEL-payload",
    revision: 1,
    event_id: "EVT-000001",
    type,
    occurred_at: "2026-07-30T12:00:00.000Z",
    actor: { role, label: "Actor" },
    expected_previous_revision: 0,
    previous_event_sha256: null,
    artifacts: structuredClone(artifacts),
    payload: structuredClone(payload),
  });
  for (const item of cases) {
    const event = rawEvent(item);
    assert.equal(decodeEvent(structuredClone(event)).type, item.type);
    const scalar = structuredClone(event);
    item.corrupt(scalar.payload);
    assert.throws(() => decodeEvent(scalar), WorkflowError, `${item.type}: payload`);
    const actor = structuredClone(event);
    actor.actor.role = "intruder";
    assert.throws(() => decodeEvent(actor), WorkflowError, `${item.type}: actor`);
    const artifacts = structuredClone(event);
    artifacts.artifacts = item.artifacts.length ? [] : [artifact("draft/unexpected.md")];
    assert.throws(() => decodeEvent(artifacts), WorkflowError, `${item.type}: artifacts`);
    const missing = structuredClone(event);
    delete missing.payload[Object.keys(missing.payload)[0]];
    assert.throws(() => decodeEvent(missing), WorkflowError, `${item.type}: missing payload key`);
    if (item.pathField) {
      const relationship = structuredClone(event);
      relationship.payload[item.pathField] = "draft/wrong.md";
      assert.throws(() => decodeEvent(relationship), WorkflowError, `${item.type}: path relationship`);
    }
  }
  const corrected = rawEvent({ type: "finding-resolution-recorded", role: "product-owner", payload: { finding_id: "FND-001", disposition: "corrected", return_phase: "definition", resolution_evidence: "已修订" }, artifacts: [artifact("draft/delivery.md")] });
  assert.equal(decodeEvent(corrected).type, "finding-resolution-recorded");
  for (const locator of ["../outside.md#DEC-001", "/absolute.md#DEC-001", "C:\\outside.md#DEC-001"]) {
    const unsafeLocator = rawEvent({ ...cases.find((item) => item.type === "brainstorm-patch-recorded") });
    unsafeLocator.payload.decision_locator = locator;
    assert.throws(() => decodeEvent(unsafeLocator), WorkflowError, locator);
  }
  const human = rawEvent({ ...cases.find((item) => item.type === "review-recorded"), role: "human-reviewer" });
  human.payload.review_mode = "human";
  human.payload.review_session_id = "unknown";
  human.payload.review_model = "unknown";
  assert.equal(decodeEvent(human).actor.role, "human-reviewer");

  const briefWithoutTemplate = rawEvent({
    ...cases.find((item) => item.type === "brief-approved"),
    artifacts: [artifact("draft/experience/route-note.md")],
  });
  assert.throws(() => decodeEvent(briefWithoutTemplate), (error) => error.code === "candidate-reference");
  const briefWithLaterManifest = rawEvent({
    ...cases.find((item) => item.type === "brief-approved"),
    artifacts: [artifact("draft/experience/brief.md"), artifact("draft/experience/manifest.md")],
  });
  assert.throws(() => decodeEvent(briefWithLaterManifest), (error) => error.code === "event-artifacts");
  const previewWithoutManifest = rawEvent({
    ...cases.find((item) => item.type === "preview-approved"),
    artifacts: [artifact("draft/experience/evidence.md")],
  });
  assert.throws(() => decodeEvent(previewWithoutManifest), (error) => error.code === "candidate-reference");
});

test("one reducer owns legal and illegal predecessor checks", () => {
  const empty = initialState("DEL-reducer");
  const created = makeEvent({ state: empty, type: "created", actor: { role: "pm-agent", label: "PM" }, payload: { title: "Reducer", owner: "Owner" } });
  const definition = reduceEvent(empty, created);
  assert.equal(definition.phase, "definition");
  const illegal = {
    ...created,
    revision: 2,
    event_id: "EVT-000002",
    type: "candidate-frozen",
    expected_previous_revision: 1,
    previous_event_sha256: "a".repeat(64),
    artifacts: [{ path: "candidates/CAND-reducer-r1/MANIFEST.json", sha256: "b".repeat(64) }],
    payload: { candidate_id: "CAND-reducer-r1", candidate_path: "candidates/CAND-reducer-r1", manifest_sha256: "b".repeat(64), draft_revision: 1 },
  };
  assert.throws(() => reduceEvent(definition, illegal), /Candidate.*Experience|批准链/);
});

test("renderer is deterministic and exposes one next action", () => {
  const state = { ...initialState("DEL-render"), title: "Render", phase: "definition", status: "ready", blocker: "none", next_skill: "pm-definition", next_action: "确认定义", revision: 1 };
  assert.equal(renderStartHere(state), renderStartHere(structuredClone(state)));
  assert.equal((renderStartHere(state).match(/唯一下一步/g) ?? []).length, 1);
  assert.equal(stableJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
});

test("V1 parser preserves prose only as untrusted evidence and always maps safe imports to Definition", async () => {
  const valid = parseV1StartHere(await readFile(path.join(root, "fixtures", "v1", "valid-experience.md"), "utf8"));
  assert.equal(valid.can_apply, true);
  assert.equal(valid.mapped_phase, "definition");
  assert.equal(valid.definition_approval_classification, "not-evaluated");
  assert.match(valid.explicit_evidence.definition_approval, /批准当前产品定义/);
  const invalid = parseV1StartHere(await readFile(path.join(root, "fixtures", "v1", "contradictory-complete.md"), "utf8"));
  assert.equal(invalid.can_apply, false);
  assert.ok(invalid.contradictions.length >= 3);
  for (const evidence of ["批准当前定义", "未同意", "not confirmed", "approval denied", "已查看", "anything at all"]) {
    const source = (await readFile(path.join(root, "fixtures", "v1", "valid-experience.md"), "utf8")).replace("批准当前产品定义", evidence);
    const report = parseV1StartHere(source);
    assert.equal(report.can_apply, true, evidence);
    assert.equal(report.mapped_phase, "definition", evidence);
    assert.equal(report.definition_approval_classification, "not-evaluated", evidence);
  }
  const unsupportedPhase = parseV1StartHere((await readFile(path.join(root, "fixtures", "v1", "valid-experience.md"), "utf8")).replace("Phase：`experience`", "Phase：`change`"));
  assert.equal(unsupportedPhase.can_apply, false);
  assert.match(unsupportedPhase.contradictions.join("\n"), /cannot be mapped safely/);
});

test("all honest Review identity modes have explicit evidence contracts", () => {
  assert.deepEqual(validateReviewIdentity({ "source-session": "same", "review-session": "same", "source-model": "m", "review-model": "m" }, "self-check"), {
    sourceSession: "same", reviewSession: "same", sourceModel: "m", reviewModel: "m",
  });
  assert.equal(validateReviewIdentity({ "source-session": "s1", "review-session": "s2", "source-model": "m", "review-model": "m" }, "isolated-same-model").reviewSession, "s2");
  assert.equal(validateReviewIdentity({ "source-session": "s1", "review-session": "s2", "source-model": "m1", "review-model": "m2" }, "independent-model").reviewModel, "m2");
  assert.equal(validateReviewIdentity({}, "human").reviewModel, "unknown");
  assert.throws(() => validateReviewIdentity({ "source-session": "s", "review-session": "s", "source-model": "m", "review-model": "m" }, "independent-model"), WorkflowError);
  assert.throws(() => validateReviewIdentity({}, "isolated-same-model"), WorkflowError);
});
