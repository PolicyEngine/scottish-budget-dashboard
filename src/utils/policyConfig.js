/**
 * Shared policy configuration for colors and labels across all charts.
 *
 * Color scheme for Scottish Budget 2026-27:
 * - Teal/green spectrum: policies that are GOOD for households (costs to treasury)
 * - Amber/orange spectrum: policies that are BAD for households (revenue raisers)
 * - Blue spectrum: Scotland-specific policies
 */

// Policy colors by display name (used in population impact charts)
export const POLICY_COLORS = {
  // REVENUE raisers (bad for households - amber/orange spectrum)
  "Scottish threshold freeze": "#78350F", // Amber 900 - raises revenue via fiscal drag

  // Spending policies (costs to treasury - teal spectrum)
  "Two Child Limit removal": "#14B8A6", // Teal 500
};

// Policy colors by API key (used in lifecycle calculator and personal impact)
export const POLICY_COLORS_BY_KEY = {
  // REVENUE raisers (bad for households)
  scottish_threshold_freeze: "#78350F", // Amber 900
  impact_scottish_threshold_freeze: "#78350F",

  // Spending policies (costs to treasury)
  two_child_limit_removal: "#14B8A6", // Teal 500
};

// Order: revenue raisers first (positive for gov), then costs (negative for gov)
export const ALL_POLICY_NAMES = [
  // Revenue raisers (positive for gov)
  "Scottish threshold freeze",
  // Costs to treasury (negative for gov)
  "Two Child Limit removal",
];

// Lifecycle calculator reform configuration
// Note: In lifecycle view, we show impact FROM HOUSEHOLD PERSPECTIVE
// (positive = good for household, negative = bad)
export const LIFECYCLE_REFORMS = [
  {
    key: "impact_scottish_threshold_freeze",
    label: "Scottish threshold freeze",
    color: POLICY_COLORS_BY_KEY.impact_scottish_threshold_freeze,
  },
  // Future policies will be added here
];

// Personal impact policy order and colors
export const PERSONAL_IMPACT_POLICY_ORDER = [
  "scottish_threshold_freeze",
  // Future policies
];

// Helper to get color by policy key
export function getPolicyColor(key) {
  return POLICY_COLORS_BY_KEY[key] || POLICY_COLORS[key] || "#9CA3AF";
}
