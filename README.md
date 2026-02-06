# DevPass 🔐

**DevPass** is an open-source Chrome extension that helps developers, QA engineers, and testers securely manage credentials across multiple environments — without spreadsheets, notes, or ad-hoc tools.

> Environment-aware credential management, built specifically for software teams.

---

## Why DevPass?

Traditional password managers are built for *humans*.  
DevPass is built for **systems, environments, and testing workflows**.

If you’ve ever:

- Stored test credentials in Excel or Notion
- Copied passwords between dev / staging / prod
- Managed multiple test users per environment
- Shared non-prod credentials insecurely

DevPass is for you.

---

## Core Concepts

```
Project
 └─ Environment (local / dev / qa / staging / prod)
     └─ Account
         ├─ Username
         ├─ Password / Secret
         ├─ Notes
         ├─ Tags
         └─ Login URLs
```

---

## Features (MVP)

- Local-only encrypted vault
- Environment-aware credentials
- Fast search & quick copy
- Context-aware autofill
- Chrome extension UI
- Designed for non-production workflows
- Fully open source

---

## Security Model

- Local-first, zero-knowledge
- Web Crypto API encryption
- No servers, no telemetry

---

## License

Apache License 2.0

## Maintainer

DevPass is maintained by **Ali Kazai**.

Contributions are welcome.
