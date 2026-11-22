---
name: setup
description: Check and install the tools Editreo needs (FFmpeg, Node.js, Python and its video libraries). Use when the session note says tools are missing or the user asks to set up Editreo.
---

1. Run `editreo doctor` with the Bash tool. If it fails because Node.js is missing, install Node.js first with the user's OK (Windows: `winget install -e --id OpenJS.NodeJS.LTS`; Mac: `brew install node`, and Homebrew itself from https://brew.sh, which the user must run in Terminal).
2. For each MISSING line, show the user the fix command and ask before running it. Run them one at a time.
3. After installs, the shell may need a restart to see new tools. If `editreo doctor` still shows MISSING right after a winget or brew install, tell the user to close and reopen the Claude app, then run /editreo:setup again.
4. Finish with `editreo doctor` and a short checklist: tool, version, OK or MISSING.
