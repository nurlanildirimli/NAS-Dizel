# UI Copy Reference (Azerbaijani)

All user-facing text is Azerbaijani. Code, DB fields, and comments stay English —
never mix the two in what the user sees. Use these exact strings; don't invent
new phrasing for existing concepts. If a needed label, message, title, or action
is missing from this file, add it here first and then use that exact string in
the app.

## UI Design Images

All UI Design Images are in the `docs/ui-designs/` take them as the strongest reference and create Design accordingly.

## Bottom Navigation

```
Axtarış | Yeni | Gəlir | Avtomobillər | Daha çox
```
App opens to **Axtarış** after device approval.

## Common Buttons

```
Mövcud avtomobili seç   Yeni qeyd yarat      Növbəti
Əvvəlki                 Əlavə et             Yadda saxla
Təsdiqlə və saxla       Redaktə et           Sil
Zəng et                 Tarixçə              Detallar
Yenidən yoxla           Aktiv et             Deaktiv et
Baştan başla
```

## Status Labels

```
Normal müştəri       Problemli müştəri
Ödənilib             Qismən ödənilib          Ödənilməyib
Ləğv edilib
Qiymət dəyişdirildi  Qiymət dəyişdirilməyib
```

## Device Activation Screen

```
Cihaz aktiv deyil

Bu cihaz sistemə əlavə edilməyib.
Cihaz kodunu sahibkara göndərin.

Cihaz kodu:
A7K9-24PX

[ Yenidən yoxla ]
```

### Deactivated Device Screen
```
Bu cihazın girişi bağlanıb.
Sahibkarla əlaqə saxlayın.
```

### Device Check Error
```
Cihaz yoxlanıla bilmədi.
Yenidən yoxlayın.
Supabase ayarları APK build-ə daxil edilməyib.
```

### Cihazlar Screen (Daha çox → Cihazlar)
Shows: Cihaz adı, Cihaz kodu, Status, Son istifadə, Qeyd.
Actions: Aktiv et, Deaktiv et, Cihaz adını dəyiş, Sil.

Filters: `Aktiv, Gözləmədə, Deaktiv, Silinmiş, Hamısı`
Status labels: `Aktiv, Gözləmədə, Deaktiv, Silinib`

Fields:
```
Cihaz adı
Cihaz kodu
Status
Son istifadə
Yaradıldı
Qeyd
```

Confirmation messages:
```
Bu cihazı aktiv etmək istəyirsiniz?
Bu cihazı deaktiv etmək istəyirsiniz?
Bu cihazı silmək istəyirsiniz?
```

## Avtomobil (Step 1 of new service)

```
Dövlət nömrəsi *      [ 90-PP-123 ]
                       Avtomobil avtomatik yoxlanılır
Marka *                [ Toyota ]
Telefon *               [ 050 123 45 67 ]
Yürüş *                  [ 214000 ]
Problem təsviri           [ Soyuqda gec işə düşür ]
                            [ Növbəti ]
```

**Vehicle found:**
```
Bu avtomobil bazada var

Dövlət nömrəsi: 90-PP-123
Marka: Toyota
Telefon: 050 123 45 67
Status: Problemli müştəri
Səbəb: Ödənişi gecikdirib
Son yürüş: 214,000 km
Son xidmət: 12.05.2024
Qalan borc: 80 AZN

[ Mövcud avtomobili seç ]  [ Yeni qeyd yarat ]
```

**Vehicle not found:**
```
Bu avtomobil bazada yoxdur.
Yeni avtomobil kimi əlavə edin.
```

## Injectorlar (Step 2)

General fields: Injector sayı, Injector şirkəti, Injector kodu.
Note shown: *"Bu məlumat bütün injectorlara tətbiq olunur."*

Injector count buttons: `1 2 3 4 5 6 7 8` — default selected: **4**.

Injector company options: `Bosch, Delphi, Denso, Siemens`

Per-injector fields: Problem, Detal, Qeyd.

**Problem (multi-select):** Geri axın çoxdur · Geri axın az · Sızma var ·
İynə problemi · Qapaq problemi · Elektrik problemi · Kodlama problemi ·
Çirklənmə · Mexaniki zədə · Problem yoxdur · Digər

**Detal checklist:** catalog labor and part rows with visible price and `Dəyiş`
price override action. `Əlavə et` creates a custom detail with name and price for
the active injector.

## Model Match Feedback (in İnyektorlar / price catalog flow)

```
Model tapıldı: Bosch 0445110006
Qiymətlər bu modelə görə tətbiq olunacaq.
```
```
Bu model kataloqda yoxdur.
[ Model kimi əlavə et ]  [ Manual qiymətlə davam et ]
```

## Təsdiq (Step 3) — full example

```
Təsdiq

Avtomobil: 90-PP-123 — Toyota
Telefon: 050 123 45 67
Yürüş: 214,000 km
Problem təsviri: Soyuqda gec işə düşür
Injector: 4 ədəd — Bosch 0445110006
Problemli müştəri [ toggle ]
Problem səbəbi [ Ödənişi gecikdirib ]

Görülən işlər:
  Sökülmə — Bütün inyektorlara — 4 × 10 AZN = 40 AZN
  İynə — Çin iynə — Injector — 1 × 35 AZN = 35 AZN

Qiymət:
  Görülən işlər: 90 AZN
  Hissələr: 140 AZN
  Endirim: 20 AZN
  Yekun: 210 AZN

Ödəniş:
  Endirimli qiymət: 210 AZN
  Ödənilən: 100 AZN
  Qalan: 110 AZN
  Status: Qismən ödənilib

[ Təsdiqlə və saxla ]
```

## Axtarış (Search) Screen

Placeholder: `Nömrə, telefon, marka axtar...`
Filters: `Hamısı, Problemli, Borcu olanlar, Ödənilməyib, Qismən ödənilib, Son xidmətlər`
Result card shows: plate, brand, phone, normal/problem status (+ reason if
problemli), last service date, last mileage, injector summary, payment status,
remaining debt. Actions: Tarixçə, Yeni xidmət, Zəng et, Detallar.

Empty/error states: `Nəticə tapılmadı`, `Məlumat yüklənmədi`, `Yenidən yoxla`.

## Form Validation

```
Bu sahə mütləqdir
Düzgün dəyər daxil edin
```

## Avtomobillər (Vehicles List)

Card: plate, brand, phone, status, last mileage, service count, total spend,
remaining debt, last service date.
Filters: `Hamısı, Normal, Problemli, Borcu olanlar, Bu ay gələnlər, Çox xidmət görənlər`

## Avtomobil Tarixçəsi (Vehicle History)

Header: plate, brand, phone, status, problem reason, service count, total spend,
debt, last mileage, last service.
Each timeline card: date, mileage, injector count/company/code/summary, work done,
parts changed, final total, paid, remaining, payment status.
Empty state: `Xidmət tarixçəsi yoxdur`.

## Xidmət Detalı (Service Detail)

Header: service number, date, plate, brand, phone, status, mileage, payment status
(+ problem info if applicable).
Tabs: `Ümumi, İnyektorlar, İşlər, Hissələr, Qiymət, Ödəniş, Qeydlər`
Placeholder title: `Xidmət Detalı`

If a line item's price was overridden, show:
```
Model qiyməti: 35 AZN
Bu xidmət üçün: 32 AZN
Qiymət dəyişdirildi
```

## Gəlir (Income) Screen

Metrics: Bu gün gəlir, Bu ay gəlir, Bu il gəlir, Qalan borc, Bu ay xidmət sayı,
Bu ay avtomobil sayı, Bu ay inyektor sayı.
Filters: `Bu gün, Bu həftə, Bu ay, Bu il, Tarix aralığı`
Charts: Aylıq gəlir, İllik gəlir, Gələn avtomobillər, Gələn inyektor modelləri,
İş gəliri, Hissə gəliri, Endirimlər.

## Ödənişlər (Payments) Screen

Filters: `Hamısı, Ödənilib, Qismən ödənilib, Ödənilməyib, Borcu olanlar`
Card: date, plate, phone, final total, paid, remaining, status.
Actions: Ödəniş əlavə et, Tam ödənildi kimi işarələ, Xidmət detalı,
Avtomobil tarixçəsi, Zəng et.

Payment method labels:

| DB code | UI label |
|---|---|
| `cash` | Nağd |
| `card` | Kart |
| `transfer` | Köçürmə |
| `debt` | Borc |
| `mixed` | Qarışıq |

## Qiymət Kataloqu (Price Catalog)

Location: Daha çox → Qiymət kataloqu.
Sections: Injector modelləri, Detal.
Fields: İnyektor şirkəti, İnyektor kodu, Model adı, Qeyd, Qiymət.
Detal actions: Əlavə et, Redaktə et, Sil.
Detal fields: Ad, Tip (`İş`, `Hissə`, `Əlavə`).
When editing a catalog price, show:
```
Bu dəyişiklik yalnız yeni xidmətlərə tətbiq olunacaq.
Əvvəlki xidmətlərin qiymətləri dəyişməyəcək.
```

## Hesabatlar (Reports)

Location: Daha çox → Hesabatlar.
Reports: Gəlir hesabatı, Avtomobil hesabatı, İnyektor hesabatı, Ödəniş hesabatı,
Xidmət hesabatı, Hissə hesabatı, Qiymət dəyişiklikləri hesabatı, Borclar
hesabatı, Problemli müştərilər.
Export datasets: Avtomobillər, Xidmətlər, İnyektor nəticələri, Ödənişlər,
Qiymət kataloqu, Service line items, Cihazlar.
Actions: CSV, Excel, Yüklə.

## Validation & Warning Messages

```
Yeni yürüş əvvəlki yürüşdən azdır. Davam etmək istəyirsiniz?
Formu başdan başlamaq istəyirsiniz?
Bu xidməti silmək istəyirsiniz?
Bu avtomobili silmək istəyirsiniz?
Bu ödənişi silmək istəyirsiniz?
```
Required-field markers: append `*` to every required label. Money/phone/mileage
inputs must use a numeric keyboard.
