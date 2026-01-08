import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
} from "recharts";
import { POLICY_COLORS } from "../utils/policyConfig";
import "./ConstituencyTrendChart.css";

// Order policies: positive impact first (spending/cuts), then negative (taxes)
const POLICY_ORDER = [
  "2 child limit repeal",
  "Fuel duty freeze extension",
  "Rail fares freeze",
  "Threshold freeze extension",
  "Dividend tax increase (+2pp)",
  "Savings income tax increase (+2pp)",
  "Property income tax increase (+2pp)",
  "Freeze student loan repayment thresholds",
  "Salary sacrifice cap",
];

function ConstituencyTrendChart({
  data,
  constituencyName,
  selectedPolicies,
  policies,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3>Household impact by year</h3>
        <div className="chart-empty">No trend data available</div>
      </div>
    );
  }

  // Group data by year with policy breakdown
  const years = [2026, 2027, 2028, 2029, 2030];
  const chartData = years.map((year) => {
    const dataPoint = { year: `${year}-${(year + 1).toString().slice(-2)}`, yearNum: year };
    let netImpact = 0;

    selectedPolicies.forEach((policyId) => {
      const policyData = data.find(
        (d) => d.reform_id === policyId && parseInt(d.year) === year
      );
      const policy = policies.find((p) => p.id === policyId);
      const value = policyData ? parseFloat(policyData.average_gain) : 0;
      if (policy) {
        dataPoint[policy.name] = value;
      }
      netImpact += value;
    });

    dataPoint.netImpact = netImpact;
    return dataPoint;
  });

  const formatCurrency = (value) => {
    if (Math.abs(value) >= 1000) {
      return `£${(value / 1000).toFixed(1)}k`;
    }
    return `£${value.toFixed(0)}`;
  };

  // Format year for display
  const formatYear = (year) => year;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Sort payload by value for cleaner display
      const sortedPayload = [...payload].sort((a, b) => {
        if (a.name === "Net impact") return 1;
        if (b.name === "Net impact") return -1;
        return (b.value || 0) - (a.value || 0);
      });

      return (
        <div className="trend-tooltip">
          <p className="tooltip-label">{label}</p>
          {sortedPayload.map((entry, index) => (
            <p
              key={index}
              style={{
                color: entry.name === "Net impact" ? "#374151" : entry.color,
                fontWeight: entry.name === "Net impact" ? 600 : 400,
              }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get policy names for selected policies in the correct order
  const policyNames = POLICY_ORDER.filter((name) =>
    selectedPolicies.some((id) => policies.find((p) => p.id === id)?.name === name)
  );

  // Calculate y-axis domain to accommodate stacked bars
  const calculateYAxisDomain = () => {
    let minValue = 0;
    let maxValue = 0;

    chartData.forEach((dataPoint) => {
      let positiveSum = 0;
      let negativeSum = 0;

      policyNames.forEach((name) => {
        const value = dataPoint[name] || 0;
        if (value > 0) positiveSum += value;
        else negativeSum += value;
      });

      minValue = Math.min(minValue, negativeSum);
      maxValue = Math.max(maxValue, positiveSum);
    });

    // Add padding
    const padding = Math.max(Math.abs(minValue), Math.abs(maxValue)) * 0.15;
    return [Math.floor((minValue - padding) / 50) * 50, Math.ceil((maxValue + padding) / 50) * 50];
  };

  const yAxisDomain = calculateYAxisDomain();

  // Custom label for net impact line
  const renderNetImpactLabel = (props) => {
    const { x, y, value } = props;
    if (value === undefined) return null;
    return (
      <g>
        <rect
          x={x - 30}
          y={y - 22}
          width={60}
          height={18}
          fill="white"
          stroke="#e5e7eb"
          rx={4}
        />
        <text
          x={x}
          y={y - 10}
          textAnchor="middle"
          fill="#374151"
          fontSize={11}
          fontWeight={500}
        >
          {formatCurrency(value)}
        </text>
      </g>
    );
  };

  return (
    <div className="chart-container">
      <h3>Household impact by year</h3>
      <p className="chart-description">
        Projected average household impact in {constituencyName} from 2026-2030.
        Bars show individual policy contributions; line shows net impact.
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 30, right: 30, left: 50, bottom: 20 }}
          stackOffset="sign"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="year"
            tickFormatter={formatYear}
            tick={{ fontSize: 12, fill: "#666" }}
            tickLine={false}
            axisLine={{ stroke: "#e0e0e0" }}
          />
          <YAxis
            domain={yAxisDomain}
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12, fill: "#666" }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Impact (£)",
              angle: -90,
              position: "insideLeft",
              dx: -20,
              style: { fill: "#374151", fontSize: 12, fontWeight: 500 },
            }}
          />
          <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="rect"
            formatter={(value) => (
              <span style={{ color: "#374151", fontSize: "12px" }}>{value}</span>
            )}
          />

          {/* Stacked bars for each policy */}
          {policyNames.map((name) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="stack"
              fill={POLICY_COLORS[name] || "#9CA3AF"}
              name={name}
              animationDuration={500}
            />
          ))}

          {/* Net impact line */}
          {policyNames.length > 1 && (
            <Line
              type="monotone"
              dataKey="netImpact"
              stroke="#374151"
              strokeWidth={2}
              dot={{ fill: "#374151", stroke: "#374151", r: 4 }}
              name="Net impact"
              animationDuration={500}
            >
              <LabelList
                dataKey="netImpact"
                content={renderNetImpactLabel}
                position="top"
              />
            </Line>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ConstituencyTrendChart;
