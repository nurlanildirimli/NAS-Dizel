# AGENTS.md — Common Rail Injector Service App

## Role

You are building a mobile-first workshop management app for a Common Rail injector
repair shop. Prioritize fast on-the-floor workflow and correct data over feature
richness. This is a small internal tool for one workshop, not a multi-tenant SaaS —
do not add generality nobody asked for.

## Project Overview

A vehicle-first service management app: search vehicles, log injector service visits,
record per-injector test results, price labor/parts by injector model, track
payments, and report on income/history. There is no customer entity — the vehicle
record carries everything (plate, brand, phone, mileage, "problem customer" flag).

**Stack:** React Native + Expo (SDK 52+) + Expo Router, TypeScript, Supabase
(PostgreSQL + JS client), TanStack Query, Zustand, React Hook Form + Zod.
No backend server for MVP — Supabase is accessed directly from the client.

**UI language is Azerbaijani. Code/DB/comments are English.** Never mix the two in
UI copy. See `docs/ui-copy.md` for exact strings. If a needed UI string is
missing, add it to `docs/ui-copy.md` first instead of inventing labels inline.

## Core Rules (non-negotiable)

- Vehicle is the only "customer-like" entity. **Never** create a `customers`,
  `users`, or `technicians` table.
- `vehicles` holds: license_plate, brand, phone, last_mileage, is_problem_customer,
  problem_reason, note. **Never** add customer_name, model, year, engine, vin, or
  problem_description to `vehicles` — problem_description belongs only on
  `service_records`.
- No visible login screen, no PIN. Access is controlled by approved-device check
  against `allowed_devices` (see `docs/architecture.md`).
- No file upload anywhere in the app.
- Labor and parts are never simple checkboxes — every line item has an
  `apply_target`: all injectors / one injector / selected injectors / general
  service. See `docs/workflow-new-service.md`.
- Every service line item stores both `default_unit_price` (from the model's
  catalog) and `actual_unit_price` (what was actually charged) — never collapse
  these into one field.
- Full detail on tables, workflows, and screens lives in `docs/`. Read the relevant
  doc before touching that area — don't guess at fields or copy.

## Key Commands

```bash
npx expo start                 # dev server
npx expo start --android       # run on Android
eas build --platform android   # production APK build
npx tsc --noEmit               # type check
npm run lint                   # lint
```

Supabase migrations live in `supabase/migrations/`, applied in numeric order via
the Supabase CLI or dashboard SQL editor. Full schema: `docs/schema.sql`.

## Where To Look

| Need | Doc |
|---|---|
| Table definitions, columns, indexes | `docs/schema.sql` |
| Folder/file layout, tech stack detail, device-approval flow | `docs/architecture.md` |
| Exact Azerbaijani screen copy, buttons, status labels | `docs/ui-copy.md` |
| 4-step new-service flow, pricing math, save logic | `docs/workflow-new-service.md` |
| Reports, income screen, exports | `docs/reports-and-exports.md` |
| What NOT to build | `docs/what-to-avoid.md` |

## Boundaries

### Always
- Confirm before saving a new service or soft-deleting/deactivating a device.
- Wrap the full "save service" sequence (vehicle upsert → service_records →
  service_injectors → line items → payments → audit_logs) in one database-side
  Postgres RPC/function called from `src/services/`. Supabase client calls alone
  are not a transaction. No partial saves.
- Write an `audit_logs` row for: vehicle create/update, service create/update,
  payment change, price change, problem-customer status change, device
  activate/deactivate/soft-delete, service soft-delete.
- Update `.env.example` when adding a new environment variable.

### Ask first
- Any schema migration that alters or drops an existing table/column.
- Adding a new top-level entity or table not listed in `docs/schema.sql`.
- Changing how device approval works.

### Never
- Commit `.env` or any Supabase key.
- List AI agents as commit author/co-author — a human takes authorship.
- Load the full vehicle table to the client for search — always query Supabase
  server-side with debounce + limit (see `docs/architecture.md`).
- Store Azerbaijani UI labels as database enum/code values. Store English codes
  in the DB and map them to Azerbaijani labels in the UI.

## Coding Conventions

- Business/data logic lives in `src/services/`; UI components stay presentational.
- Validation schemas: Zod, in `src/schemas/`, matching the Supabase table shape.
- Prefer small, focused files over large multi-responsibility ones.
- Money fields: `numeric(12,2)` in Postgres, formatted via `src/utils/formatMoney.ts`
  — never format currency inline in components.

## Testing Expectations

Before considering a feature done, verify it against the checklist in
`docs/architecture.md#testing-requirements` (device approval, injector count 1–8,
price override, payment status calculation, etc.).
