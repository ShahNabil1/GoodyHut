import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary, optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { Plus, Edit3, Trash2, Image, X, ArrowLeft, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { flattenCategoryTree, getDescendantIds, getIndentPrefix, isDescendantOf } from "@/lib/categoryUtils";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
  is_top: boolean;
  shipping_rate_per_kg: number;
  shipping_rate_per_piece: number;
}

interface Product {
  id: string;
  title: string;
  price: number;
  category_id: string | null;
  category: string;
  image_url?: string | null;
}

const CategoryManagement = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", parent_id: "", sort_order: 0, shipping_rate_per_kg: 0, shipping_rate_per_piece: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Category products view
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories((data || []) as Category[]);

    // Fetch product counts per category
    const { data: products } = await supabase.from("products").select("category_id");
    const counts: Record<string, number> = {};
    (products || []).forEach((p: any) => {
      if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });
    setProductCounts(counts);

    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategoryProducts = async (cat: Category) => {
    setLoadingProducts(true);
    const { data } = await supabase.from("products").select("id, title, price, category_id, category, product_images(image_url, sort_order)").eq("category_id", cat.id);
    const mapped = (data || []).map((p: any) => ({
      ...p,
      image_url: p.product_images?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))?.[0]?.image_url || null,
      product_images: undefined,
    }));
    setCategoryProducts(mapped as Product[]);
    const { data: all } = await supabase.from("products").select("id, title, price, category_id, category, product_images(image_url, sort_order)");
    const allMapped = (all || []).map((p: any) => ({
      ...p,
      image_url: p.product_images?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))?.[0]?.image_url || null,
      product_images: undefined,
    }));
    setAllProducts(allMapped as Product[]);
    setLoadingProducts(false);
  };

  const openCategoryProducts = (cat: Category) => {
    setSelectedCategory(cat);
    fetchCategoryProducts(cat);
  };

  const assignProduct = async (product: Product) => {
    await supabase.from("products").update({ category_id: selectedCategory!.id, category: selectedCategory!.name }).eq("id", product.id);
    toast({ title: `"${product.title}" assigned to ${selectedCategory!.name}` });
    setAssignSearch("");
    setShowAssignDropdown(false);
    fetchCategoryProducts(selectedCategory!);
  };

  const removeFromCategory = async (product: Product) => {
    await supabase.from("products").update({ category_id: null, category: "General" }).eq("id", product.id);
    toast({ title: `"${product.title}" removed from category` });
    fetchCategoryProducts(selectedCategory!);
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", slug: "", parent_id: "", sort_order: 0, shipping_rate_per_kg: 0, shipping_rate_per_piece: 0 });
    setImageFile(null);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, parent_id: cat.parent_id || "", sort_order: cat.sort_order, shipping_rate_per_kg: cat.shipping_rate_per_kg || 0, shipping_rate_per_piece: cat.shipping_rate_per_piece || 0 });
    setImageFile(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);

    let image_url = editing?.image_url || null;
    if (imageFile) {
      try {
        image_url = await uploadToCloudinary(imageFile, "goodyhut/categories");
      } catch {
        toast({ title: "Image upload failed", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const slug = form.slug.trim() || generateSlug(form.name);
    const payload = {
      name: form.name.trim(),
      slug,
      parent_id: form.parent_id || null,
      image_url,
      sort_order: form.sort_order,
      shipping_rate_per_kg: form.shipping_rate_per_kg || 0,
      shipping_rate_per_piece: form.shipping_rate_per_piece || 0,
    };

    if (editing) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
      else toast({ title: "Category updated" });
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) toast({ title: "Creation failed", description: error.message, variant: "destructive" });
      else toast({ title: "Category created" });
    }

    setSaving(false);
    setShowForm(false);
    fetchCategories();
  };

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; onConfirm: () => Promise<void> }>({ open: false, onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      open: true,
      onConfirm: async () => {
        await supabase.from("categories").delete().eq("id", id);
        toast({ title: "Category deleted" });
        fetchCategories();
      },
    });
  };

  // All categories can be parents (multi-level nesting)
  const treeCategories = flattenCategoryTree(categories);
  
  // For parent selector: exclude self and descendants to prevent circular refs
  const getParentOptions = (editingId?: string) => {
    return treeCategories.filter(c => {
      if (!editingId) return true;
      if (c.id === editingId) return false;
      return !isDescendantOf(c.id, editingId, categories);
    });
  };

  // Unassigned products for the assign dropdown
  const unassignedProducts = allProducts
    .filter(p => p.category_id !== selectedCategory?.id)
    .filter(p => p.title.toLowerCase().includes(assignSearch.toLowerCase()));

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl skeleton-shimmer" />)}</div>;

  // Category Products View
  if (selectedCategory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedCategory(null)} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{selectedCategory.name}</h2>
            <p className="text-xs text-muted-foreground">{categoryProducts.length} products in this category</p>
          </div>
        </div>

        {/* Assign Product */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search & assign a product to this category..."
                value={assignSearch}
                onChange={(e) => { setAssignSearch(e.target.value); setShowAssignDropdown(true); }}
                onFocus={() => setShowAssignDropdown(true)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          {showAssignDropdown && assignSearch.length > 0 && (
            <div className="absolute top-12 left-0 right-0 z-20 max-h-60 overflow-y-auto rounded-xl bg-card border border-border shadow-lg">
              {unassignedProducts.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">No matching products</p>
              ) : (
                unassignedProducts.slice(0, 10).map(p => (
                  <button
                    key={p.id}
                    onClick={() => assignProduct(p)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 text-left border-b border-border/30 last:border-0"
                  >
                    {p.image_url ? <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-muted" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">৳{p.price} · {p.category || "No category"}</p>
                    </div>
                    <span className="text-xs text-primary font-medium shrink-0">+ Assign</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Products List */}
        {loadingProducts ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl skeleton-shimmer" />)}</div>
        ) : categoryProducts.length === 0 ? (
          <div className="rounded-xl bg-card border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">No products in this category yet. Use the search above to assign products.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground w-10"></th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Price</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categoryProducts.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3">{p.image_url ? <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-muted" />}</td>
                    <td className="p-3 font-medium text-foreground">{p.title}</td>
                    <td className="p-3 text-muted-foreground">৳{p.price}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => removeFromCategory(p)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">Categories ({categories.length})</h2>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand text-primary-foreground text-sm font-medium">
          <Plus size={16} /> New Category
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">{editing ? "Edit Category" : "New Category"}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="Category name" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Parent Category</label>
                <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="">— None (Main Category) —</option>
                  {getParentOptions(editing?.id).map(c => (
                    <option key={c.id} value={c.id}>{getIndentPrefix(c.depth)} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              {!form.parent_id && (
              <div>
                <label className="text-sm font-medium text-foreground">Image</label>
                <div className="mt-1">
                  <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <Image size={20} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {imageFile ? imageFile.name : "Click to upload image"}
                    </span>
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                  {(imageFile || editing?.image_url) && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : optimizeCloudinaryUrl(editing!.image_url!, 100)}
                        alt="" className="w-16 h-16 rounded-lg object-cover border border-border"
                      />
                      {imageFile && (
                        <button onClick={() => setImageFile(null)} className="text-xs text-destructive hover:underline">Remove</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Shipping Rates */}
              <div className="border-t border-border pt-3 mt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">✈️ Shipping Rates</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Per KG (৳)</label>
                    <input type="number" value={form.shipping_rate_per_kg} onChange={(e) => setForm({ ...form, shipping_rate_per_kg: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="e.g. 800" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Per Piece (৳)</label>
                    <input type="number" value={form.shipping_rate_per_piece} onChange={(e) => setForm({ ...form, shipping_rate_per_piece: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="e.g. 50" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Product-level toggle will determine which rate is used</p>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 rounded-lg gradient-brand text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Mobile card view */}
      <div className="space-y-3 sm:hidden">
        {categories.map((cat) => {
          const parent = categories.find(c => c.id === cat.parent_id);
          return (
            <div key={cat.id} className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-center gap-3">
                {cat.image_url ? (
                  <img src={optimizeCloudinaryUrl(cat.image_url, 48)} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0"><Image size={16} className="text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <button onClick={() => openCategoryProducts(cat)} className="font-medium text-foreground hover:text-primary transition-colors text-left text-sm">
                    {cat.name} <span className="text-xs text-muted-foreground">({productCounts[cat.id] || 0})</span>
                  </button>
                  <div className="flex items-center gap-3 mt-1">
                    {parent && <span className="text-xs text-muted-foreground">Parent: {parent.name}</span>}
                    <span className="text-xs text-muted-foreground">Order: {cat.sort_order}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={async () => {
                      await supabase.from("categories").update({ is_top: !cat.is_top } as any).eq("id", cat.id);
                      fetchCategories();
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative ${cat.is_top ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${cat.is_top ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"><Edit3 size={14} /></button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {categories.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">No categories yet</p>}
      </div>

      {/* Desktop table view */}
      <div className="rounded-xl bg-card border border-border overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Image</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Parent</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Order</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Top</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const parent = categories.find(c => c.id === cat.parent_id);
              return (
                <tr key={cat.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3">
                    {cat.image_url ? (
                      <img src={optimizeCloudinaryUrl(cat.image_url, 48)} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center"><Image size={16} className="text-muted-foreground" /></div>
                    )}
                  </td>
                  <td className="p-3">
                    <button onClick={() => openCategoryProducts(cat)} className="font-medium text-foreground hover:text-primary transition-colors text-left">
                      {cat.name} <span className="text-xs text-muted-foreground hover:text-primary">({productCounts[cat.id] || 0})</span>
                    </button>
                  </td>
                  <td className="p-3 text-muted-foreground">{parent?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{cat.sort_order}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={async () => {
                        await supabase.from("categories").update({ is_top: !cat.is_top } as any).eq("id", cat.id);
                        fetchCategories();
                      }}
                      className={`w-10 h-5 rounded-full transition-colors relative ${cat.is_top ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${cat.is_top ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive ml-1"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {categories.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">No categories yet</p>}
      </div>
      <ConfirmDialog open={confirmDialog.open} onClose={() => setConfirmDialog(d => ({ ...d, open: false }))} onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }} loading={confirmLoading} title="Delete Category?" description="This category and its assignments will be removed." confirmLabel="Delete" variant="danger" />
    </div>
  );
};

export default CategoryManagement;
