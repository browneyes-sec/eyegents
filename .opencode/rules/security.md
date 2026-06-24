# Security Rules

## Mandatory (Block on Violation)
- No hardcoded secrets, API keys, passwords, tokens
- All inputs validated at boundaries (Zod schemas)
- Parameterized queries only (no string interpolation in SQL)
- AuthZ checks on all mutating endpoints
- HTTPS enforced in production
- Secure headers (CSP, HSTS, X-Frame-Options)
- Dependencies scanned weekly (Dependabot + OSV)

## Authentication
- JWT with RS256, short expiry (15min), refresh tokens
- Password hashing: bcrypt (cost 12) or Argon2id
- MFA for admin actions
- Session invalidation on password change

## Authorization
- RBAC with least privilege
- Resource-level permissions
- Audit log for authZ decisions

## Data Protection
- PII encrypted at rest
- TLS 1.3 in transit
- Data retention policies
- Right to deletion implemented