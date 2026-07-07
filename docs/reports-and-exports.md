# Reports & Exports

Location: **Daha çox → Hesabatlar**.

## Available Reports

- Gəlir hesabatı (income)
- Avtomobil hesabatı (vehicles)
- İnyektor hesabatı
- Ödəniş hesabatı
- Xidmət hesabatı
- Hissə hesabatı (parts)
- Qiymət dəyişiklikləri hesabatı (price changes)
- Borclar hesabatı (debts)
- Problemli müştərilər

### Avtomobil hesabatı
Most frequent vehicles, service count by brand, top spenders, vehicles with
outstanding debt, vehicles flagged as problem customers.

### İnyektor hesabatı
Most frequent injector company, most frequent injector code, service count by
model, average service amount by model.

### Hissə hesabatı
Most-replaced part; count of Nozzle replacements broken down by variant
(Çin / Original / İşlənmiş); revenue from parts.

### Qiymət dəyişiklikləri hesabatı
Which services had a price override, what the model price was, what was actually
charged, and the difference — sourced from `service_line_items.price_changed`.

### Borclar hesabatı
Vehicles with outstanding debt: plate, phone, remaining amount, last service date.

### Problemli müştərilər
Note: there's no customer table, so this report is really "problem
vehicles/contacts." Show: plate, brand, phone, problem reason, remaining debt,
last service date.

## Export

Formats: CSV and Excel.
Exportable data: Avtomobillər, Xidmətlər, İnyektor nəticələri, Ödənişlər,
Qiymət kataloqu, Service line items, Cihazlar.

Recommended cadence: weekly export, monthly full backup (see
`docs/architecture.md#production-rules`).
