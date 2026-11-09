import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { Star, Clock, Flame, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Footer from "@/components/Footer";

interface CampaignProduct {
  id: string;
  discount_percentage: number;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    original_price: number | null;
    rating: number | null;
    sold_count: number | null;
    images: { image_url: string }[];
  };
}

interface Campaign {
  id: string;
  title: string;
  banner_image_url: string | null;
  discount_description: string | null;
  end_date: string;
}

function useCountdown(endDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); return { days: 0, hours: 0, minutes: 0, seconds: 0 }; }
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return { ...timeLeft, expired };
}

const CountdownBanner = ({ campaign }: { campaign: Campaign }) => {
  const { days, hours, minutes, seconds, expired } = useCountdown(campaign.end_date);
  if (expired) return null;

  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: seconds },
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden p-5 sm:p-8 mb-8"
      style={{ background: "linear-gradient(135deg, hsl(0 85% 60% / 0.1), hsl(28 85% 58% / 0.15), hsl(45 90% 55% / 0.1))" }}
    >
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-secondary/10 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-16 w-24 h-24 rounded-full bg-destructive/8 translate-y-1/2" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-destructive/15">
            <Flame size={24} className="text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground">{campaign.title}</h1>
            {campaign.discount_description && (
              <p className="text-sm text-muted-foreground mt-1">{campaign.discount_description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={16} className="text-destructive" />
          <span className="text-xs font-medium text-muted-foreground mr-1">Ends in</span>
          <div className="flex gap-1.5">
            {units.map((u) => (
              <div key={u.label} className="flex flex-col items-center bg-card/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 min-w-[3rem] shadow-sm border border-border/30">
                <span className="text-lg font-bold text-destructive leading-none font-display">{String(u.value).padStart(2, "0")}</span>
                <span className="text-[9px] text-muted-foreground font-medium">{u.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ item }: { item: CampaignProduct }) => {
  const { product, discount_percentage } = item;
  const imageUrl = product.images?.[0]?.image_url;
  const discountedPrice = discount_percentage > 0
    ? Math.round(product.price * (1 - discount_percentage / 100))
    : product.price;
  const soldCount = product.sold_count || 0;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group rounded-2xl overflow-hidden bg-card border border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300"
    >
      <div className="relative aspect-square overflow-hidden">
        {imageUrl ? (
          <img
            src={optimizeCloudinaryUrl(imageUrl, 400)}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-muted/40" />
        )}
        {discount_percentage > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-lg shadow-md">
            -{discount_percentage}%
          </span>
        )}
      </div>
      <div className="p-3.5 space-y-1.5">
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight font-body">{product.title}</p>
        <div className="flex items-center gap-1.5">
          {product.rating != null && product.rating > 0 && (
            <>
              <Star size={11} className="text-secondary fill-secondary" />
              <span className="text-[11px] font-medium text-foreground">{product.rating}</span>
            </>
          )}
          {soldCount > 0 && (
            <span className="text-[11px] text-muted-foreground">{soldCount.toLocaleString()} Sold</span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary font-display">৳{discountedPrice.toLocaleString()}</span>
          {discount_percentage > 0 && (
            <span className="text-xs text-muted-foreground line-through">৳{product.price.toLocaleString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

const CampaignPage = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [products, setProducts] = useState<CampaignProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;

      const { data: camp } = await supabase
        .from("campaigns")
        .select("id, title, banner_image_url, discount_description, end_date")
        .eq("id", id)
        .single();

      if (!camp) { setLoading(false); return; }
      setCampaign(camp);

      const { data: cpData } = await supabase
        .from("campaign_products")
        .select("id, discount_percentage, product_id")
        .eq("campaign_id", id);

      if (!cpData?.length) { setLoading(false); return; }

      const productIds = cpData.map((cp) => cp.product_id);
      const { data: prods } = await supabase
        .from("products")
        .select("id, title, slug, price, original_price, rating, sold_count")
        .in("id", productIds);

      const { data: images } = await supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true });

      if (prods) {
        const items: CampaignProduct[] = cpData.map((cp) => {
          const prod = prods.find((p) => p.id === cp.product_id);
          const prodImages = (images || []).filter((img) => img.product_id === cp.product_id);
          return {
            id: cp.id,
            discount_percentage: cp.discount_percentage || 0,
            product: { ...prod!, images: prodImages },
          };
        }).filter((cp) => cp.product);
        setProducts(items);
      }

      setLoading(false);
    };
    fetch();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-[6.5rem] md:pt-20">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
          {/* Back */}
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>

          {loading ? (
            <div className="space-y-4">
              <div className="h-28 rounded-2xl skeleton-shimmer" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden">
                    <div className="aspect-square skeleton-shimmer" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                      <div className="h-4 w-1/3 rounded skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !campaign ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-display font-bold text-foreground">Campaign not found</h2>
              <p className="text-muted-foreground mt-2">This campaign may have ended or doesn't exist.</p>
            </div>
          ) : (
            <>
              <CountdownBanner campaign={campaign} />

              <p className="text-sm text-muted-foreground mb-6">{products.length} products in this campaign</p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
      <div className="h-16 lg:hidden" />
    </div>
  );
};

export default CampaignPage;
