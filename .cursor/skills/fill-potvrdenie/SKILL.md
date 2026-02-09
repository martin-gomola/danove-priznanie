# Fill Daňové Priznanie from Potvrdenie o zdaniteľných príjmoch

Use this skill when the user provides a PDF or image of their **"Potvrdenie o zdaniteľných príjmoch"** (income tax confirmation from their employer) and wants to auto-fill the tax return form.

## Context

The **dane-priznanie** app (Next.js, running at `http://localhost:3015`) helps fill the Slovak DPFO typ B tax return. Section V (employment income) requires 4 values from the employer's confirmation document:

| Tax return field | Potvrdenie location | Description |
|---|---|---|
| `r36` | Oddiel IV, riadok 01 | Úhrn príjmov (gross income) |
| `r36a` | Oddiel IV, riadok 01a | Príjmy z dohôd (optional, often 0) |
| `r37` | Oddiel IV, riadok 02 | Úhrn povinného poistného (insurance total = social + health) |
| `r131` | Oddiel V, riadok 04 | Úhrn preddavkov na daň (tax advances withheld) |

## Steps

### 1. Read the document

Use the **Read** tool to read the PDF or image file the user provided. If it's an image, use the vision capabilities to read the values.

### 2. Extract the values

Identify these fields from the document:

- **Riadok 01** (Oddiel IV): gross employment income → `r36`
- **Riadok 01a** (Oddiel IV): income from work agreements (dohody) → `r36a` (use `"0"` if not present)
- **Riadok 02** (Oddiel IV): total mandatory insurance (social 02a + health 02b) → `r37`
- **Riadok 04** (Oddiel V): tax advances withheld by employer → `r131`

### 3. Verify the math

Before submitting, verify that **riadok 03 ≈ riadok 01 − riadok 02** (tax base = gross income − insurance). This cross-check confirms you've read the right values.

### 4. Post to the app API

Send the extracted values to the running app:

```bash
curl -X POST http://localhost:3015/api/form \
  -H "Content-Type: application/json" \
  -d '{
    "employment": {
      "enabled": true,
      "r36": "GROSS_INCOME",
      "r36a": "DOHODY_INCOME",
      "r37": "INSURANCE_TOTAL",
      "r131": "TAX_ADVANCES"
    }
  }'
```

Replace the placeholders with the actual numeric strings (e.g. `"32400.00"`). All values are in EUR with 2 decimal places as strings.

### 5. Confirm to the user

After a successful POST, tell the user:
- Which values were extracted and submitted
- The cross-check result (r.36 − r.37 = r.38)
- That the app will auto-merge the data within ~3 seconds (they'll see a toast notification)

## Example

User: "Fill the employment section from this PDF: ~/Documents/potvrdenie-2025.pdf"

1. Read the PDF
2. Extract: r01=32400.00, r01a=0.00, r02=4341.60, r04=3648.00
3. Cross-check: 32400.00 − 4341.60 = 28058.40 ✓ (matches r03)
4. POST to API with `{ employment: { enabled: true, r36: "32400.00", r36a: "0.00", r37: "4341.60", r131: "3648.00" } }`
5. Confirm: "Extracted and submitted 4 values. Tax base r.38 = 28 058,40 EUR."

## API Reference

- **Endpoint**: `POST http://localhost:3015/api/form`
- **Content-Type**: `application/json`
- **Body**: Partial `TaxFormData` - any section can be updated, not just employment
- **Response**: `{ "ok": true, "message": "Form update queued" }`

The app polls `GET /api/form` every 3 seconds and auto-merges any queued update.

## Supported form sections

The API accepts any combination of these top-level keys:

```json
{
  "personalInfo": { "rodneCislo": "...", "priezvisko": "...", ... },
  "employment": { "r36": "...", "r37": "...", "r131": "...", "r36a": "..." },
  "dividends": { "enabled": true, "entries": [...] },
  "mutualFunds": { ... },
  "mortgage": { ... },
  "spouse": { ... },
  "childBonus": { ... },
  "twoPercent": { ... }
}
```
