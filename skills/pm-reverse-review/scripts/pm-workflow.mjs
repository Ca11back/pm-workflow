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
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const RUNTIME_VERSION = "2.0.0";
export const SCHEMA_VERSION = 2;
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
  "v1-imported",
  "brainstorm-patch-recorded",
  "definition-approved",
  "brief-approved",
  "preview-approved",
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
  "v1-imported": ["source_sha256", "migration_report"],
  "brainstorm-patch-recorded": ["base_draft_revision", "decision_locator", "patch_path"],
  "definition-approved": ["approval_evidence"],
  "brief-approved": ["approval_evidence", "experience_route"],
  "preview-approved": ["approval_evidence", "experience_route"],
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
  "release-created": ["release_id", "release_path", "manifest_sha256", "candidate_id", "candidate_manifest_sha256", "change_id"],
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
  doctor: ["root", "pen-help-file", "json"],
  "migrate-v1": ["root", "dry-run", "apply", "expect-revision", "actor-role", "actor-label", "json"],
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
const BOOLEAN_FLAGS = new Set(["json", "check", "dry-run", "apply"]);

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

function assertNullableString(value, label) {
  if (value !== null) assertNonEmptyString(value, label);
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) fail(`${label} 必须是字符串数组。`);
}

function validateMigrationReport(report) {
  assertExactKeys(report, [
    "schema", "title", "owner", "source_phase", "mapped_phase", "definition_approval_classification",
    "explicit_evidence", "observed", "contradictions", "missing", "can_apply",
  ], "migration_report");
  if (report.schema !== "v1-start-here-known-fields") fail("migration_report.schema 无效。");
  assertNonEmptyString(report.title, "migration_report.title");
  assertNonEmptyString(report.owner, "migration_report.owner");
  assertEnum(report.source_phase, ["definition", "experience"], "migration_report.source_phase");
  if (report.mapped_phase !== "definition") fail("V1 migration 只能安全映射到 Definition。", { code: "migration-state" });
  if (report.definition_approval_classification !== "not-evaluated") fail("V1 approval prose 不得被分类为 V2 approval。", { code: "migration-state" });
  assertExactKeys(report.explicit_evidence, ["definition_approval"], "migration_report.explicit_evidence");
  assertNullableString(report.explicit_evidence.definition_approval, "migration_report.explicit_evidence.definition_approval");
  assertExactKeys(report.observed, ["candidate_gate", "review_status", "release_sent", "receipt_status"], "migration_report.observed");
  for (const [key, value] of Object.entries(report.observed)) assertNullableString(value, `migration_report.observed.${key}`);
  assertStringArray(report.contradictions, "migration_report.contradictions");
  assertStringArray(report.missing, "migration_report.missing");
  if (report.can_apply !== true || report.contradictions.length || report.missing.length) fail("stored migration_report 必须是已验证可应用且无矛盾/缺项的报告。");
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
  const normalizedArgv = argv[0] === "--help" || argv[0] === "-h" ? ["help", ...argv.slice(1)] : argv;
  const [commandRaw, ...rest] = normalizedArgv;
  const command = commandRaw ?? "help";
  const allowed = COMMAND_FLAGS[command];
  if (!allowed) fail(`未知命令：${command}`, { code: "unknown-command" });
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
    migration: null,
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
    case "v1-imported": {
      assertReducer(state.revision === 0, "v1-imported 只能是首个事件。");
      state.title = event.payload.migration_report.title;
      state.owner = event.payload.migration_report.owner;
      state.migration = {
        source_sha256: event.payload.source_sha256,
        report: event.payload.migration_report,
        event_id: event.event_id,
      };
      state.phase = "definition";
      state.status = "ready";
      state.blocker = "V1 证据仅作为历史输入导入；必须重新取得明确的 V2 产品负责人批准";
      state.next_skill = "pm-definition";
      state.next_action = "核对产品定义并记录新的 V2 Owner approval";
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
      state.next_action = event.payload.experience_route === "pen" ? "按已探测 Pen contract 完成最小原型并展示预览" : "展示路线证据并取得明确确认";
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
      state.status = "blocked";
      state.blocker = "Release 仅已准备，尚无真实发送证据";
      state.next_skill = "pm-handoff";
      state.next_action = "由获授权人员或连接器发送并记录外部引用";
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
      if (event.payload.send_status === "sent-confirmed") {
        state.phase = "receipt";
        state.status = "blocked";
        state.blocker = "等待真实收件人确认";
        state.next_action = "取得并记录收件人的外部确认或处理结论";
      } else {
        state.status = "blocked";
        state.blocker = "发送尝试未被确认成功";
        state.next_action = "核对失败证据后重新发送或更换获授权渠道";
      }
      state.next_skill = "pm-handoff";
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
      state.next_action = "停止；后续可按真实外部结论补记 accepted 或 rejected";
      break;
    }
    case "change-started": {
      assertReducer(state.phase === "complete", "CHG 变更轮次只能从已完成的 Release receipt 开始。");
      assertReducer(Boolean(state.release), "CHG 变更轮次缺少当前 Release。");
      assertReducer(state.sending.status === "sent-confirmed", "CHG 变更轮次要求当前 Release 已确认发送。");
      assertReducer(RECEIPT_STATUSES.includes(state.receipt.status), "CHG 变更轮次要求外部 receipt 证据。");
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
  "v1-imported": {
    roles: ["pm-agent", "product-owner"],
    payload(payload) {
      assertSha(payload.source_sha256, "source_sha256");
      validateMigrationReport(payload.migration_report);
    },
    artifacts(event) {
      assertArtifactPaths(event, ["source/v1-START-HERE.md", "source/v1-migration-report.json"]);
      const byPath = new Map(event.artifacts.map((artifact) => [artifact.path, artifact.sha256]));
      if (byPath.get("source/v1-START-HERE.md") !== event.payload.source_sha256) fail("V1 source artifact hash 与 payload 不一致。", { code: "event-artifacts" });
      if (byPath.get("source/v1-migration-report.json") !== sha256Bytes(stableJson(event.payload.migration_report, true))) fail("V1 migration report artifact hash 与 payload 不一致。", { code: "event-artifacts" });
    },
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
    artifacts: (event) => assertArtifactPrefix(event, "draft/"),
  },
  "brief-approved": {
    roles: ["product-owner"],
    payload(payload) {
      assertNonEmptyString(payload.approval_evidence, "approval_evidence");
      assertEnum(payload.experience_route, ["pen", "existing-reference", "not-needed"], "experience_route");
    },
    artifacts(event) {
      assertArtifactPrefix(event, "draft/");
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
      if (!event.artifacts.some((artifact) => artifact.path === "draft/experience/manifest.md")) {
        fail("Preview approval 必须绑定 draft/experience/manifest.md。", { code: "candidate-reference" });
      }
    },
    state: (event, state) => assertReducer(event.payload.experience_route === state.experience_route, "Experience 路线与 Brief 不一致。"),
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
    if (error?.code === "ENOENT") fail("缺少 events/；可能是未迁移的 V1 Delivery。", { code: "migration-required" });
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

async function validateCandidateDraftReferences(root, state) {
  const briefPath = "draft/experience/brief.md";
  const manifestPath = "draft/experience/manifest.md";
  const briefArtifacts = new Set((state.approvals.brief?.artifacts ?? []).map((artifact) => artifact.path));
  const previewArtifacts = new Set((state.approvals.preview?.artifacts ?? []).map((artifact) => artifact.path));
  if (!briefArtifacts.has(briefPath)) fail(`Brief approval 必须绑定 ${briefPath}`, { code: "candidate-reference" });
  if (!previewArtifacts.has(manifestPath)) fail(`Preview approval 必须绑定 ${manifestPath}`, { code: "candidate-reference" });

  const { target: draftRoot } = await resolveInside(root, "draft", { expectedType: "directory" });
  const markdownFiles = (await walkFiles(draftRoot)).filter((file) => file.rel.endsWith(".md") && file.size <= 5 * 1024 * 1024);
  const manifestReferences = new Set();
  for (const file of markdownFiles) {
    const text = await readFile(file.full, "utf8");
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      const reference = parseCandidateReference(line, file.rel, index + 1);
      if (reference) {
        await resolveInside(root, `draft/${reference.rel}`, { expectedType: "file" });
        if (file.rel === "experience/manifest.md" && reference.kind === "artifact") manifestReferences.add(reference.rel);
      }
    }
  }

  for (const required of ["experience/brief.md", "experience/manifest.md"]) {
    if (!manifestReferences.has(required)) fail(`Experience manifest 缺少 Candidate artifact：${required}`, { code: "candidate-reference" });
  }
  for (const artifact of [...briefArtifacts, ...previewArtifacts]) {
    if (!artifact.startsWith("draft/")) continue;
    const bundleRelative = artifact.slice("draft/".length);
    if (!manifestReferences.has(bundleRelative)) fail(`Experience manifest 未列出已批准 artifact：${bundleRelative}`, { code: "candidate-reference" });
  }
}

async function scanFileForSecrets(file) {
  if (file.size > 50 * 1024 * 1024) fail(`单文件超过 50 MiB：${file.rel}`, { code: "snapshot-size" });
  if (file.size > 5 * 1024 * 1024) return;
  const bytes = await readFile(file.full);
  if (bytes.includes(0)) return;
  assertNoSecrets(bytes.toString("utf8"), `快照文件 ${file.rel}`);
}

async function buildSnapshot({ sourceDir, tempDir, kind, id, deliveryId, sourceBinding }) {
  const sourceFiles = (await walkFiles(sourceDir)).filter((file) => !(kind === "release" && file.rel === "MANIFEST.json"));
  const total = sourceFiles.reduce((sum, file) => sum + file.size, 0);
  if (total > 200 * 1024 * 1024) fail("快照总大小超过 200 MiB。", { code: "snapshot-size" });
  await mkdir(tempDir, { recursive: false });
  const files = [];
  try {
    for (const file of sourceFiles) {
      await scanFileForSecrets(file);
      const destination = path.join(tempDir, ...file.rel.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(file.full, destination, fsConstants.COPYFILE_EXCL);
      const copiedHash = await sha256File(destination);
      const sourceHash = await sha256File(file.full);
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

async function compareDraftToCandidate(root, candidate) {
  const manifestPath = `${candidate.path}/MANIFEST.json`;
  const { target } = await resolveInside(root, manifestPath);
  const manifest = JSON.parse(await readFile(target, "utf8"));
  const { target: draftRoot } = await resolveInside(root, "draft", { expectedType: "directory" });
  const draftFiles = await walkFiles(draftRoot);
  const current = [];
  for (const file of draftFiles) current.push({ path: file.rel, sha256: await sha256File(file.full), size: file.size });
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
      if (current) issues.push(...(await compareDraftToCandidate(root, candidate)).map((issue) => ({ scope, ...issue })));
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
        handoff_event: release.handoff_event,
        change_id: release.change_id,
      },
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
  const routeLabels = { definition: "定义", experience: "体验", candidate: "候选版本", handoff: "交付确认", release: "发布准备", receipt: "接收确认", complete: "完成" };
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
    `- Sending：${state.sending.status}`,
    `- Receipt：${state.receipt.status}`,
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

async function transition(rootInput, options, operation, builder) {
  const root = await rootRealPath(rootInput);
  await validateControlledDirectories(root, { requireAll: true });
  const releaseLock = await acquireLock(root, operation);
  try {
    const replayed = await replayDelivery(root);
    const expected = expectedRevision(options);
    if (expected !== replayed.state.revision) fail(`revision 冲突：期望 ${expected}，当前 ${replayed.state.revision}。`, { exitCode: EXIT.CONFLICT, code: "revision-conflict", details: { expected, actual: replayed.state.revision } });
    const integrity = await validateStateIntegrity(root, replayed.state);
    if (operation !== "record-finding-resolution") assertNoIntegrityIssues(integrity);
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

function helpObject() {
  return {
    runtime_version: RUNTIME_VERSION,
    schema_version: SCHEMA_VERSION,
    minimum_node_major: MINIMUM_NODE_MAJOR,
    commands: Object.keys(COMMAND_FLAGS),
    exit_codes: EXIT,
  };
}

export function parsePenHelp(helpText) {
  const normalized = helpText.replaceAll("\r\n", "\n").replace(/[ \t]+$/gm, "").trim();
  const tools = [...normalized.matchAll(/^#\s+([a-z][a-z0-9_]*)\s*\(/gm)].map((match) => match[1]).sort();
  const hasSave = /(?:^|\n)\s*save\(\)|\bsave (?:the )?(?:document|work)|\bpersist\b/i.test(normalized);
  const currentRequired = ["batch_design", "batch_get", "export_nodes", "get_editor_state", "get_screenshot", "snapshot_layout"];
  const current = currentRequired.every((tool) => tools.includes(tool)) && hasSave;
  const newerRead = tools.includes("get_app_state");
  const newerMutate = tools.includes("execute");
  const newerSave = hasSave || tools.some((tool) => /save|persist/.test(tool));
  const newerScreenshot = tools.some((tool) => /screenshot|preview/.test(tool));
  const newerExport = tools.some((tool) => /export/.test(tool));
  let contract = "unsupported";
  let supported = false;
  let missing = [];
  if (current) {
    contract = "pen-interactive-0.3-current";
    supported = true;
  } else if (newerRead && newerMutate && newerSave && newerScreenshot && newerExport) {
    contract = "pen-interactive-web-new";
    supported = true;
  } else {
    missing = currentRequired.filter((tool) => !tools.includes(tool));
    if (!hasSave) missing.push("save");
  }
  return {
    supported,
    contract,
    fingerprint_sha256: sha256Bytes(normalized),
    tools,
    missing,
    requires_live_state_read_before_mutation: true,
    records_help_only: true,
  };
}

function runPenHelp(options) {
  if (options["pen-help-file"]) {
    return readFile(path.resolve(options["pen-help-file"]), "utf8").then((text) => ({ text, source: "fixture" }));
  }
  const result = spawnSync("pen", ["interactive", "--help"], { encoding: "utf8", timeout: 15_000, env: process.env });
  if (result.error?.code === "ENOENT") fail("未找到 pen 可执行文件。", { exitCode: EXIT.UNAVAILABLE, code: "pen-unavailable" });
  if (result.error) fail(`Pen capability probe 失败：${result.error.message}`, { exitCode: EXIT.UNAVAILABLE, code: "pen-unavailable" });
  if (result.signal) fail(`Pen capability probe 被信号 ${result.signal} 终止。`, { exitCode: EXIT.UNAVAILABLE, code: "pen-unavailable" });
  if (result.status !== 0) fail(`Pen capability probe 退出码为 ${result.status}。`, { exitCode: EXIT.UNAVAILABLE, code: "pen-unavailable" });
  const text = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (!text.trim()) fail("Pen interactive help 没有输出。", { exitCode: EXIT.UNAVAILABLE, code: "pen-unavailable" });
  return Promise.resolve({ text, source: "live-help" });
}

function extractV1Field(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^- ${escaped}：(.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function stripTicks(value) {
  return value?.replaceAll("`", "").trim() ?? null;
}

export function parseV1StartHere(text) {
  const title = text.match(/^# START HERE：(.+)$/m)?.[1]?.trim() ?? null;
  const phaseRaw = stripTicks(extractV1Field(text, "Phase"));
  const phase = phaseRaw?.split(/\s*\|\s*/)[0]?.trim();
  const definitionApproval = extractV1Field(text, "Definition approval words / date");
  const candidateGate = stripTicks(extractV1Field(text, "Candidate gate result / date"));
  const reviewStatus = stripTicks(extractV1Field(text, "Review status"));
  const releaseSent = stripTicks(extractV1Field(text, "Release sent / date"));
  const receiptStatus = stripTicks(extractV1Field(text, "Receipt status"));
  const owner = extractV1Field(text, "PM / business Owner");
  const contradictions = [];
  const missing = [];
  if (!title) missing.push("title");
  if (!owner || /\{.+\}/.test(owner)) missing.push("owner");
  if (!phase || !["definition", "experience", "candidate", "review", "handoff", "release", "receipt", "change", "complete"].includes(phase)) missing.push("known phase");
  if (["candidate", "review", "handoff", "release", "receipt", "complete"].includes(phase) && !candidateGate?.startsWith("passed")) contradictions.push("advanced phase lacks passed Candidate gate");
  if (["candidate", "review", "handoff", "release", "receipt", "complete"].includes(phase)) contradictions.push("V1 Candidate identity cannot be mapped safely to independent CAND-* identity");
  if (receiptStatus?.startsWith("acknowledged") && !releaseSent?.startsWith("yes")) contradictions.push("acknowledged receipt without confirmed send");
  if (phase === "complete" && !receiptStatus?.startsWith("acknowledged")) contradictions.push("complete phase without acknowledged receipt");
  if (reviewStatus?.startsWith("passed") && !candidateGate?.startsWith("passed")) contradictions.push("passed Review without passed Candidate");
  if (phase && !["definition", "experience"].includes(phase)) contradictions.push("V1 phase cannot be mapped safely without independent V2 identities");
  return {
    schema: "v1-start-here-known-fields",
    title,
    owner,
    source_phase: phase,
    mapped_phase: "definition",
    definition_approval_classification: "not-evaluated",
    explicit_evidence: { definition_approval: definitionApproval },
    observed: { candidate_gate: candidateGate, review_status: reviewStatus, release_sent: releaseSent, receipt_status: receiptStatus },
    contradictions,
    missing,
    can_apply: contradictions.length === 0 && missing.length === 0,
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
  if (existing.length) fail("Delivery 根目录不是空目录；V1 Delivery 请使用 migrate-v1。", { exitCode: EXIT.CONFLICT, code: "root-not-empty", details: existing.sort() });
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

async function migrateV1Command(options) {
  const root = await rootRealPath(requireOption(options, "root"));
  await validateControlledDirectories(root);
  if (await lstatOrNull(path.join(root, "events"))) fail("该 Delivery 已有 V2 events/。", { exitCode: EXIT.CONFLICT, code: "already-migrated" });
  const { target: startPath } = await resolveInside(root, "START-HERE.md", { expectedType: "file" });
  const sourceBytes = await readFile(startPath);
  const report = parseV1StartHere(sourceBytes.toString("utf8"));
  if (!report.can_apply) fail("V1 migration 发现矛盾或缺项；不会推断批准。", { code: "migration-ambiguous", details: report });
  if (Boolean(options["dry-run"]) === Boolean(options.apply)) fail("migrate-v1 必须且只能选择 --dry-run 或 --apply。");
  if (!options.apply) return { ok: true, command: "migrate-v1", dry_run: true, report };
  if (expectedRevision(options) !== 0) fail("migrate-v1 apply 的 --expect-revision 必须为 0。", { exitCode: EXIT.CONFLICT, code: "revision-conflict" });
  for (const relative of ["source/v1-START-HERE.md", "source/v1-migration-report.json"]) {
    if (await lstatOrNull(path.join(root, ...relative.split("/")))) fail(`迁移目标已存在：${relative}`, { exitCode: EXIT.CONFLICT, code: "migration-target-exists" });
  }
  const reportBytes = stableJson(report, true);
  const artifacts = [
    { path: "source/v1-START-HERE.md", sha256: sha256Bytes(sourceBytes) },
    { path: "source/v1-migration-report.json", sha256: sha256Bytes(reportBytes) },
  ];
  const deliveryId = assertIdentifier(`DEL-${path.basename(root).toLowerCase().replace(/[^a-z0-9-]/g, "-")}`, "DEL-", "migration delivery_id");
  const state = initialState(deliveryId);
  const event = makeEvent({
    state,
    type: "v1-imported",
    actor: actorFrom(options),
    artifacts,
    payload: { source_sha256: sha256Bytes(sourceBytes), migration_report: report },
  });
  const releaseLock = await acquireLock(root, "migrate-v1");
  try {
    await projectionWriteTargets(root);
    for (const directory of CONTROLLED_DIRECTORIES) {
      if (!await lstatOrNull(path.join(root, directory))) await mkdir(path.join(root, directory), { recursive: false });
    }
    await validateControlledDirectories(root, { requireAll: true });
    const { target: preservedPath } = await resolveInside(root, "source/v1-START-HERE.md", { mustExist: false });
    const { target: reportPath } = await resolveInside(root, "source/v1-migration-report.json", { mustExist: false });
    await writeExclusiveComplete(preservedPath, sourceBytes);
    await writeExclusiveComplete(reportPath, reportBytes);
    const nextState = reduceEvent(state, event);
    const hash = await appendEvent(root, event);
    nextState.last_event_sha256 = hash;
    await writeProjections(root, nextState);
    return { ok: true, command: "migrate-v1", dry_run: false, event_id: event.event_id, revision: 1, report, state: publicProjection(nextState) };
  } finally {
    await releaseLock();
  }
}

async function executeCommand(command, options) {
  if (command === "help") return { ok: true, command: "help", ...helpObject() };
  if (command === "init") return initCommand(options);
  if (command === "migrate-v1") return migrateV1Command(options);
  if (command === "doctor") {
    const nodeMajor = Number(process.versions.node.split(".")[0]);
    if (nodeMajor < MINIMUM_NODE_MAJOR) fail(`Node ${MINIMUM_NODE_MAJOR}+ required; current ${process.versions.node}.`, { exitCode: EXIT.UNAVAILABLE, code: "node-version" });
    const help = await runPenHelp(options);
    const pen = parsePenHelp(help.text);
    if (!pen.supported) fail("Pen interactive capability contract 未识别或不完整。", { exitCode: EXIT.UNAVAILABLE, code: "pen-contract", details: { source: help.source, ...pen } });
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
    return { ok: true, command: "doctor", node: { version: process.versions.node, supported: true }, pen: { source: help.source, ...pen }, delivery };
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
      return { event: { type: "definition-approved", actor: actorFrom(options), artifacts, payload: { approval_evidence: approvalEvidence(options) } } };
    });
  }
  if (command === "approve-brief") {
    return transition(rootOption, options, command, async ({ root, integrity }) => {
      assertNoIntegrityIssues(integrity, ["approval:definition"]);
      const route = assertEnum(requireOption(options, "experience-route"), ["pen", "existing-reference", "not-needed"], "--experience-route");
      const artifacts = await artifactRecords(root, options.artifact);
      assertArtifactsUnder(artifacts, "draft/", "Brief approval artifacts");
      return { event: { type: "brief-approved", actor: actorFrom(options), artifacts, payload: { approval_evidence: approvalEvidence(options), experience_route: route } } };
    });
  }
  if (command === "approve-preview") {
    return transition(rootOption, options, command, async ({ root, integrity }) => {
      assertNoIntegrityIssues(integrity, ["approval:definition", "approval:brief"]);
      const route = assertEnum(requireOption(options, "experience-route"), ["pen", "existing-reference", "not-needed"], "--experience-route");
      const artifacts = await artifactRecords(root, options.artifact);
      assertArtifactsUnder(artifacts, "draft/", "Preview approval artifacts");
      return { event: { type: "preview-approved", actor: actorFrom(options), artifacts, payload: { approval_evidence: approvalEvidence(options), experience_route: route } } };
    });
  }
  if (command === "freeze-candidate") {
    return transition(rootOption, options, command, async ({ root, state, integrity }) => {
      assertNoIntegrityIssues(integrity, ["approval:"]);
      await validateCandidateDraftReferences(root, state);
      const id = options["candidate-id"] ? assertIdentifier(options["candidate-id"], "CAND-", "--candidate-id") : `CAND-${deliverySlug(state.delivery_id)}-r${state.candidate_history.length + (state.candidate ? 2 : 1)}`;
      const finalRel = `candidates/${id}`;
      if (await pathExistsInside(root, finalRel)) fail(`Candidate 已存在：${id}`, { exitCode: EXIT.CONFLICT, code: "snapshot-exists" });
      const { target: finalPath } = await resolveInside(root, finalRel, { mustExist: false });
      const tempRel = `candidates/.tmp-${randomUUID()}`;
      const { target: tempPath } = await resolveInside(root, tempRel, { mustExist: false });
      const { target: draftRoot } = await resolveInside(root, "draft", { expectedType: "directory" });
      const built = await buildSnapshot({
        sourceDir: draftRoot,
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
      const id = options["release-id"] ? assertIdentifier(options["release-id"], "REL-", "--release-id") : `REL-${deliverySlug(state.delivery_id)}-v${state.release_history.length + (state.release ? 2 : 1)}`;
      const finalRel = `releases/${id}`;
      if (await pathExistsInside(root, finalRel)) fail(`Release 已存在：${id}`, { exitCode: EXIT.CONFLICT, code: "snapshot-exists" });
      const { target: finalPath } = await resolveInside(root, finalRel, { mustExist: false });
      const { target: candidateRoot } = await resolveInside(root, state.candidate.path, { expectedType: "directory" });
      const tempRel = `releases/.tmp-${randomUUID()}`;
      const { target: tempPath } = await resolveInside(root, tempRel, { mustExist: false });
      const built = await buildSnapshot({
        sourceDir: candidateRoot,
        tempDir: tempPath,
        kind: "release",
        id,
        deliveryId: state.delivery_id,
        sourceBinding: {
          candidate_id: state.candidate.candidate_id,
          candidate_manifest_sha256: state.candidate.manifest_sha256,
          handoff_event: state.handoff.event_id,
          change_id: state.active_change?.change_id ?? null,
        },
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
  if (result.command === "doctor") return `阶段：环境诊断\n阻塞：none\n下一步：先执行一次非破坏性 Pen state read，再允许任何 mutation。`;
  if (result.command === "help") return `PM Workflow Runtime ${RUNTIME_VERSION}\n命令：${result.commands.join(", ")}`;
  if (result.state) return `阶段：${result.state.phase}\n阻塞：${result.state.blocker}\n下一步：${result.state.next_action}`;
  if (result.report) return `阶段：V1 迁移检查\n阻塞：none\n下一步：${result.dry_run ? "审阅迁移报告后用 --apply 明确应用。" : "按生成状态继续。"}`;
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
