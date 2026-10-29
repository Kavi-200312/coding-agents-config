# Sheet Integration — SharePoint Excel (PENDING, not active)

Read this file ONLY when the user wants the update written into the tracking spreadsheet.

## Target sheet

- `Tracks_day-to-day_development.xlsx` — on Mythili's OneDrive; user has shared edit access.
- Weekly tabs named like `Daily Status Oct -26 to Oct 30`.
- Columns: `Date | Developer Name | Project Name | Module | Task Description | Scope | Status | Expected Timeline | Actual Timeline | Comments/Remarks`.
- Rows grouped per merged date cell; one row per developer per day.

Current flow: generate update → user pastes manually.

## Built so far

- `scripts/update-sheet.mjs` — zero-dep Node script. Device-code auth, token cache, Graph workbook calls.
  - `--tabs` — list worksheet tabs
  - `--check` — show today's rows in the current weekly tab
  - `--write "<task text>" [--module X --scope Y --status Z]` — writes `Task Description` for today's date + developer row (creates a row if none exists)
- Config: `scripts/config.json` (beside the script — self-contained, moves with the skill)
  - `clientId`: `4008fdd4-5ea5-4d57-b79d-6af54a69d812` (Entra app `daily-update`, public client)
  - `tenantId`: `e196415f-ae1f-4334-8fb6-e3d1e292a9e3`
  - `shareUrl`: the `:x:/r/` share link — NOT the `Doc.aspx` path and NOT `.url` shortcuts (those don't resolve/sync bytes)
  - `developerName`: `Kaviyarasu`
  - Token cache: `scripts/token.json`, auto-created on first auth (chmod 600).

## Azure app registration — setup walkthrough (one-time, done 2026-10-29)

1. portal.azure.com → Microsoft Entra ID → **App registrations** → **New registration**
   - Name: `daily-update`; supported account types: **this org only**; no redirect URI needed
2. **API permissions** → Add a permission → **Microsoft Graph** → **Delegated permissions**:
   - `Files.ReadWrite` — own files
   - `Files.ReadWrite.All` — all files the user can access, incl. files shared to them (**required — `.ReadWrite` alone 403s on shared files**)
   - `Sites.ReadWrite.All` — fallback for share/site resolution
   - `offline_access` — refresh token (no re-sign-in every hour)
3. **Authentication** → Advanced settings → **"Allow public client flows" = Yes** — required for device-code auth; without it token request fails `AADSTS7000218 (client_secret required)`
4. Admin consent: `.All` scopes trigger "Need admin approval" on sign-in in this tenant — admin clicks **"Grant admin consent for StinSoft Technologies"** on the API permissions page.

Device-code auth notes:
- `shares/{shareId}/driveItem` expects the `:x:/r/` share URL — `Doc.aspx` paths and `.url` shortcuts fail (`7404`/`403`).
- Verify scope actually in token: decode JWT `scp` claim — must contain the `.All` scope.

## Blocker — resume path

Tenant requires **admin consent** for `Files.ReadWrite.All` and `Sites.ReadWrite.All` (already added to the app registration, but not granted — consent screen showed "Need admin approval").

- `Files.ReadWrite` alone covers ONLY the user's own files — shared files return 403 (verified).
- To unblock: an admin clicks **"Grant admin consent for StinSoft Technologies"** on the app registration → API permissions page.
- After consent: delete `token.json`, run `node scripts/update-sheet.mjs --tabs` → new device code → works.

Fallback if consent is never granted: Excel COM automation — open the SharePoint URL in the user's local Excel (signed in with their work account), edit cell, save. Slower and fragile; use only on explicit request.

## When active — flow

1. Generate the daily update as usual.
2. Confirm Module/Scope/Status values with the user (flags: `--module`, `--scope`, `--status`).
3. Run `update-sheet.mjs --write "<generated update text>"` — script finds the current week tab, today's date block, and the developer row.
