# Local PostgreSQL

Run PostgreSQL 16+ and one Deno/systemd application process on the same host.
Use a dedicated non-superuser role and database. PostgreSQL should listen only
on localhost, behind the firewall; only nginx should be public. A remote Deno
Deploy application cannot use this host's localhost database.

## Provision

Install PostgreSQL using the host package manager. Run as an administrator:

```sh
sudo -u postgres createuser --pwprompt spaces
sudo -u postgres createdb --owner=spaces spaces
```

Set the service environment from `.env.example`: `DATABASE_URL` with the local
role, URL-encoded password and database, `DENO_ENV=production`, HTTPS `SITE_URL`
and `MAIL_ORIGIN_URL`, existing Resend credentials, and desired feature flags.
Export `DATABASE_URL` in your maintenance shell and initialize the schema:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
```

Use the systemd/nginx installation command in the README. Protect environment
files and never expose the database connection string to browser code.

## Import From Supabase

Back up the source first. Stop all writers, including the old cloud deployment,
and use an empty local destination with the new schema already applied.
Set `SOURCE_DATABASE_URL` to a Supabase direct PostgreSQL or session-pooler
connection with read access to `auth.users` and the application's public tables.
Configure verified source TLS; do not disable certificate verification.

```sh
deno run --allow-env --allow-net tools/import_supabase.ts
```

The importer reads a consistent, read-only source snapshot and commits one
destination transaction. It refuses non-empty targets and preserves account IDs,
emails, bcrypt password hashes, profiles, games, moves, and lobbies. Unsupported
password hash formats abort the import. Accounts without password hashes can
use the app's password-recovery email flow. Browser sessions and previously sent
Supabase email links intentionally do not migrate; users must sign in again or
request a new link. Signup creates a session immediately, without requiring
email confirmation. Resend remains responsible for magic-link and reset delivery.

Compare row counts, test existing-user email/username login, signup, guest play,
magic links, password reset, logout, and game writes. `/api/health` must report
`db: true`. Disable the legacy Deno Deploy workflow at cutover and use the
documented local service. Remove `SUPABASE_*` from the new service environment.

Keep Supabase and its backup until the local service and a backup restore have
been verified. Do not run old/new writers simultaneously. Returning to the old
deployment after new local writes requires a separate reverse data migration.

## Operations And Limits

This preserves the existing architecture: active games, lobbies, matchmaking and
ratings use process memory. SQL writes persist records, but do not restore active
play after a restart. Use one application process and plan restarts between games.
Reliable restart recovery and multi-instance coordination are separate work.

Sessions last seven days; email tokens last thirty minutes and are one-use.
Passwords must be at least eight characters and at most 72 UTF-8 bytes. Password
reset revokes all sessions. Schedule cleanup of expired `app_sessions` and
`app_email_tokens` rows. Add auth rate limits at the reverse proxy and use HTTPS.

Schedule encrypted/off-host `pg_dump -Fc "$DATABASE_URL"` backups, test restore
to a separate database, and monitor storage and `database_write_failed` logs.
Run the integration check only against an isolated initialized test database:

```sh
TEST_DATABASE_URL="$DATABASE_URL" deno test -A lib/auth.test.ts
```

Historical `supabase/migrations` files are reference only; new deployments use
`db/schema.sql`. Live environment files and hosted data were not changed.