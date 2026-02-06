# DevPass Context

This file gives agentic tools a quick, reliable overview of the project
intent and constraints.

## Summary

DevPass is an open-source, developer-focused credential manager for
development, QA, and testing workflows. It is a Chrome extension and is
local-first by default, replacing unsafe ad-hoc storage of non-production
credentials (spreadsheets, notes, docs).

## Goals

- Environment-aware credentials (dev/qa/staging/prod, etc.).
- Support multiple test users and rapid context switching.
- Local-first, privacy-preserving workflows.

## Non-goals

- Not a general consumer password manager.
- Not a cloud SaaS.
- Not a full secrets manager.

## Target Users

- Software developers.
- QA engineers.
- Testers.
- Support engineers working with test systems.

## Constraints

- Chrome extension only.
- Manifest V3 only.
- Minimal permissions.
- No custom cryptography.
- Keep credential material in memory for the shortest duration possible.

## Build / Lint / Test Status

No tooling is defined yet. Do not invent commands.
If tooling is added, update this file and AGENTS.md immediately.

## Coding Conventions (high level)

- TypeScript preferred.
- Clear, explicit code over clever abstractions.
- Use ES module imports, grouped by standard library, third-party, local.
- If no formatter exists, use 2-space indentation, single quotes, and
  semicolons.
- Prefer explicit types at public boundaries.
- Avoid `any` and non-null assertions unless invariants are enforced.
- Use `camelCase` for variables/functions, `PascalCase` for types/classes,
  and `SCREAMING_SNAKE_CASE` for constants.

## Security and Privacy

- Use Web Crypto API or vetted libraries (no custom crypto).
- Never log secrets or full credentials.
- Avoid storing plaintext credentials in extension storage.

## Reporting Security Issues

Do not open public issues for security problems. Use a private GitHub
security advisory.
