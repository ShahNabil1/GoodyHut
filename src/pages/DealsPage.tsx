import { Link } from "react-router-dom";
import { Zap, Clock, Star, PackageOpen } from "lucide-react";
import { useActiveDeals } from "@/hooks/useProductDeals";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Footer from "@/components/Footer";

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
    <Link to={`/product/${product.slug}`} className="group">
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border/40 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden">
          {product.image_url ? (
            <img
              src={optimizeCloudinaryUrl(product.image_url, 400)}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/40 text-5xl">
              {product.emoji || "📦"}
            </div>
          )}
          <span className="absolute top-2.5 left-2.5 bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-lg shadow-md">
            -{deal.discount_percentage}%
          </span>
          {deal.label && (
            <span className="absolute top-2.5 right-2.5 bg-card/90 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-md border border-border/30 text-muted-foreground">
              {deal.label}
            </span>
          )}
        </div>

        <div className="p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight font-body">{product.title}</p>

          {product.rating != null && product.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star size={12} className="text-secondary fill-secondary" />
              <span className="text-xs font-medium text-foreground">{product.rating}</span>
              {product.sold_count > 0 && (
                <span className="text-xs text-muted-foreground">· {product.sold_count.toLocaleString()} Sold</span>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary font-display">৳{discountedPrice.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground line-through">৳{product.price.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium bg-destructive/8 rounded-lg px-2.5 py-1.5 w-fit">
            <Clock size={12} />
            <span>{days > 0 ? `${days}d ` : ""}{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="w-24 h-24 rounded-full bg-muted/60 flex items-center justify-center mb-6">
      <PackageOpen size={40} className="text-muted-foreground/60" />
    </div>
    <h2 className="text-xl font-display font-bold text-foreground mb-2">No Active Deals Right Now</h2>
    <p className="text-muted-foreground text-sm max-w-md mb-6">
      There are no active deals or offers at the moment. Check back later for exciting new deals!
    </p>
    <Link
      to="/"
      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full gradient-brand text-primary-foreground text-sm font-semibold shadow-md hover:shadow-lg transition-all"
    >
      Browse Products
    </Link>
  </div>
);

const LoadingSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-2xl bg-card border border-border/40 overflow-hidden animate-pulse">
        <div className="aspect-square bg-muted" />
        <div className="p-4 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-5 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const DealsPage = () => {
  const { deals, loading } = useActiveDeals();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-[6.5rem] md:pt-20">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
          {/* Header */}
          <div className="relative rounded-2xl overflow-hidden mb-6 p-5 sm:p-6"
            style={{ background: "linear-gradient(135deg, hsl(0 85% 60% / 0.12), hsl(280 85% 58% / 0.15), hsl(200 90% 55% / 0.12))" }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/10 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-10 w-24 h-24 rounded-full bg-secondary/8 translate-y-1/2" />
            <div className="relative flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15">
                <Zap size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground">Today's Deals</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Limited time offers — Don't miss out!</p>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <LoadingSkeleton />
          ) : deals.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {deals.map(deal => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
      <div className="h-16 lg:hidden" />
    </div>
  );
};

export default DealsPage;
