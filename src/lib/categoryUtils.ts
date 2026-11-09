// Category tree utility functions for multi-level nesting

interface CategoryBase {
  id: string;
  name: string;
  parent_id: string | null;
}

/** Get all descendant IDs of a category (recursive) */
export function getDescendantIds<T extends CategoryBase>(parentId: string, categories: T[]): string[] {
  const children = categories.filter(c => c.parent_id === parentId);
  return children.reduce<string[]>((acc, child) => [
    ...acc, child.id, ...getDescendantIds(child.id, categories)
  ], []);
}

/** Check if targetId is a descendant of ancestorId */
export function isDescendantOf<T extends CategoryBase>(targetId: string, ancestorId: string, categories: T[]): boolean {
  const descendants = getDescendantIds(ancestorId, categories);
  return descendants.includes(targetId);
}

/** Get depth level of a category (0 = root) */
export function getCategoryDepth<T extends CategoryBase>(catId: string, categories: T[]): number {
  const cat = categories.find(c => c.id === catId);
  if (!cat || !cat.parent_id) return 0;
  return 1 + getCategoryDepth(cat.parent_id, categories);
}

/** Build full path string: "Parent → Child → Grandchild" */
export function getCategoryPath<T extends CategoryBase>(catId: string, categories: T[]): string {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return "";
  if (!cat.parent_id) return cat.name;
  return `${getCategoryPath(cat.parent_id, categories)} → ${cat.name}`;
}

/** Flatten categories into tree order with depth info */
export function flattenCategoryTree<T extends CategoryBase>(categories: T[]): (T & { depth: number })[] {
  const result: (T & { depth: number })[] = [];
  
  const addChildren = (parentId: string | null, depth: number) => {
    const children = categories.filter(c => c.parent_id === parentId);
    for (const child of children) {
      result.push({ ...child, depth });
      addChildren(child.id, depth + 1);
    }
  };
  
  addChildren(null, 0);
  return result;
}

/** Get indent prefix for tree display: "—", "——", "———" */
export function getIndentPrefix(depth: number): string {
  return "—".repeat(depth);
}
