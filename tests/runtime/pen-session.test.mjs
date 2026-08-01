import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildSessionSteps,
  defaultPenCommand,
  parseArgs,
  PenSessionError,
  runCli,
  runPenSession,
  validateDesignInputContract,
} from "../../skills/pm-experience/scripts/run-pen-session.mjs";

const candidateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runnerPath = path.join(candidateRoot, "skills/pm-experience/scripts/run-pen-session.mjs");
const designRelative = "draft/experience/approved-design.txt";
const outRelative = "draft/experience/prototype.pen";
const previewRelative = "draft/experience/prototype.png";
const designInput = 'screen=Insert(document,{type:"frame",name:"Approved screen",width:480,height:320,fill:"#FFFFFF"})';

const fakePenSource = String.raw`#!/usr/bin/env node
const fs = require("node:fs");
const readline = require("node:readline");

const mode = process.env.FAKE_PEN_MODE || "success";
const logPath = process.env.FAKE_PEN_LOG;
const args = process.argv.slice(2);
const valueAfter = (flag) => args[args.indexOf(flag) + 1];
const outPath = valueAfter("--out");
const previewPath = valueAfter("--preview-output");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const log = (event) => fs.appendFileSync(logPath, JSON.stringify(event) + "\n");
const prompt = () => process.stdout.write("pen > ");
const reply = (body) => process.stdout.write(body + "\npen > ");
const decodeBatchDesignInput = (line) => {
  const match = line.match(/^batch_design\(\{ input: (.*) \}\)$/);
  if (!match) throw new Error("invalid batch_design envelope");
  const decoded = JSON.parse(match[1]);
  if (typeof decoded !== "string") throw new Error("batch_design input is not text");
  return decoded;
};
const maskQuotedAndCommentedText = (value) => {
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
      } else result += current === "\n" ? "\n" : " ";
      if (current === "*" && next === "/") blockComment = false;
      continue;
    }
    if (current === "\"" || current === "'" || current === String.fromCharCode(96)) {
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
};
const shorthandOperation = /(?:^|[;\n])\s*(?:(?:const|let|var)\s+)?(?:[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*)?(I|U|D)\s*\(/m;

log({ type: "process", pid: process.pid, args });
if (mode === "fast-exit") process.exit(9);
if (mode === "startup-error") process.stdout.write("Error: injected startup failure\n");
prompt();

const input = readline.createInterface({ input: process.stdin, terminal: false });
input.on("line", (line) => {
  log({ type: "line", line });
  process.stdout.write(line + "\n");
  if (line.startsWith("get_editor_state(")) {
    if (mode === "timeout") return;
    if (mode === "replace-empty-temp") {
      const directory = require("node:path").dirname(outPath);
      fs.rmSync(directory, { recursive: true });
      fs.mkdirSync(directory, { mode: 0o700 });
      reply("Error: replaced temporary directory");
      return;
    }
    reply("Currently active editor\nDocument State");
  } else if (line.startsWith("batch_design(")) {
    let mutation;
    try {
      mutation = decodeBatchDesignInput(line);
    } catch (error) {
      reply("Error: " + error.message);
      return;
    }
    log({ type: "batch-design-payload", input: mutation });
    const shorthand = maskQuotedAndCommentedText(mutation).match(shorthandOperation)?.[1];
    if (shorthand) {
      reply("Error: unsupported shorthand operation " + shorthand + "(); use Insert(), Update(), or Delete().");
      return;
    }
    if (mode === "delayed-preview") setTimeout(() => fs.writeFileSync(previewPath, png), 50);
    else if (mode !== "missing-preview" && mode !== "partial-temp") fs.writeFileSync(previewPath, png);
    if (mode === "foreign-temp") fs.writeFileSync(require("node:path").join(require("node:path").dirname(outPath), "foreign.txt"), "foreign-owner");
    if (mode === "partial-temp") fs.writeFileSync(outPath, "partial-output");
    reply("OK");
  } else if (line.startsWith("snapshot_layout(")) {
    reply(mode === "pen-error" || mode === "foreign-temp" || mode === "partial-temp" ? "Error: injected layout failure" : "No layout problems.");
  } else if (line.startsWith("get_screenshot(")) {
    const image = mode === "screenshot-nonbase64" ? "%%%%" : mode === "screenshot-nonpng" ? Buffer.from("not-a-png-image").toString("base64") : png.toString("base64");
    reply(JSON.stringify({ image, mimeType: "image/png" }));
  } else if (line === "save()") {
    if (mode === "invalid-output-utf8") fs.writeFileSync(outPath, Buffer.from([0xc3, 0x28]));
    else if (mode !== "missing-output") fs.writeFileSync(outPath, JSON.stringify({ children: [{ id: "screen-1", type: "frame" }] }));
    if (mode === "replaced-temp") {
      fs.unlinkSync(previewPath);
      fs.symlinkSync(process.env.FAKE_FOREIGN_TEMP, previewPath);
    }
    reply("Saved " + outPath);
  } else if (line.startsWith("batch_get(")) {
    reply(JSON.stringify({ nodes: mode === "empty-readback" ? [] : [{ id: "screen-1", type: "frame", ...(mode === "legitimate-error-content" ? { content: "Error" } : {}) }] }));
  } else if (line === "exit()") {
    if (mode === "exit-error") process.stdout.write("Error: injected exit failure\n");
    if (mode === "signal") process.kill(process.pid, "SIGTERM");
    else process.exit(mode === "nonzero" ? 7 : 0);
  } else {
    reply("Error: unexpected command");
  }
});
`;

async function makeFixture() {
  const root = await mkdtemp(path.join(candidateRoot, "tests/.pen-session-"));
  const experience = path.join(root, "draft/experience");
  await mkdir(experience, { recursive: true });
  await writeFile(path.join(root, designRelative), designInput, "utf8");
  const fakePen = path.join(root, "fake-pen.cjs");
  const logPath = path.join(root, "fake-pen.jsonl");
  const foreignTempPath = path.join(root, "foreign-temp-owner.txt");
  await writeFile(fakePen, fakePenSource, "utf8");
  await writeFile(foreignTempPath, "foreign-temp-owner", "utf8");
  await chmod(fakePen, 0o755);
  return {
    root,
    fakePen,
    logPath,
    foreignTempPath,
    options: { root, designFile: designRelative, out: outRelative, preview: previewRelative },
    outPath: path.join(root, outRelative),
    previewPath: path.join(root, previewRelative),
  };
}

async function cleanup(fixture) {
  await rm(fixture.root, { recursive: true, force: true });
}

async function fakeEvents(fixture) {
  try {
    return (await readFile(fixture.logPath, "utf8")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function runFake(fixture, mode = "success", extra = {}) {
  const { env: extraEnv = {}, ...runtime } = extra;
  return runPenSession(fixture.options, {
    penCommand: fixture.fakePen,
    timeoutMs: 2_000,
    previewWaitMs: 100,
    ...runtime,
    env: { ...process.env, ...extraEnv, FAKE_PEN_LOG: fixture.logPath, FAKE_PEN_MODE: mode, FAKE_FOREIGN_TEMP: fixture.foreignTempPath },
  });
}

function processArguments(events) {
  return events.find((event) => event.type === "process")?.args;
}

async function assertTemporaryRemoved(fixture) {
  const args = processArguments(await fakeEvents(fixture));
  if (!args) return;
  const tempOut = args[args.indexOf("--out") + 1];
  const tempPreview = args[args.indexOf("--preview-output") + 1];
  await assert.rejects(readFile(tempOut), { code: "ENOENT" });
  await assert.rejects(readFile(tempPreview), { code: "ENOENT" });
  await assert.rejects(readdir(path.dirname(tempOut)), { code: "ENOENT" });
}

async function expectFailure(fixture, mode, code, extra = {}) {
  await assert.rejects(runFake(fixture, mode, extra), (error) => {
    assert.ok(error instanceof PenSessionError);
    assert.equal(error.code, code);
    return true;
  });
  await assert.rejects(readFile(fixture.outPath), { code: "ENOENT" });
  await assert.rejects(readFile(fixture.previewPath), { code: "ENOENT" });
}

test("runner uses one Pen process and seven separate ordered commands", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  let hardLinkEvidence;
  const result = await runFake(fixture, "success", {
    publishHook: async (stage, context) => {
      if (stage !== "before-temp-cleanup") return;
      const [tempOut, finalOut, tempPreview, finalPreview] = await Promise.all([
        lstat(context.temporary.outPath), lstat(context.paths.outPath), lstat(context.temporary.previewPath), lstat(context.paths.previewPath),
      ]);
      const [tempOutBytes, finalOutBytes, tempPreviewBytes, finalPreviewBytes] = await Promise.all([
        readFile(context.temporary.outPath), readFile(context.paths.outPath), readFile(context.temporary.previewPath), readFile(context.paths.previewPath),
      ]);
      hardLinkEvidence = {
        outSameInode: tempOut.dev === finalOut.dev && tempOut.ino === finalOut.ino,
        previewSameInode: tempPreview.dev === finalPreview.dev && tempPreview.ino === finalPreview.ino,
        outSameBytes: tempOutBytes.equals(finalOutBytes),
        previewSameBytes: tempPreviewBytes.equals(finalPreviewBytes),
        outSha256: createHash("sha256").update(finalOutBytes).digest("hex"),
        previewSha256: createHash("sha256").update(finalPreviewBytes).digest("hex"),
      };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.process_count, 1);
  assert.deepEqual(result.steps, ["state-read", "design", "layout", "screenshot", "save", "readback", "exit"]);
  assert.equal(result.output.path, outRelative);
  assert.equal(result.output.top_level_nodes, 1);
  assert.equal(result.preview.path, previewRelative);
  assert.equal(result.readback_confirmed, true);
  assert.deepEqual(hardLinkEvidence, {
    outSameInode: true,
    previewSameInode: true,
    outSameBytes: true,
    previewSameBytes: true,
    outSha256: result.output.sha256,
    previewSha256: result.preview.sha256,
  });

  const events = await fakeEvents(fixture);
  const processes = events.filter((event) => event.type === "process");
  const lines = events.filter((event) => event.type === "line").map((event) => event.line);
  assert.equal(processes.length, 1);
  const args = processes[0].args;
  const tempOut = args[args.indexOf("--out") + 1];
  const tempPreview = args[args.indexOf("--preview-output") + 1];
  assert.deepEqual(args, ["interactive", "--out", tempOut, "--enable-preview", "--preview-output", tempPreview]);
  assert.notEqual(tempOut, fixture.outPath);
  assert.notEqual(tempPreview, fixture.previewPath);
  assert.equal(path.dirname(tempOut), path.dirname(tempPreview));
  assert.equal(path.dirname(path.dirname(tempOut)), path.join(fixture.root, "draft/experience"));
  assert.match(path.basename(path.dirname(tempOut)), /^pen-session-/);
  assert.deepEqual(lines, buildSessionSteps(designInput).map((step) => step.line));
  assert.deepEqual(events.filter((event) => event.type === "batch-design-payload"), [{ type: "batch-design-payload", input: designInput }]);
  assert.equal(lines.filter((line) => line.startsWith("batch_design(")).length, 1);
  assert.equal(lines.filter((line) => line === "save()").length, 1);
  assert.equal(lines.filter((line) => line === "exit()").length, 1);
  assert.ok(lines.every((line) => !line.includes("save();") && !line.includes("exit();")));
  assert.doesNotMatch(lines[2], /parentId/);
  assert.match(lines[3], /nodeId: "document"/);
  assert.match(await readFile(fixture.outPath, "utf8"), /screen-1/);
  assert.deepEqual((await readFile(fixture.previewPath)).subarray(0, 8), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  await assertTemporaryRemoved(fixture);
});

test("CLI emits JSON while still delegating to exactly one fake Pen process", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  const bin = path.join(fixture.root, "bin");
  await mkdir(bin);
  await symlink(fixture.fakePen, path.join(bin, "pen"));
  const child = spawnSync(process.execPath, [runnerPath,
    "--root", fixture.root,
    "--design-file", designRelative,
    "--out", outRelative,
    "--preview", previewRelative,
    "--json",
  ], {
    encoding: "utf8",
    timeout: 5_000,
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_PEN_LOG: fixture.logPath },
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  assert.equal(JSON.parse(child.stdout).process_count, 1);
  assert.equal((await fakeEvents(fixture)).filter((event) => event.type === "process").length, 1);
});

test("readback UI content named Error is data, not a Pen error sentinel", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  const result = await runFake(fixture, "legitimate-error-content");
  assert.equal(result.ok, true);
  await assertTemporaryRemoved(fixture);
});

test("runner waits for a delayed same-session preview before layout", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  const result = await runFake(fixture, "delayed-preview", { previewWaitMs: 250 });
  assert.equal(result.ok, true);
  assert.equal(result.process_count, 1);
  await assertTemporaryRemoved(fixture);
});

test("runner fails closed on Pen text errors, process failures, timeout, and incomplete evidence", async (t) => {
  const cases = [
    ["pen-error", "pen-error"],
    ["startup-error", "pen-error"],
    ["exit-error", "pen-error"],
    ["nonzero", "pen-exit"],
    ["signal", "pen-signal"],
    ["missing-output", "output-missing"],
    ["missing-preview", "preview-missing"],
    ["empty-readback", "readback-empty"],
    ["screenshot-nonbase64", "screenshot-failed"],
    ["screenshot-nonpng", "screenshot-failed"],
    ["invalid-output-utf8", "output-invalid"],
    ["fast-exit", "pen-exited"],
  ];
  for (const [mode, code] of cases) {
    await t.test(mode, async (st) => {
      const fixture = await makeFixture();
      st.after(() => cleanup(fixture));
      await expectFailure(fixture, mode, code);
    });
  }
  await t.test("timeout", async (st) => {
    const fixture = await makeFixture();
    st.after(() => cleanup(fixture));
    await expectFailure(fixture, "timeout", "pen-timeout", { timeoutMs: 150 });
    await assertTemporaryRemoved(fixture);
  });
});

test("design preflight rejects shorthand before Pen starts and allows full names and display-name parents", async (t) => {
  for (const operation of ["I", "U", "D"]) {
    await t.test(`rejects ${operation}()`, async (st) => {
      const fixture = await makeFixture();
      st.after(() => cleanup(fixture));
      await writeFile(path.join(fixture.root, designRelative), `node=${operation}(document,{type:"frame",name:"Bad shorthand"})`, "utf8");
      await assert.rejects(runFake(fixture), (error) => {
        assert.equal(error.code, "design-operation-shorthand");
        assert.equal(error.exitCode, 2);
        assert.deepEqual(error.details, { operation, supported_operations: ["Insert", "Update", "Delete"] });
        return true;
      });
      assert.deepEqual(await fakeEvents(fixture), []);
      assert.deepEqual((await readdir(path.join(fixture.root, "draft/experience"))).sort(), [path.basename(designRelative)]);
    });
  }

  const fullNameControl = 'page=Insert(document,{type:"frame",name:"Name parent"}); Insert("Name parent",{type:"text",name:"Child",content:"Visible"}); Update(page,{placeholder:false}); Delete(page)';
  assert.equal(validateDesignInputContract(fullNameControl), fullNameControl);
  const visibleTextControl = 'Insert(document,{type:"text",content:`\nI(not an operation)\nU(not an operation)\nD(not an operation)\n`})';
  assert.equal(validateDesignInputContract(visibleTextControl), visibleTextControl);
});

test("full-name multi-state input with a display-name parent completes", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  const multiState = 'normal=Insert(document,{type:"frame",name:"Coverage:NORMAL",width:480,height:320,placeholder:true}); Insert("Coverage:NORMAL",{type:"text",name:"Normal title",content:"Populated"}); Update(normal,{placeholder:false}); empty=Insert(document,{type:"frame",name:"Coverage:EMPTY",width:480,height:320,placeholder:true}); Insert(empty,{type:"text",name:"Empty message",content:"No items"}); Update(empty,{placeholder:false})';
  await writeFile(path.join(fixture.root, designRelative), multiState, "utf8");
  const result = await runFake(fixture);
  assert.equal(result.ok, true);
  assert.deepEqual((await fakeEvents(fixture)).filter((event) => event.type === "batch-design-payload"), [{ type: "batch-design-payload", input: multiState }]);
  await assertTemporaryRemoved(fixture);
});

test("fake Pen decodes the mutation payload and independently rejects shorthand", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  const shorthand = 'screen=I(document,{type:"frame",name:"Masked defect"})';
  const child = spawnSync(fixture.fakePen, ["interactive", "--out", path.join(fixture.root, "fake.pen"), "--enable-preview", "--preview-output", path.join(fixture.root, "fake.png")], {
    encoding: "utf8",
    input: `batch_design({ input: ${JSON.stringify(shorthand)} })\nexit()\n`,
    env: { ...process.env, FAKE_PEN_LOG: fixture.logPath, FAKE_PEN_MODE: "success", FAKE_FOREIGN_TEMP: fixture.foreignTempPath },
  });
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /unsupported shorthand operation I\(\)/);
  assert.deepEqual((await fakeEvents(fixture)).filter((event) => event.type === "batch-design-payload"), [{ type: "batch-design-payload", input: shorthand }]);
});

test("runner rejects existing targets before Pen starts", async (t) => {
  for (const target of ["outPath", "previewPath"]) {
    await t.test(target, async (st) => {
      const fixture = await makeFixture();
      st.after(() => cleanup(fixture));
      await writeFile(fixture[target], "do-not-overwrite", "utf8");
      await assert.rejects(runFake(fixture), (error) => error.code === "target-exists");
      assert.equal(await readFile(fixture[target], "utf8"), "do-not-overwrite");
      assert.deepEqual(await fakeEvents(fixture), []);
    });
  }
});

test("publish-time first-link conflict preserves the foreign final and reports no publish", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  await assert.rejects(runFake(fixture, "success", {
    publishHook: async (stage, context) => {
      if (stage === "before-output") await writeFile(context.paths.outPath, "foreign-owner", "utf8");
    },
  }), (error) => {
    assert.equal(error.code, "publish-conflict");
    assert.deepEqual(error.details, { conflict_path: outRelative, published_paths: [], partial_publish: false });
    return true;
  });
  assert.equal(await readFile(fixture.outPath, "utf8"), "foreign-owner");
  await assert.rejects(readFile(fixture.previewPath), { code: "ENOENT" });
  await assertTemporaryRemoved(fixture);
});

test("second-link conflict preserves verified partial output and foreign preview", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  await assert.rejects(runFake(fixture, "success", {
    publishHook: async (stage, context) => {
      if (stage === "after-output") await writeFile(context.paths.previewPath, "foreign-preview", "utf8");
    },
  }), (error) => {
    assert.equal(error.code, "publish-conflict");
    assert.deepEqual(error.details, { conflict_path: previewRelative, published_paths: [outRelative], partial_publish: true });
    return true;
  });
  assert.match(await readFile(fixture.outPath, "utf8"), /screen-1/);
  assert.equal(await readFile(fixture.previewPath, "utf8"), "foreign-preview");
  await assertTemporaryRemoved(fixture);
});

test("temporary cleanup removes only controlled artifacts and preserves unexpected files", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  await assert.rejects(runFake(fixture, "foreign-temp"), (error) => error.code === "pen-error");
  await assert.rejects(readFile(fixture.outPath), { code: "ENOENT" });
  await assert.rejects(readFile(fixture.previewPath), { code: "ENOENT" });
  const args = processArguments(await fakeEvents(fixture));
  const tempDirectory = path.dirname(args[args.indexOf("--out") + 1]);
  assert.equal(await readFile(path.join(tempDirectory, "foreign.txt"), "utf8"), "foreign-owner");
  assert.ok((await readFile(path.join(tempDirectory, "preview.png"))).length > 8);
  assert.deepEqual((await readdir(tempDirectory)).sort(), ["foreign.txt", "preview.png"]);
});

test("temporary cleanup preflight preserves both expected entries when one is replaced", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  await assert.rejects(runFake(fixture, "replaced-temp"), (error) => error.code === "preview-missing");
  const args = processArguments(await fakeEvents(fixture));
  const tempDirectory = path.dirname(args[args.indexOf("--out") + 1]);
  assert.match(await readFile(path.join(tempDirectory, "output.pen"), "utf8"), /screen-1/);
  assert.equal((await lstat(path.join(tempDirectory, "preview.png"))).isSymbolicLink(), true);
  assert.deepEqual((await readdir(tempDirectory)).sort(), ["output.pen", "preview.png"]);
  assert.equal(await readFile(fixture.foreignTempPath, "utf8"), "foreign-temp-owner");
});

test("temporary cleanup preserves a partial expected artifact set", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  await assert.rejects(runFake(fixture, "partial-temp"), (error) => error.code === "preview-missing");
  const args = processArguments(await fakeEvents(fixture));
  const tempDirectory = path.dirname(args[args.indexOf("--out") + 1]);
  assert.equal(await readFile(path.join(tempDirectory, "output.pen"), "utf8"), "partial-output");
  assert.deepEqual(await readdir(tempDirectory), ["output.pen"]);
});

test("early cleanup preserves an empty directory when its recorded identity changed", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  await assert.rejects(runFake(fixture, "replace-empty-temp"), (error) => error.code === "pen-error");
  const args = processArguments(await fakeEvents(fixture));
  const replacementDirectory = path.dirname(args[args.indexOf("--out") + 1]);
  assert.deepEqual(await readdir(replacementDirectory), []);
});

test("runner confines all three paths and rejects traversal and symlinks", async (t) => {
  const badPaths = [
    ["designFile", "../approved-design.txt"],
    ["designFile", "draft/experience/nested/../approved-design.txt"],
    ["out", "/outside.pen"],
    ["out", "draft/experience/../outside.pen"],
    ["preview", "draft/experience/../../outside.png"],
    ["preview", outRelative],
  ];
  for (const [key, value] of badPaths) {
    await t.test(`${key}:${value}`, async (st) => {
      const fixture = await makeFixture();
      st.after(() => cleanup(fixture));
      await assert.rejects(runFake({ ...fixture, options: { ...fixture.options, [key]: value } }), (error) => error.code === "path-boundary");
      assert.deepEqual(await fakeEvents(fixture), []);
    });
  }

  await t.test("symlink design input", async (st) => {
    const fixture = await makeFixture();
    st.after(() => cleanup(fixture));
    const linked = path.join(fixture.root, "draft/experience/linked-design.txt");
    await symlink(path.join(fixture.root, designRelative), linked);
    fixture.options.designFile = "draft/experience/linked-design.txt";
    await assert.rejects(runFake(fixture), (error) => error.code === "path-symlink");
    assert.deepEqual(await fakeEvents(fixture), []);
  });

  await t.test("symlink output parent", async (st) => {
    const fixture = await makeFixture();
    st.after(() => cleanup(fixture));
    await mkdir(path.join(fixture.root, "real-output"));
    await symlink(path.join(fixture.root, "real-output"), path.join(fixture.root, "draft/experience/linked"));
    fixture.options.out = "draft/experience/linked/prototype.pen";
    await assert.rejects(runFake(fixture), (error) => error.code === "path-symlink");
    assert.deepEqual(await fakeEvents(fixture), []);
  });
});

test("output and preview parents must be pre-created directories", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  fixture.options.out = "draft/experience/not-created/prototype.pen";
  await assert.rejects(runFake(fixture), (error) => error.code === "missing-path");
  assert.deepEqual(await fakeEvents(fixture), []);
});

test("design input rejects invalid UTF-8 before Pen starts", async (t) => {
  const fixture = await makeFixture();
  t.after(() => cleanup(fixture));
  await writeFile(path.join(fixture.root, designRelative), Buffer.from([0xc3, 0x28]));
  await assert.rejects(runFake(fixture), (error) => error.code === "design-input" && /UTF-8/.test(error.message));
  assert.deepEqual(await fakeEvents(fixture), []);
});

test("argument parser rejects duplicates and runCli reports structured failures", async () => {
  assert.equal(defaultPenCommand("linux"), "pen");
  assert.throws(() => defaultPenCommand("win32"), (error) => error.code === "platform-unsupported");
  assert.throws(() => parseArgs(["--root", "one", "--root", "two"]), /Duplicate option/);
  assert.throws(() => parseArgs(["--json", "--json"]), /Duplicate option/);
  assert.throws(() => parseArgs(["--wat"]), /Unknown option/);
  assert.throws(() => parseArgs(["positional"]), /Unexpected positional/);
  assert.throws(() => parseArgs(["--root"]), /Missing value/);
  assert.deepEqual(parseArgs(["--help"]), { help: true, json: false });

  let stdout = "";
  let stderr = "";
  const helpCode = await runCli(["--help"], { stdout: { write: (value) => { stdout += value; } }, stderr: { write: (value) => { stderr += value; } } });
  assert.equal(helpCode, 0);
  assert.match(stdout, /--design-file/);
  assert.equal(stderr, "");

  stdout = "";
  const failureCode = await runCli(["--json"], { stdout: { write: (value) => { stdout += value; } }, stderr: { write: () => {} } });
  assert.notEqual(failureCode, 0);
  assert.equal(JSON.parse(stdout).ok, false);
});
