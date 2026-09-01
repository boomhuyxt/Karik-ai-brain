# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not report it publicly through GitHub Issues**.

Please report security vulnerabilities through:

- **GitHub Security Advisories** for this repository
- Or contact the project maintainers privately

When reporting a vulnerability, please provide:

- A clear description of the vulnerability
- Steps required to reproduce the issue
- The affected component or version
- The potential security impact
- Proof of Concept (PoC), if available
- Any suggested mitigation or fix

## Response Process

After receiving a security report:

1. The report will be reviewed by the maintainers.
2. We will attempt to acknowledge the report within **72 hours**.
3. The vulnerability will be investigated and assessed.
4. If confirmed, an appropriate fix will be developed.
5. A security update may be released depending on the severity and impact.

Please allow reasonable time for investigation and remediation before publicly disclosing the vulnerability.

## Security Practices

This project follows security practices including:

- Dependency vulnerability monitoring
- Docker image security scanning
- GitHub Code Scanning
- Dependabot security updates
- Secret and credential protection
- Environment variables for sensitive configuration
- Cloudflare Tunnel for secure external access
- API authentication and authorization
- Protection of AI provider API keys

## Secrets and Credentials

Never commit sensitive information to the repository, including:

- API keys
- AI provider keys
- Database passwords
- JWT secrets
- Cloudflare credentials
- Access tokens
- Private keys
- Production environment variables

Sensitive configuration should be stored using environment variables or an appropriate secret-management system.

## Responsible Disclosure

We ask security researchers to responsibly disclose vulnerabilities and avoid:

- Accessing or modifying other users' data
- Disrupting production services
- Performing denial-of-service attacks
- Publicly disclosing vulnerabilities before they have been addressed

We appreciate responsible security research and will make reasonable efforts to work with researchers to understand and resolve reported vulnerabilities.
