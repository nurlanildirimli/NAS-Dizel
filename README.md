# NAS-Dizel

Mobile-first workshop management app for a Common Rail injector repair shop.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and fill in the Supabase project values:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_ANON_KEY=
   EXPO_PUBLIC_APP_ENV=development
   ```

   Never commit `.env` or Supabase keys.

3. Apply Supabase SQL in order:

   ```text
   supabase/migrations/001_initial_schema.sql
   supabase/seed.sql
   supabase/migrations/002_vehicle_read_models.sql
   supabase/migrations/003_save_service_rpc.sql
   supabase/migrations/004_service_payment_income_read_models.sql
   supabase/migrations/005_reports_exports.sql
   supabase/migrations/006_device_management.sql
   ```

## Commands

```bash
npx expo start
npm run typecheck
npm run lint
npm run check
npm run export:web
```

## QA

Use [docs/qa-runbook.md](docs/qa-runbook.md) before considering a feature or release ready.
Use [docs/sql-smoke-tests.md](docs/sql-smoke-tests.md) after applying migrations to Supabase.
