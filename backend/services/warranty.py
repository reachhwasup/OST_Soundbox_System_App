"""
Warranty periods.

A sale's warranty comes from the product (products.default_warranty_months) unless the request asks for
a specific number of days or an explicit end date. Months are calendar months, so 12 months from
2026-02-29 ends 2027-02-28.
"""
from calendar import monthrange
from datetime import datetime, timedelta
from typing import Optional, Tuple

DEFAULT_WARRANTY_MONTHS = 3


def add_months(moment: datetime, months: int) -> datetime:
    """Adds calendar months, clamping the day to the end of the target month."""
    month_index = moment.month - 1 + int(months)
    year = moment.year + month_index // 12
    month = month_index % 12 + 1
    day = min(moment.day, monthrange(year, month)[1])
    return moment.replace(year=year, month=month, day=day)


async def product_warranty_months(conn, product_id: Optional[int]) -> int:
    """The product's warranty in months, falling back to the system default."""
    if product_id:
        months = await conn.fetchval("SELECT default_warranty_months FROM products WHERE id = $1", product_id)
        if months:
            return int(months)
    return DEFAULT_WARRANTY_MONTHS


async def resolve_warranty(
    conn,
    *,
    product_id: Optional[int],
    start: datetime,
    warranty_days: Optional[int] = None,
    end_override: Optional[datetime] = None,
) -> Tuple[datetime, int]:
    """
    Warranty end date and its length in days.
    Order: explicit end date, then an explicit number of days, then the product's warranty months.
    """
    if end_override is not None:
        end = end_override
    elif warranty_days is not None:
        end = start + timedelta(days=int(warranty_days))
    else:
        end = add_months(start, await product_warranty_months(conn, product_id))
    return end, max((end.date() - start.date()).days, 0)
