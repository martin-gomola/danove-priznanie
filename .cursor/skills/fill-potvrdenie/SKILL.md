---
name: fill-potvrdenie
description: Extract employment data from Slovak "Potvrdenie o zdaniteľných príjmoch" PDF/image and submit to the dane-priznanie app API. Use when the user provides a Potvrdenie PDF, mentions uploading employment data, or says "upload-priznanie".
---

# Fill Potvrdenie o zdaniteľných príjmoch

## Field Mapping

| Potvrdenie | API field | Description |
|---|---|---|
| Oddiel IV, r. 01 | `r36` | Úhrn príjmov (gross income) |
| Oddiel IV, r. 01a | `r36a` | Príjmy z dohôd (use `"0.00"` if absent) |
| Oddiel IV, r. 02 | `r37` | Povinné poistné (social + health) |
| Oddiel V, r. 04 | `r131` | Preddavky na daň (tax advances) |

## Workflow

1. **Read** the PDF/image using the Read tool
2. **Extract** the 4 values from the field mapping above
3. **Cross-check**: r.01 - r.02 should equal r.03 on the document
4. **Read token** from the project `.env` file (`FORM_API_TOKEN`)
5. **POST** to the API (see below)
6. **Confirm** extracted values and cross-check result to the user

## API Call

```bash
curl -X POST http://localhost:3015/api/form \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FORM_API_TOKEN" \
  -d '{
    "employment": {
      "enabled": true,
      "r36": "<value>",
      "r36a": "<value>",
      "r37": "<value>",
      "r131": "<value>"
    }
  }'
```

All values are EUR strings with 2 decimal places (e.g. `"32400.00"`).

The app polls every 3s and auto-merges the data (toast notification on success).

## Security

- **Token required**: Read `FORM_API_TOKEN` from `.env`. API rejects POST without valid token.
- **Localhost recommended**: This sends sensitive tax data. Use on localhost only. For remote servers, confirm URL with the user first.

## Example

```
User: Fill employment from ~/Documents/potvrdenie-2025.pdf

1. Read PDF → r01=32400.00, r01a=0.00, r02=4341.60, r04=3648.00
2. Cross-check: 32400.00 - 4341.60 = 28058.40 ✓ (matches r03)
3. POST → { employment: { enabled: true, r36: "32400.00", ... } }
4. "Extracted 4 values. Tax base r.38 = 28 058,40 EUR."
```
