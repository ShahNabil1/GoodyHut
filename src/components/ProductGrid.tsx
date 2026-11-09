import { useMemo } from "react";
import { motion, useSpring } from "framer-motion";
import { useProductDeals, type ProductDeal } from "@/hooks/useProductDeals";
import { Star, ShoppingCart, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { useCampaignDiscounts, type CampaignDiscount } from "@/hooks/useCampaignDiscounts";

interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  original_price?: number | null;
  rating: number;
  reviews_count: number;
  sold_count?: number | null;
  emoji: string;
  image_url?: string;
}

const SkeletonCard = () => (
  <div className="rounded-3xl bg-card border border-border/50 overflow-hidden">
    <div className="aspect-square skeleton-shimmer" />
    <div className="p-4 space-y-3">
      <div className="h-4 w-3/4 rounded-full skeleton-shimmer" />
      <div className="h-3 w-1/2 rounded-full skeleton-shimmer" />
      <div className="h-5 w-1/3 rounded-full skeleton-shimmer" />
    </div>
  </div>
);

const ProductCard = ({ product, campaignDiscount, deal, eager }: { product: Product; campaignDiscount?: CampaignDiscount; deal?: ProductDeal; eager?: boolean }) => {
  const dealPct = deal?.discount_percentage || 0;
  const campaignPct = campaignDiscount?.discount_percentage || 0;
  const originalPricePct = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;
  const discountPct = dealPct || campaignPct || originalPricePct;
  const displayPrice = dealPct > 0
    ? Math.round(product.price * (1 - dealPct / 100))
    : campaignPct > 0
      ? Math.round(product.price * (1 - campaignPct / 100))
      : product.price;
  const crossedPrice = (dealPct > 0 || campaignPct > 0)
    ? product.price
    : (originalPricePct > 0 ? product.original_price! : null);
  const dealLabel = deal?.label;
  const navigate = useNavigate();
  const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 30 });

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(py * -10);
    rotateY.set(px * 10);
  };

  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/product/${product.slug}`);
  };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      onClick={() => navigate(`/product/${product.slug}`)}
      className="group rounded-3xl bg-card border border-border/50 overflow-hidden cursor-pointer shadow-card hover:shadow-card-hover transition-shadow duration-300"
    >
      <div className="relative aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img
            src={optimizeCloudinaryUrl(product.image_url, 400)}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-[1.08] transition-transform duration-400"
            loading="eager"
            decoding="async"
          />
        ) : (
          <span className="text-6xl md:text-7xl">{product.emoji}</span>
        )}

        {discountPct > 0 && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold shadow-md">
            {discountPct}% Off
          </div>
        )}
        {dealLabel && (
          <div className="absolute bottom-3 left-3 z-10 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold shadow-sm">
            {dealLabel}
          </div>
        )}

        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-card/80 backdrop-blur-md border border-border/40 text-[9px] md:text-[10px] font-medium text-muted-foreground">
          <Truck size={9} /> <span className="hidden sm:inline">Ships from</span> China
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl gradient-brand text-primary-foreground text-sm font-semibold active:scale-95 transition-transform"
          >
            <ShoppingCart size={14} /> Add to Cart
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-body font-semibold text-sm text-foreground truncate">{product.title}</h3>
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <Star size={12} className="text-secondary fill-secondary" />
          <span className="text-xs font-medium text-foreground">{product.rating}</span>
          <span className="text-xs text-muted-foreground">({product.reviews_count})</span>
          {product.sold_count != null && product.sold_count > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">{product.sold_count.toLocaleString()} Sold</span>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display font-bold text-lg text-primary">
            ৳{displayPrice.toLocaleString()}
          </span>
          {crossedPrice && (
            <span className="text-xs text-muted-foreground line-through">
              ৳{Number(crossedPrice).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ProductGrid = ({ midSection }: { midSection?: React.ReactNode }) => {
  const { data: products = [], isLoading: loading } = useProducts();

  const productIds = useMemo(() => products.map(p => p.id), [products]);
  const { getCampaignDiscount } = useCampaignDiscounts(productIds);
  const { getDeal } = useProductDeals(productIds);

  const firstBatch = products.slice(0, 12);
  const secondBatch = products.slice(12);

  return (
    <section className="relative py-10 md:py-16 bg-muted/30 overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-bl from-primary/6 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-gradient-to-tr from-secondary/6 to-transparent blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 relative">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              Trending Products
            </h2>
            <p className="text-muted-foreground font-body">
              Best-selling imports this week — verified wholesale prices
            </p>
          </div>
          <button
            className="hidden md:inline-flex px-6 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : firstBatch.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  campaignDiscount={getCampaignDiscount(p.id)}
                  deal={getDeal(p.id)}
                  eager={i < 8}
                />
              ))}
        </div>

        {midSection && !loading && firstBatch.length > 0 && (
          <div className="my-8 md:my-12 -mx-4 md:-mx-0">
            {midSection}
          </div>
        )}

        {!loading && secondBatch.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {secondBatch.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                campaignDiscount={getCampaignDiscount(p.id)}
                deal={getDeal(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;
