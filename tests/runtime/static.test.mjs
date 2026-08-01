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
  const templateNames = ["small-delivery.md", "capability-slice.md", "product-foundation.md"];
  assert.match(skill, /do not record the current Experience route, lifecycle status, generated source, preview, or Pen node bindings/);
  assert.match(skill, /never mutate an approved Definition file merely to refresh lifecycle prose/);
  for (const name of templateNames) {
    const text = await readFile(path.join(candidateRoot, "skills", "pm-definition", "assets", name), "utf8");
    assert.match(text, /## Experience requirements/);
    assert.match(text, /Lifecycle authority/);
    assert.match(text, /experience\/manifest\.md/);
    assert.doesNotMatch(text, /Entry summary|Experience source \/ preview|Experience behavior sync/);
  }
});

test("pm-experience routes Pen through the one-session shell-free runner", async () => {
  const skill = await readFile(path.join(candidateRoot, "skills", "pm-experience", "SKILL.md"), "utf8");
  const reference = await readFile(path.join(candidateRoot, "skills", "pm-experience", "references", "pen-direct.md"), "utf8");
  const experienceBrief = await readFile(path.join(candidateRoot, "skills", "pm-experience", "assets", "experience-brief.md"), "utf8");
  const designTemplate = await readFile(path.join(candidateRoot, "skills", "pm-experience", "assets", "pen-design-input.md"), "utf8");
  const experienceManifest = await readFile(path.join(candidateRoot, "skills", "pm-experience", "assets", "experience-manifest.md"), "utf8");
  const reviewTemplate = await readFile(path.join(candidateRoot, "skills", "pm-reverse-review", "assets", "reverse-review.md"), "utf8");
  const reviewMethod = await readFile(path.join(candidateRoot, "skills", "pm-reverse-review", "references", "review-method.md"), "utf8");
  const reviewProbes = await readFile(path.join(candidateRoot, "skills", "pm-reverse-review", "references", "risk-probes.md"), "utf8");
  const claimEvidence = await readFile(path.join(candidateRoot, "skills", "pm-definition", "assets", "claim-evidence.md"), "utf8");
  const definitionSkill = await readFile(path.join(candidateRoot, "skills", "pm-definition", "SKILL.md"), "utf8");
  const readme = await readFile(path.join(candidateRoot, "README.md"), "utf8");
  const runner = await readFile(path.join(candidateRoot, "skills", "pm-experience", "scripts", "run-pen-session.mjs"), "utf8");
  for (const text of [skill, reference, readme]) {
    assert.match(text, /one .*session|一个 interactive session/);
    assert.match(text, /do not exist|must not exist|does not overwrite|no-overwrite|不.*覆盖|never overwrites|拒绝.*覆盖/);
    assert.match(text, /symbolic link|符号链接/);
  }
  assert.match(skill, /Do not operate `pen interactive` manually/);
  assert.match(reference, /`save\(\)` on its own line/);
  assert.match(reference, /`exit\(\)` on its own line/);
  assert.match(reference, /platform-unsupported/);
  const briefTemplateStep = skill.indexOf("[experience-brief.md](assets/experience-brief.md)");
  const manifestTemplateStep = skill.indexOf("[experience-manifest.md](assets/experience-manifest.md)");
  const briefApprovalStep = skill.indexOf("call `approve-brief`");
  const designWorksheetStep = skill.indexOf("[pen-design-input.md](assets/pen-design-input.md)");
  assert.ok(briefTemplateStep >= 0 && briefApprovalStep > briefTemplateStep && designWorksheetStep > briefApprovalStep && manifestTemplateStep > briefApprovalStep, "Brief approval must precede worksheet and manifest lifecycle evidence");
  assert.match(skill, /Do not replace the Brief template with an ad hoc file/);
  assert.match(skill, /Do not bind `draft\/experience\/manifest\.md` here/);
  assert.match(skill, /After `approve-brief` succeeds, do not edit the approved Brief/);
  assert.match(skill, /pen-design-input\.md/);
  assert.match(skill, /exactly one coverage row for every approved Brief page\/state/);
  assert.match(reference, /full `Insert`, `Update`, and `Delete` operation names/);
  assert.match(reference, /display-name string parents are both allowed/);
  assert.match(experienceBrief, /\| Coverage ID \| Markdown locator .*\| Runtime relationship \|/);
  assert.match(experienceBrief, /approval-bound Coverage IDs and relationship values must be copied unchanged/);
  assert.match(experienceBrief, /Keep approval words\/date `pending` while presenting this Brief/);
  assert.match(experienceBrief, /Never predict or fabricate the reply/);
  assert.match(experienceBrief, /After that event, do not edit this Brief/);
  assert.match(designTemplate, /exactly one row for every page\/state named in the approved Brief/);
  assert.match(designTemplate, /\| Coverage ID \| Brief page\/state \|/);
  assert.match(designTemplate, /\| Runtime relationship \|/);
  assert.match(designTemplate, /approved relationship statement/);
  assert.match(experienceManifest, /\| Coverage ID \| Markdown locator .*\| Runtime relationship \|/);
  assert.match(experienceManifest, /Candidate artifact.*`experience\/brief\.md`/);
  assert.match(experienceManifest, /Candidate artifact.*`experience\/manifest\.md`/);
  assert.match(experienceManifest, /only after `approve-brief` succeeds/);
  assert.match(experienceManifest, /first bound by `approve-preview`/);
  assert.match(reference, /Do not edit that Brief after approval/);
  assert.match(reviewMethod, /Evidence-canvas layout is not runtime behavior authority/);
  assert.match(reviewTemplate, /relationship statement/);
  assert.match(reviewProbes, /relationship statement/);
  for (const text of [skill, reference, experienceBrief, designTemplate, experienceManifest, reviewTemplate, reviewMethod, reviewProbes, readme]) {
    assert.doesNotMatch(text, /mutually-exclusive with <Coverage ID>|coexists with <Coverage ID>|independent example/);
  }
  assert.match(definitionSkill, /\[claim-evidence\.md\]\(assets\/claim-evidence\.md\)/);
  assert.match(claimEvidence, /Candidate evidence.*`evidence\/\{slug\}\.md`/);
  assert.doesNotMatch(claimEvidence, /Candidate evidence.*`(?:draft|source)\//);
  assert.match(designTemplate, /Insert\("Coverage:PAGE-01-NORMAL"/);
  for (const text of [skill, reference, designTemplate, readme]) assert.doesNotMatch(text, /(?:^|[^A-Za-z])(?:I|U|D)\s*\(/m);
  assert.match(runner, /spawn\(penCommand, args, \{ cwd, env, shell: false/);
  assert.match(runner, /design-operation-shorthand/);
  assert.match(runner, /await link\(pair\.source, pair\.target\)/);
  assert.match(runner, /mkdtemp\(path\.join\(paths\.root, "draft\/experience\/pen-session-"\)\)/);
  assert.doesNotMatch(runner, /unlink\(paths\.(?:outPath|previewPath)\)/);
  assert.match(runner, /"interactive", "--out"/);
  assert.match(runner, /"--enable-preview", "--preview-output"/);
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
