import { useState, useEffect, useRef } from "react";
import "./ConstituencyMetrics.css";

// Animated number component for smooth transitions
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const formattedValue = displayValue.toFixed(decimals);
  return (
    <span>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

function ConstituencyMetrics({
  constituencyName,
  averageGain,
  relativeChange,
  householdCount,
  nationalAverageGain,
}) {
  // Calculate absolute difference from national average
  const differenceFromNational = nationalAverageGain
    ? averageGain - nationalAverageGain
    : null;
  const isAboveAverage = differenceFromNational !== null && differenceFromNational >= 0;

  return (
    <div className="constituency-metrics">
      <div className="constituency-metrics-header">
        <h2>{constituencyName}</h2>
      </div>

      <div className="metrics-cards">
        <div className="metric-card">
          <div className="metric-label">Average household impact</div>
          <div className={`metric-value ${averageGain >= 0 ? "positive" : "negative"}`}>
            <AnimatedNumber
              value={Math.abs(averageGain)}
              prefix={averageGain >= 0 ? "+£" : "-£"}
              decimals={0}
            />
          </div>
          <div className="metric-sublabel">per year</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Relative income change</div>
          <div className={`metric-value ${relativeChange >= 0 ? "positive" : "negative"}`}>
            <AnimatedNumber
              value={Math.abs(relativeChange)}
              prefix={relativeChange >= 0 ? "+" : "-"}
              suffix="%"
              decimals={2}
            />
          </div>
          <div className="metric-sublabel">of household income</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Households in area</div>
          <div className="metric-value neutral">
            <AnimatedNumber
              value={householdCount}
              decimals={0}
            />
          </div>
          <div className="metric-sublabel">total households</div>
        </div>

        {differenceFromNational !== null && (
          <div className="metric-card">
            <div className="metric-label">vs national average</div>
            <div className={`metric-value ${isAboveAverage ? "positive" : "negative"}`}>
              <AnimatedNumber
                value={Math.abs(differenceFromNational)}
                prefix="£"
                decimals={0}
              />
            </div>
            <div className="metric-sublabel">
              {isAboveAverage ? "above" : "below"} average
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConstituencyMetrics;
