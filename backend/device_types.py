"""
Product type helpers.

The `device_types` table is gone: a product now carries its own hardware details
(`products.device_model`, `products.supplier_id`) and the product name is the device type.
A device stores `devices.product_id`. API responses still expose `device_type`, `device_model`,
`supplier_id` and `supplier` so clients are unchanged.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

DEFAULT_DEVICE_TYPE = "Display Soundbox"
DEFAULT_DEVICE_MODEL = "Y6B"

# Join devices `d` to their product `dp` and the product's supplier `dps`.
# Note: on the production schema the serial number is devices.device_id (there is no device_sn column).
DEVICE_TYPE_JOIN_SQL = """
    LEFT JOIN products dp ON dp.id = d.product_id
    LEFT JOIN suppliers dps ON dps.id = dp.supplier_id
"""

# Columns that replace the old devices.device_type / device_model / supplier_id.
DEVICE_TYPE_COLUMNS_SQL = """
    d.product_id,
    COALESCE(dp.name, 'Display Soundbox') AS device_type,
    COALESCE(dp.device_model, dp.sku, 'Y6B') AS device_model,
    dp.supplier_id AS supplier_id,
    dps.name AS supplier,
    dp.purchase_price AS purchase_price
"""


# "Soundbox None LED Screen (4G only)" is a no-screen product: negations win over the screen words
NO_SCREEN_WORDS = ("none led", "no led", "non led", "non-led", "nled", "without screen", "no screen", "none screen")
SCREEN_WORDS = ("display", "lcd", "screen", "disp")
STANDARD_WORDS = ("standard", "std", "printed", "audio", "q3")


def type_kind(*texts: Optional[str]) -> Optional[str]:
    """Classify free text as a 'display' (has a screen) or 'standard' (no screen) soundbox, or None."""
    blob = " ".join(t for t in texts if t).lower()
    if not blob:
        return None
    if any(k in blob for k in NO_SCREEN_WORDS):
        return "standard"
    if any(k in blob for k in SCREEN_WORDS):
        return "display"
    if any(k in blob for k in STANDARD_WORDS):
        return "standard"
    return None


def has_screen(*texts: Optional[str]) -> bool:
    """True when the device type / model describes a soundbox with an LED screen."""
    return type_kind(*texts) == "display"


def _clean(value: Optional[str]) -> str:
    return (value or "").strip()


async def get_product_type(conn, product_id: Optional[int]):
    """Return (id, name, sku, device_model, supplier_id) for a product id, or None."""
    if not product_id:
        return None
    return await conn.fetchrow(
        "SELECT id, name, sku, device_model, supplier_id FROM products WHERE id = $1", product_id
    )


async def resolve_product_id(
    conn,
    device_type: Optional[str] = None,
    device_model: Optional[str] = None,
    supplier_id: Optional[int] = None,
    fallback_to_default: bool = True,
) -> Optional[int]:
    """
    Find the product that matches a device type name / model code / supplier.

    Matching order:
      1. exact product name, SKU or model code (a product of that supplier wins a tie)
      2. same kind (display / standard)
      3. the first active product (when fallback_to_default)

    Nothing is ever created here: products are created from Manage Product.
    """
    name = _clean(device_type)
    model = _clean(device_model)

    if name or model:
        match = await conn.fetchrow("""
            SELECT id FROM products
            WHERE is_active = TRUE
              AND (($1 <> '' AND (LOWER(name) = LOWER($1) OR LOWER(sku) = LOWER($1) OR LOWER(device_model) = LOWER($1)))
                   OR ($2 <> '' AND (LOWER(device_model) = LOWER($2) OR LOWER(sku) = LOWER($2) OR LOWER(name) = LOWER($2))))
            ORDER BY
              (supplier_id IS NOT DISTINCT FROM $3::int) DESC,
              ($2 <> '' AND LOWER(device_model) = LOWER($2)) DESC,
              ($1 <> '' AND LOWER(name) = LOWER($1)) DESC,
              is_order ASC NULLS LAST, id ASC
            LIMIT 1
        """, name, model, supplier_id)
        if match:
            return match["id"]

    products = await conn.fetch("""
        SELECT id, name, sku, device_model, supplier_id FROM products
        WHERE is_active = TRUE ORDER BY is_order ASC NULLS LAST, id ASC
    """)
    kind = type_kind(name, model)
    if kind:
        same_kind = [p for p in products if type_kind(p["name"], p["sku"], p["device_model"]) == kind]
        for p in same_kind:
            if supplier_id is not None and p["supplier_id"] == supplier_id:
                return p["id"]
        if same_kind:
            return same_kind[0]["id"]

    if not fallback_to_default:
        return None
    if supplier_id is not None:
        for p in products:
            if p["supplier_id"] == supplier_id:
                return p["id"]
    return products[0]["id"] if products else None


async def resolve_product_id_for_serial(conn, serial_number: Optional[str], product_id: Optional[int] = None) -> Optional[int]:
    """
    Product for a serial: the product on its inventory_serials row, else the product already linked to
    the device, else the first active product.
    """
    if serial_number:
        pid = await conn.fetchval(
            "SELECT product_id FROM inventory_serials WHERE serial_number = $1 AND product_id IS NOT NULL",
            serial_number,
        )
        if pid:
            return pid

    if product_id and await conn.fetchval("SELECT 1 FROM products WHERE id = $1", product_id):
        return product_id

    return await conn.fetchval(
        "SELECT id FROM products WHERE is_active = TRUE ORDER BY is_order ASC NULLS LAST, id ASC LIMIT 1"
    )
