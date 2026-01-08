import { useState, useEffect, useMemo } from "react";
import ConstituencyMetrics from "./ConstituencyMetrics";
import ConstituencyDemographicChart from "./ConstituencyDemographicChart";
import ConstituencyTrendChart from "./ConstituencyTrendChart";
import WaterfallChart from "./WaterfallChart";
import DistributionalChart from "./DistributionalChart";
import HouseholdChart from "./HouseholdChart";
import ConstituencyMap from "./ConstituencyMap";
import YearSlider from "./YearSlider";
import "./LocalAreaTab.css";

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

function LocalAreaTab({
  policies,
  selectedPolicies,
  selectedConstituency,
  onConstituencySelect,
}) {
  const [constituencyData, setConstituencyData] = useState(null);
  const [demographicData, setDemographicData] = useState(null);
  const [distributionalData, setDistributionalData] = useState(null);
  const [winnersLosersData, setWinnersLosersData] = useState(null);
  const [householdScatterData, setHouseholdScatterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2029);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          constituencyRes,
          demographicRes,
          distributionalRes,
          winnersLosersRes,
          householdScatterRes,
        ] = await Promise.all([
          fetch("/data/constituency.csv"),
          fetch("/data/demographic_constituency.csv"),
          fetch("/data/distributional_impact.csv"),
          fetch("/data/winners_losers.csv"),
          fetch("/data/household_scatter.csv"),
        ]);

        const constituencyCSV = await constituencyRes.text();
        const demographicCSV = await demographicRes.text();
        const distributionalCSV = await distributionalRes.text();
        const winnersLosersCSV = await winnersLosersRes.text();
        const householdScatterCSV = await householdScatterRes.text();

        setConstituencyData(parseCSV(constituencyCSV));
        setDemographicData(parseCSV(demographicCSV));
        setDistributionalData(parseCSV(distributionalCSV));
        setWinnersLosersData(parseCSV(winnersLosersCSV));
        setHouseholdScatterData(parseCSV(householdScatterCSV));
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate metrics for selected constituency
  const metrics = useMemo(() => {
    if (!selectedConstituency || !constituencyData || selectedPolicies.length === 0) {
      return null;
    }

    const filtered = constituencyData.filter(
      (row) =>
        row.constituency_code === selectedConstituency.code &&
        selectedPolicies.includes(row.reform_id) &&
        parseInt(row.year) === selectedYear
    );

    if (filtered.length === 0) return null;

    // Sum across selected policies
    const totalGain = filtered.reduce(
      (sum, row) => sum + parseFloat(row.average_gain),
      0
    );
    const totalRelativeChange = filtered.reduce(
      (sum, row) => sum + parseFloat(row.relative_change),
      0
    );

    return {
      averageGain: totalGain,
      relativeChange: totalRelativeChange,
    };
  }, [selectedConstituency, constituencyData, selectedPolicies, selectedYear]);

  // Calculate national average for comparison
  const nationalAverage = useMemo(() => {
    if (!constituencyData || selectedPolicies.length === 0) return null;

    const yearData = constituencyData.filter(
      (row) =>
        selectedPolicies.includes(row.reform_id) &&
        parseInt(row.year) === selectedYear
    );

    if (yearData.length === 0) return null;

    // Group by constituency and sum policies
    const byConstituency = new Map();
    yearData.forEach((row) => {
      const existing = byConstituency.get(row.constituency_code) || 0;
      byConstituency.set(
        row.constituency_code,
        existing + parseFloat(row.average_gain)
      );
    });

    const values = Array.from(byConstituency.values());
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [constituencyData, selectedPolicies, selectedYear]);

  // Get demographic data for selected constituency
  const constituencyDemographics = useMemo(() => {
    if (!selectedConstituency || !demographicData || selectedPolicies.length === 0) {
      return [];
    }

    return demographicData.filter(
      (row) =>
        row.constituency_code === selectedConstituency.code &&
        selectedPolicies.includes(row.reform_id) &&
        parseInt(row.year) === selectedYear
    );
  }, [selectedConstituency, demographicData, selectedPolicies, selectedYear]);

  // Get total household count
  const householdCount = useMemo(() => {
    if (!constituencyDemographics.length) return 0;

    // Get unique demographic groups to avoid double counting from multiple policies
    const uniqueGroups = new Map();
    constituencyDemographics.forEach((row) => {
      const key = `${row.num_children}-${row.is_married}`;
      if (!uniqueGroups.has(key)) {
        uniqueGroups.set(key, parseFloat(row.household_count));
      }
    });

    return Array.from(uniqueGroups.values()).reduce((a, b) => a + b, 0);
  }, [constituencyDemographics]);

  // Get trend data for charts (all years)
  const trendData = useMemo(() => {
    if (!selectedConstituency || !constituencyData) return [];

    return constituencyData.filter(
      (row) =>
        row.constituency_code === selectedConstituency.code &&
        selectedPolicies.includes(row.reform_id)
    );
  }, [selectedConstituency, constituencyData, selectedPolicies]);

  // Aggregate demographic data across selected policies
  const aggregatedDemographics = useMemo(() => {
    if (!constituencyDemographics.length) return [];

    // Group by demographic combination and sum across policies
    const grouped = new Map();
    constituencyDemographics.forEach((row) => {
      const key = `${row.num_children}-${row.is_married}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.average_gain =
          parseFloat(existing.average_gain) + parseFloat(row.average_gain);
        existing.relative_change =
          parseFloat(existing.relative_change) + parseFloat(row.relative_change);
      } else {
        grouped.set(key, { ...row });
      }
    });

    return Array.from(grouped.values());
  }, [constituencyDemographics]);

  // Calculate fixed y-axis domain for demographic chart across ALL years
  const demographicYAxisDomain = useMemo(() => {
    if (!selectedConstituency || !demographicData || selectedPolicies.length === 0) {
      return [-500, 500];
    }

    // Get all demographic data for this constituency across all years
    const allYearsData = demographicData.filter(
      (row) =>
        row.constituency_code === selectedConstituency.code &&
        selectedPolicies.includes(row.reform_id)
    );

    if (allYearsData.length === 0) return [-500, 500];

    // Calculate max absolute value across all years and demographics
    const years = [2026, 2027, 2028, 2029, 2030];
    let maxAbs = 0;

    years.forEach((year) => {
      const yearData = allYearsData.filter((row) => parseInt(row.year) === year);

      // Group by demographic and sum across policies for this year
      const grouped = new Map();
      yearData.forEach((row) => {
        const key = `${row.num_children}-${row.is_married}`;
        const existing = grouped.get(key) || 0;
        grouped.set(key, existing + parseFloat(row.average_gain));
      });

      grouped.forEach((value) => {
        maxAbs = Math.max(maxAbs, Math.abs(value));
      });
    });

    // Round to nice number
    const roundToNice = (value) => {
      if (value <= 100) return 100;
      if (value <= 250) return 250;
      if (value <= 500) return 500;
      if (value <= 1000) return 1000;
      if (value <= 2500) return 2500;
      return Math.ceil(value / 1000) * 1000;
    };

    const rounded = roundToNice(maxAbs * 1.1);
    return [-rounded, rounded];
  }, [selectedConstituency, demographicData, selectedPolicies]);

  // Filter distributional data for selected policies (UK-wide)
  const filteredDistributional = useMemo(() => {
    if (!distributionalData || selectedPolicies.length === 0) return [];
    return distributionalData.filter((row) =>
      selectedPolicies.includes(row.reform_id)
    );
  }, [distributionalData, selectedPolicies]);

  // Filter winners/losers data for selected policies (UK-wide)
  const filteredWinnersLosers = useMemo(() => {
    if (!winnersLosersData || selectedPolicies.length === 0) return [];
    return winnersLosersData.filter((row) =>
      selectedPolicies.includes(row.reform_id)
    );
  }, [winnersLosersData, selectedPolicies]);

  // Filter household scatter data for selected policies (UK-wide)
  const filteredHouseholdScatter = useMemo(() => {
    if (!householdScatterData || selectedPolicies.length === 0) return [];
    return householdScatterData.filter((row) =>
      selectedPolicies.includes(row.reform_id)
    );
  }, [householdScatterData, selectedPolicies]);

  if (loading) {
    return (
      <div className="local-area-tab">
        <div className="loading-state">Loading constituency data...</div>
      </div>
    );
  }

  return (
    <div className="local-area-tab">
      {!selectedConstituency || selectedPolicies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <p>
            {!selectedConstituency && selectedPolicies.length === 0
              ? "Select your local area and policies to see how the budget affects households in your constituency"
              : !selectedConstituency
              ? "Select a constituency to see local impact analysis"
              : "Select at least one policy to see the impact analysis"}
          </p>
        </div>
      ) : (
        <div className="local-area-results">
          {/* Year selector */}
          <div className="local-year-slider">
            <YearSlider
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />
          </div>

          {/* Metrics cards */}
          {metrics && (
            <ConstituencyMetrics
              constituencyName={selectedConstituency.name}
              averageGain={metrics.averageGain}
              relativeChange={metrics.relativeChange}
              householdCount={Math.round(householdCount)}
              nationalAverageGain={nationalAverage}
            />
          )}

          {/* Charts grid - Local area specific */}
          <div className="local-charts-grid">
            <ConstituencyDemographicChart
              data={aggregatedDemographics}
              constituencyName={selectedConstituency.name}
              yAxisDomain={demographicYAxisDomain}
              selectedYear={selectedYear}
            />
            <ConstituencyTrendChart
              data={trendData}
              constituencyName={selectedConstituency.name}
              selectedPolicies={selectedPolicies}
              policies={policies}
            />
          </div>

          {/* UK-wide distributional analysis */}
          <div className="uk-wide-section">
            <div className="local-charts-grid">
              <WaterfallChart
                rawData={filteredWinnersLosers}
                selectedPolicies={selectedPolicies}
                selectedYear={selectedYear}
              />
              <DistributionalChart
                rawData={filteredDistributional}
                selectedPolicies={selectedPolicies}
                selectedYear={selectedYear}
              />
            </div>
            <div className="local-charts-grid">
              <ConstituencyMap
                selectedPolicies={selectedPolicies}
                selectedYear={selectedYear}
                selectedConstituency={selectedConstituency}
                onConstituencySelect={onConstituencySelect}
              />
              <HouseholdChart
                rawData={filteredHouseholdScatter}
                selectedPolicies={selectedPolicies}
                selectedYear={selectedYear}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocalAreaTab;
