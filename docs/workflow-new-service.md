# New Service Workflow

Four steps: **Avtomobil → İnyektorlar → İş və ödəniş → Təsdiq**.
Exact screen copy for each step is in `docs/ui-copy.md`; this doc covers the
logic and data rules.

## Step 1 — Avtomobil

Required: Dövlət nömrəsi, Marka, Telefon, Yürüş, Problem təsviri.
Optional: Problemli müştəri (toggle), Problem səbəbi.

"Avtomobili yoxla" looks up the vehicle by normalized license plate. If found,
show its current snapshot and offer **Mövcud avtomobili seç** or
**Yeni qeyd yarat**. If not found, prompt to add as new.

## Step 2 — İnyektorlar

Injector count: 1–8, default 4. Injector company: Bosch / Delphi / Denso /
Siemens / Continental / Digər. General fields (company, code, serial/note) apply
to the whole visit; per-injector fields (initial/final test, status, problem,
work done, parts replaced, note) are captured per physical injector, generating
one `service_injectors` row per unit.

If `injector_company + injector_code` matches an existing `injector_models` row,
surface the model match and note that catalog prices will apply. If not, let the
user either add it as a new model or continue with manual pricing.

## Step 3 — İş və ödəniş

### Apply targets

Labor and parts are **never** simple checkboxes. Every line item has an
`apply_target`:

- `all_injectors` — applies once per injector (quantity typically = injector count)
- `single_injector` — applies to exactly one injector
- `selected_injectors` — applies to a chosen subset (store injector numbers in
  `selected_injector_numbers`)
- `general_service` — not tied to any specific injector (e.g. diagnostics)

### Pricing

For every line item:
```
total_price = quantity × actual_unit_price
```

`default_unit_price` comes from `injector_model_prices` when a model match
exists (`price_source = 'model_price'`); otherwise the user enters
`actual_unit_price` manually (`price_source = 'manual_price'`). If
`actual_unit_price != default_unit_price`, set `price_changed = true`.

### Totals

```
labor_total       = sum of labor line items
parts_total       = sum of part line items
extra_total       = sum of extra line items
calculated_total  = labor_total + parts_total + extra_total
final_total       = calculated_total - discount_amount
remaining_amount  = final_total - paid_amount
```

### Payment status

```
paid_amount == final_total          → Ödənilib      (paid)
0 < paid_amount < final_total       → Qismən ödənilib (partially_paid)
paid_amount == 0                    → Ödənilməyib   (unpaid)
```
`cancelled` is set explicitly, not derived from the amounts above.

### Validation

- `actual_unit_price` and `discount_amount` cannot be negative.
- `quantity` cannot be less than 1.
- `paid_amount` cannot exceed `final_total`.
- If new mileage < vehicle's last known mileage, prompt for confirmation before
  continuing (see warning copy in `docs/ui-copy.md`).

## Step 4 — Təsdiq

Read-only summary of everything captured in steps 1–3 (see the full example
layout in `docs/ui-copy.md`). This is the last confirmation point before writing
to the database — nothing is persisted until **Təsdiqlə və saxla** is tapped.

## Save Logic (on "Təsdiqlə və saxla")

Run as a single atomic operation — **no partial saves**. Implement this as a
database-side Postgres RPC/function called from `src/services/`; multiple
Supabase client calls are not an acceptable substitute for this workflow.

1. Normalize license plate.
2. Find or create the vehicle.
3. Update vehicle: brand, phone, last_mileage, is_problem_customer, problem_reason.
4. Find or create the injector model (company + code).
5. Create the `service_records` row, storing the phone/problem-customer snapshot
   as of this visit.
6. Create one `service_injectors` row per unit (matching `injector_count`).
7. Save labor, part, and extra line items to `service_line_items`.
8. Calculate and store totals on `service_records`.
9. Create the `payments` row.
10. Write audit log rows for each audited change made by the transaction
    (vehicle create/update, service create, payment create, price overrides,
    problem-customer status change when applicable).

If any step fails, roll back the whole operation rather than leaving a
half-created service record.
