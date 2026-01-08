"""Scottish Budget 2026-27 data generation package.

This package provides tools for generating Scottish Budget policy impact data
using PolicyEngine UK microsimulation. Modelled after the UK Autumn Budget
dashboard but focused on Scottish-specific policies.

Key modules:
- reforms: Scottish Budget policy reform definitions
- models: Pydantic data models for reforms and configuration
- calculators: Metric calculation functions (shared with UK)
- pipeline: Main data generation pipeline

Usage:
    from scottish_budget_data import get_scottish_budget_2026_reforms
    from scottish_budget_data import Reform, DataConfig
    from scottish_budget_data import generate_all_data
"""

from scottish_budget_data.models import DataConfig, Reform, ReformResult
from scottish_budget_data.reforms import (
    get_scottish_budget_2026_reforms,
    get_reform,
    list_reform_ids,
)
from scottish_budget_data.pipeline import (
    DataPipeline,
    generate_all_data,
)

__all__ = [
    "Reform",
    "ReformResult",
    "DataConfig",
    "get_scottish_budget_2026_reforms",
    "get_reform",
    "list_reform_ids",
    "DataPipeline",
    "generate_all_data",
]
