# READ FIRST – Rules for IBM Bob (anti-hallucination contract)

You are building **Book Worm**, an online bookstore (React web app + REST API + PostgreSQL).
Source of truth, in priority order:

1. `docs/design/*.png` – the UI wireframes (pixel/layout reference).
2. `docs/01-REQUIREMENTS.md` – what to build (IDs like `FR-CAT-03`).
3. `docs/02-ARCHITECTURE.md` – stack, folder structure, coding standards, data model, API.
4. `docs/03-TASKS.md` – the order of work and the gate for each task.

## Hard rules

1. **Do only the task you were given.** Do not start the next task. Stop at its Definition of Done and report.
2. **Do not invent.** If something is not in these documents or the wireframes, do NOT guess. Add it to `docs/OPEN-QUESTIONS.md` (question + your proposed default) and continue with the documented default, or stop and ask.
3. **Use only the approved stack and versions** in `02-ARCHITECTURE.md` §2. Do not add a library that is not listed. If you believe one is needed, ask first.
4. **Never fabricate APIs.** Before using a library function, check it exists in the installed version (read `node_modules` types or the docs). If unsure, say so.
5. **Follow the folder structure exactly** (`02-ARCHITECTURE.md` §4). Do not rename or relocate files.
6. **Follow the coding standards** (`02-ARCHITECTURE.md` §6) – they are mandatory, not suggestions.
7. **No placeholders or fake completion.** No `TODO` stubs presented as done, no hard-coded data in components that should come from the API, no mocked results that hide a failing test.
8. **Security basics are non-negotiable:** hash passwords, parameterised queries only, validate all input server-side, never store card numbers/CVV, never commit secrets (`.env` is git-ignored; commit `.env.example`).
9. **Every task ends with:** (a) it runs, (b) its tests pass, (c) lint + type-check pass, (d) a short report: files created/changed, commands run, test output, deviations from spec.
10. **Report honestly.** If a test fails or a requirement could not be met, say so. Do not claim success.
11. **Git:** one feature branch per task (`feature/<task-id>-<slug>`), small commits with Conventional Commit messages. Do not push to `main`.

## Task report template (paste at the end of each task)

```
Task: <id + name>
Files created: ...
Files changed: ...
Commands run + result: ...
Tests: <n passed / n failed>  (paste summary)
Lint / typecheck: pass|fail
Requirements covered: FR-...
Deviations / assumptions / open questions: ...
```
