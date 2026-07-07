# What To Avoid

This app is for fast workshop use. It must stay simple, vehicle-first, and
mobile-friendly. Do not introduce:

- A `customers` table, customer name field, or any customer entity
- A login screen or PIN screen
- Technician name tracking
- File upload anywhere in the app
- `model` / `year` / `engine` / `vin` fields on `vehicles`
- `problem_description` stored on `vehicles` (it belongs only on `service_records`)
- Labor or parts modeled as a simple checkbox instead of an `apply_target`
- Pricing entered without an injector/apply-target association
- Frontend-only price calculations that are never persisted
- Loading the entire `vehicles` table to the client for search
- Hardcoding prices only in the frontend instead of `injector_model_prices`
- Mixing Azerbaijani and English in the same UI screen
- Permanently deleting important records, services, payments, vehicles, or devices
  (use `is_deleted` / `deleted_at` instead)
- A backend server before it's actually needed — Supabase-direct is the MVP approach
- An inventory management system in v1
- AI-powered search in v1
- Full offline sync in v1

## The App Should Always Be Able to Answer

- Has this car been here before?
- What injector model does it have?
- What was done before?
- Which injectors were repaired?
- Which parts were changed?
- What price was used?
- How much was paid, and how much debt remains?
- Is this vehicle/contact a "problemli müştəri"?

When in doubt, prefer a clear workflow and reliable data over an extra feature.
