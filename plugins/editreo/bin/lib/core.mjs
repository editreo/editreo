// Shared logic for the editreo CLI and the session hook. Node 18+, no dependencies.
import { createHash, createPublicKey, randomBytes, verify } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, hostname, platform, userInfo } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { API_BASE, PUBLIC_KEY_X } from "./config.mjs";

export const HOME = process.env.EDITREO_HOME || join(homedir(), ".editreo");
export const PACKS = join(HOME, "packs");
const LICENSE = join(HOME, "license.json");
const DEVICE = join(HOME, "device.json");

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const writeJson = (p, v) => { mkdirSync(HOME, { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2)); };
const now = () => Math.floor(Date.now() / 1000);

export function deviceId() {
  let d = readJson(DEVICE);
  if (!d) { d = { salt: randomBytes(8).toString("hex") }; writeJson(DEVICE, d); }
  let user = "user";
  try { user = userInfo().username; } catch {}
  return createHash("sha256").update(`${hostname()}|${user}|${platform()}|${d.salt}`).digest("hex").slice(0, 32);
}

// Offline check of a server token with the embedded public key.
export function checkToken(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  try {
    const pub = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: PUBLIC_KEY_X }, format: "jwk" });
    if (!verify(null, Buffer.from(body), pub, Buffer.from(sig, "base64url"))) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return p.exp > now() && p.dev === deviceId() ? p : null;
  } catch { return null; }
}

export const savedLicense = () => readJson(LICENSE);

export function wipePacks() { rmSync(PACKS, { recursive: true, force: true }); }

export function logout() { rmSync(LICENSE, { force: true }); wipePacks(); }

async function api(path, init = {}) {
  const r = await fetch(API_BASE + path, { ...init, signal: AbortSignal.timeout(15000) });
  return r;
}

// Returns {ok, token, payload, offline?, error?}. Refreshes when the token has < 2 days left.
export async function getToken({ key, force = false } = {}) {
  const saved = savedLicense() || {};
  key = (key || saved.key || "").trim().toUpperCase();
  if (!key) return { ok: false, error: "No license key. Run: editreo activate ER-XXXX-XXXX-XXXX-XXXX" };
  const cached = key === saved.key ? checkToken(saved.token) : null;
  if (cached && !force && cached.exp - now() > 2 * 86400) return { ok: true, token: saved.token, payload: cached };
  let r;
  try {
    r = await api("/v1/license", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, device: deviceId() }) });
  } catch {
    if (cached) return { ok: true, token: saved.token, payload: cached, offline: true };
    return { ok: false, error: "Cannot reach the Editreo server and no valid offline token. Check your internet." };
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 402 || r.status === 404) { logout(); }
    return { ok: false, status: r.status, error: j.error || `server error ${r.status}` };
  }
  const payload = checkToken(j.token);
  if (!payload) return { ok: false, error: "Server token failed verification. Update the plugin: /plugin marketplace update editreo" };
  writeJson(LICENSE, { key, token: j.token });
  return { ok: true, token: j.token, payload };
}

export const allowed = (payload, style) => payload.styles.includes("*") || payload.styles.includes(style);

// .version holds the server etag of the downloaded pack.
function packMeta(style) {
  try { return { version: readFileSync(join(PACKS, style, ".version"), "utf8").trim() }; } catch { return null; }
}

function unzip(zipPath, dest) {
  // bsdtar reads zip on Windows 10+ and macOS. Git Bash's GNU tar cannot, so call the system one.
  const tar = platform() === "win32" ? join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "tar";
  mkdirSync(dest, { recursive: true });
  execFileSync(tar, ["-xf", zipPath, "-C", dest], { stdio: "ignore" });
}

// Marks this buyer's copy in the license checks (a hash, never the key), so a leaked copy can be traced.
function stampCopy(dir, id) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) stampCopy(p, id);
    else if (/\.(py|mjs|ts|md)$/.test(f)) {
      const s = readFileSync(p, "utf8");
      if (s.includes("__EDITREO_COPY__")) writeFileSync(p, s.replaceAll("__EDITREO_COPY__", id));
    }
  }
}

// Downloads (or keeps) the pack for a style. Returns {ok, dir, version, updated} or {ok:false, error}.
export async function fetchPack(style) {
  const t = await getToken();
  if (!t.ok) return t;
  if (!allowed(t.payload, style)) return { ok: false, error: `"${style}" is not in your ${t.payload.plan} plan. Upgrade at the Editreo pricing page.` };
  const dir = join(PACKS, style);
  const have = packMeta(style);
  let r;
  try {
    r = await api(`/v1/pack/${style}`, { headers: { authorization: `Bearer ${t.token}`, ...(have ? { "x-have-version": String(have.version) } : {}) } });
  } catch {
    if (have) return { ok: true, dir, version: have.version, updated: false, offline: true };
    return { ok: false, error: "Cannot reach the Editreo server to download this style." };
  }
  if (r.status === 304) return { ok: true, dir, version: have.version, updated: false };
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    if (r.status === 402) logout();
    return { ok: false, status: r.status, error: j.error || `server error ${r.status}` };
  }
  const tmp = join(HOME, `.${style}.zip`);
  writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
  rmSync(dir, { recursive: true, force: true });
  try { unzip(tmp, dir); } finally { rmSync(tmp, { force: true }); }
  stampCopy(dir, createHash("sha256").update(t.payload.lic).digest("hex").slice(0, 16));
  writeFileSync(join(dir, ".license"), t.payload.lic);
  const version = r.headers.get("x-pack-version") || "";
  writeFileSync(join(dir, ".version"), version);
  return { ok: true, dir, version, updated: true };
}

// ---- setup doctor -------------------------------------------------------
// shell only for .cmd shims (npm on Windows); a shell would mangle python -c arguments.
function run(cmd, args, shell = false) {
  try { return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000, shell }).trim(); }
  catch { return null; }
}
const firstLine = (s) => (s || "").split(/\r?\n/)[0];

export function doctor() {
  const py = run("python", ["--version"]) ? "python" : run("python3", ["--version"]) ? "python3" : null;
  const checks = [
    { id: "ffmpeg", label: "FFmpeg", out: firstLine(run("ffmpeg", ["-version"])) },
    { id: "ffprobe", label: "FFprobe", out: firstLine(run("ffprobe", ["-version"])) },
    { id: "node", label: "Node.js", out: run("node", ["--version"]) },
    { id: "npm", label: "npm", out: platform() === "win32" ? run("npm --version", [], true) : run("npm", ["--version"]) },
    { id: "python", label: "Python", out: py && run(py, ["--version"]) },
    { id: "whisper", label: "faster-whisper", out: py && run(py, ["-c", "import faster_whisper;print(faster_whisper.__version__)"]) },
    { id: "ytdlp", label: "yt-dlp", out: run("yt-dlp", ["--version"]) || (py && run(py, ["-m", "yt_dlp", "--version"])) },
  ];
  const win = platform() === "win32";
  const fix = {
    ffmpeg: win ? "winget install -e --id Gyan.FFmpeg" : "brew install ffmpeg",
    ffprobe: win ? "winget install -e --id Gyan.FFmpeg" : "brew install ffmpeg",
    node: win ? "winget install -e --id OpenJS.NodeJS.LTS" : "brew install node",
    npm: win ? "winget install -e --id OpenJS.NodeJS.LTS" : "brew install node",
    python: win ? "winget install -e --id Python.Python.3.12" : "brew install python",
    whisper: `${py || (win ? "python" : "python3")} -m pip install --upgrade faster-whisper`,
    ytdlp: `${py || (win ? "python" : "python3")} -m pip install --upgrade yt-dlp`,
  };
  for (const c of checks) { c.ok = !!c.out; c.fix = c.ok ? null : fix[c.id]; }
  return checks;
}
