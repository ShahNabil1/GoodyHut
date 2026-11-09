import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Flame, Zap, Clock, ArrowRight, Star } from "lucide-react";
import { useActiveDeals } from "@/hooks/useProductDeals";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";

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

const DealCard = ({ deal }: { deal: any }) => {
  const { days, hours, minutes, seconds, expired } = useCountdown(deal.end_date);
  const product = deal.product;
  const discountedPrice = Math.round(product.price * (1 - deal.discount_percentage / 100));

  if (expired) return null;

  return (
    <Link to={`/product/${product.slug}`} className="flex-shrink-0 w-44 sm:w-52 group">
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300">
        <div className="relative aspect-square overflow-hidden">
          {product.image_url ? (
            <img
              src={optimizeCloudinaryUrl(product.image_url, 300)}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/40 text-5xl">
              {product.emoji || "📦"}
            </div>
          )}
          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-md">
            -{deal.discount_percentage}%
          </span>
          <span className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm text-[9px] font-medium px-1.5 py-0.5 rounded-md border border-border/30 text-muted-foreground">
            {deal.label}
          </span>
        </div>

        <div className="p-3 space-y-1.5">
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight font-body">{product.title}</p>
          
          {product.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star size={11} className="text-secondary fill-secondary" />
              <span className="text-[11px] font-medium text-foreground">{product.rating}</span>
              {product.sold_count > 0 && (
                <span className="text-[11px] text-muted-foreground">{product.sold_count.toLocaleString()} Sold</span>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-primary font-display">৳{discountedPrice.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground line-through">৳{product.price.toLocaleString()}</span>
          </div>

          {/* Mini countdown */}
          <div className="flex items-center gap-1 text-[10px] text-destructive font-medium">
            <Clock size={10} />
            <span>{days > 0 ? `${days}d ` : ""}{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const DealsSection = () => {
  const { deals, loading } = useActiveDeals();

  if (loading || deals.length === 0) return null;

  // Find earliest ending deal for main countdown
  const earliestEnd = deals.reduce((min, d) => d.end_date < min ? d.end_date : min, deals[0].end_date);

  return (
    <section className="py-6 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="relative rounded-2xl overflow-hidden mb-4 p-4 sm:p-5"
          style={{ background: "linear-gradient(135deg, hsl(0 85% 60% / 0.12), hsl(280 85% 58% / 0.15), hsl(200 90% 55% / 0.12))" }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-10 w-20 h-20 rounded-full bg-secondary/8 translate-y-1/2" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15">
                <Zap size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-foreground">Today's Deals</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Limited time offers — Don't miss out!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable deals */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 md:gap-4 pb-2">
            {deals.map(deal => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DealsSection;
