/**
 * Resolves the catalog-matching content_id for a cart item.
 *
 * The Meta catalog XML feed uses:
 *   - Non-variant products: `product.id` (UUID)
 *   - Variant products: `${product.id}_${variant_option.id}`
 *
 * Cart items store the variant as `selected_size` = "GroupName: OptionName".
 * This helper finds the matching option ID from the product's variants JSON.
 */

interface VariantOption {
  id: string;
  name: string;
  [key: string]: any;
}

interface VariantGroup {
  id: string;
  name: string;
  options: VariantOption[];
}

/**
 * Get the catalog content_id for a product + selected variant.
 * Returns `productId_optionId` for variants, or just `productId` for non-variant items.
 */
export function getCatalogContentId(
  productId: string,
  variants: any | null | undefined,
  selectedSize: string | null | undefined
): string {
  if (!selectedSize || !variants || !Array.isArray(variants)) {
    return productId;
  }

  // selected_size format: "GroupName: OptionName"
  const colonIdx = selectedSize.indexOf(":");
  if (colonIdx === -1) return productId;

  const groupName = selectedSize.substring(0, colonIdx).trim();
  const optionName = selectedSize.substring(colonIdx + 1).trim();

  for (const group of variants as VariantGroup[]) {
    if (group.name !== groupName) continue;
    for (const opt of group.options || []) {
      if (opt.name === optionName) {
        return `${productId}_${opt.id}`;
      }
    }
  }

  return productId;
}

/**
 * Get all catalog content_ids for a product page (all variants or just the product id).
 */
export function getAllCatalogContentIds(
  productId: string,
  variants: any | null | undefined
): string[] {
  if (!variants || !Array.isArray(variants)) {
    return [productId];
  }

  const ids: string[] = [];
  for (const group of variants as VariantGroup[]) {
    for (const opt of group.options || []) {
      ids.push(`${productId}_${opt.id}`);
    }
  }

  return ids.length > 0 ? ids : [productId];
}
