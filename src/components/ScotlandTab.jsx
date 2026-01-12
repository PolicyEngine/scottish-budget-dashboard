import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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

// Format year for display (e.g., 2026 -> "2026–27")
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

// Historical household income data (derived from GDHI / households)
// Source: https://www.ons.gov.uk/economy/regionalaccounts/grossdisposablehouseholdincome
// Values calculated as total GDHI / number of households from NRS
// Median estimated at ~87% of mean based on typical income distributions
// 2024+ uses PolicyEngine projections (dashed lines)
const HISTORICAL_HOUSEHOLD_INCOME_DATA = [
  { year: 2021, meanIncome: 41200, medianIncome: 35800 },
  { year: 2022, meanIncome: 45000, medianIncome: 39200 },
  { year: 2023, meanIncome: 49700, medianIncome: 43200 },
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
    year: "2021–24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "3-year average",
  },
  povertyAHC: {
    value: 20,
    year: "2021–24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "3-year average",
  },
  childPovertyBHC: {
    value: 20,
    year: "2021–24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  childPovertyAHC: {
    value: 23,
    year: "2021–24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  workingAgePovertyBHC: {
    value: 14,
    year: "2021–24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  workingAgePovertyAHC: {
    value: 17,
    year: "2021–24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  pensionerPovertyBHC: {
    value: 13,
    year: "2021–24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  pensionerPovertyAHC: {
    value: 15,
    year: "2021–24",
    source: "Scottish Government",
    url: "https://data.gov.scot/poverty/",
    note: "Relative poverty",
  },
  medianIncome: {
    value: 29800,
    year: "2025–26",
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

// Section definitions for navigation
const SECTIONS = [
  { id: "introduction", label: "Introduction" },
  { id: "economic-outlook", label: "Economic outlook" },
  { id: "validation", label: "Validation" },
  { id: "scottish-budget", label: "Scottish Budget 2026" },
];

export default function ScotlandTab() {
  const [loading, setLoading] = useState(true);
  const [baselineData, setBaselineData] = useState([]);
  const [povertyType, setPovertyType] = useState("absoluteBHC"); // absoluteBHC, absoluteAHC, relativeBHC, relativeAHC
  const [activeSection, setActiveSection] = useState("introduction");

  // Refs for section elements
  const sectionRefs = useRef({});

  // Scroll to section handler
  const scrollToSection = useCallback((sectionId) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // Offset for header

      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const section = SECTIONS[i];
        const element = sectionRefs.current[section.id];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection Observer for box highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          } else {
            entry.target.classList.remove("in-view");
          }
        });
      },
      { threshold: 0.3, rootMargin: "-100px 0px -100px 0px" }
    );

    const boxes = document.querySelectorAll(".section-box");
    boxes.forEach((box) => observer.observe(box));

    return () => observer.disconnect();
  }, [loading]);

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
      {/* Section Navigation Sidebar */}
      <nav className="section-nav">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            className={`section-nav-dot ${activeSection === section.id ? "active" : ""}`}
            onClick={() => scrollToSection(section.id)}
            title={section.label}
            aria-label={`Navigate to ${section.label}`}
          />
        ))}
      </nav>

      {/* Introduction */}
      <h2 className="section-title" id="introduction" ref={(el) => (sectionRefs.current["introduction"] = el)}>Introduction</h2>
      <div className="section-box">
        <p className="chart-description">
          This dashboard projects Scotland's economy and poverty levels under current policy, and
          estimates the impact of proposed budget measures. Finance Secretary Shona Robison will{" "}
          <a
            href="https://www.gov.scot/budget/"
            target="_blank"
            rel="noopener noreferrer"
          >
            announce
          </a>{" "}
          the Scottish Budget 2026–27 on 13 January 2026.{" "}
          <a
            href="https://policyengine.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            PolicyEngine
          </a>{" "}
          is an open-source microsimulation model that calculates the impact of tax and benefit
          policies on household incomes. This dashboard uses PolicyEngine to produce Scotland-specific
          projections by{" "}
          <a
            href="https://github.com/PolicyEngine/policyengine-uk-data/blob/main/policyengine_uk_data/datasets/local_areas/constituencies/calibrate.py"
            target="_blank"
            rel="noopener noreferrer"
          >
            reweighting
          </a>{" "}
          the Family Resources Survey to Scottish parliamentary constituencies. PolicyEngine also created a{" "}
          <a
            href="https://www.policyengine.org/uk/autumn-budget-2025"
            target="_blank"
            rel="noopener noreferrer"
          >
            dashboard
          </a>{" "}
          for the UK Autumn Budget 2025. For details on how PolicyEngine poverty estimates compare with official DWP statistics,
          see our{" "}
          <a
            href="https://www.policyengine.org/uk/research/uk-poverty-analysis"
            target="_blank"
            rel="noopener noreferrer"
          >
            analysis
          </a>.
        </p>
      </div>

      {/* Economic outlook section */}
      <h2 className="section-title" id="economic-outlook" ref={(el) => (sectionRefs.current["economic-outlook"] = el)}>Economic outlook</h2>
      <p className="chart-description">
        This section shows PolicyEngine projections for household incomes and poverty rates through
        2030, assuming current legislated policy with no further changes.
      </p>

      {/* Living standard chart */}
      <h3 className="subsection-title">Living standard</h3>
      <div className="section-box">
        <p className="chart-description">
          Mean income is total disposable income divided by number of households. Median income
          is the middle value when all households are ranked by income (half have more, half have
          less). Solid lines show official ONS data (2021–2023), calculated as Scotland's total GDHI divided
          by NRS household estimates. Dashed lines show PolicyEngine projections through 2030,
          which apply OBR forecasts for earnings growth and inflation to the baseline survey data.
        </p>
        <div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={(() => {
              const merged = {};
              // Add historical data
              HISTORICAL_HOUSEHOLD_INCOME_DATA.forEach(d => {
                merged[d.year] = {
                  year: d.year,
                  historicalMean: d.meanIncome,
                  historicalMedian: d.medianIncome,
                };
              });
              // Add/merge PolicyEngine projections
              baselineData.filter(d => d.year >= 2023).forEach(d => {
                if (merged[d.year]) {
                  merged[d.year].projectionMean = d.meanHouseholdIncome;
                  merged[d.year].projectionMedian = d.medianHouseholdIncome;
                } else {
                  merged[d.year] = {
                    year: d.year,
                    projectionMean: d.meanHouseholdIncome,
                    projectionMedian: d.medianHouseholdIncome,
                  };
                }
              });
              return Object.values(merged).sort((a, b) => a.year - b.year);
            })()}
            margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="year"
              tickFormatter={(year) => formatYearRange(year)}
            />
            <YAxis
              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
              domain={[0, 70000]}
              label={{ value: "Household income", angle: -90, position: "insideLeft", dx: -15, style: { textAnchor: "middle" } }}
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

      {/* Poverty rate chart */}
      <h3 className="subsection-title">Poverty rate</h3>
      <div className="section-box">
        <p className="chart-description">
          {povertyType.includes("absolute")
            ? "Absolute poverty measures income below a fixed threshold, adjusted annually for inflation (CPI). This captures whether living standards are improving in real terms over time."
            : "Relative poverty measures income below 60% of contemporary UK median income. This threshold moves with median incomes, so relative poverty can rise even when living standards improve if inequality increases."}
          {povertyType.includes("AHC")
            ? " After housing costs (AHC) subtracts rent, mortgage interest, and other housing costs from income before comparing to the threshold."
            : " Before housing costs (BHC) uses total net income without deducting housing costs."}{" "}
          Solid lines show official Scottish Government data (2021–2023). Dashed lines show
          PolicyEngine projections through 2030, based on OBR economic forecasts for earnings
          growth, inflation, and benefit uprating under current policy.
        </p>
        <div className="chart-controls">
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
        <div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={(() => {
              const merged = {};
              // Add historical data
              HISTORICAL_POVERTY_DATA.forEach(d => {
                let value;
                if (povertyType === "absoluteBHC") value = d.absoluteBHC;
                else if (povertyType === "absoluteAHC") value = d.absoluteAHC;
                else if (povertyType === "relativeBHC") value = d.relativeBHC;
                else value = d.relativeAHC;
                merged[d.year] = {
                  year: d.year,
                  historical: value,
                };
              });
              // Add/merge PolicyEngine projections
              baselineData.filter(d => d.year >= 2023).forEach(d => {
                let value;
                if (povertyType === "absoluteBHC") value = d.absolutePovertyBHC;
                else if (povertyType === "absoluteAHC") value = d.absolutePovertyAHC;
                else if (povertyType === "relativeBHC") value = d.povertyBHC;
                else value = d.povertyAHC;
                if (merged[d.year]) {
                  merged[d.year].projection = value;
                } else {
                  merged[d.year] = {
                    year: d.year,
                    projection: value,
                  };
                }
              });
              return Object.values(merged).sort((a, b) => a.year - b.year);
            })()}
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
              label={{ value: "Poverty rate", angle: -90, position: "insideLeft", dx: -15, style: { textAnchor: "middle" } }}
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
      </div>

      {/* Validation Section */}
      <h2 className="section-title" id="validation" ref={(el) => (sectionRefs.current["validation"] = el)}>Validation</h2>
      <p className="chart-description">
        This section compares PolicyEngine estimates with official government statistics for
        population, income, and poverty.
      </p>

      {/* Population Table - Start with who we're measuring */}
      <h3 className="subsection-title">Population</h3>
      <div className="section-box">
        <p className="chart-description">
          The Family Resources Survey (FRS) samples approximately 20,000 UK households annually.
          To produce Scotland-specific estimates, PolicyEngine{" "}
          <a
            href="https://github.com/PolicyEngine/policyengine-uk-data/blob/main/policyengine_uk_data/datasets/local_areas/constituencies/calibrate.py"
            target="_blank"
            rel="noopener noreferrer"
          >
            reweights
          </a>{" "}
          the survey so that weighted totals match official demographic targets from the
          National Records of Scotland (NRS). This calibration adjusts for sampling variation
          and ensures the microsimulation represents Scotland's actual population structure.
          The table shows 2023 mid-year estimates. NRS publishes population by age and sex,
          household estimates, and projections. PolicyEngine targets total population, household
          count, and age breakdowns (including children under 16) as calibration targets.
        </p>

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
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.population.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.population.value}m
                  </a>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${(peMetrics.year2023.totalPopulation / 1e6).toFixed(2)}m` : "—"}
                  </a>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.totalPopulation / 1e6, OFFICIAL_STATS.population.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Households</strong>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.households.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.households.value}m
                  </a>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `${(peMetrics.year2023.totalHouseholds / 1e6).toFixed(2)}m` : "—"}
                  </a>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.totalHouseholds / 1e6, OFFICIAL_STATS.households.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Children under 16</strong>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.childrenUnder16.url} target="_blank" rel="noopener noreferrer">
                    {OFFICIAL_STATS.childrenUnder16.value}m
                  </a>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    0.97m
                  </a>
                </td>
                <td className="difference">
                  {formatDifference(0.97, OFFICIAL_STATS.childrenUnder16.value)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Income Table */}
      <h3 className="subsection-title">Household income</h3>
      <div className="section-box">
        <p className="chart-description">
          Gross Disposable Household Income (GDHI) measures the amount of money households have
          available for spending or saving after taxes, benefits, pension contributions, and
          property income. ONS publishes GDHI for Scotland as part of regional accounts, derived
          from national accounts data and survey sources. PolicyEngine calculates household net income by simulating the full UK tax-benefit system
          for each FRS household, including employment and self-employment income, minus income tax and National
          Insurance, plus benefits such as Universal Credit, Child Benefit, and State Pension. The per-person
          figures divide total income by population; per-household figures divide by household count.
          Official median values are estimated at 87% of mean based on typical income distributions.
        </p>

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
                    <strong>Total</strong>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.totalGDHI.url} target="_blank" rel="noopener noreferrer">
                    £{OFFICIAL_STATS.totalGDHI.value}bn
                  </a>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `£${peMetrics.year2023.totalDisposableIncomeBn.toFixed(1)}bn` : "—"}
                  </a>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.totalDisposableIncomeBn, OFFICIAL_STATS.totalGDHI.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Mean per person</strong>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.gdhiPerHead.url} target="_blank" rel="noopener noreferrer">
                    £{OFFICIAL_STATS.gdhiPerHead.value.toLocaleString("en-GB")}
                  </a>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `£${peMetrics.year2023.meanIncomePerHead.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` : "—"}
                  </a>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.meanIncomePerHead, OFFICIAL_STATS.gdhiPerHead.value)}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Median per person</strong>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.gdhiPerHead.url} target="_blank" rel="noopener noreferrer">
                    £{Math.round(OFFICIAL_STATS.gdhiPerHead.value * 0.87).toLocaleString("en-GB")}
                  </a>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `£${peMetrics.year2023.medianIncomePerHead.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` : "—"}
                  </a>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.medianIncomePerHead, Math.round(OFFICIAL_STATS.gdhiPerHead.value * 0.87))}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Mean per household</strong>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.totalGDHI.url} target="_blank" rel="noopener noreferrer">
                    £{Math.round((OFFICIAL_STATS.totalGDHI.value * 1e9) / (OFFICIAL_STATS.households.value * 1e6)).toLocaleString("en-GB")}
                  </a>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `£${peMetrics.year2023.meanHouseholdIncome.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` : "—"}
                  </a>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.meanHouseholdIncome, Math.round((OFFICIAL_STATS.totalGDHI.value * 1e9) / (OFFICIAL_STATS.households.value * 1e6)))}
                </td>
              </tr>
              <tr>
                <td className="metric-name">
                  <strong>Median per household</strong>
                </td>
                <td className="official-value">
                  <a href={OFFICIAL_STATS.totalGDHI.url} target="_blank" rel="noopener noreferrer">
                    £{Math.round((OFFICIAL_STATS.totalGDHI.value * 1e9) / (OFFICIAL_STATS.households.value * 1e6) * 0.87).toLocaleString("en-GB")}
                  </a>
                </td>
                <td className="pe-value">
                  <a href={PE_DATA_URLS.baseline} target="_blank" rel="noopener noreferrer">
                    {peMetrics?.year2023 ? `£${peMetrics.year2023.medianHouseholdIncome.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` : "—"}
                  </a>
                </td>
                <td className="difference">
                  {formatDifference(peMetrics?.year2023?.medianHouseholdIncome, Math.round((OFFICIAL_STATS.totalGDHI.value * 1e9) / (OFFICIAL_STATS.households.value * 1e6) * 0.87))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Poverty Rates Table */}
      <h3 className="subsection-title">Poverty rates</h3>
      <div className="section-box">
        <p className="chart-description">
          A household is in relative poverty if its equivalised income falls below 60% of UK median
          income. Equivalisation adjusts for household size using the modified OECD scale (1.0 for
          the first adult, 0.5 for additional adults, 0.3 for children). BHC (before housing costs)
          uses total net income; AHC (after housing costs) subtracts rent, mortgage interest, and
          other housing costs, which typically increases measured poverty rates. Official statistics
          from the Scottish Government combine three years of FRS data (2021–24) to produce more
          stable estimates with smaller confidence intervals. PolicyEngine uses single-year data
          reweighted to Scottish constituencies, which can show more year-to-year variation.
        </p>
        <p className="chart-description" style={{ marginTop: "12px" }}>
          PolicyEngine shows higher child poverty than official statistics (28% vs 20% BHC). This
          gap arises from two factors. First, different benefit take-up assumptions: PolicyEngine{" "}
          <a
            href="https://github.com/PolicyEngine/policyengine-uk-data/blob/main/policyengine_uk_data/parameters/take_up/universal_credit.yaml"
            target="_blank"
            rel="noopener noreferrer"
          >
            assumes
          </a>{" "}
          55% UC take-up to stochastically assign claiming behaviour, then calibrates weights to
          match official UC expenditure totals, while the Scottish Government uses{" "}
          <a
            href="https://www.gov.scot/publications/impact-of-withdrawing-emergency-benefit-measures/pages/annex-a-methodology/"
            target="_blank"
            rel="noopener noreferrer"
          >
            UKMOD
          </a>{" "}
          with 87% take-up. Lower take-up means fewer families are modelled as receiving benefits,
          resulting in lower incomes and higher measured poverty. Second, PolicyEngine calibrates
          to high-income households, which can shift the income distribution
          and affect poverty metrics.
        </p>

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

      {/* Scottish Budget 2026 section */}
      <h2 className="section-title" id="scottish-budget" ref={(el) => (sectionRefs.current["scottish-budget"] = el)}>Scottish Budget 2026</h2>
      <p className="chart-description">
        The Scottish Government is expected to announce measures on child poverty, income tax, and
        council tax. This section examines the likely policies and their estimated costs.
      </p>

      <h3 className="subsection-title">Expected policies</h3>
      <div className="section-box">
        <p className="chart-description">
          According to BBC{" "}
          <a
            href="https://www.bbc.co.uk/news/articles/cpwndd10rejo"
            target="_blank"
            rel="noopener noreferrer"
          >
            Scotland
          </a>, the following policy areas may feature in the budget. The Scottish child payment may
          be increased following the UK Government's decision to abolish the two-child limit, with
          First Minister John Swinney pledging to use funding to tackle child poverty. Scotland's
          six income tax bands (compared to three in the rest of the UK) may face pressure for cuts
          from opposition parties. The council tax freeze ended last year and is not expected to be
          reimposed, meaning households could face increases from April. Business groups have called
          for lower non-domestic rates. Scottish Labour have called for health funding to reduce
          waiting lists and reform the NHS.
        </p>
      </div>

      {/* Two-child limit section */}
      <h3 className="subsection-title">Two-child limit top-up payment</h3>
      <div className="section-box">
        <p className="chart-description">
          The Scottish Government{" "}
          <a
            href="https://www.bbc.co.uk/news/articles/cpwndd10rejo"
            target="_blank"
            rel="noopener noreferrer"
          >
            plans
          </a>{" "}
          to introduce a top-up payment for families with three or more children on Universal Credit
          from April 2026, compensating for the UK-wide two-child limit. The Scottish Fiscal{" "}
          <a
            href="https://fiscalcommission.scot/mitigating-the-two-child-limit-and-the-scottish-budget/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Commission
          </a>{" "}
          estimates this will cost £155 million in 2026–27 rising to £198 million by 2029–30,
          affecting 43,000 children in 2026–27 rising to 50,000 children by 2029–30.{" "}
          PolicyEngine{" "}
          <a
            href="https://github.com/PolicyEngine/scottish-budget-dashboard/blob/main/public/data/scotland_two_child_limit.csv"
            target="_blank"
            rel="noopener noreferrer"
          >
            estimates
          </a>{" "}
          £213 million in 2026–27 rising to £256 million by 2029–30, affecting 69,000 children in
          2026–27 rising to 73,000 children by 2029–30.
        </p>
        <p className="chart-description" style={{ marginTop: "12px" }}>
          The two-child limit restricts Universal Credit child element payments to the first two
          children, so the top-up payment cost depends on how many Scottish families claim UC and
          have three or more children. The difference between estimates arises from different data
          sources: SFC uses DWP administrative{" "}
          <a
            href="https://fiscalcommission.scot/mitigating-the-two-child-limit-and-the-scottish-budget/"
            target="_blank"
            rel="noopener noreferrer"
          >
            data
          </a>{" "}
          on actual UC claimants, while PolicyEngine uses Family Resources Survey data{" "}
          <a
            href="https://github.com/PolicyEngine/policyengine-uk-data/blob/main/policyengine_uk_data/datasets/local_areas/constituencies/calibrate.py"
            target="_blank"
            rel="noopener noreferrer"
          >
            reweighted
          </a>{" "}
          to Scotland, which estimates more families with three or more children receiving UC.
        </p>
      </div>

    </div>
  );
}
