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
  "## Prototype scope",
  "",
  "- Prototype question：确认当前改动不产生新的用户可见行为。",
  "- Functional representation detail：无需新增功能表达；保留现有行为说明。",
  "- Interaction coverage：核对既有入口、结果、恢复与再次进入均未改变。",
  "- Context / surface：既有用户界面与使用环境。",
  "- High-fidelity visual-design non-goals：品牌、配色、字体、阴影和装饰美学不在本轮范围。",
  "- Functional contract applicability：not-applicable-with-reason: 当前范围没有用户可见行为变化。",
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
    "- Brief：`experience/brief.md`",
    "- Pen source：not-applicable-with-reason: not-needed route does not use Pen.",
    "- Preview exports：not-applicable-with-reason: no changed user-visible artifact.",
    "- Read-back artifact：not-applicable-with-reason: no changed user-visible artifact.",
    "- Reference / route evidence：`experience/evidence.md`",
    "- Experience target：not-needed",
    "- Direct route：not-needed",
    "- Pen CLI version：not-applicable-with-reason: not-needed route does not use Pen.",
    "- Live interactive help read：not-applicable-with-reason: not-needed route does not use Pen.",
    "- Visual role：implementation-target",
    "- Functional realization applicability：not-applicable-with-reason: current scope has no visible behavior change.",
    "- Smallest scope / functional detail：existing behavior only / no new functional representation.",
    "- Scope/fidelity approval：负责人批准无需新增体验产物。",
    "",
    "## Launch state",
    "",
    "- Process state：not-applicable-with-reason: not-needed route does not launch Pen.",
    "- Resumable handle retained：not-applicable-with-reason: no Pen process.",
    "- Initial prompt：not-applicable-with-reason: no Pen process.",
    "- Terminal result：not-applicable-with-reason: no Pen process.",
    "",
    "## Coverage map",
    "",
    "| Coverage ID | Markdown locator | Pen node locator | Preview/state | Runtime relationship | Sync result |",
    "| --- | --- | --- | --- | --- | --- |",
    "| `PAGE-01` | `delivery.md#RULE-001` | not-applicable-with-reason: no changed artifact. | 既有状态 | 独立既有页面 | not-applicable-with-reason: no visible change. |",
    "",
    "## Journey closure map",
    "",
    "| Journey ID | Approved Coverage path | Observed Pen/reference path | Closure result |",
    "| --- | --- | --- | --- |",
    "| `JNY-001` | `PAGE-01` | not-applicable-with-reason: no changed visible path. | not-applicable-with-reason: no changed visible path. |",
    "",
    "## Functional audit",
    "",
    "| Audit item | Scope | Evidence | Result |",
    "| --- | --- | --- | --- |",
    "| `inventory-completeness` | no changed Experience inventory | route evidence | not-applicable-with-reason: no visible behavior change. |",
    "| `transition-closure` | no changed transitions | route evidence | not-applicable-with-reason: no visible behavior change. |",
    "| `feedback-recovery` | no changed feedback or recovery | route evidence | not-applicable-with-reason: no visible behavior change. |",
    "| `functional-walkthrough` | no changed functional steps | route evidence | not-applicable-with-reason: no visible behavior change. |",
    "| `template-collapse` | no artifact screens | route evidence | not-applicable-with-reason: no artifact structure. |",
    "",
    "## Direct-operation evidence",
    "",
    "- App state / schema read：not-applicable-with-reason: no Pen process.",
    "- Guidelines and document discovery：核对当前 Definition 与 route evidence。",
    "- Direct mutation summary：not-applicable-with-reason: no changed Experience artifact.",
    "- Structural/layout read-back：not-applicable-with-reason: no changed Experience artifact.",
    "- Coverage read-back：not-applicable-with-reason: current scope has no changed Coverage realization.",
    "",
    "- Journey closure read-back：not-applicable-with-reason: no changed visible journey.",
    "- Dangling affordances：none",
    "- Re-entry / retrieval coverage：not-applicable-with-reason: no changed retrieval behavior.",
    "- Design gap sweep：已核对全部批准 Journey，确认没有用户可见变化。",
    "- Unresolved design gaps：none",
    "- Preview file result：not-applicable-with-reason: no changed preview.",
    "- Agent visual capability：not-applicable-with-reason: no changed preview.",
    "- Preview presentation to Owner：not-applicable-with-reason: route evidence was reviewed instead.",
    "- Save / clean exit：not-applicable-with-reason: no Pen process.",
    "- External assets / provenance / delivery permission：not-applicable-with-reason: no external assets.",
    "",
    "## PM preview and Candidate result",
    "",
    "- Preview shown：no",
    "- Preview date：not-applicable-with-reason: no changed preview.",
    "- PM/Owner functional review：负责人确认当前范围没有新增用户可见行为。",
    "- PM/Owner feedback：none",
    "- PM/Owner preview approval words：批准",
    "- PM/Owner preview approval date：2026-08-03",
    "- Behavior or functional drift：none",
    "- Missing coverage：none",
    "- Experience status：completed",
    "- Experience reason：当前范围没有用户可见行为变化。",
    "- Product risk：none",
    "- PM/Owner continuation：none",
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
    "- Prototype readiness walkthrough：已按入口、状态、恢复和再次进入走查首版闭环。",
    "- Unresolved prototype blockers：none",
    "",
  ].join("\n");
}

function functionalBrief({ oneScreen = false, sharedScreen = false } = {}) {
  const locatorRows = oneScreen
    ? ["| `COV-A` | `delivery.md#RULE-001` | 完成一个可见任务 | 单一任务状态 | 当前状态独立 | 功能任务证据 |"]
    : [
        "| `COV-A` | `delivery.md#RULE-001` | 提交所需输入 | 输入任务状态 | 输入后进入确认 | 输入功能证据 |",
        "| `COV-B` | `delivery.md#SCN-001` | 查看确认结果 | 结果任务状态 | 接续输入结果 | 结果功能证据 |",
      ];
  const journeyRow = oneScreen
    ? "| `JNY-A` | `COV-A` | `COV-A` | not applicable with reason | terminal result |"
    : "| `JNY-A` | `COV-A` | `COV-B` | `COV-B` | terminal result |";
  const screenRows = oneScreen
    ? ["| `SCR-A` | `COV-A` | `JNY-A` | 完成单一任务 | 任意任务描述 | 已满足入口条件 | 必要信息与输入 | 标题、内容与动作区 | 提交、取消与恢复 | `delivery.md#RULE-001` |"]
    : sharedScreen
      ? ["| `SCR-A` | `COV-A`, `COV-B` | `JNY-A` | 提交并核对结果 | 任意共享任务表面 | 已满足入口条件 | 输入、反馈、结果与恢复 | 共享 shell 与状态专用区域 | 提交、完成、返回与恢复 | `delivery.md#RULE-001`, `delivery.md#SCN-001` |"]
    : [
        "| `SCR-A` | `COV-A` | `JNY-A` | 提交输入 | 自由输入任务 | 已满足入口条件 | 真实输入与说明 | 标题、输入与动作区 | 提交、取消与恢复 | `delivery.md#RULE-001` |",
        "| `SCR-B` | `COV-B` | `JNY-A` | 核对结果 | 自由确认任务 | 已提交输入 | 结果摘要与状态 | 标题、摘要与后续动作区 | 完成、返回与恢复 | `delivery.md#SCN-001` |",
      ];
  const stateRows = oneScreen
    ? ["| `STATE-A` | `SCR-A` | `COV-A` | 用户进入且可操作 | 显示必要输入和动作 | 提交可用且取消可用 | 等待用户动作 | terminal: 完成任务或取消恢复 | `delivery.md#RULE-001` |"]
    : [
        "| `STATE-A` | `SCR-A` | `COV-A` | 用户进入且可操作 | 显示真实输入和提交动作 | 提交可用且取消可用 | 等待输入 | 进入确认或恢复输入 | `delivery.md#RULE-001` |",
        `| \`STATE-B\` | \`${sharedScreen ? "SCR-A" : "SCR-B"}\` | \`COV-B\` | 提交成功 | 显示结果摘要与状态 | 完成和返回可用 | 明确成功反馈 | terminal: 完成任务或返回输入 | \`delivery.md#SCN-001\` |`,
      ];
  const stepRows = oneScreen
    ? ["| `STEP-A` | `JNY-A` | `COV-A` | `STATE-A` | 完成当前任务 | 可见提交控件 | 必要输入有效 | 显示处理中与结果 | terminal: task complete | 失败时显示原因并允许恢复 | `delivery.md#SCN-001` |"]
    : [
        "| `STEP-A` | `JNY-A` | `COV-A`, `COV-B` | `STATE-A` | 提交输入 | 可见提交控件 | 必要输入有效 | 显示处理中反馈 | `STATE-B` | 失败时显示原因并保留输入 | `delivery.md#SCN-001` |",
        "| `STEP-B` | `JNY-A` | `COV-B` | `STATE-B` | 完成确认 | 可见完成控件 | 结果已生成 | 显示完成反馈 | terminal: task complete | 可返回结果并重新进入 | `delivery.md#SCN-001` |",
      ];
  return [
    "# Functional Brief",
    "",
    "## Prototype scope",
    "",
    "- Prototype question：验证批准任务能从进入走到结果与恢复。",
    "- Functional representation detail：表达真实内容、语义控件、反馈、结果与恢复。",
    "- Interaction coverage：覆盖 JNY-A 的输入、动作、结果、失败恢复与重进。",
    "- Context / surface：任意桌面或移动表面，不限制页面名称。",
    "- High-fidelity visual-design non-goals：不审批品牌、配色、字体、阴影或装饰美学。",
    "- Functional contract applicability：required",
    "",
    "## Required coverage",
    "",
    "- Re-entry / retrieval：结果可从当前任务上下文再次进入，或在终态结束。",
    "",
    "## Locator map",
    "",
    "| Coverage ID | Markdown locator | Plain-language behavior | Required page/state | Runtime relationship | Expected artifact purpose |",
    "| --- | --- | --- | --- | --- | --- |",
    ...locatorRows,
    "",
    "## Journey closure",
    "",
    "| Journey ID | First entry and initiating path | Immediate result | Later re-entry / retrieval | Recovery or terminal path |",
    "| --- | --- | --- | --- | --- |",
    journeyRow,
    "",
    "## Screen inventory",
    "",
    "| Screen ID | Coverage IDs | Journey IDs | Primary job | Purpose / archetype | Entry conditions | Required content groups | Functional regions / hierarchy | Primary / secondary / recovery actions | Definition locators |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...screenRows,
    "",
    "## Material state matrix",
    "",
    "| State ID | Screen ID | Coverage IDs | Trigger / guard | Visible delta | Available / unavailable actions | Feedback / status | Recovery / next / re-entry | Definition locator |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...stateRows,
    "",
    "## Journey transition contract",
    "",
    "| Step ID | Journey ID | Coverage IDs | Source State | User intent | Visible semantic trigger / control | Guard / input | Immediate feedback | Destination / result | Failure / recovery | Definition locator |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...stepRows,
    "",
  ].join("\n");
}

function functionalManifest({ route = "pen", oneScreen = false, sharedScreen = false, preflight = false, approval = "批准功能预览" } = {}) {
  const unavailable = route === "unavailable";
  const existingReference = route === "existing-reference";
  const target = existingReference ? "existing-reference" : "pen";
  const candidateArtifacts = existingReference
    ? ["experience/brief.md", "experience/manifest.md", "experience/reference.png"]
    : unavailable
      ? ["experience/brief.md", "experience/manifest.md", "experience/terminal.md"]
      : ["experience/brief.md", "experience/manifest.md", "experience/prototype.pen", "experience/read-back.md", "experience/previews/current.png"];
  const screenRows = oneScreen
    ? [["SCR-A", "node-zebra", "必要内容、输入、语义动作及恢复均有后代节点", unavailable ? "unverified" : "pass"]]
    : sharedScreen
      ? [["SCR-A", "node-zebra", "共享 Screen 内输入状态与结果状态分别有专用后代、控件、反馈和恢复", unavailable ? "unverified" : "pass"]]
    : [
        ["SCR-A", "node-zebra", "共享 shell 下仍有任务专用输入、说明与提交控件", unavailable ? "unverified" : "pass"],
        ["SCR-B", "node-orbit", "共享 shell 下仍有任务专用结果摘要、状态与完成控件", unavailable ? "unverified" : "pass"],
      ];
  const stateRows = oneScreen
    ? [["STATE-A", "state-amber", "显示输入、动作、反馈与恢复", unavailable ? "unverified" : "pass"]]
    : [
        ["STATE-A", "state-amber", "输入可用、反馈与恢复完整", unavailable ? "unverified" : "pass"],
        ["STATE-B", "state-cobalt", "结果、完成反馈与重进完整", unavailable ? "unverified" : "pass"],
      ];
  const stepRows = oneScreen
    ? [["STEP-A", "state-amber/control-x", "feedback-x", "terminal/task-complete", "recovery-x", "not-applicable-with-reason: terminal flow.", unavailable ? "unverified" : "pass"]]
    : [
        ["STEP-A", "state-amber/control-x", "feedback-x", "state-cobalt", "recovery-x", "state-cobalt/re-entry", unavailable ? "unverified" : "pass"],
        ["STEP-B", "state-cobalt/control-y", "feedback-y", "terminal/task-complete", "recovery-y", "state-cobalt/re-entry", unavailable ? "unverified" : "pass"],
      ];
  const coverageRows = oneScreen
    ? [["COV-A", "delivery.md#RULE-001", "artifact#node-zebra", "single task", "当前状态独立", unavailable ? "unverified" : "synced"]]
    : [
        ["COV-A", "delivery.md#RULE-001", "artifact#node-zebra", "input task", "输入后进入确认", unavailable ? "unverified" : "synced"],
        ["COV-B", "delivery.md#SCN-001", "artifact#node-orbit", "result task", "接续输入结果", unavailable ? "unverified" : "synced"],
      ];
  const approvedPath = oneScreen ? "`COV-A`" : "`COV-A`, `COV-B`";
  const observedPath = unavailable ? "unavailable: Pen terminated before realization" : existingReference ? "reference#node-zebra -> reference#node-orbit" : "node-zebra -> control-x -> node-orbit";
  const auditStatus = unavailable ? "unverified" : "pass";
  const applicabilityReason = "not-applicable-with-reason: route does not use this Pen field.";
  const lines = ["# Functional Manifest", ""];
  for (const item of candidateArtifacts) lines.push(`- Candidate artifact：\`${item}\``);
  lines.push(
    "",
    "- Brief：`experience/brief.md`",
    `- Pen source：${existingReference || unavailable ? applicabilityReason : "`experience/prototype.pen`"}`,
    `- Preview exports：${existingReference || unavailable ? applicabilityReason : "`experience/previews/current.png`"}`,
    `- Read-back artifact：${existingReference || unavailable ? applicabilityReason : "`experience/read-back.md`"}`,
    `- Reference / route evidence：${existingReference ? "`experience/reference.png`" : unavailable ? "`experience/terminal.md`" : "not-applicable-with-reason: direct Pen outputs are listed separately."}`,
    `- Experience target：${target}`,
    `- Direct route：${unavailable ? "unavailable" : existingReference ? "existing-reference" : "pen-interactive-direct"}`,
    `- Pen CLI version：${existingReference ? applicabilityReason : "0.3.1"}`,
    `- Live interactive help read：${existingReference ? applicabilityReason : "yes"}`,
    "- Visual role：implementation-target",
    "- Functional realization applicability：required",
    "- Smallest scope / functional detail：JNY-A / required content, controls, feedback and recovery.",
    "- Scope/fidelity approval：负责人批准功能合同。",
    "",
    "## Launch state",
    "",
    `- Process state：${unavailable ? "terminated" : existingReference ? applicabilityReason : "ready"}`,
    `- Resumable handle retained：${unavailable ? "yes" : existingReference ? applicabilityReason : "yes"}`,
    `- Initial prompt：${unavailable ? "seen" : existingReference ? applicabilityReason : "seen"}`,
    `- Terminal result：${unavailable ? "Pen session ended with save error code 1." : existingReference ? applicabilityReason : "none"}`,
    "",
    "## Coverage map",
    "",
    "| Coverage ID | Markdown locator | Artifact locator | Preview/state | Runtime relationship | Sync result |",
    "| --- | --- | --- | --- | --- | --- |",
    ...coverageRows.map((row) => `| \`${row[0]}\` | \`${row[1]}\` | ${unavailable ? `unavailable: ${row[2]}` : row[2]} | ${row[3]} | ${row[4]} | ${row[5]} |`),
    "",
    "## Journey closure map",
    "",
    "| Journey ID | Approved Coverage path | Observed Pen/reference path | Closure result |",
    "| --- | --- | --- | --- |",
    `| \`JNY-A\` | ${approvedPath} | ${observedPath} | ${unavailable ? "unverified" : "closed"} |`,
    "",
    "## Screen realization",
    "",
    "| Screen ID | Artifact locator | Required regions / content / controls evidence | Realization result |",
    "| --- | --- | --- | --- |",
    ...screenRows.map((row) => `| \`${row[0]}\` | ${unavailable ? "unavailable: no artifact" : `prototype#${row[1]}`} | ${unavailable ? "unavailable: no descendant evidence after termination" : row[2]} | ${row[3]} |`),
    "",
    "## State realization",
    "",
    "| State ID | Artifact locator | Visible delta / feedback / actions / recovery evidence | Realization result |",
    "| --- | --- | --- | --- |",
    ...stateRows.map((row) => `| \`${row[0]}\` | ${unavailable ? "unavailable: no artifact" : `prototype#${row[1]}`} | ${unavailable ? "unavailable: no state evidence after termination" : row[2]} | ${row[3]} |`),
    "",
    "## Step transition realization",
    "",
    "| Step ID | Source / trigger locator | Feedback locator | Destination / result locator | Failure / recovery locator | Re-entry locator | Realization result |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...stepRows.map((row) => `| \`${row[0]}\` | ${unavailable ? "unavailable: no source" : row[1]} | ${unavailable ? "unavailable: no feedback" : row[2]} | ${unavailable ? "unavailable: no result" : row[3]} | ${unavailable ? "unavailable: no recovery" : row[4]} | ${unavailable ? "unavailable: no re-entry" : row[5]} | ${row[6]} |`),
    "",
    "## Functional audit",
    "",
    "| Audit item | Scope | Evidence | Result |",
    "| --- | --- | --- | --- |",
    `| \`inventory-completeness\` | all identities and obligations | ${unavailable ? "unavailable: no completed inventory audit" : "descendant read-back"} | ${auditStatus} |`,
    `| \`transition-closure\` | all Step transitions | ${unavailable ? "unavailable: no completed transition audit" : "trigger and destination evidence"} | ${auditStatus} |`,
    `| \`feedback-recovery\` | feedback and recovery | ${unavailable ? "unavailable: no completed feedback audit" : "visible status and recovery controls"} | ${auditStatus} |`,
    `| \`functional-walkthrough\` | each Step goal and progress | ${unavailable ? "unavailable: no completed walkthrough" : "per-Step walkthrough"} | ${auditStatus} |`,
    `| \`template-collapse\` | shared monochrome shell with arbitrary node names | ${unavailable ? "unavailable: no completed structure audit" : oneScreen || sharedScreen ? "not-applicable to one Screen" : "different jobs keep task-specific content and controls"} | ${(oneScreen || sharedScreen) && !unavailable ? "not-applicable-with-reason: only one Screen." : auditStatus} |`,
    "",
    "## Direct-operation evidence",
    "",
    `- App state / schema read：${existingReference ? applicabilityReason : unavailable ? "read before terminal save error" : "schema and app state read"}`,
    "- Guidelines and document discovery：Brief and relevant live guidelines read.",
    `- Direct mutation summary：${existingReference ? applicabilityReason : unavailable ? "Pen terminated before final realization." : "task-shaped functional structures created."}`,
    `- Structural/layout read-back：${existingReference ? "reference structure inspected" : unavailable ? "unavailable after terminal error" : "descendant content, controls, connections and bounds read back."}`,
    `- Coverage read-back：${unavailable ? "unverified after terminal error" : "all Coverage identities matched."}`,
    `- Journey closure read-back：${unavailable ? "unverified after terminal error" : "JNY-A traced through feedback, result and recovery."}`,
    `- Dangling affordances：${unavailable ? "not-applicable-with-reason: no final artifact." : "none"}`,
    `- Re-entry / retrieval coverage：${unavailable ? "unverified after terminal error" : "JNY-A result and re-entry checked."}`,
    `- Design gap sweep：${unavailable ? "Pen terminated; no no-gap claim made." : "all approved Journeys checked with no gaps."}`,
    "- Unresolved design gaps：none",
    `- Preview file result：${unavailable ? "unavailable: Pen terminated before preview." : existingReference ? applicabilityReason : "ready: experience/previews/current.png exists."}`,
    `- Agent visual capability：${unavailable ? "not-applicable-with-reason: no preview exists." : "agent-visual"}`,
    `- Preview presentation to Owner：${preflight ? "pending" : unavailable ? "unavailable" : "local-path"}`,
    `- Save / clean exit：${unavailable ? "no" : existingReference ? applicabilityReason : preflight ? "saved-open" : "yes"}`,
    "- External assets / provenance / delivery permission：not-applicable-with-reason: no external assets.",
    "",
    "## PM preview and Candidate result",
    "",
    `- Preview shown：${preflight ? "pending" : unavailable ? "no" : "yes"}`,
    `- Preview date：${preflight ? "pending" : unavailable ? "not-applicable-with-reason: no preview exists." : "2026-08-03"}`,
    `- PM/Owner functional review：${preflight ? "pending" : unavailable ? "not-applicable-with-reason: no preview exists after terminal failure." : "Owner confirmed tasks, states, controls, feedback, recovery and scope only."}`,
    `- PM/Owner feedback：${preflight ? "pending" : "none"}`,
    `- PM/Owner preview approval words：${preflight ? "pending" : approval}`,
    `- PM/Owner preview approval date：${preflight ? "pending" : "2026-08-03"}`,
    "- Behavior or functional drift：none",
    `- Missing coverage：${unavailable ? "final functional artifact and preview are unavailable" : "none"}`,
    `- Experience status：${preflight ? "pending" : unavailable ? "skipped-risk" : "completed"}`,
    `- Experience reason：${unavailable ? "tool-unavailable" : "functional evidence complete"}`,
    `- Product risk：${unavailable ? "development may misinterpret the intended interaction without a final artifact" : "none"}`,
    `- PM/Owner continuation：${preflight && unavailable ? "pending" : unavailable ? approval : "none"}`,
    "",
  );
  return lines.join("\n");
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
    "- Prototype readiness walkthrough：已检查入口、异步结果、失败恢复和再次进入。",
    "- Unresolved prototype blockers：none",
    "",
  ].join("\n"));
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 0);

  await writeFile(path.join(root, "draft", "experience", "brief.md"), "# Brief\n\n- Re-entry / retrieval：用户可再次查看结果。\n");
  const incompleteBrief = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(incompleteBrief.status, 2, JSON.stringify(incompleteBrief));
  assert.equal(incompleteBrief.output.error.code, "experience-functional-contract");
  await writeFile(path.join(root, "draft", "experience", "brief.md"), validBrief.replace("| `JNY-001` | `PAGE-01` | `PAGE-01` | `PAGE-01` | 当前状态保持可见 |", "| `JNY-001` |  |  |  |  |"));
  const emptyJourney = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(emptyJourney.status, 2, JSON.stringify(emptyJourney));
  assert.equal(emptyJourney.output.error.code, "experience-functional-contract");
  await writeFile(path.join(root, "draft", "experience", "brief.md"), validBrief.replace("| `JNY-001` | `PAGE-01` |", "| `JNY-001` | PAGE-02 |"));
  const unknownCoverage = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(unknownCoverage.status, 2, JSON.stringify(unknownCoverage));
  assert.equal(unknownCoverage.output.error.code, "experience-functional-contract");
  await writeFile(path.join(root, "draft", "experience", "brief.md"), validBrief);
  await writeFile(path.join(root, "draft", "experience", "evidence.md"), "# Route evidence\n\nNo user-visible behavior changed.\n");
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);

  await writeFile(path.join(root, "draft", "experience", "manifest.md"), "# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n");
  const incompleteManifest = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(incompleteManifest.status, 2, JSON.stringify(incompleteManifest));
  assert.equal(incompleteManifest.output.error.code, "experience-functional-evidence");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), withJourneyEvidence("# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n").replaceAll("JNY-001", "JNY-002"));
  const mismatchedJourney = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(mismatchedJourney.status, 2, JSON.stringify(mismatchedJourney));
  assert.equal(mismatchedJourney.output.error.code, "experience-functional-evidence");
  const wrongCoveragePath = withJourneyEvidence("# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n").replace("| `JNY-001` | `PAGE-01` | not-applicable-with-reason: no changed visible path. | not-applicable-with-reason: no changed visible path. |", "| `JNY-001` | PAGE-02 | not-applicable-with-reason: no changed visible path. | not-applicable-with-reason: no changed visible path. |");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), wrongCoveragePath);
  const mismatchedCoverage = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(mismatchedCoverage.status, 2, JSON.stringify(mismatchedCoverage));
  assert.equal(mismatchedCoverage.output.error.code, "experience-functional-evidence");
  const validNotNeededManifest = withJourneyEvidence("# Manifest\n\n- Candidate artifact：`experience/brief.md`\n- Candidate artifact：`experience/manifest.md`\n");
  const notNeededPreflightManifest = validNotNeededManifest
    .replace("- Preview presentation to Owner：not-applicable-with-reason: route evidence was reviewed instead.", "- Preview presentation to Owner：pending")
    .replace("- Preview date：not-applicable-with-reason: no changed preview.", "- Preview date：pending")
    .replace("- PM/Owner functional review：负责人确认当前范围没有新增用户可见行为。", "- PM/Owner functional review：pending")
    .replace("- PM/Owner feedback：none", "- PM/Owner feedback：pending")
    .replace("- PM/Owner preview approval words：批准", "- PM/Owner preview approval words：pending")
    .replace("- PM/Owner preview approval date：2026-08-03", "- PM/Owner preview approval date：pending")
    .replace("- Preview shown：no", "- Preview shown：pending")
    .replace("- Experience status：completed", "- Experience status：pending");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), notNeededPreflightManifest);
  const acceptedNotNeededPreflight = cli([
    "preflight-experience", "--root", root, "--artifact", "draft/experience/evidence.md",
    "--artifact", "draft/experience/manifest.md", "--experience-route", "not-needed",
  ]);
  assert.equal(acceptedNotNeededPreflight.status, 0, JSON.stringify(acceptedNotNeededPreflight));
  assert.equal(acceptedNotNeededPreflight.output.diagnostics_complete, true);
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), validNotNeededManifest.replace("`experience/evidence.md`", "`experience/brief.md`"));
  const selfReferencedRoute = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(selfReferencedRoute.status, 2, JSON.stringify(selfReferencedRoute));
  assert.equal(selfReferencedRoute.output.error.code, "experience-functional-evidence");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), validNotNeededManifest.replace("- Functional realization applicability：not-applicable-with-reason: current scope has no visible behavior change.", "- Functional realization applicability：required"));
  const falseNotNeededSuccess = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(falseNotNeededSuccess.status, 2, JSON.stringify(falseNotNeededSuccess));
  assert.equal(falseNotNeededSuccess.output.error.code, "experience-functional-evidence");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), validNotNeededManifest);
  const approvedPreview = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  assert.equal(approvedPreview.status, 0, JSON.stringify(approvedPreview));
});

test("typed functional Brief rejects identity, ownership, destination, and missing-obligation drift", async (t) => {
  const root = await newRoot(t, "typed-brief-");
  assert.equal(cli(["init", "--root", root, "--delivery-id", "DEL-typed-brief", "--title", "Typed Brief", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await mkdir(path.join(root, "draft", "experience"), { recursive: true });
  await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery\n\n- RULE-001: 用户完成任务。\n- SCN-001: 用户看见结果并可恢复。\n"));
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 0);
  const variants = [
    functionalBrief().replace("| `SCR-B` | `COV-B`", "| `SCR-A` | `COV-B`"),
    functionalBrief().replace("| `SCR-B` | `COV-B`", "| `SCREEN-B` | `COV-B`"),
    functionalBrief().replace("| `SCR-A` | `COV-A` |", "| `SCR-A` | `COV-A`, `COV-A` |"),
    functionalBrief().replace("| `STATE-A` | `SCR-A`", "| `STATE-A` | `SCR-X`"),
    functionalBrief().replace("| `STATE-B` | 失败时显示原因并保留输入", "| `STATE-X` | 失败时显示原因并保留输入"),
    functionalBrief().replace("| 已满足入口条件 | 真实输入与说明 |", "| 已满足入口条件 | none |"),
    functionalBrief().replace("| 等待输入 | 进入确认或恢复输入 |", "| unverified | 进入确认或恢复输入 |"),
    functionalBrief().replace("| 提交输入 | 可见提交控件 |", "| 提交输入 | none |"),
    functionalBrief().replace("| 失败时显示原因并保留输入 |", "| none |"),
    `${functionalBrief().replace("| 已满足入口条件 | 真实输入与说明 |", "| 已满足入口条件 |  |")}\n\n100 frames and many matching labels cannot replace required content.\n`,
  ];
  for (const brief of variants) {
    await writeFile(path.join(root, "draft", "experience", "brief.md"), brief);
    const result = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准功能合同", "--experience-route", "pen", "--actor-role", "product-owner"]);
    assert.equal(result.status, 2, JSON.stringify(result));
    assert.equal(result.output.error.code, "experience-functional-contract");
    assert.equal((await readdir(path.join(root, "events"))).length, 2);
  }
  await writeFile(path.join(root, "draft", "experience", "brief.md"), functionalBrief());
  const valid = cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准功能合同", "--experience-route", "pen", "--actor-role", "product-owner"]);
  assert.equal(valid.status, 0, JSON.stringify(valid));
});

test("Pen preview gate rejects exact no-path contradiction and cross-field drift before accepting complete evidence", async (t) => {
  const root = await newRoot(t, "typed-pen-");
  assert.equal(cli(["init", "--root", root, "--delivery-id", "DEL-typed-pen", "--title", "Typed Pen", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await mkdir(path.join(root, "draft", "experience", "previews"), { recursive: true });
  await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery\n\n- RULE-001: 用户提交输入。\n- SCN-001: 用户查看结果并恢复。\n"));
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(root, "draft", "experience", "brief.md"), functionalBrief());
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准功能合同", "--experience-route", "pen", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(root, "draft", "experience", "prototype.pen"), "deterministic fixture, not a live Pen file\n");
  await writeFile(path.join(root, "draft", "experience", "read-back.md"), "# Descendant read-back\n\ncontent, controls, feedback and transitions verified\n");
  await writeFile(path.join(root, "draft", "experience", "previews", "current.png"), "deterministic fixture\n");
  const validManifest = functionalManifest();
  const contradictions = [
    validManifest.replace("node-zebra -> control-x -> node-orbit | closed", "none | unverified"),
    validManifest.replace("| `SCR-A` | prototype#node-zebra", "| `SCR-X` | prototype#node-zebra"),
    validManifest.replace("共享 shell 下仍有任务专用输入、说明与提交控件 | pass", "none | pass"),
    validManifest.replace("all identities and obligations | descendant read-back | pass", "all identities and obligations | none | pass"),
    validManifest.replace("- Process state：ready", "- Process state：terminated"),
    validManifest.replace("- Read-back artifact：`experience/read-back.md`", "- Read-back artifact：`experience/manifest.md`"),
    validManifest.replace("- Preview file result：ready: experience/previews/current.png exists.", "- Preview file result：ready: experience/previews/unbound.png exists."),
    validManifest.replace("- Missing coverage：none", "- Missing coverage：100 frames exist, therefore none"),
    validManifest.replace("- PM/Owner preview approval words：批准功能预览", "- PM/Owner preview approval words：different words"),
    validManifest.replace("- PM/Owner preview approval date：2026-08-03", "- PM/Owner preview approval date：none"),
  ];
  const args = [
    "approve-preview", "--root", root, "--expect-revision", "3",
    "--artifact", "draft/experience/manifest.md", "--artifact", "draft/experience/prototype.pen",
    "--artifact", "draft/experience/read-back.md", "--artifact", "draft/experience/previews/current.png",
    "--evidence", "批准功能预览", "--experience-route", "pen", "--actor-role", "product-owner",
  ];
  for (const manifest of contradictions) {
    await writeFile(path.join(root, "draft", "experience", "manifest.md"), manifest);
    const result = cli(args);
    assert.equal(result.status, 2, JSON.stringify(result));
    assert.equal(result.output.error.code, "experience-functional-evidence");
    assert.equal((await readdir(path.join(root, "events"))).length, 3);
  }
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest);
  const missingPreviewBinding = cli([
    "approve-preview", "--root", root, "--expect-revision", "3",
    "--artifact", "draft/experience/manifest.md", "--artifact", "draft/experience/prototype.pen",
    "--artifact", "draft/experience/read-back.md", "--evidence", "批准功能预览",
    "--experience-route", "pen", "--actor-role", "product-owner",
  ]);
  assert.equal(missingPreviewBinding.status, 2, JSON.stringify(missingPreviewBinding));
  assert.equal(missingPreviewBinding.output.error.code, "experience-functional-evidence");
  const accepted = cli(args);
  assert.equal(accepted.status, 0, JSON.stringify(accepted));
});

test("Experience preflight accepts pending Owner lifecycle without mutating state and rejects incomplete functional evidence", async (t) => {
  const root = await newRoot(t, "experience-preflight-");
  assert.equal(cli(["init", "--root", root, "--delivery-id", "DEL-experience-preflight", "--title", "Experience preflight", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await mkdir(path.join(root, "draft", "experience", "previews"), { recursive: true });
  await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery\n\n- RULE-001: 用户提交输入。\n- SCN-001: 用户查看结果并恢复。\n"));
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(root, "draft", "experience", "brief.md"), functionalBrief({ sharedScreen: true }));
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准功能合同", "--experience-route", "pen", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(root, "draft", "experience", "prototype.pen"), "shared Screen fixture with state-specific descendants\n");
  await writeFile(path.join(root, "draft", "experience", "read-back.md"), "# Read-back\n\nSTATE-A and STATE-B have distinct descendant evidence in SCR-A.\n");
  await writeFile(path.join(root, "draft", "experience", "previews", "current.png"), "deterministic preview fixture\n");

  const validManifest = functionalManifest({ sharedScreen: true, preflight: true });
  const args = [
    "preflight-experience", "--root", root, "--artifact", "draft/experience/manifest.md",
    "--artifact", "draft/experience/prototype.pen", "--artifact", "draft/experience/read-back.md",
    "--artifact", "draft/experience/previews/current.png", "--experience-route", "pen",
  ];
  const eventSnapshot = async () => Promise.all((await readdir(path.join(root, "events"))).map(async (name) => [
    name,
    await readFile(path.join(root, "events", name), "utf8"),
  ]));
  const before = {
    events: await eventSnapshot(),
    state: await readFile(path.join(root, "workflow-state.json"), "utf8"),
    start: await readFile(path.join(root, "START-HERE.md"), "utf8"),
    rootEntries: (await readdir(root)).sort(),
  };

  await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest);
  const accepted = cli(args);
  assert.equal(accepted.status, 0, JSON.stringify(accepted));
  assert.equal(accepted.output.revision, 3);
  assert.deepEqual(accepted.output.unresolved_identities, []);
  assert.equal(accepted.output.diagnostics_complete, true);

  await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest.replace("- Save / clean exit：saved-open", "- Save / clean exit：yes"));
  const rejectedPrematureExit = cli(args);
  assert.equal(rejectedPrematureExit.status, 2, JSON.stringify(rejectedPrematureExit));
  assert.equal(rejectedPrematureExit.output.error.code, "experience-functional-evidence");

  const withoutScreen = validManifest.replace(/## Screen realization[\s\S]*?(?=\n## State realization)/u, "");
  const withoutScreenOrState = withoutScreen.replace(/## State realization[\s\S]*?(?=\n## Step transition realization)/u, "");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), withoutScreenOrState);
  const rejectedScreen = cli(args);
  assert.equal(rejectedScreen.status, 2, JSON.stringify(rejectedScreen));
  assert.equal(rejectedScreen.output.error.code, "experience-functional-evidence");
  assert.equal(rejectedScreen.output.error.details.diagnostics_complete, false);
  assert.match(rejectedScreen.output.error.details.diagnostic_fingerprint, /^[a-f0-9]{64}$/u);
  assert.ok(rejectedScreen.output.error.details.unresolved_identities.includes("screen-realization"));

  await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest.replace(/## State realization[\s\S]*?(?=\n## Step transition realization)/u, ""));
  const rejectedNewlyRevealedState = cli(args);
  assert.equal(rejectedNewlyRevealedState.status, 2, JSON.stringify(rejectedNewlyRevealedState));
  assert.equal(rejectedNewlyRevealedState.output.error.details.diagnostics_complete, false);
  assert.ok(rejectedNewlyRevealedState.output.error.details.unresolved_identities.includes("state-realization"));
  assert.ok(!rejectedNewlyRevealedState.output.error.details.unresolved_identities.includes("screen-realization"));
  assert.notEqual(rejectedNewlyRevealedState.output.error.details.diagnostic_fingerprint, rejectedScreen.output.error.details.diagnostic_fingerprint);

  const rejectedRepeatedState = cli(args);
  assert.equal(rejectedRepeatedState.status, 2, JSON.stringify(rejectedRepeatedState));
  assert.equal(rejectedRepeatedState.output.error.details.diagnostic_fingerprint, rejectedNewlyRevealedState.output.error.details.diagnostic_fingerprint);

  await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest.replace("state-amber/control-x | feedback-x", "state-amber/control-x | pending"));
  const rejectedTransition = cli(args);
  assert.equal(rejectedTransition.status, 2, JSON.stringify(rejectedTransition));
  assert.equal(rejectedTransition.output.error.code, "experience-functional-evidence");
  assert.ok(rejectedTransition.output.error.details.unresolved_identities.includes("STEP-A"));

  await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest);
  const withoutReadBack = args.filter((value, index) => value !== "draft/experience/read-back.md" && !(value === "--artifact" && args[index + 1] === "draft/experience/read-back.md"));
  const rejectedArtifact = cli(withoutReadBack);
  assert.equal(rejectedArtifact.status, 2, JSON.stringify(rejectedArtifact));
  assert.equal(rejectedArtifact.output.error.code, "experience-functional-evidence");
  assert.ok(rejectedArtifact.output.error.details.unresolved_identities.includes("artifact-binding"));

  assert.deepEqual(await eventSnapshot(), before.events);
  assert.equal(await readFile(path.join(root, "workflow-state.json"), "utf8"), before.state);
  assert.equal(await readFile(path.join(root, "START-HERE.md"), "utf8"), before.start);
  assert.deepEqual((await readdir(root)).sort(), before.rootEntries);
  await assert.rejects(readFile(path.join(root, "workflow.lock"), "utf8"), (error) => error?.code === "ENOENT");
  assert.equal(cli(["status", "--root", root]).output.state.revision, 3);
});

test("route-aware Experience validation accepts existing-reference and explicit terminal-unavailable contracts", async (t) => {
  const cases = [
    { name: "reference", route: "existing-reference", manifestRoute: "existing-reference", evidence: "批准功能预览", artifact: "reference.png" },
    { name: "unavailable", route: "pen", manifestRoute: "unavailable", evidence: "知悉工具终止并继续", artifact: "terminal.md" },
  ];
  for (const item of cases) {
    const root = await newRoot(t, `route-${item.name}-`);
    assert.equal(cli(["init", "--root", root, "--delivery-id", `DEL-${item.name}`, "--title", item.name, "--owner", "Owner", "--expect-revision", "0"]).status, 0);
    await mkdir(path.join(root, "draft", "experience"), { recursive: true });
    await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery\n\n- RULE-001: 用户提交输入。\n- SCN-001: 用户查看结果并恢复。\n"));
    assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 0);
    await writeFile(path.join(root, "draft", "experience", "brief.md"), functionalBrief());
    assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准功能合同", "--experience-route", item.route, "--actor-role", "product-owner"]).status, 0);
    await writeFile(path.join(root, "draft", "experience", item.artifact), `${item.name} deterministic evidence\n`);
    const validManifest = functionalManifest({ route: item.manifestRoute, approval: item.evidence });
    await writeFile(path.join(root, "draft", "experience", "manifest.md"), functionalManifest({ route: item.manifestRoute, preflight: true, approval: item.evidence }));
    const acceptedPreflight = cli([
      "preflight-experience", "--root", root, "--artifact", "draft/experience/manifest.md",
      "--artifact", `draft/experience/${item.artifact}`, "--experience-route", item.route,
    ]);
    assert.equal(acceptedPreflight.status, 0, JSON.stringify(acceptedPreflight));
    assert.equal(acceptedPreflight.output.diagnostics_complete, true);
    const args = [
      "approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/manifest.md",
      "--artifact", `draft/experience/${item.artifact}`, "--evidence", item.evidence,
      "--experience-route", item.route, "--actor-role", "product-owner",
    ];
    const selfReferenced = validManifest.replace(`- Reference / route evidence：\`experience/${item.artifact}\``, "- Reference / route evidence：`experience/manifest.md`");
    await writeFile(path.join(root, "draft", "experience", "manifest.md"), selfReferenced);
    const rejectedSelfReference = cli(args);
    assert.equal(rejectedSelfReference.status, 2, JSON.stringify(rejectedSelfReference));
    assert.equal(rejectedSelfReference.output.error.code, "experience-functional-evidence");
    if (item.manifestRoute === "unavailable") {
      await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest.replace("- PM/Owner continuation：知悉工具终止并继续", "- PM/Owner continuation：none"));
      const rejectedContinuation = cli(args);
      assert.equal(rejectedContinuation.status, 2, JSON.stringify(rejectedContinuation));
      assert.equal(rejectedContinuation.output.error.code, "experience-functional-evidence");
      await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest.replace("unavailable: no descendant evidence after termination", "claimed completed descendant evidence"));
      const rejectedFabricatedRealization = cli(args);
      assert.equal(rejectedFabricatedRealization.status, 2, JSON.stringify(rejectedFabricatedRealization));
      assert.equal(rejectedFabricatedRealization.output.error.code, "experience-functional-evidence");
      await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest.replace("- Preview shown：no", "- Preview shown：yes"));
      const rejectedNormalSuccess = cli(args);
      assert.equal(rejectedNormalSuccess.status, 2, JSON.stringify(rejectedNormalSuccess));
      assert.equal(rejectedNormalSuccess.output.error.code, "experience-functional-evidence");
    }
    await writeFile(path.join(root, "draft", "experience", "manifest.md"), validManifest);
    const result = cli(args);
    assert.equal(result.status, 0, JSON.stringify(result));
  }
});

test("one-Screen arbitrary-name monochrome functional evidence passes without visual heuristics", async (t) => {
  const root = await newRoot(t, "anti-overfit-");
  assert.equal(cli(["init", "--root", root, "--delivery-id", "DEL-anti-overfit", "--title", "Anti overfit", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
  await mkdir(path.join(root, "draft", "experience", "previews"), { recursive: true });
  await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery\n\n- RULE-001: 用户完成单一任务。\n- SCN-001: 用户遇到失败时恢复。\n"));
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(root, "draft", "experience", "brief.md"), functionalBrief({ oneScreen: true }));
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准功能合同", "--experience-route", "pen", "--actor-role", "product-owner"]).status, 0);
  await writeFile(path.join(root, "draft", "experience", "prototype.pen"), "arbitrary nodes: zebra amber x; monochrome\n");
  await writeFile(path.join(root, "draft", "experience", "read-back.md"), "# Read-back\n\nOne complete Screen with content, control, feedback and recovery.\n");
  await writeFile(path.join(root, "draft", "experience", "previews", "current.png"), "monochrome deterministic fixture\n");
  await writeFile(path.join(root, "draft", "experience", "manifest.md"), functionalManifest({ oneScreen: true }));
  const accepted = cli([
    "approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/manifest.md",
    "--artifact", "draft/experience/prototype.pen", "--artifact", "draft/experience/read-back.md",
    "--artifact", "draft/experience/previews/current.png", "--evidence", "批准功能预览",
    "--experience-route", "pen", "--actor-role", "product-owner",
  ]);
  assert.equal(accepted.status, 0, JSON.stringify(accepted));
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
  const approvedPreview = cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner", "--actor-label", "负责人"]);
  assert.equal(approvedPreview.status, 0, JSON.stringify(approvedPreview));
  const frozen = cli(["freeze-candidate", "--root", root, "--expect-revision", "4", "--candidate-id", "CAND-integration-r1"]);
  assert.equal(frozen.status, 0, JSON.stringify(frozen));
  await writeFile(path.join(root, "reviews", "review-01.md"), `# Review\n\n${findings.join("\n")}\n`);
  const reviewArgs = ["record-review", "--root", root, "--expect-revision", "5", "--review-id", "REV-integration-01", "--report", "reviews/review-01.md", "--review-mode", "self-check", "--outcome", findings.length ? "findings-open" : "passed", "--source-session", "session-1", "--review-session", "session-1", "--source-model", "model-a", "--review-model", "model-a", "--actor-role", "reviewer", "--actor-label", "Reviewer"];
  for (const finding of findings) reviewArgs.push("--finding-id", finding);
  const reviewed = cli(reviewArgs);
  assert.equal(reviewed.status, 0, JSON.stringify(reviewed));
  return root;
}

async function throughLocalRelease(t) {
  const root = await throughCandidate(t);
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "6", "--evidence", "确认交付给开发", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["create-release", "--root", root, "--expect-revision", "7", "--release-id", "REL-integration-001"]).status, 0);
  return root;
}

async function throughDistributed(t) {
  const root = await throughLocalRelease(t);
  assert.equal(cli(["record-send", "--root", root, "--expect-revision", "8", "--send-status", "sent-confirmed", "--channel", "manual", "--recipient", "开发负责人", "--external-ref", "message-001", "--evidence", "已确认发送"]).status, 0);
  assert.equal(cli(["record-receipt", "--root", root, "--expect-revision", "9", "--receipt-status", "acknowledged", "--recipient", "开发负责人", "--external-ref", "reply-001", "--evidence", "开发负责人确认收到", "--actor-role", "external-recipient"]).status, 0);
  return root;
}

test("local Release completes Delivery while optional send and receipt remain separate audit", async (t) => {
  const root = await throughCandidate(t);
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "6", "--evidence", "确认交付给开发", "--actor-role", "product-owner", "--actor-label", "负责人"]).status, 0);
  const released = cli(["create-release", "--root", root, "--expect-revision", "7", "--release-id", "REL-integration-001"]);
  assert.equal(released.status, 0, JSON.stringify(released));
  assert.equal(released.output.state.phase, "complete");
  assert.equal(released.output.state.status, "complete");
  assert.equal(released.output.state.next_skill, "none");
  assert.equal(released.output.state.sending.status, "prepared");
  assert.notEqual(released.output.state.candidate.candidate_id, released.output.state.release.release_id);
  assert.equal(cli(["create-release", "--root", root, "--expect-revision", "8", "--release-id", "REL-integration-001"]).status, 3);
  const attempted = cli(["record-send", "--root", root, "--expect-revision", "8", "--send-status", "attempted", "--channel", "manual", "--recipient", "开发负责人", "--external-ref", "mail-attempt-001", "--evidence", "首次发送结果不确定"]);
  assert.equal(attempted.status, 0);
  assert.equal(attempted.output.state.phase, "complete");
  assert.equal(attempted.output.state.next_skill, "none");
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
  const releaseRoot = path.join(root, "releases", "REL-integration-001");
  const releaseManifest = JSON.parse(await readFile(path.join(releaseRoot, "MANIFEST.json"), "utf8"));
  assert.equal(releaseManifest.kind, "release");
  assert.equal(releaseManifest.release_format, "developer-handoff");
  assert.equal(releaseManifest.source.candidate_id, "CAND-integration-r1");
  assert.equal(releaseManifest.source.review_id, "REV-integration-01");
  assert.ok(releaseManifest.files.some((record) => record.path === "DEVELOPER-HANDOFF.md"));
  assert.ok(releaseManifest.files.some((record) => record.path === "review/REV-integration-01.md"));
  assert.match(await readFile(path.join(releaseRoot, "DEVELOPER-HANDOFF.md"), "utf8"), /Local delivery: complete/);
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

test("Definition evidence locators must be explicitly approval-bound before Candidate freeze", async (t) => {
  const prepare = async (prefix, bindEvidence) => {
    const root = await newRoot(t, prefix);
    assert.equal(cli(["init", "--root", root, "--delivery-id", `DEL-${prefix}`, "--title", "Evidence binding", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
    await seedDraft(root);
    await mkdir(path.join(root, "draft", "evidence"), { recursive: true });
    await writeFile(path.join(root, "draft", "evidence", "claim.md"), "# Claim\n\nSanitized supporting fact.\n");
    await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery\n\n- RULE-001: 用户可以查看当前状态。\n- Confirmed source: `evidence/claim.md#claim`\n"));
    const definitionArgs = ["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md"];
    if (bindEvidence) definitionArgs.push("--artifact", "draft/evidence/claim.md");
    definitionArgs.push("--evidence", "批准", "--actor-role", "product-owner");
    assert.equal(cli(definitionArgs).status, 0);
    assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
    assert.equal(cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
    return root;
  };

  const unboundRoot = await prepare("evidence-unbound", false);
  const rejected = cli(["freeze-candidate", "--root", unboundRoot, "--expect-revision", "4", "--candidate-id", "CAND-evidence-unbound-r1"]);
  assert.equal(rejected.status, 2, JSON.stringify(rejected));
  assert.equal(rejected.output.error.code, "candidate-reference");

  const boundRoot = await prepare("evidence-bound", true);
  const frozen = cli(["freeze-candidate", "--root", boundRoot, "--expect-revision", "4", "--candidate-id", "CAND-evidence-bound-r1"]);
  assert.equal(frozen.status, 0, JSON.stringify(frozen));
  const manifest = JSON.parse(await readFile(path.join(boundRoot, "candidates", "CAND-evidence-bound-r1", "MANIFEST.json"), "utf8"));
  assert.ok(manifest.files.some((record) => record.path === "evidence/claim.md"));
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

test("generated projection symlinks fail before transitions persist state", async (t) => {
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
  assert.equal(cli(["create-release", "--root", root, "--expect-revision", "7", "--release-id", "REL-drift-001"]).status, 0);
  await writeFile(path.join(root, "releases", "REL-drift-001", "delivery.md"), "release tamper\n");
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

});

test("stored replay applies stateful receipt bindings with integrity-class failure", async (t) => {
  const root = await throughDistributed(t);
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
  assert.equal(cli(["approve-preview", "--root", root, "--expect-revision", "10", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
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

test("Candidate copies only approval-bound files and excludes unrelated, exploratory, and failed Draft material", async (t) => {
  const root = await newRoot(t);
  cli(["init", "--root", root, "--delivery-id", "DEL-security", "--title", "Security", "--owner", "Owner", "--expect-revision", "0"]);
  await seedDraft(root);
  await cp(path.join(candidateRoot, "tests", "fixtures", "security", "prompt-injection.md"), path.join(root, "draft", "evidence.md"));
  cli(["approve-definition", "--root", root, "--expect-revision", "1", "--artifact", "draft/delivery.md", "--evidence", "批准", "--actor-role", "product-owner"]);
  cli(["approve-brief", "--root", root, "--expect-revision", "2", "--artifact", "draft/experience/brief.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  cli(["approve-preview", "--root", root, "--expect-revision", "3", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]);
  const fakeSecret = `sk-${"A".repeat(24)}`;
  await writeFile(path.join(root, "draft", "accidental-secret.txt"), fakeSecret);
  await mkdir(path.join(root, "draft", "exploration"), { recursive: true });
  await writeFile(path.join(root, "draft", "exploration", "discovery.pen"), "provisional\n");
  await writeFile(path.join(root, "draft", "experience", "failed-preview.png"), "failed\n");
  await writeFile(path.join(root, "draft", "bad:name.md"), "not portable to Windows\n");
  const frozen = cli(["freeze-candidate", "--root", root, "--expect-revision", "4", "--candidate-id", "CAND-security-r1"]);
  assert.equal(frozen.status, 0, JSON.stringify(frozen));
  const manifest = JSON.parse(await readFile(path.join(root, "candidates", "CAND-security-r1", "MANIFEST.json"), "utf8"));
  assert.equal(manifest.selection.mode, "approval-bound");
  assert.deepEqual(manifest.files.map((record) => record.path), [
    "delivery.md",
    "experience/brief.md",
    "experience/evidence.md",
    "experience/manifest.md",
  ]);
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

test("CHG archives optional acknowledged, accepted, and rejected receipt audit", async (t) => {
  for (const terminal of ["acknowledged", "accepted", "rejected"]) {
    const root = await throughDistributed(t);
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

test("CHG can start directly from a completed local Release without send or receipt", async (t) => {
  const root = await throughLocalRelease(t);
  await writeFile(path.join(root, "changes", "CHG-local-001.md"), "# Local change\n\nOwner requests an observable change.\n");
  const started = cli([
    "start-change", "--root", root, "--expect-revision", "8", "--change-id", "CHG-local-001",
    "--proposal", "changes/CHG-local-001.md", "--evidence", "批准从本地交付包开始下一轮", "--actor-role", "product-owner",
  ]);
  assert.equal(started.status, 0, JSON.stringify(started));
  assert.equal(started.output.state.phase, "definition");
  assert.equal(started.output.state.next_skill, "pm-definition");
  assert.equal(started.output.state.release_history[0].sending.status, "prepared");
  assert.equal(started.output.state.release_history[0].receipt.status, "pending");
});

test("CHG can start from attempted or sent-confirmed distribution without receipt", async (t) => {
  for (const sendStatus of ["attempted", "sent-confirmed"]) {
    const root = await throughLocalRelease(t);
    const sent = cli([
      "record-send", "--root", root, "--expect-revision", "8", "--send-status", sendStatus,
      "--channel", "manual", "--recipient", "开发负责人", "--external-ref", `send-${sendStatus}`,
      "--evidence", `真实发送状态 ${sendStatus}`,
    ]);
    assert.equal(sent.status, 0, JSON.stringify(sent));
    const changeId = `CHG-${sendStatus}`;
    await writeFile(path.join(root, "changes", `${changeId}.md`), `# ${changeId}\n`);
    const started = cli([
      "start-change", "--root", root, "--expect-revision", "9", "--change-id", changeId,
      "--proposal", `changes/${changeId}.md`, "--evidence", "批准下一轮", "--actor-role", "product-owner",
    ]);
    assert.equal(started.status, 0, JSON.stringify(started));
    assert.equal(started.output.state.release_history[0].sending.status, sendStatus);
    assert.equal(started.output.state.release_history[0].receipt.status, "pending");
  }
});

test("approved CHG round archives the prior delivery evidence, resets receipt, and rejects historical identity reuse", async (t) => {
  const root = await throughDistributed(t);
  await writeFile(path.join(root, "changes", "CHG-integration-001.md"), "# Change 001\n\nOwner proposes an observable behavior change.\n");
  const started = cli(["start-change", "--root", root, "--expect-revision", "10", "--change-id", "CHG-integration-001", "--proposal", "changes/CHG-integration-001.md", "--evidence", "批准开启变更轮次", "--actor-role", "product-owner"]);
  assert.equal(started.status, 0, JSON.stringify(started));
  assert.equal(started.output.state.phase, "definition");
  assert.equal(started.output.state.draft_revision, 2);
  assert.equal(started.output.state.release, null);
  assert.equal(started.output.state.sending.status, "not-prepared");
  assert.equal(started.output.state.receipt.status, "pending");
  assert.equal(started.output.state.release_history[0].release_id, "REL-integration-001");
  assert.equal(started.output.state.release_history[0].receipt.status, "acknowledged");
  assert.equal(started.output.state.active_change.change_id, "CHG-integration-001");
  await writeFile(path.join(root, "draft", "delivery.md"), withDefinitionExperience("# Delivery revision 2\n\n- RULE-001: 用户可以查看变更后的状态。\n"));
  assert.equal(cli(["approve-definition", "--root", root, "--expect-revision", "11", "--artifact", "draft/delivery.md", "--evidence", "批准变更后的定义", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["approve-brief", "--root", root, "--expect-revision", "12", "--artifact", "draft/experience/brief.md", "--evidence", "批准变更 Brief", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["approve-preview", "--root", root, "--expect-revision", "13", "--artifact", "draft/experience/evidence.md", "--artifact", "draft/experience/manifest.md", "--evidence", "批准", "--experience-route", "not-needed", "--actor-role", "product-owner"]).status, 0);
  assert.equal(cli(["freeze-candidate", "--root", root, "--expect-revision", "14", "--candidate-id", "CAND-integration-r2"]).status, 0);
  const candidateManifest = JSON.parse(await readFile(path.join(root, "candidates", "CAND-integration-r2", "MANIFEST.json"), "utf8"));
  assert.equal(candidateManifest.source.change_id, "CHG-integration-001");
  await writeFile(path.join(root, "reviews", "review-change.md"), "# Change Review\n");
  assert.equal(cli(["record-review", "--root", root, "--expect-revision", "15", "--review-id", "REV-integration-02", "--report", "reviews/review-change.md", "--review-mode", "self-check", "--outcome", "passed", "--source-session", "session-change", "--review-session", "session-change", "--source-model", "model-a", "--review-model", "model-a", "--actor-role", "reviewer"]).status, 0);
  assert.equal(cli(["confirm-handoff", "--root", root, "--expect-revision", "16", "--evidence", "确认交付变更版本", "--actor-role", "product-owner"]).status, 0);
  const reusedReleaseCase = cli(["create-release", "--root", root, "--expect-revision", "17", "--release-id", "rel-INTEGRATION-001"]);
  assert.equal(reusedReleaseCase.status, 2);
  assert.equal(reusedReleaseCase.output.error.code, "identity-reuse");
  assert.equal(cli(["create-release", "--root", root, "--expect-revision", "17", "--release-id", "REL-integration-002"]).status, 0);
  assert.equal(cli(["status", "--root", root]).output.state.receipt.status, "pending");
  const releaseManifest = JSON.parse(await readFile(path.join(root, "releases", "REL-integration-002", "MANIFEST.json"), "utf8"));
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
  assert.equal(status.output.state.release_history[0].release_id, "REL-integration-001");
  assert.equal(status.output.state.release_history[1].release_id, "REL-integration-002");
  assert.equal(status.output.state.active_change.change_id, "CHG-integration-002");

  await writeFile(path.join(root, "candidates", "CAND-integration-r1", "delivery.md"), "historical candidate drift\n");
  await writeFile(path.join(root, "reviews", "review-01.md"), "historical review drift\n");
  await writeFile(path.join(root, "releases", "REL-integration-001", "delivery.md"), "historical release drift\n");
  await writeFile(path.join(root, "changes", "CHG-integration-001.md"), "historical change drift\n");
  const historical = cli(["validate", "--root", root]);
  assert.equal(historical.status, 5);
  const scopes = JSON.stringify(historical.output.error.details.integrity);
  for (const scope of ["candidate-history:CAND-integration-r1", "review-history:REV-integration-01", "release-history:REL-integration-001", "change-history:CHG-integration-001"]) assert.match(scopes, new RegExp(scope));
  const eventCount = (await readdir(path.join(root, "events"))).length;
  const blockedTransition = cli(["approve-definition", "--root", root, "--expect-revision", "21", "--artifact", "draft/delivery.md", "--evidence", "不能越过历史漂移", "--actor-role", "product-owner"]);
  assert.equal(blockedTransition.status, 5);
  assert.equal(blockedTransition.output.error.code, "integrity");
  assert.equal((await readdir(path.join(root, "events"))).length, eventCount);
});

test("init refuses a non-empty unsupported-format root", async (t) => {
  const root = await newRoot(t, "non-empty-");
  await writeFile(path.join(root, "START-HERE.md"), "legacy\n");
  const result = cli(["init", "--root", root, "--delivery-id", "DEL-non-empty", "--title", "Legacy", "--owner", "Owner", "--expect-revision", "0"]);
  assert.equal(result.status, 3, JSON.stringify(result));
  assert.equal(result.output.error.code, "root-not-empty");
  assert.deepEqual(await readdir(root), ["START-HERE.md"]);
  assert.equal(await readFile(path.join(root, "START-HERE.md"), "utf8"), "legacy\n");
});

test("schema/runtime 3.x stored events fail closed under the single 4.0.0 contract", async (t) => {
  for (const [field, value, originalCode] of [["schema_version", 3, "schema-version"], ["runtime_version", "3.0.0", "runtime-version"]]) {
    const root = await newRoot(t, `old-${field}-`);
    const deliveryId = `DEL-old-${field.replaceAll("_", "-")}`;
    assert.equal(cli(["init", "--root", root, "--delivery-id", deliveryId, "--title", "Old format", "--owner", "Owner", "--expect-revision", "0"]).status, 0);
    const eventPath = path.join(root, "events", "000001-created.json");
    const event = JSON.parse(await readFile(eventPath, "utf8"));
    event[field] = value;
    await writeFile(eventPath, `${JSON.stringify(event, null, 2)}\n`);
    const result = cli(["status", "--root", root]);
    assert.equal(result.status, 5, JSON.stringify(result));
    assert.equal(result.output.error.code, "stored-event-invalid");
    assert.equal(result.output.error.details.original_code, originalCode);
  }
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
