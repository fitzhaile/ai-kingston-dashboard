# Jim Kingston's Fundraising, Examined

A campaign-finance analysis of the 2026 GA-1 Republican primary, centered on Jim Kingston's fundraising, built from public FEC filings. Written for a political-analyst audience — it examines where the money came from, how concentrated it is, and how the three campaigns' finances compare. Data runs through April 29, 2026 (the last pre-primary FEC filing before the May 19 primary).

## What It Shows

- **Overview** — headline metrics, three-candidate comparison, and the race timeline
- **Money** — cumulative and monthly fundraising, Farrell's self-financing, burn rate, and the actual April cash drawdown
- **Donors** — contribution-amount distribution (the $3,500 max-out cliff), donor-quality scorecard, occupations, top donors and bundler firms
- **Geography** — ZIP-level dollars on a GA-1 district choropleth and bubble map, wealthy-neighborhood concentration, income tiers, in-district vs. out-of-state
- **The Field** — bios, strengths, weaknesses, and vulnerabilities for all three candidates
- **Findings** — patterns beneath the surface of the filings (household max-outs, hedger donors, gender gaps, the legacy network)
- **Models** — six models built from FEC filings, Georgia Secretary of State records, and current federal campaign-finance law
- **Data Quality** — sources, scope, estimates, reconciliation, and the limitations behind every number

## Tech Stack

- **React 18** + **Vite**
- **Recharts** for all visualizations
- **Tailwind CSS 4** for styling
- Deployed as a static site on **Render**

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Data Source & Methodology

All contribution data comes from publicly available [FEC filings](https://www.fec.gov/) — Schedule A itemized individual contributions plus Form 3 summary totals, pulled via the OpenFEC API through 4/29/2026 (`congresscontributions_through_april2026.csv`). Schedule A rows are deduplicated by `transaction_id` to net out reattribution/redesignation memo entries. Derived itemized totals land within 0.3% of FEC's reported Form 3 itemized totals for Kingston, 1.9% for Montgomery, and 5.1% for Farrell (the export nets out some refund/redesignation activity); the Form 3 numbers are authoritative and are what the financial-summary panels display. ZIP-level median household income comes from Census ACS 2019–2023 5-year estimates (ZIP 31416 has no published estimate and is excluded from income calculations). Every dashboard constant can be regenerated with `python3 derive_dashboard_data.py`, and `python3 derive_dashboard_data.py --check` re-derives everything, diffs it against the constants and key figures in `Kingston_Dashboard.jsx`, and exits non-zero on any mismatch — run it before shipping any data change. The Geography maps' ZIP boundaries and the GA-1 district outline are regenerated separately by `python3 derive_geo_data.py` from Census TIGER/ZCTA sources. The data is embedded directly in the application — the deployed site makes no external API calls.
