# Scottish Budget 2026-27 Dashboard

Interactive dashboard analyzing the impact of Scottish Budget 2026-27 policies on households across Scotland, powered by [PolicyEngine](https://policyengine.org).

**Live Demo:** https://scottish-budget-dashboard.vercel.app

## Features

- **Budgetary Impact**: Multi-year revenue projections for each policy
- **Distributional Analysis**: Impact by income decile with winners/losers breakdown
- **Constituency Map**: Geographic visualization of policy impacts across Scottish constituencies
- **Household Scatter**: Individual household-level impact analysis
- **Policy Details**: Full modelling methodology, evidence sources, and implementation notes

## Policies Modeled

### Scottish Income Tax Threshold Freeze
Freezes Higher (42%), Advanced (45%), and Top (48%) rate thresholds at 2024-25 levels through 2026-27, while Starter/Basic/Intermediate thresholds rise by 3.5%. This "fiscal drag" raises revenue as wage inflation pushes more income into higher tax bands.

- **Revenue**: ~£0.32bn in 2026, growing to £0.92bn by 2030
- **Source**: [Scottish Government Budget 2025-26](https://www.gov.scot/publications/scottish-budget-2025-26/)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Data Generation

The dashboard uses pre-generated static CSV files. To regenerate data with PolicyEngine:

```bash
cd scripts
pip install policyengine-uk
python -c "from scottish_budget_data import generate_all_data; generate_all_data()"
```

## Tech Stack

- **Frontend**: React + Vite
- **Charts**: Recharts, D3.js
- **Data**: PolicyEngine UK microsimulation
- **Hosting**: Vercel

## License

MIT
