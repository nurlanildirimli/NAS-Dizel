# Deleted UI Items Still Present In DB

This file tracks fields and options removed from the app UI but still kept in the
database, RPC payloads, or read models for compatibility. Do not remove these from
the database until production data and dependent code paths are reviewed together.

## Removed From UI

- `service_injectors.initial_test_result`
- `service_injectors.final_test_result`
- `service_injectors.injector_status`
- `service_records.injector_serial_info`

These fields are no longer collected in `Yeni -> Injectorlar`, but they still exist
in the schema and save/read compatibility paths.

## Removed Options

- Injector company option: `Continental`
- Injector company option: `Digər`

These options were removed from the new-service UI/type/schema. Existing database
rows may still contain these values because `service_records.injector_company` and
`injector_models.company` are text fields.

## Current Compatibility Paths

- `docs/schema.sql`
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/003_save_service_rpc.sql`
- `src/services/newService.ts`
- `src/services/services.ts`
- `src/schemas/services.ts`
- SQL smoke tests and test seed files that still include old payload fields
- Service detail screens that can still display older saved values

## Future Cleanup Checklist

- Confirm no production records need the removed values.
- Decide whether historical display should be preserved before dropping columns.
- Update DB schema docs and add a migration if columns are removed.
- Update `save_service` RPC payload handling.
- Update client save payload and read models.
- Update seed, smoke tests, reports/exports, and service detail display together.
- Run full app checks after cleanup.
