import { useState, useEffect, useMemo } from "react";
import PolicySelector from "./components/PolicySelector";
import BudgetaryImpactChart from "./components/BudgetaryImpactChart";
import DistributionalChart from "./components/DistributionalChart";
import WaterfallChart from "./components/WaterfallChart";
import ConstituencyMap from "./components/ConstituencyMap";
import EmploymentIncomeChart from "./components/EmploymentIncomeChart";
import EmploymentIncomeDiffChart from "./components/EmploymentIncomeDiffChart";
import HouseholdChart from "./components/HouseholdChart";
import OBRComparisonTable from "./components/OBRComparisonTable";
import YearSlider from "./components/YearSlider";
import PolicyDetailCard from "./components/PolicyDetailCard";
import "./App.css";

// Scottish Budget 2026-27 policy provisions with full modelling details
const POLICIES = [
  {
    id: "scottish_threshold_freeze",
    name: "Scottish threshold freeze",
    description: "Freeze Higher/Advanced/Top rate income tax thresholds",
    explanation:
      'Freezes Scottish Higher (42%), Advanced (45%), and Top (48%) rate thresholds at £43,662, £75,000, and £125,140 respectively through 2026-27. Meanwhile, Starter/Basic/Intermediate thresholds rise by 3.5%. This "fiscal drag" means wage inflation pushes more income into higher bands. IFS estimates this raises £223m in 2026-27. Scottish Conservatives claim uprating would save taxpayers up to £718/year.',
    // Full policy details for modelling plan display
    priority: 1,
    probability: "95%",
    policyEngineCapability: "Strong",
    status: "ready",
    peStatus: "FULLY MODELED",
    peLocation: "parameters/gov/hmrc/income_tax/rates/scotland/rates.yaml",
    whatToModel: "Extra tax paid due to frozen upper thresholds vs inflation-uprated scenario. Fiscal drag from frozen Higher/Advanced/Top thresholds while Basic/Intermediate rise 3.5%.",
    scenarios: [
      "Scenario A: Frozen thresholds (SNP policy)",
      "Scenario B: All thresholds uprated 3.5% (Conservative proposal)",
    ],
    keyMetrics: [
      "Tax difference at £45k, £50k, £60k, £75k, £100k, £125k income",
      "Verify Conservative claim of £718/year savings",
      "Verify £1,500 Scotland vs rUK gap claim",
    ],
    implementationSteps: [
      "Verify Scottish 6-band tax parameters are up to date in PolicyEngine",
      "Model frozen vs uprated threshold scenarios using reform API",
      "Calculate savings per taxpayer by income level",
      "Produce comparison table for fact-checking",
    ],
    howToModel: "Use pays_scottish_income_tax.py variable. Modify threshold parameters in reform. Scottish rates: Starter 19%, Basic 20%, Intermediate 21%, Higher 42%, Advanced 45%, Top 48%.",
    outreachTargets: ["Fraser of Allander Institute", "BBC Scotland", "The Scotsman"],
    officialSource: "https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/",
    evidenceSources: [
      {
        title: "Shona Robison confirms threshold freeze to end of Parliament",
        url: "https://www.gov.scot/publications/scottish-budget-2025-26-finance-secretarys-statement-4-december-2024/",
        quote: "Higher, Advanced and Top rate thresholds frozen to end of Parliament (2026-27)",
      },
      {
        title: "IFS analysis of Scottish Budget",
        url: "https://ifs.org.uk/scottish-budget-2025-26",
        quote: "Freeze raises £223m in 2026-27 through fiscal drag",
      },
      {
        title: "Tax Adviser: Scotland's Tax Strategy",
        url: "https://www.taxadvisermagazine.com/article/scotland-s-tax-strategy",
        quote: "No new bands or rate increases before May 2026 election",
      },
    ],
  },
  {
    id: "two_child_limit_removal",
    name: "Two Child Limit removal",
    description: "UK Government abolishes two-child limit on Universal Credit from April 2026",
    explanation:
      "The UK Government announced on 26 November 2025 they will end the two-child limit from April 2026. This affects Universal Credit and Tax Credits, allowing families to claim the child element (£3,647/year) for all children, not just the first two born after April 2017. This lifts an estimated 450,000 children out of poverty - the biggest reduction at any Budget this century.",
    priority: 2,
    probability: "100% (Announced)",
    policyEngineCapability: "Strong (UC child elements modeled)",
    status: "ready",
    peStatus: "FULLY MODELED",
    peLocation: "parameters/gov/dwp/universal_credit/elements/child/",
    whatToModel: "Impact of UK-wide abolition of the two-child limit on Universal Credit child elements",
    scenarios: [
      "Baseline: Two-child limit in place (current)",
      "Reform: Two-child limit removed (April 2026)",
    ],
    keyMetrics: [
      "Number of UK households affected (~250,000 children UK-wide)",
      "Poverty reduction from UK abolition",
      "Average gain per affected family (~£5,310/year)",
    ],
    implementationSteps: [
      "UC child elements already modeled - use uc_child_element variable",
      "Model removal of two-child limit as reform",
      "Calculate poverty reduction impact UK-wide and Scotland",
      "Compare costs and distributional impacts",
    ],
    howToModel: "Remove the two-child limit by setting gov.dwp.universal_credit.elements.child.limit to a high number (e.g., 10). The limit affects 3rd+ children born after 6 April 2017.",
    outreachTargets: ["Glenn Campbell (BBC Scotland)", "Child poverty charities", "UK-wide media"],
    officialSource: "https://www.gov.uk/government/news/over-half-a-million-children-to-be-lifted-out-of-poverty",
    evidenceSources: [
      {
        title: "UK Government abolishes two-child limit from April 2026",
        url: "https://www.gov.uk/government/news/over-half-a-million-children-to-be-lifted-out-of-poverty-as-government-unveils-historic-child-poverty-strategy",
        quote: "450,000 children lifted out of poverty - biggest reduction at any Budget this century",
      },
      {
        title: "Which? confirms two-child cap ends April 2026",
        url: "https://www.which.co.uk/news/article/two-child-benefit-cap-to-be-lifted-from-april-2026-aQoDS6V3hCwV",
        quote: "Families will receive £3,647 for each child born after April 2017",
      },
      {
        title: "MoneyHelper: Two-child benefit limit has ended",
        url: "https://www.moneyhelper.org.uk/en/blog/benefits-entitlements/two-child-benefit-limit-ends",
        quote: "560,000 families will see average increase of £5,310/year",
      },
    ],
  },
  // Scottish Child Payment increase not yet available in PolicyEngine UK
  // Will be added once the SCP parameters are implemented
];

// Preset policy combinations
const PRESETS = [
  {
    id: "scottish-budget",
    name: "Scottish Budget 2026-27",
    policies: POLICIES.map((p) => p.id),
  },
];

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");

  // Parse a single CSV line handling quoted fields
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

function App() {
  const [selectedPolicies, setSelectedPolicies] = useState(
    POLICIES.map((p) => p.id),
  );
  // Default to 2030 so more policies have visible impact
  const [selectedYear, setSelectedYear] = useState(2030);
  // Shared year for distributional analysis charts (WaterfallChart and DistributionalChart)
  const [distributionalYear, setDistributionalYear] = useState(2029);
  const [results, setResults] = useState(null);
  const [showOBRComparison, setShowOBRComparison] = useState(false);

  // Valid policy IDs from POLICIES
  const validPolicyIds = POLICIES.map((p) => p.id);

  // Initialize from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const policiesParam = params.get("policies");

    if (policiesParam) {
      // Filter to only include valid policy IDs
      const policies = policiesParam
        .split(",")
        .filter((id) => validPolicyIds.includes(id));
      setSelectedPolicies(policies);
    }
  }, []);

  // Update URL when policies change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (selectedPolicies.length > 0) {
      params.set("policies", selectedPolicies.join(","));
    } else {
      params.delete("policies");
    }

    const newUrl = params.toString()
      ? `?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [selectedPolicies]);

  // Run analysis when policies or year change
  useEffect(() => {
    if (selectedPolicies.length === 0) {
      setResults(null);
      return;
    }

    runAnalysis();
  }, [selectedPolicies, selectedYear]);

  const runAnalysis = async () => {
    try {
      // Fetch all CSVs in parallel
      const [
        budgetaryRes,
        distributionalRes,
        winnersLosersRes,
        metricsRes,
        householdScatterRes,
      ] = await Promise.all([
        fetch("/data/budgetary_impact.csv"),
        fetch("/data/distributional_impact.csv"),
        fetch("/data/winners_losers.csv"),
        fetch("/data/metrics.csv"),
        fetch("/data/household_scatter.csv"),
      ]);

      const budgetaryData = parseCSV(await budgetaryRes.text());
      const distributionalData = parseCSV(await distributionalRes.text());
      const winnersLosersData = parseCSV(await winnersLosersRes.text());
      const metricsData = parseCSV(await metricsRes.text());
      const householdScatterData = parseCSV(await householdScatterRes.text());

      // Filter data for selected policies
      const filteredBudgetary = budgetaryData.filter((row) =>
        selectedPolicies.includes(row.reform_id),
      );
      const filteredDistributional = distributionalData.filter((row) =>
        selectedPolicies.includes(row.reform_id),
      );
      const filteredWinnersLosers = winnersLosersData.filter((row) =>
        selectedPolicies.includes(row.reform_id),
      );
      const filteredMetrics = metricsData.filter((row) =>
        selectedPolicies.includes(row.reform_id),
      );
      // Keep raw household scatter data (filtering will be done by component)
      const filteredHouseholdScatter = householdScatterData.filter((row) =>
        selectedPolicies.includes(row.reform_id),
      );

      // Build budgetary impact data for chart (2026-2029)
      // Always include all policy keys for smooth animations
      const years = [2026, 2027, 2028, 2029, 2030];
      const budgetData = years.map((year) => {
        const dataPoint = { year };
        let netImpact = 0;
        POLICIES.forEach((policy) => {
          const isSelected = selectedPolicies.includes(policy.id);
          const dataRow = budgetaryData.find(
            (row) => row.reform_id === policy.id && parseInt(row.year) === year,
          );
          const value = isSelected && dataRow ? parseFloat(dataRow.value) : 0;
          dataPoint[policy.name] = value;
          netImpact += value;
        });
        dataPoint.netImpact = netImpact;
        return dataPoint;
      });

      // Calculate budgetary impact for 2026 (metrics always show 2026)
      const budgetaryImpact2026 = filteredBudgetary
        .filter((row) => parseInt(row.year) === 2026)
        .reduce((sum, row) => sum + parseFloat(row.value), 0);

      // Build distributional data (grouped by decile with policy breakdown)
      // Always include all policy keys for smooth animations
      const decileOrder = [
        "1st",
        "2nd",
        "3rd",
        "4th",
        "5th",
        "6th",
        "7th",
        "8th",
        "9th",
        "10th",
      ];
      const distributionalSelectedYear = distributionalData.filter(
        (row) => parseInt(row.year) === selectedYear,
      );
      const distributionalChartData = decileOrder.map((decile) => {
        const dataPoint = { decile };
        let netChange = 0;
        POLICIES.forEach((policy) => {
          const isSelected = selectedPolicies.includes(policy.id);
          const dataRow = distributionalSelectedYear.find(
            (row) => row.reform_id === policy.id && row.decile === decile,
          );
          const value = isSelected && dataRow ? parseFloat(dataRow.value) : 0;
          dataPoint[policy.name] = value;
          netChange += value;
        });
        dataPoint.netChange = netChange;
        return dataPoint;
      });

      // Build waterfall data (grouped by decile with policy breakdown)
      // Always include all policy keys for smooth animations
      const waterfallSelectedYear = winnersLosersData.filter(
        (row) => parseInt(row.year) === selectedYear && row.decile !== "all",
      );
      const waterfallDeciles = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
      ];
      const waterfallData = waterfallDeciles.map((decile) => {
        const dataPoint = { decile };
        let netChange = 0;
        POLICIES.forEach((policy) => {
          const isSelected = selectedPolicies.includes(policy.id);
          const dataRow = waterfallSelectedYear.find(
            (row) => row.reform_id === policy.id && row.decile === decile,
          );
          const value =
            isSelected && dataRow ? parseFloat(dataRow.avg_change) : 0;
          dataPoint[policy.name] = value;
          netChange += value;
        });
        dataPoint.netChange = netChange;
        return dataPoint;
      });

      // Extract metrics for 2026 (metrics always show 2026)
      const metrics2026 = filteredMetrics.find(
        (row) => parseInt(row.year) === 2026,
      );
      const percentAffected = metrics2026
        ? parseFloat(metrics2026.people_affected)
        : null;
      const giniChange = metrics2026
        ? parseFloat(metrics2026.gini_change)
        : null;
      const povertyRateChange = metrics2026
        ? parseFloat(metrics2026.poverty_change_pp)
        : null;

      // Calculate total revenue over budget window (2026-2029)
      const budgetWindowRevenue = filteredBudgetary.reduce(
        (sum, row) => sum + parseFloat(row.value),
        0,
      );

      setResults({
        metrics: {
          budgetaryImpact2026,
          budgetWindowRevenue,
          percentAffected,
          giniChange,
          povertyRateChange,
        },
        budgetData,
        distributionalData:
          distributionalChartData.length > 0 ? distributionalChartData : null,
        waterfallData: waterfallData.length > 0 ? waterfallData : null,
        householdScatterData:
          filteredHouseholdScatter.length > 0 ? filteredHouseholdScatter : null,
        rawDistributional: filteredDistributional,
        rawWinnersLosers: filteredWinnersLosers,
        rawHouseholdScatter: filteredHouseholdScatter,
      });
    } catch (error) {
      console.error("Error loading results:", error);
      setResults(null);
    }
  };

  const handlePolicyToggle = (policyId) => {
    setSelectedPolicies((prev) => {
      if (prev.includes(policyId)) {
        return prev.filter((id) => id !== policyId);
      } else {
        return [...prev, policyId];
      }
    });
  };

  const handlePresetClick = (presetPolicies) => {
    setSelectedPolicies(presetPolicies);
  };

  return (
    <div className="app">
      <main className="main-content">
        {/* Title row with controls */}
        <div className="title-row">
          <h1>Scottish Budget 2026-27</h1>
          <PolicySelector
            policies={POLICIES}
            selectedPolicies={selectedPolicies}
            onPolicyToggle={handlePolicyToggle}
          />
        </div>

        {/* Dashboard content */}
        <>
          {/* Dashboard description */}
          <p className="dashboard-intro">
            Explore the fiscal and distributional impacts of Scottish Budget
            policies. Select policies to see how they affect government
            revenue, household incomes, and inequality across income groups.
            Scroll down for detailed PolicyEngine modelling specifications.
          </p>

            {selectedPolicies.length === 0 ? (
              <div className="empty-state">
                <p>
                  Select policies to analyse their impact on government revenue
                  and household incomes.
                </p>
                <div className="preset-buttons">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className="preset-button"
                      onClick={() => handlePresetClick(preset.policies)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="results-container">
                {results && (
                  <>
                    {/* Hero Chart: Revenue Impact */}
                    <div className="hero-chart">
                      <BudgetaryImpactChart data={results.budgetData} />
                    </div>

                    {/* OBR Comparison (expandable) */}
                    <div className="obr-expandable">
                      <button
                        className="obr-toggle-button"
                        onClick={() => setShowOBRComparison(!showOBRComparison)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        Compare with OBR estimates
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: showOBRComparison
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                            transition: "transform 0.2s",
                            marginLeft: "auto",
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      {showOBRComparison && (
                        <div className="obr-content">
                          <OBRComparisonTable selectedPolicies={selectedPolicies} />
                        </div>
                      )}
                    </div>

                    {/* Row 1: Absolute and Relative Impact with shared year slider */}
                    <div className="distributional-section">
                      <div className="section-year-slider">
                        <YearSlider
                          selectedYear={distributionalYear}
                          onYearChange={setDistributionalYear}
                        />
                      </div>
                      <div className="charts-grid">
                        <WaterfallChart
                          rawData={results.rawWinnersLosers}
                          selectedPolicies={selectedPolicies}
                          selectedYear={distributionalYear}
                        />
                        <DistributionalChart
                          rawData={results.rawDistributional}
                          selectedPolicies={selectedPolicies}
                          selectedYear={distributionalYear}
                        />
                      </div>
                    </div>

                    {/* Row 2: Constituency Map and Scatter */}
                    <div className="charts-grid charts-row-2">
                      <ConstituencyMap
                        selectedPolicies={selectedPolicies}
                        selectedYear={distributionalYear}
                      />
                      {results.rawHouseholdScatter && (
                        <HouseholdChart
                          rawData={results.rawHouseholdScatter}
                          selectedPolicies={selectedPolicies}
                          selectedYear={distributionalYear}
                        />
                      )}
                    </div>

                    {/* Row 3: Net Income Analysis Charts */}
                    <div className="charts-grid charts-row-3">
                      <EmploymentIncomeChart
                        selectedPolicies={selectedPolicies}
                        selectedYear={distributionalYear}
                      />
                      <EmploymentIncomeDiffChart
                        selectedPolicies={selectedPolicies}
                        selectedYear={distributionalYear}
                      />
                    </div>

                    {/* Policy Modelling Details Section */}
                    <div id="policy-details" className="policy-modelling-section">
                      <div className="section-header">
                        <h3>PolicyEngine Modelling Plan</h3>
                        <p className="section-intro">
                          Detailed analysis specification for the Scottish Budget policies
                        </p>
                      </div>
                      <div className="policy-cards-grid">
                        {POLICIES.filter((policy) =>
                          selectedPolicies.includes(policy.id),
                        ).map((policy) => (
                          <PolicyDetailCard key={policy.id} policy={policy} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
        </>
      </main>
    </div>
  );
}

export default App;
