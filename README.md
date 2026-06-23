# Recipe Collection Web App

A personal recipe collection app built with Next.js, Supabase, and Gemini-powered recipe import. It supports manual recipe management, URL and YouTube import, admin-only editing, and PWA installation.

## Features

- Browse published recipes on a responsive home page with search and category grouping.
- Add, edit, and delete recipes as an authenticated admin user.
- Import recipes from raw text, recipe pages, or YouTube links.
- Extract recipe data from JSON-LD when available, with HTML and transcript fallbacks.
- Install the app as a PWA on desktop or mobile.
- Track Gemini model attempts in Supabase for fallback and observability.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Google Gemini via `@google/generative-ai`
- `@ducanh2912/next-pwa`

## Current AI Behavior

The recipe import flow in [app/api/parse-recipe/_utils/gemini-service.ts](/D:/recipe-web/app/api/parse-recipe/_utils/gemini-service.ts):

- tries `gemini-2.5-flash` first
- falls back to `gemini-3-flash-preview` if needed
- validates the parsed JSON shape before returning it
- logs model attempts to the `model_events` table

## Project Structure

```text
recipe-web/
  app/
    api/parse-recipe/
      route.ts
      _utils/
        gemini-service.ts
        web-service.ts
        youtube-service.ts
    add-recipe/page.tsx
    auth/callback/route.ts
    components/
    context/AuthContext.tsx
    edit-recipe/[id]/page.tsx
    login/page.tsx
    recipe/[id]/page.tsx
    globals.css
    layout.tsx
    page.tsx
  lib/
    auth-utils.ts
    recipeFormatters.ts
    supabaseClient.ts
    types.ts
    validation.ts
  public/
    manifest.json
    icon-192.png
    icon-512.png
    icon.svg
    header-bg.png
  scripts/
  supabase/migrations/
  .github/workflows/backup.yml
```

## Environment Variables

Create `.env.local` using [.env.example](/D:/recipe-web/.env.example):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ADMIN_EMAILS=your_admin@email.com
GEMINI_API_KEY=your_gemini_api_key

CONFLUENCE_URL=https://yourname.atlassian.net
CONFLUENCE_EMAIL=your@email.com
CONFLUENCE_API_TOKEN=your_confluence_api_token
CONFLUENCE_SPACE_KEY=RECIPE
```

Notes:

- `NEXT_PUBLIC_ADMIN_EMAILS` is a comma-separated allowlist used by [lib/auth-utils.ts](/D:/recipe-web/lib/auth-utils.ts).
- The Confluence variables are only needed for [scripts/publish-to-confluence.js](/D:/recipe-web/scripts/publish-to-confluence.js).

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the dev server:

```bash
npm run dev
```

3. Open `http://localhost:3000`.

## Database Setup

Use the migration files in [supabase/migrations](/D:/recipe-web/supabase/migrations) as the source of truth:

- [20251216_create_model_events_table.sql](/D:/recipe-web/supabase/migrations/20251216_create_model_events_table.sql)
- [20260310_add_rls_policies.sql](/D:/recipe-web/supabase/migrations/20260310_add_rls_policies.sql)

At a high level, the app expects:

- a `recipes` table for recipe content
- a `model_events` table for AI logging
- RLS policies that allow public reads of published recipes
- admin-only insert, update, and delete permissions on recipes

Important:

- The checked-in migration currently hardcodes one admin email in the SQL helper function.
- The frontend separately uses `NEXT_PUBLIC_ADMIN_EMAILS` for client-side admin checks.
- Keep those two sides aligned when configuring a real environment.

## Main Scripts

App scripts from [package.json](/D:/recipe-web/package.json):

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run migrate
```

Utility scripts:

- TypeScript scripts: `npx tsx scripts/<name>.ts`
- Node script: `node scripts/publish-to-confluence.js`

Useful examples:

```bash
npx tsx scripts/verify-parse-api.ts
npx tsx scripts/check-models.ts
npx tsx scripts/test-youtube.ts
node scripts/publish-to-confluence.js
```

## Testing the App

Manual test flow:

1. Start the app with `npm run dev`.
2. Open the home page and confirm recipe list and search work.
3. Log in and verify admin-only actions appear for an allowed email.
4. Add a recipe manually and confirm it shows on the home page.
5. Edit a recipe and confirm the detail page updates.
6. Delete a test recipe and confirm it disappears.
7. Paste recipe text or a recipe URL into the importer and confirm fields populate.
8. Try a YouTube URL if `GEMINI_API_KEY` is configured.

Validation commands:

```bash
npm run lint
npm run build
```

The project was last validated successfully with both commands.

## PWA Notes

- Production builds use `next build --webpack`.
- The service worker is generated into `public/sw.js`.
- PWA behavior is disabled during development.
- Manifest and icons live in [public/manifest.json](/D:/recipe-web/public/manifest.json) and `public/`.

## Deployment

The app is set up for Vercel-style deployment:

- configure the same environment variables used locally
- run `npm run build`
- serve with `npm run start` or the platform equivalent

## GitHub Workflow

[.github/workflows/backup.yml](/D:/recipe-web/.github/workflows/backup.yml) runs a monthly database backup and also supports manual triggering. It uses Dockerized `pg_dump` and keeps artifacts for 90 days.

## Known Maintenance Notes

- Remaining `npm outdated` items are major-version jumps for `@types/node`, `marked`, and `typescript`.
- Remaining `npm audit` findings are transitive to the current Next/PWA toolchain and would require breaking changes or forceful dependency moves.
- On Windows, if build artifacts are locked, clearing `.next` or generated PWA files may be necessary before rebuilding.

## License

MIT
