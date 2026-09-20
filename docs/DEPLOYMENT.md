# Deployment notes

This repository deploys the merchant application. The separate onboarding HTML and VPS Nginx configuration are not managed here.

## Before deployment

- Set DATABASE_URL and a random JWT_SECRET_KEY of at least 32 characters in the server environment. See .env.example. Changing the JWT secret invalidates existing sessions.
- Back up the database before starting the updated backend: initialization alters schema and migrates legacy stock and sales data. Inspect backend/database.py and backend/migrations before applying to production. Do not run every SQL file blindly; retirement scripts have separate prerequisites.
- Keep database backups and real credentials outside Git and Docker build contexts.
- Ensure the external Docker network device_default exists for this Compose deployment.

## Deployment

Run docker compose up -d --build from the repository with the required environment configured. Check docker compose logs fastapi-gateway for migration warnings as well as errors: the application can start after logging a schema initialization warning. Verify login, stock, sales, and store registration using a staging database first.

The merchant frontend is exposed on port 3000 and its backend on port 8001. The frontend container proxies /api to its own backend. The separate onboarding service currently proxies /api to port 8000; these are different services and their registration contract has not been verified together.


## Local validation

- .venv/bin/python -m pytest backend/tests -q (uses temporary PostgreSQL databases)
- cd frontend && node --test src/lib/*.test.js
- cd frontend && npm run lint
- cd frontend && npm run build

Pre-push validation: 44 backend tests and 4 frontend tests passed. Frontend build passed. Lint reported 74 warnings and no errors; the build also reported a large-chunk warning. See SECURITY_REVIEW.md for the security review and remaining limitations.
