import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowLeft, Loader2, PackageOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useTracking } from "@/hooks/useTracking";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  original_price: number | null;
  category: string;
  emoji: string | null;
  image_url?: string | null;
  similarity?: number | null;
}

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { trackEvent } = useTracking();

  const fetchImages = useCallback(async (productIds: string[]) => {
    if (!productIds.length) return;
    const { data } = await supabase
      .from("product_images")
      .select("product_id, image_url")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((img) => {
        if (!map[img.product_id]) map[img.product_id] = img.image_url;
      });
      setImages(map);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) { setProducts([]); setLoading(false); return; }
    const doSearch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("smart-search", {
          body: { query: query.trim(), mode: "text" },
        });
        if (error) throw error;
        if (data?.results) {
          setProducts(data.results);
          const ids = data.results.map((p: Product) => p.id);
          // fetch images for fallback results
          if (data.mode === "fallback_text") fetchImages(ids);
          // also fetch for semantic results missing image_url
          const missingIds = data.results.filter((p: Product) => !p.image_url).map((p: Product) => p.id);
          if (missingIds.length) fetchImages(missingIds);
        }
      } catch (err) {
        console.error("Search failed, using fallback:", err);
        const { data } = await supabase.rpc("search_products", { search_term: query.trim(), max_results: 50 });
        if (data) {
          setProducts(data as Product[]);
          fetchImages((data as Product[]).map((p) => p.id));
        }
      }
      setLoading(false);
      trackEvent("search", { search_string: query.trim() });
    };
    doSearch();
  }, [query, fetchImages]);

  const getImage = (p: Product) => {
    const url = p.image_url || images[p.id];
    return url ? optimizeCloudinaryUrl(url, 400) : null;
  };

  // Filter out results below 60% similarity only for image-based searches (text search keeps all)
  const filteredProducts = products;

  const hasDiscount = (p: Product) => p.original_price && p.original_price > p.price;
  const discountPct = (p: Product) =>
    hasDiscount(p) ? Math.round(((p.original_price! - p.price) / p.original_price!) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20 pb-28 md:pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              to="/"
              className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <ArrowLeft size={18} className="text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Search Results
              </h1>
              {query && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Showing results for <strong>"{query}"</strong>
                  {!loading && ` — ${filteredProducts.length} product(s) found`}
                </p>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Searching products...</p>
            </div>
          )}

          {/* No Results */}
          {!loading && filteredProducts.length === 0 && query && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center">
                <PackageOpen size={28} className="text-muted-foreground/50" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground/70">No products found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try searching with different keywords
                </p>
              </div>
              <Link
                to="/"
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Back to Home
              </Link>
            </div>
          )}

          {/* Product Grid */}
           {!loading && filteredProducts.length > 0 && (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
               {filteredProducts.map((product, i) => {
                const imgUrl = getImage(product);
                const discount = discountPct(product);
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, type: "spring", damping: 22 }}
                  >
                    <Link
                      to={`/product/${product.slug}`}
                      className="group block rounded-2xl bg-card border border-border/50 overflow-hidden
                        hover:shadow-[var(--shadow-card-hover)] hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="relative aspect-square bg-muted/20 overflow-hidden">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={product.title}
                            loading="eager"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <span className="text-3xl flex items-center justify-center w-full h-full">
                            {product.emoji || "📦"}
                          </span>
                        )}
                        {discount > 0 && (
                          <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
                            -{discount}%
                          </div>
                        )}
                        {product.similarity != null && (
                          <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
                            {Math.round(product.similarity * 100)}% match
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {product.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">
                          {product.category}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-bold text-primary">
                            ৳{product.price.toLocaleString()}
                          </span>
                          {hasDiscount(product) && (
                            <span className="text-[11px] text-muted-foreground/50 line-through">
                              ৳{product.original_price!.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default SearchResults;
