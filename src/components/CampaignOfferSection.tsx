import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { Clock, Star, ArrowRight, Flame } from "lucide-react";
import { useActiveCampaigns } from "@/hooks/useActiveCampaigns";

interface CampaignProduct {
  id: string;
  discount_percentage: number;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    original_price: number | null;
    emoji: string | null;
    rating: number | null;
    sold_count: number | null;
    images: { image_url: string }[];
  };
}

function useCountdown(endDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
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

const CountdownTimer = ({ endDate, onExpire }: { endDate: string; onExpire?: () => void }) => {
  const { days, hours, minutes, seconds, expired } = useCountdown(endDate);

  useEffect(() => {
    if (expired && onExpire) onExpire();
  }, [expired, onExpire]);

  if (expired) return null;

  const units = [
    { label: "Days", value: days },
    { label: "Hrs", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: seconds },
  ];

  return (
    <div className="flex gap-1.5 sm:gap-2">
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center bg-card/90 backdrop-blur-sm rounded-xl px-2 sm:px-3 py-1.5 min-w-[2.5rem] sm:min-w-[3.2rem] shadow-sm border border-border/30">
          <span className="text-base sm:text-lg font-bold text-destructive leading-none font-display">{String(u.value).padStart(2, "0")}</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">{u.label}</span>
        </div>
      ))}
    </div>
  );
};

const CampaignProductCard = ({ item }: { item: CampaignProduct }) => {
  const { product, discount_percentage } = item;
  const imageUrl = product.images?.[0]?.image_url;
  const discountedPrice = discount_percentage > 0
    ? Math.round(product.price * (1 - discount_percentage / 100))
    : product.price;
  const soldCount = product.sold_count || 0;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="flex-shrink-0 w-44 sm:w-52 group"
    >
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300">
        <div className="relative aspect-square overflow-hidden">
          {imageUrl ? (
            <img
              src={optimizeCloudinaryUrl(imageUrl, 300)}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/40" />
          )}
          {discount_percentage > 0 && (
            <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-md">
              -{discount_percentage}%
            </span>
          )}
        </div>

        <div className="p-3 space-y-1.5">
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
            <span className="text-base font-bold text-primary font-display">৳{discountedPrice.toLocaleString()}</span>
            {discount_percentage > 0 && (
              <span className="text-xs text-muted-foreground line-through">৳{product.price.toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

const CampaignOfferSection = () => {
  const { data: initialCampaigns = [] } = useActiveCampaigns();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const removeCampaign = useCallback((id: string) => {
    setHiddenIds(prev => new Set(prev).add(id));
  }, []);

  const campaigns = initialCampaigns.filter(c => !hiddenIds.has(c.id));

  if (!campaigns.length) return null;

  return (
    <section className="py-6 md:py-10">
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-2xl overflow-hidden mb-4 p-4 sm:p-5"
            style={{ background: "linear-gradient(135deg, hsl(0 85% 60% / 0.12), hsl(28 85% 58% / 0.15), hsl(45 90% 55% / 0.12))" }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-secondary/10 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-10 w-20 h-20 rounded-full bg-destructive/8 translate-y-1/2" />

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-destructive/15">
                  <Flame size={20} className="text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-foreground">{campaign.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Limited time offer — Hurry up!</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CountdownTimer endDate={campaign.end_date} onExpire={() => removeCampaign(campaign.id)} />
                <Link
                  to={`/campaign/${campaign.id}`}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors shadow-sm"
                >
                  View All <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex gap-4 md:gap-6">
            {campaign.banner_image_url && (
              <Link to={`/campaign/${campaign.id}`} className="hidden md:block flex-shrink-0 w-56 lg:w-64">
                <img
                  src={optimizeCloudinaryUrl(campaign.banner_image_url, 400)}
                  alt={campaign.title}
                  className="w-full h-full object-cover rounded-2xl hover:scale-[1.02] transition-transform duration-300"
                />
              </Link>
            )}

            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 md:gap-4 pb-2">
                {campaign.products.map((item) => (
                  <CampaignProductCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>

          <Link
            to={`/campaign/${campaign.id}`}
            className="sm:hidden flex items-center justify-center gap-2 mt-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/15 transition-colors"
          >
            View All Products <ArrowRight size={14} />
          </Link>
        </div>
      ))}
    </section>
  );
};

export default CampaignOfferSection;
