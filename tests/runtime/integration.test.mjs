import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const candidateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runtime = path.join(candidateRoot, "runtime", "pm-workflow.mjs");
const temporaryRoot = path.join(candidateRoot, "tests", ".tmp");
await mkdir(temporaryRoot, { recursive: true });

function cli(args, { env = process.env } = {}) {
  const actual = args.includes("--json") ? args : [...args, "--json"];
  const result = spawnSync(process.execPath, [runtime, ...actual], { encoding: "utf8", env });
  let output;
  try { output = JSON.parse(result.stdout); } catch { output = { parse_error: true, stdout: result.stdout, stderr: result.stderr }; }
  return { status: result.status, output, stderr: result.stderr };
}

async function newRoot(t, prefix = "delivery-") {
  const root = await mkdtemp(path.join(temporaryRoot, prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

const validBrief = [
  "# Brief",
  "",
  "当前范围没有新增可见界面。",
  "",
  "## Required coverage",
  "",
  "- Re-entry / retrieval：用户通过既有入口再次查看当前状态；本测试不新增导航。",
  "",
  "## Locator map",
  "",
  "| Coverage ID | Markdown locator | Plain-language behavior | Required page/state | Runtime relationship | Expected Pen node purpose |",
  "| --- | --- | --- | --- | --- | --- |",
  "| `PAGE-01` | `delivery.md#RULE-001` | 查看当前状态 | 既有状态 | 独立既有页面 | 既有参考 |",
  "",
  "## Journey closure",
  "",
  "| Journey ID | First entry and initiating path | Immediate result | Later re-entry / retrieval | Recovery or terminal path |",
  "| --- | --- | --- | --- | --- |",
  "| `JNY-001` | `PAGE-01` | `PAGE-01` | `PAGE-01` | 当前状态保持可见 |",
  "",
].join("\n");

function withJourneyEvidence(text) {
  return [
    text.trimEnd(),
    "",
    "## Coverage map",
    "",
    "| Coverage ID | Markdown locator | Pen node locator | Preview/state | Runtime relationship | Sync result |",
    "| --- | --- | --- | --- | --- | --- |",
    "| `PAGE-01` | `delivery.md#RULE-001` | existing reference `PAGE-01` | 既有状态 | 独立既有页面 | synced |",
    "",
    "## Journey closure map",
    "",
    "| Journey ID | Approved Coverage path | Observed Pen/reference path | Closure result |",
    "| --- | --- | --- | --- |",
    "| `JNY-001` | `PAGE-01` | existing reference `PAGE-01` | closed |",
    "",
    "- Journey closure read-back：JNY-001 已从既有入口核对到当前结果。",
    "- Dangling affordances：none；本测试没有新增可见入口。",
    "- Re-entry / retrieval coverage：PAGE-01 通过既有入口覆盖。",
    "",
  ].join("\n");
}

function withDefinitionExperience(text) {
  return [
    text.trimEnd(),
    "",
    "## Experience requirements",
    "",
    "- Required behavior coverage：delivery.md#RULE-001",
    "- Required roles / pages / states：用户查看当前状态；无新增可见状态。",
    "- Required journey closure：用户通过既有入口再次查看当前状态。",
    "",
  ].join("\n");
}

async function seedDraft(root) {
  await mkdir(path.join(root, "draft", "experience"), { recursive: true });
  await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery\n\n- RULE-001: 用户可以查看当前状态。\n"));
  await writeFile(path.join(root, "draft", "experience", "brief.md"), validBrief);
  await writeFile(path.join(root, "draft", "experience", "evidence.md"), "# Experience evidence\n\nnot-needed: 当前范围仅整理既有行为。\n");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), withJourneyEvidence([
    "# Experience manifest",
    "",
    "- Candidate artifact：`experience/brief.md`",
    "- Candidate artifact：`experience/manifest.md`",
    "- Candidate artifact：`experience/evidence.md`",
    "",
  ].join("\n")));
}

async function replaceControlledDirectoryWithSymlink(root, name) {
  await rename(path.join(root, name), path.join(root, `${name}-real`));
  await symlink(`${name}-real`, path.join(root, name), "dir");
}

test("documented new-Delivery bootstrap initializes before evidence capture", async (t) => {
  const parent = await newRoot(t, "bootstrap-");
  const root = path.join(parent, "DEL-bootstrap");
  const initialized = cli([
    "init", "--root", root, "--delivery-id", "DEL-bootstrap", "--title", "Bootstrap", "--owner", "产品负责人",
    "--expect-revision", "0", "--actor-role", "pm-agent", "--actor-label", "PM Agent",
  ]);
  assert.equal(initialized.status, 0, JSON.stringify(initialized));
  await writeFile(path.join(root, "source", "request.md"), "# Raw request\n\nUntrusted input evidence.\n");
  const status = cli(["status", "--root", root]);
  assert.equal(status.status, 0, JSON.stringify(status));
  assert.equal(status.output.state.phase, "definition");
  assert.equal(status.output.state.next_skill, "pm-definition");
});

test("init rejects an invented Agent actor before creating the Delivery root", async (t) => {
  const parent = await newRoot(t, "invalid-init-actor-");
  const root = path.join(parent, "DEL-invalid-actor");
  const result = cli([
    "init", "--root", root, "--delivery-id", "DEL-invalid-actor", "--title", "Invalid actor", "--owner", "Owner",
    "--expect-revision", "0", "--actor-role", "agent", "--actor-label", "Invented Agent",
  ]);
  assert.equal(result.status, 2, JSON.stringify(result));
  assert.equal(result.output.error.code, "event-actor");
  assert.deepEqual(await readdir(parent), []);
});

test("Brief approval rejects the later Experience manifest but allows the final Brief and route evidence", async (t) => {
  const root = await newRoot(t, "brief-approval-order-");
  const routeNote = "# Stable not-needed route justification\n";
  assert.equal(cli(["init", "--root", root, "--delivery-id", "DEL-brief-order", "--title", "Brief order", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await seedDraft(root);
  await writeFile(path.join(root, "draft", "experience", "route-note.md"), routeNote);
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准定义", "--actor-role", "product-owner"]).status, 0);
  const rejected = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准最终 Brief", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(rejected.status, 2, JSON.stringify(rejected));
  assert.equal(rejected.output.error.code, "event-artifacts");
  assert.equal((await readdir(path.join(root, "events"))).length, 2);
  const accepted = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--artifact", "draft/experience/route-note.md", "--evidence", "批准最终 Brief（2026-08-01）", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(accepted.status, 0, JSON.stringify(accepted));
  const briefEventPath = path.join(root, "events", "000003-brief-approved.json");
  const originalBriefEvent = await readFile(briefEventPath, "utf8");
  const storedWithManifest = JSON.parse(originalBriefEvent);
  storedWithManifest.artifacts.push({ path: "draft/experience/manifest.md", sha256: "a".repeat(64) });
  await writeFile(briefEventPath, `${JSON.stringify(storedWithManifest, null, 2)}\n`);
  const storedReplay = cli(["status", "--root", root]);
  assert.equal(storedReplay.status, 5, JSON.stringify(storedReplay));
  assert.equal(storedReplay.output.error.code, "stored-event-invalid");
  assert.equal(storedReplay.output.error.details.original_code, "event-artifacts");
  assert.equal((await readdir(path.join(root, "events"))).length, 3);
  await writeFile(briefEventPath, originalBriefEvent);
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), "# Manifest changed after Brief approval\n");
  const manifestDrift = cli(["status", "--root", root]);
  assert.equal(manifestDrift.status, 0, JSON.stringify(manifestDrift));
  assert.equal(manifestDrift.output.ok, true, JSON.stringify(manifestDrift));
  assert.doesNotMatch(JSON.stringify(manifestDrift.output.integrity_issues), /approval:brief/);
  await writeFile(path.join(root, "draft", "experience", "route-note.md"), "# Route evidence changed after approval\n");
  const routeDrift = cli(["status", "--root", root]);
  assert.equal(routeDrift.status, 0, JSON.stringify(routeDrift));
  assert.equal(routeDrift.output.ok, false);
  assert.match(JSON.stringify(routeDrift.output.integrity_issues), /approval:brief/);
  await writeFile(path.join(root, "draft", "experience", "route-note.md"), routeNote);
  await writeFile(path.join(root, "draft", "experience", "brief.md"), "# Brief changed after approval\n");
  const briefDrift = cli(["status", "--root", root]);
  assert.equal(briefDrift.status, 0, JSON.stringify(briefDrift));
  assert.equal(briefDrift.output.ok, false);
  assert.match(JSON.stringify(briefDrift.output.integrity_issues), /approval:brief/);
});

test("approval gates reject unresolved Definition coverage and incomplete journey evidence", async (t) => {
  const root = await newRoot(t, "journey-gates-");
  assert.equal(cli(["init", "--root", root, "--delivery-id", "DEL-journey-gates", "--title", "Journey gates", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await mkdir(path.join(root, "draft", "experience"), { recursive: true });
  await writeFile(path.join(root, "draft", "delivery.md"), [
    "# Delivery",
    "",
    "## Experience requirements",
    "",
    "- Required behavior coverage：待确认后补充。",
    "- Required roles / pages / states：待确认后补充。",
    "",
  ].join("\n"));
  const unresolvedDefinition = cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]);
  assert.equal(unresolvedDefinition.status, 2, JSON.stringify(unresolvedDefinition));
  assert.equal(unresolvedDefinition.output.error.code, "definition-experience-requirements");
  assert.equal((await readdir(path.join(root, "events"))).length, 1);

  await writeFile(path.join(root, "draft", "delivery.md"), [
    "# Delivery",
    "",
    "## Experience requirements",
    "",
    "- Required behavior coverage：delivery.md#RULE-001",
    "- Required roles / pages / states：用户查看异步结果的正常和失败状态。",
    "- Required journey closure：用户可从既有结果入口再次查看当前状态；不规定固定页面名称。",
    "",
  ].join("\n"));
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 0);

  await writeFile(path.join(root, "draft", "experience", "brief.md"), "# Brief\n\n- Re-entry / retrieval：用户可再次查看结果。\n");
  const incompleteBrief = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(incompleteBrief.status, 2, JSON.stringify(incompleteBrief));
  assert.equal(incompleteBrief.output.error.code, "experience-journey");
  await writeFile(path.join(root, "draft", "experience", "brief.md"), validBrief.replace("| `JNY-001` | `PAGE-01` | `PAGE-01` | `PAGE-01` | 当前状态保持可见 |", "| `JNY-001` |  |  |  |  |"));
  const emptyJourney = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(emptyJourney.status, 2, JSON.stringify(emptyJourney));
  assert.equal(emptyJourney.output.error.code, "experience-journey");
  await writeFile(path.join(root, "draft", "experience", "brief.md"), validBrief.replace("| `JNY-001` | `PAGE-01` |", "| `JNY-001` | PAGE-02 |"));
  const unknownCoverage = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(unknownCoverage.status, 2, JSON.stringify(unknownCoverage));
  assert.equal(unknownCoverage.output.error.code, "experience-journey");
  await writeFile(path.join(root, "draft", "experience", "brief.md"), validBrief);
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);

  await writeFile(path.join(root, "draft", "experience", "manifest.md"), "# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n");
  const incompleteManifest = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(incompleteManifest.status, 2, JSON.stringify(incompleteManifest));
  assert.equal(incompleteManifest.output.error.code, "experience-journey-evidence");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), withJourneyEvidence("# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n").replaceAll("JNY-001", "JNY-002"));
  const mismatchedJourney = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(mismatchedJourney.status, 2, JSON.stringify(mismatchedJourney));
  assert.equal(mismatchedJourney.output.error.code, "experience-journey-evidence");
  const wrongCoveragePath = withJourneyEvidence("# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n").replace("| `JNY-001` | `PAGE-01` | existing reference `PAGE-01` | closed |", "| `JNY-001` | PAGE-02 | existing reference `PAGE-01` | closed |");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), wrongCoveragePath);
  const mismatchedCoverage = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(mismatchedCoverage.status, 2, JSON.stringify(mismatchedCoverage));
  assert.equal(mismatchedCoverage.output.error.code, "experience-journey-evidence");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), withJourneyEvidence("# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n"));
  assert.equal(cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
});

test("pre-Candidate feedback opens a bounded Draft revision without Finding semantics", async (t) => {
  const experienceRoot = await newRoot(t, "revise-experience-");
  assert.equal(cli(["init", "--root", experienceRoot, "--delivery-id", "DEL-revise-experience", "--title", "Revise experience", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await seedDraft(experienceRoot);
  assert.equal(cli(["approve-definition", "--root", experienceRoot, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准定义", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["approve-brief", "--root", experienceRoot, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准 Brief", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(experienceRoot, "draft", "experience", "brief.md"), validBrief.replace("本测试不新增导航", "负责人要求调整既有入口说明"));
  const experienceRevision = cli([
    "start-draft-revision", "--root", experienceRoot, "--expect-revision", "3", "--return-phase", "experience",
    "--artifact", "draft/experience/brief.md", "--evidence", "请按预览反馈调整入口说明", "--actor-role", "product-owner",
  ]);
  assert.equal(experienceRevision.status, 0, JSON.stringify(experienceRevision));
  assert.equal(experienceRevision.output.state.phase, "experience");
  assert.equal(experienceRevision.output.state.draft_revision, 2);
  assert.ok(experienceRevision.output.state.approvals.definition);
  assert.equal(experienceRevision.output.state.approvals.brief, null);
  assert.equal(experienceRevision.output.state.approvals.preview, null);
  assert.equal(experienceRevision.output.state.experience_route, null);
  const revisionEventPath = path.join(experienceRoot, "events", "000004-draft-revision-started.json");
  const originalRevisionEvent = await readFile(revisionEventPath, "utf8");
  const tamperedRevisionEvent = JSON.parse(originalRevisionEvent);
  tamperedRevisionEvent.payload.return_phase = "candidate";
  await writeFile(revisionEventPath, `${JSON.stringify(tamperedRevisionEvent, null, 2)}\n`);
  const replayedRevision = cli(["status", "--root", experienceRoot]);
  assert.equal(replayedRevision.status, 5, JSON.stringify(replayedRevision));
  assert.equal(replayedRevision.output.error.code, "stored-event-invalid");
  await writeFile(revisionEventPath, originalRevisionEvent);
  const unrelatedRevisionEvent = JSON.parse(originalRevisionEvent);
  unrelatedRevisionEvent.artifacts[0].path = "draft/experience/evidence.md";
  await writeFile(revisionEventPath, `${JSON.stringify(unrelatedRevisionEvent, null, 2)}\n`);
  const unrelatedReplay = cli(["status", "--root", experienceRoot]);
  assert.equal(unrelatedReplay.status, 5, JSON.stringify(unrelatedReplay));
  assert.equal(unrelatedReplay.output.error.details.original_code, "revision-artifact");
  await writeFile(revisionEventPath, originalRevisionEvent);
  const unchangedRevisionEvent = JSON.parse(originalRevisionEvent);
  const priorBriefEvent = JSON.parse(await readFile(path.join(experienceRoot, "events", "000003-brief-approved.json"), "utf8"));
  unchangedRevisionEvent.artifacts[0].sha256 = priorBriefEvent.artifacts.find((artifact) => artifact.path === "draft/experience/brief.md").sha256;
  await writeFile(revisionEventPath, `${JSON.stringify(unchangedRevisionEvent, null, 2)}\n`);
  const unchangedReplay = cli(["status", "--root", experienceRoot]);
  assert.equal(unchangedReplay.status, 5, JSON.stringify(unchangedReplay));
  assert.equal(unchangedReplay.output.error.details.original_code, "revision-artifact");
  await writeFile(revisionEventPath, originalRevisionEvent);
  assert.equal(cli(["approve-brief", "--root", experienceRoot, "--expect-revision", "4", "--artifact", "draft/experience/brief.md", "--evidence", "批准修订 Brief", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);

  const definitionRoot = await newRoot(t, "revise-definition-");
  assert.equal(cli(["init", "--root", definitionRoot, "--delivery-id", "DEL-revise-definition", "--title", "Revise definition", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await seedDraft(definitionRoot);
  assert.equal(cli(["approve-definition", "--root", definitionRoot, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准定义", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["approve-brief", "--root", definitionRoot, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准 Brief", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(definitionRoot, "draft", "delivery.md"), withDefinitionExperience("# Delivery\n\n- RULE-001: 用户通过修订后的入口查看当前状态。\n"));
  const definitionRevision = cli([
    "start-draft-revision", "--root", definitionRoot, "--expect-revision", "3", "--return-phase", "definition",
    "--artifact", "draft/delivery.md", "--evidence", "请补充离开后的再次进入方式", "--actor-role", "product-owner",
  ]);
  assert.equal(definitionRevision.status, 0, JSON.stringify(definitionRevision));
  assert.equal(definitionRevision.output.state.phase, "definition");
  assert.equal(definitionRevision.output.state.draft_revision, 2);
  assert.equal(definitionRevision.output.state.approvals.definition, null);
  assert.equal(definitionRevision.output.state.approvals.brief, null);
  assert.equal(cli(["approve-definition", "--root", definitionRoot, "--expect-revision", "4", "--artifact", "draft/delivery.md", "--evidence", "批准修订定义", "--actor-role", "product-owner"]).status, 0);

  const unboundRoot = await newRoot(t, "revise-unbound-");
  assert.equal(cli(["init", "--root", unboundRoot, "--delivery-id", "DEL-revise-unbound", "--title", "Revise unbound", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await seedDraft(unboundRoot);
  assert.equal(cli(["approve-definition", "--root", unboundRoot, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准定义", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["approve-brief", "--root", unboundRoot, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准 Brief", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(unboundRoot, "draft", "experience", "brief.md"), validBrief.replace("本测试不新增导航", "未绑定的 Brief 变化"));
  const unbound = cli([
    "start-draft-revision", "--root", unboundRoot, "--expect-revision", "3", "--return-phase", "experience",
    "--artifact", "draft/delivery.md", "--evidence", "尝试未绑定修订", "--actor-role", "product-owner",
  ]);
  assert.equal(unbound.status, 5, JSON.stringify(unbound));
  assert.equal(unbound.output.error.code, "integrity");
  assert.equal((await readdir(path.join(unboundRoot, "events"))).length, 3);

  const candidateRoot = await throughCandidate(t);
  const afterCandidate = cli([
    "start-draft-revision", "--root", candidateRoot, "--expect-revision", "6", "--return-phase", "definition",
    "--artifact", "draft/delivery.md", "--evidence", "Candidate 后不能走该路径", "--actor-role", "product-owner",
  ]);
  assert.equal(afterCandidate.status, 2, JSON.stringify(afterCandidate));
  assert.equal((await readdir(path.join(candidateRoot, "events"))).length, 6);
});

async function throughCandidate(t, { findings = [] } = {}) {
  const root = await newRoot(t);
  assert.equal(cli(["init", "--root", root, "--delivery-id", "DEL-integration", "--title", "Integration", "--owner", "产品负责人", "--expect-revision", "0"]).status, 0);
  await seedDraft(root);
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准当前定义", "--actor-role", "product-owner", "--actor-label", "负责人"]).status, 0);
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准当前 Brief", "--experience-route", "not-needed", "--actor-role", "product-owner", "--actor-label", "负责人"]).status, 0);
  assert.equal(cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "确认无需新增体验产物", "--experience-route", "not-needed", "--actor-role", "product-owner", "--actor-label", "负责人"]).status, 0);
  const frozen = cli(["freeze-candidate", "--root", root, "--expect-revision", "4", "--candidate-id", "CAND-integration-r1"]);
  assert.equal(frozen.status, 0, JSON.stringify(frozen));
  await writeFile(path.join(root, "reviews", "review-01.md"), `# Review\n\n${findings.join("\n")}\n`);
  const reviewArgs = ["record-review", "--root", root, "--expect-revision", "5", "--review-id", "REV-integration-01", "--report", "reviews/review-01.md", "--review-mode", "self-check", "--outcome", findings.length ? "findings-open" : "passed", "--source-session", "session-1", "--review-session", "session-1", "--source-model", "model-a", "--review-model", "model-a", "--actor-role", "reviewer", "--actor-label", "Reviewer"];
  for (const finding of findings) reviewArgs.push("--finding-id", finding);
  const reviewed = cli(reviewArgs);
  assert.equal(reviewed.status, 0, JSON.stringify(reviewed));
  return root;
}

async function throughComplete(t) {
  const root = await throughCandidate(t);
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "6", "--evidence", "确认交付给开发", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["create-release", "--root", root, "--expect-revision", "7", "--release-id", "REL-integration-v1"]).status, 0);
  assert.equal(cli(["record-send", "--root", root, "--expect-revision", "8", "--send-status", "sent-confirmed", "--channel", "manual", "--recipient", "开发负责人", "--external-ref", "message-001", "--evidence", "已确认发送"]).status, 0);
  assert.equal(cli(["record-receipt", "--root", root, "--expect-revision", "9", "--receipt-status", "acknowledged", "--recipient", "开发负责人", "--external-ref", "reply-001", "--evidence", "开发负责人确认收到", "--actor-role", "external-recipient"]).status, 0);
  return root;
}

test("complete legal lifecycle separates Candidate, Review, Release, send, and receipt", async (t) => {
  const root = await throughCandidate(t);
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "6", "--evidence", "确认交付给开发", "--actor-role", "product-owner", "--actor-label", "负责人"]).status, 0);
  const prepared = cli(["create-release", "--root", root, "--expect-revision", "7", "--release-id", "REL-integration-v1"]);
  assert.equal(prepared.status, 0, JSON.stringify(prepared));
  assert.equal(prepared.output.state.sending.status, "prepared");
  assert.notEqual(prepared.output.state.candidate.candidate_id, prepared.output.state.release.release_id);
  assert.equal(cli(["create-release", "--root", root, "--expect-revision", "8", "--release-id", "REL-integration-v1"]).status, 3);
  const attempted = cli(["record-send", "--root", root, "--expect-revision", "8", "--send-status", "attempted", "--channel", "manual", "--recipient", "开发负责人", "--external-ref", "mail-attempt-001", "--evidence", "首次发送结果不确定"]);
  assert.equal(attempted.status, 0);
  const sent = cli(["record-send", "--root", root, "--expect-revision", "9", "--send-status", "sent-confirmed", "--channel", "manual", "--recipient", "开发负责人", "--external-ref", "mail-message-002", "--evidence", "授权人员确认已发送"]);
  assert.equal(sent.status, 0);
  assert.equal(cli(["record-receipt", "--root", root, "--expect-revision", "10", "--receipt-status", "acknowledged", "--recipient", "开发负责人", "--external-ref", "reply-message-003", "--evidence", "PM Agent 自称已收到", "--actor-role", "pm-agent"]).status, 2);
  const wrongRecipient = cli(["record-receipt", "--root", root, "--expect-revision", "10", "--receipt-status", "acknowledged", "--recipient", "另一位收件人", "--external-ref", "reply-message-wrong", "--evidence", "另一人声称收到", "--actor-role", "external-recipient"]);
  assert.equal(wrongRecipient.status, 2);
  assert.equal(wrongRecipient.output.error.code, "receipt-recipient");
  const receipt = cli(["record-receipt", "--root", root, "--expect-revision", "10", "--receipt-status", "acknowledged", "--recipient", "开发负责人", "--external-ref", "reply-message-003", "--evidence", "开发负责人回复已收到", "--actor-role", "external-recipient", "--actor-label", "开发负责人"]);
  assert.equal(receipt.status, 0, JSON.stringify(receipt));
  assert.equal(receipt.output.state.phase, "complete");
  const accepted = cli(["record-receipt", "--root", root, "--expect-revision", "11", "--receipt-status", "accepted", "--recipient", "开发负责人", "--external-ref", "ticket-result-004", "--evidence", "开发负责人确认接受交付", "--actor-role", "external-recipient", "--actor-label", "开发负责人"]);
  assert.equal(accepted.status, 0);
  assert.equal(accepted.output.state.receipt.status, "accepted");
  assert.equal(cli(["record-receipt", "--root", root, "--expect-revision", "12", "--receipt-status", "rejected", "--recipient", "开发负责人", "--external-ref", "ticket-result-005", "--evidence", "试图覆盖终态", "--actor-role", "external-recipient"]).status, 2);
  assert.equal(cli(["validate", "--root", root]).status, 0);
  const releaseManifest = JSON.parse(await readFile(path.join(root, "releases", "REL-integration-v1", "MANIFEST.json"), "utf8"));
  assert.equal(releaseManifest.kind, "release");
  assert.equal(releaseManifest.source.candidate_id, "CAND-integration-r1");
});

test("stale revision, illegal transition, path traversal, and lock fail without event writes", async (t) => {
  const root = await newRoot(t);
  cli(["init", "--root", root, "--delivery-id", "DEL-negative", "--title", "Negative", "--owner", "Owner", "--expect-revision", "0"]);
  await seedDraft(root);
  const before = (await readdir(path.join(root, "events"))).length;
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "0", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 3);
  assert.equal(cli(["freeze-candidate", "--root", root, "--expect-revision", "1"]).status, 2);
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "../outside.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 2);
  await writeFile(path.join(root, "workflow.lock"), JSON.stringify({ operation_id: "external", operation: "test", acquired_at: "2026-07-30T00:00:00Z" }));
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 3);
  await unlink(path.join(root, "workflow.lock"));
  assert.equal((await readdir(path.join(root, "events"))).length, before);
  assert.deepEqual((await readdir(path.join(root, "candidates"))).filter((name) => name.startsWith(".tmp-")), []);
});

test("pre-freeze validates only explicit Candidate fields and rejects invalid references", async (t) => {
  const prepare = async (prefix, manifest, setup = async () => {}) => {
    const root = await newRoot(t, prefix);
    cli(["init", "--root", root, "--delivery-id", `DEL-${prefix}`, "--title", "Reference", "--owner", "Owner", "--expect-revision", "0"]);
    await seedDraft(root);
    await writeFile(path.join(root, "draft", "experience", "manifest.md"), manifest);
    await setup(root);
    assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 0);
    assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
    return root;
  };
  const validManifest = withJourneyEvidence("# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n- Candidate artifact：`experience/evidence.md`\n");
  const unboundRoot = await prepare("reference-unbound", validManifest);
  const missingManifestBinding = cli(["approve-preview", "--root", unboundRoot, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(missingManifestBinding.status, 2);
  assert.equal(missingManifestBinding.output.error.code, "candidate-reference");

  const forbiddenRoot = await prepare("reference-forbidden", withJourneyEvidence("# Manifest\n\n- Candidate artifact：`draft/experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n- Candidate artifact：`experience/evidence.md`\n"));
  assert.equal(cli(["approve-preview", "--root", forbiddenRoot, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  const forbidden = cli(["freeze-candidate", "--root", forbiddenRoot, "--expect-revision", "4", "--candidate-id", "CAND-reference-forbidden-r1"]);
  assert.equal(forbidden.status, 2);
  assert.equal(forbidden.output.error.code, "candidate-reference");

  const missingRoot = await prepare("reference-missing", withJourneyEvidence("# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n- Candidate artifact：`experience/evidence.md`\n- Candidate artifact：`experience/missing.png`\n"));
  assert.equal(cli(["approve-preview", "--root", missingRoot, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  const missing = cli(["freeze-candidate", "--root", missingRoot, "--expect-revision", "4", "--candidate-id", "CAND-reference-missing-r1"]);
  assert.equal(missing.status, 2);
  assert.equal(missing.output.error.code, "missing-artifact");

  const validRoot = await prepare("reference-valid", `${validManifest}\n- Informational path outside the explicit contract: \`experience/not-created.png\`\n`, async (root) => {
    await mkdir(path.join(root, "draft", "evidence"), { recursive: true });
    await writeFile(path.join(root, "draft", "evidence", "claim.md"), "# Claim evidence\n\n- Candidate evidence：`evidence/claim.md`\n");
  });
  assert.equal(cli(["approve-preview", "--root", validRoot, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  const valid = cli(["freeze-candidate", "--root", validRoot, "--expect-revision", "4", "--candidate-id", "CAND-reference-valid-r1"]);
  assert.equal(valid.status, 0, JSON.stringify(valid));
});

test("Delivery root symlinks are rejected without initializing their targets", async (t) => {
  const parent = await newRoot(t, "root-symlink-");
  const target = path.join(parent, "real-delivery");
  const alias = path.join(parent, "delivery-alias");
  await mkdir(target);
  await symlink("real-delivery", alias, "dir");
  const result = cli(["init", "--root", alias, "--delivery-id", "DEL-root-symlink", "--title", "Alias", "--owner", "Owner", "--expect-revision", "0"]);
  assert.equal(result.status, 5, JSON.stringify(result));
  assert.equal(result.output.error.code, "path-symlink");
  assert.deepEqual(await readdir(target), []);
});

test("projection deletion/rebuild is deterministic", async (t) => {
  const root = await newRoot(t);
  cli(["init", "--root", root, "--delivery-id", "DEL-reconcile", "--title", "Reconcile", "--owner", "Owner", "--expect-revision", "0"]);
  const expectedState = await readFile(path.join(root, "workflow-state.json"), "utf8");
  const expectedStart = await readFile(path.join(root, "START-HERE.md"), "utf8");
  await unlink(path.join(root, "workflow-state.json"));
  await unlink(path.join(root, "START-HERE.md"));
  assert.equal(cli(["reconcile", "--root", root, "--check"]).status, 5);
  const repaired = cli(["reconcile", "--root", root, "--expect-revision", "1"]);
  assert.equal(repaired.status, 0, JSON.stringify(repaired));
  assert.equal(await readFile(path.join(root, "workflow-state.json"), "utf8"), expectedState);
  assert.equal(await readFile(path.join(root, "START-HERE.md"), "utf8"), expectedStart);
});

test("generated projection symlinks fail before transitions or migration persist state", async (t) => {
  const external = await newRoot(t, "projection-external-");
  const externalState = path.join(external, "outside-state.json");
  await writeFile(externalState, "outside remains unchanged\n");

  const root = await newRoot(t, "projection-transition-");
  assert.equal(cli(["init", "--root", root, "--delivery-id", "DEL-projection-transition", "--title", "Projection", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await seedDraft(root);
  await unlink(path.join(root, "workflow-state.json"));
  await symlink(externalState, path.join(root, "workflow-state.json"), "file");
  const beforeEvents = await readdir(path.join(root, "events"));
  const transitionResult = cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]);
  assert.equal(transitionResult.status, 5, JSON.stringify(transitionResult));
  assert.equal(transitionResult.output.error.code, "path-symlink");
  assert.deepEqual(await readdir(path.join(root, "events")), beforeEvents);
  assert.equal(await readFile(externalState, "utf8"), "outside remains unchanged\n");
  assert.equal(await readdir(root).then((entries) => entries.includes("workflow.lock")), false);

  const migrationRoot = await newRoot(t, "projection-migration-");
  await cp(path.join(candidateRoot, "tests", "fixtures", "v1", "valid-experience.md"), path.join(migrationRoot, "START-HERE.md"));
  await symlink(externalState, path.join(migrationRoot, "workflow-state.json"), "file");
  const migrationResult = cli(["migrate-v1", "--root", migrationRoot, "--apply", "--expect-revision", "0"]);
  assert.equal(migrationResult.status, 5, JSON.stringify(migrationResult));
  assert.equal(migrationResult.output.error.code, "path-symlink");
  assert.equal(await readdir(migrationRoot).then((entries) => entries.includes("events")), false);
  assert.equal(await readdir(migrationRoot).then((entries) => entries.includes("source")), false);
  assert.equal(await readFile(externalState, "utf8"), "outside remains unchanged\n");
});

test("Candidate mutation invalidates Review and reconcile refuses semantic repair", async (t) => {
  const root = await throughCandidate(t);
  await writeFile(path.join(root, "candidates", "CAND-integration-r1", "delivery.md"), "tampered\n");
  assert.equal(cli(["validate", "--root", root]).status, 5);
  assert.equal(cli(["reconcile", "--root", root, "--expect-revision", "6"]).status, 5);
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "6", "--evidence", "确认交付", "--actor-role", "product-owner"]).status, 5);
});

test("Release and Review report drift block downstream transitions", async (t) => {
  const root = await throughCandidate(t);
  await writeFile(path.join(root, "reviews", "review-01.md"), "changed after record\n");
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "6", "--evidence", "确认交付", "--actor-role", "product-owner"]).status, 5);
  await writeFile(path.join(root, "reviews", "review-01.md"), "# Review\n\n\n");
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "6", "--evidence", "确认交付", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["create-release", "--root", root, "--expect-revision", "7", "--release-id", "REL-drift-v1"]).status, 0);
  await writeFile(path.join(root, "releases", "REL-drift-v1", "delivery.md"), "release tamper\n");
  assert.equal(cli(["record-send", "--root", root, "--expect-revision", "8", "--send-status", "sent-confirmed", "--channel", "manual", "--recipient", "开发", "--external-ref", "mail-1", "--evidence", "确认发送"]).status, 5);
});

test("event hash-chain tampering and approval drift fail closed", async (t) => {
  const root = await newRoot(t);
  cli(["init", "--root", root, "--delivery-id", "DEL-chain", "--title", "Chain", "--owner", "Owner", "--expect-revision", "0"]);
  await seedDraft(root);
  cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]);
  await writeFile(path.join(root, "draft", "delivery.md"), "changed after approval\n");
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 5);
  await writeFile(path.join(root, "draft", "delivery.md"), "# Delivery\n\n- RULE-001: 用户可以查看当前状态。\n");
  const firstPath = path.join(root, "events", "000001-created.json");
  const first = JSON.parse(await readFile(firstPath, "utf8"));
  first.payload.title = "tampered title";
  await writeFile(firstPath, `${JSON.stringify(first, null, 2)}\n`);
  assert.equal(cli(["status", "--root", root]).status, 5);
});

test("stored event payload schema violations fail closed during replay", async (t) => {
  const root = await newRoot(t);
  assert.equal(cli(["init", "--root", root, "--delivery-id", "DEL-stored-schema", "--title", "Stored schema", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  const firstPath = path.join(root, "events", "000001-created.json");
  const first = JSON.parse(await readFile(firstPath, "utf8"));
  first.payload.title = 42;
  await writeFile(firstPath, `${JSON.stringify(first, null, 2)}\n`);
  const replayed = cli(["status", "--root", root]);
  assert.equal(replayed.status, 5);
  assert.equal(replayed.output.error.code, "stored-event-invalid");
  assert.equal(replayed.output.error.details.original_code, "invalid");
});

test("stored replay rejects event actor, artifact, path, and nested-report relationship drift", async (t) => {
  const reviewRoot = await throughCandidate(t);

  const briefPath = path.join(reviewRoot, "events", "000003-brief-approved.json");
  const originalBrief = await readFile(briefPath, "utf8");
  const briefWithoutTemplate = JSON.parse(originalBrief);
  briefWithoutTemplate.artifacts[0].path = "draft/experience/route-note.md";
  await writeFile(briefPath, `${JSON.stringify(briefWithoutTemplate, null, 2)}\n`);
  const briefReplay = cli(["status", "--root", reviewRoot]);
  assert.equal(briefReplay.status, 5);
  assert.equal(briefReplay.output.error.code, "stored-event-invalid");
  assert.equal(briefReplay.output.error.details.original_code, "candidate-reference");
  await writeFile(briefPath, originalBrief);

  const previewPath = path.join(reviewRoot, "events", "000004-preview-approved.json");
  const originalPreview = await readFile(previewPath, "utf8");
  const previewWithoutManifest = JSON.parse(originalPreview);
  previewWithoutManifest.artifacts = previewWithoutManifest.artifacts.filter((artifact) => artifact.path !== "draft/experience/manifest.md");
  await writeFile(previewPath, `${JSON.stringify(previewWithoutManifest, null, 2)}\n`);
  const previewReplay = cli(["status", "--root", reviewRoot]);
  assert.equal(previewReplay.status, 5);
  assert.equal(previewReplay.output.error.code, "stored-event-invalid");
  assert.equal(previewReplay.output.error.details.original_code, "candidate-reference");
  await writeFile(previewPath, originalPreview);

  const reviewPath = path.join(reviewRoot, "events", "000006-review-recorded.json");
  const originalReview = await readFile(reviewPath, "utf8");
  const reviewMutations = [
    (event) => { event.actor.role = "pm-agent"; },
    (event) => { event.artifacts = []; },
    (event) => { event.payload.review_path = "draft/review.md"; },
  ];
  for (const mutate of reviewMutations) {
    const event = JSON.parse(originalReview);
    mutate(event);
    await writeFile(reviewPath, `${JSON.stringify(event, null, 2)}\n`);
    const replayed = cli(["status", "--root", reviewRoot]);
    assert.equal(replayed.status, 5);
    assert.equal(replayed.output.error.code, "stored-event-invalid");
    await writeFile(reviewPath, originalReview);
  }

  const migrationRoot = await newRoot(t, "stored-migration-");
  await cp(path.join(candidateRoot, "tests", "fixtures", "v1", "valid-experience.md"), path.join(migrationRoot, "START-HERE.md"));
  assert.equal(cli(["migrate-v1", "--root", migrationRoot, "--apply", "--expect-revision", "0"]).status, 0);
  const migrationEventPath = path.join(migrationRoot, "events", "000001-v1-imported.json");
  const migrationEvent = JSON.parse(await readFile(migrationEventPath, "utf8"));
  delete migrationEvent.payload.migration_report.observed.receipt_status;
  await writeFile(migrationEventPath, `${JSON.stringify(migrationEvent, null, 2)}\n`);
  const replayed = cli(["status", "--root", migrationRoot]);
  assert.equal(replayed.status, 5);
  assert.equal(replayed.output.error.code, "stored-event-invalid");
});

test("stored replay applies stateful receipt bindings with integrity-class failure", async (t) => {
  const root = await throughComplete(t);
  const receiptPath = path.join(root, "events", "000010-receipt-recorded.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  receipt.payload.recipient = "另一位收件人";
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  const replayed = cli(["status", "--root", root]);
  assert.equal(replayed.status, 5);
  assert.equal(replayed.output.error.code, "stored-event-invalid");
  assert.equal(replayed.output.error.details.original_code, "receipt-recipient");
});

test("Review identity claims and recipient evidence fail closed", async (t) => {
  const root = await newRoot(t);
  cli(["init", "--root", root, "--delivery-id", "DEL-mode", "--title", "Mode", "--owner", "Owner", "--expect-revision", "0"]);
  await seedDraft(root);
  cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]);
  cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  cli(["freeze-candidate", "--root", root, "--expect-revision", "4"]);
  const eventCount = (await readdir(path.join(root, "events"))).length;
  assert.equal(cli(["freeze-candidate", "--root", root, "--expect-revision", "5", "--candidate-id", "CAND-mode-r2"]).status, 2);
  assert.equal((await readdir(path.join(root, "events"))).length, eventCount);
  assert.equal(await readdir(path.join(root, "candidates")).then((entries) => entries.includes("CAND-mode-r2")), false);
  await writeFile(path.join(root, "reviews", "review.md"), "# Review\n");
  const fakeIndependent = cli(["record-review", "--root", root, "--expect-revision", "5", "--report", "reviews/review.md", "--review-mode", "independent-model", "--outcome", "passed", "--source-session", "same", "--review-session", "same", "--source-model", "model", "--review-model", "model", "--actor-role", "reviewer"]);
  assert.equal(fakeIndependent.status, 2);
});

test("Finding correction accepts expected Draft drift and invalidates prior bindings", async (t) => {
  const root = await throughCandidate(t, { findings: ["FND-001"] });
  await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery\n\n- RULE-001 corrected.\n"));
  const corrected = cli(["record-finding-resolution", "--root", root, "--expect-revision", "6", "--finding-id", "FND-001", "--disposition", "corrected", "--return-phase", "definition", "--artifact", "draft/delivery.md", "--evidence", "负责人确认按 Finding 修订", "--actor-role", "product-owner"]);
  assert.equal(corrected.status, 0, JSON.stringify(corrected));
  assert.equal(corrected.output.state.draft_revision, 2);
  assert.equal(corrected.output.state.candidate, null);
  assert.equal(corrected.output.state.review, null);
  assert.equal(corrected.output.state.phase, "definition");
  await writeFile(path.join(root, "draft", "decision-patch.md"), "# Patch\n");
  assert.equal(cli(["record-brainstorm-patch", "--root", root, "--expect-revision", "7", "--patch", "draft/decision-patch.md", "--base-revision", "1", "--decision-locator", "delivery.md#DEC-001"]).status, 2);
  assert.equal(cli(["record-brainstorm-patch", "--root", root, "--expect-revision", "7", "--patch", "draft/decision-patch.md", "--base-revision", "2", "--decision-locator", "delivery.md#DEC-001"]).status, 0);
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "8", "--artifact", "draft/delivery.md", "--evidence", "重新批准定义", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "9", "--artifact", "draft/experience/brief.md", "--evidence", "重新批准 Brief", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["approve-preview", "--root", root, "--expect-revision", "10", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "重新批准体验证据", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  const reusedCandidateCase = cli(["freeze-candidate", "--root", root, "--expect-revision", "11", "--candidate-id", "cand-INTEGRATION-R1"]);
  assert.equal(reusedCandidateCase.status, 2);
  assert.equal(reusedCandidateCase.output.error.code, "identity-reuse");
  assert.equal(cli(["freeze-candidate", "--root", root, "--expect-revision", "11", "--candidate-id", "CAND-integration-r2"]).status, 0);
  await writeFile(path.join(root, "reviews", "review-02.md"), "# Review 2\n");
  const reused = cli(["record-review", "--root", root, "--expect-revision", "12", "--review-id", "REV-integration-01", "--report", "reviews/review-02.md", "--review-mode", "self-check", "--outcome", "passed", "--source-session", "session-2", "--review-session", "session-2", "--source-model", "model-a", "--review-model", "model-a", "--actor-role", "reviewer"]);
  assert.equal(reused.status, 2);
  assert.equal(reused.output.error.code, "identity-reuse");
  const reusedCase = cli(["record-review", "--root", root, "--expect-revision", "12", "--review-id", "rev-INTEGRATION-01", "--report", "reviews/review-02.md", "--review-mode", "self-check", "--outcome", "passed", "--source-session", "session-2", "--review-session", "session-2", "--source-model", "model-a", "--review-model", "model-a", "--actor-role", "reviewer"]);
  assert.equal(reusedCase.status, 2);
  assert.equal(reusedCase.output.error.code, "identity-reuse");
  const reusedPath = cli(["record-review", "--root", root, "--expect-revision", "12", "--review-id", "REV-integration-02", "--report", "reviews/review-01.md", "--review-mode", "self-check", "--outcome", "passed", "--source-session", "session-2", "--review-session", "session-2", "--source-model", "model-a", "--review-model", "model-a", "--actor-role", "reviewer"]);
  assert.equal(reusedPath.status, 2);
  assert.equal(reusedPath.output.error.code, "identity-reuse");
  assert.equal(cli(["record-review", "--root", root, "--expect-revision", "12", "--review-id", "REV-integration-02", "--report", "reviews/review-02.md", "--review-mode", "self-check", "--outcome", "passed", "--source-session", "session-2", "--review-session", "session-2", "--source-model", "model-a", "--review-model", "model-a", "--actor-role", "reviewer"]).status, 0);
});

test("Owner risk acceptance is distinct from correction and can satisfy Handoff", async (t) => {
  const root = await throughCandidate(t, { findings: ["FND-001"] });
  const accepted = cli(["record-finding-resolution", "--root", root, "--expect-revision", "6", "--finding-id", "FND-001", "--disposition", "accepted-risk", "--evidence", "负责人接受该已说明风险", "--actor-role", "product-owner"]);
  assert.equal(accepted.status, 0, JSON.stringify(accepted));
  assert.equal(accepted.output.state.review.outcome, "accepted-risk");
  assert.equal(accepted.output.state.findings["FND-001"].status, "accepted-risk");
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "7", "--evidence", "知悉风险并确认交付", "--actor-role", "product-owner"]).status, 0);
});

test("secret scan and prompt-injection evidence do not bypass Candidate rules", async (t) => {
  const root = await newRoot(t);
  cli(["init", "--root", root, "--delivery-id", "DEL-security", "--title", "Security", "--owner", "Owner", "--expect-revision", "0"]);
  await seedDraft(root);
  await cp(path.join(candidateRoot, "tests", "fixtures", "security", "prompt-injection.md"), path.join(root, "draft", "evidence.md"));
  cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]);
  cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  const fakeSecret = `sk-${"A".repeat(24)}`;
  await writeFile(path.join(root, "draft", "accidental-secret.txt"), fakeSecret);
  assert.equal(cli(["freeze-candidate", "--root", root, "--expect-revision", "4"]).status, 2);
  await unlink(path.join(root, "draft", "accidental-secret.txt"));
  await writeFile(path.join(root, "draft", "bad:name.md"), "not portable to Windows\n");
  assert.equal(cli(["freeze-candidate", "--root", root, "--expect-revision", "4"]).status, 2);
  await unlink(path.join(root, "draft", "bad:name.md"));
  if (process.platform === "linux") {
    await writeFile(path.join(root, "draft", "Case.md"), "one\n");
    await writeFile(path.join(root, "draft", "case.md"), "two\n");
    const caseCollision = cli(["freeze-candidate", "--root", root, "--expect-revision", "4"]);
    assert.equal(caseCollision.status, 2);
    assert.equal(caseCollision.output.error.code, "non-portable-path");
    await unlink(path.join(root, "draft", "Case.md"));
    await unlink(path.join(root, "draft", "case.md"));
  }
  assert.equal(cli(["freeze-candidate", "--root", root, "--expect-revision", "4"]).status, 0);
});

test("V1 arbitrary approval prose remains evidence-only until a new explicit V2 approval", async (t) => {
  const fixture = await readFile(path.join(candidateRoot, "tests", "fixtures", "v1", "valid-experience.md"), "utf8");
  const variants = ["批准当前产品定义", "未同意", "未确认", "not confirmed", "not accepted", "approval denied", "已查看"];
  let firstRoot;
  for (const [index, evidence] of variants.entries()) {
    const root = await newRoot(t, `v1-evidence-${index}-`);
    if (!firstRoot) firstRoot = root;
    await writeFile(path.join(root, "START-HERE.md"), fixture.replace("批准当前产品定义", evidence));
    const dry = cli(["migrate-v1", "--root", root, "--dry-run"]);
    assert.equal(dry.status, 0, JSON.stringify(dry));
    assert.equal(dry.output.report.mapped_phase, "definition", evidence);
    assert.equal(dry.output.report.definition_approval_classification, "not-evaluated", evidence);
    const applied = cli(["migrate-v1", "--root", root, "--apply", "--expect-revision", "0"]);
    assert.equal(applied.status, 0, JSON.stringify(applied));
    assert.equal(applied.output.state.phase, "definition", evidence);
    assert.equal(applied.output.state.approvals.definition, null, evidence);
    assert.match(await readFile(path.join(root, "source", "v1-START-HERE.md"), "utf8"), new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  await seedDraft(firstRoot);
  const approved = cli(["approve-definition", "--root", firstRoot, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "V2 中重新明确批准", "--actor-role", "product-owner"]);
  assert.equal(approved.status, 0, JSON.stringify(approved));
  assert.equal(approved.output.state.phase, "experience");
  const invalidRoot = await newRoot(t, "v1-invalid-");
  await cp(path.join(candidateRoot, "tests", "fixtures", "v1", "contradictory-complete.md"), path.join(invalidRoot, "START-HERE.md"));
  assert.equal(cli(["migrate-v1", "--root", invalidRoot, "--dry-run"]).status, 2);
  const unsupportedRoot = await newRoot(t, "v1-unsupported-phase-");
  await writeFile(path.join(unsupportedRoot, "START-HERE.md"), fixture.replace("Phase：`experience`", "Phase：`change`"));
  const unsupported = cli(["migrate-v1", "--root", unsupportedRoot, "--dry-run"]);
  assert.equal(unsupported.status, 2);
  assert.match(unsupported.output.error.details.contradictions.join("\n"), /cannot be mapped safely/);
  assert.deepEqual((await readdir(unsupportedRoot)).sort(), ["START-HERE.md"]);
});

test("render and reconcile lock before replay and reconcile rejects stale revisions", async (t) => {
  const lockedRoot = await newRoot(t, "locked-projection-");
  cli(["init", "--root", lockedRoot, "--delivery-id", "DEL-locked-projection", "--title", "Locked", "--owner", "Owner", "--expect-revision", "0"]);
  const eventPath = path.join(lockedRoot, "events", "000001-created.json");
  const corrupt = JSON.parse(await readFile(eventPath, "utf8"));
  corrupt.schema_version = 99;
  await writeFile(eventPath, `${JSON.stringify(corrupt, null, 2)}\n`);
  await writeFile(path.join(lockedRoot, "workflow.lock"), JSON.stringify({ operation_id: "external", operation: "transition", acquired_at: "2026-07-30T00:00:00Z" }));
  assert.equal(cli(["render", "--root", lockedRoot, "--expect-revision", "1"]).status, 3);
  assert.equal(cli(["reconcile", "--root", lockedRoot, "--check"]).status, 3);
  await unlink(path.join(lockedRoot, "workflow.lock"));
  assert.equal(cli(["status", "--root", lockedRoot]).status, 5);

  const staleRoot = await newRoot(t, "stale-reconcile-");
  cli(["init", "--root", staleRoot, "--delivery-id", "DEL-stale-reconcile", "--title", "Stale", "--owner", "Owner", "--expect-revision", "0"]);
  const staleState = await readFile(path.join(staleRoot, "workflow-state.json"), "utf8");
  const staleStart = await readFile(path.join(staleRoot, "START-HERE.md"), "utf8");
  await seedDraft(staleRoot);
  assert.equal(cli(["approve-definition", "--root", staleRoot, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(staleRoot, "workflow-state.json"), staleState);
  await writeFile(path.join(staleRoot, "START-HERE.md"), staleStart);
  const conflict = cli(["reconcile", "--root", staleRoot, "--expect-revision", "1"]);
  assert.equal(conflict.status, 3);
  assert.equal(JSON.parse(await readFile(path.join(staleRoot, "workflow-state.json"), "utf8")).revision, 1);
  assert.equal(cli(["reconcile", "--root", staleRoot]).status, 2);
  const repaired = cli(["reconcile", "--root", staleRoot, "--expect-revision", "2"]);
  assert.equal(repaired.status, 0);
  assert.equal(JSON.parse(await readFile(path.join(staleRoot, "workflow-state.json"), "utf8")).revision, 2);
});

test("every controlled directory rejects symlinked read boundaries", async (t) => {
  for (const name of ["events", "source", "draft", "candidates", "reviews", "releases", "changes"]) {
    const root = await newRoot(t, `symlink-read-${name}-`);
    assert.equal(cli(["init", "--root", root, "--delivery-id", `DEL-symlink-${name}`, "--title", name, "--owner", "Owner", "--expect-revision", "0"]).status, 0);
    await replaceControlledDirectoryWithSymlink(root, name);
    const result = cli(["status", "--root", root]);
    assert.equal(result.status, 5, `${name}: ${JSON.stringify(result)}`);
    assert.equal(result.output.error.code, "controlled-directory", name);
  }
});

test("every effectful command family rejects a controlled-directory symlink before lock or event writes", async (t) => {
  const commands = [
    "record-brainstorm-patch", "start-change", "approve-definition", "approve-brief", "approve-preview",
    "freeze-candidate", "record-review", "record-finding-resolution", "confirm-handoff", "create-release",
    "record-send", "record-receipt", "render", "reconcile",
  ];
  const directories = ["events", "source", "draft", "candidates", "reviews", "releases", "changes"];
  for (const [index, command] of commands.entries()) {
    const root = await newRoot(t, `symlink-write-${index}-`);
    assert.equal(cli(["init", "--root", root, "--delivery-id", `DEL-symlink-write-${index}`, "--title", command, "--owner", "Owner", "--expect-revision", "0"]).status, 0);
    await replaceControlledDirectoryWithSymlink(root, directories[index % directories.length]);
    const result = cli([command, "--root", root, "--expect-revision", "1"]);
    assert.equal(result.status, 5, `${command}: ${JSON.stringify(result)}`);
    assert.equal(result.output.error.code, "controlled-directory", command);
    assert.equal(await readdir(root).then((entries) => entries.includes("workflow.lock")), false, command);
  }
});

test("V1 migration rejects a symlinked source directory before preserving any file", async (t) => {
  const root = await newRoot(t, "migration-symlink-");
  await cp(path.join(candidateRoot, "tests", "fixtures", "v1", "valid-experience.md"), path.join(root, "START-HERE.md"));
  await mkdir(path.join(root, "source-real"));
  await symlink("source-real", path.join(root, "source"), "dir");
  const result = cli(["migrate-v1", "--root", root, "--apply", "--expect-revision", "0"]);
  assert.equal(result.status, 5, JSON.stringify(result));
  assert.equal(result.output.error.code, "controlled-directory");
  assert.deepEqual(await readdir(path.join(root, "source-real")), []);
  assert.equal(await readdir(root).then((entries) => entries.includes("events")), false);
});

test("CHG starts from acknowledged, accepted, and rejected receipts with a fresh delivery-evidence round", async (t) => {
  for (const terminal of ["acknowledged", "accepted", "rejected"]) {
    const root = await throughComplete(t);
    let revision = 10;
    if (terminal !== "acknowledged") {
      const terminalResult = cli(["record-receipt", "--root", root, "--expect-revision", "10", "--receipt-status", terminal, "--recipient", "开发负责人", "--external-ref", `terminal-${terminal}`, "--evidence", `外部结论 ${terminal}`, "--actor-role", "external-recipient"]);
      assert.equal(terminalResult.status, 0, JSON.stringify(terminalResult));
      revision = 11;
    }
    const changeId = `CHG-terminal-${terminal}`;
    await writeFile(path.join(root, "changes", `${changeId}.md`), `# ${changeId}\n`);
    const started = cli(["start-change", "--root", root, "--expect-revision", String(revision), "--change-id", changeId, "--proposal", `changes/${changeId}.md`, "--evidence", "批准下一轮", "--actor-role", "product-owner"]);
    assert.equal(started.status, 0, JSON.stringify(started));
    assert.equal(started.output.state.release, null, terminal);
    assert.equal(started.output.state.sending.status, "not-prepared", terminal);
    assert.equal(started.output.state.receipt.status, "pending", terminal);
    assert.equal(started.output.state.release_history[0].receipt.status, terminal);
  }
});

test("approved CHG round archives the prior delivery evidence, resets receipt, and rejects historical identity reuse", async (t) => {
  const root = await throughComplete(t);
  await writeFile(path.join(root, "changes", "CHG-integration-001.md"), "# Change 001\n\nOwner proposes an observable behavior change.\n");
  const started = cli(["start-change", "--root", root, "--expect-revision", "10", "--change-id", "CHG-integration-001", "--proposal", "changes/CHG-integration-001.md", "--evidence", "批准开启变更轮次", "--actor-role", "product-owner"]);
  assert.equal(started.status, 0, JSON.stringify(started));
  assert.equal(started.output.state.phase, "definition");
  assert.equal(started.output.state.draft_revision, 2);
  assert.equal(started.output.state.release, null);
  assert.equal(started.output.state.sending.status, "not-prepared");
  assert.equal(started.output.state.receipt.status, "pending");
  assert.equal(started.output.state.release_history[0].release_id, "REL-integration-v1");
  assert.equal(started.output.state.release_history[0].receipt.status, "acknowledged");
  assert.equal(started.output.state.active_change.change_id, "CHG-integration-001");
  await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery v2\n\n- RULE-001: 用户可以查看变更后的状态。\n"));
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "11", "--artifact", "draft/delivery.md", "--evidence", "批准变更后的定义", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "12", "--artifact", "draft/experience/brief.md", "--evidence", "批准变更 Brief", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["approve-preview", "--root", root, "--expect-revision", "13", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准变更体验证据", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["freeze-candidate", "--root", root, "--expect-revision", "14", "--candidate-id", "CAND-integration-r2"]).status, 0);
  const candidateManifest = JSON.parse(await readFile(path.join(root, "candidates", "CAND-integration-r2", "MANIFEST.json"), "utf8"));
  assert.equal(candidateManifest.source.change_id, "CHG-integration-001");
  await writeFile(path.join(root, "reviews", "review-change.md"), "# Change Review\n");
  assert.equal(cli(["record-review", "--root", root, "--expect-revision", "15", "--review-id", "REV-integration-02", "--report", "reviews/review-change.md", "--review-mode", "self-check", "--outcome", "passed", "--source-session", "session-change", "--review-session", "session-change", "--source-model", "model-a", "--review-model", "model-a", "--actor-role", "reviewer"]).status, 0);
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "16", "--evidence", "确认交付变更版本", "--actor-role", "product-owner"]).status, 0);
  const reusedReleaseCase = cli(["create-release", "--root", root, "--expect-revision", "17", "--release-id", "rel-INTEGRATION-V1"]);
  assert.equal(reusedReleaseCase.status, 2);
  assert.equal(reusedReleaseCase.output.error.code, "identity-reuse");
  assert.equal(cli(["create-release", "--root", root, "--expect-revision", "17", "--release-id", "REL-integration-v2"]).status, 0);
  assert.equal(cli(["status", "--root", root]).output.state.receipt.status, "pending");
  const releaseManifest = JSON.parse(await readFile(path.join(root, "releases", "REL-integration-v2", "MANIFEST.json"), "utf8"));
  assert.equal(releaseManifest.source.change_id, "CHG-integration-001");
  assert.equal(cli(["record-send", "--root", root, "--expect-revision", "18", "--send-status", "sent-confirmed", "--channel", "manual", "--recipient", "开发负责人", "--external-ref", "message-002", "--evidence", "变更版本已发送"]).status, 0);
  assert.equal(cli(["record-receipt", "--root", root, "--expect-revision", "19", "--receipt-status", "accepted", "--recipient", "开发负责人", "--external-ref", "reply-002", "--evidence", "变更版本已接受", "--actor-role", "external-recipient"]).status, 0);
  const reused = cli(["start-change", "--root", root, "--expect-revision", "20", "--change-id", "CHG-integration-001", "--proposal", "changes/CHG-integration-001.md", "--evidence", "试图复用身份", "--actor-role", "product-owner"]);
  assert.equal(reused.status, 2);
  assert.equal(reused.output.error.code, "identity-reuse");
  await writeFile(path.join(root, "changes", "CHG-INTEGRATION-001.md"), "# Case-only reused Change\n");
  const reusedChangeCase = cli(["start-change", "--root", root, "--expect-revision", "20", "--change-id", "CHG-INTEGRATION-001", "--proposal", "changes/CHG-INTEGRATION-001.md", "--evidence", "试图按大小写复用身份", "--actor-role", "product-owner"]);
  assert.equal(reusedChangeCase.status, 2);
  assert.equal(reusedChangeCase.output.error.code, "identity-reuse");
  await writeFile(path.join(root, "changes", "CHG-integration-002.md"), "# Change 002\n");
  assert.equal(cli(["start-change", "--root", root, "--expect-revision", "20", "--change-id", "CHG-integration-002", "--proposal", "changes/CHG-integration-002.md", "--evidence", "批准第二个变更轮次", "--actor-role", "product-owner"]).status, 0);
  const status = cli(["status", "--root", root]);
  assert.equal(status.output.state.change_history[0].change_id, "CHG-integration-001");
  assert.equal(status.output.state.release_history[0].release_id, "REL-integration-v1");
  assert.equal(status.output.state.release_history[1].release_id, "REL-integration-v2");
  assert.equal(status.output.state.active_change.change_id, "CHG-integration-002");

  await writeFile(path.join(root, "candidates", "CAND-integration-r1", "delivery.md"), "historical candidate drift\n");
  await writeFile(path.join(root, "reviews", "review-01.md"), "historical review drift\n");
  await writeFile(path.join(root, "releases", "REL-integration-v1", "delivery.md"), "historical release drift\n");
  await writeFile(path.join(root, "changes", "CHG-integration-001.md"), "historical change drift\n");
  const historical = cli(["validate", "--root", root]);
  assert.equal(historical.status, 5);
  const scopes = JSON.stringify(historical.output.error.details.integrity);
  for (const scope of ["candidate-history:CAND-integration-r1", "review-history:REV-integration-01", "release-history:REL-integration-v1", "change-history:CHG-integration-001"]) assert.match(scopes, new RegExp(scope));
  const eventCount = (await readdir(path.join(root, "events"))).length;
  const blockedTransition = cli(["approve-definition", "--root", root, "--expect-revision", "21", "--artifact", "draft/delivery.md", "--evidence", "不能越过历史漂移", "--actor-role", "product-owner"]);
  assert.equal(blockedTransition.status, 5);
  assert.equal(blockedTransition.output.error.code, "integrity");
  assert.equal((await readdir(path.join(root, "events"))).length, eventCount);
});

test("init refuses a non-empty V1-style root", async (t) => {
  const root = await newRoot(t, "non-empty-");
  await writeFile(path.join(root, "START-HERE.md"), "legacy\n");
  const result = cli(["init", "--root", root, "--delivery-id", "DEL-non-empty", "--title", "Legacy", "--owner", "Owner", "--expect-revision", "0"]);
  assert.equal(result.status, 3, JSON.stringify(result));
  assert.equal(result.output.error.code, "root-not-empty");
  assert.deepEqual(await readdir(root), ["START-HERE.md"]);
  assert.equal(await readFile(path.join(root, "START-HERE.md"), "utf8"), "legacy\n");
});

test("doctor checks only the portable runtime boundary and never probes Pen", () => {
  const result = cli(["doctor"]);
  assert.equal(result.status, 0);
  assert.equal(result.output.command, "doctor");
  assert.equal(result.output.node.supported, true);
  assert.equal(result.output.delivery, null);
  assert.equal(Object.hasOwn(result.output, "pen"), false);

  const removedCompatibilityOption = cli(["doctor", "--pen-help-file", "ignored.txt"]);
  assert.equal(removedCompatibilityOption.status, 2);
  assert.equal(removedCompatibilityOption.output.error.code, "unknown-option");
});
