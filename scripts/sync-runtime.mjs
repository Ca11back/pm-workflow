#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const candidateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(candidateRoot, "runtime", "pm-workflow.mjs");
const skillNames = [
  "pm-brainstorm",
  "pm-definition",
  "pm-delivery",
  "pm-experience",
  "pm-handoff",
  "pm-reverse-review",
];

const source = await readFile(sourcePath);
const check = process.argv.includes("--check");
const unknown = process.argv.slice(2).filter((arg) => arg !== "--check");
if (unknown.length) {
  process.stderr.write(`Unknown arguments: ${unknown.join(", ")}\n`);
  process.exitCode = 2;
} else {
  const drift = [];
  for (const skill of skillNames) {
    const destination = path.join(candidateRoot, "skills", skill, "scripts", "pm-workflow.mjs");
    if (check) {
      try {
        const current = await readFile(destination);
        if (!current.equals(source)) drift.push(path.relative(candidateRoot, destination));
      } catch {
        drift.push(path.relative(candidateRoot, destination));
      }
    } else {
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, source, { mode: 0o755 });
    }
  }
  if (drift.length) {
    process.stderr.write(`Vendored runtime drift:\n${drift.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(check ? "Vendored runtime copies are byte-identical.\n" : "Vendored runtime synchronized to six Skills.\n");
  }
}
