import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight, TrendingUp, Camera, ImageIcon, Loader2, Clock, Sparkles, Tag, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTracking } from "@/hooks/useTracking";

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

interface Suggestion {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const RECENT_SEARCHES_KEY = "goody_recent_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch { return []; }
}

function saveRecentSearch(term: string) {
  const recent = getRecentSearches().filter((s) => s !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const SearchOverlay = ({ open, onClose, initialQuery = "" }: SearchOverlayProps) => {
  const navigate = useNavigate();
  const { user, setAuthModalOpen } = useAuth();
  const { trackEvent } = useTracking();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSearching, setImageSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"text" | "image">("text");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const suggestRef = useRef<NodeJS.Timeout>();
  const panelRef = useRef<HTMLDivElement>(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setImagePreview(null);
      setSearchMode("text");
      setShowSuggestions(true);
      setShowImageOptions(false);
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
      setSuggestions([]);
      setImagePreview(null);
      setSearchMode("text");
      setShowImageOptions(false);
    }
  }, [open, initialQuery]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px), (pointer: coarse)");
    const update = () => setIsMobileOrTablet(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

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
      setImages((prev) => ({ ...prev, ...map }));
    }
  }, []);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.trim().length < 1) { setSuggestions([]); return; }
    try {
      const { data } = await supabase
        .from("products")
        .select("id, title, slug, category")
        .eq("in_stock", true)
        .or(`title.ilike.%${term.trim()}%,category.ilike.%${term.trim()}%`)
        .order("sold_count", { ascending: false, nullsFirst: false })
        .limit(6);
      setSuggestions((data as Suggestion[]) || []);
    } catch { setSuggestions([]); }
  }, []);

  const smartSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    setShowSuggestions(false);
    saveRecentSearch(term.trim());
    setRecentSearches(getRecentSearches());
    try {
      const { data, error } = await supabase.functions.invoke("smart-search", {
        body: { query: term.trim(), mode: "text" },
      });
      if (error) throw error;
      if (data?.results) {
        setResults(data.results);
        if (data.mode === "fallback_text") fetchImages(data.results.map((p: Product) => p.id));
      }
    } catch (err) {
      console.error("Smart search failed, falling back:", err);
      const { data, error } = await supabase.rpc("search_products", { search_term: term.trim(), max_results: 12 });
      if (!error && data) {
        setResults(data as Product[]);
        fetchImages((data as Product[]).map((p) => p.id));
      }
    }
    setLoading(false);
    trackEvent("search", { search_string: term.trim() });
  }, [fetchImages, trackEvent]);

  useEffect(() => {
    if (searchMode !== "text") return;
    if (suggestRef.current) clearTimeout(suggestRef.current);
    if (query.trim().length < 1) { setSuggestions([]); return; }
    suggestRef.current = setTimeout(() => fetchSuggestions(query), 150);
    return () => { if (suggestRef.current) clearTimeout(suggestRef.current); };
  }, [query, fetchSuggestions, searchMode]);

  useEffect(() => {
    if (searchMode !== "text") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); setShowSuggestions(true); return; }
    debounceRef.current = setTimeout(() => smartSearch(query), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, smartSearch, searchMode]);

  const handleSuggestionClick = (title: string) => {
    setQuery(title);
    setShowSuggestions(false);
    smartSearch(title);
  };

  const handleImageSearch = useCallback(async (file: File) => {
    if (!user) { setAuthModalOpen(true); return; }
    setImageSearching(true);
    setSearchMode("image");
    setResults([]);
    setSuggestions([]);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      try {
        const resized = await resizeImage(base64, 512);
        const { data, error } = await supabase.functions.invoke("smart-search", {
          body: { image_base64: resized, mode: "image" },
        });
        if (error) throw error;
        if (data?.results) setResults(data.results);
      } catch (err) { console.error("Image search failed:", err); }
      setImageSearching(false);
    };
    reader.readAsDataURL(file);
  }, [user, setAuthModalOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSearch(file);
    e.target.value = "";
  };

  const handleCameraClick = () => {
    if (isMobileOrTablet) {
      setShowImageOptions((v) => !v);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSelectImage = () => {
    setShowImageOptions(false);
    fileInputRef.current?.click();
  };

  const handleTakePhoto = () => {
    setShowImageOptions(false);
    cameraInputRef.current?.click();
  };

  const clearImageSearch = () => {
    setImagePreview(null);
    setSearchMode("text");
    setResults([]);
    setSuggestions([]);
    setQuery("");
    setShowSuggestions(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const getProductImage = (product: Product) => product.image_url || images[product.id] || null;
  const showSuggestionsList = showSuggestions && suggestions.length > 0 && query.trim().length >= 1 && !loading && searchMode === "text";
  // Filter out results below 60% similarity only for image search
  const filteredResults = searchMode === "image"
    ? results.filter(p => p.similarity == null || p.similarity >= 0.60)
    : results;
  const showResults = !showSuggestions && filteredResults.length > 0 && !loading && !imageSearching;
  const showImageResults = searchMode === "image" && !imageSearching && filteredResults.length > 0;
  const hasDiscount = (p: Product) => p.original_price && p.original_price > p.price;
  const discountPct = (p: Product) => hasDiscount(p) ? Math.round(((p.original_price! - p.price) / p.original_price!) * 100) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex flex-col"
        >
          {/* Backdrop with branded tint */}
           <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            initial={{ y: -30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="relative z-10 w-full max-w-[680px] mx-auto mt-3 md:mt-16 px-3 md:px-4"
          >
            {/* ─── Search Input ─── */}
            <div className="relative flex items-center rounded-2xl
              bg-card border border-border
              shadow-[0_8px_40px_-12px_hsla(197,55%,42%,0.15),0_2px_12px_-4px_hsla(0,0%,0%,0.08)]
              transition-shadow duration-300 focus-within:shadow-[0_8px_48px_-8px_hsla(197,55%,42%,0.25)]"
            >
              <div className="absolute left-4 flex items-center justify-center w-8 h-8 rounded-xl bg-primary/8">
                <Search size={17} className="text-primary" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSearchMode("text"); setImagePreview(null); setShowSuggestions(true); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim().length >= 2) {
                    setShowSuggestions(false);
                    smartSearch(query);
                  }
                }}
                placeholder="Search products..."
                className="w-full h-[52px] md:h-14 pl-14 pr-28 bg-transparent text-[15px] md:text-base font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                disabled={searchMode === "image" && imageSearching}
              />
              <div className="absolute right-2.5 flex items-center gap-0.5">
                <div className="relative">
                  <button
                    onClick={handleCameraClick}
                    className="p-2 rounded-xl hover:bg-primary/8 active:scale-95 transition-all group relative"
                    title={user ? "Search by image" : "Sign in for image search"}
                  >
                    {isMobileOrTablet ? (
                      <Camera size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    ) : (
                      <ImageIcon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    {!user && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-white" />
                    )}
                  </button>
                  <AnimatePresence>
                    {showImageOptions && (
                      <>
                        <div className="fixed inset-0 z-[101] bg-foreground/10" onClick={() => setShowImageOptions(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 12, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="fixed inset-x-3 bottom-4 z-[102] rounded-2xl bg-card border border-border shadow-lg overflow-hidden"
                        >
                          <button
                            onClick={handleSelectImage}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground hover:bg-muted/60 active:bg-muted transition-colors"
                          >
                            <ImageIcon size={16} className="text-primary" />
                            Select Image
                          </button>
                          <div className="h-px bg-border" />
                          <button
                            onClick={handleTakePhoto}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground hover:bg-muted/60 active:bg-muted transition-colors"
                          >
                            <Camera size={16} className="text-primary" />
                            Take Photo
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(""); setResults([]); setSuggestions([]); setShowSuggestions(true); inputRef.current?.focus(); }}
                    className="p-2 rounded-xl hover:bg-destructive/8 active:scale-95 transition-all"
                  >
                    <X size={16} className="text-muted-foreground hover:text-destructive transition-colors" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition-all ml-0.5"
                >
                  <span className="text-[11px] font-medium text-muted-foreground tracking-wide">ESC</span>
                </button>
              </div>
            </div>

            {/* ─── Image Preview ─── */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -8 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -8 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="mt-2"
                >
                  <div className="flex items-center gap-3 p-3 rounded-2xl
                    bg-muted/50 border border-border
                    shadow-[var(--shadow-card)]"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 border-primary/20 shadow-sm">
                      <img src={imagePreview} alt="Search" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {imageSearching ? (
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <Loader2 size={16} className="animate-spin text-primary" />
                            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-foreground">AI analyzing...</p>
                             <p className="text-[11px] font-medium text-muted-foreground">Finding matching products</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                         <p className="text-sm font-bold text-foreground">
                             {filteredResults.length > 0
                               ? `${filteredResults.length} product(s) found`
                               : "No matching products"}
                           </p>
                           <p className="text-[11px] font-medium text-muted-foreground">Image search results</p>
                        </div>
                      )}
                    </div>
                    <button onClick={clearImageSearch} className="p-2 rounded-xl hover:bg-destructive/8 transition-all active:scale-95">
                      <X size={15} className="text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Results Panel ─── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-2 max-h-[65vh] md:max-h-[60vh] overflow-y-auto overscroll-contain rounded-2xl
                bg-card border border-border
                shadow-[0_12px_48px_-12px_hsla(197,55%,42%,0.12),0_4px_16px_-6px_hsla(0,0%,0%,0.08)]"
              style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--muted)) transparent" }}
            >

              {/* ── Autocomplete Suggestions ── */}
              {showSuggestionsList && (
                <div className="p-2">
                  <div className="px-3 py-2 flex items-center gap-2">
                    <Sparkles size={12} className="text-secondary" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Suggestions</span>
                  </div>
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, type: "spring", damping: 20 }}
                      onClick={() => handleSuggestionClick(s.title)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl
                        hover:bg-primary/5 active:bg-primary/8 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <Search size={13} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] md:text-sm font-medium text-foreground truncate">
                          {highlightMatch(s.title, query)}
                        </p>
                        <span className="text-[11px] text-muted-foreground/70">{s.category}</span>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── Skeleton Loading ── */}
              {(loading || imageSearching) && (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-[52px] h-[52px] rounded-xl bg-muted/60" />
                      <div className="flex-1 space-y-2 py-1.5">
                        <div className="h-3.5 bg-muted/60 rounded-lg w-3/4" />
                        <div className="h-3 bg-muted/40 rounded-lg w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── No Results ── */}
              {!loading && !imageSearching && !showSuggestions && searchMode === "text" && query.trim().length >= 2 && filteredResults.length === 0 && (
                <div className="p-10 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
                    <Search size={22} className="text-muted-foreground/40" />
                  </div>
                   <p className="text-sm font-bold text-foreground/70">No products found</p>
                   <p className="text-xs font-medium text-muted-foreground/60 mt-1">Try a different keyword</p>
                </div>
              )}

              {!loading && !imageSearching && searchMode === "image" && imagePreview && filteredResults.length === 0 && (
                <div className="p-10 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
                    <ImageIcon size={22} className="text-muted-foreground/40" />
                  </div>
                   <p className="text-sm font-bold text-foreground/70">No matching products for this image</p>
                   <p className="text-xs font-medium text-muted-foreground/60 mt-1">Try a different image</p>
                </div>
              )}

              {/* ── Product Results ── */}
              {(showResults || showImageResults) && (
                <div className="p-2">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={12} className="text-primary" />
                       <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                         {searchMode === "image" ? "Matching Products" : "Search Results"}
                       </span>
                    </div>
                     <span className="text-[11px] font-medium text-muted-foreground/60">{filteredResults.length} items</span>
                   </div>
                   {filteredResults.map((product, i) => {
                    const imgUrl = getProductImage(product);
                    const discount = discountPct(product);
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.035, type: "spring", damping: 22 }}
                      >
                        <Link
                          to={`/product/${product.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-3 p-2.5 rounded-xl
                            hover:bg-primary/5 active:bg-primary/8 transition-all group"
                        >
                          <div className="relative w-[52px] h-[52px] md:w-14 md:h-14 rounded-xl bg-muted/30 overflow-hidden shrink-0
                            border border-border/30 group-hover:border-primary/20 transition-colors shadow-sm">
                            {imgUrl ? (
                              <img src={imgUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <span className="text-xl flex items-center justify-center w-full h-full">{product.emoji || "📦"}</span>
                            )}
                            {discount > 0 && (
                              <div className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold px-1 py-0.5 rounded-md shadow-sm">
                                -{discount}%
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] md:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {product.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[13px] font-bold text-primary">৳{product.price.toLocaleString()}</span>
                              {hasDiscount(product) && (
                                <span className="text-[11px] text-muted-foreground/60 line-through">৳{product.original_price!.toLocaleString()}</span>
                              )}
                              <span className="text-[10px] text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded-md">{product.category}</span>
                              {product.similarity != null && searchMode === "image" && (
                                 <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-md">
                                   {Math.round(product.similarity * 100)}% match
                                 </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight size={15} className="text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                        </Link>
                      </motion.div>
                    );
                  })}
                   {/* See All Button */}
                   {filteredResults.length >= 2 && query.trim() && (
                     <div className="px-3 pb-3 pt-1">
                       <button
                         onClick={() => {
                           onClose();
                           navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                         }}
                         className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                           bg-primary/8 border border-primary/15
                           hover:bg-primary/12 hover:border-primary/25
                           active:scale-[0.99] transition-all group"
                       >
                         <span className="text-sm font-bold text-primary">See All Products</span>
                         <ExternalLink size={14} className="text-primary/60 group-hover:text-primary transition-colors" />
                       </button>
                     </div>
                   )}
                 </div>
               )}

              {/* ── Empty State: Recent + Trending ── */}
              {!loading && !imageSearching && searchMode === "text" && query.trim().length < 1 && !imagePreview && (
                <div className="p-5 md:p-6">
                  {/* Recent searches */}
                  {recentSearches.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock size={13} className="text-muted-foreground/60" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Recent</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => { setQuery(term); setShowSuggestions(false); smartSearch(term); }}
                            className="px-3 py-1.5 rounded-xl
                              bg-muted/30 border border-border/30
                              text-xs font-medium text-foreground/60
                              hover:bg-primary/8 hover:border-primary/20 hover:text-primary
                              active:scale-95 transition-all"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending */}
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={13} className="text-secondary" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Trending</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["Smart Watch", "Earbuds", "Hoodie", "Shoes", "LED Lamp", "Serum"].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => { setQuery(tag); setShowSuggestions(false); smartSearch(tag); }}
                        className="px-3 py-1.5 rounded-xl
                          bg-gradient-to-r from-primary/5 to-secondary/5
                          border border-primary/10
                          text-xs font-medium text-foreground/70
                          hover:from-primary/10 hover:to-secondary/10 hover:border-primary/20 hover:text-primary
                          active:scale-95 transition-all"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* Image search hint */}
                  <div className="mt-5 pt-4 border-t border-border/30">
                    <button
                      onClick={handleCameraClick}
                      className="flex items-center gap-3 w-full p-3 rounded-xl
                        bg-gradient-to-r from-primary/5 to-transparent
                        border border-primary/10
                        hover:from-primary/8 hover:border-primary/20
                        active:scale-[0.99] transition-all group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        {isMobileOrTablet ? <Camera size={16} className="text-primary" /> : <ImageIcon size={16} className="text-primary" />}
                      </div>
                      <div className="text-left">
                         <p className="text-[13px] font-bold text-foreground/80">
                           {user ? "Search by image" : "Sign in for image search"}
                         </p>
                         <p className="text-[11px] font-medium text-muted-foreground/60">AI-powered image recognition</p>
                      </div>
                      <ArrowRight size={14} className="ml-auto text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ── Keyboard Hint (Desktop) ── */}
            <div className="hidden md:flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-foreground/40">
               <span><kbd className="px-1.5 py-0.5 rounded bg-muted/30 border border-border/30 font-mono text-[10px]">↵</kbd> <strong>Search</strong></span>
               <span><kbd className="px-1.5 py-0.5 rounded bg-muted/30 border border-border/30 font-mono text-[10px]">ESC</kbd> <strong>Close</strong></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-primary bg-primary/8 px-0.5 rounded">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

async function resizeImage(base64: string, maxSize: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
      } else {
        if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = base64;
  });
}

export default SearchOverlay;
