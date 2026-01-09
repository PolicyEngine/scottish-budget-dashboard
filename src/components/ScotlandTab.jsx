import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
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
          povertyBHC: parseFloat(row.poverty_rate_bhc),
          povertyAHC: parseFloat(row.poverty_rate_ahc),
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

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (baselineData.length === 0) return null;

    const latest = baselineData[baselineData.length - 1];
    const earliest = baselineData[0];

    const incomeGrowth =
      ((latest.meanIncome - earliest.meanIncome) / earliest.meanIncome) * 100;
    const povertyChange = latest.povertyBHC - earliest.povertyBHC;

    return {
      latestYear: latest.year,
      earliestYear: earliest.year,
      latestMeanIncome: latest.meanIncome,
      latestMedianIncome: latest.medianIncome,
      latestPovertyBHC: latest.povertyBHC,
      latestPovertyAHC: latest.povertyAHC,
      incomeGrowth,
      povertyChange,
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
          PolicyEngine projections for Scotland under current law (baseline). These
          projections show expected disposable income and poverty rates from 2025 to
          2030, which can be compared with official statistics from the Scottish
          Government and Scottish Fiscal Commission.
        </p>
        <div className="policy-detail-box">
          <strong>Note on methodology:</strong> These projections are derived from
          PolicyEngine's microsimulation model using the Family Resources Survey,
          reweighted for Scottish constituencies. Poverty is measured using the
          relative poverty threshold (60% of UK median equivalised income).
        </div>
      </div>

      {/* Summary metrics */}
      {summaryMetrics && (
        <div className="scotland-metrics">
          <div className="metric-card">
            <div className="metric-value">
              £{summaryMetrics.latestMeanIncome.toLocaleString("en-GB", {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="metric-label">
              Mean household disposable income ({summaryMetrics.latestYear})
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-value">
              £{summaryMetrics.latestMedianIncome.toLocaleString("en-GB", {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="metric-label">
              Median household disposable income ({summaryMetrics.latestYear})
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-value">
              {summaryMetrics.latestPovertyBHC.toFixed(1)}%
            </div>
            <div className="metric-label">
              Poverty rate, before housing costs ({summaryMetrics.latestYear})
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-value">
              {summaryMetrics.latestPovertyAHC.toFixed(1)}%
            </div>
            <div className="metric-label">
              Poverty rate, after housing costs ({summaryMetrics.latestYear})
            </div>
          </div>
        </div>
      )}

      {/* Charts grid */}
      <div className="scotland-charts-grid">
        {/* Disposable income chart */}
        <div className="scotland-chart-section">
          <div className="chart-header">
            <h2>Household disposable income projections</h2>
            <p className="chart-description">
              Mean and median household net income in Scotland under current law,
              projected from 2025 to 2030.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={350}>
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
                label={{
                  value: "Annual income (£)",
                  angle: -90,
                  position: "insideLeft",
                  dx: -20,
                  style: { textAnchor: "middle" },
                }}
                tickFormatter={(value) =>
                  `£${(value / 1000).toFixed(0)}k`
                }
                domain={[0, "auto"]}
              />
              <Tooltip
                formatter={(value, name) => [
                  `£${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`,
                  name === "meanIncome" ? "Mean income" : "Median income",
                ]}
                labelFormatter={(label) => `Year: ${formatYearRange(label)}`}
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
        </div>

        {/* Poverty rate chart */}
        <div className="scotland-chart-section">
          <div className="chart-header">
            <h2>Poverty rate projections</h2>
            <p className="chart-description">
              Relative poverty rate in Scotland (below 60% of UK median income),
              shown before and after housing costs.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={350}>
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
                label={{
                  value: "Poverty rate (%)",
                  angle: -90,
                  position: "insideLeft",
                  dx: -20,
                  style: { textAnchor: "middle" },
                }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                domain={[0, 20]}
              />
              <Tooltip
                formatter={(value, name) => [
                  `${value.toFixed(1)}%`,
                  name === "povertyBHC"
                    ? "Before housing costs"
                    : "After housing costs",
                ]}
                labelFormatter={(label) => `Year: ${formatYearRange(label)}`}
              />
              <Legend
                formatter={(value) =>
                  value === "povertyBHC"
                    ? "Before housing costs (BHC)"
                    : "After housing costs (AHC)"
                }
              />
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
        </div>
      </div>

      {/* Data table */}
      <div className="scotland-data-table">
        <div className="chart-header">
          <h2>Scotland baseline projections data</h2>
          <p className="chart-description">
            Full projection data for comparison with official statistics.
          </p>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Mean income</th>
                <th>Median income</th>
                <th>Poverty (BHC)</th>
                <th>Poverty (AHC)</th>
              </tr>
            </thead>
            <tbody>
              {baselineData.map((row) => (
                <tr key={row.year}>
                  <td>{formatYearRange(row.year)}</td>
                  <td>
                    £{row.meanIncome.toLocaleString("en-GB", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td>
                    £{row.medianIncome.toLocaleString("en-GB", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td>{row.povertyBHC.toFixed(1)}%</td>
                  <td>{row.povertyAHC.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Statistics Comparison */}
      <div className="scotland-official-stats">
        <div className="chart-header">
          <h2>Official Scottish statistics</h2>
          <p className="chart-description">
            Latest official statistics from the Scottish Government and Scottish
            Fiscal Commission for comparison with PolicyEngine projections.
          </p>
        </div>

        <div className="official-stats-grid">
          {/* Poverty Statistics */}
          <div className="official-stat-card">
            <h3>Relative poverty rates (2021-24)</h3>
            <p className="stat-source">
              Source:{" "}
              <a
                href="https://data.gov.scot/poverty/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Scottish Government - Poverty and Income Inequality in Scotland 2021-24
              </a>
              <br />
              <small>Relative poverty = below 60% of current UK median income</small>
            </p>
            <table className="official-stats-table">
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Rate</th>
                  <th>People</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>All people (BHC)</td>
                  <td>
                    <a
                      href="https://data.gov.scot/poverty/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      18%
                    </a>
                  </td>
                  <td>970,000</td>
                </tr>
                <tr>
                  <td>All people (AHC)</td>
                  <td>
                    <a
                      href="https://data.gov.scot/poverty/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      20%
                    </a>
                  </td>
                  <td>1,070,000</td>
                </tr>
                <tr>
                  <td>Children (AHC)</td>
                  <td>
                    <a
                      href="https://www.gov.scot/news/poverty-levels-broadly-stable-over-last-decade/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      23%
                    </a>
                  </td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Working-age adults (AHC)</td>
                  <td>
                    <a
                      href="https://www.gov.scot/news/poverty-levels-broadly-stable-over-last-decade/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      20%
                    </a>
                  </td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Pensioners (AHC)</td>
                  <td>
                    <a
                      href="https://www.gov.scot/news/poverty-levels-broadly-stable-over-last-decade/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      15%
                    </a>
                  </td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Absolute Poverty */}
          <div className="official-stat-card">
            <h3>Absolute poverty rates</h3>
            <p className="stat-source">
              Source:{" "}
              <a
                href="https://www.gov.scot/news/poverty-levels-broadly-stable-over-last-decade/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Scottish Government
              </a>
              ,{" "}
              <a
                href="https://www.jrf.org.uk/poverty-in-scotland-2025"
                target="_blank"
                rel="noopener noreferrer"
              >
                JRF
              </a>
              <br />
              <small>Absolute poverty = below 60% of 2010/11 UK median (inflation adjusted)</small>
            </p>
            <table className="official-stats-table">
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Rate</th>
                  <th>Period</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Children (AHC)</td>
                  <td>
                    <a
                      href="https://www.gov.scot/news/poverty-levels-broadly-stable-over-last-decade/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      17%
                    </a>
                  </td>
                  <td>2023-24</td>
                </tr>
                <tr>
                  <td>Children (AHC, 3-yr avg)</td>
                  <td>
                    <a
                      href="https://www.jrf.org.uk/poverty-in-scotland-2025"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      20%
                    </a>
                  </td>
                  <td>2021-24</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Disposable Income */}
          <div className="official-stat-card">
            <h3>Total disposable income (2023)</h3>
            <p className="stat-source">
              Source:{" "}
              <a
                href="https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome/bulletins/regionalgrossdisposablehouseholdincomegdhi/1997to2023"
                target="_blank"
                rel="noopener noreferrer"
              >
                ONS - Regional GDHI 1997 to 2023
              </a>
            </p>
            <table className="official-stats-table">
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total GDHI (Scotland)</td>
                  <td>
                    <a
                      href="https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome/bulletins/regionalgrossdisposablehouseholdincomegdhi/1997to2023"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      £125.8bn
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>GDHI per head</td>
                  <td>
                    <a
                      href="https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome/bulletins/regionalgrossdisposablehouseholdincomegdhi/1997to2023"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      £22,908
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Share of UK total</td>
                  <td>
                    <a
                      href="https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome/bulletins/regionalgrossdisposablehouseholdincomegdhi/1997to2023"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      7.4%
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>% of UK average per head</td>
                  <td>
                    <a
                      href="https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome/bulletins/regionalgrossdisposablehouseholdincomegdhi/1997to2023"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      92.2%
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Annual growth (2022-23)</td>
                  <td>
                    <a
                      href="https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome/bulletins/regionalgrossdisposablehouseholdincomegdhi/1997to2023"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      +9.3%
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Income Statistics */}
          <div className="official-stat-card">
            <h3>Income distribution (2025-26)</h3>
            <p className="stat-source">
              Source:{" "}
              <a
                href="https://www.gov.scot/publications/scottish-income-tax-2025-2026-factsheet/pages/2/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Scottish Government - Income Tax 2025-26 Factsheet
              </a>
            </p>
            <table className="official-stats-table">
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Median taxpayer income</td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scottish-income-tax-2025-2026-factsheet/pages/2/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      £29,800
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>25th percentile income</td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scottish-income-tax-2025-2026-factsheet/pages/2/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      £20,400
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>75th percentile income</td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scottish-income-tax-2025-2026-factsheet/pages/2/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      £44,500
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Adults below personal allowance</td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scottish-income-tax-2025-2026-factsheet/pages/2/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      1.6m (34%)
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Economic Forecasts */}
          <div className="official-stat-card">
            <h3>Economic forecasts (SFC May 2025)</h3>
            <p className="stat-source">
              Source:{" "}
              <a
                href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Scottish Government Medium-Term Financial Strategy
              </a>
            </p>
            <table className="official-stats-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>GDP growth</th>
                  <th>Earnings growth</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2025-26</td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      1.2%
                    </a>
                  </td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      3.7%
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>2026-27</td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      1.8%
                    </a>
                  </td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      2.9%
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>2027-28</td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      1.7%
                    </a>
                  </td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      3.0%
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>2028-29</td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      1.6%
                    </a>
                  </td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      2.9%
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>2029-30</td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      1.6%
                    </a>
                  </td>
                  <td>
                    <a
                      href="https://www.gov.scot/publications/scotlands-fiscal-outlook-scottish-governments-medium-term-financial-strategy-3/pages/4/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      3.0%
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Child Poverty Targets */}
          <div className="official-stat-card">
            <h3>Child poverty targets</h3>
            <p className="stat-source">
              Source:{" "}
              <a
                href="https://www.jrf.org.uk/poverty-in-scotland-2025"
                target="_blank"
                rel="noopener noreferrer"
              >
                Joseph Rowntree Foundation - Poverty in Scotland 2025
              </a>
            </p>
            <table className="official-stats-table">
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Current</th>
                  <th>2030 target</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Relative child poverty</td>
                  <td>
                    <a
                      href="https://www.jrf.org.uk/poverty-in-scotland-2025"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      23%
                    </a>
                  </td>
                  <td>10%</td>
                </tr>
                <tr>
                  <td>Absolute child poverty</td>
                  <td>
                    <a
                      href="https://www.jrf.org.uk/poverty-in-scotland-2025"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      20%
                    </a>
                  </td>
                  <td>5%</td>
                </tr>
                <tr>
                  <td>Persistent child poverty</td>
                  <td>
                    <a
                      href="https://www.jrf.org.uk/poverty-in-scotland-2025"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      23%
                    </a>
                  </td>
                  <td>5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Methodology note */}
      <div className="scotland-comparison-note">
        <h3>Notes on comparison</h3>
        <p>
          PolicyEngine projections may differ from official statistics due to:
        </p>
        <ul>
          <li>
            <strong>Time periods:</strong> Official statistics use 3-year
            averages (2021-24), while PolicyEngine shows single-year projections
          </li>
          <li>
            <strong>Data sources:</strong> Both use the Family Resources Survey,
            but with different weighting methodologies
          </li>
          <li>
            <strong>Definitions:</strong> Poverty thresholds are based on 60% of
            UK median equivalised income
          </li>
          <li>
            <strong>Scottish policies:</strong> Scottish Child Payment and other
            devolved policies are included in the baseline
          </li>
        </ul>
        <p>
          For detailed methodology, see the{" "}
          <a
            href="https://policyengine.org/uk/research"
            target="_blank"
            rel="noopener noreferrer"
          >
            PolicyEngine UK documentation
          </a>
          .
        </p>
      </div>
    </div>
  );
}
