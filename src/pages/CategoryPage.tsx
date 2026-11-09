import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, type CategoryFlat } from "@/hooks/useCategories";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { motion } from "framer-motion";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { ArrowLeft, ChevronRight, Package, Layers } from "lucide-react";
import { getDescendantIds } from "@/lib/categoryUtils";

interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  original_price: number | null;
  emoji: string | null;
  rating: number | null;
  reviews_count: number | null;
  in_stock: boolean | null;
  product_images: { image_url: string; sort_order: number | null }[];
}

interface CategoryFullLocal {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
}

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<CategoryFullLocal[]>([]);
  const { data: allCatsData = [] } = useCategories();
  const allCategoriesFlat = allCatsData as CategoryFullLocal[];
  const [categoryName, setCategoryName] = useState("");
  const [parentSlug, setParentSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isAllCategories = slug === "all";

  useEffect(() => {
    if (allCatsData.length === 0) return;
    const fetchData = async () => {
      setLoading(true);
      setParentSlug(null);

      const cats = allCategoriesFlat;

      if (isAllCategories) {
        const topLevel = cats.filter(c => !c.parent_id);
        setSubCategories(topLevel);
        setCategoryName("All Categories");
        setProducts([]);
        setLoading(false);
        return;
      }

      const current = cats.find(c => c.slug === slug);
      if (!current) { setLoading(false); return; }
      setCategoryName(current.name);

      if (current.parent_id) {
        const parent = cats.find(c => c.id === current.parent_id);
        if (parent) setParentSlug(parent.slug);
      }

      const directChildren = cats.filter(c => c.parent_id === current.id);
      setSubCategories(directChildren);

      const descendantIds = getDescendantIds(current.id, cats);
      const allCategoryIds = [current.id, ...descendantIds];

      const { data: prods } = await supabase
        .from("products")
        .select("id, title, slug, price, original_price, emoji, rating, reviews_count, in_stock, product_images(image_url, sort_order)")
        .in("category_id", allCategoryIds)
        .order("created_at", { ascending: false });

      setProducts((prods || []) as Product[]);
      setLoading(false);
    };
    fetchData();
  }, [slug, allCatsData]);

  // Count products under a category (including descendants)
  const countProducts = (catId: string) => {
    const descIds = getDescendantIds(catId, allCategoriesFlat);
    const allIds = new Set([catId, ...descIds]);
    // We don't have all products loaded, so we count from current products list
    return products.filter(p => {
      // This is approximate — we show product count from loaded products
      return true;
    }).length;
  };

  // Get grandchildren for a sub-category
  const getGrandChildren = (catId: string) => {
    return allCategoriesFlat.filter(c => c.parent_id === catId);
  };

  const getProductImage = (p: Product) => {
    if (p.product_images && p.product_images.length > 0) {
      const sorted = [...p.product_images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return optimizeCloudinaryUrl(sorted[0].image_url, 400);
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-2 md:pt-24 pb-32 md:pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <button
              onClick={() => navigate(parentSlug ? `/category/${parentSlug}` : "/")}
              className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors shrink-0"
            >
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl md:text-4xl font-display font-bold text-foreground">{categoryName}</h1>
              {!isAllCategories && !loading && (
                <p className="text-sm text-muted-foreground">{products.length} products</p>
              )}
            </div>
          </div>

          {/* All Categories — Premium Hierarchy View */}
          {isAllCategories && !loading && (
            <div className="space-y-4 md:space-y-5">
              {subCategories.map((parent, pi) => {
                const children = getGrandChildren(parent.id);
                // Rotating accent colors for visual variety
                const accents = [
                  { bg: "from-primary/10 to-primary/5", dot: "bg-primary", tag: "bg-primary/8 text-primary border-primary/15 hover:bg-primary/15", text: "text-primary" },
                  { bg: "from-secondary/10 to-secondary/5", dot: "bg-secondary", tag: "bg-secondary/8 text-secondary border-secondary/15 hover:bg-secondary/15", text: "text-secondary" },
                  { bg: "from-accent/10 to-accent/5", dot: "bg-accent", tag: "bg-accent/8 text-accent-foreground border-accent/15 hover:bg-accent/15", text: "text-accent-foreground" },
                ];
                const accent = accents[pi % accents.length];

                return (
                  <motion.div
                    key={parent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pi * 0.05, type: "spring", damping: 22 }}
                    className="rounded-2xl overflow-hidden border border-border/40
                      bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-300"
                  >
                    {/* Parent Row — gradient accent header */}
                    <div
                      onClick={() => navigate(`/category/${parent.slug}`)}
                      className={`flex items-center gap-3.5 p-4 md:p-5 cursor-pointer group
                        bg-gradient-to-r ${accent.bg} transition-colors relative overflow-hidden`}
                    >
                      {/* Decorative circle */}
                      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />

                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden bg-white/60 backdrop-blur-sm border border-white/40 shrink-0
                        shadow-sm group-hover:scale-105 transition-transform duration-300">
                        {parent.image_url ? (
                          <img src={optimizeCloudinaryUrl(parent.image_url, 120)} alt={parent.name}
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 relative">
                        <h2 className={`text-base md:text-lg font-display font-bold text-foreground group-hover:${accent.text} transition-colors truncate`}>
                          {parent.name}
                        </h2>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5 font-medium">
                          {children.length > 0 ? `${children.length} sub-categories` : "Browse products →"}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center shrink-0
                        group-hover:bg-white/80 transition-all shadow-sm">
                        <ChevronRight size={15} className="text-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    {/* Children List */}
                    {children.length > 0 && (
                      <div className="px-3 py-2 md:px-4 md:py-3 space-y-1">
                        {children.map((child, ci) => {
                          const grandChildren = getGrandChildren(child.id);
                          return (
                            <motion.div
                              key={child.id}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: pi * 0.05 + ci * 0.025 }}
                            >
                              <div
                                onClick={() => navigate(`/category/${child.slug}`)}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer group/child
                                  hover:bg-muted/40 active:scale-[0.99] transition-all"
                              >
                                <div className={`w-2 h-2 rounded-full ${accent.dot} opacity-40 group-hover/child:opacity-80 transition-opacity shrink-0`} />
                                <span className="flex-1 text-[13px] font-semibold text-foreground/75 group-hover/child:text-foreground transition-colors truncate">
                                  {child.name}
                                </span>
                                {grandChildren.length > 0 && (
                                  <span className="text-[10px] font-bold text-muted-foreground/30 bg-muted/30 px-1.5 py-0.5 rounded-md shrink-0">
                                    {grandChildren.length}
                                  </span>
                                )}
                                <ChevronRight size={12} className="text-muted-foreground/15 group-hover/child:text-muted-foreground/50 transition-all shrink-0" />
                              </div>

                              {/* Grandchildren pills */}
                              {grandChildren.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pl-8 pr-3 pb-2 mt-0.5">
                                  {grandChildren.map(gc => (
                                    <span
                                      key={gc.id}
                                      onClick={(e) => { e.stopPropagation(); navigate(`/category/${gc.slug}`); }}
                                      className={`text-[11px] font-semibold ${accent.tag} border
                                        px-2.5 py-1 rounded-lg
                                        cursor-pointer transition-all active:scale-95`}
                                    >
                                      {gc.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Sub-categories for specific category page */}
          {!isAllCategories && !loading && subCategories.length > 0 && (
            <div className="mb-8 md:mb-12">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={15} className="text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sub-Categories</h2>
              </div>
              <div className="space-y-1.5">
                {subCategories.map((cat, i) => {
                  const grandChildren = getGrandChildren(cat.id);
                  return (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, type: "spring", damping: 22 }}
                      className="rounded-xl bg-card border border-border/40 overflow-hidden
                        hover:shadow-[var(--shadow-card)] hover:border-primary/15 transition-all duration-300"
                    >
                      <div
                        onClick={() => navigate(`/category/${cat.slug}`)}
                        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer group"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary/30 group-hover:bg-primary/70 transition-colors shrink-0" />
                        <span className="flex-1 text-[13px] font-bold text-foreground/80 group-hover:text-primary transition-colors truncate">
                          {cat.name}
                        </span>
                        {grandChildren.length > 0 && (
                          <span className="text-[10px] font-bold text-muted-foreground/35 bg-muted/40 px-1.5 py-0.5 rounded-md shrink-0">
                            {grandChildren.length}
                          </span>
                        )}
                        <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>

                      {grandChildren.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-4 pl-9 pb-3 -mt-1">
                          {grandChildren.map(gc => (
                            <span
                              key={gc.id}
                              onClick={() => navigate(`/category/${gc.slug}`)}
                              className="text-[11px] font-semibold text-primary/70 bg-primary/6 border border-primary/12
                                px-2.5 py-1 rounded-lg
                                hover:bg-primary/12 hover:text-primary hover:border-primary/20
                                cursor-pointer transition-all active:scale-95"
                            >
                              {gc.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products Grid */}
          {isAllCategories ? null : (
            <>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="rounded-2xl overflow-hidden">
                      <div className="aspect-square skeleton-shimmer" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                        <div className="h-4 w-1/3 rounded skeleton-shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                    <Package size={28} className="text-muted-foreground/40" />
                  </div>
                  <p className="text-lg font-bold text-foreground/60">No products yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Check back soon for new arrivals</p>
                </div>
              ) : (
                <>
                  {subCategories.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Package size={16} className="text-primary" />
                      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">All Products</h2>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {products.map((product, i) => {
                      const img = getProductImage(product);
                      const discount = product.original_price && product.original_price > product.price
                        ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                        : 0;

                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => navigate(`/product/${product.slug}`)}
                          className="group cursor-pointer rounded-2xl bg-card border border-border/50 overflow-hidden
                            hover:shadow-[var(--shadow-card-hover)] hover:border-primary/20 transition-all duration-300"
                        >
                          <div className="aspect-square relative bg-muted/20 overflow-hidden">
                            {img ? (
                              <img
                                src={img}
                                alt={product.title}
                                loading="eager"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted/30" />
                            )}
                            {discount > 0 && (
                              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-destructive text-destructive-foreground text-[11px] font-bold shadow-sm">
                                -{discount}%
                              </span>
                            )}
                          </div>
                          <div className="p-3 md:p-4">
                            <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                              {product.title}
                            </h3>
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold text-primary">৳{product.price.toLocaleString()}</span>
                              {product.original_price && product.original_price > product.price && (
                                <span className="text-xs text-muted-foreground/60 line-through">৳{product.original_price.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <div className="hidden lg:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default CategoryPage;
