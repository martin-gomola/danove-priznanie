Read the PDF at $ARGUMENTS and extract employment data from "Potvrdenie o zdaniteľných príjmoch".

## Field mapping

| Potvrdenie | Field | Description |
|---|---|---|
| Oddiel IV, r. 01 | r36 | Úhrn príjmov |
| Oddiel IV, r. 01a | r36a | Príjmy z dohôd (use "0.00" if absent) |
| Oddiel IV, r. 02 | r37 | Povinné poistné (social + health) |
| Oddiel V, r. 04 | r131 | Preddavky na daň |

## Steps

1. Read the PDF, extract the 4 values above
2. Cross-check: r.01 - r.02 = r.03 (základ dane)
3. Ask the user for their **session token** (shown on the `/developer` page in the app). Each browser has a unique token stored in localStorage (`dane-priznanie-session-token`).
4. POST to the app:

```bash
curl -X POST <BASE_URL>/api/form \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -d '{"employment":{"enabled":true,"r36":"<val>","r36a":"<val>","r37":"<val>","r131":"<val>"}}'
```

All values: EUR strings, 2 decimal places (e.g. "32400.00").

5. Confirm extracted values and cross-check result

## Notes

- **Token**: Each user has a unique per-session token (UUID). Do NOT read from `.env` — ask the user or have them copy it from `/developer`.
- **Base URL**: Default is `http://localhost:3015`. For remote servers, confirm the URL with the user first.
- Sensitive tax data — prefer localhost.
