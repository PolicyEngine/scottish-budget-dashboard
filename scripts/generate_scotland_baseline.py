"""Generate Scotland baseline projections for disposable income and poverty rates.

This script creates projections for Scotland under current law (baseline),
which can be compared with official Scottish Government statistics.

METHODOLOGY NOTES:
- Uses RELATIVE poverty (60% of UK median income) to match Scottish Government
  methodology. This differs from absolute poverty (2010/11 threshold + CPI).
- Uses simple region filtering (SCOTLAND) from FRS data rather than
  constituency-level reweighting to avoid weight mapping issues.
- Working-age and pensioner poverty match official stats well using relative
  poverty measures.

CHILD POVERTY DISCREPANCY (~8-9pp higher than official):
PolicyEngine shows ~28% BHC / ~32% AHC child relative poverty vs ~20% BHC / ~23% AHC official.
This gap is primarily due to UC take-up assumptions:
- PE uses 55% UC take-up
- UKMOD (used by Scottish Gov) uses 87% UC take-up

Scottish Child Payment (SCP) IS modeled and included in HBAI income for poverty calculations.

Child ABSOLUTE poverty (24.7%) is included for comparison as it matches
official figures better, though this is partially coincidental.
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

# Years to project (include 2023 for comparison with official 2021-24 stats)
YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]


def calculate_scotland_baseline(output_dir: Path = None) -> pd.DataFrame:
    """Calculate baseline projections for Scotland.

    Uses RELATIVE poverty (60% of UK median income) to match Scottish Government
    methodology. This is different from absolute poverty which uses a fixed
    2010/11 threshold uprated by CPI.

    Uses simple region filtering (SCOTLAND) from FRS data rather than
    constituency-level reweighting to avoid weight mapping complexities.

    Returns DataFrame with poverty rates, income metrics, and population counts.
    """
    script_dir = Path(__file__).parent

    if output_dir is None:
        output_dir = script_dir.parent / "public" / "data"

    # Create baseline simulation
    sim = Microsimulation()

    results = []

    for year in YEARS:
        print(f"Processing {year}...")

        # Simple region filter for Scotland
        region = sim.calculate("region", year, map_to="person").values
        scotland_mask = region == "SCOTLAND"

        age = sim.calculate("age", year, map_to="person").values
        weight = sim.calculate("person_weight", year, map_to="person").values

        # Get RELATIVE poverty (matches Scottish Gov methodology: 60% of UK median)
        in_pov_rel_bhc = sim.calculate(
            "in_relative_poverty_bhc", year, map_to="person"
        ).values
        in_pov_rel_ahc = sim.calculate(
            "in_relative_poverty_ahc", year, map_to="person"
        ).values

        # Get ABSOLUTE poverty (2010/11 threshold + CPI)
        # Note: in_poverty_bhc/ahc in PolicyEngine IS absolute poverty
        in_pov_abs_bhc = sim.calculate(
            "in_poverty_bhc", year, map_to="person"
        ).values
        in_pov_abs_ahc = sim.calculate(
            "in_poverty_ahc", year, map_to="person"
        ).values

        # Age groups
        is_child = age < 18
        is_working_age = (age >= 16) & (age < 65)
        is_pensioner = age >= 65

        # Scottish weights
        scot_weight = weight[scotland_mask]
        total_pop = scot_weight.sum()

        # Overall relative poverty
        pov_bhc = (
            weight[scotland_mask & in_pov_rel_bhc].sum() / total_pop
        ) * 100
        pov_ahc = (
            weight[scotland_mask & in_pov_rel_ahc].sum() / total_pop
        ) * 100

        # Overall absolute poverty
        abs_pov_bhc = (
            weight[scotland_mask & in_pov_abs_bhc].sum() / total_pop
        ) * 100
        abs_pov_ahc = (
            weight[scotland_mask & in_pov_abs_ahc].sum() / total_pop
        ) * 100

        # Child poverty (relative)
        child_mask = scotland_mask & is_child
        total_children = weight[child_mask].sum()
        child_pov_bhc = (
            weight[child_mask & in_pov_rel_bhc].sum() / total_children
        ) * 100
        child_pov_ahc = (
            weight[child_mask & in_pov_rel_ahc].sum() / total_children
        ) * 100

        # Child absolute poverty (for comparison - matches official better)
        child_abs_pov = (
            weight[child_mask & in_pov_abs_bhc].sum() / total_children
        ) * 100

        # Working age poverty
        wa_mask = scotland_mask & is_working_age
        total_wa = weight[wa_mask].sum()
        wa_pov_bhc = (weight[wa_mask & in_pov_rel_bhc].sum() / total_wa) * 100
        wa_pov_ahc = (weight[wa_mask & in_pov_rel_ahc].sum() / total_wa) * 100

        # Pensioner poverty
        pens_mask = scotland_mask & is_pensioner
        total_pens = weight[pens_mask].sum()
        pens_pov_bhc = (
            weight[pens_mask & in_pov_rel_bhc].sum() / total_pens
        ) * 100
        pens_pov_ahc = (
            weight[pens_mask & in_pov_rel_ahc].sum() / total_pens
        ) * 100

        # Household data
        hh_region = sim.calculate("region", year, map_to="household").values
        hh_scotland = hh_region == "SCOTLAND"
        hh_income = sim.calculate(
            "household_net_income", year, map_to="household"
        ).values
        hh_weight = sim.calculate(
            "household_weight", year, map_to="household"
        ).values

        total_hh = hh_weight[hh_scotland].sum()
        mean_income = (
            hh_income[hh_scotland] * hh_weight[hh_scotland]
        ).sum() / total_hh

        # Median income
        scot_incomes = hh_income[hh_scotland]
        scot_hh_weights = hh_weight[hh_scotland]
        sorted_idx = np.argsort(scot_incomes)
        sorted_inc = scot_incomes[sorted_idx]
        sorted_w = scot_hh_weights[sorted_idx]
        cum_w = np.cumsum(sorted_w)
        med_idx = np.searchsorted(cum_w, total_hh / 2)
        median_income = sorted_inc[min(med_idx, len(sorted_inc) - 1)]

        # Taxpayer stats
        total_income = sim.calculate(
            "total_income", year, map_to="person"
        ).values
        is_taxpayer = (total_income > 12570) & scotland_mask
        taxpayer_inc = total_income[is_taxpayer]
        taxpayer_w = weight[is_taxpayer]
        total_taxpayers = taxpayer_w.sum()

        sorted_idx = np.argsort(taxpayer_inc)
        sorted_ti = taxpayer_inc[sorted_idx]
        sorted_tw = taxpayer_w[sorted_idx]
        cum_tw = np.cumsum(sorted_tw)

        p25_idx = np.searchsorted(cum_tw, total_taxpayers * 0.25)
        p50_idx = np.searchsorted(cum_tw, total_taxpayers * 0.50)
        p75_idx = np.searchsorted(cum_tw, total_taxpayers * 0.75)

        taxpayer_p25 = sorted_ti[min(p25_idx, len(sorted_ti) - 1)]
        taxpayer_median = sorted_ti[min(p50_idx, len(sorted_ti) - 1)]
        taxpayer_p75 = sorted_ti[min(p75_idx, len(sorted_ti) - 1)]

        # Income per head and total
        total_hh_income = (
            hh_income[hh_scotland] * hh_weight[hh_scotland]
        ).sum()
        mean_income_per_head = total_hh_income / total_pop
        total_income_bn = total_hh_income / 1e9

        # Calculate median income per head (equivalised)
        # Use household income divided by household size for per-person income
        hh_count_people = sim.calculate(
            "household_count_people", year, map_to="household"
        ).values
        income_per_head = hh_income / np.maximum(hh_count_people, 1)

        # For median, we weight by number of people in each household
        scot_inc_per_head = income_per_head[hh_scotland]
        scot_people_weights = hh_weight[hh_scotland] * hh_count_people[hh_scotland]
        sorted_idx = np.argsort(scot_inc_per_head)
        sorted_inc_ph = scot_inc_per_head[sorted_idx]
        sorted_pw = scot_people_weights[sorted_idx]
        cum_pw = np.cumsum(sorted_pw)
        total_people_w = cum_pw[-1]
        med_ph_idx = np.searchsorted(cum_pw, total_people_w / 2)
        median_income_per_head = sorted_inc_ph[min(med_ph_idx, len(sorted_inc_ph) - 1)]

        results.append(
            {
                "year": year,
                "mean_disposable_income": mean_income,
                "median_disposable_income": median_income,
                "median_taxpayer_income": taxpayer_median,
                "taxpayer_income_p25": taxpayer_p25,
                "taxpayer_income_p75": taxpayer_p75,
                "mean_income_per_head": mean_income_per_head,
                "median_income_per_head": median_income_per_head,
                "total_disposable_income_bn": total_income_bn,
                "poverty_rate_bhc": pov_bhc,
                "poverty_rate_ahc": pov_ahc,
                "absolute_poverty_bhc": abs_pov_bhc,
                "absolute_poverty_ahc": abs_pov_ahc,
                "child_poverty_bhc": child_pov_bhc,
                "child_poverty_ahc": child_pov_ahc,
                "child_absolute_poverty": child_abs_pov,
                "working_age_poverty_bhc": wa_pov_bhc,
                "working_age_poverty_ahc": wa_pov_ahc,
                "pensioner_poverty_bhc": pens_pov_bhc,
                "pensioner_poverty_ahc": pens_pov_ahc,
                "total_households": total_hh,
                "total_population": total_pop,
                "total_children": total_children,
                "total_working_age": total_wa,
                "total_pensioners": total_pens,
                "total_taxpayers": total_taxpayers,
            }
        )

        print(
            f"  Year {year}: "
            f"Pensioner BHC {pens_pov_bhc:.1f}%, AHC {pens_pov_ahc:.1f}%"
        )

    df = pd.DataFrame(results)

    # Save to output
    output_path = output_dir / "scotland_baseline.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"\nSaved Scotland baseline to {output_path}")

    # Print summary comparison
    print("\n=== 2023 Summary (compare with official 2021-24) ===")
    r = results[0]
    print(f"Overall poverty BHC: {r['poverty_rate_bhc']:.1f}% (Official: 18%)")
    print(f"Overall poverty AHC: {r['poverty_rate_ahc']:.1f}% (Official: 20%)")
    print(f"Child poverty BHC (relative): {r['child_poverty_bhc']:.1f}% (Official: 20%)")
    print(f"Child poverty AHC (relative): {r['child_poverty_ahc']:.1f}% (Official: 23%)")
    print(f"Child poverty (absolute): {r['child_absolute_poverty']:.1f}% (matches official better)")
    print(
        f"Working-age poverty BHC: {r['working_age_poverty_bhc']:.1f}% "
        "(Official: 14%)"
    )
    print(
        f"Working-age poverty AHC: {r['working_age_poverty_ahc']:.1f}% "
        "(Official: 17%)"
    )
    print(
        f"Pensioner poverty BHC: {r['pensioner_poverty_bhc']:.1f}% "
        "(Official: 13%)"
    )
    print(
        f"Pensioner poverty AHC: {r['pensioner_poverty_ahc']:.1f}% "
        "(Official: 15%)"
    )
    print(f"\nMean income per head: £{r['mean_income_per_head']:,.0f} (Official 2023: £22,908)")
    print(f"Median income per head: £{r['median_income_per_head']:,.0f}")
    print(f"\nPopulation: {r['total_population']:,.0f}")
    print(f"Households: {r['total_households']:,.0f}")
    print("\nNote: Child relative poverty is higher due to UC take-up assumptions")

    return df


if __name__ == "__main__":
    calculate_scotland_baseline()
