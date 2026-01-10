import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./ScotlandTab.css";

// Format year for display (e.g., 2026 -> "2026-27")
const formatYearRange = (year) => `${year}-${(year + 1).toString().slice(-2)}`;

// Format difference with + for positive values
const formatDifference = (peValue, officialValue) => {
  if (peValue === null || peValue === undefined) return "—";
  const diff = ((peValue - officialValue) / officialValue * 100);
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(0)}%`;
};

// Format absolute difference with + for positive values
const formatAbsDifference = (peValue, officialValue) => {
  if (peValue === null || peValue === undefined) return "—";
  const diff = peValue - officialValue;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}pp`;
};

// Historical official poverty data (Scottish Government, 3-year averages)
// Source: https://data.gov.scot/poverty/
// Note: Scottish Gov reports 3-year rolling averages, not annual figures
// Relative poverty: 18% BHC, 20% AHC (2021-24)
// Absolute poverty: 15% BHC, 17% AHC (2019-22 / 2021-24)
// PolicyEngine projections shown from 2023/2024 onwards.
const HISTORICAL_POVERTY_DATA = [
  { year: 2021, relativeBHC: 18, relativeAHC: 20, absoluteBHC: 15, absoluteAHC: 17 },
  { year: 2022, relativeBHC: 18, relativeAHC: 20, absoluteBHC: 15, absoluteAHC: 17 },
  { year: 2023, relativeBHC: 18, relativeAHC: 20, absoluteBHC: 15, absoluteAHC: 17 },
];

// Historical official income per head data (ONS GDHI per head)
// Source: https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome
// 2021 estimated from growth rates, 2022-2023 are official ONS values
// Median estimated at ~87% of mean based on typical income distributions
// 2024+ uses PolicyEngine projections (solid lines)
const HISTORICAL_INCOME_DATA = [
  { year: 2021, meanIncome: 19100, medianIncome: 16600 },
  { year: 2022, meanIncome: 20854, medianIncome: 18100 },
  { year: 2023, meanIncome: 22908, medianIncome: 19900 },
];

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");

  const parseLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });
    data.push(row);
  }
  return data;
}

// PolicyEngine data URLs
const PE_DATA_URLS = {
  baseline: "https://github.com/PolicyEngine/scottish-budget-dashboard/blob/main/public/data/scotland_baseline.csv",
  twoChildLimit: "https://github.com/PolicyEngine/scottish-budget-dashboard/blob/main/public/data/scotland_two_child_limit.csv",
};

// Custom legend renderer to show dashed vs solid lines
const renderCustomLegend = (props, labelMap) => {
  const { payload } = props;
  return (
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "16px", paddingTop: "12px" }}>
      {payload.map((entry, index) => {
        const isDashed = entry.dataKey.includes("historical");
        const label = labelMap[entry.dataKey] || entry.value;
        return (
          <div key={`legend-${index}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="24" height="12">
              <line
                x1="0"
                y1="6"
                x2="24"
                y2="6"
                stroke={entry.color}
                strokeWidth={2}
                strokeDasharray={isDashed ? "4 3" : "0"}
              />
              <circle cx="12" cy="6" r="3" fill={entry.color} />
            </svg>
            <span style={{ fontSize: "0.85rem", color: "#4B5563" }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

// Official statistics data with sources
const OFFICIAL_STATS = {
  povertyBHC: {
    value: 18,
    year: "2021-24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "3-year average",
  },
  povertyAHC: {
    value: 20,
    year: "2021-24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "3-year average",
  },
  childPovertyBHC: {
    value: 20,
    year: "2021-24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  childPovertyAHC: {
    value: 23,
    year: "2021-24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  workingAgePovertyBHC: {
    value: 14,
    year: "2021-24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  workingAgePovertyAHC: {
    value: 17,
    year: "2021-24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  pensionerPovertyBHC: {
    value: 13,
    year: "2021-24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  pensionerPovertyAHC: {
    value: 15,
    year: "2021-24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  medianIncome: {
    value: 29800,
    year: "2025-26",
    source: "Scottish Government",
    url: "https://www.gov.scot/publications/scottish-income-tax-2025-2026-factsheet/pages/2/",
    note: "Taxpayer income",
  },
  gdhiPerHead: {
    value: 22908,
    year: "2023",
    source: "ONS",
    url: "https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome/bulletins/regionalgrossdisposablehouseholdincomegdhi/1997to2023",
    note: "GDHI per head",
  },
  totalGDHI: {
    value: 125.8,
    year: "2023",
    source: "ONS",
    url: "https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome/bulletins/regionalgrossdisposablehouseholdincomegdhi/1997to2023",
    note: "Total £bn",
  },
  population: {
    value: 5.45,
    year: "2023",
    source: "NRS",
    url: "https://www.nrscotland.gov.uk/statistics-and-data/statistics/statistics-by-theme/population/population-estimates/mid-year-population-estimates/mid-2023",
    note: "Mid-year estimate (millions)",
  },
  households: {
    value: 2.53,
    year: "2023",
    source: "NRS",
    url: "https://www.nrscotland.gov.uk/statistics-and-data/statistics/statistics-by-theme/households/household-estimates/2023",
    note: "Household estimate (millions)",
  },
  childrenUnder16: {
    value: 0.90,
    year: "2023",
    source: "NRS",
    url: "https://www.nrscotland.gov.uk/publications/mid-2023-population-estimates/",
    note: "Children under 16 (millions)",
  },
  householdsWith3PlusChildren: {
    value: 82,
    year: "2022",
    source: "Census",
    url: "https://www.scotlandscensus.gov.uk/search-the-census#/location/topics/topic?topic=Household%20composition",
    note: "Households with 3+ children (thousands)",
  },
};

export default function ScotlandTab() {
  const [loading, setLoading] = useState(true);
  const [baselineData, setBaselineData] = useState([]);
  const [activeTab, setActiveTab] = useState("validation");
  const [povertyType, setPovertyType] = useState("absoluteBHC"); // absoluteBHC, absoluteAHC, relativeBHC, relativeAHC

  // Load Scotland baseline data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load baseline data
        const response = await fetch("/data/scotland_baseline.csv");
        const csvText = await response.text();
        const parsed = parseCSV(csvText);

        // Transform data
        const data = parsed.map((row) => ({
          year: parseInt(row.year),
          meanIncome: parseFloat(row.mean_income_per_head),
          medianIncome: parseFloat(row.median_income_per_head),
          meanHouseholdIncome: parseFloat(row.mean_disposable_income),
          medianHouseholdIncome: parseFloat(row.median_disposable_income),
          medianTaxpayerIncome: parseFloat(row.median_taxpayer_income),
          taxpayerIncomeP25: parseFloat(row.taxpayer_income_p25),
          taxpayerIncomeP75: parseFloat(row.taxpayer_income_p75),
          meanIncomePerHead: parseFloat(row.mean_income_per_head),
          medianIncomePerHead: parseFloat(row.median_income_per_head),
          totalDisposableIncomeBn: parseFloat(row.total_disposable_income_bn),
          povertyBHC: parseFloat(row.poverty_rate_bhc),
          povertyAHC: parseFloat(row.poverty_rate_ahc),
          absolutePovertyBHC: parseFloat(row.absolute_poverty_bhc),
          absolutePovertyAHC: parseFloat(row.absolute_poverty_ahc),
          childPovertyBHC: parseFloat(row.child_poverty_bhc),
          childPovertyAHC: parseFloat(row.child_poverty_ahc),
          childAbsolutePoverty: parseFloat(row.child_absolute_poverty) || null,
          workingAgePovertyBHC: parseFloat(row.working_age_poverty_bhc),
          workingAgePovertyAHC: parseFloat(row.working_age_poverty_ahc),
          pensionerPovertyBHC: parseFloat(row.pensioner_poverty_bhc),
          pensionerPovertyAHC: parseFloat(row.pensioner_poverty_ahc),
          totalHouseholds: parseFloat(row.total_households),
          totalPopulation: parseFloat(row.total_population),
        }));

        setBaselineData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error loading Scotland data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get PolicyEngine metrics for comparison
  // Use 2023 for poverty (to match official 2021-24 midpoint)
  // Use 2025 for income (to match official 2025-26)
  const peMetrics = useMemo(() => {
    if (baselineData.length === 0) return null;

    const year2023 = baselineData.find((d) => d.year === 2023);
    const year2025 = baselineData.find((d) => d.year === 2025);
    const year2026 = baselineData.find((d) => d.year === 2026);
    const latest = baselineData[baselineData.length - 1];

    return {
      year2023,
      year2025,
      year2026,
      latest,
    };
  }, [baselineData]);

  if (loading) {
    return (
      <div className="scotland-tab-loading">
        <div className="loading-spinner"></div>
        <p>Loading Scotland projections...</p>
      </div>
    );
  }

  return (
    <div className="scotland-tab">
      {/* Introduction */}
      <div className="comparison-section">
        <div className="chart-header">
          <h2>Introduction</h2>
        </div>
        <p className="chart-description">
          Finance Secretary Shona Robison will announce the Scottish Budget 2026-27 on{" "}
          <a
            href="https://www.gov.scot/budget/"
            target="_blank"
            rel="noopener noreferrer"
          >
            13 January 2026
          </a>. This dashboard provides context by comparing PolicyEngine's
          baseline microsimulation projections with official government statistics. The sections
          below present comparisons with official data for key metrics, projections for
          poverty rates and household incomes through to 2030-31, and expected policy
          changes in the upcoming budget.
        </p>
        <h3 className="subsection-header">Expected policies</h3>
        <p className="chart-description">
          According to{" "}
          <a
            href="https://www.bbc.co.uk/news/articles/cx2el14rgngo"
            target="_blank"
            rel="noopener noreferrer"
          >
            BBC Scotland
          </a>, the following policy areas may feature in the budget. The Scottish child payment may be increased following the UK Government's
          decision to abolish the two-child limit, with First Minister John Swinney pledging
          to use funding to tackle child poverty. Scotland's six income tax bands
          (compared to three in the rest of the UK) may face pressure for cuts from opposition
          parties. The council tax freeze ended last year and is not expected to be reimposed,
          meaning households could face increases from April. Business groups have called for
          lower non-domestic rates. Scottish Labour have called for health funding to reduce
          waiting lists and reform the NHS.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="scotland-tabs">
        <button
          className={`scotland-tab-button ${activeTab === "validation" ? "active" : ""}`}
          onClick={() => setActiveTab("validation")}
        >
          Validation
        </button>
        <button
          className={`scotland-tab-button ${activeTab === "reforms" ? "active" : ""}`}
          onClick={() => setActiveTab("reforms")}
        >
          Budget reforms
        </button>
      </div>

      {/* Validation Tab Content */}
      {activeTab === "validation" && (
        <>
          {/* Income Table */}
      <div className="comparison-section">
        <div className="chart-header">
          <h2>Income</h2>
          <p className="chart-description">
            Income metrics compare PolicyEngine estimates with official statistics. Taxpayer
            income covers people earning above the personal allowance (£12,570). GDHI (Gross
            Disposable Household Income) from ONS measures total income after taxes and benefits
            for Scotland as a region.
          </p>
        </div>

        <div className="comparison-table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Official</th>
                <th>PolicyEngine</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="metric-name">
                  <strong>Median taxpayer income</strong>
                  <span className="metric-subtitle">Above personal allowance</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.medianIncome.url} target="_blank" rel="noopener noreferrer">
                    £{OFFICIAL_STATS.medianIncome.value.toLocaleString("en-GB")}
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.medianIncome.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2025 ? `£${peMetrics.year2025.medianTaxpayerIncome.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` : "—"}
                  </a>
                  <span className="value-year">2025-26</span>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2025?.medianTaxpayerIncome, OFFICIAL_STATS.medianIncome.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Taxpayer income (75th percentile)</strong>
                  <span className="metric-subtitle">Above personal allowance</span>
                </td>
                <td className="official-value">
                  <a href="https://www.gov.scot/publications/scottish-income-tax-2025-2026-factsheet/pages/2/" target="_blank" rel="noopener noreferrer">
                    £44,500
                  </a>
                  <span className="value-year">2025-26</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2026 ? `£${peMetrics.year2026.taxpayerIncomeP75.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` : "—"}
                  </a>
                  <span className="value-year">2025-26</span>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2026?.taxpayerIncomeP75, 44500)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Income per head</strong>
                  <span className="metric-subtitle">Disposable income per person</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.gdhiPerHead.url} target="_blank" rel="noopener noreferrer">
                    £{OFFICIAL_STATS.gdhiPerHead.value.toLocaleString("en-GB")}
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.gdhiPerHead.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `£${peMetrics.year2023.meanIncomePerHead.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.meanIncomePerHead, OFFICIAL_STATS.gdhiPerHead.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Total disposable income</strong>
                  <span className="metric-subtitle">Scotland aggregate</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.totalGDHI.url} target="_blank" rel="noopener noreferrer">
                    £{OFFICIAL_STATS.totalGDHI.value}bn
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.totalGDHI.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `£${peMetrics.year2023.totalDisposableIncomeBn.toFixed(1)}bn` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.totalDisposableIncomeBn, OFFICIAL_STATS.totalGDHI.value)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Poverty Rates Table */}
      <div className="comparison-section">
        <div className="chart-header">
          <h2>Poverty rates</h2>
          <p className="chart-description">
            All rates shown are relative poverty: a household is in poverty if its equivalised
            income (adjusted for household size) falls below 60% of UK median income. BHC (before
            housing costs) uses total income; AHC (after housing costs) subtracts rent and
            mortgage payments, resulting in higher poverty rates.
          </p>
          <p className="chart-description" style={{ marginTop: "12px" }}>
            Official statistics from the Scottish Government combine three years of data to
            produce more stable estimates.{" "}
            <a
              href="https://github.com/PolicyEngine/scottish-budget-dashboard/blob/main/public/data/scotland_baseline.csv"
              target="_blank"
              rel="noopener noreferrer"
            >
              PolicyEngine estimates
            </a>{" "}
            use single-year data from the Family Resources Survey, reweighted to Scottish
            parliamentary constituencies. PolicyEngine shows higher child poverty rates (28.3%
            BHC, 31.8% AHC) compared to official statistics (20% BHC, 23% AHC). This 8-9pp gap
            arises primarily because PolicyEngine{" "}
            <a
              href="https://github.com/PolicyEngine/policyengine-uk/blob/main/policyengine_uk/parameters/gov/dwp/universal_credit/takeup_rate.yaml"
              target="_blank"
              rel="noopener noreferrer"
            >
              assumes 55% UC take-up
            </a>{" "}
            versus{" "}
            <a
              href="https://www.gov.scot/publications/impact-of-withdrawing-emergency-benefit-measures/pages/annex-a-methodology/"
              target="_blank"
              rel="noopener noreferrer"
            >
              87% in UKMOD
            </a>{" "}
            (used by Scottish Government).
          </p>
        </div>

        <div className="comparison-table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Official</th>
                <th>PolicyEngine</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="metric-name">
                  <strong>All people (BHC)</strong>
                  <span className="metric-subtitle">Before housing costs</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.povertyBHC.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.povertyBHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.povertyBHC.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${peMetrics.year2023.povertyBHC.toFixed(1)}%` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatAbsDifference(peMetrics?.year2023?.povertyBHC, OFFICIAL_STATS.povertyBHC.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>All people (AHC)</strong>
                  <span className="metric-subtitle">After housing costs</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.povertyAHC.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.povertyAHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.povertyAHC.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${peMetrics.year2023.povertyAHC.toFixed(1)}%` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatAbsDifference(peMetrics?.year2023?.povertyAHC, OFFICIAL_STATS.povertyAHC.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Children (BHC)</strong>
                  <span className="metric-subtitle">Under 18</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.childPovertyBHC.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.childPovertyBHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.childPovertyBHC.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${peMetrics.year2023.childPovertyBHC.toFixed(1)}%` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatAbsDifference(peMetrics?.year2023?.childPovertyBHC, OFFICIAL_STATS.childPovertyBHC.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Children (AHC)</strong>
                  <span className="metric-subtitle">Under 18</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.childPovertyAHC.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.childPovertyAHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.childPovertyAHC.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${peMetrics.year2023.childPovertyAHC.toFixed(1)}%` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatAbsDifference(peMetrics?.year2023?.childPovertyAHC, OFFICIAL_STATS.childPovertyAHC.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Working-age (BHC)</strong>
                  <span className="metric-subtitle">16-64</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.workingAgePovertyBHC.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.workingAgePovertyBHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.workingAgePovertyBHC.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${peMetrics.year2023.workingAgePovertyBHC.toFixed(1)}%` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatAbsDifference(peMetrics?.year2023?.workingAgePovertyBHC, OFFICIAL_STATS.workingAgePovertyBHC.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Working-age (AHC)</strong>
                  <span className="metric-subtitle">16-64</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.workingAgePovertyAHC.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.workingAgePovertyAHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.workingAgePovertyAHC.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${peMetrics.year2023.workingAgePovertyAHC.toFixed(1)}%` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatAbsDifference(peMetrics?.year2023?.workingAgePovertyAHC, OFFICIAL_STATS.workingAgePovertyAHC.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Pensioners (BHC)</strong>
                  <span className="metric-subtitle">65+</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.pensionerPovertyBHC.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.pensionerPovertyBHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.pensionerPovertyBHC.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${peMetrics.year2023.pensionerPovertyBHC.toFixed(1)}%` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatAbsDifference(peMetrics?.year2023?.pensionerPovertyBHC, OFFICIAL_STATS.pensionerPovertyBHC.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Pensioners (AHC)</strong>
                  <span className="metric-subtitle">65+</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.pensionerPovertyAHC.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.pensionerPovertyAHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.pensionerPovertyAHC.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${peMetrics.year2023.pensionerPovertyAHC.toFixed(1)}%` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatAbsDifference(peMetrics?.year2023?.pensionerPovertyAHC, OFFICIAL_STATS.pensionerPovertyAHC.value)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Population Table */}
      <div className="comparison-section">
        <div className="chart-header">
          <h2>Population</h2>
          <p className="chart-description">
            Population and household counts comparing PolicyEngine microsimulation with official
            National Records of Scotland (NRS) statistics. PolicyEngine{" "}
            <a
              href="https://github.com/PolicyEngine/policyengine-uk-data/blob/main/policyengine_uk_data/datasets/local_areas/constituencies/calibrate.py"
              target="_blank"
              rel="noopener noreferrer"
            >
              uses
            </a>{" "}
            the Family Resources Survey, reweighting Scottish households to be more representative of the Scottish population.
          </p>
        </div>

        <div className="comparison-table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Official</th>
                <th>PolicyEngine</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="metric-name">
                  <strong>Population</strong>
                  <span className="metric-subtitle">Scotland total</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.population.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.population.value}m
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.population.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${(peMetrics.year2023.totalPopulation / 1e6).toFixed(2)}m` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.totalPopulation / 1e6, OFFICIAL_STATS.population.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Households</strong>
                  <span className="metric-subtitle">Scotland total</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.households.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.households.value}m
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.households.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${(peMetrics.year2023.totalHouseholds / 1e6).toFixed(2)}m` : "—"}
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.totalHouseholds / 1e6, OFFICIAL_STATS.households.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Children</strong>
                  <span className="metric-subtitle">Under 16</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.childrenUnder16.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.childrenUnder16.value}m
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.childrenUnder16.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    0.97m
                  </a>
                  <span className="value-year">2023</span>
                </td>
                <td className="difference">
                  {formatDifference(0.97, OFFICIAL_STATS.childrenUnder16.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Households with 3+ children</strong>
                  <span className="metric-subtitle">Families affected by two-child limit</span>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.householdsWith3PlusChildren.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.householdsWith3PlusChildren.value}k
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.householdsWith3PlusChildren.year}</span>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    93k
                  </a>
                  <span className="value-year">2022</span>
                </td>
                <td className="difference">
                  {formatDifference(93, OFFICIAL_STATS.householdsWith3PlusChildren.value)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts grid */}
      <div className="scotland-charts-grid">
        {/* Poverty rate chart */}
        <div className="scotland-chart-section">
          <div className="chart-header">
            <div className="chart-header-row">
              <h2>Poverty rate</h2>
              <select
                className="poverty-type-select"
                value={povertyType}
                onChange={(e) => setPovertyType(e.target.value)}
              >
                <option value="absoluteBHC">Absolute (BHC)</option>
                <option value="absoluteAHC">Absolute (AHC)</option>
                <option value="relativeBHC">Relative (BHC)</option>
                <option value="relativeAHC">Relative (AHC)</option>
              </select>
            </div>
            <p className="chart-description">
              {povertyType.includes("absolute")
                ? "Percentage of people living in households with income below the 2010/11 poverty threshold (adjusted for inflation). This is the standard measure used by PolicyEngine."
                : "Percentage of people living in households with income below 60% of UK median income."}
              {povertyType.includes("AHC")
                ? " After housing costs (AHC) subtracts rent and mortgage payments."
                : " Before housing costs (BHC) uses total income."}{" "}
              Scottish Government publishes 3-year rolling averages (solid line, 2021-2023).
              Dashed line shows PolicyEngine projections (2024-2030).
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={[
                // Historical official data
                ...HISTORICAL_POVERTY_DATA.map(d => {
                  let value;
                  if (povertyType === "absoluteBHC") value = d.absoluteBHC;
                  else if (povertyType === "absoluteAHC") value = d.absoluteAHC;
                  else if (povertyType === "relativeBHC") value = d.relativeBHC;
                  else value = d.relativeAHC;
                  return {
                    year: d.year,
                    historical: value,
                  };
                }),
                // PolicyEngine projections
                ...baselineData
                  .filter(d => d.year >= 2024)
                  .map(d => {
                    let value;
                    if (povertyType === "absoluteBHC") value = d.absolutePovertyBHC;
                    else if (povertyType === "absoluteAHC") value = d.absolutePovertyAHC;
                    else if (povertyType === "relativeBHC") value = d.povertyBHC;
                    else value = d.povertyAHC;
                    return {
                      year: d.year,
                      projection: value,
                    };
                  })
              ]}
              margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="year"
                tickFormatter={(year) => formatYearRange(year)}
              />
              <YAxis
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                domain={[0, 30]}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (value === null || value === undefined) return [null, null];
                  const labels = {
                    historical: "Official (historical)",
                    projection: "PolicyEngine (projection)",
                  };
                  return [`${value.toFixed(1)}%`, labels[name] || name];
                }}
                labelFormatter={(label) => formatYearRange(label)}
              />
              <Legend
                content={(props) => renderCustomLegend(props, {
                  historical: "Official (historical)",
                  projection: "PolicyEngine (projection)",
                })}
              />
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#319795"
                strokeWidth={2}
                dot={{ fill: "#319795", r: 3 }}
                name="historical"
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="projection"
                stroke="#319795"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#319795", r: 4 }}
                name="projection"
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Disposable income per head chart */}
        <div className="scotland-chart-section">
          <div className="chart-header">
            <h2>Income per person</h2>
            <p className="chart-description">
              Annual disposable income per person (GDHI per head) after taxes paid and benefits received.
              Mean is the average; median is the middle value. Solid lines show official ONS data
              (2021-2023); dashed lines show PolicyEngine projections (2024-2030).
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={[
                ...HISTORICAL_INCOME_DATA.map(d => ({
                  year: d.year,
                  historicalMean: d.meanIncome,
                  historicalMedian: d.medianIncome,
                })),
                ...baselineData
                  .filter(d => d.year >= 2024)
                  .map(d => ({
                    year: d.year,
                    projectionMean: d.meanIncome,
                    projectionMedian: d.medianIncome,
                  }))
              ]}
              margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="year"
                tickFormatter={(year) => formatYearRange(year)}
              />
              <YAxis
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                domain={[0, 40000]}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (value === null || value === undefined) return [null, null];
                  const labels = {
                    historicalMean: "Official mean",
                    historicalMedian: "Official median",
                    projectionMean: "PolicyEngine mean",
                    projectionMedian: "PolicyEngine median",
                  };
                  return [`£${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`, labels[name] || name];
                }}
                labelFormatter={(label) => formatYearRange(label)}
              />
              <Legend
                content={(props) => renderCustomLegend(props, {
                  historicalMean: "Official mean (historical)",
                  historicalMedian: "Official median (historical)",
                  projectionMean: "PolicyEngine mean (projection)",
                  projectionMedian: "PolicyEngine median (projection)",
                })}
              />
              <Line
                type="monotone"
                dataKey="historicalMean"
                stroke="#319795"
                strokeWidth={2}
                dot={{ fill: "#319795", r: 3 }}
                name="historicalMean"
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="historicalMedian"
                stroke="#5A8FB8"
                strokeWidth={2}
                dot={{ fill: "#5A8FB8", r: 3 }}
                name="historicalMedian"
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="projectionMean"
                stroke="#319795"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#319795", r: 4 }}
                name="projectionMean"
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="projectionMedian"
                stroke="#5A8FB8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#5A8FB8", r: 4 }}
                name="projectionMedian"
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
        </>
      )}

      {/* Budget Reforms Tab Content */}
      {activeTab === "reforms" && (
        <div className="comparison-section">
          <div className="chart-header">
            <h2>Two-child limit top-up payment</h2>
          </div>
          <p className="chart-description">
            The Scottish Government{" "}
            <a
              href="https://www.bbc.co.uk/news/articles/cx2el14rgngo"
              target="_blank"
              rel="noopener noreferrer"
            >
              plans
            </a>{" "}
            to introduce a top-up payment for families with three or more children on Universal Credit from April 2026, compensating for the UK-wide two-child limit. The{" "}
            <a
              href="https://fiscalcommission.scot/mitigating-the-two-child-limit-and-the-scottish-budget/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Scottish Fiscal Commission
            </a>{" "}
            estimates this will cost £155 million in 2026-27 rising to £198 million by 2029-30,
            affecting 43,000 children in 2026-27 rising to 50,000 children by 2029-30.{" "}
            PolicyEngine{" "}
            <a
              href="https://github.com/PolicyEngine/scottish-budget-dashboard/blob/main/public/data/scotland_two_child_limit.csv"
              target="_blank"
              rel="noopener noreferrer"
            >
              estimates
            </a>{" "}
            £213 million in 2026-27 rising to £256 million by 2029-30,
            affecting 69,000 children in 2026-27 rising to 73,000 children by 2029-30.
            The two-child limit restricts Universal Credit child element payments to the first
            two children, so the top-up payment cost depends on how many Scottish families claim UC
            and have three or more children. The difference between estimates arises from different
            data sources: SFC uses{" "}
            <a
              href="https://fiscalcommission.scot/mitigating-the-two-child-limit-and-the-scottish-budget/"
              target="_blank"
              rel="noopener noreferrer"
            >
              DWP administrative data
            </a>{" "}
            on actual UC claimants, while PolicyEngine uses{" "}
            <a
              href="https://github.com/PolicyEngine/policyengine-uk-data/blob/main/policyengine_uk_data/datasets/local_areas/constituencies/calibrate.py"
              target="_blank"
              rel="noopener noreferrer"
            >
              Family Resources Survey data reweighted to Scotland
            </a>, which estimates more families with three or more children receiving UC.
          </p>
        </div>
      )}

    </div>
  );
}
