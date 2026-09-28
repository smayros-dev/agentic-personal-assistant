#!/usr/bin/env node
// Cross-platform shell launcher for npm scripts.
// Windows npm runs scripts through cmd.exe where `bash` is WSL; this locates
// a real Git Bash instead, so `npm start` / `npm run e2e` work everywhere.
// Usage: node scripts/run-sh.mjs <script.sh> [args...]
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [script, ...args] = process.argv.slice(2);
if (!script) {
  console.error("usage: node scripts/run-sh.mjs <script.sh> [args...]");
  process.exit(1);
}

function findBash() {
  if (process.platform !== "win32") return "bash";
  const candidates = [
    process.env.GIT_BASH,
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
    "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
  ].filter(Boolean);
  return candidates.find((c) => existsSync(c)) || "bash";
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.isAbsolute(script) ? script : path.join(root, script);

if (!existsSync(scriptPath)) {
  console.error(`script not found: ${scriptPath}`);
  process.exit(1);
}

const result = spawnSync(findBash(), [scriptPath, ...args], {
  stdio: "inherit",
  cwd: root,
  shell: false,
});
process.exit(result.status ?? 1);
