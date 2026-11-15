# SpendWise

SpendWise is a personal-finance workspace for tracking transactions, categories, budgets, and savings goals.

## Identity and privacy

Users enter a name instead of creating an account or signing in. A normalized name reopens the same profile, and all financial queries are scoped to that profile. Names are not verified: anyone who enters the same name can view and change that profile's data. This is not secure authentication; do not use it for sensitive financial records.

## Stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Neon PostgreSQL with Drizzle ORM
- Zod validation, Recharts, and Lucide icons

## Local development

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Set `DATABASE_URL` and `BETTER_AUTH_SECRET` in your local environment. The secret must be at least 32 characters and is used to sign the HTTP-only profile cookie; it does not enable account authentication.
3. Start the app with `pnpm dev`.

In v0, configure project environment variables through project settings. Never commit secrets or place them in client code. Environment files are excluded by `.gitignore`.

## Database

The Drizzle definitions are in `lib/db/schema.ts`. The Neon database contains the SpendWise profile, category, transaction, budget, savings-goal, and savings-contribution tables. Keep database changes in sync with the live Neon schema and continue scoping financial records by `username_key`.

## Validation

- `pnpm exec tsc --noEmit`
- `pnpm run build`
