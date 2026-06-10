# Jim Kingston's Fundraising, Examined

A campaign-finance analysis of the 2026 GA-1 Republican primary, centered on Jim Kingston's fundraising, built from public FEC filings. Written for a political-analyst audience — it examines where the money came from, how concentrated it is, and how the three campaigns' finances compare. Data runs through March 31, 2026 (the pre-primary Q1 filing).

## What It Shows

- **Overview** — headline metrics, three-candidate comparison, and the race timeline
- **Money** — cumulative and monthly fundraising, Farrell's self-financing, burn rates and runway
- **Donors** — contribution-amount distribution (the $3,500 max-out cliff), donor-quality scorecard, occupations, top donors and bundler firms
- **Geography** — ZIP-level dollars, wealthy-neighborhood concentration, income tiers, in-district vs. out-of-state
- **The Field** — bios, strengths, weaknesses, and vulnerabilities for all three candidates
- **Findings** — patterns beneath the surface of the filings (household max-outs, hedger donors, gender gaps, the legacy network)
- **Models** — six deterministic models built strictly from FEC filings and Georgia Secretary of State records

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

All contribution data comes from publicly available [FEC filings](https://www.fec.gov/) — Schedule A itemized individual contributions plus Form 3 summary totals, pulled via the OpenFEC API through 3/31/2026 (`congresscontributions_through_march2026.csv`). Schedule A rows are deduplicated by `transaction_id` to net out reattribution/redesignation memo entries; derived totals reconcile to FEC's reported itemized totals within ~0.15%. ZIP-level median household income comes from Census ACS 5-year estimates. Every dashboard constant can be regenerated with `python3 derive_dashboard_data.py`. The data is embedded directly in the application — the deployed site makes no external API calls.
