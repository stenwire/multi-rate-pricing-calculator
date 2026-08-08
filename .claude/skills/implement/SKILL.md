---
name: implement
description: Drive the Multi-Rate Pricing Calculator build forward one task at a time against TECHNICAL_SPEC.md, keeping MILESTONES.md and TODO.md as the written record of what is done, what changed, and what is blocked. Use when asked to implement, continue, resume, or work on the next part of this project.
---

# Implement

You are building the Multi-Rate Pricing Calculator defined in `TECHNICAL_SPEC.md` at the project root. That spec is the contract: **anything it specifies is mandatory, anything it does not specify is not required, and Appendix C is a list of things that must not be built.** When you need a detail, read the governing section rather than recalling it.

Progress lives in two files at the project root, not in your memory:

- `MILESTONES.md` — the phase ledger (M0–M9), one entry per milestone.
- `TODO.md` — the working log: task queue, change log, decisions, blockers.

## First run

If `MILESTONES.md` does not exist at the project root, seed both tracking files before doing anything else:

1. Copy `templates/MILESTONES.md` (in this skill's directory) to `MILESTONES.md` at the project root.
2. Copy `templates/TODO.md` to `TODO.md` at the project root.
3. Fill in today's date in the header of each.
4. Tell the user the tracker was created, then continue into the normal loop below.

Do not re-seed if the files already exist — they hold real history. If they exist but look damaged or empty, say so and ask before overwriting.

## Every run

Follow this sequence in order. Do not skip steps 1, 4, or 5.

**1. Read the tracker first.** Read `MILESTONES.md` and `TODO.md` before touching any code. They are the source of truth for what is already done — your recollection is not. Check the Blockers section: a blocker that affects the next task must be resolved or explicitly deferred by the user before you proceed.

**2. Pick the task.** Take the next unchecked task in queue order, unless the user named a specific task or milestone. Announce which milestone and task you are picking up in one line before starting.

**3. Implement it.** Consult the governing spec section by number as you go. Stay inside the file tree in spec §3. Keep route handlers thin — validate, call the calculator or a service, respond through the envelope helpers. Keep `services/calculator.ts` pure: zero imports from Mongoose, Express, or any I/O layer.

**4. Prove it.** Run the milestone's verification command from `MILESTONES.md` — typically `npm test`, `tsc --noEmit`, or actually starting the thing. Paste or summarize the real result.

**A task is never checked off because the code "looks right."** If it is not verified, leave it `[~]` with a note saying what remains. If a check fails, fix it or log a blocker; never report success you did not observe.

**5. Write back.** Update both files before finishing:

- Tick the task in the `TODO.md` queue.
- Append a **Change log** entry: date, milestone, files touched, what changed, why.
- Add any new **Decision** (a deviation from the spec, plus its justification) or **Blocker**.
- In `MILESTONES.md`, move the milestone to `[~]` when work starts and to `[x]` only when every task under it passes *and* `/verify` reports no blockers. Stamp the completion date.

**6. Commit.** One commit per completed task, message naming the milestone: `M4: add User and Document models with toJSON transforms`. Include the tracker updates in the same commit.

## Closing a milestone

Before flipping a milestone to `[x]`, run the `/verify` skill scoped to that milestone. Blockers must be fixed, not waived. Major and minor findings may be deferred, but each deferred finding gets a line in `TODO.md` under Blockers or the task queue so it is not lost.

## Guardrails

- **Do not invent scope.** No user profiles, password reset, RBAC, multi-currency, document-level tax or discount, auto-save, version history, WebSockets, file upload, notifications, dark mode, i18n, Docker, or CI/CD config. The full list is spec Appendix C.
- **Do not reach for banned tooling.** No Next.js or Nest.js, no ORM other than Mongoose, no GraphQL, no BaaS, no AI/LLM integration, no component libraries, no monorepo tooling. Express 4.x — never 5.
- **The server owns all money math.** Computed monetary fields are calculated server-side on every write and silently stripped from client input. The client displays; it never computes.
- **When the spec conflicts with reality** (a snippet that will not compile, a type error, an impossible ordering), do not silently improvise. Implement the minimal correct fix and record it under Decisions in `TODO.md` with the reason.
- **No `any`.** Use `unknown` with narrowing. Comments follow spec §16.4: explain non-obvious business decisions, never restate the code; no file headers, no section separators. The exception is the JSDoc/YAML on route handlers that swagger-jsdoc parses.
- **Report faithfully.** If tests fail, say so and show the output. If you skipped something, say what and why.
