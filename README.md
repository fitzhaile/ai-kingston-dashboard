# Kingston FEC Contribution Insights Dashboard

Interactive dashboard analyzing federal campaign contribution patterns for Kingston's congressional campaign, built from public FEC filings.

## What It Shows

- **KPI Summary** — headline metrics across all filing periods
- **Amount Clustering** — contribution amount distribution revealing round-number patterns
- **Household Bundling** — family pairs contributing near or at individual limits
- **Filing Timeline** — contribution volume and averages across Jul 2025, Dec 2025, and Jan 2026 filings
- **DC/VA Corridor** — out-of-state donor occupation breakdown (consultants, lobbyists, military)
- **Employer Networks** — top employer-linked donor clusters
- **Occupation Mix** — contribution totals by occupation (attorneys, homemakers, owners, etc.)
- **Refund Patterns** — refund frequency and amounts
- **Geography** — state-level donor distribution (heavily Georgia-concentrated)

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

## Data Source

All contribution data comes from publicly available [FEC filings](https://www.fec.gov/). The data is embedded directly in the application — no external API calls are made.
