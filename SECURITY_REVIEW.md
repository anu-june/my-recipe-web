# Security review — 2026-11-08

## Local changes

- The recipe import API verifies the Supabase bearer token with `getUser` and checks the server admin allowlist before processing input.
- Request bodies are capped at 200,000 bytes and recipe inputs at 40,000 characters.
- A prepared Supabase migration enforces 10 imports per administrator per 10-minute window, shared across server instances. The API fails closed if the function is missing or unavailable.
- Web and YouTube page downloads reject non-public addresses, credentials, nonstandard ports and unsupported protocols. They pin the checked DNS address, validate redirects, enforce a 10-second timeout per hop and cap each download at 2 MB.
- Authentication callback redirects stay on the application origin.
- New imports no longer write input snippets or provider errors to model telemetry. The migration removes public inserts and restricts existing event reads to admins.
- Next.js and eslint-config-next were upgraded to 16.4.5, followed by compatible dependency security updates.

## Verification

- Six security tests passed, including unauthenticated and non-admin rejection, rate-limit failure behavior, unsafe URL rejection, redirect validation, and streamed body limits.
- A public HTTPS download smoke check passed.
- Full-project ESLint, TypeScript, and the production build passed.
- The final npm audit reports 0 critical, 1 high, 12 moderate and 4 low findings. See `dependency-security-audit.json` for details. These are dependency/advisory counts, not 17 confirmed exploitable application paths.
- The remaining high advisory is in `serialize-javascript`, pulled in through the PWA/Workbox build toolchain. Additional findings involve that toolchain, TypeScript ESLint, and Tailwind typography. No forced downgrades or unverified major dependency overrides were applied.

## Required before rollout

1. Inspect the deployed Supabase policies and grants, including any additional permissive policies absent from this repository.
2. Apply `supabase/migrations/20261108_secure_recipe_import.sql` after the existing migrations. It creates the rate-limit table/function and restricts model event access. It preserves recipes and existing model events.
3. Confirm the server `ADMIN_EMAILS` (or its public fallback), UI allowlist and database `public.is_admin()` identify the same administrator.
4. Deploy the code together with the migration, then verify a signed-in admin import, a non-admin rejection and the shared limit in the target environment.
5. Review or replace the remaining vulnerable build-tool dependencies before claiming a clean dependency audit.

No remote database changes, Git pushes or hosting deployments were performed.
