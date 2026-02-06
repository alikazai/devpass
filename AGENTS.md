# AGENTS

This file guides agentic coding assistants working in this repository.
Keep it up to date as the project gains build tooling and conventions.

## Project Context (distilled)

DevPass is an open-source, developer-focused credential manager for
development, QA, and testing workflows. It is implemented as a Chrome
extension and is local-first by default. The product replaces unsafe,
ad-hoc storage of non-production credentials (spreadsheets, notes, docs).

Target users:
- Software developers
- QA engineers
- Testers
- Support engineers working with test systems

Non-goals:
- Not a general consumer password manager
- Not a cloud SaaS
- Not a full secrets manager

## Build, Lint, Test

Status: no build/lint/test tooling is defined in this repo yet.

Until tooling is added, do not invent commands. If you add scripts or
tooling, update this section immediately.

Placeholders (TBD):
- Install: TBD (no package manager config found)
- Build:   TBD
- Lint:    TBD
- Test:    TBD

Single-test placeholders (TBD):
- JS/TS unit test (Jest/Vitest): TBD
- E2E/extension test: TBD

## Code Style and Conventions

### Core rules (from CONTRIBUTING)
- TypeScript preferred.
- Manifest V3 only.
- Minimal permissions.
- No custom cryptography.

### General principles
- Prefer clear, explicit code over clever abstractions.
- Keep extension security and privacy constraints first.
- Favor local-first design decisions.
- Update documentation when behavior changes.

### Imports
- Use ES module syntax.
- Group imports by origin: standard library, third-party, then local.
- Use relative imports within a package/feature.
- Avoid deep relative chains when a local barrel/index exists.

### Formatting
- Match existing style in the file.
- If creating a new file and no formatter exists, use:
  - 2-space indentation
  - trailing commas where valid
  - single quotes for strings in TS/JS
  - semicolons for statements
- Keep line length reasonable (around 100-120 chars).

### Types
- Prefer explicit types at public boundaries and exported APIs.
- Use narrow types for secrets/credentials (avoid `any`).
- Use discriminated unions for state machines and workflow steps.
- Avoid non-null assertions unless invariants are enforced nearby.

### Naming
- Use `camelCase` for variables/functions.
- Use `PascalCase` for types/classes/components.
- Use `SCREAMING_SNAKE_CASE` for constants.
- Name files after their primary export.
- Use feature-based folder names over generic buckets.

### Error handling
- Fail closed for security-sensitive paths.
- Surface actionable error messages without leaking secrets.
- Avoid swallowing errors; return typed error results or throw.
- For async flows, prefer `try/catch` with clear fallback behavior.

### Chrome extension specifics
- Stay within Manifest V3 constraints.
- Prefer least-privilege permissions and host match patterns.
- Avoid persistent background pages (use service workers).
- Keep credential material in memory for the shortest duration possible.

### Security
- No custom crypto; use Web Crypto API or vetted libraries.
- Never log secrets, tokens, or full credentials.
- Avoid storing plaintext credentials in extension storage.

## Docs and Contribution Notes

### Scope guardrails
- DevPass is not a general password manager.
- DevPass is not a cloud SaaS.
- DevPass is not a full secrets manager.

### Security reporting
- Do not open public issues for security problems.
- Use a private GitHub security advisory.

## Cursor / Copilot Rules

- No .cursor/rules or .cursorrules found.
- No .github/copilot-instructions.md found.

## When You Add Tooling

If you introduce any of the following, update this file:
- package.json scripts for build/lint/test
- formatter or linter configs (Prettier/ESLint/etc.)
- test runners (Jest/Vitest/Playwright/etc.)
- workspace structure or module boundaries

## Quick Checklist for Agents

- Keep TypeScript-first.
- Manifest V3 only.
- Minimal permissions.
- No custom crypto.
- Update docs when behavior changes.
- Do not invent build/test commands.
