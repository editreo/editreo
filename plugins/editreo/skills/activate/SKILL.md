---
name: activate
description: Activate an Editreo license key on this computer. Use when the user gives a key starting with ER- or asks to activate Editreo.
argument-hint: "ER-XXXX-XXXX-XXXX-XXXX"
disable-model-invocation: false
---

Run `editreo activate $ARGUMENTS` with the Bash tool and report the result in one or two lines.
If no key was given, ask the user for the key from their Editreo welcome email.
If it fails with "device limit reached", tell the user to email support to reset devices.
