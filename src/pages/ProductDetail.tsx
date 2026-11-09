import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Truck, ShieldCheck, Minus, Plus, ShoppingCart, ChevronDown, ChevronUp, Camera, X, ChevronLeft, ChevronRight, Share2, Clock, Tag, Plane, Package, Scale, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendReviewThankYouEmail } from "@/lib/emailUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { optimizeCloudinaryUrl, uploadToCloudinary } from "@/lib/cloudinary";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTracking } from "@/hooks/useTracking";
import { getAllCatalogContentIds } from "@/lib/catalogIds";
import Navbar from "@/components/Navbar";

import MobileBottomNav from "@/components/MobileBottomNav";

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
}

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  original_price: number | null;
  category: string;
  category_id: string | null;
  sizes: string[];
  emoji: string;
  rating: number;
  reviews_count: number;
  in_stock: boolean;
  meta_title?: string;
  meta_description?: string;
  variants?: VariantGroup[];
  min_quantity?: number;
  stock?: number;
  estimated_weight_gm?: number;
  shipping_charge_type?: string;
  shipping_rate_override?: number | null;
}

interface CategoryShipping {
  shipping_rate_per_kg: number;
  shipping_rate_per_piece: number;
}

interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface ActiveCampaign {
  id: string;
  title: string;
  end_date: string;
  discount_percentage: number;
  min_order_amount: number | null;
  max_discount: number | null;
  discount_description: string | null;
  rules_text: string | null;
}

function useCampaignCountdown(endDate: string) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        return "00:00:00:00";
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return `${String(d).padStart(2, "0")}:${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [endDate]);
  return { timeLeft, expired };
}

const DealCountdownInline = ({ endDate }: { endDate: string }) => {
  const { timeLeft, expired } = useCampaignCountdown(endDate);
  if (expired) return <span className="text-xs font-bold text-destructive">Expired</span>;
  return <span className="text-xs font-bold text-destructive">Ends in {timeLeft}</span>;
};

const setMeta = (name: string, content: string, attr = "name") => {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.content = content;
};

const setJsonLd = (data: object) => {
  let el = document.querySelector('script[data-product-jsonld]') as HTMLScriptElement;
  if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.setAttribute("data-product-jsonld", "true"); document.head.appendChild(el); }
  el.textContent = JSON.stringify(data);
};

const cleanupSeo = () => {
  const jsonLd = document.querySelector('script[data-product-jsonld]');
  if (jsonLd) jsonLd.remove();
  document.title = "GoodyHut - Best Deals Online";
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = useTracking();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<"specifications" | "description" | "reviews">("specifications");
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});
  const [showAllVariants, setShowAllVariants] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  // Review hooks (must be before early returns)
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewAnonymous, setReviewAnonymous] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(0);
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [activeDeal, setActiveDeal] = useState<{ discount_percentage: number; label: string; end_date: string } | null>(null);
  const [categoryShipping, setCategoryShipping] = useState<CategoryShipping | null>(null);

  // Flatten all variant options
  const allVariantOptions: (VariantOption & { groupName: string })[] = product?.variants
    ? product.variants.flatMap(g => g.options.map(o => ({ ...o, groupName: g.name })))
    : [];

  const hasVariants = allVariantOptions.length > 0;

  // Selected variants (quantity > 0)
  const selectedOptions = allVariantOptions.filter(o => (variantQuantities[o.id] || 0) > 0);
  const totalVariantQty = selectedOptions.reduce((s, o) => s + (variantQuantities[o.id] || 0), 0);

  // Smart min quantity: max of selected variants' min_quantity
  const effectiveMinQty = selectedOptions.length > 0
    ? Math.max(...selectedOptions.map(o => o.min_quantity ?? product?.min_quantity ?? 1))
    : product?.min_quantity ?? 1;

  // Get effective discount percentage (deal > campaign)
  const effectiveDiscountPct = activeDeal ? activeDeal.discount_percentage : (activeCampaign ? activeCampaign.discount_percentage : 0);

  // Total price calculation (with discount applied)
  const variantTotalPrice = selectedOptions.reduce((s, o) => {
    const price = o.price ?? product?.price ?? 0;
    const discountedPrice = effectiveDiscountPct > 0 ? Math.round(price * (1 - effectiveDiscountPct / 100)) : price;
    return s + discountedPrice * (variantQuantities[o.id] || 0);
  }, 0);

  // Original total (without discount) for showing savings
  const variantOriginalTotal = selectedOptions.reduce((s, o) => {
    const price = o.price ?? product?.price ?? 0;
    return s + price * (variantQuantities[o.id] || 0);
  }, 0);

  const noVariantTotalPrice = (() => {
    const price = product?.price ?? 0;
    const discountedPrice = effectiveDiscountPct > 0 ? Math.round(price * (1 - effectiveDiscountPct / 100)) : price;
    return discountedPrice * quantity;
  })();
  const displayTotalPrice = hasVariants ? variantTotalPrice : noVariantTotalPrice;

  // Compute cargo charge at component level for reuse in button
  const computedCargoCharge = (() => {
    if (!product) return 0;
    const chargeType = product.shipping_charge_type || "per_kg";
    const rate = product.shipping_rate_override ?? (chargeType === "per_piece"
      ? (categoryShipping?.shipping_rate_per_piece || 0)
      : (categoryShipping?.shipping_rate_per_kg || 0));
    if (rate <= 0) return 0;
    let effectiveWeight = product.estimated_weight_gm || 0;
    if (hasVariants && selectedOptions.length > 0) {
      const variantsWithWeight = selectedOptions.filter((o: any) => o.weight && parseFloat(o.weight) > 0);
      if (variantsWithWeight.length > 0) {
        const totalWeightedGm = variantsWithWeight.reduce((s: number, o: any) => s + (parseFloat(o.weight) || 0) * (variantQuantities[o.id] || 1), 0);
        const totalQty = variantsWithWeight.reduce((s: number, o: any) => s + (variantQuantities[o.id] || 1), 0);
        effectiveWeight = totalWeightedGm / totalQty;
      }
    }
    const qty = hasVariants ? Math.max(totalVariantQty, 1) : quantity;
    if (chargeType === "per_piece") return rate * qty;
    return rate * (effectiveWeight / 1000) * qty;
  })();
  const displayTotalWithShipping = displayTotalPrice + Math.round(computedCargoCharge);

  const updateVariantQty = (optionId: string, delta: number) => {
    setVariantQuantities(prev => {
      const current = prev[optionId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [optionId]: next };
    });
  };

  const setVariantQtyDirect = (optionId: string, val: number) => {
    setVariantQuantities(prev => ({ ...prev, [optionId]: Math.max(0, val) }));
  };

  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await supabase.from("products").select("*").eq("slug", id).single();
      if (data) {
        const p = data as unknown as Product;
        setProduct(p);
        const minQ = (data as any).min_quantity || 1;
        setQuantity(Math.max(1, minQ));

        // Track view_item (ViewContent) — content_ids match catalog feed g:id
        const catalogIds = getAllCatalogContentIds(p.id, p.variants);
        trackEvent("view_item", {
          item_id: p.id,
          item_name: p.title,
          price: p.price,
          currency: "BDT",
          item_category: p.category,
          content_ids: catalogIds,
          content_type: "product",
          value: p.price,
        });

        const { data: imgs } = await supabase.from("product_images").select("*").eq("product_id", p.id).order("sort_order");
        setImages((imgs || []) as ProductImage[]);

        const { data: related } = await supabase.from("products").select("id, slug, title, price, rating, reviews_count, category, product_images(image_url, sort_order)").eq("category", p.category).neq("id", p.id).eq("in_stock", true).limit(8);
        if (related) setRelatedProducts(related.map((r: any) => ({ ...r, _image: r.product_images?.[0]?.image_url })) as unknown as Product[]);

        // SEO
        const siteUrl = window.location.origin;
        const productUrl = `${siteUrl}/product/${p.slug}`;
        const metaTitle = (p.meta_title || p.title) + " | GoodyHut";
        const metaDesc = p.meta_description || p.description || `Buy ${p.title} at the best price. Shop now at GoodyHut!`;
        const firstImg = imgs && imgs.length > 0 ? optimizeCloudinaryUrl((imgs[0] as any).image_url, 800) : `${siteUrl}/favicon-96x96.png`;

        document.title = metaTitle;
        setMeta("description", metaDesc.slice(0, 160));
        setMeta("robots", "index, follow");
        setMeta("og:type", "product", "property");
        setMeta("og:title", metaTitle, "property");
        setMeta("og:description", metaDesc.slice(0, 160), "property");
        setMeta("og:url", productUrl, "property");
        setMeta("og:image", firstImg, "property");
        setMeta("og:site_name", "GoodyHut", "property");
        setMeta("twitter:card", "summary_large_image");
        setMeta("twitter:title", metaTitle);
        setMeta("twitter:description", metaDesc.slice(0, 160));
        setMeta("twitter:image", firstImg);

        let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
        if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
        canonical.href = productUrl;

        const jsonLd: any = {
          "@context": "https://schema.org", "@type": "Product", name: p.title,
          description: p.description || metaDesc, url: productUrl,
          image: imgs ? (imgs as any[]).map(img => optimizeCloudinaryUrl(img.image_url, 800)) : [firstImg],
          brand: { "@type": "Brand", name: "GoodyHut" },
          offers: { "@type": "Offer", url: productUrl, priceCurrency: "BDT", price: p.price,
            availability: p.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: "GoodyHut" },
          },
          category: p.category,
        };
        if (p.rating && p.reviews_count) {
          jsonLd.aggregateRating = { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews_count };
        }
        setJsonLd(jsonLd);
      }
      setLoading(false);
    };
    fetchProduct();
    window.scrollTo(0, 0);
    // Fetch user profile
    if (user) {
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single()
        .then(({ data }) => setUserProfile(data));
    }
    return () => cleanupSeo();
  }, [id]);

  // Fetch active campaign for this product
  // Fetch category shipping rates
  useEffect(() => {
    if (!product?.category_id) return;
    supabase.from("categories").select("shipping_rate_per_kg, shipping_rate_per_piece").eq("id", product.category_id).single()
      .then(({ data }) => { if (data) setCategoryShipping(data as CategoryShipping); });
  }, [product?.category_id]);

  useEffect(() => {
    if (!product) return;
    const fetchCampaign = async () => {
      const now = new Date().toISOString();
      const { data: cpData } = await supabase
        .from("campaign_products")
        .select("discount_percentage, campaign_id")
        .eq("product_id", product.id);
      if (!cpData?.length) return;
      for (const cp of cpData) {
        const { data: camp } = await supabase
          .from("campaigns")
          .select("id, title, end_date, min_order_amount, max_discount, discount_description, rules_text")
          .eq("id", cp.campaign_id)
          .eq("active", true)
          .lte("start_date", now)
          .gte("end_date", now)
          .single();
        if (camp) {
          setActiveCampaign({
            id: camp.id, title: camp.title, end_date: camp.end_date,
            discount_percentage: cp.discount_percentage || 0,
            min_order_amount: (camp as any).min_order_amount,
            max_discount: (camp as any).max_discount,
            discount_description: (camp as any).discount_description,
            rules_text: (camp as any).rules_text,
          });
          break;
        }
      }
    };
    fetchCampaign();

    // Fetch active deal
    const fetchDeal = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("product_deals")
        .select("discount_percentage, label, end_date")
        .eq("product_id", product.id)
        .eq("active", true)
        .lte("start_date", now)
        .gte("end_date", now)
        .limit(1)
        .single();
      if (data) setActiveDeal(data as any);
    };
    fetchDeal();
  }, [product?.id]);

  const { timeLeft: campaignCountdown, expired: campaignExpired } = useCampaignCountdown(activeCampaign?.end_date || new Date().toISOString());

  // Auto-hide campaign banner when expired
  useEffect(() => {
    if (campaignExpired && activeCampaign) {
      setActiveCampaign(null);
    }
  }, [campaignExpired]);

  const handleAddToCart = async () => {
    if (!product) return;

    if (hasVariants) {
      if (totalVariantQty === 0) {
        toast({ title: "No variant selected", description: "Please select at least one variant.", variant: "destructive" });
        return;
      }
      if (totalVariantQty < effectiveMinQty) {
        toast({
          title: `Minimum ${effectiveMinQty} pieces required`,
          description: `Total selected variants must be at least ${effectiveMinQty} pieces. Currently ${totalVariantQty} selected.`,
          variant: "destructive",
        });
        return;
      }
      setAdding(true);
      for (const opt of selectedOptions) {
        const qty = variantQuantities[opt.id] || 0;
        if (qty > 0) {
          const variantLabel = `${opt.groupName}: ${opt.name}`;
          await addToCart(product.id, variantLabel, qty);
        }
      }
      setAdding(false);
      toast({ title: "Added to cart! ✓", description: `${totalVariantQty} items added to your cart.` });
    } else {
      const minQ = product.min_quantity ?? 1;
      if (quantity < minQ) {
        toast({ title: `Minimum ${minQ} pieces required`, description: `This product requires at least ${minQ} pieces per order.`, variant: "destructive" });
        setQuantity(minQ);
        return;
      }
      setAdding(true);
      await addToCart(product.id, undefined, quantity);
      setAdding(false);
      toast({ title: "Added to cart! ✓", description: `${quantity} ${quantity > 1 ? 'items' : 'item'} added to your cart.` });
    }
  };

  const fetchReviews = async () => {
    if (!product) return;
    setReviewLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("*, profiles:user_id(full_name, avatar_url)")
      .eq("product_id", product.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    setReviews(data || []);
    setReviewLoading(false);
  };

  useEffect(() => {
    if (product) fetchReviews();
  }, [product?.id]);

  const hasImages = images.length > 0;


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-2 md:pt-24 container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10">
            <div className="aspect-square rounded-3xl skeleton-shimmer" />
            <div className="space-y-4 py-8">
              <div className="h-8 w-3/4 rounded-full skeleton-shimmer" />
              <div className="h-4 w-1/2 rounded-full skeleton-shimmer" />
              <div className="h-6 w-1/3 rounded-full skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const basePrice = product.price;
  const discount = product.original_price
    ? Math.round(((product.original_price - basePrice) / product.original_price) * 100)
    : 0;

  const VISIBLE_VARIANTS = 5;
  const visibleOptions = showAllVariants ? allVariantOptions : allVariantOptions.slice(0, VISIBLE_VARIANTS);


  const handleReviewImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReviewImages(prev => [...prev, ...files].slice(0, 5));
  };

  const handleSubmitReview = async () => {
    if (!user || !product) return;
    if (reviewRating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    try {
      // Upload images to Cloudinary
      const imageUrls: string[] = [];
      for (const file of reviewImages) {
        const url = await uploadToCloudinary(file, "goodyhut/reviews");
        imageUrls.push(url);
      }

      const { error } = await supabase.from("reviews").insert({
        user_id: user.id,
        product_id: product.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        images: imageUrls,
        status: "pending",
        verified_purchase: true,
      });

      if (error) throw error;
      toast({ title: "Review submitted!", description: "Your review is pending approval." });
      
      // Send thank you email (non-blocking)
      sendReviewThankYouEmail(user.id, product.title).catch(console.error);
      
      setReviewRating(0);
      setReviewComment("");
      setReviewImages([]);
      setReviewAnonymous(false);
    } catch {
      toast({ title: "Failed to submit review", variant: "destructive" });
    }
    setSubmittingReview(false);
  };

  const openLightbox = (images: string[], startIdx: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIdx);
    setLightboxOpen(true);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="pt-2 md:pt-24 pb-20 lg:pb-10 container mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-200 mb-6 font-body px-3 py-2 -ml-3 rounded-xl hover:bg-muted/60 active:bg-muted min-h-[44px] min-w-[44px] touch-manipulation"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span>Back</span>
        </button>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
          {/* Image Gallery */}
          <div>
            <div key={selectedImage}
              className="aspect-square rounded-3xl bg-muted/40 border border-border/50 flex items-center justify-center mb-4 overflow-hidden">
              {hasImages ? (
                <img src={optimizeCloudinaryUrl(images[selectedImage]?.image_url, 800)} alt={`${product.title} - Image ${selectedImage + 1}`} className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
              ) : (
                <div className="w-full h-full bg-muted/60" />
              )}
            </div>
            {hasImages && images.length > 1 && (
              <div ref={thumbnailsRef} className="grid grid-cols-4 gap-3">
                {images.slice(0, 4).map((img, i) => (
                  <button key={img.id} onClick={() => setSelectedImage(i)}
                    className={`aspect-square rounded-2xl overflow-hidden border flex items-center justify-center transition-all ${
                      i === selectedImage ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/40"
                    }`}>
                    <img src={optimizeCloudinaryUrl(img.image_url, 200)} alt={`${product.title} thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{product.category}</span>
              <button
                onClick={() => {
                  const url = window.location.href;
                  const text = `${product.title} - ৳${product.price.toLocaleString()}`;
                  if (navigator.share) {
                    navigator.share({ title: product.title, text, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url);
                    toast({ title: "Link copied!" });
                  }
                }}
                className="p-2 rounded-xl border border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Share product"
              >
                <Share2 size={18} />
              </button>
            </div>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-3">{product.title}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className={i < Math.floor(product.rating) ? "text-secondary fill-secondary" : "text-muted-foreground/30"} />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">{product.rating}</span>
              <span className="text-sm text-muted-foreground">({product.reviews_count} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-display font-bold text-primary">৳{basePrice.toLocaleString()}</span>
              {product.original_price && discount > 0 && (
                <>
                  <span className="text-lg text-muted-foreground line-through">৳{product.original_price.toLocaleString()}</span>
                  <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold">-{discount}%</span>
                </>
              )}
            </div>

            {/* Deal Banner */}
            {activeDeal && (
              <div className="mb-5 rounded-xl bg-primary/10 border border-primary/30 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <span className="font-bold text-sm text-foreground">
                      {activeDeal.label} — {activeDeal.discount_percentage}% OFF!
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-destructive/10 rounded-full px-2.5 py-1">
                    <Clock size={13} className="text-destructive" />
                    <DealCountdownInline endDate={activeDeal.end_date} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Deal price: ৳{Math.round(basePrice * (1 - activeDeal.discount_percentage / 100)).toLocaleString()}</p>
              </div>
            )}

            {/* Campaign Offer Banner */}
            {activeCampaign && (
              <>
                <div className="mb-5 rounded-xl bg-accent/30 border border-accent p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔥</span>
                      <span className="font-bold text-sm text-foreground">
                        {activeCampaign.discount_description || `${activeCampaign.title}! ${activeCampaign.discount_percentage}% OFF`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-destructive/10 rounded-full px-2.5 py-1">
                      <Clock size={13} className="text-destructive" />
                      <span className="text-xs font-bold text-destructive">Ends in {campaignCountdown}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setRulesDialogOpen(true)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    View Rules
                  </button>
                </div>

                {/* Rules Dialog */}
                <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-lg">{activeCampaign.discount_description || activeCampaign.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 text-sm text-foreground">
                      <p>📢 Dear customer, we have a special offer just for you! 🎉 Follow the conditions below to enjoy the offer —</p>
                      <p className="font-semibold">📋 Offer Terms & Conditions</p>
                      <ul className="space-y-1.5">
                        {activeCampaign.min_order_amount ? (
                          <li className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-[10px]">✅</span>
                            Minimum product price must be ৳{activeCampaign.min_order_amount.toLocaleString()}
                          </li>
                        ) : null}
                        {activeCampaign.max_discount ? (
                          <li className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-[10px]">✅</span>
                            Maximum discount up to ৳{activeCampaign.max_discount.toLocaleString()}
                          </li>
                        ) : null}
                      </ul>
                      <div>
                        <p className="font-semibold">💰 Discount Benefit</p>
                        <p>Get on every product that meets the above conditions</p>
                        <p className="font-bold text-primary">{activeCampaign.discount_percentage}% Flat Discount 🎁</p>
                      </div>
                      {activeCampaign.rules_text && (
                        <div className="whitespace-pre-wrap text-muted-foreground text-xs border-t border-border pt-2">
                          {activeCampaign.rules_text}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">⏳ Limited time! Order now and enjoy amazing discounts!</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}


            {hasVariants && (
              <div className="mb-6">
                {/* Desktop Table */}
                <div className="hidden sm:block border border-border rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr] bg-muted/50 border-b border-border">
                    <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {product.variants?.[0]?.name || "Variant"}
                    </div>
                    <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price</div>
                    <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</div>
                    <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Quantity</div>
                  </div>

                  <AnimatePresence initial={false}>
                    {visibleOptions.map((opt, idx) => {
                      const qty = variantQuantities[opt.id] || 0;
                      const optPrice = opt.price ?? basePrice;
                      const optDiscountedPrice = effectiveDiscountPct > 0 ? Math.round(optPrice * (1 - effectiveDiscountPct / 100)) : optPrice;
                      const isSelected = qty > 0;
                      return (
                        <motion.div
                          key={opt.id}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0, backgroundColor: isSelected ? "hsl(var(--primary) / 0.04)" : "transparent" }}
                          transition={{ duration: 0.2, delay: idx * 0.03 }}
                          className={`grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr] items-center border-b border-border/50 last:border-b-0 transition-colors ${
                            isSelected ? "ring-1 ring-inset ring-primary/20" : idx % 2 === 0 ? "bg-card" : "bg-muted/20"
                          } hover:bg-muted/30`}
                        >
                          <div className="px-4 py-3">
                            <span className="text-sm font-medium text-foreground">
                              {opt.name}
                            </span>
                            {(opt.size || opt.weight) && (
                              <div className="flex gap-2 mt-0.5">
                                {opt.size && <span className="text-[10px] text-muted-foreground">Size: {opt.size}</span>}
                                {opt.weight && <span className="text-[10px] text-muted-foreground">Wt: {opt.weight}</span>}
                              </div>
                            )}
                          </div>
                          <div className="px-4 py-3 text-sm font-semibold">
                            {effectiveDiscountPct > 0 ? (
                              <span className="flex items-center gap-1.5">
                                <span className="text-primary">৳{optDiscountedPrice.toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground line-through">৳{optPrice.toLocaleString()}</span>
                              </span>
                            ) : (
                              <span className="text-foreground">৳{optPrice.toLocaleString()}</span>
                            )}
                          </div>
                          <div className="px-4 py-3 text-sm text-muted-foreground">{product.stock ?? "∞"}</div>
                          <div className="px-4 py-3 flex items-center justify-center gap-1">
                            <button onClick={() => updateVariantQty(opt.id, -1)}
                              className="w-8 h-8 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                              <Minus size={14} />
                            </button>
                            <motion.div key={qty} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                              <input type="number" value={qty} onChange={e => setVariantQtyDirect(opt.id, parseInt(e.target.value) || 0)}
                                className="w-12 h-8 text-center text-sm font-semibold bg-background border border-border/50 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </motion.div>
                            <button onClick={() => updateVariantQty(opt.id, 1)}
                              className="w-8 h-8 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                              <Plus size={14} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Mobile Stacked Cards */}
                <div className="sm:hidden space-y-2">
                  <AnimatePresence initial={false}>
                    {visibleOptions.map((opt, idx) => {
                      const qty = variantQuantities[opt.id] || 0;
                      const optPrice = opt.price ?? basePrice;
                      const optDiscountedPrice = effectiveDiscountPct > 0 ? Math.round(optPrice * (1 - effectiveDiscountPct / 100)) : optPrice;
                      const isSelected = qty > 0;
                      return (
                        <motion.div
                          key={opt.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.04 }}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isSelected
                              ? "border-primary/40 bg-primary/5 shadow-sm"
                              : "border-border/50 bg-card"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2.5">
                            <div>
                              <span className="text-sm font-semibold text-foreground">
                                {opt.name}
                              </span>
                              {(opt.size || opt.weight) && (
                                <div className="flex gap-2 mt-0.5">
                                  {opt.size && <span className="text-[10px] text-muted-foreground">Size: {opt.size}</span>}
                                  {opt.weight && <span className="text-[10px] text-muted-foreground">Wt: {opt.weight}</span>}
                                </div>
                              )}
                            </div>
                            {effectiveDiscountPct > 0 ? (
                              <span className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-primary">৳{optDiscountedPrice.toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground line-through">৳{optPrice.toLocaleString()}</span>
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-primary">৳{optPrice.toLocaleString()}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Stock: {product.stock ?? "∞"}</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => updateVariantQty(opt.id, -1)}
                                className="w-8 h-8 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                                <Minus size={14} />
                              </button>
                              <motion.div key={qty} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                                <input type="number" value={qty} onChange={e => setVariantQtyDirect(opt.id, parseInt(e.target.value) || 0)}
                                  className="w-11 h-8 text-center text-sm font-semibold bg-background border border-border/50 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </motion.div>
                              <button onClick={() => updateVariantQty(opt.id, 1)}
                                className="w-8 h-8 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Show More / Less */}
                {allVariantOptions.length > VISIBLE_VARIANTS && (
                  <button onClick={() => setShowAllVariants(prev => !prev)}
                    className="w-full flex items-center justify-center gap-1 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {showAllVariants ? <>Show Less <ChevronUp size={16} /></> : <>Show More ({allVariantOptions.length - VISIBLE_VARIANTS} more) <ChevronDown size={16} /></>}
                  </button>
                )}

                {/* Summary bar */}
                <AnimatePresence>
                  {totalVariantQty > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground">সিলেক্টেড:</span>{" "}
                            <span className="font-semibold text-foreground">{selectedOptions.length} ভ্যারিয়েন্ট, {totalVariantQty} পিছ</span>
                          </div>
                          <div className="text-right">
                            <motion.div key={variantTotalPrice} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="font-display font-bold text-primary text-lg">
                              ৳{variantTotalPrice.toLocaleString()}
                            </motion.div>
                            {effectiveDiscountPct > 0 && variantOriginalTotal > variantTotalPrice && (
                              <span className="text-xs text-muted-foreground line-through">৳{variantOriginalTotal.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        {effectiveMinQty > 1 && totalVariantQty < effectiveMinQty && (
                          <p className="text-xs text-destructive mt-2">
                            ⚡ Minimum {effectiveMinQty} pcs required ({effectiveMinQty - totalVariantQty} more needed)
                          </p>
                        )}
                        {effectiveMinQty > 1 && totalVariantQty >= effectiveMinQty && (
                          <p className="text-xs text-primary mt-2">
                            ✅ Minimum quantity met
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Non-variant quantity */}
            {!hasVariants && (
              <>
                {(product.min_quantity ?? 1) > 1 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg mb-4 border border-amber-200 dark:border-amber-800">
                    ⚡ Minimum order: {product.min_quantity} piece{(product.min_quantity ?? 1) > 1 ? 's' : ''}
                  </p>
                )}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-foreground mb-3 font-body">Quantity</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQuantity(q => Math.max(product.min_quantity ?? 1, q - 1))}
                      className="w-10 h-10 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
                      <Minus size={16} />
                    </button>
                    <span className="w-12 text-center font-display font-bold text-lg">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)}
                      className="w-10 h-10 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Shipping Breakdown Box — above Add to Cart */}
            {(() => {
              const chargeType = product.shipping_charge_type || "per_kg";
              const rate = product.shipping_rate_override ?? (chargeType === "per_piece"
                ? (categoryShipping?.shipping_rate_per_piece || 0)
                : (categoryShipping?.shipping_rate_per_kg || 0));
              
              if (rate <= 0) return null;

              let effectiveWeight = product.estimated_weight_gm || 0;
              
              if (hasVariants && selectedOptions.length > 0) {
                const variantsWithWeight = selectedOptions.filter(o => o.weight && parseFloat(o.weight) > 0);
                if (variantsWithWeight.length > 0) {
                  const totalWeightedGm = variantsWithWeight.reduce((s, o) => s + (parseFloat(o.weight) || 0) * (variantQuantities[o.id] || 1), 0);
                  const totalQty = variantsWithWeight.reduce((s, o) => s + (variantQuantities[o.id] || 1), 0);
                  effectiveWeight = totalWeightedGm / totalQty;
                }
              } else if (hasVariants && selectedOptions.length === 0 && effectiveWeight === 0) {
                // Use first variant's weight as reference when nothing is selected
                const firstWithWeight = allVariantOptions.find(o => o.weight && parseFloat(o.weight) > 0);
                if (firstWithWeight) effectiveWeight = parseFloat(firstWithWeight.weight);
              }

              const qty = hasVariants ? Math.max(totalVariantQty, 1) : quantity;
              let cargoCharge = 0;
              
              if (chargeType === "per_piece") {
                cargoCharge = rate * qty;
              } else {
                cargoCharge = rate * (effectiveWeight / 1000) * qty;
              }

              // Show the box even if cargoCharge is 0 for per_kg with variants (will update when variant selected)
              if (cargoCharge <= 0 && chargeType === "per_piece") return null;
              if (cargoCharge <= 0 && !hasVariants) return null;

              const noVariantSelected = hasVariants && selectedOptions.length === 0;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/10 relative"
                >
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[3rem]" />
                  
                  {/* Header */}
                  <div className="flex items-center gap-3 px-5 pt-4 pb-3 relative z-10">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Plane size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground font-display">International Shipping</h3>
                      <p className="text-[11px] text-muted-foreground">Estimated air cargo cost</p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="px-5 pb-3 space-y-2.5 text-sm relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Package size={14} className="text-primary/60" />
                        Product Price
                      </span>
                      <span className="font-semibold text-foreground">৳{displayTotalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Scale size={14} className="text-primary/60" />
                        Air Cargo {chargeType === "per_piece"
                          ? `(${qty} pc × ৳${rate})`
                          : `(~${(effectiveWeight / 1000).toFixed(2)} kg × ৳${rate}/kg${qty > 1 ? ` × ${qty}` : ""})`
                        }
                      </span>
                      <span className="font-semibold text-foreground">
                        {noVariantSelected ? <span className="text-xs text-amber-600">Select variant</span> : `৳${Math.round(cargoCharge).toLocaleString()}`}
                      </span>
                    </div>
                    {!noVariantSelected && (
                      <div className="border-t border-primary/10 pt-2.5 mt-1 flex justify-between items-center">
                        <span className="font-bold text-foreground font-display text-sm">Est. Total</span>
                        <span className="font-bold text-primary font-display text-lg">৳{(displayTotalPrice + Math.round(cargoCharge)).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Disclaimer */}
                  <div className="px-5 pb-4 relative z-10">
                    <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 rounded-xl px-3.5 py-3">
                      <div className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Info size={12} className="text-destructive" />
                      </div>
                      <p className="text-xs text-foreground font-semibold leading-relaxed whitespace-pre-line">
                        প্রকৃত ওজনের ভিত্তিতে চূড়ান্ত চার্জে সামান্য তারতম্য হতে পারে।{"\n"}বাংলাদেশে পৌঁছানোর পর প্রকৃত ওজন অনুযায়ী হিসাব সমন্বয় করা হবে।
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Add to Cart */}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAddToCart} disabled={adding}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl gradient-brand text-primary-foreground font-semibold text-base disabled:opacity-60">
              <ShoppingCart size={18} />
              {adding ? "Adding..." : hasVariants && totalVariantQty > 0 ? `Add ${totalVariantQty} Items — ৳${(computedCargoCharge > 0 ? variantTotalPrice + Math.round(computedCargoCharge) : variantTotalPrice).toLocaleString()}` : !hasVariants ? `Add to Cart — ৳${(computedCargoCharge > 0 ? displayTotalWithShipping : displayTotalPrice).toLocaleString()}` : "Add to Cart"}
            </motion.button>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Truck size={16} className="text-primary" /> Ships from China (Air Cargo)</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck size={16} className="text-primary" /> Quality Guaranteed</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16">
          <div className="flex gap-1 border-b border-border overflow-x-auto scrollbar-hide">
            {(["specifications", "description", "reviews"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-3 text-sm font-semibold font-body transition-colors relative whitespace-nowrap ${activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {tab === "specifications" ? "Specifications" : tab === "description" ? "Product Description" : `Reviews (${product.reviews_count})`}
                {activeTab === tab && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 gradient-brand rounded-full" />}
              </button>
            ))}
          </div>

          <div className="py-8">
            {activeTab === "specifications" ? (
              <motion.div key="specs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
                {(() => {
                  const specs = (product as any).specifications;
                  const hasSpecs = Array.isArray(specs) && specs.length > 0;
                  const allSpecs = [
                    ...(hasSpecs ? specs : []),
                    { key: "Availability", value: product.in_stock ? "In stock" : "Out of stock" },
                    { key: "Product Type", value: product.category },
                  ];
                  return (
                    <div className="border border-border rounded-2xl overflow-hidden">
                      {allSpecs.map((spec: any, idx: number) => (
                        <div key={idx} className={`grid grid-cols-[1fr_1.5fr] ${idx % 2 === 0 ? "bg-muted/30" : "bg-card"}`}>
                          <div className="px-5 py-3.5 text-sm font-semibold text-foreground border-r border-border">{spec.key}</div>
                          <div className="px-5 py-3.5 text-sm text-muted-foreground">{spec.value}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            ) : activeTab === "description" ? (
              <motion.div key="desc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
                <p className="text-muted-foreground font-body leading-relaxed text-base whitespace-pre-line">
                  {product.description || "No description available for this product."}
                </p>
              </motion.div>
            ) : (
              <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-6">
                {/* Rating Summary */}
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-muted/40 border border-border/50">
                  <div className="text-center">
                    <div className="text-4xl font-display font-bold text-foreground">{product.rating}</div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} className={i < Math.floor(product.rating) ? "text-secondary fill-secondary" : "text-muted-foreground/30"} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
                  </div>
                </div>

                {/* Write Review Form */}
                {user ? (
                  <div className="p-5 rounded-2xl border border-border/50 bg-card space-y-4">
                    <h4 className="font-display font-semibold text-foreground">Write a Review</h4>
                    <div className="flex items-center gap-3">
                      {!reviewAnonymous && userProfile?.avatar_url ? (
                        <img src={optimizeCloudinaryUrl(userProfile.avatar_url, 40)} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">?</div>
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {reviewAnonymous ? "Anonymous" : userProfile?.full_name || "User"}
                      </span>
                      <label className="ml-auto flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-muted-foreground">Anonymous</span>
                        <button type="button" onClick={() => setReviewAnonymous(!reviewAnonymous)}
                          className={`w-9 h-5 rounded-full transition-colors relative ${reviewAnonymous ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${reviewAnonymous ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </label>
                    </div>
                    {/* Star Rating */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button key={i} type="button" onClick={() => setReviewRating(i + 1)}>
                          <Star size={24} className={`cursor-pointer transition-colors ${i < reviewRating ? "text-secondary fill-secondary" : "text-muted-foreground/30 hover:text-secondary/50"}`} />
                        </button>
                      ))}
                    </div>
                    {/* Comment */}
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience..."
                      className="w-full min-h-[80px] px-3 py-2 rounded-xl border border-input bg-background text-sm font-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                    {/* Image Upload */}
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {reviewImages.map((file, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
                            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-foreground/70 text-background flex items-center justify-center">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {reviewImages.length < 5 && (
                          <label className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors">
                            <Camera size={18} className="text-muted-foreground" />
                            <input type="file" accept="image/*" multiple onChange={handleReviewImageAdd} className="hidden" />
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{reviewImages.length}/5 images</p>
                    </div>
                    <button onClick={handleSubmitReview} disabled={submittingReview || reviewRating === 0}
                      className="px-6 py-2.5 rounded-xl gradient-brand text-primary-foreground text-sm font-medium disabled:opacity-50">
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl border border-border/50 bg-card text-center">
                    <p className="text-sm text-muted-foreground">Please log in to write a review.</p>
                  </div>
                )}

                {/* Reviews List */}
                {reviewLoading ? (
                  <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />)}</div>
                ) : reviews.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">No reviews yet. Be the first to review!</p>
                ) : (
                  reviews.map((review: any) => {
                    const name = review.profiles?.full_name || "Anonymous";
                    const avatar = review.profiles?.avatar_url;
                    const reviewImgs = (review.images || []) as string[];
                    return (
                      <div key={review.id} className="p-5 rounded-2xl border border-border/50 bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {avatar ? (
                              <img src={optimizeCloudinaryUrl(avatar, 32)} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold">{name[0]}</div>
                            )}
                            <span className="font-semibold text-sm text-foreground">{name}</span>
                            {review.verified_purchase && (
                              <span className="flex items-center gap-0.5 text-[10px] text-green-600"><ShieldCheck size={10} /> Verified</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} className={i < review.rating ? "text-secondary fill-secondary" : "text-muted-foreground/30"} />
                          ))}
                        </div>
                        {review.comment && <p className="text-sm text-muted-foreground font-body mb-2">{review.comment}</p>}
                        {reviewImgs.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {reviewImgs.map((img: string, idx: number) => (
                              <button key={idx} onClick={() => openLightbox(reviewImgs, idx)}
                                className="w-16 h-16 rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-all">
                                <img src={optimizeCloudinaryUrl(img, 100)} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-10 mb-10">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((p) => (
                <div key={p.id}
                  onClick={() => navigate(`/product/${p.slug}`)}
                  className="group rounded-3xl bg-card border border-border/50 overflow-hidden cursor-pointer shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                    {(p as any)._image ? (
                      <img src={optimizeCloudinaryUrl((p as any)._image, 400)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-muted/60" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-body font-semibold text-sm text-foreground truncate">{p.title}</h3>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star size={12} className="text-secondary fill-secondary" />
                      <span className="text-xs font-medium text-foreground">{p.rating}</span>
                      <span className="text-xs text-muted-foreground">({p.reviews_count})</span>
                    </div>
                    <div className="mt-2 font-display font-bold text-lg text-primary">৳{Number(p.price).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <MobileBottomNav />
      <div className="h-16 lg:hidden" />

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-foreground/90 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/20 text-background hover:bg-background/40">
              <X size={24} />
            </button>
            {lightboxImages.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + lightboxImages.length) % lightboxImages.length); }}
                  className="absolute left-2 md:left-6 z-10 p-2 rounded-full bg-background/20 text-background hover:bg-background/40">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % lightboxImages.length); }}
                  className="absolute right-2 md:right-6 z-10 p-2 rounded-full bg-background/20 text-background hover:bg-background/40">
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            <div className="max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                const diff = touchStartX.current - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) {
                  setLightboxIndex(i => diff > 0 ? (i + 1) % lightboxImages.length : (i - 1 + lightboxImages.length) % lightboxImages.length);
                }
              }}
            >
              <img src={optimizeCloudinaryUrl(lightboxImages[lightboxIndex], 1200)} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
            </div>
            <div className="absolute bottom-4 text-background text-sm">{lightboxIndex + 1} / {lightboxImages.length}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetail;
