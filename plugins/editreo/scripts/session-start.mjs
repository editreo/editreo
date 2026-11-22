// SessionStart hook: one short status line for Claude. Never blocks the session.
import { doctor, getToken, savedLicense } from "../bin/lib/core.mjs";

const lines = [];
try {
  if (!savedLicense()) {
    lines.push("Editreo: not activated. If the user wants to edit a video with an Editreo style, ask for their license key and run `editreo activate <key>`.");
  } else {
    const t = await getToken();
    lines.push(t.ok
      ? `Editreo: active, plan ${t.payload.plan}, styles ${t.payload.styles.includes("*") ? "all" : t.payload.styles.join(", ")}.`
      : `Editreo: license problem: ${t.error}`);
  }
  const missing = doctor().filter((c) => !c.ok);
  if (missing.length) lines.push(`Editreo setup: missing ${missing.map((c) => c.label).join(", ")}. Before any edit, offer to run /editreo:setup.`);
} catch (e) {
  lines.push(`Editreo: status check failed (${e.message}).`);
}
process.stdout.write(lines.join("\n") + "\n");
