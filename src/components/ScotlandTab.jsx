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
  childPovertyAHC: {
    value: 23,
    year: "2021-24",
    source: "Scottish Government",
    url: "https://www.gov.scot/news/poverty-levels-broadly-stable-over-last-decade/",
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
};

export default function ScotlandTab() {
  const [loading, setLoading] = useState(true);
  const [baselineData, setBaselineData] = useState([]);

  // Load Scotland baseline data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch("/data/scotland_baseline.csv");
        const csvText = await response.text();
        const parsed = parseCSV(csvText);

        // Transform data
        const data = parsed.map((row) => ({
          year: parseInt(row.year),
          meanIncome: parseFloat(row.mean_disposable_income),
          medianIncome: parseFloat(row.median_disposable_income),
          medianTaxpayerIncome: parseFloat(row.median_taxpayer_income),
          meanIncomePerHead: parseFloat(row.mean_income_per_head),
          povertyBHC: parseFloat(row.poverty_rate_bhc),
          povertyAHC: parseFloat(row.poverty_rate_ahc),
          childPovertyBHC: parseFloat(row.child_poverty_bhc),
          childPovertyAHC: parseFloat(row.child_poverty_ahc),
        }));

        setBaselineData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error loading Scotland baseline data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get PolicyEngine metrics for comparison (use 2026 as base year)
  const peMetrics = useMemo(() => {
    if (baselineData.length === 0) return null;

    const year2026 = baselineData.find((d) => d.year === 2026);
    const latest = baselineData[baselineData.length - 1];

    return {
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
      <div className="scotland-intro">
        <p>
          Compare PolicyEngine's microsimulation projections for Scotland with
          official government statistics. This comparison helps validate our
          model and highlights differences in methodology.
        </p>
      </div>

      {/* Main Comparison Table */}
      <div className="comparison-section">
        <div className="chart-header">
          <h2>PolicyEngine vs official statistics</h2>
          <p className="chart-description">
            Side-by-side comparison of key metrics. Differences may arise from
            time periods, data sources, and methodological approaches.
          </p>
        </div>

        <div className="comparison-table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>PolicyEngine</th>
                <th>Official</th>
                <th>Difference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {/* Poverty Rate BHC */}
              <tr>
                <td className="metric-name">
                  <strong>Relative poverty (BHC)</strong>
                  <span className="metric-subtitle">Before housing costs, 60% median</span>
                </td>
                <td className="pe-value">
                  {peMetrics?.year2026
                    ? `${peMetrics.year2025.povertyBHC.toFixed(1)}%`
                    : "—"}
                  <span className="value-year">2026-27</span>
                </td>
                <td className="official-value">
                  <a
                    href={OFFICIAL_STATS.povertyBHC.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {OFFICIAL_STATS.povertyBHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.povertyBHC.year}</span>
                </td>
                <td className="difference">
                  {peMetrics?.year2026
                    ? `${(peMetrics.year2025.povertyBHC - OFFICIAL_STATS.povertyBHC.value).toFixed(1)}pp`
                    : "—"}
                </td>
                <td className="notes">
                  Official uses 3-year average; PE is single year projection
                </td>
              </tr>

              {/* Poverty Rate AHC */}
              <tr>
                <td className="metric-name">
                  <strong>Relative poverty (AHC)</strong>
                  <span className="metric-subtitle">After housing costs, 60% median</span>
                </td>
                <td className="pe-value">
                  {peMetrics?.year2026
                    ? `${peMetrics.year2025.povertyAHC.toFixed(1)}%`
                    : "—"}
                  <span className="value-year">2026-27</span>
                </td>
                <td className="official-value">
                  <a
                    href={OFFICIAL_STATS.povertyAHC.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {OFFICIAL_STATS.povertyAHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.povertyAHC.year}</span>
                </td>
                <td className="difference">
                  {peMetrics?.year2026
                    ? `${(peMetrics.year2025.povertyAHC - OFFICIAL_STATS.povertyAHC.value).toFixed(1)}pp`
                    : "—"}
                </td>
                <td className="notes">
                  Official uses 3-year average; PE is single year projection
                </td>
              </tr>

              {/* Child Poverty */}
              <tr>
                <td className="metric-name">
                  <strong>Child relative poverty (AHC)</strong>
                  <span className="metric-subtitle">After housing costs, 60% median</span>
                </td>
                <td className="pe-value">
                  {peMetrics?.year2026
                    ? `${peMetrics.year2025.childPovertyAHC.toFixed(1)}%`
                    : "—"}
                  <span className="value-year">2026-27</span>
                </td>
                <td className="official-value">
                  <a
                    href={OFFICIAL_STATS.childPovertyAHC.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {OFFICIAL_STATS.childPovertyAHC.value}%
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.childPovertyAHC.year}</span>
                </td>
                <td className="difference">
                  {peMetrics?.year2026
                    ? `${(peMetrics.year2025.childPovertyAHC - OFFICIAL_STATS.childPovertyAHC.value).toFixed(1)}pp`
                    : "—"}
                </td>
                <td className="notes">
                  2030 target: 10%; PE projection higher than official
                </td>
              </tr>

              {/* Median Taxpayer Income */}
              <tr>
                <td className="metric-name">
                  <strong>Median taxpayer income</strong>
                  <span className="metric-subtitle">Individual, above personal allowance</span>
                </td>
                <td className="pe-value">
                  {peMetrics?.year2026
                    ? `£${peMetrics.year2026.medianTaxpayerIncome.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
                    : "—"}
                  <span className="value-year">2026-27</span>
                </td>
                <td className="official-value">
                  <a
                    href={OFFICIAL_STATS.medianIncome.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    £{OFFICIAL_STATS.medianIncome.value.toLocaleString("en-GB")}
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.medianIncome.year}</span>
                </td>
                <td className="difference">
                  {peMetrics?.year2026
                    ? `£${(peMetrics.year2026.medianTaxpayerIncome - OFFICIAL_STATS.medianIncome.value).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
                    : "—"}
                </td>
                <td className="notes">
                  Both measure median income of Scottish taxpayers
                </td>
              </tr>

              {/* Mean Income per Head */}
              <tr>
                <td className="metric-name">
                  <strong>Income per head</strong>
                  <span className="metric-subtitle">Disposable income per person</span>
                </td>
                <td className="pe-value">
                  {peMetrics?.year2026
                    ? `£${peMetrics.year2026.meanIncomePerHead.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
                    : "—"}
                  <span className="value-year">2026-27</span>
                </td>
                <td className="official-value">
                  <a
                    href={OFFICIAL_STATS.gdhiPerHead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    £{OFFICIAL_STATS.gdhiPerHead.value.toLocaleString("en-GB")}
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.gdhiPerHead.year}</span>
                </td>
                <td className="difference">
                  {peMetrics?.year2026
                    ? `£${(peMetrics.year2026.meanIncomePerHead - OFFICIAL_STATS.gdhiPerHead.value).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
                    : "—"}
                </td>
                <td className="notes">
                  Both measure disposable income per capita
                </td>
              </tr>

              {/* Total GDHI */}
              <tr>
                <td className="metric-name">
                  <strong>Total disposable income</strong>
                  <span className="metric-subtitle">Scotland aggregate</span>
                </td>
                <td className="pe-value">
                  <span className="not-available">Not directly comparable</span>
                </td>
                <td className="official-value">
                  <a
                    href={OFFICIAL_STATS.totalGDHI.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    £{OFFICIAL_STATS.totalGDHI.value}bn
                  </a>
                  <span className="value-year">{OFFICIAL_STATS.totalGDHI.year}</span>
                </td>
                <td className="difference">—</td>
                <td className="notes">
                  7.4% of UK total; 92.2% of UK average per head
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
            <h2>Relative poverty projections (PolicyEngine)</h2>
            <p className="chart-description">
              Relative poverty rate in Scotland (below 60% of current UK median income),
              projected from 2025 to 2030.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={baselineData}
              margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="year"
                tickFormatter={(year) => formatYearRange(year)}
              />
              <YAxis
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                domain={[0, 25]}
              />
              <Tooltip
                formatter={(value, name) => [
                  `${value.toFixed(1)}%`,
                  name === "povertyBHC"
                    ? "Before housing costs"
                    : "After housing costs",
                ]}
                labelFormatter={(label) => formatYearRange(label)}
              />
              <Legend
                formatter={(value) =>
                  value === "povertyBHC"
                    ? "Before housing costs"
                    : "After housing costs"
                }
              />
              {/* Official reference lines */}
              <Line
                type="monotone"
                dataKey="povertyBHC"
                stroke="#319795"
                strokeWidth={2}
                dot={{ fill: "#319795", r: 4 }}
                name="povertyBHC"
              />
              <Line
                type="monotone"
                dataKey="povertyAHC"
                stroke="#D97706"
                strokeWidth={2}
                dot={{ fill: "#D97706", r: 4 }}
                name="povertyAHC"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-reference">
            <span className="reference-label">Official (2021-24):</span>
            <span className="reference-value bhc">BHC: 18%</span>
            <span className="reference-value ahc">AHC: 20%</span>
          </div>
        </div>

        {/* Disposable income chart */}
        <div className="scotland-chart-section">
          <div className="chart-header">
            <h2>Income projections (PolicyEngine)</h2>
            <p className="chart-description">
              Mean and median household disposable income in Scotland,
              projected from 2025 to 2030.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={baselineData}
              margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="year"
                tickFormatter={(year) => formatYearRange(year)}
              />
              <YAxis
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                domain={[0, "auto"]}
              />
              <Tooltip
                formatter={(value, name) => [
                  `£${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`,
                  name === "meanIncome" ? "Mean income" : "Median income",
                ]}
                labelFormatter={(label) => formatYearRange(label)}
              />
              <Legend
                formatter={(value) =>
                  value === "meanIncome" ? "Mean income" : "Median income"
                }
              />
              <Line
                type="monotone"
                dataKey="meanIncome"
                stroke="#319795"
                strokeWidth={2}
                dot={{ fill: "#319795", r: 4 }}
                name="meanIncome"
              />
              <Line
                type="monotone"
                dataKey="medianIncome"
                stroke="#5A8FB8"
                strokeWidth={2}
                dot={{ fill: "#5A8FB8", r: 4 }}
                name="medianIncome"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-reference">
            <span className="reference-label">Official:</span>
            <span className="reference-value">GDHI/head: £22,908 (2023)</span>
            <span className="reference-value">Median taxpayer: £29,800</span>
          </div>
        </div>
      </div>

      {/* Additional Official Data */}
      <div className="additional-stats">
        <div className="chart-header">
          <h2>Additional official statistics</h2>
          <p className="chart-description">
            Other relevant data from official sources for context.
          </p>
        </div>

        <div className="stats-cards">
          {/* Economic Forecasts */}
          <div className="stat-card">
            <h3>Economic forecasts</h3>
            <p className="stat-source">
              <a
                href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Scottish Fiscal Commission
              </a>
            </p>
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>GDP</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2025-26</td>
                  <td>1.2%</td>
                  <td>3.7%</td>
                </tr>
                <tr>
                  <td>2026-27</td>
                  <td>1.8%</td>
                  <td>2.9%</td>
                </tr>
                <tr>
                  <td>2027-28</td>
                  <td>1.7%</td>
                  <td>3.0%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Child Poverty Targets */}
          <div className="stat-card">
            <h3>Child poverty targets (2030)</h3>
            <p className="stat-source">
              <a
                href="https://www.jrf.org.uk/poverty-in-scotland-2025"
                target="_blank"
                rel="noopener noreferrer"
              >
                Joseph Rowntree Foundation
              </a>
            </p>
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Current</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Relative</td>
                  <td>23%</td>
                  <td>10%</td>
                </tr>
                <tr>
                  <td>Absolute</td>
                  <td>20%</td>
                  <td>5%</td>
                </tr>
                <tr>
                  <td>Persistent</td>
                  <td>23%</td>
                  <td>5%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Income Distribution */}
          <div className="stat-card">
            <h3>Income distribution (2025-26)</h3>
            <p className="stat-source">
              <a
                href="https://www.gov.scot/publications/scottish-income-tax-2025-2026-factsheet/pages/2/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Scottish Government
              </a>
            </p>
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Percentile</th>
                  <th>Income</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>25th</td>
                  <td>£20,400</td>
                </tr>
                <tr>
                  <td>50th (median)</td>
                  <td>£29,800</td>
                </tr>
                <tr>
                  <td>75th</td>
                  <td>£44,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Methodology note */}
      <div className="methodology-note">
        <h3>Methodology notes</h3>
        <div className="note-content">
          <div className="note-item">
            <strong>PolicyEngine projections</strong>
            <p>
              Based on the Family Resources Survey, reweighted for Scottish
              constituencies using the S14 prefix. Uses relative poverty
              (60% of current UK median equivalised income).
            </p>
          </div>
          <div className="note-item">
            <strong>Official statistics</strong>
            <p>
              Scottish Government poverty data uses 3-year averages to reduce
              sampling volatility. ONS GDHI measures gross disposable household
              income at regional level.
            </p>
          </div>
          <div className="note-item">
            <strong>Key differences</strong>
            <p>
              PolicyEngine shows forward projections; official data is
              historical. Income definitions differ (household net vs GDHI vs
              taxpayer income).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
