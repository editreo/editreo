---
name: setup
description: Check, install and test everything Editreo needs for AI video editing on Windows or Mac - FFmpeg, yt-dlp, Whisper (transcripts and captions), Remotion, Hyperframes, Node.js and Python. Installs only what is missing. Use before the first edit on a computer, when the session note says tools are missing, or when the user asks to set up Editreo.
---

Set up everything needed for AI video editing on this computer: FFmpeg, yt-dlp, Whisper (for transcripts and captions), Remotion, Hyperframes, Node.js and Python.

1. Check first. Run `editreo doctor` with the Bash tool. Each OK line is already installed and tested: never reinstall or upgrade it. If every line is OK, say "All tools ready" in one line and go straight to the next step of the user's task.
   - If `editreo` itself fails because Node.js is missing, install Node.js first (Windows: `winget install -e --id OpenJS.NodeJS.LTS`; Mac: `brew install node`).
2. Install only what is missing. Tell the user in one line which tools are missing and that you are installing them, then run each MISSING line's fix command one at a time, in the order shown. The fix commands are the official install steps (winget or Homebrew, pip, npm).
   - winget or Homebrew missing: the user must install it themselves (the fix line says how). Wait for them, then run `editreo doctor` again.
   - Use the Python that `editreo doctor` prints as PYTHON= for every pip command.
3. Test. Run `editreo doctor` again; every check runs the tool itself (FFmpeg with caption support, Whisper and yt-dlp import and version, Remotion and Hyperframes with their headless Chrome).
4. If anything still fails, fix it yourself before asking the user: read the error, retry the fix, try the other official method (for example the python.org or nodejs.org installer, `pip install --user`, or `hyperframes browser ensure --force`). A tool installed by winget or brew may need a new shell: if it is installed but not found, tell the user to close and reopen the Claude app, then run /editreo:setup again.
5. Finish with a simple checklist, one line per tool: tool, version, Working or Not working. For anything still not working, give the one thing the user must do.
