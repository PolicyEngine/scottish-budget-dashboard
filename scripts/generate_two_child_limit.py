"""Generate Scotland two-child limit mitigation estimates.

This script calculates the cost and impact of mitigating the two-child limit
for Scottish families on Universal Credit.

The two-child limit restricts the UC child element to the first two children.
Scotland plans to introduce a top-up payment from April 2026 to compensate
affected families.

Uses local policyengine-uk repo for latest parameters.
"""

import sys
from pathlib import Path

# Use local policyengine-uk repo instead of installed version
LOCAL_PE_UK_PATH = Path(__file__).parent.parent.parent / "policyengine-uk"
if LOCAL_PE_UK_PATH.exists():
    sys.path.insert(0, str(LOCAL_PE_UK_PATH))
    print(f"Using local policyengine-uk from: {LOCAL_PE_UK_PATH}")

import numpy as np
import pandas as pd
from policyengine_uk import Microsimulation

# Years to calculate
YEARS = [2026, 2027, 2028, 2029, 2030]


def create_two_child_limit_reform():
    """Create a reform dict that enforces the two-child limit (baseline scenario).

    This sets the two-child limit to 2 for UC and Tax Credits.
    Current law has the limit removed (infinity) from April 2026.
    """
    return {
        "gov.dwp.universal_credit.elements.child.limit.child_count": {
            "2026-01-01.2030-12-31": 2
        },
        "gov.dwp.tax_credits.child_tax_credit.limit.child_count": {
            "2026-01-01.2030-12-31": 2
        },
    }


def calculate_scotland_two_child_limit(output_dir: Path = None) -> pd.DataFrame:
    """Calculate two-child limit mitigation costs for Scotland.

    Compares:
    - Baseline: Two-child limit in place (limit = 2)
    - Reform: Two-child limit removed (current law in PE UK)

    The difference represents the cost of the Scottish top-up payment.
    """
    script_dir = Path(__file__).parent

    if output_dir is None:
        output_dir = script_dir.parent / "public" / "data"

    # Create simulations
    # Reform (current law): Two-child limit removed
    sim_reform = Microsimulation()

    # Baseline: Two-child limit in place
    sim_baseline = Microsimulation(reform=create_two_child_limit_reform())

    results = []

    for year in YEARS:
        print(f"Processing {year}...")

        # Get Scotland mask at household level
        region = sim_reform.calculate("region", year, map_to="household").values
        scotland_mask = region == "SCOTLAND"

        # Get weights
        hh_weight = sim_reform.calculate("household_weight", year, map_to="household").values

        # Get UC entitlement under both scenarios
        uc_reform = sim_reform.calculate("universal_credit", year, map_to="household").values
        uc_baseline = sim_baseline.calculate("universal_credit", year, map_to="household").values

        # Calculate the difference (gain from removing limit)
        uc_gain = uc_reform - uc_baseline

        # Affected households are those with a gain (they benefit from limit removal)
        affected_mask = scotland_mask & (uc_gain > 0)

        # Total cost (sum of gains)
        total_cost = (uc_gain[affected_mask] * hh_weight[affected_mask]).sum()
        total_cost_millions = total_cost / 1e6

        # Count affected households (benefit units)
        affected_benefit_units = hh_weight[affected_mask].sum()

        # Count affected children
        # Get number of children per household
        benunit_children = sim_reform.calculate(
            "benunit_count_children", year, map_to="household"
        ).values

        # For affected households, count children beyond the first 2
        # This gives children who benefit from the limit removal
        affected_children_per_hh = np.maximum(benunit_children - 2, 0)

        # Sum up affected children weighted
        total_affected_children = (
            affected_children_per_hh[affected_mask] * hh_weight[affected_mask]
        ).sum()

        # Also get total children in affected households for comparison
        total_children_in_affected_hh = (
            benunit_children[affected_mask] * hh_weight[affected_mask]
        ).sum()

        # Get UC child element annual amount for reference
        try:
            child_element = sim_reform.tax_benefit_system.parameters.gov.dwp.universal_credit.elements.child.amounts.first
            child_element_annual = child_element(f"{year}-01-01") * 12
        except:
            child_element_annual = 0

        # SFC estimates for comparison
        sfc_data = {
            2026: {"children": 43000, "cost": 155},
            2027: {"children": 46000, "cost": 170},
            2028: {"children": 48000, "cost": 182},
            2029: {"children": 50000, "cost": 198},
            2030: {"children": 52000, "cost": 205},
        }

        results.append({
            "year": year,
            "pe_affected_children": round(total_affected_children),
            "pe_affected_benefit_units": round(affected_benefit_units),
            "pe_cost_millions": round(total_cost_millions, 1),
            "child_element_annual": round(child_element_annual, 2),
            "sfc_affected_children": sfc_data[year]["children"],
            "sfc_cost_millions": sfc_data[year]["cost"],
        })

        print(f"  Year {year}:")
        print(f"    PE: {round(total_affected_children):,} children, £{total_cost_millions:.1f}m cost")
        print(f"    SFC: {sfc_data[year]['children']:,} children, £{sfc_data[year]['cost']}m cost")

    df = pd.DataFrame(results)

    # Save to output
    output_path = output_dir / "scotland_two_child_limit.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"\nSaved to {output_path}")

    # Print summary
    print("\n=== Summary ===")
    r2026 = results[0]
    r2029 = results[3]
    print(f"2026-27: PE estimates {r2026['pe_affected_children']:,} children, £{r2026['pe_cost_millions']}m")
    print(f"         SFC estimates {r2026['sfc_affected_children']:,} children, £{r2026['sfc_cost_millions']}m")
    print(f"2029-30: PE estimates {r2029['pe_affected_children']:,} children, £{r2029['pe_cost_millions']}m")
    print(f"         SFC estimates {r2029['sfc_affected_children']:,} children, £{r2029['sfc_cost_millions']}m")

    return df


if __name__ == "__main__":
    calculate_scotland_two_child_limit()
