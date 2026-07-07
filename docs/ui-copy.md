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
Avtomobili yoxla     Mövcud avtomobili seç   Yeni qeyd yarat
Növbəti              Əvvəlki                 Əlavə et
Yadda saxla          Təsdiqlə və saxla       Redaktə et
Sil                  Zəng et                 Tarixçə
Detallar             Yenidən yoxla           Aktiv et
Deaktiv et
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

### Cihazlar Screen (Daha çox → Cihazlar)
Shows: Cihaz adı, Cihaz kodu, Status, Son istifadə, Qeyd.
Actions: Aktiv et, Deaktiv et, Cihaz adını dəyiş, Sil.

## Avtomobil (Step 1 of new service)

```
Dövlət nömrəsi *      [ 90-PP-123 ]
                       [ Avtomobili yoxla ]
Marka *                [ Toyota ]
Telefon *               [ 050 123 45 67 ]
Yürüş *                  [ 214000 ]
Problem təsviri *         [ Soyuqda gec işə düşür ]
Problemli müştəri         [ toggle ]
Problem səbəbi             [ Ödənişi gecikdirib ]
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

## İnyektorlar (Step 2)

General fields: İnyektor sayı, İnyektor şirkəti, İnyektor kodu,
Seriya nömrəsi / qeyd. Note shown: *"Bu məlumat bütün inyektorlara tətbiq olunur."*

Injector count buttons: `1 2 3 4 5 6 7 8` — default selected: **4**.

Injector company options: `Bosch, Delphi, Denso, Siemens, Continental, Digər`

Per-injector fields: İlkin test, Son test, Status, Problem, Görülən iş,
Dəyişilən hissələr, Qeyd.

**İlkin test:** Normal · Zəif axın · Çox axın · Geri axın az · Geri axın çoxdur ·
Sızma var · İşləmir · Kodlama problemi · Test edilmədi

**Son test:** Normal · Normaya salındı · Qismən düzəldi · Düzəlmədi ·
Dəyişdirilməlidir · Test edilmədi

**Status:** Normal · Təmir olundu · Təmizləndi · Dəyişdirildi · Problemli ·
Test edilmədi

**Problem (multi-select):** Geri axın çoxdur · Geri axın az · Sızma var ·
Nozzle problemi · Klapan problemi · Elektrik problemi · Kodlama problemi ·
Çirklənmə · Mexaniki zədə · Problem yoxdur · Digər

**Görülən iş (multi-select):** Söküldü · Yuyuldu · Ultrasəs təmizləndi ·
Nozzle dəyişildi · Klapan dəyişildi · Şayba dəyişildi · Kalibrləndi ·
Test edildi · Kodlandı · Dəyişdirildi · Heç bir iş görülmədi · Digər

## Model Match Feedback (in İnyektorlar / price catalog flow)

```
Model tapıldı: Bosch 0445110006
Qiymətlər bu modelə görə tətbiq olunacaq.
```
```
Bu model kataloqda yoxdur.
[ Model kimi əlavə et ]  [ Manual qiymətlə davam et ]
```

## İş və ödəniş (Step 3)

Sections: Görülən işlər, Dəyişilən hissələr, Əlavə xidmətlər, Qiymət xülasəsi, Ödəniş.

### Add labor
```
+ İş əlavə et

İş *                 [ Ultrasəs təmizləmə ▼ ]
Tətbiq et *          [ Bütün inyektorlara ▼ ]
Model qiyməti        15 AZN
Bu xidmət üçün qiymət [ 15 AZN ]
Say                  [ 4 ]
Cəm                  60 AZN
[ Əlavə et ]
```
Apply-target options: `Bütün inyektorlara, İnyektor 1..N (up to injector count),
Seçilmiş inyektorlar, Ümumi xidmət`. If "Seçilmiş inyektorlar," show a multi-select
checklist of injector numbers.

### Add part
```
+ Hissə əlavə et

Hissə *              [ Nozzle ▼ ]
Nozzle tipi *        [ Çin nozzle ▼ ]
Tətbiq et *          [ Bütün inyektorlara ▼ ]
Model qiyməti        35 AZN
Bu xidmət üçün qiymət [ 35 AZN ]
Say                  [ 4 ]
Cəm                  140 AZN
[ Əlavə et ]
```

Part options: `Nozzle, Klapan, Şayba, Filter, Elektrik hissəsi, Digər`
- Nozzle variants: İşlənmiş nozzle · Çin nozzle · Original nozzle · Müştərinin öz nozzle-i
- Klapan variants: Çin klapan · Original klapan · İşlənmiş klapan
- Şayba variants: Mis şayba · Original şayba · Adi şayba

Labor options (names): Sökülmə, Ultrasəs təmizləmə, Kalibrləmə, Test, Kodlama.
Extra options: Diagnostika, Ümumi yoxlama, Təcili xidmət.

## Təsdiq (Step 4) — full example

```
Təsdiq

Avtomobil: 90-PP-123 — Toyota
Telefon: 050 123 45 67
Status: Problemli müştəri (Səbəb: Ödənişi gecikdirib)
Yürüş: 214,000 km
Problem təsviri: Soyuqda gec işə düşür
İnyektor: 4 ədəd — Bosch 0445110006

Görülən işlər:
  Sökülmə — Bütün inyektorlara — 4 × 10 AZN = 40 AZN
  Ultrasəs təmizləmə — İnyektor 1, İnyektor 3 — 2 × 15 AZN = 30 AZN

Dəyişilən hissələr:
  Nozzle — Çin nozzle — Bütün inyektorlara — 4 × 35 AZN = 140 AZN

Qiymət:
  Görülən işlər: 90 AZN
  Hissələr: 140 AZN
  Endirim: 20 AZN
  Yekun: 210 AZN

Ödəniş:
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

## Avtomobillər (Vehicles List)

Card: plate, brand, phone, status, last mileage, service count, total spend,
remaining debt, last service date.
Filters: `Hamısı, Normal, Problemli, Borcu olanlar, Bu ay gələnlər, Çox xidmət görənlər`

## Avtomobil Tarixçəsi (Vehicle History)

Header: plate, brand, phone, status, problem reason, service count, total spend,
debt, last mileage, last service.
Each timeline card: date, mileage, injector count/company/code/summary, work done,
parts changed, final total, paid, remaining, payment status.

## Xidmət Detalı (Service Detail)

Header: service number, date, plate, brand, phone, status, mileage, payment status
(+ problem info if applicable).
Tabs: `Ümumi, İnyektorlar, İşlər, Hissələr, Qiymət, Ödəniş, Qeydlər`

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
Sections: İnyektor modelləri, Görülən işlər, Dəyişilən hissələr, Əlavə xidmətlər.
When editing a catalog price, show:
```
Bu dəyişiklik yalnız yeni xidmətlərə tətbiq olunacaq.
Əvvəlki xidmətlərin qiymətləri dəyişməyəcək.
```

## Validation & Warning Messages

```
Yeni yürüş əvvəlki yürüşdən azdır. Davam etmək istəyirsiniz?
```
Required-field markers: append `*` to every required label. Money/phone/mileage
inputs must use a numeric keyboard.
