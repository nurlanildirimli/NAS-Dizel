# New Service Workflow

Three steps: **Avtomobil → Qeydlər → Təsdiq**.
Exact screen copy for each step is in `docs/ui-copy.md`; this doc covers the
logic and data rules.

## Step 1 — Avtomobil

Required: Dövlət nömrəsi, Marka, Telefon, Yürüş, Problem təsviri.
Optional: Problemli müştəri (toggle), Problem səbəbi.

"Avtomobili yoxla" looks up the vehicle by normalized license plate. If found,
show its current snapshot and offer **Mövcud avtomobili seç** or
**Yeni qeyd yarat**. If not found, prompt to add as new.

## Step 2 — Qeydlər

The mechanic writes a free-form diesel injector service note or records one or
more local voice notes. When the mechanic asks for professional text, the app
first sends untranscribed local audio to `ai-transcribe-service-note`, lets the
mechanic review/edit the transcript, and then sends the confirmed raw note to
`ai-professional-service-note`. The professional note response returns:
professional service text, detected price lines, total price, missing
information, and basic injector hints when present.

`Yadda saxla` stores unfinished work in `service_drafts` and local storage.
Supabase stores only text, pricing, and an opaque local recording key. Audio
files and recording metadata remain on the phone and are deleted after the final
service is saved or the draft is deleted.

AI Edge Functions log metadata-only usage rows to `ai_usage_logs` for internal
cost/debug visibility. Logs include feature, model, status, token/audio counts,
retry count, estimated cost, and short error summaries only; they must not store
raw mechanic notes, transcripts, professional service text, audio, phone, or
license plate. Cost estimates use Supabase secrets:
`OPENAI_TEXT_INPUT_USD_PER_1M`, `OPENAI_TEXT_OUTPUT_USD_PER_1M`, and
`OPENAI_TRANSCRIBE_USD_PER_MINUTE`.

## Pricing

The simplified text-service flow creates one general line item named
`Servis yekunu` from the confirmed `Qiymət` value. This keeps reports, income,
payments, and service detail compatible with the existing totals logic.

Legacy structured line items still support apply targets:

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

## Step 3 — Təsdiq

Editable summary of vehicle data, professional service text, raw mechanic note,
AI warnings, price, discount, paid amount, and problem-customer status. This is
the last confirmation point before writing to the database — nothing is persisted
as a final service until **Təsdiqlə və saxla** is tapped.

## Save Logic (on "Təsdiqlə və saxla")

Run as a single atomic operation — **no partial saves**. Implement this as a
database-side Postgres RPC/function called from `src/services/`; multiple
Supabase client calls are not an acceptable substitute for this workflow.

1. Normalize license plate.
2. Find or create the vehicle.
3. Update vehicle: brand, phone, last_mileage, is_problem_customer, problem_reason.
4. Find or create the injector model (company + code). The text-service flow uses
   AI-detected values when present, otherwise fallback values: `Unknown` and
   `AI-NOTE`.
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
