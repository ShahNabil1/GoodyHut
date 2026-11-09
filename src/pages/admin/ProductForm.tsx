import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary, optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { ArrowLeft, Upload, ZoomIn, X, GripVertical, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { flattenCategoryTree, getCategoryPath } from "@/lib/categoryUtils";

interface Category { id: string; name: string; parent_id: string | null; shipping_rate_per_kg?: number; shipping_rate_per_piece?: number; }

interface ImageItem {
  id: string;
  type: "existing" | "new";
  url: string;
  image_url?: string;
  file?: File;
}

interface VariantOption {
  id: string;
  name: string;
  price: number | null;
  min_quantity: number | null;
  size: string;
  weight: string;
}

interface VariantGroup {
  id: string;
  name: string;
  options: VariantOption[];
  expanded: boolean;
}

const genId = () => `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const SortableImageCard = ({ item, onPreview, onDelete }: { item: ImageItem; onPreview: (url: string) => void; onDelete: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 0 };

  return (
    <div ref={setNodeRef} style={style} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted/30">
      <img src={item.url} className="w-full h-full object-cover" />
      <button {...attributes} {...listeners} className="absolute top-1 left-1 p-0.5 rounded bg-background/70 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical size={12} />
      </button>
      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
        <div className="pointer-events-auto flex gap-1">
          <button onClick={() => onPreview(item.image_url || item.url)} className="p-1 rounded-full bg-background/80 text-foreground"><ZoomIn size={14} /></button>
          <button onClick={() => onDelete(item.id)} className="p-1 rounded-full bg-destructive text-destructive-foreground"><X size={14} /></button>
        </div>
      </div>
      {item.type === "new" && <span className="absolute bottom-0 inset-x-0 bg-accent/80 text-accent-foreground text-[10px] text-center py-0.5">New</span>}
    </div>
  );
};

const VariantOptionRow = ({
  option, groupId, defaultMinQty,
  onChange, onDelete,
}: {
  option: VariantOption; groupId: string;
  defaultMinQty: number; onChange: (groupId: string, optionId: string, field: string, value: any) => void;
  onDelete: (groupId: string, optionId: string) => void;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_1fr_auto] gap-2 items-center p-3 bg-muted/20 rounded-lg border border-border/50">
    <input value={option.name} placeholder="Option name" onChange={e => onChange(groupId, option.id, "name", e.target.value)}
      className="px-2.5 py-1.5 rounded-md border border-input bg-background text-sm" />
    <input type="number" value={option.price ?? ""} placeholder="Price" onChange={e => onChange(groupId, option.id, "price", e.target.value ? Number(e.target.value) : null)}
      className="px-2.5 py-1.5 rounded-md border border-input bg-background text-sm" />
    <input value={option.size} placeholder="Size" onChange={e => onChange(groupId, option.id, "size", e.target.value)}
      className="px-2.5 py-1.5 rounded-md border border-input bg-background text-sm" />
    <input value={option.weight} placeholder="Weight" onChange={e => onChange(groupId, option.id, "weight", e.target.value)}
      className="px-2.5 py-1.5 rounded-md border border-input bg-background text-sm" />
    <input type="number" value={option.min_quantity ?? defaultMinQty} placeholder="Min qty"
      onChange={e => onChange(groupId, option.id, "min_quantity", e.target.value ? Number(e.target.value) : null)}
      className="px-2.5 py-1.5 rounded-md border border-input bg-background text-sm" />
    <button onClick={() => onDelete(groupId, option.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
      <Trash2 size={14} />
    </button>
  </div>
);

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allImages, setAllImages] = useState<ImageItem[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const MAX_IMAGES = 10;
  const canAddMore = allImages.length < MAX_IMAGES;
  const newImageFiles = allImages.filter(i => i.type === "new");

  const [form, setForm] = useState({
    title: "", price: 0, original_price: 0, category_id: "",
    description: "", in_stock: true, stock: 0,
    meta_title: "", meta_description: "", min_quantity: 1,
    rating: 0, reviews_count: 0, sold_count: 0,
    estimated_weight_gm: 0, shipping_charge_type: "per_kg", shipping_rate_override: null as number | null,
    search_tags: "" as string,
  });
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  const generateSEO = async (field: "meta_title" | "meta_description" | "search_tags") => {
    if (!form.title.trim()) {
      toast({ title: "Title is required to generate SEO", variant: "destructive" });
      return;
    }
    setGenerating(prev => ({ ...prev, [field]: true }));
    try {
      const selectedCat = categories.find(c => c.id === form.category_id);
      const { data, error } = await supabase.functions.invoke("generate-seo", {
        body: {
          title: form.title,
          description: form.description,
          specifications: specs.filter(s => s.key.trim() && s.value.trim()),
          variants: hasVariants ? variantGroups.map(g => ({
            name: g.name,
            options: g.options.map(o => ({ name: o.name, size: o.size, weight: o.weight })),
          })) : [],
          category: selectedCat?.name || "",
          field,
        },
      });
      if (error) throw error;
      if (field === "search_tags" && data.search_tags) {
        setForm(prev => ({ ...prev, search_tags: data.search_tags.join(", ") }));
      } else if (field === "meta_title" && data.meta_title) {
        setForm(prev => ({ ...prev, meta_title: data.meta_title }));
      } else if (field === "meta_description" && data.meta_description) {
        setForm(prev => ({ ...prev, meta_description: data.meta_description }));
      }
      toast({ title: `${field.replace("_", " ")} generated!`, variant: "success" as any });
    } catch (err: any) {
      console.error("SEO generation error:", err);
      toast({ title: "Generation failed", description: err.message || "Try again", variant: "destructive" });
    } finally {
      setGenerating(prev => ({ ...prev, [field]: false }));
    }
  };

  const generateAllSEO = async () => {
    await Promise.all([
      generateSEO("meta_title"),
      generateSEO("meta_description"),
      generateSEO("search_tags"),
    ]);
  };

  const generateSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  useEffect(() => {
    const init = async () => {
      const { data: cats } = await supabase.from("categories").select("id, name, parent_id, shipping_rate_per_kg, shipping_rate_per_piece").order("sort_order");
      setCategories((cats || []) as Category[]);

      if (id) {
        const { data: product } = await supabase.from("products").select("*").eq("id", id).single();
        if (product) {
          setForm({
            title: product.title, price: product.price, original_price: product.original_price || 0,
            category_id: product.category_id || "", description: product.description || "",
            in_stock: product.in_stock ?? true, stock: product.stock || 0,
            meta_title: (product as any).meta_title || "", meta_description: (product as any).meta_description || "",
            min_quantity: (product as any).min_quantity || 1,
            rating: product.rating || 0, reviews_count: product.reviews_count || 0,
            sold_count: (product as any).sold_count || 0,
            estimated_weight_gm: (product as any).estimated_weight_gm || 0,
            shipping_charge_type: (product as any).shipping_charge_type || "per_kg",
            shipping_rate_override: (product as any).shipping_rate_override ?? null,
            search_tags: ((product as any).search_tags || []).join(", "),
          });
          const savedSpecs = (product as any).specifications;
          if (Array.isArray(savedSpecs) && savedSpecs.length > 0) setSpecs(savedSpecs);

          const savedVariants = (product as any).variants;
          if (Array.isArray(savedVariants) && savedVariants.length > 0) {
            setHasVariants(true);
            setVariantGroups(savedVariants.map((g: any) => ({ ...g, expanded: true })));
          }

          const { data: imgs } = await supabase.from("product_images").select("*").eq("product_id", id).order("sort_order");
          setAllImages((imgs || []).map((img: any) => ({
            id: img.id, type: "existing" as const, url: optimizeCloudinaryUrl(img.image_url, 120), image_url: img.image_url,
          })));
        }
      }
      setLoading(false);
    };
    init();
  }, [id]);

  // Variant helpers
  const addVariantGroup = () => {
    setVariantGroups(prev => [...prev, {
      id: genId(), name: "", expanded: true,
      options: [{ id: genId(), name: "", price: null, min_quantity: null, size: "", weight: "" }],
    }]);
  };

  const removeVariantGroup = (gid: string) => setVariantGroups(prev => prev.filter(g => g.id !== gid));

  const updateGroupName = (gid: string, name: string) => {
    setVariantGroups(prev => prev.map(g => g.id === gid ? { ...g, name } : g));
  };

  const toggleGroupExpand = (gid: string) => {
    setVariantGroups(prev => prev.map(g => g.id === gid ? { ...g, expanded: !g.expanded } : g));
  };

  const addOption = (gid: string) => {
    setVariantGroups(prev => prev.map(g => g.id === gid ? {
      ...g, options: [...g.options, { id: genId(), name: "", price: null, min_quantity: null, size: "", weight: "" }],
    } : g));
  };

  const removeOption = (gid: string, oid: string) => {
    setVariantGroups(prev => prev.map(g => g.id === gid ? { ...g, options: g.options.filter(o => o.id !== oid) } : g));
  };

  const updateOption = (gid: string, oid: string, field: string, value: any) => {
    setVariantGroups(prev => prev.map(g => g.id === gid ? {
      ...g, options: g.options.map(o => o.id === oid ? { ...o, [field]: value } : o),
    } : g));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setSaving(true);

    const slug = generateSlug(form.title);
    const selectedCat = categories.find(c => c.id === form.category_id);

    // Clean variants for storage (remove UI-only fields like expanded)
    const cleanVariants = hasVariants ? variantGroups.map(g => ({
      id: g.id, name: g.name,
      options: g.options.map(o => ({
        id: o.id, name: o.name, price: o.price, min_quantity: o.min_quantity,
        size: o.size, weight: o.weight,
      })),
    })) : [];

    const payload: any = {
      title: form.title.trim(), slug, price: form.price, original_price: form.original_price || null,
      category: selectedCat?.name || "General", category_id: form.category_id || null,
      description: form.description.trim() || null,
      sizes: [],
      in_stock: form.stock > 0 ? true : form.in_stock, stock: form.stock,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      specifications: specs.filter(s => s.key.trim() && s.value.trim()),
      variants: cleanVariants,
      min_quantity: form.min_quantity || 1,
      rating: form.rating || 0,
      reviews_count: form.reviews_count || 0,
      sold_count: form.sold_count || 0,
      estimated_weight_gm: form.estimated_weight_gm || 0,
      shipping_charge_type: form.shipping_charge_type || "per_kg",
      shipping_rate_override: form.shipping_rate_override || null,
      search_tags: form.search_tags.split(",").map(t => t.trim()).filter(Boolean),
    };

    let productId = id;

    if (isEditing) {
      const { error } = await supabase.from("products").update(payload).eq("id", id);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) { toast({ title: "Creation failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
      productId = data.id;
    }

    if (newImageFiles.length > 0 && productId) {
      for (let i = 0; i < newImageFiles.length; i++) {
        try {
          const url = await uploadToCloudinary(newImageFiles[i].file!, `goodyhut/products/${productId}`);
          await supabase.from("product_images").insert({ product_id: productId, image_url: url, sort_order: allImages.indexOf(newImageFiles[i]) });
        } catch { /* skip failed */ }
      }
    }

    for (let i = 0; i < allImages.length; i++) {
      if (allImages[i].type === "existing") {
        await supabase.from("product_images").update({ sort_order: i }).eq("id", allImages[i].id);
      }
    }

    // Generate CLIP embedding for the product's first image
    if (productId) {
      try {
        const { data: firstImg } = await supabase
          .from("product_images")
          .select("image_url")
          .eq("product_id", productId)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (firstImg?.image_url) {
          supabase.functions.invoke("generate-embeddings", {
            body: { product_id: productId, image_url: firstImg.image_url },
          }).catch((err) => console.error("Embedding generation failed:", err));
        }
      } catch (e) { console.error("Embedding trigger failed:", e); }
    }

    toast({ title: isEditing ? "Product updated" : "Product created" });
    navigate("/admin/products");
  };

  const deleteImage = async (itemId: string) => {
    const item = allImages.find(i => i.id === itemId);
    if (item?.type === "existing") {
      await supabase.from("product_images").delete().eq("id", itemId);
    }
    setAllImages(prev => prev.filter(i => i.id !== itemId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setAllImages(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="space-y-3 w-full max-w-md">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl skeleton-shimmer" />)}</div></div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3">
          <button onClick={() => navigate("/admin/products")} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground">
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-display text-lg font-bold text-foreground">{isEditing ? "Edit Product" : "New Product"}</h2>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <p className="text-xs text-muted-foreground mt-1">Slug: {generateSlug(form.title) || "—"}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Price (৳)</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Original Price (৳)</label>
            <input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">Select category</option>
              {flattenCategoryTree(categories).map(c => (
                <option key={c.id} value={c.id}>{getCategoryPath(c.id, categories)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Stock</label>
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Minimum Quantity</label>
            <input type="number" value={form.min_quantity} min={1} onChange={(e) => setForm({ ...form, min_quantity: Math.max(1, Number(e.target.value)) })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <p className="text-xs text-muted-foreground mt-1">Default minimum order quantity</p>
          </div>
          <div>
            <label className="text-sm font-medium">Rating (⭐)</label>
            <input type="number" value={form.rating} min={0} max={5} step={0.1} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Reviews Count</label>
            <input type="number" value={form.reviews_count} min={0} onChange={(e) => setForm({ ...form, reviews_count: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Sold Count</label>
            <input type="number" value={form.sold_count} min={0} onChange={(e) => setForm({ ...form, sold_count: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <p className="text-xs text-muted-foreground mt-1">Shows on product card as "X Sold"</p>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })} id="instock" />
            <label htmlFor="instock" className="text-sm">In Stock</label>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm min-h-[120px]" />
          </div>

          {/* Shipping Settings Section */}
          <div className="md:col-span-2 border-t border-border pt-4 mt-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">✈️ Shipping Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: form.shipping_charge_type === 'per_kg' ? '120px' : '0px',
                  opacity: form.shipping_charge_type === 'per_kg' ? 1 : 0,
                  marginBottom: form.shipping_charge_type === 'per_kg' ? undefined : '-16px',
                }}
              >
                <label className="text-sm font-medium">Estimated Weight (gm)</label>
                <input type="number" value={form.estimated_weight_gm} min={0}
                  onChange={(e) => setForm({ ...form, estimated_weight_gm: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="e.g. 500" />
              </div>
              <div>
                <label className="text-sm font-medium">Charge Type</label>
                <div className="mt-1 flex items-center gap-3 h-[38px]">
                  <span className={`text-sm transition-colors duration-200 ${form.shipping_charge_type === 'per_kg' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>Per KG</span>
                  <button type="button" onClick={() => setForm({ ...form, shipping_charge_type: form.shipping_charge_type === 'per_kg' ? 'per_piece' : 'per_kg' })}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${form.shipping_charge_type === 'per_piece' ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform duration-300 ${form.shipping_charge_type === 'per_piece' ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className={`text-sm transition-colors duration-200 ${form.shipping_charge_type === 'per_piece' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>Per Piece</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Rate Override (৳{form.shipping_charge_type === 'per_piece' ? '/piece' : '/kg'}) <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input type="number" value={form.shipping_rate_override ?? ""} min={0}
                  onChange={(e) => setForm({ ...form, shipping_rate_override: e.target.value ? Number(e.target.value) : null })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="Leave empty for category rate" />
              </div>
            </div>
            {/* Live preview */}
            {(() => {
              const selectedCat = categories.find(c => c.id === form.category_id) as any;
              const rate = form.shipping_rate_override ?? (form.shipping_charge_type === 'per_piece'
                ? (selectedCat?.shipping_rate_per_piece || 0)
                : (selectedCat?.shipping_rate_per_kg || 0));
              const charge = form.shipping_charge_type === 'per_piece'
                ? rate
                : rate * (form.estimated_weight_gm / 1000);
              return charge > 0 ? (
                <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
                  <p className="text-sm text-foreground">
                    Estimated Cargo Charge: <strong className="text-primary">৳{Math.round(charge)}</strong>
                    {form.shipping_charge_type === 'per_kg' && (
                      <span className="text-muted-foreground text-xs ml-2">({form.estimated_weight_gm}gm × ৳{rate}/kg)</span>
                    )}
                    {form.shipping_charge_type === 'per_piece' && (
                      <span className="text-muted-foreground text-xs ml-2">(৳{rate}/piece)</span>
                    )}
                  </p>
                </div>
              ) : null;
            })()}
          </div>

          {/* Variants Section */}
          <div className="md:col-span-2 border-t border-border pt-4 mt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Variants</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-muted-foreground">{hasVariants ? "On" : "Off"}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !hasVariants;
                    setHasVariants(next);
                    if (next && variantGroups.length === 0) addVariantGroup();
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${hasVariants ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${hasVariants ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </label>
            </div>

            {hasVariants && (
              <div className="space-y-4">
                {variantGroups.map((group) => (
                  <div key={group.id} className="border border-border rounded-xl overflow-hidden">
                    {/* Group header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                      <input value={group.name} placeholder="Variant type (e.g., US Variant, Color)"
                        onChange={e => updateGroupName(group.id, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-md border border-input bg-background text-sm font-medium" />
                      <button type="button" onClick={() => toggleGroupExpand(group.id)} className="p-1.5 text-muted-foreground hover:text-foreground">
                        {group.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button type="button" onClick={() => removeVariantGroup(group.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Options */}
                    {group.expanded && (
                      <div className="p-3 space-y-2">
                        {/* Header labels */}
                        <div className="hidden sm:grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_1fr_auto] gap-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider">
                          <span>Name</span><span>Price (৳)</span><span>Size</span><span>Weight</span><span>Min Qty</span><span></span>
                        </div>
                        {group.options.map(opt => (
                          <VariantOptionRow key={opt.id} option={opt} groupId={group.id}
                            defaultMinQty={form.min_quantity} onChange={updateOption} onDelete={removeOption} />
                        ))}
                        <button type="button" onClick={() => addOption(group.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-1 ml-3">
                          <Plus size={12} /> Add Option
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <button type="button" onClick={addVariantGroup}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors">
                  <Plus size={14} /> Add Variant Group
                </button>
              </div>
            )}
          </div>

          {/* Specifications Section */}
          <div className="md:col-span-2 border-t border-border pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Specifications</h3>
              <button type="button" onClick={() => setSpecs(prev => [...prev, { key: "", value: "" }])}
                className="text-xs text-primary hover:underline">+ Add Row</button>
            </div>
            <div className="space-y-2">
              {specs.map((spec, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input value={spec.key} placeholder="e.g. Weight, Brand"
                    onChange={(e) => { const n = [...specs]; n[idx].key = e.target.value; setSpecs(n); }}
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  <input value={spec.value} placeholder="Value"
                    onChange={(e) => { const n = [...specs]; n[idx].value = e.target.value; setSpecs(n); }}
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  <button type="button" onClick={() => setSpecs(prev => prev.filter((_, i) => i !== idx))}
                    className="p-2 text-muted-foreground hover:text-destructive"><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* SEO Section */}
          <div className="md:col-span-2 border-t border-border pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">SEO Settings</h3>
              <button
                type="button"
                onClick={generateAllSEO}
                disabled={generating.meta_title || generating.meta_description || generating.search_tags}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {(generating.meta_title || generating.meta_description || generating.search_tags) ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                Generate All SEO
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Meta Title <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <button type="button" onClick={() => generateSEO("meta_title")} disabled={generating.meta_title}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50">
                    {generating.meta_title ? <Loader2 size={11} className="animate-spin" /> : form.meta_title ? <RefreshCw size={11} /> : <Sparkles size={11} />}
                    {form.meta_title ? "Regenerate" : "Generate"}
                  </button>
                </div>
                <input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                  placeholder={form.title || "Product title will be used"}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                <p className="text-xs text-muted-foreground mt-1">{(form.meta_title || form.title).length}/60 characters</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Meta Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <button type="button" onClick={() => generateSEO("meta_description")} disabled={generating.meta_description}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50">
                    {generating.meta_description ? <Loader2 size={11} className="animate-spin" /> : form.meta_description ? <RefreshCw size={11} /> : <Sparkles size={11} />}
                    {form.meta_description ? "Regenerate" : "Generate"}
                  </button>
                </div>
                <textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                  placeholder={form.description?.slice(0, 100) || "Product description will be used"}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm min-h-[60px]" />
                <p className="text-xs text-muted-foreground mt-1">{(form.meta_description || form.description).length}/160 characters</p>
              </div>
            </div>
          </div>

          {/* Search Tags Section */}
          <div className="md:col-span-2 border-t border-border pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">🔍 Search Tags (Smart Search)</h3>
              <button type="button" onClick={() => generateSEO("search_tags")} disabled={generating.search_tags}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50">
                {generating.search_tags ? <Loader2 size={11} className="animate-spin" /> : form.search_tags ? <RefreshCw size={11} /> : <Sparkles size={11} />}
                {form.search_tags ? "Regenerate" : "Generate"}
              </button>
            </div>
            <div>
              <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(comma separated)</span></label>
              <input value={form.search_tags} onChange={(e) => setForm({ ...form, search_tags: e.target.value })}
                placeholder="watch, smartwatch, wrist watch, timepiece..."
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <p className="text-xs text-muted-foreground mt-1">Add Bangla & English synonyms. e.g.: Smart Watch → ঘড়ি, স্মার্টওয়াচ, wrist watch</p>
            </div>
          </div>

          {/* Images */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Images ({allImages.length}/{MAX_IMAGES})</label>
              <span className="text-xs text-muted-foreground">Drag to reorder</span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={allImages.map(i => i.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-5 gap-2">
                  {allImages.map(item => (
                    <SortableImageCard key={item.id} item={item} onPreview={setPreviewImage} onDelete={deleteImage} />
                  ))}

                  {canAddMore && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors">
                      <Upload size={18} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Add</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const remaining = MAX_IMAGES - allImages.length;
                        const newItems: ImageItem[] = files.slice(0, remaining).map(f => ({
                          id: `new-${Date.now()}-${Math.random()}`,
                          type: "new",
                          url: URL.createObjectURL(f),
                          file: f,
                        }));
                        setAllImages(prev => [...prev, ...newItems]);
                        e.target.value = "";
                      }} />
                    </label>
                  )}
                </div>
              </SortableContext>
            </DndContext>
            {!canAddMore && <p className="text-xs text-muted-foreground">Maximum {MAX_IMAGES} images reached</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-lg gradient-brand text-primary-foreground text-sm font-medium disabled:opacity-50">
            {saving ? "Saving..." : "Save Product"}
          </button>
          <button onClick={() => navigate("/admin/products")}
            className="px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
            Cancel
          </button>
        </div>
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/70 backdrop-blur-md" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img src={previewImage} className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
            <button onClick={() => setPreviewImage(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-card border border-border text-foreground flex items-center justify-center shadow-lg hover:bg-muted transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductForm;
