# QA Runbook

Use this checklist after applying database migrations and before sharing a build.
This is an internal workshop app, so the checks focus on data correctness and fast
on-floor workflows.

## Database Setup

Apply SQL in this order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/002_vehicle_read_models.sql`
4. `supabase/migrations/003_save_service_rpc.sql`
5. `supabase/migrations/004_service_payment_income_read_models.sql`
6. `supabase/migrations/005_reports_exports.sql`
7. `supabase/migrations/006_device_management.sql`

Do not enable RLS or add permissive policies as part of this step. RLS is still
out of scope for the current MVP plan.

## Environment

`.env` must exist locally and must not be committed:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_ENV=development
```

Run:

```bash
git status --short --ignored
```

Confirm `.env`, `.expo/`, `node_modules/`, `supabase/.temp/`, `.DS_Store`, and
generated export folders are ignored.

## Local Checks

Run:

```bash
npm run check
npm run export:web
npx expo start --clear
```

`npm run check` must pass before a feature is treated as done.

## Manual App Scenarios

Device approval:

- New device creates a pending `allowed_devices` row and shows activation copy.
- Active device requires `status = 'active'`, `is_active = true`, and `is_deleted = false`.
- Deactivated or soft-deleted device does not enter the approved app area.
- `Daha çox → Cihazlar` can activate, deactivate, rename, note, and soft-delete devices.
- Device activation, deactivation, update, and soft-delete write audit logs.

Vehicles:

- Search by plate, normalized plate, phone, brand, injector company, and injector code.
- Vehicle list filters work for problem, debt, unpaid, partially paid, recent, normal, this month, and frequent.
- History opens from a vehicle card and shows newest services first.
- Phone action opens `tel:<phone>` where supported.

New service:

- Step 1 blocks missing plate, brand, phone, mileage, and problem description.
- Problem reason is required when problem customer is enabled.
- Existing plate lookup can select an existing vehicle.
- Step 2 supports injector counts `1..8` and preserves injector rows when count changes.
- Model lookup shows found, missing, add model, and manual pricing states.
- Step 3 adds labor, part, and extra line items with each apply target.
- Price overrides set `price_changed` while preserving default and actual prices.
- Step 4 confirms before saving.
- Failed save keeps the draft; successful save resets the draft and opens service detail.

Services and payments:

- Service detail shows vehicle, injectors, line items, totals, payments, and notes.
- Add payment updates payment row, service totals, status, and audit logs together.
- Mark paid settles remaining debt and writes audit logs.
- Payment list filters and navigation actions work.

Income, reports, exports:

- Income period filters show real totals.
- Reports page switches report type and period without full-table client fetching.
- CSV export works on web; native fallback shows copy-ready CSV text.
- Excel export downloads `.xlsx` on web; native fallback is clear and does not crash.
- Empty database states show existing empty/error copy without crashes.

## Codebase Audit

Before staging changes, run:

```bash
rg -n "customers|customer_name|technicians|from\\('vehicles'\\)|\\.delete\\(" app src supabase docs AGENTS.md
```

Review matches manually. Expected matches are schema/docs guardrails, injector
model terminology, and approved service fields. Unexpected matches should be
fixed before staging.

Confirm:

- No `customers`, `users`, or `technicians` table was added.
- No vehicle-level `customer_name`, `model`, `year`, `engine`, `vin`, or `problem_description` was added.
- Search does not load the full `vehicles` table on the client.
- Payment and service saves use RPCs for multi-table writes.
- UI text remains Azerbaijani and comes from documented copy.
