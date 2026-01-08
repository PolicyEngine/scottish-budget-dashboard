import "./PolicyBreakdownTable.css";

// Policy metadata for categorization - Scottish Budget policies
const POLICY_CATEGORIES = {
  scottish_threshold_freeze: { category: "Scottish Income Tax", type: "tax_rise" },
  scottish_child_payment_increase: { category: "Benefits", type: "spending" },
  two_child_limit_payment: { category: "Benefits", type: "spending" },
};

function PolicyBreakdownTable({
  constituencyData,
  selectedConstituency,
  selectedPolicies,
  selectedYear,
  policies,
  householdCount,
}) {
  if (!selectedConstituency || !constituencyData || selectedPolicies.length === 0) {
    return null;
  }

  // Get data for each selected policy
  const policyBreakdown = selectedPolicies
    .map((policyId) => {
      const policy = policies.find((p) => p.id === policyId);
      const data = constituencyData.find(
        (row) =>
          row.reform_id === policyId &&
          row.constituency_code === selectedConstituency.code &&
          parseInt(row.year) === selectedYear
      );

      if (!policy || !data) return null;

      const averageGain = parseFloat(data.average_gain);
      const relativeChange = parseFloat(data.relative_change);
      const meta = POLICY_CATEGORIES[policyId] || { category: "Other", type: "other" };

      return {
        id: policyId,
        name: policy.name,
        category: meta.category,
        type: meta.type,
        averageGain,
        relativeChange,
        totalImpact: (averageGain * householdCount) / 1000000, // Convert to millions
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.averageGain - a.averageGain); // Sort by impact (highest first)

  // Calculate totals
  const totals = policyBreakdown.reduce(
    (acc, p) => ({
      averageGain: acc.averageGain + p.averageGain,
      relativeChange: acc.relativeChange + p.relativeChange,
      totalImpact: acc.totalImpact + p.totalImpact,
    }),
    { averageGain: 0, relativeChange: 0, totalImpact: 0 }
  );

  // Format currency
  const formatCurrency = (value) => {
    const absVal = Math.abs(value);
    const formatted = absVal.toLocaleString("en-GB", { maximumFractionDigits: 0 });
    return value < 0 ? `-£${formatted}` : `£${formatted}`;
  };

  // Format percentage
  const formatPercent = (value) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // Format millions
  const formatMillions = (value) => {
    const absVal = Math.abs(value);
    if (absVal >= 1) {
      const formatted = absVal.toFixed(1);
      return value < 0 ? `-£${formatted}m` : `£${formatted}m`;
    }
    const thousands = absVal * 1000;
    const formatted = thousands.toFixed(0);
    return value < 0 ? `-£${formatted}k` : `£${formatted}k`;
  };

  return (
    <div className="policy-breakdown-table">
      <h3>Policy impact breakdown</h3>
      <p className="table-description">
        Impact of each selected policy on households in {selectedConstituency.name}.
        Per-household averages and area totals for {selectedYear}-{(selectedYear + 1).toString().slice(-2)}.
      </p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="col-policy">Policy</th>
              <th className="col-category">Category</th>
              <th className="col-number">Per household (£)</th>
              <th className="col-number">Relative change</th>
              <th className="col-number">Area total</th>
            </tr>
          </thead>
          <tbody>
            {policyBreakdown.map((policy) => (
              <tr key={policy.id}>
                <td className="col-policy">{policy.name}</td>
                <td className="col-category">
                  <span className={`category-badge ${policy.type}`}>
                    {policy.category}
                  </span>
                </td>
                <td className={`col-number ${policy.averageGain >= 0 ? "positive" : "negative"}`}>
                  {formatCurrency(policy.averageGain)}
                </td>
                <td className={`col-number ${policy.relativeChange >= 0 ? "positive" : "negative"}`}>
                  {formatPercent(policy.relativeChange)}
                </td>
                <td className={`col-number ${policy.totalImpact >= 0 ? "positive" : "negative"}`}>
                  {formatMillions(policy.totalImpact)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td className="col-policy">Net impact</td>
              <td className="col-category"></td>
              <td className={`col-number ${totals.averageGain >= 0 ? "positive" : "negative"}`}>
                {formatCurrency(totals.averageGain)}
              </td>
              <td className={`col-number ${totals.relativeChange >= 0 ? "positive" : "negative"}`}>
                {formatPercent(totals.relativeChange)}
              </td>
              <td className={`col-number ${totals.totalImpact >= 0 ? "positive" : "negative"}`}>
                {formatMillions(totals.totalImpact)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default PolicyBreakdownTable;
