# Architecture

## Folder Structure

> This is the initial scaffold, not a guarantee of current layout — check the
> actual repo tree before assuming a path exists. Prefer describing where a
> *kind* of thing lives (e.g. "data access is in `src/services/`") over hard
> file paths when writing new docs.

```text
injector-service-app/
├── app/                        # Expo Router routes
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── device-activation.tsx
│   ├── tabs/                   # bottom tab screens: search, new, income, vehicles, more
│   ├── new-service/            # 4-step workflow: vehicle, injectors, work-payment, confirm
│   ├── vehicles/                # list, detail, history
│   ├── services/                # service detail
│   ├── payments/
│   ├── price-catalog/
│   ├── reports/
│   ├── devices/
│   └── settings/
│
├── src/
│   ├── components/
│   │   ├── layout/              # Screen, Header, BottomTabs, StepHeader
│   │   ├── ui/                  # Button, Card, Input, Select, Badge, Toggle, Modal...
│   │   ├── forms/                # PlateInput, PhoneInput, ApplyTargetSelector...
│   │   ├── cards/                # VehicleCard, ServiceCard, PriceSummaryCard...
│   │   └── charts/                # IncomeLineChart, IncomeBarChart, ModelRankingChart
│   ├── lib/                     # supabase.ts, queryClient.ts
│   ├── services/                 # Supabase data access + workflow logic — business
│   │                              # logic lives here, NOT in components
│   ├── store/                    # Zustand: deviceStore, newServiceStore, appStore
│   ├── schemas/                  # Zod validation schemas, one per entity
│   ├── types/                    # TypeScript types
│   └── utils/                    # normalizePlate, formatMoney, calculateTotals...
│
├── supabase/
│   ├── migrations/               # numbered SQL migrations, see docs/schema.sql
│   └── seed.sql
│
├── app.json / eas.json / package.json / tsconfig.json / babel.config.js
├── .env.example                  # keep in sync with real env vars — never commit .env
└── README.md
```

## Tech Stack

- React Native + Expo (SDK 52+), Expo Router, TypeScript
- Supabase JS client, direct client access — no backend server for MVP
- TanStack Query (server state), Zustand (local app state)
- React Hook Form + Zod (forms/validation)
- AsyncStorage or SecureStore (device ID persistence)
- A chart library (Recharts-equivalent for RN, or React Native SVG) for income screens

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_ENV=development
```

Never commit `.env`. Always keep `.env.example` current when adding a new variable.

## Device Approval (replaces login)

There is no visible login screen or PIN. Access is gated by device approval:

1. On app open, read `device_id` from SecureStore/AsyncStorage.
2. If missing, generate a unique code and persist it.
3. Check `allowed_devices` in Supabase for that `device_id` where
   `is_deleted = false`.
4. If found and `is_active = true` → open **Axtarış** (search).
5. If not found, inactive, or soft-deleted → show the device activation /
   deactivated screen.

Device management lives at **Daha çox → Cihazlar**: shows device name, code,
status, last-used, note; actions are activate, deactivate, rename, delete.
Delete is a soft delete (`is_deleted = true`, `deleted_at = now()`), never a
hard delete. Exact screen copy is in `docs/ui-copy.md`.

## Database Write Rules

Supabase is accessed directly from the client for ordinary reads and simple
single-row writes, but multi-table workflows must be atomic. The full
new-service save must be implemented as a database-side Postgres RPC/function
and called from `src/services/`; do not perform the service save as several
independent Supabase client inserts/updates.

Database values use English stable codes. Azerbaijani belongs in UI labels only.
For example, payment methods are stored as `cash`, `card`, `transfer`, `debt`,
or `mixed`, then displayed with the Azerbaijani labels in `docs/ui-copy.md`.

## Search Performance

- Never load the full `vehicles` table to the client.
- Query Supabase server-side, debounce input by ~300ms, return first 20–50 results.
- Searchable fields: license plate, phone, brand, injector company/code, problem
  description, technical note, payment status, problem-customer flag, has debt.

## Production Rules

- Supabase PostgreSQL only — no local-only storage for real data.
- Env vars for all Supabase keys.
- EAS Build for Android APK; install only on approved phones.
- Weekly data export, monthly full backup (see `docs/reports-and-exports.md`).
- Keep the indexes in `docs/schema.sql` in place for search performance.

## Testing Requirements

Before considering a feature/release done, verify:

- Approved device access works; unapproved and deactivated devices are blocked.
- Vehicle creation and lookup by license plate.
- Phone and mileage are enforced as required.
- Problem-customer toggle persists and shows correctly.
- Full new-service workflow (steps 1–4) completes and saves atomically.
- Injector count works correctly across the full 1–8 range.
- `service_injectors` rows are created to match `injector_count`.
- Model-based price loading populates correctly when a model match is found.
- Labor and parts both correctly apply to: all injectors, one injector, selected
  injectors, and general service.
- Price override (actual vs. default) is stored and flagged (`price_changed`).
- Totals and payment status calculate correctly (see
  `docs/workflow-new-service.md#pricing`).
- Vehicle history and service detail render correctly.
- Search stays fast with a large vehicle table.
- Export and audit log creation work.

## Development Roadmap (suggested order)

1. Project setup (Expo, TypeScript, Supabase client, navigation)
2. Supabase schema, indexes, seed data
3. Device approval flow
4. Core layout (tabs, cards, inputs, badges)
5. Vehicles: search, list, check, history
6. New-service steps 1–2 (Avtomobil, İnyektorlar)
7. Price catalog (models, labor, part variants, model prices)
8. New-service steps 3–4 (İş və ödəniş, Təsdiq) + save workflow
9. Service detail, payments, income screens
10. Reports, export
11. Testing and cleanup
