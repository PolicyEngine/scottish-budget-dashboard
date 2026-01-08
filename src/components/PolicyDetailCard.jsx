import "./PolicyDetailCard.css";

const getCapabilityClass = (capability) => {
  if (capability.includes("Strong")) return "capability-strong";
  if (capability.includes("Moderate") || capability.includes("Partial"))
    return "capability-moderate";
  if (capability.includes("NOT")) return "capability-not-modeled";
  return "capability-low";
};

const getStatusClass = (status) => {
  if (status === "ready") return "status-ready";
  if (status === "needs_verification" || status === "needs_update")
    return "status-verify";
  if (
    status === "needs_implementation" ||
    status === "needs_development" ||
    status === "blocked_by_scp"
  )
    return "status-blocked";
  return "status-pending";
};

const getPeStatusClass = (peStatus) => {
  if (peStatus.includes("FULLY MODELED")) return "pe-status-full";
  if (peStatus.includes("PARTIAL") || peStatus.includes("INPUT-BASED"))
    return "pe-status-partial";
  if (peStatus.includes("NOT")) return "pe-status-none";
  return "pe-status-partial";
};

const getStatusLabel = (status) => {
  const labels = {
    ready: "Ready to Model",
    needs_verification: "Needs Verification",
    needs_update: "Needs Update",
    needs_implementation: "Needs Implementation",
    needs_development: "Needs Development",
    blocked_by_scp: "Blocked (needs SCP)",
  };
  return labels[status] || status;
};

function PolicyDetailCard({ policy }) {
  return (
    <div className={`modelling-card priority-${policy.priority}`}>
      <div className="modelling-header">
        <div className="priority-number">P{policy.priority}</div>
        <div className="modelling-title">
          <h4>{policy.name}</h4>
          <div className="modelling-badges">
            <span className="probability-badge">{policy.probability}</span>
            <span
              className={`capability-badge ${getCapabilityClass(policy.policyEngineCapability)}`}
            >
              {policy.policyEngineCapability}
            </span>
            <span
              className={`status-badge ${getStatusClass(policy.status)}`}
            >
              {getStatusLabel(policy.status)}
            </span>
          </div>
        </div>
      </div>

      {policy.peStatus && (
        <div className={`pe-status-bar ${getPeStatusClass(policy.peStatus)}`}>
          <span className="pe-status-label">PolicyEngine Status:</span>
          <span className="pe-status-value">{policy.peStatus}</span>
          {policy.peLocation && (
            <span className="pe-location">{policy.peLocation}</span>
          )}
        </div>
      )}

      <p className="modelling-description">{policy.explanation}</p>

      <div className="modelling-details">
        <div className="modelling-section">
          <strong>What to Model:</strong>
          <p>{policy.whatToModel}</p>
        </div>

        {policy.scenarios && policy.scenarios.length > 0 && (
          <div className="modelling-section">
            <strong>Scenarios:</strong>
            <ul>
              {policy.scenarios.map((scenario, j) => (
                <li key={j}>{scenario}</li>
              ))}
            </ul>
          </div>
        )}

        {policy.keyMetrics && policy.keyMetrics.length > 0 && (
          <div className="modelling-section">
            <strong>Key Metrics:</strong>
            <ul>
              {policy.keyMetrics.map((metric, j) => (
                <li key={j}>{metric}</li>
              ))}
            </ul>
          </div>
        )}

        {policy.implementationSteps && policy.implementationSteps.length > 0 && (
          <div className="modelling-section">
            <strong>Implementation Steps:</strong>
            <ol>
              {policy.implementationSteps.map((step, j) => (
                <li key={j}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {policy.howToModel && (
          <div className="modelling-section how-to-model">
            <strong>How to Model in PolicyEngine:</strong>
            <p>{policy.howToModel}</p>
          </div>
        )}

        {policy.outreachTargets && policy.outreachTargets.length > 0 && (
          <div className="modelling-section outreach-targets">
            <strong>Outreach Targets:</strong>
            <div className="target-tags">
              {policy.outreachTargets.map((target, j) => (
                <span key={j} className="target-tag">
                  {target}
                </span>
              ))}
            </div>
          </div>
        )}

        {policy.officialSource && (
          <div className="modelling-section official-source">
            <strong>Official Source:</strong>
            <a
              href={policy.officialSource}
              target="_blank"
              rel="noopener noreferrer"
            >
              {policy.officialSource}
            </a>
          </div>
        )}

        {policy.evidenceSources && policy.evidenceSources.length > 0 && (
          <div className="modelling-section evidence-sources">
            <strong>Evidence Supporting This Policy Change:</strong>
            <div className="evidence-list">
              {policy.evidenceSources.map((source, j) => (
                <div key={j} className="evidence-item">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.title}
                  </a>
                  {source.quote && (
                    <span className="evidence-quote">"{source.quote}"</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PolicyDetailCard;
