# Project Rules

## Core engineering principle: natural-language debuggability
- This system must be easy for a human operator to debug in natural language.
- When designing, implementing, or modifying any part of the system, prioritize logs, script output, admin-visible diagnostics, and error handling that explain what happened, why it happened, and what to check next in plain English.
- A human should be able to understand likely causes and next checks without reconstructing the flow from raw payloads, stack traces, opaque IDs, or scattered code.
- Prefer human-readable logs and status messages over terse or opaque output.
- Make important decision points observable in plain English.
- When something is skipped, failed, retried, mapped, created, updated, or rejected, say so clearly and include the reason.
- Error messages should be actionable and should suggest the next thing to verify when possible.
- Preserve structured technical detail where useful, but optimize operator-facing diagnostics for natural-language understanding.
- Prefer designs that improve debugging through clear flow and explicit reporting, not through excessive logging volume.
- Do not introduce unnecessary abstraction, indirection, or hidden behavior that makes operator debugging harder.
- When proposing implementation plans, explicitly consider whether the result improves or weakens natural-language debuggability.

## No fabricated data — numbers, facts, citations
- **Never write a number that came from memory, estimation, or "looks about right"** — not in code, UI constants, data files, documentation, or prose. Every figure must be either (a) computed by a runnable script from project source data, or (b) quoted from a retrievable source that was actually checked in this session.
- **Never attach a citation the source can't back.** If the cited source has no value for something, display "n/a" / say "no published estimate" — do not substitute an estimate under the source's name.
- **The same applies to non-numeric claims**: names, dates, quotes, URLs, legal/statutory statements, and descriptions of companies or people must be verified against a source or explicitly labeled unverified. Never fill a gap with a plausible invention.
- **Every displayed constant must be regenerable.** If a value cannot be reproduced by the project's derivation tooling or traced to a cited source, treat it as a defect: flag it and fix or remove it — never propagate it.
- **Verification means re-deriving**, not eyeballing: before claiming data is correct, re-run the derivation and diff it against what is displayed — `python3 derive_dashboard_data.py --check` does exactly this and exits non-zero on any mismatch. Run it before claiming any data work is done. Plausibility is not verification.
- Rationale: an AI-authored commit once shipped hand-invented ZIP income figures labeled as Census data — including a value for which no Census estimate exists. This class of error must never recur.

## Approval before action
- A question, request for analysis, request for review, request for recommendations, or request to summarize rules does not imply approval to make changes.
- Questions like "is this correct?", "what should I do next?", "review this", or "what do you recommend?" are analysis-only unless I clearly say to proceed.
- Do not read files, search code, edit files, move files, refactor code, run migrations, execute scripts, or implement a plan without explicit approval when I have instructed you to stop after analysis.
- Do not treat inspection, file reads, or code search as implicitly approved when I have asked for analysis-only behavior first.
- Default behavior is: inspect only if explicitly allowed, then explain, propose, and wait.
- After giving analysis or recommendations, stop and wait for a clear go-ahead before making changes.

## Completing work
- When asked to fix a list of issues, create a task for **every** item before starting.
- Do not mark work as complete until every task is done.
- If you want to skip or defer something, say so explicitly and get approval. Never silently deprioritize.
- After claiming work is done, re-run verification (syntax checks, test runs, etc.) to prove completeness.
- Prefer small, incremental changes over broad refactors. One file at a time when possible.

## Architecture guardrails
- **Identify the system of record clearly** for any data the project handles, and do not let secondary data sources drift into authoritative roles without an explicit decision.
- **Do not add new dependencies** without explicit approval.
- **Do not change the database schema or other persistent data contracts** without explicit approval and a clear migration path.
- **Preserve independently runnable units.** If a script, module, or service is meant to run on its own, do not couple it tightly to a runner that replaces direct invocation. A convenience wrapper that calls them in sequence is fine, but it must not replace the individual entry points.
- **Manual overrides must never be silently overwritten.** Any automated process that recomputes data must reapply user corrections on top.

## Trust order when sources conflict
- When information sources disagree, trust in this order:
  1. Current code
  2. Observed runtime behavior / terminal output
  3. Documentation, only when it matches the code
- If code behavior, runtime behavior, or my description does not clearly match the codebase you are reading, stop and ask for a fresh current codebase before giving further code-aware guidance. Err on the side of caution.

## Documentation
- Project documentation (README, ARCHITECTURE, CLAUDE.md, and similar) must stay aligned with actual code changes. Update them when behavior changes, not speculatively. Do not document features that do not exist yet.

## Legacy and superseded code
- Superseded code should live in a clearly labeled location (e.g. `legacy/`) and is not part of the active system.
- Do not reference legacy code when making architecture decisions.
- If a legacy component needs to be reactivated, update it to use current shared utilities and test it against the current schema first.

## Known limitations
- Capture accepted bugs, trade-offs, and "won't fix" items in a dedicated section so they are not mistakenly treated as defects to chase. Each entry should explain the trade-off in plain English: what fails, why a fix is deferred, and what the operator-visible consequence is.
