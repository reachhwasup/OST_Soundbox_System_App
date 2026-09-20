# Local security review — 2026-09-20

Scope: source review, in-process HTTP probes with FastAPI/HTTPX, disposable PostgreSQL fixtures, existing regression tests, and npm production dependency audit. No requests were sent to production store domains. This is not a complete external penetration test or a production security certification.

## Findings fixed

| Severity | Finding | Change and evidence |
| --- | --- | --- |
| Critical | A publicly known JWT signing fallback was active because the local secret was unset. Possession of that key enables forged identity tokens. | Removed fallback; startup requires a configured secret of at least 32 characters. Generated a random local secret without displaying it. Compose requires the secret. Tests reject forged, expired, and expiration-free tokens. |
| Critical | Branch admins could reset another branch's or HQ administrator's password and remove their own branch restriction. | Account mutations check branch and action permissions; only super admins can assign branches or permission sets. API tests cover cross-scope resets, status changes, deletion, and self-promotion. |
| High | Phone matching could expose or reassign a store despite a different recorded owner. Public signup does not verify phone possession. | Merchant access now uses explicit user_id ownership in store, device and authentication paths. Removed automatic phone-based store claiming. API test confirms a matching phone does not expose or delete a victim's store or change its owner. |
| High | Token authentication did not reject is_active=false accounts and could fall back from a missing account ID to phone-based identity. | Authenticate only the signed numeric subject; reject inactive and non-ACTIVE accounts. API tests check inactive sessions and a missing subject with a conflicting user_id claim. |
| High | Default bootstrap credentials were built into startup and startup could reactivate/promote an existing account. | No default bootstrap password; administrator seeding is insert-only. Removed embedded database password defaults. Existing accounts and passwords were not rotated by this change. |

## Unresolved risks / next work

1. **High — broader authorization coverage.** Several inventory, supplier, store, reporting and branch-management routes still rely on generic admin checks. Account-management fixes above do not establish complete branch isolation across the application. Create a role/action/resource matrix and add negative API tests for every route before production clearance.
2. **High — existing deployed secrets and passwords.** Rotate any previously used default administrator password, database password, and JWT key in every deployment. Removing defaults does not remove credentials from Git history or revoke a remote deployment's tokens. Only the local JWT configuration was updated here.
3. **High — authentication abuse.** No comprehensive login/signup throttling, phone verification or MFA was added. A shared rate limiter must work across workers and trusted proxy boundaries. Legacy stores without user_id now need a verified administrator assignment rather than self-claim by phone.
4. **Medium — session revocation and password strength.** Tokens remain valid for up to seven days and password changes do not invalidate existing tokens. Password minimum remains six characters; PBKDF2 parameters and reset flows need a separate compatibility-aware upgrade.
5. **Medium — browser token storage.** Tokens remain in localStorage and would be readable by successful same-origin script injection. A session/cookie design, CSP and deployment headers require further work; do not put bearer tokens into redirect URLs.

## Validation

- 35 backend tests passed, including 9 added security cases (4 parametrized scope-denial cases).
- Current validation: 4 frontend session tests passed.
- npm audit --omit=dev: zero reported vulnerabilities at review time. This is advisory coverage, not proof of safety.
- HTTP tests use disposable databases, not production data. ASGI tests exercise routing and auth dependencies without booting the deployment proxy.

## Configuration and behavior changes

- JWT_SECRET_KEY is required; use a secret manager or environment value generated from secure random bytes. Never commit it. The local value is in ignored .env. Existing local tokens require sign-in again.
- ADMIN_PHONE and ADMIN_PASSWORD are optional initial bootstrap settings. Startup no longer changes existing accounts' role/status.
- Phone number alone no longer establishes store ownership. Existing unassigned records must be reviewed and assigned explicitly.

Reference: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), especially least privilege, default denial and checking authorization on every request.

CORS now accepts only explicit CORS_ALLOWED_ORIGINS (local development origins by default).
