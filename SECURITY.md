# Security Policy - Jarvis AI Brain

Jarvis AI Brain is a self-hosted modular Node.js/Express backend orchestrating multiple LLMs, Obsidian vault synchronization via GitHub, Supabase pgvector RAG, and social automation bots (Puppeteer). It executes LLM dispatches, file storage writes, and external API requests based on API commands and voice input. 

This architecture is a deliberate design, not an oversight — but it means trust boundaries are worth stating plainly so security researchers know which side of the line a finding falls on before investigating.

This document links directly to concrete components in the codebase rather than making abstract claims. Where this file and the running code disagree, the code is what executes and this document should be updated.

---

## Supported Versions

Only the latest code on the `main` branch receives active security updates and bug fixes. There are no legacy releases or long-term support (LTS) branches.

| Version / Branch | Supported          | Notes                                                    |
| ---------------- | ------------------ | -------------------------------------------------------- |
| `main`           | :white_check_mark: | Active development & security patches                    |
| Feature / Dev    | :x:                | Work-in-progress branches are not supported              |
| < Legacy Commits | :x:                | Update to `main` branch to receive latest fixes          |

---

## Reporting a Vulnerability

If you discover a potential security vulnerability in Jarvis AI Brain, please **do not report it publicly through GitHub Issues**.

### Preferred Reporting Channel
Submit private security reports via GitHub Security Advisories:
👉 **[Submit a Security Advisory](../../security/advisories/new)**

If GitHub Security Advisories is unavailable, contact the project maintainers privately.

### What to Include in Your Report
To help us evaluate and address your finding efficiently, please include:
1. **Summary**: A concise description of the vulnerability and its potential impact.
2. **Affected Component**: Specific API endpoints, middleware, or source files (e.g., [`src/middlewares/auth.js`](src/middlewares/auth.js)).
3. **Reproduction Steps**: A minimal, reproducible Proof of Concept (PoC) script, `curl` command, or detailed step-by-step instructions.
4. **Environment**: Any specific configuration or setup required to trigger the issue.
5. **Suggested Fix**: Remediation suggestions or code patches, if available.

### Response & SLA Process
- **Acknowledgment**: We aim to acknowledge reports within **72 hours**.
- **Investigation**: Reports are evaluated on a best-effort basis within **7 days**.
- **Remediation**: Confirmed vulnerabilities will be patched directly on `main`.
- *Note*: Jarvis AI Brain is maintained as an open-source project. There is **no bug bounty program** or monetary reward.

---

## Security Architecture & Trust Boundaries

### 1. Authentication & Role Isolation
- **Implementation**: [`src/middlewares/auth.js`](src/middlewares/auth.js), [`src/routes/admin.route.js`](src/routes/admin.route.js)
- **Mechanism**: Parses identity from headers (`Authorization: Bearer <token>`, `x-user-role`, `x-user-email`, `x-user-id`). Fallbacks assign default admin credentials (`usr_admin`, role `'1'`).
- **Boundary Warning**: `requireAdmin` checks if `role === '1'` or email contains `'admin'`. In local single-tenant operation or behind an authenticating reverse proxy (which strips incoming `x-user-*` headers), this simplifies development. **On an exposed public network without reverse-proxy sanitization or Supabase JWKS verification, header spoofing is trivial.** Treat this design as developer ergonomics for single-tenant use, not multi-tenant isolation.

### 2. Rate Limiting
- **Implementation**: [`src/middlewares/rateLimit.js`](src/middlewares/rateLimit.js), [`src/utils/tokenizer.js`](src/utils/tokenizer.js)
- **Limits**: 200 Requests Per Minute (RPM) per IP; 1,000,000 estimated Tokens Per Minute (TPM) per IP.
- **Boundary Warning**: In-memory `Map` counters clear upon process restarts. Token calculation relies on `req.body` size estimates rather than provider quota reservations. This acts as protection against runaway loops, not enterprise DDoS mitigation.

### 3. File Uploads & Static Storage
- **Implementation**: [`src/routes/upload.route.js`](src/routes/upload.route.js), [`src/controllers/upload.controller.js`](src/controllers/upload.controller.js)
- **Safeguards**: 50MB file size ceiling, extension whitelist check (`.png`, `.jpg`, `.pdf`, `.docx`, etc.), and filename sanitization (`Date.now()` prefix + alphanumeric replace).
- **Boundary Warning**: Files are saved under `src/storage/uploads/` and served statically under `/uploads/`. Content verification is extension/MIME based without deep magic-byte or antivirus scanning. SVG uploads may execute scripts in browser context if accessed directly.

### 4. GitHub Repository & Obsidian Vault Sync
- **Implementation**: [`src/repositories/github.repository.js`](src/repositories/github.repository.js), [`src/controllers/github.controller.js`](src/controllers/github.controller.js)
- **Access Control**: Operates using `GITHUB_PAT` configured in `.env`. Tokens remain strictly server-side and are never exposed to clients.
- **Boundary Warning**: Authenticated instance users with access to `/api/github/file` can instruct the server to commit changes to the connected repository using the server's token.

### 5. Social Automation & Browser Bots
- **Implementation**: [`src/routes/social.route.js`](src/routes/social.route.js), [`src/services/social/`](src/services/social/)
- **Mechanism**: OAuth tokens stored in Supabase (`social_accounts` table). Facebook bot runs local `puppeteer-core` instances.
- **Boundary Warning**: Workflow states (`PENDING_APPROVAL` ➔ `APPROVED` ➔ `SCHEDULED` ➔ `PUBLISHED`) can be bypassed if endpoints like `/api/social/direct-publish` are invoked directly by an authorized client.

### 6. AI Credentials & API Keys
- **Implementation**: [`src/services/ai/token.service.js`](src/services/ai/token.service.js), [`src/services/ai/cost.service.js`](src/services/ai/cost.service.js), [`src/services/ai/aiManager.service.js`](src/services/ai/aiManager.service.js)
- **Protection**: Provider keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `CLAUDE_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `CLOUDFLARE_API_TOKEN`, etc.) are isolated on the server. Clients communicate solely with `/api/chat`.
- **Resilience**: Cost tracking is logged in Supabase (`token_usage`). Failed calls automatically fall back to backup providers (e.g. Gemini).

---

## Secrets & Credentials Protection

Never commit secrets or sensitive data to the repository:
- API keys & AI provider credentials
- Database connection strings & passwords
- JWT secrets & Cloudflare tokens
- Private SSL keys or `.env` files

All credentials must be managed strictly via environment variables (`.env`) or secret management systems.

---

## Non-Goals (Out-of-Scope)

The following design trade-offs are known architectural decisions and are **not** considered security vulnerabilities:

- **Local single-tenant host access**: Users with host machine access reading `.env`, SQLite/JSON logs, or local storage.
- **Untrusted reverse proxy headers in local mode**: Header manipulation when deployed directly to the public web without an authenticating reverse proxy.
- **Prompt Injection**: Prompt injection via chat inputs, uploaded files, or ingested Obsidian Markdown. Content is passed to LLM prompts without heuristic output filtering.
- **In-memory rate limiter evasion**: Rotating IP addresses, VPNs, or IPv6 cycling to reset in-memory rate limits.
- **Permissive CORS in development**: [`src/middlewares/cors.js`](src/middlewares/cors.js) defaults to `origin: '*'` for dev convenience. Production deployments should bind CORS to specific origin domains.

---

## In-Scope Vulnerabilities

We welcome reports for actionable security flaws, including:

- **Server-Side Request Forgery (SSRF)**: Endpoints or RAG ingestion forcing backend HTTP requests to internal networks or cloud metadata IPs (`http://169.254.169.254`).
- **Path Traversal / Arbitrary File Overwrite**: Upload or storage operations escaping `src/storage/uploads` (e.g., `../../app.js`).
- **Upstream Secret Exposure**: Leaking raw credentials (`GITHUB_PAT`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`, etc.) in HTTP responses, client JS, or stack traces.
- **Remote Code Execution (RCE)**: Arbitrary command execution via file uploads, template evaluation, parser exploits, or Puppeteer launch arguments.
- **Stored XSS via Statically Served Files**: Upload bypasses resulting in stored script execution or cross-origin privilege escalation.

---

## Responsible Disclosure

We ask security researchers to adhere to responsible disclosure principles:
- Avoid accessing, modifying, or exfiltrating other users' data.
- Refrain from causing service disruptions or performing Denial of Service (DoS) attacks.
- Do not publicly disclose vulnerabilities before a fix has been deployed.

---

## Related Documentation

- [`README.md`](README.md) — Architecture overview, project setup, and directory structure.
- [`schema.sql`](schema.sql) — Supabase PostgreSQL database tables, vector search functions, and schema definitions.
- [`src/config/env.js`](src/config/env.js) — Environment variable specifications and configuration fallbacks.

