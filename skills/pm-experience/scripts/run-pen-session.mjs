#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmod, link, lstat, mkdtemp, readFile, readdir, realpath, rmdir, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_PREVIEW_WAIT_MS = 3_000;
const MAX_CAPTURE_BYTES = 32 * 1024 * 1024;
const EXPERIENCE_PREFIX = "draft/experience/";
const ANSI_PATTERN = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MINIMUM_NODE_MAJOR = 20;
const EXIT = Object.freeze({ OK: 0, INVALID: 2, CONFLICT: 3, UNAVAILABLE: 4, INTEGRITY: 5 });
const SHORTHAND_OPERATION_PATTERN = /(?:^|[;\n])\s*(?:(?:const|let|var)\s+)?(?:[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*)?(I|U|D)\s*\(/m;

function maskQuotedAndCommentedText(value) {
  let result = "";
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    const next = value[index + 1];
    if (quote) {
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === quote) quote = null;
      result += current === "\n" ? "\n" : " ";
      continue;
    }
    if (lineComment) {
      if (current === "\n") lineComment = false;
      result += current === "\n" ? "\n" : " ";
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") {
        result += "  ";
        index += 1;
      } else {
        result += current === "\n" ? "\n" : " ";
      }
      if (current === "*" && next === "/") blockComment = false;
      continue;
    }
    if ((current === "\"" || current === "'" || current === "`") && !quote) {
      quote = current;
      result += " ";
      continue;
    }
    if (current === "/" && next === "/") {
      lineComment = true;
      result += "  ";
      index += 1;
      continue;
    }
    if (current === "/" && next === "*") {
      blockComment = true;
      result += "  ";
      index += 1;
      continue;
    }
    result += current;
  }
  return result;
}

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value === null || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(sorted(value));
}

export class PenSessionError extends Error {
  constructor(message, { exitCode = EXIT.INVALID, code = "invalid", details = undefined } = {}) {
    super(message);
    this.name = "PenSessionError";
    this.exitCode = exitCode;
    this.code = code;
    this.details = details;
  }
}

function fail(message, options) {
  throw new PenSessionError(message, options);
}

function nonEmpty(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} requires a non-empty value.`);
  return value.trim();
}

function parseRelative(input, label, extension = undefined) {
  const raw = nonEmpty(input, label);
  if (raw.includes("\0")) fail(`${label} contains NUL.`, { code: "path-boundary" });
  const slash = raw.replaceAll("\\", "/");
  if (path.posix.isAbsolute(slash) || /^[A-Za-z]:\//.test(slash)) fail(`${label} must be Delivery-relative.`, { code: "path-boundary" });
  if (slash.split("/").includes("..")) fail(`${label} must not contain path traversal.`, { code: "path-boundary" });
  const normalized = path.posix.normalize(slash).replace(/^\.\//, "");
  if (normalized === "." || normalized === ".." || normalized.startsWith("../") || !normalized.startsWith(EXPERIENCE_PREFIX)) {
    fail(`${label} must stay under draft/experience/.`, { code: "path-boundary" });
  }
  if (extension && path.posix.extname(normalized).toLowerCase() !== extension) fail(`${label} must end with ${extension}.`, { code: "path-boundary" });
  return normalized;
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

async function validateAbsoluteDirectory(input) {
  const absolute = path.resolve(nonEmpty(input, "--root"));
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const metadata = await lstatOrNull(current);
    if (!metadata) fail(`Delivery root does not exist: ${absolute}`, { code: "missing-root" });
    if (metadata.isSymbolicLink()) fail(`Delivery root path contains a symlink: ${current}`, { exitCode: EXIT.INTEGRITY, code: "path-symlink" });
    if (current !== absolute && !metadata.isDirectory()) fail(`Delivery root component is not a directory: ${current}`, { code: "path-type" });
  }
  const metadata = await lstat(absolute);
  if (!metadata.isDirectory()) fail(`Delivery root is not a directory: ${absolute}`, { code: "path-type" });
  return realpath(absolute);
}

async function resolveDeliveryPath(root, relative, { mustExist, expectedType = undefined }) {
  const target = path.resolve(root, ...relative.split("/"));
  if (!isInside(root, target)) fail(`Path escapes Delivery root: ${relative}`, { code: "path-boundary" });
  let current = root;
  const segments = relative.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    const metadata = await lstatOrNull(current);
    const last = index === segments.length - 1;
    if (!metadata) {
      if (!mustExist && last) break;
      fail(`Path does not exist: ${relative}`, { code: "missing-path" });
    }
    if (metadata.isSymbolicLink()) fail(`Pen session path contains a symlink: ${relative}`, { exitCode: EXIT.INTEGRITY, code: "path-symlink" });
    if (!last && !metadata.isDirectory()) fail(`Path component is not a directory: ${relative}`, { code: "path-type" });
    if (last && expectedType === "file" && !metadata.isFile()) fail(`Path is not a regular file: ${relative}`, { code: "path-type" });
    if (last && expectedType === "directory" && !metadata.isDirectory()) fail(`Path is not a directory: ${relative}`, { code: "path-type" });
  }
  const parent = await realpath(path.dirname(target));
  if (!isInside(root, parent)) fail(`Destination parent escapes Delivery root: ${relative}`, { code: "path-boundary" });
  if (mustExist) {
    const actual = await realpath(target);
    if (!isInside(root, actual)) fail(`Path resolves outside Delivery root: ${relative}`, { code: "path-boundary" });
  }
  return target;
}

async function preparePaths(options) {
  const root = await validateAbsoluteDirectory(options.root);
  await resolveDeliveryPath(root, "draft/experience", { mustExist: true, expectedType: "directory" });
  const designRelative = parseRelative(options.designFile, "--design-file");
  const outRelative = parseRelative(options.out, "--out", ".pen");
  const previewRelative = parseRelative(options.preview, "--preview", ".png");
  if (new Set([designRelative, outRelative, previewRelative]).size !== 3) fail("Design, output, and preview paths must be distinct.", { code: "path-boundary" });
  const designPath = await resolveDeliveryPath(root, designRelative, { mustExist: true, expectedType: "file" });
  const outPath = await resolveDeliveryPath(root, outRelative, { mustExist: false });
  const previewPath = await resolveDeliveryPath(root, previewRelative, { mustExist: false });
  return { root, designRelative, designPath, outRelative, outPath, previewRelative, previewPath };
}

function stripAnsi(value) {
  return value.replace(ANSI_PATTERN, "").replaceAll("\r", "");
}

function promptCount(value) {
  return (stripAnsi(value).match(/(?:^|\n)pen\s*>\s*/g) ?? []).length;
}

function commandBody(segment, command) {
  let clean = stripAnsi(segment);
  if (clean.startsWith(command)) clean = clean.slice(command.length);
  clean = clean.replace(/^\s*\n?/, "").replace(/(?:^|\n)pen\s*>\s*$/, "").trim();
  return clean;
}

function assertNoPenError(stdoutBody, stderrBody, step) {
  const combined = `${stdoutBody}\n${stripAnsi(stderrBody)}`;
  if (/(?:^|\n)\s*(?:\[ERROR\]|Error\b)/.test(combined)) fail(`Pen reported Error during ${step}.`, { exitCode: EXIT.UNAVAILABLE, code: "pen-error", details: { step } });
}

function parseJsonBody(body, step) {
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) fail(`Pen ${step} did not return JSON.`, { exitCode: EXIT.UNAVAILABLE, code: "pen-output", details: { step } });
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    fail(`Pen ${step} returned invalid JSON.`, { exitCode: EXIT.UNAVAILABLE, code: "pen-output", details: { step } });
  }
}

function decodePngBase64(value) {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    fail("Pen screenshot image is not strict base64.", { exitCode: EXIT.UNAVAILABLE, code: "screenshot-failed" });
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value || decoded.length <= PNG_SIGNATURE.length || !decoded.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    fail("Pen screenshot image is not a PNG payload.", { exitCode: EXIT.UNAVAILABLE, code: "screenshot-failed" });
  }
  return decoded;
}

export function buildSessionSteps(designInput) {
  return [
    { name: "state-read", line: "get_editor_state({ include_schema: false })" },
    { name: "design", line: `batch_design({ input: ${JSON.stringify(designInput)} })` },
    { name: "layout", line: "snapshot_layout({ maxDepth: 4, problemsOnly: true })" },
    { name: "screenshot", line: "get_screenshot({ nodeId: \"document\" })" },
    { name: "save", line: "save()" },
    { name: "readback", line: "batch_get({ readDepth: 2 })" },
    { name: "exit", line: "exit()" },
  ];
}

export function validateDesignInputContract(designInput) {
  // This is deliberately a narrow statement-start check, not a JavaScript or
  // Pen DSL parser. The discovered current contract documents full operation
  // names; display-name strings and other payload content remain untouched.
  const shorthand = maskQuotedAndCommentedText(designInput).match(SHORTHAND_OPERATION_PATTERN)?.[1];
  if (shorthand) {
    fail(`Design input uses unsupported shorthand operation ${shorthand}(); use Insert(), Update(), or Delete().`, {
      code: "design-operation-shorthand",
      details: { operation: shorthand, supported_operations: ["Insert", "Update", "Delete"] },
    });
  }
  return designInput;
}

export function defaultPenCommand(platform = process.platform) {
  if (platform === "win32") {
    fail("Shell-free Pen launch is not supported by this runner on Windows; the common pen.cmd shim requires a command shell.", { exitCode: EXIT.UNAVAILABLE, code: "platform-unsupported" });
  }
  return "pen";
}

function validateStep(step, stdoutBody, stderrBody, outPath) {
  assertNoPenError(stdoutBody, stderrBody, step.name);
  if (step.name === "state-read" && (!stdoutBody.includes("Currently active editor") || !stdoutBody.includes("Document State"))) {
    fail("Pen state read was not confirmed.", { exitCode: EXIT.UNAVAILABLE, code: "state-read" });
  }
  if (step.name === "design" && !/(?:^|\n)OK(?:\n|$)/m.test(stdoutBody)) fail("Pen design mutation was not confirmed.", { exitCode: EXIT.UNAVAILABLE, code: "design-unconfirmed" });
  if (step.name === "layout" && !stdoutBody.includes("No layout problems.")) fail("Pen layout check did not pass cleanly.", { exitCode: EXIT.UNAVAILABLE, code: "layout-failed" });
  if (step.name === "screenshot") {
    const result = parseJsonBody(stdoutBody, "screenshot");
    if (result.mimeType !== "image/png") fail("Pen screenshot MIME type was not image/png.", { exitCode: EXIT.UNAVAILABLE, code: "screenshot-failed" });
    decodePngBase64(result.image);
  }
  if (step.name === "save" && (!stdoutBody.includes("Saved") || !stdoutBody.includes(outPath))) fail("Pen save was not confirmed for the requested output.", { exitCode: EXIT.UNAVAILABLE, code: "save-unconfirmed" });
  if (step.name === "readback") {
    const result = parseJsonBody(stdoutBody, "readback");
    if (!Array.isArray(result.nodes) || result.nodes.length === 0) fail("Pen readback did not return non-empty document nodes.", { exitCode: EXIT.UNAVAILABLE, code: "readback-empty" });
  }
}

async function writeLine(stream, line) {
  await new Promise((resolve, reject) => {
    stream.write(`${line}\n`, (error) => error ? reject(error) : resolve());
  });
}

async function waitForPreview(previewPath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const metadata = await lstatOrNull(previewPath);
    if (metadata?.isFile() && !metadata.isSymbolicLink() && metadata.size > PNG_SIGNATURE.length) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  fail("Pen preview PNG was not produced after the design mutation.", { exitCode: EXIT.UNAVAILABLE, code: "preview-missing", details: { exists: Boolean(await lstatOrNull(previewPath)), bytes: (await lstatOrNull(previewPath))?.size ?? 0 } });
}

async function runInteractive({ penCommand, args, cwd, env, steps, outPath, previewPath, previewWaitMs, timeoutMs }) {
  const child = spawn(penCommand, args, { cwd, env, shell: false, stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let captureError = null;
  let processError = null;
  let closed = null;
  child.on("error", (error) => {
    processError = new PenSessionError(`Unable to run Pen: ${error.message}`, { exitCode: EXIT.UNAVAILABLE, code: "pen-unavailable" });
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (Buffer.byteLength(stdout) > MAX_CAPTURE_BYTES) captureError = new PenSessionError("Pen stdout exceeded the capture limit.", { exitCode: EXIT.UNAVAILABLE, code: "pen-output-limit" });
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
    if (Buffer.byteLength(stderr) > MAX_CAPTURE_BYTES) captureError = new PenSessionError("Pen stderr exceeded the capture limit.", { exitCode: EXIT.UNAVAILABLE, code: "pen-output-limit" });
  });
  const closePromise = new Promise((resolve) => child.once("close", (code, signal) => {
    closed = { code, signal };
    resolve(closed);
  }));

  function waitForPrompt(previousCount, label) {
    if (captureError) return Promise.reject(captureError);
    if (processError) return Promise.reject(processError);
    if (closed || child.exitCode !== null || child.signalCode !== null) {
      return Promise.reject(new PenSessionError(`Pen exited before ${label}.`, { exitCode: EXIT.UNAVAILABLE, code: "pen-exited", details: closed ?? { code: child.exitCode, signal: child.signalCode } }));
    }
    if (promptCount(stdout) > previousCount) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onData = () => {
        if (captureError) return finish(reject, captureError);
        if (promptCount(stdout) > previousCount) finish(resolve);
      };
      const onError = () => finish(reject, processError ?? new PenSessionError("Unable to run Pen.", { exitCode: EXIT.UNAVAILABLE, code: "pen-unavailable" }));
      const onClose = (code, signal) => finish(reject, new PenSessionError(`Pen exited before ${label}.`, { exitCode: EXIT.UNAVAILABLE, code: "pen-exited", details: { code, signal } }));
      const finish = (callback, value) => {
        child.stdout.off("data", onData);
        child.off("error", onError);
        child.off("close", onClose);
        callback(value);
      };
      child.stdout.on("data", onData);
      child.once("error", onError);
      child.once("close", onClose);
    });
  }

  async function sequence() {
    await waitForPrompt(0, "the initial prompt");
    assertNoPenError(commandBody(stdout, ""), stderr, "startup");
    const transcript = [];
    for (const step of steps) {
      const promptsBefore = promptCount(stdout);
      const stdoutStart = stdout.length;
      const stderrStart = stderr.length;
      try {
        await writeLine(child.stdin, step.line);
      } catch (error) {
        throw new PenSessionError(`Unable to write ${step.name} to Pen: ${error.message}`, { exitCode: EXIT.UNAVAILABLE, code: "pen-exited", details: { step: step.name } });
      }
      if (step.name === "exit") {
        const closed = await closePromise;
        const stdoutBody = commandBody(stdout.slice(stdoutStart), step.line);
        const stderrBody = stderr.slice(stderrStart);
        validateStep(step, stdoutBody, stderrBody, outPath);
        transcript.push({ name: step.name, stdout: stdoutBody, stderr: stripAnsi(stderrBody).trim() });
        if (captureError) throw captureError;
        if (processError) throw processError;
        return { closed, transcript };
      }
      await waitForPrompt(promptsBefore, `${step.name} prompt`);
      const stdoutBody = commandBody(stdout.slice(stdoutStart), step.line);
      const stderrBody = stderr.slice(stderrStart);
      validateStep(step, stdoutBody, stderrBody, outPath);
      if (step.name === "design") await waitForPreview(previewPath, previewWaitMs);
      transcript.push({ name: step.name, stdout: stdoutBody, stderr: stripAnsi(stderrBody).trim() });
    }
    fail("Pen session ended without exit().", { exitCode: EXIT.UNAVAILABLE, code: "pen-sequence" });
  }

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new PenSessionError(`Pen session timed out after ${timeoutMs} ms.`, { exitCode: EXIT.UNAVAILABLE, code: "pen-timeout" })), timeoutMs);
  });
  try {
    const result = await Promise.race([sequence(), timeout]);
    clearTimeout(timer);
    return { ...result, pid: child.pid, stdout, stderr };
  } catch (error) {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    await Promise.race([closePromise, new Promise((resolve) => setTimeout(resolve, 1_000))]);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    throw error;
  }
}

function fileIdentity(metadata) {
  return { dev: metadata.dev, ino: metadata.ino };
}

async function createTemporaryTargets(paths) {
  let directory;
  let temporary;
  try {
    directory = await mkdtemp(path.join(paths.root, "draft/experience/pen-session-"));
    const metadata = await lstat(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) fail("Pen temporary directory reservation is invalid.", { exitCode: EXIT.INTEGRITY, code: "temporary-invalid" });
    temporary = {
      directory,
      identity: fileIdentity(metadata),
      outPath: path.join(directory, "output.pen"),
      previewPath: path.join(directory, "preview.png"),
    };
    await chmod(directory, 0o700);
    return temporary;
  } catch (error) {
    if (temporary) {
      try {
        if (!(await temporaryDirectoryCurrent(temporary))) throw new Error("temporary directory identity changed");
        if ((await readdir(directory)).length === 0) await rmdir(directory);
      } catch {}
    } else if (directory) try { await rmdir(directory); } catch {}
    throw error;
  }
}

async function temporaryDirectoryCurrent(temporary) {
  const metadata = await lstatOrNull(temporary.directory);
  return metadata?.isDirectory() && !metadata.isSymbolicLink() && metadata.dev === temporary.identity.dev && metadata.ino === temporary.identity.ino;
}

async function cleanupTemporary(temporary, { allowVerifiedArtifacts = false } = {}) {
  try {
    if (!(await temporaryDirectoryCurrent(temporary))) return false;
    const entries = (await readdir(temporary.directory)).sort();
    if (entries.length === 0) {
      await rmdir(temporary.directory);
      return true;
    }
    if (!allowVerifiedArtifacts) return false;
    if (JSON.stringify(entries) !== JSON.stringify(["output.pen", "preview.png"])) return false;
    const outMetadata = await lstatOrNull(temporary.outPath);
    const previewMetadata = await lstatOrNull(temporary.previewPath);
    if (!outMetadata?.isFile() || outMetadata.isSymbolicLink() || !previewMetadata?.isFile() || previewMetadata.isSymbolicLink()) return false;
    await unlink(temporary.outPath);
    await unlink(temporary.previewPath);
    await rmdir(temporary.directory);
    return true;
  } catch {
    return false;
  }
}

async function verifyArtifacts(paths) {
  const outMetadata = await lstatOrNull(paths.outPath);
  const previewMetadata = await lstatOrNull(paths.previewPath);
  if (!outMetadata?.isFile() || outMetadata.isSymbolicLink() || outMetadata.size === 0) fail("Pen output file is missing or empty.", { exitCode: EXIT.UNAVAILABLE, code: "output-missing", details: { exists: Boolean(outMetadata), bytes: outMetadata?.size ?? 0 } });
  if (!previewMetadata?.isFile() || previewMetadata.isSymbolicLink() || previewMetadata.size <= PNG_SIGNATURE.length) fail("Pen preview PNG is missing or empty.", { exitCode: EXIT.UNAVAILABLE, code: "preview-missing", details: { exists: Boolean(previewMetadata), bytes: previewMetadata?.size ?? 0 } });
  const outBytes = await readFile(paths.outPath);
  const previewBytes = await readFile(paths.previewPath);
  let outText;
  try { outText = new TextDecoder("utf-8", { fatal: true }).decode(outBytes); } catch { fail("Saved Pen output is not valid UTF-8.", { exitCode: EXIT.INTEGRITY, code: "output-invalid" }); }
  let document;
  try { document = JSON.parse(outText); } catch { fail("Saved Pen output is not valid JSON.", { exitCode: EXIT.INTEGRITY, code: "output-invalid" }); }
  if (!Array.isArray(document?.children) || document.children.length === 0) fail("Saved Pen output has no document children.", { exitCode: EXIT.UNAVAILABLE, code: "output-empty" });
  if (!previewBytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) fail("Preview does not have a PNG signature.", { exitCode: EXIT.INTEGRITY, code: "preview-invalid" });
  return {
    outBuffer: outBytes,
    outBytes: outMetadata.size,
    outSha256: createHash("sha256").update(outBytes).digest("hex"),
    previewBuffer: previewBytes,
    previewBytes: previewMetadata.size,
    previewSha256: createHash("sha256").update(previewBytes).digest("hex"),
    topLevelNodes: document.children.length,
  };
}

async function assertFinalTargetsAbsent(paths, code = "target-exists") {
  for (const [relative, target] of [[paths.outRelative, paths.outPath], [paths.previewRelative, paths.previewPath]]) {
    if (await lstatOrNull(target)) fail(`Refusing to overwrite existing target: ${relative}`, { exitCode: EXIT.CONFLICT, code, details: { conflict_path: relative, published_paths: [], partial_publish: false } });
  }
}

async function publishArtifacts(paths, temporary, hook = undefined) {
  const published = [];
  const context = () => ({ paths, temporary, published_paths: [...published] });
  const invokeHook = async (stage) => {
    if (hook) await hook(stage, context());
  };
  await assertFinalTargetsAbsent(paths, "publish-conflict");
  const pairs = [
    { source: temporary.outPath, target: paths.outPath, relative: paths.outRelative, stage: "output" },
    { source: temporary.previewPath, target: paths.previewPath, relative: paths.previewRelative, stage: "preview" },
  ];
  for (const pair of pairs) {
    await invokeHook(`before-${pair.stage}`);
    if (await lstatOrNull(pair.target)) {
      fail(`Final publish target appeared before link: ${pair.relative}`, { exitCode: EXIT.CONFLICT, code: "publish-conflict", details: { conflict_path: pair.relative, published_paths: [...published], partial_publish: published.length > 0 } });
    }
    try {
      await link(pair.source, pair.target);
    } catch (error) {
      const conflict = error?.code === "EEXIST";
      fail(conflict ? `Final publish target already exists: ${pair.relative}` : `Unable to hard-link final publish target: ${pair.relative}`, {
        exitCode: conflict ? EXIT.CONFLICT : EXIT.INTEGRITY,
        code: conflict ? "publish-conflict" : "publish-failed",
        details: { conflict_path: conflict ? pair.relative : undefined, failed_path: pair.relative, cause_code: error?.code, published_paths: [...published], partial_publish: published.length > 0 },
      });
    }
    const sourceMetadata = await lstat(pair.source);
    const finalMetadata = await lstat(pair.target);
    if (!sourceMetadata.isFile() || sourceMetadata.isSymbolicLink() || !finalMetadata.isFile() || finalMetadata.isSymbolicLink() || sourceMetadata.dev !== finalMetadata.dev || sourceMetadata.ino !== finalMetadata.ino) {
      fail(`Published final is not the verified temporary inode: ${pair.relative}`, { exitCode: EXIT.INTEGRITY, code: "publish-mismatch", details: { failed_path: pair.relative, published_paths: [...published, pair.relative], partial_publish: true } });
    }
    published.push(pair.relative);
    await invokeHook(`after-${pair.stage}`);
  }
  return published;
}

export async function runPenSession(options, runtime = {}) {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < MINIMUM_NODE_MAJOR) fail(`Node ${MINIMUM_NODE_MAJOR}+ is required.`, { exitCode: EXIT.UNAVAILABLE, code: "node-version" });
  const paths = await preparePaths(options);
  const designBytes = await readFile(paths.designPath);
  if (designBytes.length === 0 || designBytes.length > 1024 * 1024 || designBytes.includes(0)) fail("Design input must be non-empty UTF-8 text under 1 MiB.", { code: "design-input" });
  let designInput;
  try { designInput = new TextDecoder("utf-8", { fatal: true }).decode(designBytes); } catch { fail("Design input must be valid UTF-8 text.", { code: "design-input" }); }
  if (!designInput.trim()) fail("Design input must not be blank.", { code: "design-input" });
  validateDesignInputContract(designInput);
  const steps = buildSessionSteps(designInput);
  const penCommand = runtime.penCommand ?? defaultPenCommand();
  const timeoutMs = runtime.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const previewWaitMs = runtime.previewWaitMs ?? DEFAULT_PREVIEW_WAIT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100) fail("timeoutMs must be an integer of at least 100 ms.");
  if (!Number.isInteger(previewWaitMs) || previewWaitMs < 25) fail("previewWaitMs must be an integer of at least 25 ms.");
  if (runtime.publishHook !== undefined && typeof runtime.publishHook !== "function") fail("publishHook must be a function when provided.");
  let temporaries;
  let publishedPaths = [];
  let temporaryArtifactsVerified = false;
  try {
    await assertFinalTargetsAbsent(paths);
    temporaries = await createTemporaryTargets(paths);
    const session = await runInteractive({
      penCommand,
      args: ["interactive", "--out", temporaries.outPath, "--enable-preview", "--preview-output", temporaries.previewPath],
      cwd: paths.root,
      env: runtime.env ?? process.env,
      steps,
      outPath: temporaries.outPath,
      previewPath: temporaries.previewPath,
      previewWaitMs,
      timeoutMs,
    });
    let outputWithoutCommandEchoes = session.stdout;
    for (const step of steps) outputWithoutCommandEchoes = outputWithoutCommandEchoes.replaceAll(step.line, "");
    assertNoPenError(outputWithoutCommandEchoes, session.stderr, "session");
    if (session.closed.signal) fail(`Pen session terminated by ${session.closed.signal}.`, { exitCode: EXIT.UNAVAILABLE, code: "pen-signal" });
    if (session.closed.code !== 0) fail(`Pen session exited with code ${session.closed.code}.`, { exitCode: EXIT.UNAVAILABLE, code: "pen-exit" });
    if (!(await temporaryDirectoryCurrent(temporaries))) fail("Pen temporary directory was replaced during the session.", { exitCode: EXIT.INTEGRITY, code: "temporary-replaced" });
    const temporaryArtifacts = await verifyArtifacts(temporaries);
    temporaryArtifactsVerified = true;
    publishedPaths = await publishArtifacts(paths, temporaries, runtime.publishHook);
    const artifacts = await verifyArtifacts(paths);
    if (artifacts.outSha256 !== temporaryArtifacts.outSha256 || artifacts.previewSha256 !== temporaryArtifacts.previewSha256) {
      fail("Published artifacts do not match verified Pen temporary artifacts.", { exitCode: EXIT.INTEGRITY, code: "publish-mismatch" });
    }
    if (runtime.publishHook) await runtime.publishHook("before-temp-cleanup", { paths, temporary: temporaries, published_paths: [...publishedPaths] });
    if (!(await cleanupTemporary(temporaries, { allowVerifiedArtifacts: true }))) {
      fail("Unable to clean verified Pen temporary artifacts safely.", { exitCode: EXIT.INTEGRITY, code: "temporary-cleanup", details: { temporary_directory: temporaries.directory, published_paths: [...publishedPaths], partial_publish: publishedPaths.length > 0 } });
    }
    return {
      ok: true,
      command: "run-pen-session",
      process_count: 1,
      steps: steps.map((step) => step.name),
      output: { path: paths.outRelative, bytes: artifacts.outBytes, sha256: artifacts.outSha256, top_level_nodes: artifacts.topLevelNodes },
      preview: { path: paths.previewRelative, bytes: artifacts.previewBytes, sha256: artifacts.previewSha256 },
      readback_confirmed: true,
    };
  } catch (error) {
    if (temporaries) await cleanupTemporary(temporaries, { allowVerifiedArtifacts: temporaryArtifactsVerified });
    throw error;
  }
}

export function parseArgs(argv) {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return { help: true, json: false };
  const allowed = new Set(["root", "design-file", "out", "preview", "json"]);
  const result = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--") || token === "--") fail(`Unexpected positional argument: ${token}`);
    const key = token.slice(2);
    if (!allowed.has(key)) fail(`Unknown option: --${key}`);
    if (Object.hasOwn(result, key) && key !== "json") fail(`Duplicate option: --${key}`);
    if (key === "json") {
      if (result.json) fail("Duplicate option: --json");
      result.json = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`Missing value for --${key}`);
    result[key] = value;
    index += 1;
  }
  for (const key of ["root", "design-file", "out", "preview"]) if (!Object.hasOwn(result, key)) fail(`Missing --${key}`);
  return { help: false, json: result.json, root: result.root, designFile: result["design-file"], out: result.out, preview: result.preview };
}

function helpObject() {
  return {
    ok: true,
    command: "help",
    usage: "run-pen-session.mjs --root <Delivery> --design-file draft/experience/<input.txt> --out draft/experience/<output.pen> --preview draft/experience/<preview.png> [--json]",
  };
}

export async function runCli(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  let parsed;
  try {
    parsed = parseArgs(argv);
    const result = parsed.help ? helpObject() : await runPenSession(parsed);
    if (parsed.json) io.stdout.write(stableJson(result, false));
    else if (parsed.help) io.stdout.write(`${result.usage}\n`);
    else io.stdout.write("Pen session completed with saved output, PNG preview, and readback evidence.\n");
    return EXIT.OK;
  } catch (error) {
    const known = error instanceof PenSessionError;
    const normalized = known ? error : new PenSessionError(error?.message ?? String(error), { exitCode: EXIT.INTEGRITY, code: "internal-error" });
    const response = { ok: false, error: { code: normalized.code, message: normalized.message, ...(normalized.details === undefined ? {} : { details: normalized.details }) } };
    if (parsed?.json || argv.includes("--json")) io.stdout.write(stableJson(response, false));
    else io.stderr.write(`${normalized.message}\n`);
    return normalized.exitCode;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) process.exitCode = await runCli(process.argv.slice(2));
