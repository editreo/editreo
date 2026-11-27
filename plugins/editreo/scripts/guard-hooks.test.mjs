// Self-check for guard-hooks.mjs: node scripts/guard-hooks.test.mjs <a pack SKILL.md to use as the fake pack>
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const src = process.argv[2];
const home = mkdtempSync(join(tmpdir(), "edg-"));
mkdirSync(join(home, "packs", "demo"), { recursive: true });
copyFileSync(src, join(home, "packs", "demo", "SKILL.md"));
writeFileSync(join(home, "license.json"), JSON.stringify({ key: "ER-TEST-TEST-TEST-TEST" }));
const prose = readFileSync(src, "utf8").replace(/```[\s\S]*?```/g, " ").split(/\n\s*\n/).filter((p) => p.split(/\s+/).length > 40);
const para = prose[Math.floor(prose.length / 2)];
const hook = (ev) => spawnSync("node", [fileURLToPath(new URL("./guard-hooks.mjs", import.meta.url))],
  { input: JSON.stringify(ev), env: { ...process.env, EDITREO_HOME: home }, encoding: "utf8" });
const pre = (tool_name, tool_input) => hook({ hook_event_name: "PreToolUse", tool_name, tool_input }).status;
const P = join(home, "packs", "demo");

assert.equal(pre("Write", { file_path: "C:/Users/x/.claude/skills/my-style/SKILL.md", content: para }), 2, "pack prose into a skill");
assert.equal(pre("Write", { file_path: "C:/proj/notes.md", content: para + "\n" + para }), 2, "pack prose copied anywhere");
assert.equal(pre("Write", { file_path: "C:/Users/x/.claude/skills/s/SKILL.md", content: "Run editreo fetch demo, read PACK_DIR" }), 2, "skill that wraps the pack");
assert.equal(pre("Edit", { file_path: join(P, "SKILL.md"), new_string: "no license check" }), 2, "editing the pack");
assert.equal(pre("Bash", { command: `cp -r "${P}" ~/.claude/skills/demo` }), 2, "copy pack into skills");
assert.equal(pre("Bash", { command: `cd ~/.editreo/packs && zip -r style.zip demo` }), 2, "zip the packs");
assert.equal(pre("PowerShell", { command: `Copy-Item -Recurse "${P}" "$HOME\\.claude\\skills\\demo"` }), 2, "PowerShell copy into skills");
assert.equal(pre("Bash", { command: `rm -rf ~/.editreo/packs/demo/guard.py` }), 2, "deleting pack files");

// normal work stays allowed
assert.equal(pre("Write", { file_path: "C:/proj/src/Video.tsx", content: "export const A = () => null;" }), 0, "project code");
assert.equal(pre("Write", { file_path: "C:/Users/x/.claude/skills/other/SKILL.md", content: "# my own skill\nCut silences with ffmpeg." }), 0, "unrelated own skill");
assert.equal(pre("Bash", { command: `cp -r "${P}/template" "E:/Videos/reel1"` }), 0, "template into project");
assert.equal(pre("Bash", { command: "npx remotion render src/index.ts Full out.mp4 2>&1" }), 0, "render");
assert.equal(pre("Write", { file_path: "C:/proj/plan.md", content: para.split(/\s+/).slice(0, 15).join(" ") }), 0, "one short quote");

const ask = (prompt) => hook({ hook_event_name: "UserPromptSubmit", prompt }).stdout;
assert.match(ask("create a skill from this workflow"), /Editreo license reminder/);
assert.match(ask("Turn the Editreo style into a reusable prompt"), /Editreo license reminder/);
assert.equal(ask("make the captions bigger in this edit"), "");
assert.equal(ask("what is a good hook for a reel?"), "");
console.log("guard-hooks: all checks passed");
