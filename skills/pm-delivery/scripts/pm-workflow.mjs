#!/usr/bin/env node

import { constants as fsConstants } from "node:fs";
import {
  copyFile,
  link,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  unlink,
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const RUNTIME_VERSION = "4.0.0";
export const SCHEMA_VERSION = 4;
export const MINIMUM_NODE_MAJOR = 20;

export const EXIT = Object.freeze({
  OK: 0,
  INVALID: 2,
  CONFLICT: 3,
  UNAVAILABLE: 4,
  INTEGRITY: 5,
});

const EVENT_TYPES = Object.freeze([
  "created",
  "brainstorm-patch-recorded",
  "definition-approved",
  "brief-approved",
  "preview-approved",
  "draft-revision-started",
  "candidate-frozen",
  "review-recorded",
  "finding-resolution-recorded",
  "handoff-confirmed",
  "release-created",
  "send-recorded",
  "receipt-recorded",
  "change-started",
]);

const EVENT_PAYLOAD_KEYS = Object.freeze({
  created: ["title", "owner"],
  "brainstorm-patch-recorded": ["base_draft_revision", "decision_locator", "patch_path"],
  "definition-approved": ["approval_evidence"],
  "brief-approved": ["approval_evidence", "experience_route"],
  "preview-approved": ["approval_evidence", "experience_route"],
  "draft-revision-started": ["return_phase", "revision_evidence"],
  "candidate-frozen": ["candidate_id", "candidate_path", "manifest_sha256", "draft_revision"],
  "review-recorded": [
    "review_id",
    "review_path",
    "review_mode",
    "outcome",
    "candidate_id",
    "candidate_manifest_sha256",
    "source_session_id",
    "review_session_id",
    "source_model",
    "review_model",
    "finding_ids",
  ],
  "finding-resolution-recorded": ["finding_id", "disposition", "return_phase", "resolution_evidence"],
  "handoff-confirmed": ["confirmation_evidence", "candidate_id", "candidate_manifest_sha256"],
  "release-created": ["release_id", "release_path", "manifest_sha256", "candidate_id", "candidate_manifest_sha256", "review_id", "review_report_sha256", "change_id"],
  "send-recorded": ["send_status", "channel", "recipient", "external_reference", "send_evidence"],
  "receipt-recorded": ["receipt_status", "recipient", "external_reference", "receipt_evidence"],
  "change-started": ["change_id", "change_path", "approval_evidence", "release_id", "release_manifest_sha256"],
});

const TOP_EVENT_KEYS = Object.freeze([
  "schema_version",
  "runtime_version",
  "delivery_id",
  "revision",
  "event_id",
  "type",
  "occurred_at",
  "actor",
  "expected_previous_revision",
  "previous_event_sha256",
  "artifacts",
  "payload",
]);

const ACTOR_KEYS = Object.freeze(["role", "label"]);
const ARTIFACT_KEYS = Object.freeze(["path", "sha256"]);
const REVIEW_MODES = Object.freeze(["self-check", "isolated-same-model", "independent-model", "human"]);
const REVIEW_OUTCOMES = Object.freeze(["passed", "findings-open", "accepted-risk"]);
const RECEIPT_STATUSES = Object.freeze(["acknowledged", "accepted", "rejected"]);
const CONTROLLED_DIRECTORIES = Object.freeze(["events", "source", "draft", "candidates", "reviews", "releases", "changes"]);
const SECRET_PATTERNS = Object.freeze([
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{16,}\b/g,
  /\bAKIA[A-Z0-9]{16}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\b(?:password|passwd|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^\s,;]{8,}/gi,
]);

const COMMAND_FLAGS = Object.freeze({
  init: ["root", "delivery-id", "title", "owner", "expect-revision", "actor-role", "actor-label", "json"],
  status: ["root", "json"],
  next: ["root", "json"],
  validate: ["root", "json"],
  render: ["root", "expect-revision", "json"],
  reconcile: ["root", "check", "expect-revision", "json"],
  doctor: ["root", "json"],
  "record-brainstorm-patch": [
    "root", "expect-revision", "patch", "base-revision", "decision-locator", "actor-role", "actor-label", "json",
  ],
  "approve-definition": ["root", "expect-revision", "artifact", "evidence", "actor-role", "actor-label", "json"],
  "approve-brief": [
    "root", "expect-revision", "artifact", "evidence", "experience-route", "actor-role", "actor-label", "json",
  ],
  "approve-preview": [
    "root", "expect-revision", "artifact", "evidence", "experience-route", "actor-role", "actor-label", "json",
  ],
  "start-draft-revision": [
    "root", "expect-revision", "return-phase", "artifact", "evidence", "actor-role", "actor-label", "json",
  ],
  "freeze-candidate": ["root", "expect-revision", "candidate-id", "actor-role", "actor-label", "json"],
  "record-review": [
    "root", "expect-revision", "review-id", "report", "review-mode", "outcome", "finding-id",
    "source-session", "review-session", "source-model", "review-model", "actor-role", "actor-label", "json",
  ],
  "record-finding-resolution": [
    "root", "expect-revision", "finding-id", "disposition", "return-phase", "artifact", "evidence",
    "actor-role", "actor-label", "json",
  ],
  "confirm-handoff": ["root", "expect-revision", "evidence", "actor-role", "actor-label", "json"],
  "create-release": ["root", "expect-revision", "release-id", "actor-role", "actor-label", "json"],
  "record-send": [
    "root", "expect-revision", "send-status", "channel", "recipient", "external-ref", "evidence",
    "actor-role", "actor-label", "json",
  ],
  "record-receipt": [
    "root", "expect-revision", "receipt-status", "recipient", "external-ref", "evidence",
    "actor-role", "actor-label", "json",
  ],
  "start-change": [
    "root", "expect-revision", "change-id", "proposal", "evidence", "actor-role", "actor-label", "json",
  ],
  help: ["json"],
});

const MULTI_FLAGS = new Set(["artifact", "finding-id"]);
const BOOLEAN_FLAGS = new Set(["json", "check"]);

export class WorkflowError extends Error {
  constructor(message, { exitCode = EXIT.INVALID, code = "invalid", details = undefined } = {}) {
    super(message);
    this.name = "WorkflowError";
    this.exitCode = exitCode;
    this.code = code;
    this.details = details;
  }
}

function fail(message, options) {
  throw new WorkflowError(message, options);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function assertExactKeys(value, allowed, label) {
  if (!isPlainObject(value)) fail(`${label} 必须是普通对象。`);
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) fail(`${label} 含未知字段：${unknown.join(", ")}`);
  const missing = allowed.filter((key) => !Object.hasOwn(value, key));
  if (missing.length) fail(`${label} 缺少字段：${missing.join(", ")}`);
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} 必须是非空字符串。`);
  return value.trim();
}

function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) fail(`${label} 必须是 ${allowed.join(" | ")} 之一。`);
  return value;
}

function assertSha(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) fail(`${label} 不是有效 SHA-256。`, { exitCode: EXIT.INTEGRITY, code: "integrity" });
  return value;
}

function assertIdentifier(value, prefix, label) {
  const result = assertNonEmptyString(value, label);
  const expression = new RegExp(`^${prefix}[a-z0-9][a-z0-9-]{0,79}$`, "i");
  if (!expression.test(result)) fail(`${label} 必须以 ${prefix} 开头，仅含字母、数字和连字符。`);
  return result;
}

function samePortableIdentity(left, right) {
  return typeof left === "string" && typeof right === "string" && left.toLocaleLowerCase("en-US") === right.toLocaleLowerCase("en-US");
}

function portablePathKey(value) {
  return value.normalize("NFC").toLocaleLowerCase("en-US");
}

function samePortablePath(left, right) {
  return typeof left === "string" && typeof right === "string"
    && portablePathKey(left) === portablePathKey(right);
}

function assertPortablePathSegment(segment, label) {
  const portableStem = segment.replace(/\..*$/, "").toUpperCase();
  if (/[<>:"\\|?*\u0000-\u001F]/.test(segment) || /[ .]$/.test(segment) || /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(portableStem)) {
    fail(`${label} 含 Windows/macOS/Linux 不可移植路径组件：${segment}`, { code: "non-portable-path" });
  }
}

function normalizeDecisionLocator(value) {
  const locator = assertNonEmptyString(value, "decision_locator");
  const match = locator.match(/^(.+\.md)#(DEC-[A-Za-z0-9-]+)$/);
  if (!match) fail("Decision locator 必须是 bundle-relative .md#DEC-*。");
  const file = normalizeRelative(match[1], "decision_locator path");
  return `${file}#${match[2]}`;
}

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
}

export function stableJson(value, pretty = false) {
  return `${JSON.stringify(sorted(value), null, pretty ? 2 : 0)}${pretty ? "\n" : ""}`;
}

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(filePath) {
  return sha256Bytes(await readFile(filePath));
}

function assertNoSecrets(value, label = "输入") {
  const text = typeof value === "string" ? value : stableJson(value);
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) fail(`${label} 疑似包含凭证或敏感秘密；请先脱敏。`, { code: "sensitive-data" });
  }
}

export function normalizeRelative(input, label = "路径") {
  const raw = assertNonEmptyString(input, label);
  if (raw.includes("\0")) fail(`${label} 含 NUL。`);
  const slash = raw.replaceAll("\\", "/");
  if (path.posix.isAbsolute(slash) || /^[A-Za-z]:\//.test(slash)) fail(`${label} 必须是 Delivery 内相对路径。`);
  const normalized = path.posix.normalize(slash);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) fail(`${label} 不能离开 Delivery 根目录。`);
  const relative = normalized.replace(/^\.\//, "");
  for (const segment of relative.split("/")) assertPortablePathSegment(segment, label);
  return relative;
}

async function rootRealPath(root) {
  const absolute = path.resolve(assertNonEmptyString(root, "--root"));
  try {
    const inputMetadata = await lstat(absolute);
    if (inputMetadata.isSymbolicLink()) fail(`Delivery 根路径不能是符号链接：${absolute}`, { exitCode: EXIT.INTEGRITY, code: "path-symlink" });
    if (!inputMetadata.isDirectory()) fail(`Delivery 根路径不是目录：${absolute}`, { code: "invalid-root" });
    const resolved = await realpath(absolute);
    return resolved;
  } catch (error) {
    if (error?.code === "ENOENT") fail(`Delivery 根目录不存在：${absolute}`, { code: "missing-root" });
    throw error;
  }
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function lstatOrNull(target) {
  try {
    return await lstat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function validateControlledDirectories(root, { requireAll = false } = {}) {
  for (const name of CONTROLLED_DIRECTORIES) {
    const target = path.join(root, name);
    const metadata = await lstatOrNull(target);
    if (!metadata) {
      if (requireAll) fail(`缺少受控目录：${name}/`, { exitCode: EXIT.INTEGRITY, code: "controlled-directory" });
      continue;
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      fail(`受控路径必须是真实目录且不能是符号链接：${name}/`, { exitCode: EXIT.INTEGRITY, code: "controlled-directory" });
    }
    const actual = await realpath(target);
    if (!isInside(root, actual)) fail(`受控目录解析越界：${name}/`, { exitCode: EXIT.INTEGRITY, code: "controlled-directory" });
  }
}

async function resolveInside(root, relativeInput, { mustExist = true, expectedType = undefined } = {}) {
  const rel = normalizeRelative(relativeInput);
  const segments = rel.split("/");
  const target = path.resolve(root, ...segments);
  if (!isInside(root, target)) fail(`路径越界：${relativeInput}`, { code: "path-traversal" });
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    const metadata = await lstatOrNull(current);
    const last = index === segments.length - 1;
    if (!metadata) {
      if (!mustExist && last) {
        const parent = await realpath(path.dirname(current));
        if (!isInside(root, parent)) fail(`目标父目录解析越界：${rel}`, { code: "path-traversal" });
        return { rel, target };
      }
      fail(`文件不存在：${rel}`, { code: "missing-artifact" });
    }
    if (metadata.isSymbolicLink()) fail(`Delivery 受控路径不允许符号链接：${rel}`, { exitCode: EXIT.INTEGRITY, code: "path-symlink" });
    if (!last && !metadata.isDirectory()) fail(`路径组件不是目录：${segments.slice(0, index + 1).join("/")}`, { code: "path-type" });
    if (last && expectedType === "file" && !metadata.isFile()) fail(`路径不是普通文件：${rel}`, { code: "path-type" });
    if (last && expectedType === "directory" && !metadata.isDirectory()) fail(`路径不是目录：${rel}`, { code: "path-type" });
  }
  const actual = await realpath(target);
  if (!isInside(root, actual)) fail(`路径解析越界：${rel}`, { code: "path-traversal" });
  return { rel, target };
}

async function atomicWrite(filePath, content) {
  const temp = `${filePath}.tmp-${randomUUID()}`;
  const handle = await open(temp, "wx", 0o600);
  try {
    await handle.writeFile(content);
    try { await handle.sync(); } catch {}
  } finally {
    await handle.close();
  }
  try {
    await rename(temp, filePath);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

async function writeExclusiveComplete(filePath, content) {
  const temp = `${filePath}.tmp-${randomUUID()}`;
  const handle = await open(temp, "wx", 0o600);
  try {
    await handle.writeFile(content);
    try { await handle.sync(); } catch {}
  } finally {
    await handle.close();
  }
  try {
    await link(temp, filePath);
  } finally {
    await rm(temp, { force: true });
  }
}

async function pathExistsInside(root, relativeInput) {
  const rel = normalizeRelative(relativeInput);
  const target = path.resolve(root, ...rel.split("/"));
  const metadata = await lstatOrNull(target);
  if (!metadata) {
    await resolveInside(root, rel, { mustExist: false });
    return false;
  }
  await resolveInside(root, rel);
  return true;
}

async function writablePathInside(root, relativeInput) {
  const rel = normalizeRelative(relativeInput);
  const target = path.resolve(root, ...rel.split("/"));
  const metadata = await lstatOrNull(target);
  return resolveInside(root, rel, { mustExist: Boolean(metadata), expectedType: metadata ? "file" : undefined });
}

function eventFileName(event) {
  return `${String(event.revision).padStart(6, "0")}-${event.type}.json`;
}

function eventHash(content) {
  return sha256Bytes(content);
}

function parseInteger(value, label) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) fail(`${label} 必须是非负整数。`);
  return Number(value);
}

export function parseArgs(argv) {
  const leadingHelpAlias = argv[0] === "--help" || argv[0] === "-h";
  const normalizedArgv = leadingHelpAlias ? ["help", ...argv.slice(1)] : argv;
  const [commandRaw, ...rest] = normalizedArgv;
  const command = commandRaw ?? "help";
  const allowed = COMMAND_FLAGS[command];
  if (!allowed) fail(`未知命令：${command}`, { code: "unknown-command" });
  const helpTokens = rest.filter((token) => token === "--help" || token === "-h");
  if (helpTokens.length) {
    if (helpTokens.length + Number(leadingHelpAlias) > 1) fail("--help/-h 不能重复。");
    const jsonCount = rest.filter((token) => token === "--json").length;
    if (jsonCount > 1) fail("--json 不能重复。");
    const unexpected = rest.filter((token) => !["--help", "-h", "--json"].includes(token));
    if (unexpected.length) fail(`${command} help 只接受 --json，不能与执行参数同时使用。`);
    return {
      command: "help",
      options: {
        ...(command === "help" ? {} : { targetCommand: command }),
        ...(jsonCount ? { json: true } : {}),
      },
    };
  }
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--") || token === "--") fail(`不接受位置参数：${token}`);
    const key = token.slice(2);
    if (!allowed.includes(key)) fail(`${command} 不接受 --${key}。`, { code: "unknown-option" });
    if (BOOLEAN_FLAGS.has(key)) {
      if (Object.hasOwn(options, key)) fail(`--${key} 不能重复。`);
      options[key] = true;
      continue;
    }
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`--${key} 缺少值。`);
    index += 1;
    if (MULTI_FLAGS.has(key)) {
      options[key] = [...(options[key] ?? []), value];
    } else {
      if (Object.hasOwn(options, key)) fail(`--${key} 不能重复。`);
      options[key] = value;
    }
  }
  return { command, options };
}

function requireOption(options, key) {
  if (!Object.hasOwn(options, key)) fail(`缺少 --${key}。`);
  return options[key];
}

function actorFrom(options) {
  const role = options["actor-role"] ?? "pm-agent";
  const label = options["actor-label"] ?? (role === "product-owner" ? "产品负责人" : "PM Agent");
  assertNonEmptyString(role, "actor role");
  assertNonEmptyString(label, "actor label");
  assertNoSecrets({ role, label }, "actor");
  return { role, label };
}

function expectedRevision(options) {
  return parseInteger(requireOption(options, "expect-revision"), "--expect-revision");
}

function approvalEvidence(options) {
  const evidence = assertNonEmptyString(requireOption(options, "evidence"), "--evidence");
  assertNoSecrets(evidence, "批准证据");
  return evidence;
}

function artifactsFromEvent(event) {
  return event.artifacts.map((artifact) => ({ ...artifact, event_id: event.event_id }));
}

export function initialState(deliveryId) {
  return {
    schema_version: SCHEMA_VERSION,
    runtime_version: RUNTIME_VERSION,
    delivery_id: deliveryId,
    revision: 0,
    last_event_id: null,
    last_event_sha256: null,
    title: null,
    owner: null,
    phase: "uninitialized",
    status: "blocked",
    blocker: "尚未初始化",
    next_skill: "pm-delivery",
    next_action: "初始化 Delivery",
    draft_revision: 1,
    approvals: { definition: null, brief: null, preview: null },
    experience_route: null,
    last_brainstorm_patch: null,
    candidate: null,
    candidate_history: [],
    review: null,
    review_history: [],
    findings: {},
    handoff: null,
    release: null,
    release_history: [],
    sending: { status: "not-prepared", attempts: [] },
    receipt: { status: "pending", records: [] },
    active_change: null,
    change_history: [],
  };
}

function assertReducer(condition, message, code = "illegal-transition") {
  if (!condition) fail(message, { code });
}

function approvalRecord(event) {
  return {
    event_id: event.event_id,
    evidence: event.payload.approval_evidence,
    actor: event.actor,
    occurred_at: event.occurred_at,
    artifacts: artifactsFromEvent(event),
  };
}

function resetDeliveryEvidence(state) {
  state.sending = { status: "not-prepared", attempts: [] };
  state.receipt = { status: "pending", records: [] };
}

function archiveCurrentReleaseRound(state) {
  if (!state.release) return;
  state.release_history.push({
    ...state.release,
    sending: structuredClone(state.sending),
    receipt: structuredClone(state.receipt),
  });
  state.release = null;
  resetDeliveryEvidence(state);
}

function resetDownstream(state) {
  if (state.candidate) state.candidate_history.push(state.candidate);
  if (state.review) state.review_history.push(state.review);
  state.approvals.brief = null;
  state.approvals.preview = null;
  state.experience_route = null;
  state.candidate = null;
  state.review = null;
  state.findings = {};
  state.handoff = null;
}

export function reduceEvent(previousState, event) {
  validateEventContract(event, previousState);
  const state = structuredClone(previousState);
  assertReducer(event.delivery_id === state.delivery_id, "事件 Delivery ID 不一致。", "delivery-id-mismatch");
  assertReducer(event.revision === state.revision + 1, "事件 revision 不连续。", "revision-gap");
  switch (event.type) {
    case "created": {
      assertReducer(state.revision === 0, "created 只能是首个事件。");
      state.title = event.payload.title;
      state.owner = event.payload.owner;
      state.phase = "definition";
      state.status = "ready";
      state.blocker = "none";
      state.next_skill = "pm-definition";
      state.next_action = "完成当前范围的产品定义并请负责人确认";
      break;
    }
    case "brainstorm-patch-recorded": {
      assertReducer(state.phase === "definition", "Decision Patch 只能回到 Definition。");
      state.last_brainstorm_patch = {
        event_id: event.event_id,
        path: event.payload.patch_path,
        decision_locator: event.payload.decision_locator,
        base_draft_revision: event.payload.base_draft_revision,
        artifacts: artifactsFromEvent(event),
      };
      state.status = "blocked";
      state.blocker = "Decision Patch 等待 Definition owner 合并";
      state.next_skill = "pm-definition";
      state.next_action = "核对并合并当前 revision 的 Decision Patch";
      break;
    }
    case "definition-approved": {
      assertReducer(!state.release || Boolean(state.active_change), "已有 Release 的 Delivery 不能直接重批 Definition；先建立 CHG 变更轮次。");
      assertReducer(state.phase === "definition", "Definition 批准只允许在 Definition 阶段记录。");
      resetDownstream(state);
      state.approvals.definition = approvalRecord(event);
      state.phase = "experience";
      state.status = "ready";
      state.blocker = "none";
      state.next_skill = "pm-experience";
      state.next_action = "确定 Experience 路线并形成 Brief";
      break;
    }
    case "brief-approved": {
      assertReducer(state.phase === "experience", "Experience Brief 只允许在 Experience 阶段批准。");
      assertReducer(Boolean(state.approvals.definition), "缺少 Definition approval。");
      state.approvals.brief = approvalRecord(event);
      state.approvals.preview = null;
      state.experience_route = event.payload.experience_route;
      state.status = "blocked";
      state.blocker = event.payload.experience_route === "pen" ? "等待 Pen 保存、回读、导出并展示预览" : "等待负责人确认当前 Experience 证据";
      state.next_skill = "pm-experience";
      state.next_action = event.payload.experience_route === "pen" ? "按批准的 functional wireflow Brief 直接使用 Pen 完成功能原型、回读并展示预览" : "展示独立路线证据并取得明确确认";
      break;
    }
    case "preview-approved": {
      assertReducer(state.phase === "experience", "Preview/Experience 批准只允许在 Experience 阶段记录。");
      assertReducer(Boolean(state.approvals.brief), "缺少 Experience Brief approval。");
      state.approvals.preview = approvalRecord(event);
      state.status = "ready";
      state.blocker = "none";
      state.next_skill = "pm-experience";
      state.next_action = "冻结当前 Draft 为新的不可变 Candidate";
      break;
    }
    case "draft-revision-started": {
      assertReducer(state.phase === "experience", "Candidate 前修订只能从 Experience 阶段开始。");
      assertReducer(!state.candidate && !state.review, "已有 Candidate/Review 必须使用 Finding 修订路径。");
      state.draft_revision += 1;
      if (event.payload.return_phase === "definition") state.approvals.definition = null;
      state.approvals.brief = null;
      state.approvals.preview = null;
      state.experience_route = null;
      state.phase = event.payload.return_phase;
      state.status = "blocked";
      state.blocker = "Candidate 前反馈已开启新的 Draft revision；旧的下游批准已失效";
      state.next_skill = event.payload.return_phase === "definition" ? "pm-definition" : "pm-experience";
      state.next_action = event.payload.return_phase === "definition" ? "核对修订后的 Definition 并重新批准" : "核对修订后的 Experience Brief 并重新批准";
      break;
    }
    case "candidate-frozen": {
      assertReducer(state.phase === "experience", "Candidate 只能从 Experience 阶段冻结；已有 Candidate 必须先走修订与重批路径。");
      assertReducer(Boolean(state.approvals.definition && state.approvals.brief && state.approvals.preview), "批准链不完整，不能冻结 Candidate。");
      state.candidate = {
        candidate_id: event.payload.candidate_id,
        path: event.payload.candidate_path,
        manifest_sha256: event.payload.manifest_sha256,
        draft_revision: event.payload.draft_revision,
        event_id: event.event_id,
        source: {
          draft_revision: state.draft_revision,
          definition_approval_event: state.approvals.definition?.event_id,
          brief_approval_event: state.approvals.brief?.event_id,
          preview_approval_event: state.approvals.preview?.event_id,
          change_id: state.active_change?.change_id ?? null,
          change_event: state.active_change?.event_id ?? null,
        },
      };
      state.review = null;
      state.findings = {};
      state.handoff = null;
      state.phase = "candidate";
      state.status = "ready";
      state.blocker = "none";
      state.next_skill = "pm-reverse-review";
      state.next_action = "按当前 Candidate hash 执行诚实标注模式的 Review";
      break;
    }
    case "review-recorded": {
      assertReducer(state.phase === "candidate" || state.phase === "review", "Review 只能绑定当前 Candidate。");
      assertReducer(Boolean(state.candidate), "没有当前 Candidate。");
      if (state.review) state.review_history.push(state.review);
      state.review = {
        review_id: event.payload.review_id,
        path: event.payload.review_path,
        mode: event.payload.review_mode,
        outcome: event.payload.outcome,
        candidate_id: event.payload.candidate_id,
        candidate_manifest_sha256: event.payload.candidate_manifest_sha256,
        event_id: event.event_id,
        artifacts: artifactsFromEvent(event),
      };
      state.findings = Object.fromEntries(event.payload.finding_ids.map((id) => [id, { status: "open", review_id: event.payload.review_id }]));
      state.phase = "handoff";
      state.status = event.payload.outcome === "findings-open" ? "blocked" : "ready";
      state.blocker = event.payload.outcome === "findings-open" ? "Review Finding 尚未处置" : "none";
      state.next_skill = "pm-handoff";
      state.next_action = event.payload.outcome === "findings-open" ? "逐项记录负责人处置或返回修订" : "展示交付范围并取得明确开发交付确认";
      break;
    }
    case "finding-resolution-recorded": {
      assertReducer(Boolean(state.review), "没有当前 Review。");
      assertReducer(Boolean(state.findings[event.payload.finding_id]), "Finding 不属于当前 Review。");
      assertReducer(state.findings[event.payload.finding_id].status === "open", "Finding 已处置，不能重复覆盖。");
      state.findings[event.payload.finding_id] = {
        ...state.findings[event.payload.finding_id],
        status: event.payload.disposition,
        evidence: event.payload.resolution_evidence,
        event_id: event.event_id,
      };
      if (event.payload.disposition === "corrected") {
        state.review_history.push(state.review);
        state.review = null;
        state.candidate_history.push(state.candidate);
        state.candidate = null;
        state.handoff = null;
        state.draft_revision += 1;
        if (event.payload.return_phase === "definition") state.approvals.definition = null;
        state.approvals.brief = null;
        state.approvals.preview = null;
        state.experience_route = null;
        state.phase = event.payload.return_phase;
        state.status = "blocked";
        state.blocker = "Draft 已修订；旧 Candidate 与 Review 已失效";
        state.next_skill = event.payload.return_phase === "definition" ? "pm-definition" : "pm-experience";
        state.next_action = event.payload.return_phase === "definition" ? "核对修订后的 Definition 并重新批准" : "核对 Experience 修订并重新取得 Brief/preview 批准";
      } else {
        const unresolved = Object.values(state.findings).some((finding) => finding.status === "open");
        if (!unresolved) {
          state.review.outcome = Object.values(state.findings).some((finding) => finding.status === "accepted-risk") ? "accepted-risk" : "passed";
          state.status = "ready";
          state.blocker = "none";
          state.next_action = "展示保留风险并取得明确开发交付确认";
        }
      }
      break;
    }
    case "handoff-confirmed": {
      assertReducer(state.phase === "handoff", "交付确认只允许在 Handoff 阶段。");
      assertReducer(Boolean(state.candidate && state.review), "交付确认要求当前 Candidate 与 Review。");
      assertReducer(["passed", "accepted-risk"].includes(state.review.outcome), "Review 尚未达到 passed 或 accepted-risk。");
      state.handoff = {
        event_id: event.event_id,
        evidence: event.payload.confirmation_evidence,
        actor: event.actor,
        candidate_id: event.payload.candidate_id,
        candidate_manifest_sha256: event.payload.candidate_manifest_sha256,
      };
      state.phase = "release";
      state.status = "ready";
      state.blocker = "none";
      state.next_skill = "pm-handoff";
      state.next_action = "从已确认 Candidate 创建不可变 Release";
      break;
    }
    case "release-created": {
      assertReducer(state.phase === "release", "Release 只能在 Release 阶段创建。");
      assertReducer(Boolean(state.handoff && state.candidate), "缺少 Handoff confirmation 或 Candidate。");
      archiveCurrentReleaseRound(state);
      state.release = {
        release_id: event.payload.release_id,
        path: event.payload.release_path,
        manifest_sha256: event.payload.manifest_sha256,
        candidate_id: event.payload.candidate_id,
        candidate_manifest_sha256: event.payload.candidate_manifest_sha256,
        review_id: event.payload.review_id,
        review_report_sha256: event.payload.review_report_sha256,
        handoff_event: state.handoff.event_id,
        change_id: event.payload.change_id,
        event_id: event.event_id,
      };
      if (state.active_change) {
        state.active_change.resulting_release_id = event.payload.release_id;
        state.active_change.resulting_release_event = event.event_id;
      }
      state.sending = { status: "prepared", attempts: [] };
      state.receipt = { status: "pending", records: [] };
      state.phase = "complete";
      state.status = "complete";
      state.blocker = "none";
      state.next_skill = "none";
      state.next_action = "停止；本地开发交付已完成，外发记录仅在明确需要时追加";
      break;
    }
    case "send-recorded": {
      assertReducer(Boolean(state.release), "没有已准备的 Release。");
      assertReducer(["prepared", "attempted"].includes(state.sending.status), "当前发送状态不允许再次记录该动作。");
      const attempt = {
        event_id: event.event_id,
        status: event.payload.send_status,
        channel: event.payload.channel,
        recipient: event.payload.recipient,
        external_reference: event.payload.external_reference,
        evidence: event.payload.send_evidence,
        occurred_at: event.occurred_at,
      };
      state.sending.attempts.push(attempt);
      state.sending.status = event.payload.send_status;
      state.phase = "complete";
      state.status = "complete";
      state.blocker = "none";
      state.next_skill = "none";
      state.next_action = "停止；本地交付保持完成，可按明确请求继续记录真实外发证据";
      break;
    }
    case "receipt-recorded": {
      assertReducer(state.sending.status === "sent-confirmed", "只有 sent-confirmed 后才能记录 receipt。");
      if (state.receipt.records.length) {
        const previous = state.receipt.status;
        assertReducer(previous === "acknowledged" && ["accepted", "rejected"].includes(event.payload.receipt_status), "Receipt 终态不能被覆盖。");
      }
      state.receipt.records.push({
        event_id: event.event_id,
        status: event.payload.receipt_status,
        recipient: event.payload.recipient,
        external_reference: event.payload.external_reference,
        evidence: event.payload.receipt_evidence,
        occurred_at: event.occurred_at,
      });
      state.receipt.status = event.payload.receipt_status;
      state.phase = "complete";
      state.status = "complete";
      state.blocker = "none";
      state.next_skill = "none";
      state.next_action = "停止；本地交付保持完成，acknowledged 可按真实外部结论补记 accepted 或 rejected";
      break;
    }
    case "change-started": {
      assertReducer(state.phase === "complete", "CHG 变更轮次只能从已完成的本地 Release 开始。");
      assertReducer(Boolean(state.release), "CHG 变更轮次缺少当前 Release。");
      if (state.active_change) state.change_history.push(state.active_change);
      archiveCurrentReleaseRound(state);
      resetDownstream(state);
      state.approvals.definition = null;
      state.last_brainstorm_patch = null;
      state.draft_revision += 1;
      state.active_change = {
        change_id: event.payload.change_id,
        path: event.payload.change_path,
        approval_evidence: event.payload.approval_evidence,
        baseline_release_id: event.payload.release_id,
        baseline_release_manifest_sha256: event.payload.release_manifest_sha256,
        event_id: event.event_id,
        artifacts: artifactsFromEvent(event),
      };
      state.phase = "definition";
      state.status = "ready";
      state.blocker = "none";
      state.next_skill = "pm-definition";
      state.next_action = "按已批准 CHG 提案定义新的 Draft revision";
      break;
    }
    default:
      fail(`Reducer 未覆盖事件：${event.type}`, { exitCode: EXIT.INTEGRITY, code: "unknown-event" });
  }
  state.revision = event.revision;
  state.last_event_id = event.event_id;
  return state;
}

export function decodeEvent(value) {
  assertExactKeys(value, TOP_EVENT_KEYS, "事件");
  if (value.schema_version !== SCHEMA_VERSION) fail(`不支持 schema_version=${value.schema_version}`, { exitCode: EXIT.INTEGRITY, code: "schema-version" });
  if (value.runtime_version !== RUNTIME_VERSION) fail(`事件 runtime_version=${value.runtime_version} 与当前版本不一致。`, { exitCode: EXIT.INTEGRITY, code: "runtime-version" });
  assertIdentifier(value.delivery_id, "DEL-", "delivery_id");
  if (!Number.isInteger(value.revision) || value.revision < 1) fail("事件 revision 无效。", { exitCode: EXIT.INTEGRITY, code: "event-schema" });
  if (value.event_id !== `EVT-${String(value.revision).padStart(6, "0")}`) fail("event_id 与 revision 不一致。", { exitCode: EXIT.INTEGRITY, code: "event-schema" });
  assertEnum(value.type, EVENT_TYPES, "event type");
  if (typeof value.occurred_at !== "string" || Number.isNaN(Date.parse(value.occurred_at))) fail("occurred_at 无效。", { exitCode: EXIT.INTEGRITY, code: "event-schema" });
  assertExactKeys(value.actor, ACTOR_KEYS, "actor");
  assertNonEmptyString(value.actor.role, "actor.role");
  assertNonEmptyString(value.actor.label, "actor.label");
  if (value.expected_previous_revision !== value.revision - 1) fail("expected_previous_revision 与 revision 不一致。", { exitCode: EXIT.INTEGRITY, code: "event-schema" });
  if (value.revision === 1) {
    if (value.previous_event_sha256 !== null) fail("首事件 previous_event_sha256 必须为 null。", { exitCode: EXIT.INTEGRITY, code: "event-schema" });
  } else {
    assertSha(value.previous_event_sha256, "previous_event_sha256");
  }
  if (!Array.isArray(value.artifacts)) fail("artifacts 必须是数组。", { exitCode: EXIT.INTEGRITY, code: "event-schema" });
  const seenPaths = new Set();
  for (const artifact of value.artifacts) {
    assertExactKeys(artifact, ARTIFACT_KEYS, "artifact");
    artifact.path = normalizeRelative(artifact.path, "artifact.path");
    assertSha(artifact.sha256, "artifact.sha256");
    if (seenPaths.has(artifact.path)) fail(`重复 artifact：${artifact.path}`, { exitCode: EXIT.INTEGRITY, code: "event-schema" });
    seenPaths.add(artifact.path);
  }
  validateEventContract(value);
  assertNoSecrets({ actor: value.actor, payload: value.payload }, "事件");
  return value;
}

function assertArtifactPaths(event, expectedPaths) {
  const actual = event.artifacts.map((artifact) => artifact.path).sort();
  if (stableJson(actual) !== stableJson([...expectedPaths].sort())) fail(`${event.type} artifacts 必须精确绑定：${expectedPaths.join(", ") || "none"}。`, { code: "event-artifacts" });
}

function assertArtifactPrefix(event, prefix, { requireAtLeastOne = true } = {}) {
  if (requireAtLeastOne && !event.artifacts.length) fail(`${event.type} 至少需要一个 ${prefix} artifact。`, { code: "event-artifacts" });
  if (event.artifacts.some((artifact) => !artifact.path.startsWith(prefix))) fail(`${event.type} artifacts 必须全部位于 ${prefix}`, { code: "event-artifacts" });
}

function assertNoExplorationArtifacts(records, label) {
  const exploration = records.filter((record) => record.path === "draft/exploration" || record.path.startsWith("draft/exploration/"));
  if (exploration.length) fail(`${label} 不能绑定探索产物。`, { code: "candidate-reference", details: exploration.map((record) => record.path) });
}

function assertEventRole(event, roles) {
  if (!roles.includes(event.actor.role)) fail(`${event.type} actor role 必须为 ${roles.join(" | ")}。`, { code: "event-actor" });
}

function validateReviewIdentityPayload(payload) {
  const sourceSession = payload.source_session_id;
  const reviewSession = payload.review_session_id;
  const sourceModel = payload.source_model;
  const reviewModel = payload.review_model;
  if (payload.review_mode === "self-check") {
    if (sourceSession !== "unknown" && reviewSession !== "unknown" && sourceSession !== reviewSession) fail("self-check 的 source/review session 必须相同或 unknown。");
  } else if (payload.review_mode === "isolated-same-model") {
    if (sourceSession === "unknown" || reviewSession === "unknown" || sourceSession === reviewSession) fail("isolated-same-model 必须有两个可区分的已知 session。");
    if (sourceModel === "unknown" || reviewModel === "unknown" || sourceModel !== reviewModel) fail("isolated-same-model 必须证明使用同一已知模型。");
  } else if (payload.review_mode === "independent-model") {
    if (sourceSession === "unknown" || reviewSession === "unknown" || sourceSession === reviewSession) fail("independent-model 必须有两个可区分的已知 session。");
    if (sourceModel === "unknown" || reviewModel === "unknown" || sourceModel === reviewModel) fail("independent-model 必须证明模型身份不同；不可猜测 unknown。");
  } else if (payload.review_mode === "human" && (reviewSession !== "unknown" || reviewModel !== "unknown")) {
    fail("human Review 不应伪造模型/session 身份；保持 unknown。");
  }
}

const EVENT_CONTRACTS = Object.freeze({
  created: {
    roles: ["pm-agent", "product-owner"],
    payload(payload) {
      assertNonEmptyString(payload.title, "title");
      assertNonEmptyString(payload.owner, "owner");
    },
    artifacts: (event) => assertArtifactPaths(event, []),
  },
  "brainstorm-patch-recorded": {
    roles: ["pm-agent", "product-owner"],
    payload(payload) {
      if (!Number.isInteger(payload.base_draft_revision) || payload.base_draft_revision < 1) fail("base_draft_revision 无效。");
      payload.decision_locator = normalizeDecisionLocator(payload.decision_locator);
      payload.patch_path = normalizeRelative(payload.patch_path, "patch_path");
      if (!payload.patch_path.startsWith("draft/") || !payload.patch_path.endsWith(".md")) fail("Decision Patch 必须是 draft/ 下的 Markdown。", { code: "path-boundary" });
    },
    artifacts: (event) => assertArtifactPaths(event, [event.payload.patch_path]),
    state: (event, state) => assertReducer(event.payload.base_draft_revision === state.draft_revision, "Decision Patch 基于过期 Draft revision。", "stale-patch"),
  },
  "definition-approved": {
    roles: ["product-owner"],
    payload: (payload) => assertNonEmptyString(payload.approval_evidence, "approval_evidence"),
    artifacts(event) {
      assertArtifactPrefix(event, "draft/");
      assertNoExplorationArtifacts(event.artifacts, "Definition approval");
    },
  },
  "brief-approved": {
    roles: ["product-owner"],
    payload(payload) {
      assertNonEmptyString(payload.approval_evidence, "approval_evidence");
      assertEnum(payload.experience_route, ["pen", "existing-reference", "not-needed"], "experience_route");
    },
    artifacts(event) {
      assertArtifactPrefix(event, "draft/");
      assertNoExplorationArtifacts(event.artifacts, "Brief approval");
      if (event.artifacts.some((artifact) => artifact.path === "draft/experience/manifest.md")) {
        fail("Brief approval 不能绑定后续生成的 draft/experience/manifest.md；请在 approve-brief 后生成并在 preview approval 时绑定。", { code: "event-artifacts" });
      }
      if (!event.artifacts.some((artifact) => artifact.path === "draft/experience/brief.md")) {
        fail("Brief approval 必须绑定 draft/experience/brief.md。", { code: "candidate-reference" });
      }
    },
  },
  "preview-approved": {
    roles: ["product-owner"],
    payload(payload) {
      assertNonEmptyString(payload.approval_evidence, "approval_evidence");
      assertEnum(payload.experience_route, ["pen", "existing-reference", "not-needed"], "experience_route");
    },
    artifacts(event) {
      assertArtifactPrefix(event, "draft/");
      assertNoExplorationArtifacts(event.artifacts, "Preview approval");
      if (!event.artifacts.some((artifact) => artifact.path === "draft/experience/manifest.md")) {
        fail("Preview approval 必须绑定 draft/experience/manifest.md。", { code: "candidate-reference" });
      }
    },
    state: (event, state) => assertReducer(event.payload.experience_route === state.experience_route, "Experience 路线与 Brief 不一致。"),
  },
  "draft-revision-started": {
    roles: ["product-owner"],
    payload(payload) {
      assertEnum(payload.return_phase, ["definition", "experience"], "return_phase");
      assertNonEmptyString(payload.revision_evidence, "revision_evidence");
    },
    artifacts: (event) => assertArtifactPrefix(event, "draft/"),
    state(event, state) {
      assertReducer(state.phase === "experience", "Candidate 前修订只能从 Experience 阶段开始。");
      assertReducer(!state.candidate && !state.review, "已有 Candidate/Review 必须使用 Finding 修订路径。");
      if (event.payload.return_phase === "experience") {
        assertReducer(Boolean(state.approvals.definition), "返回 Experience 需要保留有效 Definition approval。");
        assertReducer(Boolean(state.approvals.brief), "Brief 尚未批准时可直接修改，无需开启 Experience Draft revision。");
      }
      const affectedNames = event.payload.return_phase === "definition" ? ["definition", "brief", "preview"] : ["brief", "preview"];
      const priorByPath = new Map();
      for (const name of affectedNames) {
        for (const artifact of state.approvals[name]?.artifacts ?? []) {
          if (!priorByPath.has(artifact.path)) priorByPath.set(artifact.path, new Set());
          priorByPath.get(artifact.path).add(artifact.sha256);
        }
      }
      for (const artifact of event.artifacts) {
        const priorHashes = priorByPath.get(artifact.path);
        assertReducer(Boolean(priorHashes), `Candidate 前修订 artifact 不属于受影响的既有批准：${artifact.path}`, "revision-artifact");
        assertReducer([...priorHashes].some((hash) => hash !== artifact.sha256), `Candidate 前修订 artifact hash 未变化：${artifact.path}`, "revision-artifact");
      }
    },
  },
  "candidate-frozen": {
    roles: ["pm-agent", "product-owner"],
    payload(payload) {
      assertIdentifier(payload.candidate_id, "CAND-", "candidate_id");
      payload.candidate_path = normalizeRelative(payload.candidate_path, "candidate_path");
      if (payload.candidate_path !== `candidates/${payload.candidate_id}`) fail("Candidate path 必须精确匹配 Candidate ID。", { code: "event-path" });
      assertSha(payload.manifest_sha256, "manifest_sha256");
      if (!Number.isInteger(payload.draft_revision) || payload.draft_revision < 1) fail("draft_revision 无效。");
    },
    artifacts(event) {
      const manifestPath = `${event.payload.candidate_path}/MANIFEST.json`;
      assertArtifactPaths(event, [manifestPath]);
      if (event.artifacts[0].sha256 !== event.payload.manifest_sha256) fail("Candidate manifest artifact hash 与 payload 不一致。", { code: "event-artifacts" });
    },
    state(event, state) {
      assertReducer(event.payload.draft_revision === state.draft_revision, "Candidate Draft revision 漂移。");
      assertReducer(![state.candidate, ...state.candidate_history].filter(Boolean).some((candidate) => samePortableIdentity(candidate.candidate_id, event.payload.candidate_id)), "Candidate ID 已在历史中使用。", "identity-reuse");
    },
  },
  "review-recorded": {
    roles: ["reviewer", "human-reviewer"],
    payload(payload) {
      assertIdentifier(payload.review_id, "REV-", "review_id");
      payload.review_path = normalizeRelative(payload.review_path, "review_path");
      if (!payload.review_path.startsWith("reviews/") || !payload.review_path.endsWith(".md")) fail("Review path 必须是 reviews/ 下的 Markdown。", { code: "event-path" });
      assertEnum(payload.review_mode, REVIEW_MODES, "review_mode");
      assertEnum(payload.outcome, REVIEW_OUTCOMES, "outcome");
      assertIdentifier(payload.candidate_id, "CAND-", "candidate_id");
      assertSha(payload.candidate_manifest_sha256, "candidate_manifest_sha256");
      for (const key of ["source_session_id", "review_session_id", "source_model", "review_model"]) assertNonEmptyString(payload[key], key);
      if (!Array.isArray(payload.finding_ids) || payload.finding_ids.some((id) => !/^FND-[A-Za-z0-9-]+$/.test(id))) fail("finding_ids 无效。");
      if (new Set(payload.finding_ids).size !== payload.finding_ids.length) fail("finding_ids 不能重复。");
      if (payload.outcome === "findings-open" && payload.finding_ids.length === 0) fail("findings-open 必须记录 Finding ID。");
      if (payload.outcome !== "findings-open" && payload.finding_ids.length) fail("非 findings-open 结果不能携带开放 Finding。");
      validateReviewIdentityPayload(payload);
    },
    artifacts: (event) => assertArtifactPaths(event, [event.payload.review_path]),
    role(event) {
      const required = event.payload.review_mode === "human" ? "human-reviewer" : "reviewer";
      if (event.actor.role !== required) fail(`${event.payload.review_mode} Review 要求 actor role=${required}。`, { code: "event-actor" });
    },
    state(event, state) {
      assertReducer(Boolean(state.candidate), "没有当前 Candidate。");
      assertReducer(event.payload.candidate_id === state.candidate.candidate_id, "Review Candidate ID 漂移。");
      assertReducer(event.payload.candidate_manifest_sha256 === state.candidate.manifest_sha256, "Review Candidate hash 漂移。");
      const priorReviews = [state.review, ...state.review_history].filter(Boolean);
      assertReducer(!priorReviews.some((review) => samePortableIdentity(review.review_id, event.payload.review_id)), "Review ID 已在历史中使用。", "identity-reuse");
      assertReducer(!priorReviews.some((review) => samePortablePath(review.path, event.payload.review_path)), "Review report path 已在历史中使用。", "identity-reuse");
    },
  },
  "finding-resolution-recorded": {
    roles: ["product-owner", "reviewer", "human-reviewer"],
    payload(payload) {
      if (!/^FND-[A-Za-z0-9-]+$/.test(payload.finding_id)) fail("finding_id 无效。");
      assertEnum(payload.disposition, ["corrected", "accepted-risk", "withdrawn"], "disposition");
      if (payload.disposition === "corrected") assertEnum(payload.return_phase, ["definition", "experience"], "return_phase");
      if (payload.disposition !== "corrected" && payload.return_phase !== null) fail("仅 corrected 可设置 return_phase。");
      assertNonEmptyString(payload.resolution_evidence, "resolution_evidence");
    },
    artifacts(event) {
      if (event.payload.disposition === "corrected") assertArtifactPrefix(event, "draft/");
      else assertArtifactPaths(event, []);
    },
    role(event) {
      const roles = event.payload.disposition === "withdrawn" ? ["reviewer", "human-reviewer"] : ["product-owner"];
      assertEventRole(event, roles);
    },
  },
  "handoff-confirmed": {
    roles: ["product-owner"],
    payload(payload) {
      assertNonEmptyString(payload.confirmation_evidence, "confirmation_evidence");
      assertIdentifier(payload.candidate_id, "CAND-", "candidate_id");
      assertSha(payload.candidate_manifest_sha256, "candidate_manifest_sha256");
    },
    artifacts: (event) => assertArtifactPaths(event, []),
    state(event, state) {
      assertReducer(Boolean(state.candidate), "没有当前 Candidate。");
      assertReducer(event.payload.candidate_id === state.candidate.candidate_id, "交付确认 Candidate ID 漂移。");
      assertReducer(event.payload.candidate_manifest_sha256 === state.candidate.manifest_sha256, "交付确认 Candidate hash 漂移。");
    },
  },
  "release-created": {
    roles: ["pm-agent", "product-owner"],
    payload(payload) {
      assertIdentifier(payload.release_id, "REL-", "release_id");
      payload.release_path = normalizeRelative(payload.release_path, "release_path");
      if (payload.release_path !== `releases/${payload.release_id}`) fail("Release path 必须精确匹配 Release ID。", { code: "event-path" });
      assertSha(payload.manifest_sha256, "manifest_sha256");
      assertIdentifier(payload.candidate_id, "CAND-", "candidate_id");
      assertSha(payload.candidate_manifest_sha256, "candidate_manifest_sha256");
      assertIdentifier(payload.review_id, "REV-", "review_id");
      assertSha(payload.review_report_sha256, "review_report_sha256");
      if (payload.change_id !== null) assertIdentifier(payload.change_id, "CHG-", "change_id");
    },
    artifacts(event) {
      const manifestPath = `${event.payload.release_path}/MANIFEST.json`;
      assertArtifactPaths(event, [manifestPath]);
      if (event.artifacts[0].sha256 !== event.payload.manifest_sha256) fail("Release manifest artifact hash 与 payload 不一致。", { code: "event-artifacts" });
    },
    state(event, state) {
      assertReducer(Boolean(state.candidate), "没有当前 Candidate。");
      assertReducer(event.payload.candidate_id === state.candidate.candidate_id, "Release Candidate ID 漂移。");
      assertReducer(event.payload.candidate_manifest_sha256 === state.candidate.manifest_sha256, "Release Candidate hash 漂移。");
      assertReducer(Boolean(state.review), "Release 缺少当前 Review。");
      assertReducer(event.payload.review_id === state.review.review_id, "Release Review ID 漂移。");
      assertReducer(state.review.artifacts.some((artifact) => artifact.sha256 === event.payload.review_report_sha256), "Release Review report hash 漂移。");
      assertReducer(event.payload.change_id === (state.active_change?.change_id ?? null), "Release Change binding 漂移。");
      assertReducer(![state.release, ...state.release_history].filter(Boolean).some((release) => samePortableIdentity(release.release_id, event.payload.release_id)), "Release ID 已在历史中使用。", "identity-reuse");
    },
  },
  "send-recorded": {
    roles: ["pm-agent", "product-owner", "authorized-sender"],
    payload(payload) {
      assertEnum(payload.send_status, ["attempted", "sent-confirmed"], "send_status");
      assertEnum(payload.channel, ["manual", "connector"], "channel");
      assertNonEmptyString(payload.recipient, "recipient");
      assertNonEmptyString(payload.external_reference, "external_reference");
      assertNonEmptyString(payload.send_evidence, "send_evidence");
    },
    artifacts: (event) => assertArtifactPaths(event, []),
  },
  "receipt-recorded": {
    roles: ["external-recipient"],
    payload(payload) {
      assertEnum(payload.receipt_status, RECEIPT_STATUSES, "receipt_status");
      assertNonEmptyString(payload.recipient, "recipient");
      assertNonEmptyString(payload.external_reference, "external_reference");
      assertNonEmptyString(payload.receipt_evidence, "receipt_evidence");
    },
    artifacts: (event) => assertArtifactPaths(event, []),
    state(event, state) {
      const confirmedSend = [...state.sending.attempts].reverse().find((attempt) => attempt.status === "sent-confirmed");
      assertReducer(Boolean(confirmedSend), "Receipt 缺少本轮 sent-confirmed 发送证据。");
      assertReducer(event.payload.recipient === confirmedSend.recipient, "Receipt 收件人必须与本轮 sent-confirmed 收件人一致。", "receipt-recipient");
      assertReducer(state.receipt.records.every((record) => record.recipient === event.payload.recipient), "Receipt 后续结论必须绑定同一收件人。", "receipt-recipient");
    },
  },
  "change-started": {
    roles: ["product-owner"],
    payload(payload) {
      assertIdentifier(payload.change_id, "CHG-", "change_id");
      payload.change_path = normalizeRelative(payload.change_path, "change_path");
      if (payload.change_path !== `changes/${payload.change_id}.md`) fail("Change path 必须精确匹配 Change ID。", { code: "event-path" });
      assertNonEmptyString(payload.approval_evidence, "approval_evidence");
      assertIdentifier(payload.release_id, "REL-", "release_id");
      assertSha(payload.release_manifest_sha256, "release_manifest_sha256");
    },
    artifacts: (event) => assertArtifactPaths(event, [event.payload.change_path]),
    state(event, state) {
      assertReducer(Boolean(state.release), "CHG 变更轮次缺少当前 Release。");
      assertReducer(event.payload.release_id === state.release.release_id, "CHG 基线 Release ID 漂移。");
      assertReducer(event.payload.release_manifest_sha256 === state.release.manifest_sha256, "CHG 基线 Release hash 漂移。");
      assertReducer(![state.active_change, ...state.change_history].filter(Boolean).some((change) => samePortableIdentity(change.change_id, event.payload.change_id)), "Change ID 已在历史中使用。", "identity-reuse");
    },
  },
});

export function validateEventContract(event, state = undefined) {
  const contract = EVENT_CONTRACTS[event.type];
  if (!contract) fail(`缺少 event contract：${event.type}`, { exitCode: EXIT.INTEGRITY, code: "unknown-event" });
  assertExactKeys(event.payload, EVENT_PAYLOAD_KEYS[event.type], `${event.type}.payload`);
  assertEventRole(event, contract.roles);
  contract.payload(event.payload);
  contract.artifacts(event);
  if (contract.role) contract.role(event);
  if (state && contract.state) contract.state(event, state);
  assertNoSecrets(event.payload, `${event.type} payload`);
  return event;
}

export function makeEvent({ state, type, actor, artifacts = [], payload, occurredAt = undefined }) {
  assertEnum(type, EVENT_TYPES, "event type");
  const revision = state.revision + 1;
  const event = {
    schema_version: SCHEMA_VERSION,
    runtime_version: RUNTIME_VERSION,
    delivery_id: state.delivery_id,
    revision,
    event_id: `EVT-${String(revision).padStart(6, "0")}`,
    type,
    occurred_at: occurredAt ?? new Date().toISOString(),
    actor,
    expected_previous_revision: state.revision,
    previous_event_sha256: state.last_event_sha256,
    artifacts,
    payload,
  };
  const decoded = decodeEvent(event);
  validateEventContract(decoded, state);
  return decoded;
}

async function acquireLock(root, operation) {
  const lockPath = path.join(root, "workflow.lock");
  const existingLock = await lstatOrNull(lockPath);
  if (existingLock?.isSymbolicLink() || (existingLock && !existingLock.isFile())) fail("workflow.lock 必须是 Delivery 根内普通文件。", { exitCode: EXIT.INTEGRITY, code: "path-symlink" });
  const operationId = randomUUID();
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      let lock = null;
      try {
        const metadata = await lstat(lockPath);
        if (metadata.isSymbolicLink() || !metadata.isFile()) fail("workflow.lock 不是安全的普通文件。", { exitCode: EXIT.INTEGRITY, code: "path-symlink" });
        lock = JSON.parse(await readFile(lockPath, "utf8"));
      } catch (readError) {
        if (readError instanceof WorkflowError) throw readError;
      }
      fail("Delivery 正由另一个操作持有 lock；不会自动夺锁。", {
        exitCode: EXIT.CONFLICT,
        code: "locked",
        details: lock ? { operation: lock.operation, acquired_at: lock.acquired_at, operation_id: lock.operation_id } : undefined,
      });
    }
    throw error;
  }
  const lock = { runtime_version: RUNTIME_VERSION, operation, operation_id: operationId, acquired_at: new Date().toISOString() };
  await handle.writeFile(stableJson(lock, true));
  try { await handle.sync(); } catch {}
  await handle.close();
  return async () => {
    try {
      const metadata = await lstat(lockPath);
      if (metadata.isSymbolicLink() || !metadata.isFile()) return;
      const current = JSON.parse(await readFile(lockPath, "utf8"));
      if (current.operation_id === operationId) await unlink(lockPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  };
}

async function readEventFiles(root) {
  const { target: eventsDir } = await resolveInside(root, "events", { expectedType: "directory" });
  let entries;
  try {
    entries = await readdir(eventsDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") fail("缺少当前 schema 所需的 events/。", { code: "event-directory" });
    throw error;
  }
  const unexpected = entries.filter((entry) => !entry.isFile() || !/^\d{6}-[a-z0-9-]+\.json$/.test(entry.name));
  if (unexpected.length) fail(`events/ 含未知项：${unexpected.map((entry) => entry.name).join(", ")}`, { exitCode: EXIT.INTEGRITY, code: "event-directory" });
  const names = entries.map((entry) => entry.name).sort();
  if (!names.length) fail("events/ 为空。", { exitCode: EXIT.INTEGRITY, code: "event-directory" });
  return names;
}

export async function replayDelivery(rootInput) {
  const root = await rootRealPath(rootInput);
  await validateControlledDirectories(root, { requireAll: true });
  const names = await readEventFiles(root);
  let state = null;
  let previousHash = null;
  const seenIds = new Set();
  const events = [];
  for (let index = 0; index < names.length; index += 1) {
    const { target: filePath } = await resolveInside(root, `events/${names[index]}`, { expectedType: "file" });
    const bytes = await readFile(filePath);
    let parsed;
    try { parsed = JSON.parse(bytes.toString("utf8")); } catch {
      fail(`事件 JSON 无法解析：${names[index]}`, { exitCode: EXIT.INTEGRITY, code: "event-json" });
    }
    let event;
    try {
      event = decodeEvent(parsed);
    } catch (error) {
      if (error instanceof WorkflowError) fail(`存储事件校验失败 ${names[index]}：${error.message}`, { exitCode: EXIT.INTEGRITY, code: "stored-event-invalid", details: { original_code: error.code } });
      throw error;
    }
    if (names[index] !== eventFileName(event)) fail(`事件文件名与内容不一致：${names[index]}`, { exitCode: EXIT.INTEGRITY, code: "event-filename" });
    if (event.revision !== index + 1) fail(`事件 revision 不连续：${names[index]}`, { exitCode: EXIT.INTEGRITY, code: "revision-gap" });
    if (seenIds.has(event.event_id)) fail(`重复 event ID：${event.event_id}`, { exitCode: EXIT.INTEGRITY, code: "duplicate-event" });
    seenIds.add(event.event_id);
    if (event.previous_event_sha256 !== previousHash) fail(`事件 hash 链断裂：${names[index]}`, { exitCode: EXIT.INTEGRITY, code: "event-hash-chain" });
    if (!state) state = initialState(event.delivery_id);
    try {
      state = reduceEvent(state, event);
    } catch (error) {
      if (error instanceof WorkflowError) fail(`存储事件语义校验失败 ${names[index]}：${error.message}`, { exitCode: EXIT.INTEGRITY, code: "stored-event-invalid", details: { original_code: error.code } });
      throw error;
    }
    previousHash = eventHash(bytes);
    state.last_event_sha256 = previousHash;
    events.push({ event, file: `events/${names[index]}`, sha256: previousHash });
  }
  return { root, state, events };
}

async function artifactRecords(root, inputs, { requireAtLeastOne = true } = {}) {
  const values = inputs ?? [];
  if (requireAtLeastOne && values.length === 0) fail("至少需要一个 --artifact。", { code: "missing-artifact" });
  const records = [];
  for (const input of values) {
    const { rel, target } = await resolveInside(root, input, { expectedType: "file" });
    const metadata = await lstat(target);
    if (!metadata.isFile() || metadata.isSymbolicLink()) fail(`artifact 必须是普通文件：${rel}`);
    records.push({ path: rel, sha256: await sha256File(target) });
  }
  records.sort((a, b) => a.path.localeCompare(b.path, "en"));
  if (new Set(records.map((record) => portablePathKey(record.path))).size !== records.length) fail("artifact 路径在跨平台语义下重复。", { code: "non-portable-path" });
  return records;
}

function isUnresolvedApprovalValue(value) {
  const normalized = value.trim().replace(/[。.]+$/u, "").trim();
  return normalized.length === 0
    || /[{}]/u.test(normalized)
    || /^(?:待确认(?:后补充)?|pending|tbd|todo|unknown)$/iu.test(normalized);
}

function requireResolvedMarkdownField(text, pattern, label, code) {
  const match = text.match(pattern);
  if (!match || isUnresolvedApprovalValue(match[1])) fail(`${label} 缺失或仍是占位内容。`, { code });
}

async function readArtifactText(root, relativePath) {
  const { target } = await resolveInside(root, relativePath, { expectedType: "file" });
  return readFile(target, "utf8");
}

async function validateDefinitionExperienceRequirements(root, artifacts) {
  let contractCount = 0;
  for (const artifact of artifacts) {
    if (!artifact.path.endsWith(".md")) continue;
    const text = await readArtifactText(root, artifact.path);
    if (!/^## Experience requirements\s*$/mu.test(text)) continue;
    contractCount += 1;
    requireResolvedMarkdownField(text, /^- Required (?:shared )?behavior coverage[：:]\s*(.+)$/mu, "Definition Experience behavior coverage", "definition-experience-requirements");
    requireResolvedMarkdownField(text, /^- Required roles \/ pages \/ states[：:]\s*(.+)$/mu, "Definition Experience roles/pages/states", "definition-experience-requirements");
    requireResolvedMarkdownField(text, /^- Required journey closure[：:]\s*(.+)$/mu, "Definition journey closure", "definition-experience-requirements");
    requireResolvedMarkdownField(text, /^- Prototype readiness walkthrough[：:]\s*(.+)$/mu, "Definition prototype readiness walkthrough", "definition-experience-requirements");
    requireResolvedMarkdownField(text, /^- Unresolved prototype blockers[：:]\s*(.+)$/mu, "Definition unresolved prototype blockers", "definition-experience-requirements");
  }
  if (!contractCount) fail("Definition approval 缺少 Experience requirements 合同。", { code: "definition-experience-requirements" });
}

function markdownSection(text, heading) {
  const headingMatch = text.match(new RegExp(`^## ${escapeRegExp(heading)}\\s*$`, "mu"));
  if (!headingMatch) return null;
  const afterHeading = text.slice(headingMatch.index + headingMatch[0].length);
  const nextHeading = afterHeading.search(/^##\s/mu);
  return nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function markdownTableCells(row) {
  const cells = row.split("|").slice(1);
  if (cells.at(-1)?.trim() === "") cells.pop();
  return cells.map((cell) => cleanMarkdownValue(cell));
}

function cleanMarkdownValue(value) {
  const trimmed = value.trim();
  const code = trimmed.match(/^`([^`]*)`$/u);
  return (code?.[1] ?? trimmed).trim();
}

function markdownField(text, label, code) {
  const match = text.match(new RegExp(`^- ${escapeRegExp(label)}[：:]\\s*(.+)$`, "mu"));
  const value = cleanMarkdownValue(match?.[1] ?? "");
  if (!match || isUnresolvedApprovalValue(value)) fail(`${label} 缺失或仍是占位内容。`, { code });
  return value;
}

function structuredIds(value) {
  return [...value.matchAll(/\b([A-Z][A-Z0-9]*-[A-Z0-9-]+)\b/gu)].map((match) => match[1]);
}

function orderedUniqueStructuredIds(value) {
  const ids = structuredIds(value);
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

function isReasonedNotApplicable(value) {
  return /^not-applicable-with-reason:\s*\S.+$/iu.test(cleanMarkdownValue(value));
}

function isNoneValue(value) {
  return cleanMarkdownValue(value).toLowerCase() === "none";
}

function assertExactValue(value, expected, label, code) {
  if (cleanMarkdownValue(value).toLowerCase() !== expected.toLowerCase()) fail(`${label} 必须是 ${expected}。`, { code });
}

function assertReasonedNotApplicable(value, label, code) {
  if (!isReasonedNotApplicable(value)) fail(`${label} 必须给出 not-applicable-with-reason。`, { code });
}

function assertConcreteValue(value, label, code, { allowReasonedNotApplicable = false } = {}) {
  const cleaned = cleanMarkdownValue(value);
  const reasonedNotApplicable = isReasonedNotApplicable(cleaned);
  const rejected = /^(?:none|pending|unverified|gap|contradiction|unavailable)$/iu.test(cleaned) || isUnresolvedApprovalValue(cleaned);
  if ((rejected || reasonedNotApplicable) && !(allowReasonedNotApplicable && reasonedNotApplicable)) fail(`${label} 缺少具体证据。`, { code });
}

function assertUnavailableValue(value, label, code) {
  const cleaned = cleanMarkdownValue(value);
  if (cleaned.toLowerCase() !== "unverified" && !/^unavailable:\s*\S.+$/iu.test(cleaned) && !isReasonedNotApplicable(cleaned)) {
    fail(`${label} 必须明确记录 unavailable、unverified 或 reasoned not-applicable。`, { code });
  }
}

function parseTableRows(text, heading, idPattern, cellCount, label, code, { required = true } = {}) {
  const section = markdownSection(text, heading);
  if (section === null) {
    if (required) fail(`${label} 缺少 ${heading} section。`, { code });
    return [];
  }
  const rows = [];
  for (const line of section.split(/\r?\n/u)) {
    if (!line.trimStart().startsWith("|")) continue;
    const cells = markdownTableCells(line);
    const first = cells[0] ?? "";
    if (/^(?:(?:Coverage|Journey|Screen|State|Step) ID|Audit item)$/iu.test(first) || /^:?-{3,}:?$/u.test(first)) continue;
    if (!idPattern.test(first)) fail(`${label} 含无效或非预期 ID：${first || "empty"}。`, { code });
    if (cells.length !== cellCount || cells.some((cell) => isUnresolvedApprovalValue(cell))) {
      fail(`${label} 的 ${cells[0] || "unknown"} row 不完整。`, { code });
    }
    rows.push({ id: cells[0], cells });
  }
  if (required && !rows.length) fail(`${label} 缺少已完成 row。`, { code });
  const ids = rows.map((row) => row.id);
  if (new Set(ids).size !== ids.length) fail(`${label} 含重复 ID。`, { code });
  return rows;
}

function parseCoverageRows(text, heading, label, code) {
  const rows = parseTableRows(text, heading, /^[A-Z][A-Z0-9]*-[A-Z0-9-]+$/u, 6, label, code);
  const reserved = rows.filter((row) => /^(?:JNY|SCR|STATE|STEP)-/u.test(row.id));
  if (reserved.length) fail(`${label} 使用了保留的功能 ID 前缀。`, { code });
  return rows;
}

function parseJourneyRows(text, heading, label, code) {
  return parseTableRows(text, heading, /^JNY-[A-Z0-9-]+$/u, heading === "Journey closure" ? 5 : 4, label, code);
}

function exactIdSet(actualRows, expectedIds, label, code) {
  const actual = actualRows.map((row) => row.id).sort();
  const expected = [...expectedIds].sort();
  if (stableJson(actual) !== stableJson(expected)) fail(`${label} ID 集合与已批准 Brief 不一致。`, { code, details: { expected, actual } });
}

function referencedIds(value, allowedIds, label, code, { exactlyOne = false } = {}) {
  const ids = structuredIds(value);
  if (!ids.length || new Set(ids).size !== ids.length || ids.some((id) => !allowedIds.has(id)) || (exactlyOne && ids.length !== 1)) {
    fail(`${label} 含缺失、重复或未声明的 ID 引用。`, { code, details: { value, allowed: [...allowedIds].sort() } });
  }
  return ids;
}

function parseBriefContract(text, route, code = "experience-functional-contract") {
  for (const label of [
    "Prototype question",
    "Functional representation detail",
    "Interaction coverage",
    "Context / surface",
    "High-fidelity visual-design non-goals",
    "Re-entry / retrieval",
  ]) markdownField(text, label, code);

  const applicability = markdownField(text, "Functional contract applicability", code);
  const coverageRows = parseCoverageRows(text, "Locator map", "Experience Brief Coverage", code);
  for (const row of coverageRows) {
    for (const index of [1, 2, 3, 4]) assertConcreteValue(row.cells[index], `${row.id} Coverage contract`, code);
    assertConcreteValue(row.cells[5], `${row.id} expected artifact purpose`, code, { allowReasonedNotApplicable: route === "not-needed" });
  }
  const coverageIds = new Set(coverageRows.map((row) => row.id));
  const journeyRows = parseJourneyRows(text, "Journey closure", "Experience Brief Journey", code);
  const journeyIds = new Set(journeyRows.map((row) => row.id));
  const journeySequences = new Map();
  for (const row of journeyRows) {
    for (const value of row.cells.slice(1)) assertConcreteValue(value, `${row.id} Journey contract`, code, { allowReasonedNotApplicable: true });
    const sequence = orderedUniqueStructuredIds(row.cells.slice(1).join(" "));
    if (!sequence.length || sequence.some((id) => !coverageIds.has(id))) {
      fail(`Experience Brief ${row.id} 引用了未定义的 Coverage ID。`, { code });
    }
    journeySequences.set(row.id, sequence);
  }

  const screenRows = parseTableRows(text, "Screen inventory", /^SCR-[A-Z0-9-]+$/u, 10, "Experience Brief Screen inventory", code, { required: false });
  const stateRows = parseTableRows(text, "Material state matrix", /^STATE-[A-Z0-9-]+$/u, 9, "Experience Brief Material state matrix", code, { required: false });
  const stepRows = parseTableRows(text, "Journey transition contract", /^STEP-[A-Z0-9-]+$/u, 11, "Experience Brief Journey transition contract", code, { required: false });

  if (route === "not-needed") {
    assertReasonedNotApplicable(applicability, "Functional contract applicability", code);
    if (screenRows.length || stateRows.length || stepRows.length) fail("not-needed route 不得声明 Screen/State/Step 实现合同。", { code });
    return { coverageRows, coverageIds, journeyRows, journeyIds, journeySequences, screenRows, stateRows, stepRows };
  }

  assertExactValue(applicability, "required", "Functional contract applicability", code);
  if (!screenRows.length || !stateRows.length || !stepRows.length) fail("可见 Experience route 必须完成 Screen/State/Step 合同。", { code });
  const screenIds = new Set(screenRows.map((row) => row.id));
  const stateIds = new Set(stateRows.map((row) => row.id));
  const stepIds = new Set(stepRows.map((row) => row.id));
  const screenCoverage = new Set();
  const stateCoverage = new Set();
  const stepCoverage = new Set();
  const screenJourneys = new Set();
  for (const row of screenRows) {
    for (const id of referencedIds(row.cells[1], coverageIds, `${row.id} Coverage IDs`, code)) screenCoverage.add(id);
    for (const id of referencedIds(row.cells[2], journeyIds, `${row.id} Journey IDs`, code)) screenJourneys.add(id);
    for (const value of row.cells.slice(3)) assertConcreteValue(value, `${row.id} Screen obligation`, code);
  }
  const stateOwners = new Set();
  for (const row of stateRows) {
    const [owner] = referencedIds(row.cells[1], screenIds, `${row.id} owner Screen ID`, code, { exactlyOne: true });
    stateOwners.add(owner);
    for (const id of referencedIds(row.cells[2], coverageIds, `${row.id} Coverage IDs`, code)) stateCoverage.add(id);
    for (const value of row.cells.slice(3)) assertConcreteValue(value, `${row.id} State obligation`, code);
  }
  const stepJourneys = new Set();
  for (const row of stepRows) {
    const [journeyId] = referencedIds(row.cells[1], journeyIds, `${row.id} Journey ID`, code, { exactlyOne: true });
    stepJourneys.add(journeyId);
    const coverage = referencedIds(row.cells[2], coverageIds, `${row.id} Coverage IDs`, code);
    for (const id of coverage) {
      stepCoverage.add(id);
      if (!journeySequences.get(journeyId).includes(id)) fail(`${row.id} Coverage 不属于 ${journeyId} 的批准路径。`, { code });
    }
    referencedIds(row.cells[3], stateIds, `${row.id} source State`, code, { exactlyOne: true });
    for (const index of [4, 5, 7, 10]) assertConcreteValue(row.cells[index], `${row.id} Step obligation`, code);
    for (const index of [6, 9]) assertConcreteValue(row.cells[index], `${row.id} Step guard/recovery`, code, { allowReasonedNotApplicable: true });
    const destinationIds = structuredIds(row.cells[8]);
    if (destinationIds.length) {
      if (destinationIds.some((id) => !stateIds.has(id))) fail(`${row.id} destination 引用了未声明 State。`, { code });
    } else if (!/^(?:terminal|external|out-of-scope):\s*\S.+$/iu.test(row.cells[8])) {
      fail(`${row.id} destination 必须引用 State 或使用 terminal/external/out-of-scope reason。`, { code });
    }
  }
  const sameSet = (left, right) => stableJson([...left].sort()) === stableJson([...right].sort());
  if (!sameSet(stateOwners, screenIds)) fail("每个 Screen 必须至少拥有一个 material State。", { code });
  if (!sameSet(screenJourneys, journeyIds) || !sameSet(stepJourneys, journeyIds)) fail("每个 Journey 必须映射到 Screen 和 Step。", { code });
  if (!sameSet(new Set([...screenCoverage, ...stateCoverage]), coverageIds) || !sameSet(stepCoverage, coverageIds)) {
    fail("每个 Coverage 必须映射到 Screen/State 且至少一个 Journey Step。", { code });
  }
  return { coverageRows, coverageIds, journeyRows, journeyIds, journeySequences, screenRows, screenIds, stateRows, stateIds, stepRows, stepIds };
}

async function validateBriefJourneyContract(root, artifacts, route) {
  if (!artifacts.some((artifact) => artifact.path === "draft/experience/brief.md")) return;
  const text = await readArtifactText(root, "draft/experience/brief.md");
  parseBriefContract(text, route);
}

function auditRows(text, code) {
  const rows = parseTableRows(text, "Functional audit", /^(?:inventory-completeness|transition-closure|feedback-recovery|functional-walkthrough|template-collapse)$/u, 4, "Experience functional audit", code);
  const required = new Set(["inventory-completeness", "transition-closure", "feedback-recovery", "functional-walkthrough", "template-collapse"]);
  exactIdSet(rows, required, "Experience functional audit", code);
  return new Map(rows.map((row) => [row.id, row]));
}

function bundlePaths(value) {
  const inline = [...value.matchAll(/`([^`]+)`/gu)].map((match) => match[1]).filter((candidate) => !candidate.includes("<"));
  if (inline.length) return inline;
  const cleaned = cleanMarkdownValue(value);
  return /^[A-Za-z0-9][^\s]*\.[A-Za-z0-9]+$/u.test(cleaned) && !cleaned.includes("<") ? [cleaned] : [];
}

function assertBoundBundlePaths(value, allowedArtifacts, label, code, { suffix, minimum = 1, forbiddenArtifacts = new Set() } = {}) {
  const paths = bundlePaths(value);
  if (paths.length < minimum || (suffix && paths.some((item) => !item.endsWith(suffix)))) fail(`${label} 缺少要求的 artifact path。`, { code });
  for (const item of paths) {
    const rel = normalizeRelative(item, label);
    const artifactPath = `draft/${rel}`;
    if (forbiddenArtifacts.has(artifactPath)) fail(`${label} 不能用 Brief/manifest 自身代替独立证据：${rel}`, { code });
    if (!allowedArtifacts.has(artifactPath)) fail(`${label} 未绑定到当前 Brief/preview approval artifacts：${rel}`, { code });
  }
  return paths;
}

function assertReadyBundlePath(value, allowedArtifacts, label, code, { suffix } = {}) {
  const match = cleanMarkdownValue(value).match(/^ready:\s*(?:`([^`]+)`|([A-Za-z0-9][^\s,;]*\.[A-Za-z0-9]+))(?:\s|$)/u);
  if (!match) fail(`${label} 必须以 ready: 开头并记录精确 bundle-relative artifact path。`, { code });
  return assertBoundBundlePaths(`\`${match[1] ?? match[2]}\``, allowedArtifacts, label, code, { suffix });
}

function assertResolvedManifestFields(text, code) {
  const values = new Map();
  for (const label of [
    "Brief", "Pen source", "Preview exports", "Read-back artifact", "Reference / route evidence",
    "Experience target", "Direct route", "Pen CLI version", "Live interactive help read", "Visual role",
    "Functional realization applicability", "Smallest scope / functional detail", "Scope/fidelity approval",
    "Process state", "Resumable handle retained", "Initial prompt", "Terminal result",
    "App state / schema read", "Guidelines and document discovery", "Direct mutation summary",
    "Structural/layout read-back", "Coverage read-back", "Journey closure read-back", "Dangling affordances",
    "Re-entry / retrieval coverage", "Design gap sweep", "Unresolved design gaps", "Preview file result",
    "Agent visual capability", "Preview presentation to Owner", "Save / clean exit",
    "External assets / provenance / delivery permission", "Preview shown", "Preview date",
    "PM/Owner functional review", "PM/Owner feedback", "PM/Owner preview approval words",
    "PM/Owner preview approval date", "Behavior or functional drift", "Missing coverage", "Experience status",
    "Experience reason", "Product risk", "PM/Owner continuation",
  ]) values.set(label, markdownField(text, label, code));
  return values;
}

async function validateManifestJourneyEvidence(root, artifacts, route, briefArtifacts, approvalWords) {
  if (!artifacts.some((artifact) => artifact.path === "draft/experience/manifest.md")) return;
  const code = "experience-functional-evidence";
  const text = await readArtifactText(root, "draft/experience/manifest.md");
  const brief = await readArtifactText(root, "draft/experience/brief.md");
  const contract = parseBriefContract(brief, route, code);
  const fields = assertResolvedManifestFields(text, code);
  assertExactValue(fields.get("Brief"), "experience/brief.md", "Manifest Brief", code);
  assertExactValue(fields.get("Experience target"), route, "Experience target", code);
  assertExactValue(fields.get("Visual role"), "implementation-target", "Visual role", code);
  if (fields.get("PM/Owner preview approval words") !== approvalWords) fail("Manifest Owner approval words 必须与 approve-preview evidence 完全一致。", { code });

  const allApprovedArtifacts = new Set([...(briefArtifacts ?? []), ...artifacts].map((artifact) => artifact.path));
  const previewArtifactSet = new Set(artifacts.map((artifact) => artifact.path));
  const coverageRows = parseCoverageRows(text, "Coverage map", "Experience manifest Coverage", code);
  exactIdSet(coverageRows, contract.coverageIds, "Experience manifest Coverage", code);
  const approvedCoverage = new Map(contract.coverageRows.map((row) => [row.id, row]));
  for (const row of coverageRows) {
    const approved = approvedCoverage.get(row.id);
    if (row.cells[1] !== approved.cells[1] || row.cells[4] !== approved.cells[4]) fail(`${row.id} locator 或 runtime relationship 与 Brief 不一致。`, { code });
  }

  const journeyRows = parseJourneyRows(text, "Journey closure map", "Experience manifest Journey", code);
  exactIdSet(journeyRows, contract.journeyIds, "Experience manifest Journey", code);
  for (const row of journeyRows) {
    const observedSequence = orderedUniqueStructuredIds(row.cells[1]);
    if (stableJson(contract.journeySequences.get(row.id)) !== stableJson(observedSequence)) {
      fail(`Experience manifest ${row.id} 的 approved Coverage path 与 Brief 不一致。`, { code });
    }
  }

  const screenRows = parseTableRows(text, "Screen realization", /^SCR-[A-Z0-9-]+$/u, 4, "Experience Screen realization", code, { required: route !== "not-needed" });
  const stateRows = parseTableRows(text, "State realization", /^STATE-[A-Z0-9-]+$/u, 4, "Experience State realization", code, { required: route !== "not-needed" });
  const stepRows = parseTableRows(text, "Step transition realization", /^STEP-[A-Z0-9-]+$/u, 7, "Experience Step realization", code, { required: route !== "not-needed" });
  if (route === "not-needed") {
    if (screenRows.length || stateRows.length || stepRows.length) fail("not-needed manifest 不得声明 Screen/State/Step realization。", { code });
  } else {
    exactIdSet(screenRows, contract.screenIds, "Experience Screen realization", code);
    exactIdSet(stateRows, contract.stateIds, "Experience State realization", code);
    exactIdSet(stepRows, contract.stepIds, "Experience Step realization", code);
  }
  const audits = auditRows(text, code);
  const unavailable = route === "pen" && fields.get("Direct route") === "unavailable";
  const success = route !== "not-needed" && !unavailable;
  if (success) {
    for (const row of [...screenRows, ...stateRows]) {
      assertConcreteValue(row.cells[1], `${row.id} artifact locator`, code);
      assertConcreteValue(row.cells[2], `${row.id} realization evidence`, code);
      assertExactValue(row.cells.at(-1), "pass", `${row.id} realization result`, code);
    }
    for (const row of stepRows) {
      for (const index of [1, 2, 3]) assertConcreteValue(row.cells[index], `${row.id} transition evidence`, code);
      for (const index of [4, 5]) assertConcreteValue(row.cells[index], `${row.id} recovery/re-entry evidence`, code, { allowReasonedNotApplicable: true });
      assertExactValue(row.cells.at(-1), "pass", `${row.id} realization result`, code);
    }
    for (const id of ["inventory-completeness", "transition-closure", "feedback-recovery", "functional-walkthrough"]) {
      assertConcreteValue(audits.get(id).cells[1], `${id} scope`, code);
      assertConcreteValue(audits.get(id).cells[2], `${id} evidence`, code);
      assertExactValue(audits.get(id).cells[3], "pass", `${id} result`, code);
    }
    const collapseRow = audits.get("template-collapse");
    assertConcreteValue(collapseRow.cells[1], "template-collapse scope", code);
    assertConcreteValue(collapseRow.cells[2], "template-collapse evidence", code, { allowReasonedNotApplicable: true });
    const collapse = collapseRow.cells[3];
    if (cleanMarkdownValue(collapse).toLowerCase() !== "pass" && !isReasonedNotApplicable(collapse)) fail("template-collapse result 必须 pass 或给出 reasoned not-applicable。", { code });
  } else if (unavailable) {
    for (const row of [...screenRows, ...stateRows]) {
      assertUnavailableValue(row.cells[1], `${row.id} unavailable locator`, code);
      assertUnavailableValue(row.cells[2], `${row.id} unavailable evidence`, code);
      assertExactValue(row.cells.at(-1), "unverified", `${row.id} unavailable realization`, code);
    }
    for (const row of stepRows) {
      for (const value of row.cells.slice(1, -1)) assertUnavailableValue(value, `${row.id} unavailable transition evidence`, code);
      assertExactValue(row.cells.at(-1), "unverified", `${row.id} unavailable realization`, code);
    }
    for (const id of ["inventory-completeness", "transition-closure", "feedback-recovery", "functional-walkthrough"]) {
      assertUnavailableValue(audits.get(id).cells[2], `${id} unavailable evidence`, code);
      assertExactValue(audits.get(id).cells[3], "unverified", `${id} unavailable result`, code);
    }
    const collapseRow = audits.get("template-collapse");
    assertUnavailableValue(collapseRow.cells[2], "template-collapse unavailable evidence", code);
    const collapse = collapseRow.cells[3];
    if (cleanMarkdownValue(collapse).toLowerCase() !== "unverified" && !isReasonedNotApplicable(collapse)) fail("unavailable template-collapse 必须 unverified 或 reasoned not-applicable。", { code });
  } else {
    for (const row of audits.values()) assertReasonedNotApplicable(row.cells[3], `${row.id} result`, code);
  }

  if (route === "pen" && !unavailable) {
    assertExactValue(fields.get("Direct route"), "pen-interactive-direct", "Direct route", code);
    assertExactValue(fields.get("Functional realization applicability"), "required", "Functional realization applicability", code);
    assertConcreteValue(fields.get("Pen CLI version"), "Pen CLI version", code);
    assertExactValue(fields.get("Live interactive help read"), "yes", "Live interactive help read", code);
    assertExactValue(fields.get("Process state"), "ready", "Process state", code);
    assertExactValue(fields.get("Resumable handle retained"), "yes", "Resumable handle retained", code);
    assertExactValue(fields.get("Initial prompt"), "seen", "Initial prompt", code);
    assertExactValue(fields.get("Terminal result"), "none", "Terminal result", code);
    assertBoundBundlePaths(fields.get("Pen source"), previewArtifactSet, "Pen source", code, { suffix: ".pen" });
    assertBoundBundlePaths(fields.get("Preview exports"), previewArtifactSet, "Preview exports", code, { suffix: ".png" });
    assertBoundBundlePaths(fields.get("Read-back artifact"), previewArtifactSet, "Read-back artifact", code, {
      suffix: ".md",
      forbiddenArtifacts: new Set(["draft/experience/manifest.md"]),
    });
    assertReasonedNotApplicable(fields.get("Reference / route evidence"), "Reference / route evidence", code);
    for (const label of ["App state / schema read", "Guidelines and document discovery", "Direct mutation summary", "Structural/layout read-back", "Coverage read-back", "Journey closure read-back", "Re-entry / retrieval coverage", "Design gap sweep"]) assertConcreteValue(fields.get(label), label, code);
    for (const row of coverageRows) {
      assertConcreteValue(row.cells[2], `${row.id} artifact locator`, code);
      assertConcreteValue(row.cells[3], `${row.id} preview/state`, code);
      assertExactValue(row.cells[5], "synced", `${row.id} sync result`, code);
    }
    for (const row of journeyRows) {
      assertConcreteValue(row.cells[2], `${row.id} observed path`, code);
      assertExactValue(row.cells[3], "closed", `${row.id} closure result`, code);
    }
    assertReadyBundlePath(fields.get("Preview file result"), previewArtifactSet, "Preview file result", code, { suffix: ".png" });
    if (!["agent-visual", "human-required"].includes(fields.get("Agent visual capability"))) fail("Pen route 必须记录 Agent visual capability。", { code });
    if (!["attached", "rendered", "local-path"].includes(fields.get("Preview presentation to Owner"))) fail("Pen preview 必须已向 Owner 展示。", { code });
    assertExactValue(fields.get("Save / clean exit"), "yes", "Save / clean exit", code);
  } else if (route === "existing-reference") {
    assertExactValue(fields.get("Direct route"), "existing-reference", "Direct route", code);
    assertExactValue(fields.get("Functional realization applicability"), "required", "Functional realization applicability", code);
    for (const label of ["Pen source", "Preview exports", "Read-back artifact", "Pen CLI version", "Live interactive help read", "Process state", "Resumable handle retained", "Initial prompt", "Terminal result", "Save / clean exit", "Preview file result"]) {
      assertReasonedNotApplicable(fields.get(label), label, code);
    }
    for (const label of ["App state / schema read", "Direct mutation summary"]) assertReasonedNotApplicable(fields.get(label), label, code);
    assertConcreteValue(fields.get("Guidelines and document discovery"), "Guidelines and document discovery", code);
    assertBoundBundlePaths(fields.get("Reference / route evidence"), allApprovedArtifacts, "Reference / route evidence", code, {
      forbiddenArtifacts: new Set(["draft/experience/brief.md", "draft/experience/manifest.md"]),
    });
    for (const label of ["Structural/layout read-back", "Coverage read-back", "Journey closure read-back", "Re-entry / retrieval coverage", "Design gap sweep"]) assertConcreteValue(fields.get(label), label, code);
    for (const row of coverageRows) {
      assertConcreteValue(row.cells[2], `${row.id} reference locator`, code);
      assertConcreteValue(row.cells[3], `${row.id} preview/state`, code);
      assertExactValue(row.cells[5], "synced", `${row.id} sync result`, code);
    }
    for (const row of journeyRows) {
      assertConcreteValue(row.cells[2], `${row.id} observed reference path`, code);
      assertExactValue(row.cells[3], "closed", `${row.id} closure result`, code);
    }
    if (!["agent-visual", "human-required"].includes(fields.get("Agent visual capability"))) fail("existing-reference 必须记录 visual capability。", { code });
    if (!["attached", "rendered", "local-path"].includes(fields.get("Preview presentation to Owner"))) fail("existing-reference 必须已向 Owner 展示。", { code });
  } else if (route === "not-needed") {
    assertExactValue(fields.get("Direct route"), "not-needed", "Direct route", code);
    assertReasonedNotApplicable(fields.get("Functional realization applicability"), "Functional realization applicability", code);
    for (const label of ["Pen source", "Preview exports", "Read-back artifact", "Pen CLI version", "Live interactive help read", "Process state", "Resumable handle retained", "Initial prompt", "Terminal result", "Save / clean exit", "Preview file result", "Agent visual capability", "Preview presentation to Owner", "Preview date"]) {
      assertReasonedNotApplicable(fields.get(label), label, code);
    }
    for (const label of ["App state / schema read", "Direct mutation summary", "Structural/layout read-back", "Coverage read-back", "Journey closure read-back", "Re-entry / retrieval coverage"]) assertReasonedNotApplicable(fields.get(label), label, code);
    assertConcreteValue(fields.get("Guidelines and document discovery"), "Guidelines and document discovery", code);
    assertConcreteValue(fields.get("Design gap sweep"), "Design gap sweep", code);
    assertBoundBundlePaths(fields.get("Reference / route evidence"), allApprovedArtifacts, "Reference / route evidence", code, {
      forbiddenArtifacts: new Set(["draft/experience/brief.md", "draft/experience/manifest.md"]),
    });
    for (const row of coverageRows) {
      assertReasonedNotApplicable(row.cells[2], `${row.id} artifact locator`, code);
      assertReasonedNotApplicable(row.cells[5], `${row.id} sync result`, code);
    }
    for (const row of journeyRows) {
      assertReasonedNotApplicable(row.cells[2], `${row.id} observed path`, code);
      assertReasonedNotApplicable(row.cells[3], `${row.id} closure result`, code);
    }
  } else if (unavailable) {
    assertExactValue(fields.get("Functional realization applicability"), "required", "Functional realization applicability", code);
    for (const label of ["Pen source", "Preview exports", "Read-back artifact"]) assertReasonedNotApplicable(fields.get(label), label, code);
    assertBoundBundlePaths(fields.get("Reference / route evidence"), previewArtifactSet, "Reference / route evidence", code, {
      forbiddenArtifacts: new Set(["draft/experience/manifest.md"]),
    });
    assertExactValue(fields.get("Process state"), "terminated", "Process state", code);
    if (!["yes", "no"].includes(fields.get("Live interactive help read"))) fail("Unavailable Pen route 必须记录 live help 结果。", { code });
    if (!["yes", "no"].includes(fields.get("Resumable handle retained")) && !isReasonedNotApplicable(fields.get("Resumable handle retained"))) fail("Unavailable Pen route handle 字段无效。", { code });
    if (!["seen", "not-seen-at-termination"].includes(fields.get("Initial prompt"))) fail("Unavailable Pen route prompt 字段无效。", { code });
    assertConcreteValue(fields.get("Terminal result"), "Terminal result", code);
    if (!/^unavailable:\s*\S.+$/iu.test(fields.get("Preview file result"))) fail("Unavailable Pen route 必须记录 preview unavailable reason。", { code });
    assertReasonedNotApplicable(fields.get("Agent visual capability"), "Agent visual capability", code);
    assertExactValue(fields.get("Preview presentation to Owner"), "unavailable", "Preview presentation to Owner", code);
    assertExactValue(fields.get("Save / clean exit"), "no", "Save / clean exit", code);
    for (const row of coverageRows) assertExactValue(row.cells[5], "unverified", `${row.id} sync result`, code);
    for (const row of coverageRows) assertUnavailableValue(row.cells[2], `${row.id} unavailable artifact locator`, code);
    for (const row of journeyRows) {
      assertUnavailableValue(row.cells[2], `${row.id} unavailable observed path`, code);
      assertExactValue(row.cells[3], "unverified", `${row.id} closure result`, code);
    }
  }

  if (success) {
    assertExactValue(fields.get("Preview shown"), "yes", "Preview shown", code);
    assertConcreteValue(fields.get("Preview date"), "Preview date", code);
    assertConcreteValue(fields.get("PM/Owner functional review"), "PM/Owner functional review", code);
    assertConcreteValue(fields.get("PM/Owner preview approval date"), "PM/Owner preview approval date", code);
    assertConcreteValue(fields.get("Experience reason"), "Experience reason", code);
    if (fields.get("Experience reason").toLowerCase() === "tool-unavailable") fail("completed Experience 不能使用 tool-unavailable reason。", { code });
    for (const label of ["Behavior or functional drift", "Missing coverage", "Unresolved design gaps", "Dangling affordances", "Product risk", "PM/Owner continuation"]) assertExactValue(fields.get(label), "none", label, code);
    assertExactValue(fields.get("Experience status"), "completed", "Experience status", code);
  } else if (route === "not-needed") {
    assertExactValue(fields.get("Preview shown"), "no", "Preview shown", code);
    assertConcreteValue(fields.get("PM/Owner functional review"), "PM/Owner functional review", code);
    assertConcreteValue(fields.get("PM/Owner preview approval date"), "PM/Owner preview approval date", code);
    assertConcreteValue(fields.get("Experience reason"), "Experience reason", code);
    if (fields.get("Experience reason").toLowerCase() === "tool-unavailable") fail("not-needed Experience 不能使用 tool-unavailable reason。", { code });
    for (const label of ["Behavior or functional drift", "Missing coverage", "Unresolved design gaps", "Dangling affordances", "Product risk", "PM/Owner continuation"]) assertExactValue(fields.get(label), "none", label, code);
    assertExactValue(fields.get("Experience status"), "completed", "Experience status", code);
  } else {
    assertExactValue(fields.get("Preview shown"), "no", "Preview shown", code);
    assertReasonedNotApplicable(fields.get("Preview date"), "Preview date", code);
    assertReasonedNotApplicable(fields.get("PM/Owner functional review"), "PM/Owner functional review", code);
    assertConcreteValue(fields.get("PM/Owner preview approval date"), "PM/Owner continuation date", code);
    if (isNoneValue(fields.get("Missing coverage"))) fail("Unavailable Pen route 必须记录 missing coverage。", { code });
    assertExactValue(fields.get("Experience status"), "skipped-risk", "Experience status", code);
    assertExactValue(fields.get("Experience reason"), "tool-unavailable", "Experience reason", code);
    if (isNoneValue(fields.get("Product risk"))) fail("Unavailable Pen route 必须记录具体 product risk。", { code });
    if (fields.get("PM/Owner continuation") !== approvalWords) fail("Unavailable Pen route 必须绑定 exact Owner continuation。", { code });
  }
}

function assertArtifactsUnder(records, prefix, label) {
  const outside = records.filter((record) => !record.path.startsWith(prefix));
  if (outside.length) fail(`${label} 必须位于 ${prefix}`, { code: "path-boundary", details: outside.map((record) => record.path) });
}

async function verifyArtifact(root, artifact) {
  try {
    const { target } = await resolveInside(root, artifact.path, { expectedType: "file" });
    const actual = await sha256File(target);
    return actual === artifact.sha256 ? null : { kind: "artifact-hash", path: artifact.path, expected: artifact.sha256, actual };
  } catch (error) {
    if (error instanceof WorkflowError) return { kind: "artifact-missing", path: artifact.path, message: error.message };
    throw error;
  }
}

async function walkFiles(directory, relativeBase = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  const files = [];
  const portableNames = new Set();
  for (const entry of entries) {
    assertPortablePathSegment(entry.name, "快照路径");
    const portableName = portablePathKey(entry.name);
    if (portableNames.has(portableName)) fail(`快照目录含跨平台冲突名称：${entry.name}`, { code: "non-portable-path" });
    portableNames.add(portableName);
    const rel = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    const full = path.join(directory, entry.name);
    const metadata = await lstat(full);
    if (metadata.isSymbolicLink()) fail(`快照源不允许符号链接：${rel}`, { code: "snapshot-symlink" });
    if (metadata.isDirectory()) files.push(...await walkFiles(full, rel));
    else if (metadata.isFile()) files.push({ rel, full, size: metadata.size });
    else fail(`快照源含不支持的文件类型：${rel}`);
  }
  return files;
}

function parseCandidateReference(line, sourcePath, lineNumber) {
  if (!/^\s*-\s*Candidate (?:artifact|evidence)\s*[：:]/.test(line)) return null;
  const match = line.match(/^\s*-\s*Candidate (artifact|evidence)\s*[：:]\s*`([^`]+)`\s*$/);
  if (!match) fail(`Candidate 引用字段格式无效：${sourcePath}:${lineNumber}`, { code: "candidate-reference" });
  const locator = assertNonEmptyString(match[2], `Candidate ${match[1]}`);
  const filePart = locator.split("#", 1)[0];
  const rel = normalizeRelative(filePart, `Candidate ${match[1]}`);
  if (rel === "draft" || rel.startsWith("draft/") || rel === "source" || rel.startsWith("source/")) {
    fail(`Candidate 引用必须是 bundle-relative，不能使用 ${rel}`, { code: "candidate-reference" });
  }
  return { kind: match[1], rel };
}

function bundleEvidenceLocators(text) {
  const paths = [];
  for (const match of text.matchAll(/`(evidence\/[^`#]+\.md)(?:#[^`]*)?`/gu)) {
    paths.push(normalizeRelative(match[1], "Candidate evidence locator"));
  }
  return [...new Set(paths)];
}

async function candidateSelection(root, state) {
  const briefPath = "draft/experience/brief.md";
  const manifestPath = "draft/experience/manifest.md";
  const definitionArtifacts = new Set((state.approvals.definition?.artifacts ?? []).map((artifact) => artifact.path));
  const briefArtifacts = new Set((state.approvals.brief?.artifacts ?? []).map((artifact) => artifact.path));
  const previewArtifacts = new Set((state.approvals.preview?.artifacts ?? []).map((artifact) => artifact.path));
  if (!briefArtifacts.has(briefPath)) fail(`Brief approval 必须绑定 ${briefPath}`, { code: "candidate-reference" });
  if (!previewArtifacts.has(manifestPath)) fail(`Preview approval 必须绑定 ${manifestPath}`, { code: "candidate-reference" });

  const selectedPaths = new Set([...definitionArtifacts, ...briefArtifacts, ...previewArtifacts]);
  assertNoExplorationArtifacts([...selectedPaths].map((artifactPath) => ({ path: artifactPath })), "Candidate selection");
  if ([...selectedPaths].some((artifactPath) => !artifactPath.startsWith("draft/"))) fail("Candidate selection 只能来自 draft/ approval artifacts。", { code: "candidate-reference" });

  for (const artifactPath of definitionArtifacts) {
    if (!artifactPath.endsWith(".md")) continue;
    const text = await readArtifactText(root, artifactPath);
    for (const evidencePath of bundleEvidenceLocators(text)) {
      const draftPath = `draft/${evidencePath}`;
      if (!definitionArtifacts.has(draftPath)) fail(`Definition approval 必须显式绑定引用证据：${draftPath}`, { code: "candidate-reference" });
    }
  }

  const expectedExperience = [...new Set([...briefArtifacts, ...previewArtifacts].map((artifactPath) => artifactPath.slice("draft/".length)))].sort();
  const manifestReferences = new Set();
  const manifestText = await readArtifactText(root, manifestPath);
  for (const [index, line] of manifestText.split(/\r?\n/).entries()) {
    const reference = parseCandidateReference(line, "experience/manifest.md", index + 1);
    if (reference?.kind === "artifact") {
      await resolveInside(root, `draft/${reference.rel}`, { expectedType: "file" });
      manifestReferences.add(reference.rel);
    }
  }
  const declaredExperience = [...manifestReferences].sort();
  if (stableJson(declaredExperience) !== stableJson(expectedExperience)) {
    fail("Experience manifest 的 Candidate artifact 必须精确匹配当前 Brief/preview approval artifacts。", {
      code: "candidate-reference",
      details: { expected: expectedExperience, actual: declaredExperience },
    });
  }

  const files = [];
  for (const draftPath of [...selectedPaths].sort((left, right) => left.localeCompare(right, "en"))) {
    const bundleRelative = draftPath.slice("draft/".length);
    const { target } = await resolveInside(root, draftPath, { expectedType: "file" });
    const metadata = await lstat(target);
    files.push({ rel: bundleRelative, full: target, size: metadata.size });
  }
  return files;
}

async function scanFileForSecrets(file) {
  if (file.size > 50 * 1024 * 1024) fail(`单文件超过 50 MiB：${file.rel}`, { code: "snapshot-size" });
  if (file.size > 5 * 1024 * 1024) return;
  const bytes = await readFile(file.full);
  if (bytes.includes(0)) return;
  assertNoSecrets(bytes.toString("utf8"), `快照文件 ${file.rel}`);
}

async function buildSnapshot({ sourceDir, selectedFiles = null, supplementalFiles = [], tempDir, kind, id, deliveryId, sourceBinding, manifestExtra = {} }) {
  const baseFiles = selectedFiles ?? await walkFiles(sourceDir);
  const sourceFiles = [...baseFiles.filter((file) => !(kind === "release" && file.rel === "MANIFEST.json")), ...supplementalFiles]
    .map((file) => ({ ...file, rel: normalizeRelative(file.rel, "snapshot path") }))
    .sort((left, right) => left.rel.localeCompare(right.rel, "en"));
  const portablePaths = new Set();
  for (const file of sourceFiles) {
    const portable = portablePathKey(file.rel);
    if (portablePaths.has(portable)) fail(`快照输入路径重复：${file.rel}`, { code: "non-portable-path" });
    portablePaths.add(portable);
  }
  const total = sourceFiles.reduce((sum, file) => sum + file.size, 0);
  if (total > 200 * 1024 * 1024) fail("快照总大小超过 200 MiB。", { code: "snapshot-size" });
  await mkdir(tempDir, { recursive: false });
  const files = [];
  try {
    for (const file of sourceFiles) {
      const destination = path.join(tempDir, ...file.rel.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      let sourceHash;
      if (Object.hasOwn(file, "content")) {
        const bytes = Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content));
        if (bytes.length !== file.size) fail(`生成快照文件大小不一致：${file.rel}`, { code: "snapshot-size" });
        if (!bytes.includes(0)) assertNoSecrets(bytes.toString("utf8"), `快照文件 ${file.rel}`);
        await writeExclusiveComplete(destination, bytes);
        sourceHash = sha256Bytes(bytes);
      } else {
        await scanFileForSecrets(file);
        await copyFile(file.full, destination, fsConstants.COPYFILE_EXCL);
        sourceHash = await sha256File(file.full);
      }
      const copiedHash = await sha256File(destination);
      if (copiedHash !== sourceHash) fail(`快照回读 hash 不一致：${file.rel}`, { exitCode: EXIT.INTEGRITY, code: "snapshot-readback" });
      files.push({ path: file.rel, sha256: copiedHash, size: file.size });
    }
    const manifest = {
      schema_version: SCHEMA_VERSION,
      runtime_version: RUNTIME_VERSION,
      kind,
      id,
      delivery_id: deliveryId,
      source: sourceBinding,
      ...manifestExtra,
      files,
      aggregate_sha256: sha256Bytes(stableJson(files)),
    };
    await atomicWrite(path.join(tempDir, "MANIFEST.json"), stableJson(manifest, true));
    const manifestSha = await sha256File(path.join(tempDir, "MANIFEST.json"));
    return { manifest, manifestSha };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function developerHandoffContent({ state, releaseId, candidateManifest, reviewLocalPath }) {
  const candidatePaths = new Set(candidateManifest.files.map((record) => record.path));
  const definitionPaths = [...new Set((state.approvals.definition?.artifacts ?? [])
    .map((artifact) => artifact.path.slice("draft/".length))
    .filter((artifactPath) => candidatePaths.has(artifactPath)))].sort();
  const experiencePaths = [...new Set([...(state.approvals.brief?.artifacts ?? []), ...(state.approvals.preview?.artifacts ?? [])]
    .map((artifact) => artifact.path.slice("draft/".length))
    .filter((artifactPath) => candidatePaths.has(artifactPath)))].sort();
  const implementationTargets = experiencePaths.filter((artifactPath) => /(?:\.pen$|\/previews\/|readback)/iu.test(artifactPath));
  const list = (items) => items.length ? items.map((item) => `- \`${item}\``) : ["- none"];
  return [
    `# Developer handoff: ${state.title}`,
    "",
    "## Status",
    "",
    `- Release: \`${releaseId}\``,
    `- Candidate: \`${state.candidate.candidate_id}\``,
    "- Local delivery: complete",
    "- External sending: not implied or performed by Release creation",
    "- Production deployment: not performed",
    "",
    "This directory is ready for the user to copy, compress, or send manually.",
    "",
    "## Authoritative Definition files",
    "",
    ...list(definitionPaths),
    "",
    "## Authoritative Experience files",
    "",
    ...list(experiencePaths),
    "",
    "## Implementation targets",
    "",
    ...list(implementationTargets),
    "",
    "## Review",
    "",
    `- Review ID: \`${state.review.review_id}\``,
    `- Mode / outcome: \`${state.review.mode}\` / \`${state.review.outcome}\``,
    `- Report: \`${reviewLocalPath}\``,
    "",
    "Read the Review report and `experience/manifest.md` for limitations, accepted risks, evidence method, and preview/read-back details. Historical or exploratory Draft artifacts are intentionally excluded.",
    "",
  ].join("\n");
}

async function verifyManifest(root, manifestRelative, expectedKind, expected = {}) {
  let resolved;
  try {
    resolved = await resolveInside(root, manifestRelative, { expectedType: "file" });
  } catch (error) {
    if (error instanceof WorkflowError) return [{ kind: "manifest-missing", path: normalizeRelative(manifestRelative), message: error.message }];
    throw error;
  }
  const { rel, target } = resolved;
  let manifest;
  try { manifest = JSON.parse(await readFile(target, "utf8")); } catch {
    return [{ kind: "manifest-json", path: rel }];
  }
  const issues = [];
  if (!isPlainObject(manifest) || manifest.schema_version !== SCHEMA_VERSION || manifest.runtime_version !== RUNTIME_VERSION || manifest.kind !== expectedKind || !Array.isArray(manifest.files)) {
    return [{ kind: "manifest-schema", path: rel }];
  }
  if (expectedKind === "candidate" && (!isPlainObject(manifest.selection) || manifest.selection.mode !== "approval-bound")) {
    issues.push({ kind: "manifest-selection", path: rel });
  }
  if (expectedKind === "release") {
    if (manifest.release_format !== "developer-handoff") issues.push({ kind: "manifest-release-format", path: rel });
    const requiredFiles = ["DEVELOPER-HANDOFF.md", expected.reviewId ? `review/${expected.reviewId}.md` : null].filter(Boolean);
    for (const required of requiredFiles) {
      if (!manifest.files.some((record) => record?.path === required)) issues.push({ kind: "manifest-release-file", path: rel, required });
    }
  }
  if (expected.id && manifest.id !== expected.id) issues.push({ kind: "manifest-id", path: rel, expected: expected.id, actual: manifest.id });
  if (expected.deliveryId && manifest.delivery_id !== expected.deliveryId) issues.push({ kind: "manifest-delivery", path: rel, expected: expected.deliveryId, actual: manifest.delivery_id });
  if (expected.source) {
    for (const [key, value] of Object.entries(expected.source)) {
      if (manifest.source?.[key] !== value) issues.push({ kind: "manifest-source-binding", path: rel, field: key, expected: value, actual: manifest.source?.[key] });
    }
  }
  const directory = path.dirname(target);
  const actualEntries = (await walkFiles(directory)).filter((file) => file.rel !== "MANIFEST.json");
  const actualNames = actualEntries.map((file) => file.rel);
  const expectedNames = manifest.files.map((file) => file.path);
  if (stableJson(actualNames) !== stableJson(expectedNames)) issues.push({ kind: "manifest-file-set", path: rel, expected: expectedNames, actual: actualNames });
  for (const record of manifest.files) {
    if (!isPlainObject(record) || typeof record.path !== "string" || !/^[a-f0-9]{64}$/.test(record.sha256) || !Number.isInteger(record.size)) {
      issues.push({ kind: "manifest-record", path: rel });
      continue;
    }
    const recordRelative = `${path.posix.dirname(rel)}/${normalizeRelative(record.path)}`;
    let filePath;
    try {
      ({ target: filePath } = await resolveInside(root, recordRelative, { expectedType: "file" }));
    } catch (error) {
      if (!(error instanceof WorkflowError)) throw error;
      issues.push({ kind: "manifest-file-missing", path: record.path });
      continue;
    }
    const actualHash = await sha256File(filePath);
    if (actualHash !== record.sha256) issues.push({ kind: "manifest-file-hash", path: record.path, expected: record.sha256, actual: actualHash });
  }
  if (manifest.aggregate_sha256 !== sha256Bytes(stableJson(manifest.files))) issues.push({ kind: "manifest-aggregate", path: rel });
  return issues;
}

async function compareDraftToCandidate(root, candidate, state) {
  const manifestPath = `${candidate.path}/MANIFEST.json`;
  const { target } = await resolveInside(root, manifestPath);
  const manifest = JSON.parse(await readFile(target, "utf8"));
  const current = [];
  let selected;
  try {
    selected = await candidateSelection(root, state);
  } catch (error) {
    if (error instanceof WorkflowError) return [{ kind: "draft-candidate-selection", candidate_id: candidate.candidate_id, message: error.message }];
    throw error;
  }
  for (const file of selected) current.push({ path: file.rel, sha256: await sha256File(file.full), size: file.size });
  return stableJson(current) === stableJson(manifest.files) ? [] : [{ kind: "draft-candidate-drift", candidate_id: candidate.candidate_id }];
}

export async function validateStateIntegrity(root, state) {
  const issues = [];
  for (const [name, approval] of Object.entries(state.approvals)) {
    if (!approval) continue;
    for (const artifact of approval.artifacts) {
      const issue = await verifyArtifact(root, artifact);
      if (issue) issues.push({ scope: `approval:${name}`, event_id: approval.event_id, ...issue });
    }
  }
  if (state.last_brainstorm_patch) {
    for (const artifact of state.last_brainstorm_patch.artifacts) {
      const issue = await verifyArtifact(root, artifact);
      if (issue) issues.push({ scope: "brainstorm-patch", ...issue });
    }
  }
  const candidates = [...state.candidate_history, state.candidate].filter(Boolean);
  const reviews = [...state.review_history, state.review].filter(Boolean);
  const releases = [...state.release_history, state.release].filter(Boolean);
  const changes = [...state.change_history, state.active_change].filter(Boolean);

  for (const candidate of candidates) {
    const current = candidate === state.candidate;
    const scope = current ? "candidate" : `candidate-history:${candidate.candidate_id}`;
    const manifestPath = `${candidate.path}/MANIFEST.json`;
    const manifestIssues = await verifyManifest(root, manifestPath, "candidate", {
      id: candidate.candidate_id,
      deliveryId: state.delivery_id,
      source: candidate.source,
    });
    issues.push(...manifestIssues.map((issue) => ({ scope, ...issue })));
    if (!manifestIssues.length) {
      const manifestSha = await sha256File(path.join(root, ...normalizeRelative(manifestPath).split("/")));
      if (manifestSha !== candidate.manifest_sha256) issues.push({ scope, kind: "manifest-hash", expected: candidate.manifest_sha256, actual: manifestSha });
      if (current) issues.push(...(await compareDraftToCandidate(root, candidate, state)).map((issue) => ({ scope, ...issue })));
    }
  }

  for (const review of reviews) {
    const scope = review === state.review ? "review" : `review-history:${review.review_id}`;
    const candidate = candidates.find((item) => item.candidate_id === review.candidate_id && item.manifest_sha256 === review.candidate_manifest_sha256);
    if (!candidate) issues.push({ scope, kind: "candidate-binding" });
    for (const artifact of review.artifacts) {
      const issue = await verifyArtifact(root, artifact);
      if (issue) issues.push({ scope, ...issue });
    }
  }

  for (const release of releases) {
    const scope = release === state.release ? "release" : `release-history:${release.release_id}`;
    const manifestPath = `${release.path}/MANIFEST.json`;
    const manifestIssues = await verifyManifest(root, manifestPath, "release", {
      id: release.release_id,
      deliveryId: state.delivery_id,
      source: {
        candidate_id: release.candidate_id,
        candidate_manifest_sha256: release.candidate_manifest_sha256,
        review_id: release.review_id,
        review_report_sha256: release.review_report_sha256,
        handoff_event: release.handoff_event,
        change_id: release.change_id,
      },
      reviewId: release.review_id,
    });
    issues.push(...manifestIssues.map((issue) => ({ scope, ...issue })));
    if (!manifestIssues.length) {
      const actual = await sha256File(path.join(root, ...normalizeRelative(manifestPath).split("/")));
      if (actual !== release.manifest_sha256) issues.push({ scope, kind: "manifest-hash", expected: release.manifest_sha256, actual });
    }
    if (!candidates.some((candidate) => candidate.candidate_id === release.candidate_id && candidate.manifest_sha256 === release.candidate_manifest_sha256)) {
      issues.push({ scope, kind: "candidate-binding" });
    }
  }

  for (const change of changes) {
    const scope = change === state.active_change ? "change" : `change-history:${change.change_id}`;
    for (const artifact of change.artifacts) {
      const issue = await verifyArtifact(root, artifact);
      if (issue) issues.push({ scope, event_id: change.event_id, ...issue });
    }
    if (!releases.some((release) => release.release_id === change.baseline_release_id && release.manifest_sha256 === change.baseline_release_manifest_sha256)) {
      issues.push({ scope, kind: "baseline-release-binding" });
    }
    if (change.resulting_release_id && !releases.some((release) => release.release_id === change.resulting_release_id && release.event_id === change.resulting_release_event)) {
      issues.push({ scope, kind: "resulting-release-binding" });
    }
  }
  return issues;
}

function publicProjection(state) {
  return sorted(state);
}

export function renderStartHere(state) {
  const routeLabels = { definition: "定义", experience: "体验", candidate: "候选版本", handoff: "交付确认", release: "本地交付准备", complete: "完成" };
  const lines = [
    `# START HERE：${state.title ?? state.delivery_id}`,
    "",
    "> 本文件由 PM Workflow Runtime 生成。事件链是控制状态权威；请勿手工编辑本文件或 workflow-state.json。",
    "",
    "## 当前状态",
    "",
    `- 阶段：${routeLabels[state.phase] ?? state.phase}`,
    `- 状态：${state.status}`,
    `- 阻塞：${state.blocker}`,
    `- 下一 Skill：${state.next_skill}`,
    `- 唯一下一步：${state.next_action}`,
    `- 当前 revision：${state.revision}`,
    "",
    "## 当前证据绑定",
    "",
    `- Definition approval：${state.approvals.definition?.event_id ?? "pending"}`,
    `- Experience Brief approval：${state.approvals.brief?.event_id ?? "pending"}`,
    `- Preview / Experience approval：${state.approvals.preview?.event_id ?? "pending"}`,
    `- Candidate：${state.candidate?.candidate_id ?? "none"}`,
    `- Review：${state.review ? `${state.review.review_id} / ${state.review.mode} / ${state.review.outcome}` : "none"}`,
    `- Handoff confirmation：${state.handoff?.event_id ?? "pending"}`,
    `- Release：${state.release?.release_id ?? "none"}`,
    `- Optional sending audit：${state.sending.status}`,
    `- Optional receipt audit：${state.receipt.status}`,
    `- Change round：${state.active_change?.change_id ?? "none"}`,
    "",
    "## 可靠性边界",
    "",
    "Runtime 能机械拒绝经由本 CLI 发起的非法转移、陈旧 revision 和 hash 漂移；没有 Hook 时，Agent 仍可能绕过 CLI 直接调用原始工具。",
    "",
  ];
  return lines.join("\n");
}

async function writeProjections(root, state) {
  const { statePath, startPath } = await projectionWriteTargets(root);
  await atomicWrite(statePath, stableJson(publicProjection(state), true));
  await atomicWrite(startPath, renderStartHere(state));
}

async function projectionWriteTargets(root) {
  const { target: statePath } = await writablePathInside(root, "workflow-state.json");
  const { target: startPath } = await writablePathInside(root, "START-HERE.md");
  return { statePath, startPath };
}

async function currentProjectionIssues(root, state) {
  const issues = [];
  const expectedState = stableJson(publicProjection(state), true);
  const expectedStart = renderStartHere(state);
  for (const [name, expected] of [["workflow-state.json", expectedState], ["START-HERE.md", expectedStart]]) {
    if (!await lstatOrNull(path.join(root, name))) {
      issues.push({ kind: "projection-missing", path: name });
      continue;
    }
    const { target } = await resolveInside(root, name, { expectedType: "file" });
    const actual = await readFile(target, "utf8");
    if (actual !== expected) issues.push({ kind: "projection-drift", path: name });
  }
  return issues;
}

async function appendEvent(root, event) {
  const { target: filePath } = await resolveInside(root, `events/${eventFileName(event)}`, { mustExist: false });
  const content = stableJson(event, true);
  try {
    await writeExclusiveComplete(filePath, content);
  } catch (error) {
    if (error?.code === "EEXIST") fail(`事件文件已存在：${path.basename(filePath)}`, { exitCode: EXIT.CONFLICT, code: "event-exists" });
    throw error;
  }
  return eventHash(content);
}

function assertNoIntegrityIssues(issues, scopes = undefined) {
  const relevant = scopes ? issues.filter((issue) => scopes.some((scope) => issue.scope?.startsWith(scope))) : issues;
  if (relevant.length) fail("当前证据或快照 hash 已漂移；先运行 reconcile/validate。", { exitCode: EXIT.INTEGRITY, code: "integrity", details: relevant });
}

function assertPreCandidateRevisionIntegrity(issues, returnPhase, artifactPaths) {
  const allowedScopes = returnPhase === "definition"
    ? new Set(["approval:definition", "approval:brief", "approval:preview"])
    : new Set(["approval:brief", "approval:preview"]);
  const unexpected = issues.filter((issue) => {
    if (!allowedScopes.has(issue.scope)) return true;
    return issue.kind !== "artifact-hash" || !artifactPaths.has(issue.path);
  });
  if (unexpected.length) fail("Candidate 前修订只能接纳由本次 artifact 明确绑定的批准 hash 变化。", { exitCode: EXIT.INTEGRITY, code: "integrity", details: unexpected });
}

async function transition(rootInput, options, operation, builder) {
  const root = await rootRealPath(rootInput);
  await validateControlledDirectories(root, { requireAll: true });
  const releaseLock = await acquireLock(root, operation);
  try {
    const replayed = await replayDelivery(root);
    const expected = expectedRevision(options);
    if (expected !== replayed.state.revision) fail(`revision 冲突：期望 ${expected}，当前 ${replayed.state.revision}。`, { exitCode: EXIT.CONFLICT, code: "revision-conflict", details: { expected, actual: replayed.state.revision } });
    const integrity = await validateStateIntegrity(root, replayed.state);
    if (!["record-finding-resolution", "start-draft-revision"].includes(operation)) assertNoIntegrityIssues(integrity);
    await projectionWriteTargets(root);
    const built = await builder({ root, state: replayed.state, integrity });
    try {
      const event = makeEvent({ state: replayed.state, ...built.event });
      const nextState = reduceEvent(replayed.state, event);
      if (built.commit) await built.commit();
      const hash = await appendEvent(root, event);
      nextState.last_event_sha256 = hash;
      await writeProjections(root, nextState);
      return { ok: true, command: operation, event_id: event.event_id, revision: nextState.revision, state: publicProjection(nextState) };
    } catch (error) {
      if (built.abort) await built.abort();
      throw error;
    }
  } finally {
    await releaseLock();
  }
}

function deliverySlug(deliveryId) {
  return deliveryId.replace(/^DEL-/, "").toLowerCase();
}

export function validateReviewIdentity(options, mode) {
  const sourceSession = options["source-session"] ?? "unknown";
  const reviewSession = options["review-session"] ?? "unknown";
  const sourceModel = options["source-model"] ?? "unknown";
  const reviewModel = options["review-model"] ?? "unknown";
  validateReviewIdentityPayload({
    review_mode: mode,
    source_session_id: sourceSession,
    review_session_id: reviewSession,
    source_model: sourceModel,
    review_model: reviewModel,
  });
  return { sourceSession, reviewSession, sourceModel, reviewModel };
}

function helpObject(targetCommand = undefined) {
  const common = {
    runtime_version: RUNTIME_VERSION,
    schema_version: SCHEMA_VERSION,
    minimum_node_major: MINIMUM_NODE_MAJOR,
    exit_codes: EXIT,
  };
  if (!targetCommand) return { ...common, commands: Object.keys(COMMAND_FLAGS) };
  return {
    ...common,
    target_command: targetCommand,
    usage: `pm-workflow ${targetCommand} [options]`,
    options: [...COMMAND_FLAGS[targetCommand].map((flag) => `--${flag}`), "--help", "-h"],
  };
}

async function initCommand(options) {
  const rootAbsolute = path.resolve(requireOption(options, "root"));
  const deliveryId = assertIdentifier(requireOption(options, "delivery-id"), "DEL-", "--delivery-id");
  const title = assertNonEmptyString(requireOption(options, "title"), "--title");
  const owner = assertNonEmptyString(requireOption(options, "owner"), "--owner");
  assertNoSecrets({ title, owner }, "Delivery metadata");
  if (expectedRevision(options) !== 0) fail("init 的 --expect-revision 必须为 0。", { exitCode: EXIT.CONFLICT, code: "revision-conflict" });
  const state = initialState(deliveryId);
  const event = makeEvent({ state, type: "created", actor: actorFrom(options), payload: { title, owner }, artifacts: [] });
  await mkdir(rootAbsolute, { recursive: true });
  const rootMetadata = await lstat(rootAbsolute);
  if (rootMetadata.isSymbolicLink()) fail(`Delivery 根路径不能是符号链接：${rootAbsolute}`, { exitCode: EXIT.INTEGRITY, code: "path-symlink" });
  if (!rootMetadata.isDirectory()) fail(`Delivery 根路径不是目录：${rootAbsolute}`, { code: "invalid-root" });
  const root = await realpath(rootAbsolute);
  const existing = await readdir(root);
  if (existing.length) fail("Delivery 根目录必须为空。旧格式目录不受支持，请使用新的空目录。", { exitCode: EXIT.CONFLICT, code: "root-not-empty", details: existing.sort() });
  const releaseLock = await acquireLock(root, "init");
  try {
    for (const directory of CONTROLLED_DIRECTORIES) await mkdir(path.join(root, directory), { recursive: false });
    await validateControlledDirectories(root, { requireAll: true });
    const nextState = reduceEvent(state, event);
    const hash = await appendEvent(root, event);
    nextState.last_event_sha256 = hash;
    await writeProjections(root, nextState);
    return { ok: true, command: "init", event_id: event.event_id, revision: 1, state: publicProjection(nextState) };
  } finally {
    await releaseLock();
  }
}

async function executeCommand(command, options) {
  if (command === "help") return { ok: true, command: "help", ...helpObject(options.targetCommand) };
  if (command === "init") return initCommand(options);
  if (command === "doctor") {
    const nodeMajor = Number(process.versions.node.split(".")[0]);
    if (nodeMajor < MINIMUM_NODE_MAJOR) fail(`Node ${MINIMUM_NODE_MAJOR}+ required; current ${process.versions.node}.`, { exitCode: EXIT.UNAVAILABLE, code: "node-version" });
    let delivery = null;
    if (options.root) {
      const root = await rootRealPath(options.root);
      await validateControlledDirectories(root);
      const lockPath = path.join(root, "workflow.lock");
      const lockMetadata = await lstatOrNull(lockPath);
      if (lockMetadata?.isSymbolicLink() || (lockMetadata && !lockMetadata.isFile())) fail("workflow.lock 不是安全的普通文件。", { exitCode: EXIT.INTEGRITY, code: "path-symlink" });
      delivery = { root_has_lock: Boolean(lockMetadata) };
      if (delivery.root_has_lock) {
        try { delivery.lock = JSON.parse(await readFile(lockPath, "utf8")); } catch { delivery.lock = { unreadable: true }; }
      }
    }
    return { ok: true, command: "doctor", node: { version: process.versions.node, supported: true }, delivery };
  }
  const rootOption = requireOption(options, "root");
  if (["status", "next", "validate"].includes(command)) {
    const replayed = await replayDelivery(rootOption);
    const integrity = await validateStateIntegrity(replayed.root, replayed.state);
    const projectionIssues = await currentProjectionIssues(replayed.root, replayed.state);
    if (command === "status" || command === "next") return { ok: integrity.length === 0, command, state: publicProjection(replayed.state), integrity_issues: integrity, projection_issues: projectionIssues };
    if (command === "validate") {
      if (integrity.length || projectionIssues.length) fail("Delivery validation 失败。", { exitCode: EXIT.INTEGRITY, code: "validation", details: { integrity, projections: projectionIssues } });
      return { ok: true, command, revision: replayed.state.revision };
    }
  }
  if (command === "reconcile" || command === "render") {
    const root = await rootRealPath(rootOption);
    await validateControlledDirectories(root, { requireAll: true });
    const releaseLock = await acquireLock(root, command);
    try {
      const replayed = await replayDelivery(root);
      const integrity = await validateStateIntegrity(replayed.root, replayed.state);
      const projectionIssues = await currentProjectionIssues(replayed.root, replayed.state);
      if (command === "reconcile") {
        if (!options.check || Object.hasOwn(options, "expect-revision")) {
          const expected = expectedRevision(options);
          if (expected !== replayed.state.revision) fail(`reconcile revision 冲突：期望 ${expected}，当前 ${replayed.state.revision}。`, { exitCode: EXIT.CONFLICT, code: "revision-conflict", details: { expected, actual: replayed.state.revision } });
        }
        if (integrity.length) fail("事件引用的业务证据或不可变快照存在漂移；reconcile 不会捏造修复。", { exitCode: EXIT.INTEGRITY, code: "integrity", details: integrity });
        if (options.check) {
          if (projectionIssues.length) fail("生成投影需要重建。", { exitCode: EXIT.INTEGRITY, code: "projection-drift", details: projectionIssues });
          return { ok: true, command, check: true, revision: replayed.state.revision };
        }
        await writeProjections(replayed.root, replayed.state);
        return { ok: true, command, repaired: projectionIssues.map((issue) => issue.path), revision: replayed.state.revision };
      }
      const expected = expectedRevision(options);
      if (expected !== replayed.state.revision) fail(`render revision 冲突：期望 ${expected}，当前 ${replayed.state.revision}。`, { exitCode: EXIT.CONFLICT, code: "revision-conflict", details: { expected, actual: replayed.state.revision } });
      if (integrity.length) fail("证据存在漂移，拒绝掩盖为新投影。", { exitCode: EXIT.INTEGRITY, code: "integrity", details: integrity });
      await writeProjections(replayed.root, replayed.state);
      return { ok: true, command, revision: replayed.state.revision };
    } finally {
      await releaseLock();
    }
  }

  if (command === "record-brainstorm-patch") {
    return transition(rootOption, options, command, async ({ root, state, integrity }) => {
      assertNoIntegrityIssues(integrity, ["approval:definition"]);
      const patch = normalizeRelative(requireOption(options, "patch"), "--patch");
      const base = parseInteger(requireOption(options, "base-revision"), "--base-revision");
      const locator = assertNonEmptyString(requireOption(options, "decision-locator"), "--decision-locator");
      const artifacts = await artifactRecords(root, [patch]);
      assertArtifactsUnder(artifacts, "draft/", "Decision Patch");
      return { event: { type: "brainstorm-patch-recorded", actor: actorFrom(options), artifacts, payload: { base_draft_revision: base, decision_locator: locator, patch_path: patch } } };
    });
  }
  if (command === "start-change") {
    return transition(rootOption, options, command, async ({ root, state, integrity }) => {
      assertNoIntegrityIssues(integrity, ["release"]);
      const id = assertIdentifier(requireOption(options, "change-id"), "CHG-", "--change-id");
      const proposal = normalizeRelative(requireOption(options, "proposal"), "--proposal");
      if (proposal !== `changes/${id}.md`) fail(`Change Proposal 必须使用 changes/${id}.md。`, { code: "path-boundary" });
      const artifacts = await artifactRecords(root, [proposal]);
      return { event: { type: "change-started", actor: actorFrom(options), artifacts, payload: {
        change_id: id,
        change_path: proposal,
        approval_evidence: approvalEvidence(options),
        release_id: state.release?.release_id,
        release_manifest_sha256: state.release?.manifest_sha256,
      } } };
    });
  }
  if (command === "approve-definition") {
    return transition(rootOption, options, command, async ({ root }) => {
      const artifacts = await artifactRecords(root, options.artifact);
      assertArtifactsUnder(artifacts, "draft/", "Definition approval artifacts");
      await validateDefinitionExperienceRequirements(root, artifacts);
      return { event: { type: "definition-approved", actor: actorFrom(options), artifacts, payload: { approval_evidence: approvalEvidence(options) } } };
    });
  }
  if (command === "approve-brief") {
    return transition(rootOption, options, command, async ({ root, integrity }) => {
      assertNoIntegrityIssues(integrity, ["approval:definition"]);
      const route = assertEnum(requireOption(options, "experience-route"), ["pen", "existing-reference", "not-needed"], "--experience-route");
      const artifacts = await artifactRecords(root, options.artifact);
      assertArtifactsUnder(artifacts, "draft/", "Brief approval artifacts");
      await validateBriefJourneyContract(root, artifacts, route);
      return { event: { type: "brief-approved", actor: actorFrom(options), artifacts, payload: { approval_evidence: approvalEvidence(options), experience_route: route } } };
    });
  }
  if (command === "approve-preview") {
    return transition(rootOption, options, command, async ({ root, state, integrity }) => {
      assertNoIntegrityIssues(integrity, ["approval:definition", "approval:brief"]);
      const route = assertEnum(requireOption(options, "experience-route"), ["pen", "existing-reference", "not-needed"], "--experience-route");
      const artifacts = await artifactRecords(root, options.artifact);
      assertArtifactsUnder(artifacts, "draft/", "Preview approval artifacts");
      const evidence = approvalEvidence(options);
      await validateManifestJourneyEvidence(root, artifacts, route, state.approvals.brief?.artifacts, evidence);
      return { event: { type: "preview-approved", actor: actorFrom(options), artifacts, payload: { approval_evidence: evidence, experience_route: route } } };
    });
  }
  if (command === "start-draft-revision") {
    return transition(rootOption, options, command, async ({ root, integrity }) => {
      const returnPhase = assertEnum(requireOption(options, "return-phase"), ["definition", "experience"], "--return-phase");
      const artifacts = await artifactRecords(root, options.artifact);
      assertArtifactsUnder(artifacts, "draft/", "Candidate 前修订 artifacts");
      assertPreCandidateRevisionIntegrity(integrity, returnPhase, new Set(artifacts.map((artifact) => artifact.path)));
      return { event: { type: "draft-revision-started", actor: actorFrom(options), artifacts, payload: {
        return_phase: returnPhase,
        revision_evidence: approvalEvidence(options),
      } } };
    });
  }
  if (command === "freeze-candidate") {
    return transition(rootOption, options, command, async ({ root, state, integrity }) => {
      assertNoIntegrityIssues(integrity, ["approval:"]);
      const selectedFiles = await candidateSelection(root, state);
      const id = options["candidate-id"] ? assertIdentifier(options["candidate-id"], "CAND-", "--candidate-id") : `CAND-${deliverySlug(state.delivery_id)}-r${state.candidate_history.length + (state.candidate ? 2 : 1)}`;
      const finalRel = `candidates/${id}`;
      if (await pathExistsInside(root, finalRel)) fail(`Candidate 已存在：${id}`, { exitCode: EXIT.CONFLICT, code: "snapshot-exists" });
      const { target: finalPath } = await resolveInside(root, finalRel, { mustExist: false });
      const tempRel = `candidates/.tmp-${randomUUID()}`;
      const { target: tempPath } = await resolveInside(root, tempRel, { mustExist: false });
      const { target: draftRoot } = await resolveInside(root, "draft", { expectedType: "directory" });
      const built = await buildSnapshot({
        sourceDir: draftRoot,
        selectedFiles,
        tempDir: tempPath,
        kind: "candidate",
        id,
        deliveryId: state.delivery_id,
        sourceBinding: {
          draft_revision: state.draft_revision,
          definition_approval_event: state.approvals.definition?.event_id,
          brief_approval_event: state.approvals.brief?.event_id,
          preview_approval_event: state.approvals.preview?.event_id,
          change_id: state.active_change?.change_id ?? null,
          change_event: state.active_change?.event_id ?? null,
        },
        manifestExtra: { selection: { mode: "approval-bound" } },
      });
      return {
        event: {
          type: "candidate-frozen",
          actor: actorFrom(options),
          artifacts: [{ path: `${finalRel}/MANIFEST.json`, sha256: built.manifestSha }],
          payload: { candidate_id: id, candidate_path: finalRel, manifest_sha256: built.manifestSha, draft_revision: state.draft_revision },
        },
        commit: () => rename(tempPath, finalPath),
        abort: () => rm(tempPath, { recursive: true, force: true }),
      };
    });
  }
  if (command === "record-review") {
    return transition(rootOption, options, command, async ({ root, state, integrity }) => {
      assertNoIntegrityIssues(integrity, ["candidate", "approval:"]);
      const mode = assertEnum(requireOption(options, "review-mode"), REVIEW_MODES, "--review-mode");
      const identity = validateReviewIdentity(options, mode);
      const outcome = assertEnum(requireOption(options, "outcome"), REVIEW_OUTCOMES, "--outcome");
      const report = normalizeRelative(requireOption(options, "report"), "--report");
      if (!report.startsWith("reviews/")) fail("Review report 必须位于 reviews/。", { code: "path-boundary" });
      const reviewId = options["review-id"] ? assertIdentifier(options["review-id"], "REV-", "--review-id") : `REV-${deliverySlug(state.delivery_id)}-${String(state.review_history.length + 1).padStart(2, "0")}`;
      const findings = options["finding-id"] ?? [];
      if (new Set(findings).size !== findings.length) fail("--finding-id 不能重复。");
      const reportArtifacts = await artifactRecords(root, [report]);
      return { event: { type: "review-recorded", actor: actorFrom(options), artifacts: reportArtifacts, payload: {
        review_id: reviewId,
        review_path: report,
        review_mode: mode,
        outcome,
        candidate_id: state.candidate.candidate_id,
        candidate_manifest_sha256: state.candidate.manifest_sha256,
        source_session_id: identity.sourceSession,
        review_session_id: identity.reviewSession,
        source_model: identity.sourceModel,
        review_model: identity.reviewModel,
        finding_ids: findings,
      } } };
    });
  }
  if (command === "record-finding-resolution") {
    return transition(rootOption, options, command, async ({ root, integrity }) => {
      const disposition = assertEnum(requireOption(options, "disposition"), ["corrected", "accepted-risk", "withdrawn"], "--disposition");
      const returnPhase = disposition === "corrected" ? assertEnum(requireOption(options, "return-phase"), ["definition", "experience"], "--return-phase") : null;
      const relevantIntegrity = disposition === "corrected"
        ? integrity.filter((issue) => {
          if (issue.scope === "candidate" && issue.kind === "draft-candidate-drift") return false;
          if (returnPhase === "definition" && issue.scope?.startsWith("approval:")) return false;
          if (returnPhase === "experience" && ["approval:brief", "approval:preview"].includes(issue.scope)) return false;
          return true;
        })
        : integrity;
      assertNoIntegrityIssues(relevantIntegrity);
      const evidence = approvalEvidence(options);
      if (disposition !== "corrected" && options.artifact?.length) fail("仅 corrected Finding 可绑定修订 artifact。", { code: "event-artifacts" });
      const artifacts = disposition === "corrected" ? await artifactRecords(root, options.artifact) : [];
      if (disposition === "corrected") assertArtifactsUnder(artifacts, "draft/", "Finding correction artifacts");
      const findingValues = requireOption(options, "finding-id");
      if (!Array.isArray(findingValues) || findingValues.length !== 1) fail("record-finding-resolution 需要且只接受一个 --finding-id。");
      return { event: { type: "finding-resolution-recorded", actor: actorFrom(options), artifacts, payload: {
        finding_id: assertNonEmptyString(findingValues[0], "--finding-id"),
        disposition,
        return_phase: returnPhase,
        resolution_evidence: evidence,
      } } };
    });
  }
  if (command === "confirm-handoff") {
    return transition(rootOption, options, command, async ({ state, integrity }) => {
      assertNoIntegrityIssues(integrity, ["candidate", "review", "approval:"]);
      return { event: { type: "handoff-confirmed", actor: actorFrom(options), artifacts: [], payload: { confirmation_evidence: approvalEvidence(options), candidate_id: state.candidate?.candidate_id, candidate_manifest_sha256: state.candidate?.manifest_sha256 } } };
    });
  }
  if (command === "create-release") {
    return transition(rootOption, options, command, async ({ root, state, integrity }) => {
      assertNoIntegrityIssues(integrity, ["candidate", "review", "approval:"]);
      const releaseSequence = state.release_history.length + (state.release ? 2 : 1);
      const id = options["release-id"] ? assertIdentifier(options["release-id"], "REL-", "--release-id") : `REL-${deliverySlug(state.delivery_id)}-${String(releaseSequence).padStart(3, "0")}`;
      const finalRel = `releases/${id}`;
      if (await pathExistsInside(root, finalRel)) fail(`Release 已存在：${id}`, { exitCode: EXIT.CONFLICT, code: "snapshot-exists" });
      const { target: finalPath } = await resolveInside(root, finalRel, { mustExist: false });
      const { target: candidateRoot } = await resolveInside(root, state.candidate.path, { expectedType: "directory" });
      const { target: candidateManifestPath } = await resolveInside(root, `${state.candidate.path}/MANIFEST.json`, { expectedType: "file" });
      const candidateManifest = JSON.parse(await readFile(candidateManifestPath, "utf8"));
      const reviewArtifact = state.review?.artifacts.find((artifact) => artifact.path === state.review.path);
      if (!reviewArtifact) fail("Release 缺少当前 Review report artifact。", { code: "candidate-reference" });
      const { target: reviewPath } = await resolveInside(root, reviewArtifact.path, { expectedType: "file" });
      const reviewMetadata = await lstat(reviewPath);
      const reviewLocalPath = `review/${state.review.review_id}.md`;
      const handoffText = developerHandoffContent({ state, releaseId: id, candidateManifest, reviewLocalPath });
      const handoffBytes = Buffer.from(handoffText);
      const tempRel = `releases/.tmp-${randomUUID()}`;
      const { target: tempPath } = await resolveInside(root, tempRel, { mustExist: false });
      const built = await buildSnapshot({
        sourceDir: candidateRoot,
        supplementalFiles: [
          { rel: reviewLocalPath, full: reviewPath, size: reviewMetadata.size },
          { rel: "DEVELOPER-HANDOFF.md", content: handoffBytes, size: handoffBytes.length },
        ],
        tempDir: tempPath,
        kind: "release",
        id,
        deliveryId: state.delivery_id,
        sourceBinding: {
          candidate_id: state.candidate.candidate_id,
          candidate_manifest_sha256: state.candidate.manifest_sha256,
          review_id: state.review.review_id,
          review_report_sha256: reviewArtifact.sha256,
          handoff_event: state.handoff.event_id,
          change_id: state.active_change?.change_id ?? null,
        },
        manifestExtra: { release_format: "developer-handoff" },
      });
      return {
        event: {
          type: "release-created",
          actor: actorFrom(options),
          artifacts: [{ path: `${finalRel}/MANIFEST.json`, sha256: built.manifestSha }],
          payload: {
            release_id: id,
            release_path: finalRel,
            manifest_sha256: built.manifestSha,
            candidate_id: state.candidate.candidate_id,
            candidate_manifest_sha256: state.candidate.manifest_sha256,
            review_id: state.review.review_id,
            review_report_sha256: reviewArtifact.sha256,
            change_id: state.active_change?.change_id ?? null,
          },
        },
        commit: () => rename(tempPath, finalPath),
        abort: () => rm(tempPath, { recursive: true, force: true }),
      };
    });
  }
  if (command === "record-send") {
    return transition(rootOption, options, command, async ({ integrity }) => {
      assertNoIntegrityIssues(integrity, ["release"]);
      const payload = {
        send_status: assertEnum(requireOption(options, "send-status"), ["attempted", "sent-confirmed"], "--send-status"),
        channel: assertEnum(requireOption(options, "channel"), ["manual", "connector"], "--channel"),
        recipient: assertNonEmptyString(requireOption(options, "recipient"), "--recipient"),
        external_reference: assertNonEmptyString(requireOption(options, "external-ref"), "--external-ref"),
        send_evidence: approvalEvidence(options),
      };
      return { event: { type: "send-recorded", actor: actorFrom(options), artifacts: [], payload } };
    });
  }
  if (command === "record-receipt") {
    return transition(rootOption, options, command, async ({ integrity }) => {
      assertNoIntegrityIssues(integrity, ["release"]);
      const payload = {
        receipt_status: assertEnum(requireOption(options, "receipt-status"), RECEIPT_STATUSES, "--receipt-status"),
        recipient: assertNonEmptyString(requireOption(options, "recipient"), "--recipient"),
        external_reference: assertNonEmptyString(requireOption(options, "external-ref"), "--external-ref"),
        receipt_evidence: approvalEvidence(options),
      };
      return { event: { type: "receipt-recorded", actor: actorFrom(options), artifacts: [], payload } };
    });
  }
  fail(`命令未实现：${command}`, { code: "unknown-command" });
}

function plainMessage(result) {
  if (result.command === "doctor") return `阶段：环境诊断\n阻塞：none\n下一步：按当前生成状态继续。`;
  if (result.command === "help" && result.target_command) return `PM Workflow Runtime ${RUNTIME_VERSION}\n用法：${result.usage}\n选项：${result.options.join(", ")}`;
  if (result.command === "help") return `PM Workflow Runtime ${RUNTIME_VERSION}\n命令：${result.commands.join(", ")}`;
  if (result.state) return `阶段：${result.state.phase}\n阻塞：${result.state.blocker}\n下一步：${result.state.next_action}`;
  return `阶段：${result.command}\n阻塞：none\n下一步：按当前状态继续。`;
}

export async function runCli(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  let parsed;
  try {
    parsed = parseArgs(argv);
    const result = await executeCommand(parsed.command, parsed.options);
    if (parsed.options.json) io.stdout.write(stableJson(result, false));
    else io.stdout.write(`${plainMessage(result)}\n`);
    return EXIT.OK;
  } catch (error) {
    const workflowError = error instanceof WorkflowError ? error : new WorkflowError(error?.message ?? String(error), { exitCode: EXIT.INTEGRITY, code: "internal-error" });
    const jsonMode = Boolean(parsed?.options?.json || argv.includes("--json"));
    const response = { ok: false, error: { code: workflowError.code, message: workflowError.message, ...(workflowError.details === undefined ? {} : { details: workflowError.details }) } };
    if (jsonMode) io.stdout.write(stableJson(response, false));
    else io.stderr.write(`阶段：诊断\n阻塞：${workflowError.message}\n下一步：修正这一项后重试。\n`);
    return workflowError.exitCode;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  process.exitCode = await runCli(process.argv.slice(2));
}
