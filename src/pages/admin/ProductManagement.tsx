import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { Plus, Edit3, Trash2, Search, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Product {
  id: string; title: string; slug: string; price: number; original_price: number | null;
  category: string; category_id: string | null; description: string | null; emoji: string | null;
  sizes: string[] | null; in_stock: boolean; stock: number; rating: number | null; reviews_count: number | null;
  product_images: { image_url: string; sort_order: number | null }[];
}

const ProductManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; onConfirm: () => Promise<void> }>({ open: false, onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*, product_images(image_url, sort_order)").order("created_at", { ascending: false });
    setProducts((data || []) as unknown as Product[]);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      open: true,
      onConfirm: async () => {
        await supabase.from("product_images").delete().eq("product_id", id);
        await supabase.from("products").delete().eq("id", id);
        toast({ title: "Product deleted" });
        fetchProducts();
      },
    });
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl skeleton-shimmer" />)}</div>;

  const handleGenerateAllEmbeddings = async () => {
    setGeneratingEmbeddings(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-embeddings", {
        body: { batch: true },
      });
      if (error) throw error;
      toast({
        title: "Embeddings Generated ✅",
        description: `Processed: ${data.processed}, Failed: ${data.failed}, Skipped: ${data.skipped}`,
      });
    } catch (err: any) {
      toast({ title: "Embedding generation failed", description: err.message, variant: "destructive" });
    }
    setGeneratingEmbeddings(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-xl font-bold text-foreground">Products ({products.length})</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAllEmbeddings}
            disabled={generatingEmbeddings}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/60 text-sm font-medium text-foreground disabled:opacity-50 transition-colors"
          >
            {generatingEmbeddings ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generatingEmbeddings ? "Generating..." : "Generate Embeddings"}
          </button>
          <button onClick={() => navigate("/product-form/new")} className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand text-primary-foreground text-sm font-medium">
            <Plus size={16} /> New Product
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, slug, or category..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
      </div>

      {/* Mobile card view */}
      <div className="space-y-2 md:hidden">
        {filtered.map((p) => {
          const img = p.product_images?.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))[0];
          return (
            <div key={p.id} className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-center gap-3">
                {img ? (
                  <img src={optimizeCloudinaryUrl(img.image_url, 80)} alt={p.title} className="w-11 h-11 rounded-lg object-cover bg-muted flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-muted flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm leading-tight truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-xs">৳{p.price.toLocaleString()}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${p.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {p.stock}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">{p.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => navigate(`/product-form/edit/${p.id}`)} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground"><Edit3 size={15} /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">{search ? "No matching products" : "No products yet"}</p>}
      </div>

      {/* Desktop table view */}
      <div className="rounded-xl bg-card border border-border overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Price</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const img = p.product_images?.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))[0];
                        return img ? (
                          <img src={img.image_url} alt={p.title} className="w-10 h-10 rounded-lg object-cover bg-muted" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted" />
                        );
                      })()}
                      <div>
                        <p className="font-medium text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-semibold">৳{p.price.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.category}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => navigate(`/product-form/edit/${p.id}`)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive ml-1"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">{search ? "No matching products" : "No products yet"}</p>}
      </div>
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
        onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }}
        loading={confirmLoading}
        title="Delete Product?"
        description="This will permanently delete this product and all its images."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ProductManagement;
