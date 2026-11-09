// Shipping & variant calculation utilities

/** Extract variant price from product variants JSON by matching selected_size label */
export function getVariantPrice(variants: any, selectedSize: string | null): number | null {
  if (!variants || !selectedSize) return null;
  const groups = Array.isArray(variants) ? variants : [];
  for (const group of groups) {
    if (!group.options) continue;
    for (const opt of group.options) {
      const label = `${group.name}: ${opt.name}`;
      if (label === selectedSize && opt.price != null) {
        const p = Number(opt.price);
        if (p > 0) return p;
      }
    }
  }
  return null;
}

/** Extract variant weight from product variants JSON by matching selected_size label */
export function getVariantWeight(variants: any, selectedSize: string | null): number | null {
  if (!variants || !selectedSize) return null;
  
  // variants is an array of groups: [{ name: "Color", options: [{ name: "Red", weight: "500g", ... }] }]
  const groups = Array.isArray(variants) ? variants : [];
  for (const group of groups) {
    if (!group.options) continue;
    for (const opt of group.options) {
      const label = `${group.name}: ${opt.name}`;
      if (label === selectedSize && opt.weight) {
        const w = parseFloat(opt.weight);
        if (w > 0) return w;
      }
    }
  }
  return null;
}

interface CargoCalcProduct {
  shipping_charge_type?: string | null;
  shipping_rate_override?: number | null;
  estimated_weight_gm?: number | null;
  category_id?: string | null;
  variants?: any;
}

interface CategoryShippingRates {
  shipping_rate_per_kg: number;
  shipping_rate_per_piece: number;
}

/** Calculate cargo charge for a single cart item */
export function calcItemCargoCharge(
  product: CargoCalcProduct | null | undefined,
  quantity: number,
  selectedSize: string | null,
  categoryShippingMap: Record<string, CategoryShippingRates>
): number {
  if (!product) return 0;
  const chargeType = product.shipping_charge_type || "per_kg";
  const catShipping = categoryShippingMap[product.category_id || ""];
  const rate = product.shipping_rate_override ?? (chargeType === "per_piece"
    ? (catShipping?.shipping_rate_per_piece || 0)
    : (catShipping?.shipping_rate_per_kg || 0));
  if (rate <= 0) return 0;
  if (chargeType === "per_piece") return rate * quantity;
  
  // For per_kg: try variant weight first, then product weight
  const variantWeight = getVariantWeight(product.variants, selectedSize);
  const weightGm = variantWeight ?? (product.estimated_weight_gm || 0);
  return rate * (weightGm / 1000) * quantity;
}
