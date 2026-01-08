import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "./ConstituencyDemographicChart.css";

const DEMOGRAPHIC_COLORS = {
  "Married": "#319795",
  "Single": "#D97706",
};

function ConstituencyDemographicChart({ data, constituencyName, yAxisDomain, selectedYear }) {
  // Format year for title (e.g., 2029 -> "2029-30")
  const formatYearRange = (year) => `${year}-${(year + 1).toString().slice(-2)}`;

  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3>Impact by family type, {formatYearRange(selectedYear)}</h3>
        <div className="chart-empty">No demographic data available</div>
      </div>
    );
  }

  // Group data by number of children, showing married vs single
  const childrenGroups = ["0", "1", "2", "3", "4+"];
  const chartData = childrenGroups.map((numChildren) => {
    const married = data.find(
      (d) => d.num_children === numChildren && d.is_married === "True"
    );
    const single = data.find(
      (d) => d.num_children === numChildren && d.is_married === "False"
    );

    return {
      children: numChildren === "0" ? "No children" : numChildren === "1" ? "1 child" : `${numChildren} children`,
      Married: married ? parseFloat(married.average_gain) : 0,
      Single: single ? parseFloat(single.average_gain) : 0,
      marriedCount: married ? parseInt(married.household_count) : 0,
      singleCount: single ? parseInt(single.household_count) : 0,
    };
  });

  const formatCurrency = (value) => {
    if (Math.abs(value) >= 1000) {
      return `£${(value / 1000).toFixed(1)}k`;
    }
    return `£${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="demographic-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
              <span className="tooltip-households">
                ({entry.name === "Married"
                  ? payload[0].payload.marriedCount.toLocaleString()
                  : payload[0].payload.singleCount.toLocaleString()}{" "}
                households)
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <h3>Impact by family type, {formatYearRange(selectedYear)}</h3>
      <p className="chart-description">
        Average annual impact by household composition in {constituencyName}
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="children"
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            domain={yAxisDomain}
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Bar
            dataKey="Married"
            fill={DEMOGRAPHIC_COLORS.Married}
            name="Married"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Single"
            fill={DEMOGRAPHIC_COLORS.Single}
            name="Single"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ConstituencyDemographicChart;
