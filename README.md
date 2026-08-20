# QR Point

Scan a QR code on a jobsite (or type a point number) to instantly pull up that point's survey data — coordinates, description, layer, and whatever else was in the original Trimble CSV export. Shared tool for **BIM-Press.com** and **TotalStationTech.com**.

Replaces handwritten point numbers on laser labels: export from your total station, upload the CSV here, print the generated QR label sheet, stick them on stakes/equipment/wherever, scan in the field.

## How it works

1. Upload a Trimble point-export CSV on the home page.
2. Preview the parsed columns to sanity-check the file before confirming (nothing is saved yet).
3. Confirm — the CSV is sent to a Netlify Function, which parses it (any column layout, no fixed schema) and stores one row per point in Supabase.
4. Download the generated PDF label sheet — one QR code + point number per label, laid out 3-across on US Letter paper, ready to print.
5. In the field, scan a label (or use the manual search box on the lookup page) to see that point's full data on a phone-friendly page. No login required.

## Tech stack

- **Frontend:** plain HTML / CSS / vanilla JS — `public/`
- **Backend:** Netlify Functions — `netlify/functions/`
- **Database:** Supabase (Postgres), points stored with a flexible `jsonb` column so varying Trimble export templates don't require schema changes
- **QR generation:** `qrcode` (npm) + `pdf-lib` for the printable label sheet, both run server-side in a Netlify Function

## Project structure

```
qr-point/
├── netlify.toml              # redirects (/p/:id, /api/*) + build config
├── netlify/functions/
│   ├── _supabase.js          # shared Supabase client + response helpers
│   ├── process-csv.js        # parses CSV, upserts points, returns manifest
│   ├── get-point.js          # fetch one point's data for the lookup page
│   ├── search-points.js      # manual point-number search fallback
│   └── qr-batch.js           # generates the printable QR label PDF
├── public/
│   ├── index.html            # upload + preview + confirm + download PDF
│   ├── p/index.html          # lookup page (served at /p/{pointID})
│   └── assets/
│       ├── style.css         # shared, brand-neutral styles
│       └── theme.js          # brand theme switrcher (BIM-Press / TotalStationTech / neutral)
├── supabase/schema.sql       # run once in the Supabase SQL editor
├── sample-data/sample_points.csv
└── .env.example
```

## Local dev setup

**Prerequisites:** Node 18+, a free [Supabase](https://supabase.com) account, a free [Netlify](https://netlify.com) account, and the Netlify CLI.

```bash
npm install
npm install -g netlify-cli   # if you don't already have it

cp .env.example .env
# edit .env and fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see below)

netlify dev
# serves the site + functions together, usually at http://localhost:8888
```

Upload `sample-data/sample_points.csv` on the home page to test the whole flow end to end with a working demo project.

## Supabase setup

1. Create a new Supabase project (free tier is fine).
2. Go to **SQL Editor > New query**, paste the contents of `supabase/schema.sql`, and run it. This creates the `points` table with Row Level Security enabled and no public policies — the app only ever talks to Supabase through the Netlify Functions using the **service role** key, which bypasses RLS. The anon/public key is never used and doesn't need to be set anywhere.
3. Go to **Project Settings > API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (not `anon`!) → `SUPABASE_SERVICE_ROLE_KEY`

Keep the service role key secret — it has full database access. It only belongs in Netlify's environment variables and your local `.env`, never in frontend code or a public repo.

## Environment variables

| Variable | Where it's used | Notes |
|---|---|---|
| `SUPABASE_URL` | Netlify Functions | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify Functions | Service role key — server-side only, never shipped to the browser |

Set both in **Netlify: Site settings > Environment variables** for the deployed site, and in a local `.env` (git-ignored) for `netlify dev`.

## Deploy to Netlify

1. Push this repo to GitHub (see below).
2. In Netlify: **Add new site > Import an existing project**, connect the repo.
3. Build settings are already defined in `netlify.toml` (publish `public/`, functions in `netlify/functions/`) — you shouldn't need to change anything.
4. Add the two environment variables above under **Site settings > Environment variables**.
5. Deploy. Netlify will give you a free subdomain like `qrpoint-yourname.netlify.app` — good enough to start; you can point a custom domain at it later whenever you decide between a BIM-Press/TotalStationTech subdomain or a dedicated domain.

## Pushing this to GitHub

This folder is already a local git repo with an initial commit. To push it:

```bash
gh repo create qr-point --private --source=. --remote=origin --push
# or, without the gh CLI:
git remote add origin https://github.com/YOUR-USERNAME/qr-point.git
git branch -M main
git push -u origin main
```

## Brand theming

The app is brand-neutral by default — colors and the logo badge come from CSS custom properties set in `public/assets/theme.js`. Three presets are included: `bp` (BIM-Press, orange/black), `tst` (TotalStationTech, yellow/hex), and `neutral`. Switch between them with `?brand=bp` or `?brand=tst` in the URL, or theme.js will auto-detect based on the hostname (`bim-press` / `totalstationtech`). The current build ships with **BIM-Press as the default** theme.

To swap in real logos instead of the text-badge placeholder, replace the `.logo-badge` element's content in `public/index.html` / `public/p/index.html` with an `<img>`, and add a `--logo-image` entry per brand in `theme.js`.

## Open questions / v1 decisions made so far

- **Hosting:** starting on Netlify's free subdomain; move to a BIM-Press/TotalStationTech subdomain or a dedicated domain later — just repoint DNS, no app changes needed.
- **Data retention:** points persist indefinitely for now (no auto-expiry or delete-by-project UI yet — easy to add later against the `project_id` column).
- **Label format:** PDF label sheet, 3 columns × 7 rows per US Letter page (`netlify/functions/qr-batch.js`) — adjust `COLS`/`ROWS`/`QR_SIZE` there if you're using a specific Avery template.

## Roadmap (not built yet, data model supports it)

- Linking points to RFIs / plan sets — the `raw_data` jsonb column and `project_id` grouping leave room to add related-record references without a migration.
- Auth for uploading/managing projects (v1 upload page has no login — anyone with the URL can upload; fine for internal use, worth locking down before wider rollout).
- Delete-by-project and/or auto-expiry, if old jobsite data needs to be cleared out.
