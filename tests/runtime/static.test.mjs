import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const candidateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const skillNames = ["pm-brainstorm", "pm-definition", "pm-delivery", "pm-experience", "pm-handoff", "pm-reverse-review"];

async function filesUnder(root) {
  const result = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      const relative = path.relative(candidateRoot, full);
      if (entry.isDirectory() && relative.startsWith(`tests${path.sep}.`)) continue;
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) result.push(full);
    }
  }
  await visit(root);
  return result.sort();
}

test("six vendored runtimes are byte-identical to the canonical source", async () => {
  const canonical = await readFile(path.join(candidateRoot, "runtime", "pm-workflow.mjs"));
  const expected = createHash("sha256").update(canonical).digest("hex");
  for (const skill of skillNames) {
    const copy = await readFile(path.join(candidateRoot, "skills", skill, "scripts", "pm-workflow.mjs"));
    assert.equal(createHash("sha256").update(copy).digest("hex"), expected, skill);
  }
});

test("all six Skills have valid minimal frontmatter and self-contained runtime", async () => {
  assert.deepEqual((await readdir(path.join(candidateRoot, "skills"))).sort(), skillNames);
  for (const skill of skillNames) {
    const text = await readFile(path.join(candidateRoot, "skills", skill, "SKILL.md"), "utf8");
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(frontmatter, `${skill} frontmatter`);
    const keys = frontmatter[1].split("\n").filter(Boolean).map((line) => line.split(":")[0]);
    assert.deepEqual(keys, ["name", "description"], `${skill} frontmatter keys`);
    assert.match(frontmatter[1], new RegExp(`^name: ${skill}$`, "m"));
  }
});

test("pm-delivery bootstrap order matches the runtime's empty-root and actor contract", async () => {
  const text = await readFile(path.join(candidateRoot, "skills", "pm-delivery", "SKILL.md"), "utf8");
  const initFirst = text.indexOf("run `init` first");
  const evidenceAfter = text.indexOf("Only after successful `init`");
  assert.ok(initFirst >= 0 && evidenceAfter > initFirst, "init must precede evidence capture");
  assert.match(text, /brand-new Delivery root must be absent or empty/);
  assert.match(text, /`--actor-role pm-agent`/);
  assert.match(text, /Run `init` and `status` as separate observed commands/);
});

test("pm-definition keeps approval-bound contracts free of mutable Experience snapshots", async () => {
  const skill = await readFile(path.join(candidateRoot, "skills", "pm-definition", "SKILL.md"), "utf8");
  const readiness = await readFile(path.join(candidateRoot, "skills", "pm-definition", "references", "prototype-readiness.md"), "utf8");
  const templateNames = ["small-delivery.md", "capability-slice.md", "product-foundation.md"];
  assert.match(skill, /do not record the current Experience route, lifecycle status, generated source, preview, or Pen node bindings/i);
  assert.match(skill, /never mutate an approved Definition file merely to refresh lifecycle prose/);
  assert.match(skill, /persists or changes asynchronously/);
  assert.match(skill, /prototype-readiness/i);
  assert.match(skill, /internally hand one bounded exploration problem/i);
  assert.match(readiness, /each current-scope journey/i);
  assert.match(readiness, /two or three independent decisions/i);
  assert.match(readiness, /draft\/exploration\//);
  for (const name of templateNames) {
    const text = await readFile(path.join(candidateRoot, "skills", "pm-definition", "assets", name), "utf8");
    assert.match(text, /## Experience requirements/);
    assert.match(text, /Required journey closure/);
    assert.match(text, /Prototype readiness walkthrough/);
    assert.match(text, /Unresolved prototype blockers/);
    assert.match(text, /Lifecycle authority/);
    assert.match(text, /experience\/manifest\.md/);
    assert.doesNotMatch(text, /Entry summary|Experience source \/ preview|Experience behavior sync/);
  }
});

test("pm-experience directs one live Pen process without a wrapper and handles non-visual Agents", async () => {
  const skill = await readFile(path.join(candidateRoot, "skills", "pm-experience", "SKILL.md"), "utf8");
  const reference = await readFile(path.join(candidateRoot, "skills", "pm-experience", "references", "pen-direct.md"), "utf8");
  const experienceBrief = await readFile(path.join(candidateRoot, "skills", "pm-experience", "assets", "experience-brief.md"), "utf8");
  const experienceManifest = await readFile(path.join(candidateRoot, "skills", "pm-experience", "assets", "experience-manifest.md"), "utf8");
  const functionalWireflow = await readFile(path.join(candidateRoot, "skills", "pm-experience", "references", "functional-wireflow.md"), "utf8");
  const discoveryTemplate = await readFile(path.join(candidateRoot, "skills", "pm-experience", "assets", "prototype-discovery.md"), "utf8");
  const gapProtocol = await readFile(path.join(candidateRoot, "skills", "pm-experience", "references", "design-gap-protocol.md"), "utf8");
  const reviewTemplate = await readFile(path.join(candidateRoot, "skills", "pm-reverse-review", "assets", "reverse-review.md"), "utf8");
  const reviewMethod = await readFile(path.join(candidateRoot, "skills", "pm-reverse-review", "references", "review-method.md"), "utf8");
  const reviewProbes = await readFile(path.join(candidateRoot, "skills", "pm-reverse-review", "references", "risk-probes.md"), "utf8");
  const claimEvidence = await readFile(path.join(candidateRoot, "skills", "pm-definition", "assets", "claim-evidence.md"), "utf8");
  const definitionSkill = await readFile(path.join(candidateRoot, "skills", "pm-definition", "SKILL.md"), "utf8");
  const readme = await readFile(path.join(candidateRoot, "README.md"), "utf8");
  for (const text of [skill, reference, readme]) {
    assert.match(text, /one .*interactive process|one-process|same process|一个 `pen interactive` 进程/);
    assert.match(text, /live .*help|实时 help|live interactive help/);
  }
  for (const text of [skill, reference]) {
    assert.match(text, /do not exist|must not exist|never overwrite|不.*覆盖|不存在.*新目标/);
    assert.match(text, /symbolic[- ]links?|symlinks|符号链接/);
  }
  assert.match(skill, /Do not invoke Pen Agent Mode/);
  assert.match(reference, /rather than[^\n]*adapter|do not[^\n]*adapter between the Agent and Pen/);
  assert.match(reference, /Output text is not a handle/);
  assert.match(reference, /persist that handle before the surrounding tool call ends/);
  assert.match(reference, /Never project a structured launch result down to stdout alone/i);
  assert.match(reference, /Empty output from a yield is pending, not failure/);
  assert.match(reference, /process alive; output empty or prompt not seen yet.*`running`/);
  assert.match(reference, /Pen live-help\/prelaunch\/launch returned an explicit error, or the Pen process ended.*`terminated`/);
  assert.match(reference, /While `running`, do not inspect final output files as startup evidence/);
  const briefTemplateStep = skill.indexOf("[experience-brief.md](assets/experience-brief.md)");
  const manifestTemplateStep = skill.indexOf("[experience-manifest.md](assets/experience-manifest.md)");
  const briefApprovalStep = skill.indexOf("call `approve-brief`");
  assert.ok(briefTemplateStep >= 0 && briefApprovalStep > briefTemplateStep && manifestTemplateStep > briefApprovalStep, "Brief approval must precede manifest lifecycle evidence");
  assert.match(skill, /Do not replace the Brief template with an ad hoc file/);
  assert.match(skill, /Do not bind `draft\/experience\/manifest\.md` here/);
  assert.match(skill, /After `approve-brief` succeeds, do not edit the approved Brief/);
  assert.match(skill, /behavior-preserving Brief scope\/fidelity\/coverage corrections return to Experience/);
  assert.match(skill, /copy every approved Coverage\/Journey\/Screen\/State\/Step identity unchanged/);
  assert.match(experienceBrief, /\| Coverage ID \| Markdown locator .*\| Runtime relationship \|/);
  assert.match(experienceBrief, /approval-bound Coverage IDs and relationship values must be copied unchanged/);
  assert.match(experienceBrief, /## Journey closure/);
  assert.match(experienceBrief, /\| Journey ID \| First entry and initiating path \|/);
  assert.match(experienceBrief, /Every visible navigation, action, or return affordance/);
  assert.match(experienceBrief, /ordered unique list of Coverage IDs/);
  assert.match(experienceBrief, /Keep approval words\/date `pending` while presenting this Brief/);
  assert.match(experienceBrief, /Never predict or fabricate the reply/);
  assert.match(experienceBrief, /After that event, do not edit this Brief/);
  assert.match(experienceBrief, /## Prototype scope/);
  assert.match(experienceBrief, /Functional representation detail/);
  assert.match(experienceBrief, /High-fidelity visual-design non-goals/);
  assert.match(experienceBrief, /Do not deliberately make the result rough/);
  assert.match(experienceBrief, /## Screen inventory/);
  assert.match(experienceBrief, /\| Screen ID \| Coverage IDs \| Journey IDs \| Primary job \| Purpose \/ archetype \|/);
  assert.match(experienceBrief, /Required content groups/);
  assert.match(experienceBrief, /Functional regions \/ hierarchy/);
  assert.match(experienceBrief, /## Material state matrix/);
  assert.match(experienceBrief, /Visible delta/);
  assert.match(experienceBrief, /Available \/ unavailable actions/);
  assert.match(experienceBrief, /Recovery \/ next \/ re-entry/);
  assert.match(experienceBrief, /## Journey transition contract/);
  assert.match(experienceBrief, /Visible semantic trigger \/ control/);
  assert.match(experienceBrief, /Immediate feedback/);
  assert.match(experienceBrief, /Destination \/ result/);
  assert.match(experienceBrief, /Failure \/ recovery/);
  assert.match(functionalWireflow, /Screen.*stable task\/context family/);
  assert.match(functionalWireflow, /Material State/);
  assert.match(functionalWireflow, /open, plain-language and job-shaped/);
  assert.match(functionalWireflow, /reviewable batches/);
  assert.match(functionalWireflow, /Read back descendants/);
  assert.match(functionalWireflow, /state-specific descendant or variant/);
  assert.match(functionalWireflow, /One complete Screen may pass/);
  assert.match(functionalWireflow, /Justified identical state structures may pass/);
  assert.match(functionalWireflow, /separate pages, frames, or named roots per State are never mandatory/);
  assert.match(functionalWireflow, /experience\/<current>\.pen#<real-node-id>/);
  assert.match(functionalWireflow, /semantic IDs, node names, prose, and Screen-root placeholders are not Pen evidence/);
  assert.match(functionalWireflow, /canonical validator is fail-fast/);
  assert.match(functionalWireflow, /targeted identities disappear and the next diagnostic fingerprint has not been seen/);
  assert.match(functionalWireflow, /Stop when a targeted identity persists or a diagnostic fingerprint repeats/);
  assert.match(experienceManifest, /\| Coverage ID \| Markdown locator .*\| Runtime relationship \|/);
  assert.match(experienceManifest, /Candidate artifact.*`experience\/brief\.md`/);
  assert.match(experienceManifest, /Candidate artifact.*`experience\/manifest\.md`/);
  assert.match(experienceManifest, /only the current route files/);
  assert.match(experienceManifest, /independent terminal evidence/);
  assert.match(experienceManifest, /only after `approve-brief`/);
  assert.match(experienceManifest, /first bound by `approve-preview`/);
  assert.match(experienceManifest, /## Journey closure map/);
  assert.match(experienceManifest, /ordered unique Coverage sequence unchanged/);
  assert.match(experienceManifest, /Journey closure read-back/);
  assert.match(experienceManifest, /Dangling affordances/);
  assert.match(experienceManifest, /Re-entry \/ retrieval coverage/);
  assert.match(experienceManifest, /Design gap sweep/);
  assert.match(experienceManifest, /Unresolved design gaps/);
  assert.match(experienceManifest, /## Screen realization/);
  assert.match(experienceManifest, /## State realization/);
  assert.match(experienceManifest, /State-specific artifact locator/);
  assert.match(experienceManifest, /path must equal the resolved `Pen source` artifact/i);
  assert.match(experienceManifest, /actual non-empty node `id`/);
  assert.doesNotMatch(experienceManifest, /node-id-or-visible-name|state-variant-or-descendant/);
  assert.match(experienceManifest, /## Step transition realization/);
  assert.match(experienceManifest, /source-state-id.*trigger-control-id/);
  assert.match(experienceManifest, /exact approved `terminal:` \/ `external:` \/ `out-of-scope:` reason/);
  assert.match(experienceManifest, /## Functional audit/);
  for (const audit of ["inventory-completeness", "transition-closure", "feedback-recovery", "functional-walkthrough", "template-collapse"]) assert.match(experienceManifest, new RegExp(audit));
  assert.match(experienceManifest, /shared shells.*identical node counts.*arbitrary node names.*monochrome output/i);
  assert.match(experienceManifest, /PM\/Owner functional review/);
  assert.match(experienceManifest, /brand\/aesthetic approval/i);
  assert.match(experienceManifest, /exactly match the union of current Brief and preview approval artifacts/i);
  assert.match(discoveryTemplate, /provisional/i);
  assert.match(discoveryTemplate, /cannot approve Definition, Brief, preview, or Candidate/i);
  assert.match(gapProtocol, /Pen-only visual or layout defect/i);
  assert.match(gapProtocol, /Brief-only gap/i);
  assert.match(gapProtocol, /Definition behavior gap/i);
  assert.match(gapProtocol, /finish one read-only sweep/i);
  assert.match(experienceManifest, /Process state：`ready \| terminated \| not-applicable-with-reason/);
  assert.match(experienceManifest, /remains `running` working state and cannot be submitted/);
  assert.match(experienceManifest, /Resumable handle retained/);
  assert.match(experienceManifest, /Empty output while the process is alive remains `running`/);
  assert.match(experienceManifest, /A live or unresolved process stays `pending`, never `skipped-risk`/);
  assert.match(experienceManifest, /Brief\/manifest cannot cite themselves as route evidence/);
  assert.match(experienceManifest, /Owner's exact later continuation words\/date/);
  assert.match(skill, /Only a later explicit Owner reply accepting continuation without the formal artifact/);
  assert.match(skill, /Brief approval, generic setup permission, or Agent-written wording is not continuation/);
  assert.match(reference, /bind an independent terminal-evidence artifact/);
  for (const removedField of [/Route discovery evidence/, /Capability check evidence/, /Direct-operation attempt/, /Retry result/]) {
    assert.doesNotMatch(experienceManifest, removedField);
  }
  assert.match(experienceManifest, /Agent visual capability/);
  assert.match(experienceManifest, /Preview presentation to Owner/);
  assert.match(experienceManifest, /structural read-back is not visual inspection/i);
  assert.match(skill, /If the Agent cannot inspect images/);
  assert.match(skill, /If neither the Agent nor the Owner can access the preview, keep Experience blocked/);
  assert.match(skill, /read-only `preflight-experience`/);
  assert.match(skill, /retain the same live Pen handle/);
  assert.match(skill, /Save \/ clean exit: saved-open/);
  assert.match(skill, /experience\/<current>\.pen#<real-node-id>/);
  assert.match(skill, /semantic IDs, node names, prose, and Screen-root placeholders are invalid/);
  assert.match(skill, /canonical validator is fail-fast/);
  assert.match(skill, /previously targeted identities disappear from the next diagnostic and its fingerprint has not been seen/);
  assert.match(skill, /Stop when any targeted identity persists, a diagnostic fingerprint repeats/);
  assert.match(reference, /diagnostics_complete: false/);
  assert.match(reference, /newly revealed identities, including a same-size substitution, are allowed/);
  assert.match(reference, /Stop if any targeted identity persists, a diagnostic fingerprint repeats/);
  assert.match(reference, /Experience preflight rejection is a contract diagnostic, not Pen termination or tool unavailability/);
  assert.match(reference, /change `Save \/ clean exit` to `yes`/);
  assert.match(reference, /Preflight is read-only and neither records Owner review nor replaces `approve-preview`/);
  assert.match(reference, /actual non-empty node `id` returned by the current document/);
  assert.match(reference, /multiple States under one Screen need distinct evidence nodes/);
  assert.doesNotMatch(reference, /(?:rerun|retry).{0,40}(?:twice|three times|\d+ times)/i);
  assert.match(skill, /start-draft-revision/);
  assert.match(skill, /--return-phase experience/);
  assert.match(skill, /`definition` for behavior/);
  assert.match(skill, /every changed approved artifact/);
  assert.match(reference, /explicit pre-Candidate Draft-revision path/);
  assert.match(reviewMethod, /Evidence-canvas layout is not runtime behavior authority/);
  assert.match(reviewMethod, /Independently derive critical journeys/);
  assert.match(reviewMethod, /dangling target/);
  assert.match(reviewMethod, /structural evidence is not a visual substitute/);
  assert.match(reviewTemplate, /relationship statement/);
  assert.match(reviewTemplate, /Journey closure \/ re-entry check/);
  assert.match(reviewTemplate, /Dangling-affordance check/);
  assert.match(reviewProbes, /relationship statement/);
  assert.match(reviewProbes, /persistent or asynchronously changing user-visible object/);
  assert.match(reference, /visible triggers, feedback, destination\/result, failure\/recovery, re-entry, connections and bounds/);
  assert.match(reference, /task-shaped Screen\/State structures in reviewable batches/);
  assert.match(reference, /Read back descendants for every Screen\/State\/Step/);
  assert.match(reference, /absolute paths inside that root/);
  assert.match(reference, /recover with judgment/);
  assert.match(reference, /never simplify the contract merely to make a command succeed/);
  assert.doesNotMatch(reference, /Do not automatically retry/);
  assert.match(reference, /Root names, root bounds, frame count, icons, or explanatory prose alone do not prove/);
  assert.match(reviewMethod, /Independently derive the functional representation obligations/);
  assert.match(reviewMethod, /Text that says.*is not a substitute/s);
  assert.match(reviewMethod, /product-neutral `template-collapse` probe/);
  assert.match(reviewMethod, /More frames, labels, keywords or visual variants cannot compensate/);
  assert.match(reviewTemplate, /Independently reconstructed functional obligations/);
  assert.match(reviewTemplate, /Owner functional-review boundary/);
  for (const text of [skill, reference, experienceBrief, experienceManifest, reviewTemplate, reviewMethod, reviewProbes, readme]) {
    assert.doesNotMatch(text, /mutually-exclusive with <Coverage ID>|coexists with <Coverage ID>|independent example/);
  }
  assert.match(definitionSkill, /\[claim-evidence\.md\]\(assets\/claim-evidence\.md\)/);
  assert.match(claimEvidence, /Candidate evidence.*`evidence\/\{slug\}\.md`/);
  assert.doesNotMatch(claimEvidence, /Candidate evidence.*`(?:draft|source)\//);
  assert.deepEqual((await readdir(path.join(candidateRoot, "skills", "pm-experience", "scripts"))).sort(), ["pm-workflow.mjs"]);
  for (const text of [skill, reference, readme]) {
    assert.doesNotMatch(text, /batch_design|get_editor_state|snapshot_layout/);
    assert.doesNotMatch(text, /contract fingerprint|compatibility adapter|兼容层/);
  }
  for (const text of [definitionSkill, experienceBrief, experienceManifest, reference, reviewMethod, reviewProbes]) {
    assert.doesNotMatch(text, /订单|我的|Orders|Profile/, "journey closure must not require product-specific screens");
  }
  const runtimeSource = await readFile(path.join(candidateRoot, "runtime", "pm-workflow.mjs"), "utf8");
  assert.doesNotMatch(runtimeSource, /最小原型/, "runtime next action must not collapse functional fidelity into a minimal visual target");
  assert.match(runtimeSource, /functional wireflow Brief.*功能原型、回读并展示预览/);
  assert.match(runtimeSource, /"preflight-experience": \["root", "artifact", "experience-route", "json"\]/);
  assert.match(runtimeSource, /unresolved_identities/);
  assert.match(runtimeSource, /const PEN_DOCUMENT_VERSION = "2\.15"/);
  assert.match(runtimeSource, /validatePenArtifactEvidence/);
  assert.match(runtimeSource, /outside-owner-screen/);
  assert.match(runtimeSource, /duplicate-state-evidence/);
  assert.match(runtimeSource, /semantic-identity-locator/);
  for (const heuristic of [/node_count/i, /subtree_similarity/i, /visual_novelty/i, /product_keywords/i, /aesthetic_score/i, /\.pen JSON parser/i]) {
    assert.doesNotMatch(runtimeSource, heuristic, `runtime heuristic boundary: ${heuristic}`);
  }
  assert.match(readme, /`start-draft-revision`/);
  assert.match(readme, /Candidate 后仍只走 Finding 修订路径/);
});

test("Review and Handoff keep Candidate scope exact and complete at a local developer package", async () => {
  const reviewSkill = await readFile(path.join(candidateRoot, "skills", "pm-reverse-review", "SKILL.md"), "utf8");
  const reviewMethod = await readFile(path.join(candidateRoot, "skills", "pm-reverse-review", "references", "review-method.md"), "utf8");
  const reviewTemplate = await readFile(path.join(candidateRoot, "skills", "pm-reverse-review", "assets", "reverse-review.md"), "utf8");
  const handoffSkill = await readFile(path.join(candidateRoot, "skills", "pm-handoff", "SKILL.md"), "utf8");
  const releaseReference = await readFile(path.join(candidateRoot, "skills", "pm-handoff", "references", "release-and-change.md"), "utf8");
  const readme = await readFile(path.join(candidateRoot, "README.md"), "utf8");
  for (const text of [reviewSkill, reviewMethod, reviewTemplate]) {
    assert.match(text, /Candidate scope hygiene/i);
    assert.match(text, /exploration/i);
    assert.match(text, /failed|superseded|historical/i);
  }
  for (const text of [handoffSkill, releaseReference, readme]) {
    assert.match(text, /DEVELOPER-HANDOFF\.md/);
    assert.match(text, /complete locally|local .*complete|completed.*local|本地.*完成|本地 PM 交付完成/i);
    assert.match(text, /explicit.*request|明确.*要求|明确需要/i);
    assert.match(text, /send or receipt is not required|send or receipt is not a precondition|无需先发送或取得回执|无需.*发送.*回执/i);
  }
  assert.match(handoffSkill, /exact Release path/i);
  assert.match(readme, /local Release complete/);
});

test("formal source is a clean current-schema implementation without migration compatibility", async () => {
  const roots = [".github", "runtime", "scripts", "skills", "tests"];
  const files = [];
  const forbiddenPattern = new RegExp([
    `\\bV${1}\\b`,
    `\\bV${2}\\b`,
    `v${1}-imported`,
    `migrate-v${1}`,
    `parseV${1}StartHere`,
    `${["validate", "delivery"].join("_")}\\.py`,
  ].join("|"), "i");
  for (const root of roots) files.push(...await filesUnder(path.join(candidateRoot, root)));
  for (const file of files) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, forbiddenPattern, path.relative(candidateRoot, file));
  }
  const version = JSON.parse(await readFile(path.join(candidateRoot, "runtime", "runtime-version.json"), "utf8"));
  const pkg = JSON.parse(await readFile(path.join(candidateRoot, "package.json"), "utf8"));
  assert.deepEqual(version, { runtime_version: "4.0.0", schema_version: 4, minimum_node_major: 20 });
  assert.equal(pkg.version, "4.0.0");
  assert.deepEqual((await readdir(path.join(candidateRoot, "skills", "pm-delivery", "scripts"))).sort(), ["pm-workflow.mjs"]);
});

test("017 interaction improvements remain integrated across the Skill handoffs", async () => {
  for (const skillName of skillNames) {
    const text = await readFile(path.join(candidateRoot, "skills", skillName, "SKILL.md"), "utf8");
    assert.match(text, /hand off internally/i, skillName);
  }
  const delivery = await readFile(path.join(candidateRoot, "skills", "pm-delivery", "SKILL.md"), "utf8");
  const definition = await readFile(path.join(candidateRoot, "skills", "pm-definition", "SKILL.md"), "utf8");
  const intake = await readFile(path.join(candidateRoot, "skills", "pm-definition", "references", "intake-and-routing.md"), "utf8");
  assert.match(delivery, /first concrete PM-facing business question/);
  assert.match(definition, /Do not prescribe a mandatory sentence/);
  assert.match(definition, /Treat the current PM\/user as the product confirmer by default/);
  assert.match(definition, /Do not create a separate authority-confirmation question by default/);
  assert.match(intake, /does not .*create an automatic organizational approval gate/);
  assert.match(intake, /specific nodes that explicitly require confirmation beyond the current PM\/user/);
  assert.doesNotMatch(definition, /If authority is unresolved, ask who holds it and stop/);
  assert.doesNotMatch(intake, /Label an unverified self-declaration honestly/);
  assert.match(intake, /estimated_sequential_rounds/);
  assert.match(intake, /answer in their own words/);
});

test("Skill docs have no unresolved cross-Skill placeholder or host/path overfit", async () => {
  const docs = (await filesUnder(path.join(candidateRoot, "skills"))).filter((file) => !file.includes(`${path.sep}scripts${path.sep}`));
  const forbidden = [/<pm-delivery-skill-root>/, /\bCodex\b/, /\bClaude\b/, /\/tmp\//, /\bmktemp\b/, /\.codex\//, /\.claude\//];
  for (const file of docs) {
    const text = await readFile(file, "utf8");
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${path.relative(candidateRoot, file)}: ${pattern}`);
  }
});

test("relative Markdown links resolve inside each Skill", async () => {
  const docs = (await filesUnder(path.join(candidateRoot, "skills"))).filter((file) => file.endsWith(".md"));
  for (const file of docs) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
      const resolved = path.resolve(path.dirname(file), target);
      assert.ok(resolved.startsWith(path.resolve(path.dirname(file), "..")), `link escapes Skill: ${file} -> ${target}`);
      await readFile(resolved);
    }
  }
});

test("public docs contain no obvious credential literals", async () => {
  const files = [path.join(candidateRoot, "README.md"), ...(await filesUnder(path.join(candidateRoot, "skills"))).filter((file) => !file.endsWith(".py") && !file.endsWith(".mjs"))];
  const patterns = [/\bsk-[A-Za-z0-9_-]{16,}\b/, /\bAKIA[A-Z0-9]{16}\b/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const pattern of patterns) assert.doesNotMatch(text, pattern, path.relative(candidateRoot, file));
  }
});

test("formal source contains no cache, rollout, Delivery, or Pen evaluation artifacts", async () => {
  const roots = [".github", "runtime", "scripts", "skills", "tests"];
  const files = [];
  for (const root of roots) files.push(...await filesUnder(path.join(candidateRoot, root)));
  const formal = files.filter((file) => !file.includes(`${path.sep}tests${path.sep}.`));
  for (const file of formal) {
    const rel = path.relative(candidateRoot, file);
    assert.doesNotMatch(rel, /(?:^|\/)(?:__pycache__|node_modules|product-deliveries|rollouts|sessions)(?:\/|$)|\.py[co]$/);
    assert.doesNotMatch(rel, /\.pen$|(?:^|\/)preview\.png$/);
  }
});

test("public package excludes candidate evaluation tooling", async () => {
  assert.deepEqual((await readdir(path.join(candidateRoot, "scripts"))).sort(), ["sync-runtime.mjs"]);
  const pkg = JSON.parse(await readFile(path.join(candidateRoot, "package.json"), "utf8"));
  assert.deepEqual(Object.keys(pkg.scripts).sort(), ["check:runtime", "test", "test:coverage"]);
  const readme = await readFile(path.join(candidateRoot, "README.md"), "utf8");
  const ci = await readFile(path.join(candidateRoot, ".github", "workflows", "ci.yml"), "utf8");
  for (const [name, text] of [["package.json", JSON.stringify(pkg)], ["README.md", readme], ["ci.yml", ci]]) {
    assert.doesNotMatch(text, /source-manifest\.mjs|install-candidate-skills\.mjs|precheck:source|check:skills-install|evidence\/PRECHECK|evidence\/FROZEN|\.agents\/skills/, name);
  }
});

test("public ignore file exposes only the public CI dot-directory", async () => {
  const ignore = await readFile(path.join(candidateRoot, ".gitignore"), "utf8");
  assert.match(ignore, /^\*\*\/\.\*\/$/m);
  assert.match(ignore, /^!\.github\/$/m);
  assert.match(ignore, /^!\.github\/workflows\/$/m);
  assert.match(ignore, /^!\.github\/workflows\/ci\.yml$/m);
  const negatedDotDirectories = ignore.split("\n").filter((line) => line.startsWith("!.") || line.startsWith("!**/."));
  assert.deepEqual(negatedDotDirectories, ["!.github/", "!.github/workflows/", "!.github/workflows/ci.yml"]);
});
