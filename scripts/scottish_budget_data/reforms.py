"""Reform definitions for Scottish Budget 2026-27.

This module contains policy reforms for the Scottish Budget (13 January 2026),
implemented as Reform objects that can be processed by the data pipeline.

Reforms are organised into:
- Tax measures (Scottish Income Tax threshold freeze)
- Spending measures (future: Scottish Child Payment, etc.)

policyengine-uk includes Scottish Income Tax parameters with 6 bands:
- Starter (19%), Basic (20%), Intermediate (21%) - thresholds uprated by CPI
- Higher (42%), Advanced (45%), Top (48%) - thresholds FROZEN by Scottish Gov

PolicyEngine UK by default UPRATES all thresholds by CPI inflation.
The actual Scottish Government policy FREEZES Higher/Advanced/Top thresholds.

This dashboard compares:
- Baseline: PolicyEngine default (thresholds uprated by CPI) - counterfactual
- Reform: Thresholds frozen at 2024 levels (actual Scottish Gov policy)
"""

from typing import Optional

import numpy as np

from scottish_budget_data.models import Reform

# Default years for parameter changes (Scottish fiscal year)
DEFAULT_YEARS = [2026, 2027, 2028, 2029, 2030]

# Frozen threshold values (2024 levels - amounts ABOVE personal allowance)
# These are the values the Scottish Government has frozen
HIGHER_THRESHOLD_FROZEN = 31_092  # Higher rate (42%) starts here above PA
ADVANCED_THRESHOLD_FROZEN = 62_430  # Advanced rate (45%) starts here above PA
TOP_THRESHOLD_FROZEN = 125_140  # Top rate (48%) starts here (total income)


# =============================================================================
# SIMULATION MODIFIERS FOR SCOTTISH THRESHOLD FREEZE
# =============================================================================

def freeze_scottish_thresholds(simulation, year: int):
    """Freeze Higher, Advanced, and Top rate thresholds at 2024 levels.

    This modifier freezes the Scottish income tax thresholds that the
    Scottish Government has kept frozen since 2023-24.

    Args:
        simulation: PolicyEngine Simulation object
        year: Tax year (e.g., 2026)
    """
    from policyengine_core.periods import period as make_period

    params = simulation.tax_benefit_system.parameters
    scottish_rates = params.gov.hmrc.income_tax.rates.scotland.rates

    # Create a proper period object for the year
    year_period = make_period(f"{year}-01-01")

    # Freeze Higher rate threshold (bracket 3) at 2024 level
    scottish_rates.brackets[3].threshold.update(
        period=year_period,
        value=HIGHER_THRESHOLD_FROZEN,
    )

    # Freeze Advanced rate threshold (bracket 4) at 2024 level
    scottish_rates.brackets[4].threshold.update(
        period=year_period,
        value=ADVANCED_THRESHOLD_FROZEN,
    )

    # Freeze Top rate threshold (bracket 5) at 2024 level
    scottish_rates.brackets[5].threshold.update(
        period=year_period,
        value=TOP_THRESHOLD_FROZEN,
    )


def freeze_scottish_thresholds_all_years(simulation):
    """Apply threshold freeze for all years 2026-2030.

    This is the simulation modifier function that gets passed to Reform.
    It freezes thresholds for all years in the forecast period.
    """
    for year in DEFAULT_YEARS:
        freeze_scottish_thresholds(simulation, year)


# =============================================================================
# TAX MEASURES (revenue raisers)
# =============================================================================


def _create_scottish_threshold_freeze() -> Reform:
    """Create the Scottish income tax threshold freeze reform.

    The Scottish Government has frozen Higher, Advanced, and Top rate
    thresholds since 2023-24, while Starter, Basic, and Intermediate
    thresholds are uprated by CPI.

    This creates "fiscal drag" where wage inflation pushes more income
    into higher tax bands.

    Comparison:
    - Baseline: PolicyEngine default (all thresholds CPI-uprated) - counterfactual
    - Reform: Higher/Advanced/Top frozen at 2024 levels (actual policy)

    Scottish Conservative claim: Saves taxpayers up to £718/year if uprated.
    This reform tests that claim.

    Official source: https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/
    Evidence: https://www.gov.scot/publications/scottish-budget-2025-26-finance-secretarys-statement-4-december-2024/
    """
    return Reform(
        id="scottish_threshold_freeze",
        name="Scottish threshold freeze",
        description=(
            "Freezes Scottish Higher (42%), Advanced (45%), and Top (48%) "
            "rate thresholds at £43,662, £75,000, and £125,140 respectively "
            "through 2026-27. Meanwhile, Starter/Basic/Intermediate thresholds "
            "rise by 3.5%. This 'fiscal drag' means wage inflation pushes more "
            "income into higher bands. IFS estimates this raises £223m in 2026-27. "
            "Compares frozen thresholds (actual policy) against CPI-uprated "
            "thresholds (counterfactual)."
        ),
        # Baseline: Use PolicyEngine default (CPI-uprated thresholds)
        # This is the counterfactual - what if thresholds weren't frozen
        baseline_parameter_changes=None,
        # Reform: Freeze thresholds at 2024 levels (actual Scottish Gov policy)
        simulation_modifier=freeze_scottish_thresholds_all_years,
        parameter_changes=None,
    )


# =============================================================================
# SPENDING MEASURES (costs to treasury)
# =============================================================================


def _years_dict(value, years: list[int] = None) -> dict[str, any]:
    """Create a {year: value} dict for parameter changes."""
    years = years or DEFAULT_YEARS
    return {str(y): value for y in years}


def _create_two_child_limit_removal() -> Reform:
    """Create the two-child limit removal reform.

    The UK Government announced on 26 November 2025 they will end the two-child
    limit from April 2026. This affects Universal Credit and Tax Credits,
    allowing families to claim the child element for all children.

    Since policyengine-uk v2.63.0+, the two-child limit removal is in current law
    (child_count = infinity from April 2026). This reform compares against
    the pre-budget baseline where the limit was 2.

    Impact: 450,000 children lifted out of poverty - biggest reduction this century.
    Average gain per affected family: ~£5,310/year

    Returns:
        Reform object for the two-child limit removal.
    """
    return Reform(
        id="two_child_limit_removal",
        name="Two Child Limit removal",
        description=(
            "Removes the two-child limit on Universal Credit and Tax Credits from "
            "April 2026. The limit restricted child-related payments to the first "
            "two children in a family. Compares UK Government policy (limit removed) "
            "against previous baseline (limit of 2). Lifts 450,000 children out of "
            "poverty, with average gains of £5,310/year per affected family."
        ),
        # Baseline: Pre-budget (limit of 2)
        baseline_parameter_changes={
            "gov.dwp.tax_credits.child_tax_credit.limit.child_count": (
                _years_dict(2)
            ),
            "gov.dwp.universal_credit.elements.child.limit.child_count": (
                _years_dict(2)
            ),
        },
        # Reform: Use current law (pe-uk with repeal/infinity)
        parameter_changes={},
    )


def _create_scottish_child_payment_increase() -> Reform:
    """Create the Scottish Child Payment increase reform.

    Models a £5/week increase to the Scottish Child Payment from £27.15 to £32.15.
    The SCP is paid to eligible families in Scotland with children under 16.

    Current SCP: £27.15/week (£1,411.80/year)
    Reform SCP: £32.15/week (£1,671.80/year)
    Increase: £5/week = £260/year per eligible child

    322,000 children are currently supported with 94% take-up rate.
    The SCP keeps approximately 40,000 children out of poverty.

    Note: This uses the scottish_child_payment parameter in PolicyEngine UK.
    """
    return Reform(
        id="scottish_child_payment_increase",
        name="Scottish Child Payment increase",
        description=(
            "Increases Scottish Child Payment by £5/week from £27.15 to £32.15. "
            "The SCP supports 322,000 children in Scotland with a 94% take-up rate, "
            "keeping 40,000 children out of poverty. This £260/year increase per "
            "child would further reduce child poverty in Scotland."
        ),
        # Baseline: Current SCP rate (£27.15/week = £1,411.80/year)
        baseline_parameter_changes={},
        # Reform: Increased SCP rate (£32.15/week = £1,671.80/year)
        parameter_changes={
            "gov.social_security_scotland.scottish_child_payment.amount": _years_dict(32.15),
        },
    )


# =============================================================================
# REFORM COLLECTIONS
# =============================================================================

# Cache for lazy-loaded reforms
_SCOTTISH_BUDGET_2026_REFORMS_CACHE: list[Reform] | None = None
_REFORM_LOOKUP_CACHE: dict[str, Reform] | None = None


def _get_scottish_budget_2026_reforms() -> list[Reform]:
    """Get the Scottish Budget 2026-27 reforms (lazy-loaded)."""
    global _SCOTTISH_BUDGET_2026_REFORMS_CACHE
    if _SCOTTISH_BUDGET_2026_REFORMS_CACHE is None:
        _SCOTTISH_BUDGET_2026_REFORMS_CACHE = [
            _create_scottish_threshold_freeze(),
            _create_two_child_limit_removal(),
            # Scottish Child Payment not yet in PolicyEngine UK
            # _create_scottish_child_payment_increase(),
        ]
    return _SCOTTISH_BUDGET_2026_REFORMS_CACHE


def _get_reform_lookup() -> dict[str, Reform]:
    """Get the reform lookup dictionary (lazy-loaded)."""
    global _REFORM_LOOKUP_CACHE
    if _REFORM_LOOKUP_CACHE is None:
        _REFORM_LOOKUP_CACHE = {
            r.id: r for r in _get_scottish_budget_2026_reforms()
        }
    return _REFORM_LOOKUP_CACHE


# Public getter functions
def get_scottish_budget_2026_reforms() -> list[Reform]:
    """Get the Scottish Budget 2026-27 reforms.

    Returns a list of Reform objects for policies in the January 2026
    Scottish Budget. Lazy-loaded to avoid import-time initialization.
    """
    return _get_scottish_budget_2026_reforms()


def get_reform(reform_id: str) -> Optional[Reform]:
    """Get a reform by its ID.

    Args:
        reform_id: The unique identifier of the reform.

    Returns:
        The Reform object, or None if not found.
    """
    return _get_reform_lookup().get(reform_id)


def list_reform_ids() -> list[str]:
    """Get a list of all available reform IDs."""
    return list(_get_reform_lookup().keys())
