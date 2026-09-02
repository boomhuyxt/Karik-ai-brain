# Security Policy

Jarvis AI Brain is a self-hosted modular Node.js/Express backend orchestrating multiple LLMs, Obsidian vault synchronisation via GitHub, Supabase pgvector RAG, and social automation bots (Puppeteer). It executes LLM dispatches, file storage writes, and external API requests based on API commands and voice input. That architecture is a deliberate design, not an oversight — but it means the boundaries are worth stating plainly, so a security researcher knows which side of the line a finding falls on before spending time on it.

This document links to the concrete components in the codebase rather than making abstract claims. Where this file and the running code disagree, the code is what executes and this file is a bug.

## Supported versions

`main` is the only supported branch. There are no version tags and no long-term support releases; fixes land directly on `main` and there is no backport target.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting:

**[Submit a Security Advisory](../../security/advisories/new)**

GitHub Issues is monitored for bug reports and feature requests, but please do **not** open a public issue for a suspected security vulnerability.

What to expect:

- Jarvis AI Brain is maintained in the open as an evolving side project. Reports are read on a best-effort basis; the target response window is within **7 days**, which is an intention rather than a formal SLA.
- There is **no bug bounty programme** and no financial compensation of any kind.
- Please include steps to reproduce, the specific endpoints or files involved, what actually occurred, and what was expected — a reproducible curl command or script beats a text description.

## Security boundaries

### Authentication & Role Isolation: Headers are trusted in the current middleware

In [`src/middlewares/auth.js`](src/middlewares/auth.js), incoming requests parse identity from headers:

- `Authorization: Bearer <token>`
- `x-user-role`, `x-user-email`, `x-user-id`

The default fallback assigns `id: 'usr_admin'`, `role: '1'`, `email: 'adminai'`. 

In [`src/routes/admin.route.js`](src/routes/admin.route.js), the `requireAdmin` check tests whether `role === '1'` or the email contains `'admin'`. In a local or behind-a-trusted-reverse-proxy setup, this simplifies development. **However, on an untrusted or directly exposed network, without a proxy stripping incoming `x-user-*` headers or strict JWT signature validation against `SUPABASE_JWKS_URL`, header spoofing is trivial.** Treat this design as developer ergonomics for single-tenant / local operation, not a multi-tenant isolation boundary.

### Rate limiting is in-memory and IP-based

In [`src/middlewares/rateLimit.js`](src/middlewares/rateLimit.js), throttling is applied globally using in-memory `Map` instances:

- **RPM Limit**: 200 requests per minute per IP.
- **TPM Limit**: 1,000,000 estimated tokens per minute per IP (computed via [`src/utils/tokenizer.js`](src/utils/tokenizer.js)).

The limiter tracks timestamps in process memory. A process restart clears all rate limit counters. Furthermore, token counting inspects `req.body` size as an estimate, not provider-level quota reservation. Treat this rate limiter as protection against runaway scripts or accidental client loops, never as enterprise-grade DDoS containment.

### File uploads and disk access

The upload endpoint in [`src/routes/upload.route.js`](src/routes/upload.route.js) (implemented in [`src/controllers/upload.controller.js`](src/controllers/upload.controller.js)) accepts base64 payloads:

- **Size limit**: Checked against a 50MB ceiling.
- **Extension check**: Whitelists common image, video, PDF, and Word extensions (`.png`, `.jpg`, `.pdf`, `.docx`, etc.).
- **Filename sanitization**: Filenames are sanitized (`fileName.replace(/[^a-zA-Z0-9._-]/g, '_')`) and prefixed with `Date.now()`.
- **Destination**: Saved to disk under `src/storage/uploads/` and served statically at `/uploads/`.

The check validates file extensions and MIME headers supplied by the client; it does **not** perform deep magic-byte inspection or sandbox antivirus scanning. Uploaded files served under `/uploads` do not execute server-side Node code, but SVG files are permitted and can execute scripts in the context of the user's browser if rendered directly.

### GitHub Repository & Obsidian Vault Sync

In [`src/repositories/github.repository.js`](src/repositories/github.repository.js) and [`src/controllers/github.controller.js`](src/controllers/github.controller.js), the server reads and writes files to the configured GitHub repository (`GITHUB_OWNER`/`GITHUB_REPO`) using `GITHUB_PAT`:

- Reading tree, reading files, and writing commits (`updateFile`, `saveDailyNote`) execute with the permissions of the Personal Access Token.
- Any authenticated user on the AI Brain instance who has access to `/api/github/file` can instruct the backend to commit changes to the connected repository. The repository token is held exclusively by the backend and is never sent to the client browser.

### Social Automation & Browser Bots

In [`src/routes/social.route.js`](src/routes/social.route.js) and [`src/services/social/`](src/services/social/):

- Social platform OAuth tokens (`access_token`, `refresh_token`) are stored in Supabase PostgreSQL (`social_accounts` table).
- The Facebook browser automation bot uses `puppeteer-core`. Puppeteer launches a local browser instance to automate posting workflows.
- Content posted through the social module goes through state transitions (`PENDING_APPROVAL` -> `APPROVED` -> `SCHEDULED` -> `PUBLISHED`). However, endpoints like `/api/social/direct-publish` bypass the review state machine if invoked directly by an authorized client.

### AI Provider Keys & Token Cost Protection

API credentials for external providers (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `CLAUDE_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `CLOUDFLARE_API_TOKEN`, `TOKENROUTER_API_KEY`) are kept exclusively on the server in `.env`:

- Client applications interact with `/api/chat` without receiving any upstream API keys.
- Cost and token usage are recorded in Supabase (`token_usage` table) via [`src/services/ai/token.service.js`](src/services/ai/token.service.js) and [`src/services/ai/cost.service.js`](src/services/ai/cost.service.js).
- When a provider fails or returns a mock response, [`src/services/ai/aiManager.service.js`](src/services/ai/aiManager.service.js) automatically falls back to Gemini.

## Non-goals — what Jarvis AI Brain does not defend against

Reporting one of these is not considered a security vulnerability. They are known design trade-offs:

- **Local single-tenant root access.** Anyone who has physical access or local shell access to the host machine can read `.env`, SQLite/JSON logs, local uploads in `src/storage/`, and database connection strings.
- **Untrusted reverse proxy headers in development.** Deploying the app directly to the public internet without an authenticating reverse proxy (or without configuring full Supabase JWT verification in `auth.js`) leaves header evaluation open. Hardening authentication for multi-tenant production is an deployment choice, not an unannounced bug.
- **Prompt injection through chat or ingested markdown.** Content retrieved from external websites, uploaded documents, GitHub Obsidian vaults, or user chat prompts is fed directly into LLM prompts via [`src/prompts/`](src/prompts/) and [`src/services/ai/router.service.js`](src/services/ai/router.service.js). There is no heuristic output filter against indirect prompt injection.
- **In-memory rate limiter evasion via IP rotation.** The rate limiter keys off `req.ip`. Evasion through proxies, VPNs, or IPv6 address cycling is an accepted limitation of in-memory rate limiting.
- **Permissive CORS in development.** [`src/middlewares/cors.js`](src/middlewares/cors.js) currently permits `origin: '*'`. Restricting this to specific production domains must be configured when binding the server to a public host.

## What *would* be a vulnerability

Please do report:

- **Server-Side Request Forgery (SSRF)**: Any endpoint or RAG knowledge ingestion feature allowing an attacker to force the backend server to make arbitrary HTTP requests to internal networks or cloud metadata services (`http://169.254.169.254`).
- **Path Traversal / Arbitrary File Overwrite**: Any parameter in `/api/upload`, `/api/github`, or storage routines that allows traversing outside `src/storage/uploads` (e.g., `../../app.js` or writing outside intended directories).
- **Upstream Secret Exposure**: Any condition where raw API keys (`GITHUB_PAT`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, etc.) or internal database credentials leak into client responses, client-side JS bundles, or error stack traces.
- **Remote Code Execution (RCE)**: Any avenue through file uploads, template evaluation, YAML/Markdown parsers, or Puppeteer launch arguments that executes arbitrary commands on the host OS.
- **Stored XSS via Statically Served Files**: Ability to store HTML/scripts that bypass upload extension sanitization or trigger unintended cross-origin privilege escalation.

## Further reading

- [`README.md`](README.md) — Architecture overview, Clean Architecture directory structure, and startup instructions.
- [`schema.sql`](schema.sql) — Supabase PostgreSQL database tables, roles, foreign keys, and vector search functions.
- [`src/config/env.js`](src/config/env.js) — Environment variable specifications and configuration fallbacks.
