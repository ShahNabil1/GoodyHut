import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Trash2, Percent, ArrowRight, Tag, Zap, Plane, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getClientIp, isIpBlocked } from "@/lib/ipUtils";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignDiscounts } from "@/hooks/useCampaignDiscounts";
import { useProductDeals } from "@/hooks/useProductDeals";
import { calcItemCargoCharge, getVariantPrice } from "@/lib/shippingUtils";

interface PersonalDiscount {
  id: string;
  product_id: string;
  discount_type: string;
  discount_value: number;
  active: boolean;
}

interface CategoryShippingMap {
  [categoryId: string]: { shipping_rate_per_kg: number; shipping_rate_per_piece: number };
}

const CartDrawer = () => {
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, updateQuantity, removeFromCart, totalItems, totalPrice } = useCart();
  const { user, setAuthModalOpen } = useAuth();
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<PersonalDiscount[]>([]);
  const [checkingIp, setCheckingIp] = useState(false);
  const [categoryShippingMap, setCategoryShippingMap] = useState<CategoryShippingMap>({});

  const productIds = useMemo(() => items.map(i => i.product_id), [items]);
  const { getCampaignDiscount } = useCampaignDiscounts(productIds);
  const { getDeal } = useProductDeals(productIds);

  // Lock body scroll when cart is open (iOS-safe)
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      if (top) window.scrollTo(0, parseInt(top) * -1);
    }
    return () => {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      if (top) window.scrollTo(0, parseInt(top) * -1);
    };
  }, [isOpen]);

  // Fetch category shipping rates
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const catIds = [...new Set(items.map(i => i.product?.category_id).filter(Boolean))] as string[];
    if (catIds.length === 0) return;
    supabase.from("categories").select("id, shipping_rate_per_kg, shipping_rate_per_piece").in("id", catIds)
      .then(({ data }) => {
        if (data) {
          const map: CategoryShippingMap = {};
          data.forEach((c: any) => { map[c.id] = { shipping_rate_per_kg: c.shipping_rate_per_kg || 0, shipping_rate_per_piece: c.shipping_rate_per_piece || 0 }; });
          setCategoryShippingMap(map);
        }
      });
  }, [isOpen, items]);

  useEffect(() => {
    if (!user || !isOpen) return;
    supabase
      .from("personal_discounts")
      .select("id, product_id, discount_type, discount_value, active")
      .eq("user_id", user.id)
      .eq("active", true)
      .then(({ data }) => setDiscounts(data || []));
  }, [user, isOpen]);

  const getDiscount = (productId: string) => discounts.find(d => d.product_id === productId);

  const calcItemPrice = (item: typeof items[0]) => {
    const variantPrice = getVariantPrice(item.product?.variants, item.selected_size);
    const baseUnitPrice = variantPrice ?? (item.product?.price ?? 0);
    let unitPrice = baseUnitPrice;
    let discountLabel = "";
    let hasDealDiscount = false;

    // Deal discount takes highest priority
    const deal = getDeal(item.product_id);
    if (deal && deal.discount_percentage > 0) {
      unitPrice = Math.round(baseUnitPrice * (1 - deal.discount_percentage / 100));
      discountLabel = `${deal.label} -${deal.discount_percentage}%`;
      hasDealDiscount = true;
    } else {
      // Then campaign discount
      const campDisc = getCampaignDiscount(item.product_id);
      if (campDisc && campDisc.discount_percentage > 0) {
        unitPrice = Math.round(baseUnitPrice * (1 - campDisc.discount_percentage / 100));
        discountLabel = `${campDisc.campaign_title} -${campDisc.discount_percentage}%`;
      }
    }

    const base = baseUnitPrice * item.quantity;
    let final = unitPrice * item.quantity;

    // Apply personal discount on top
    const disc = getDiscount(item.product_id);
    if (disc) {
      final = disc.discount_type === "percentage"
        ? final * (1 - disc.discount_value / 100)
        : Math.max(0, final - disc.discount_value * item.quantity);
    }

    const campDisc = getDeal(item.product_id) ? false : !!getCampaignDiscount(item.product_id);
    return { original: base, final: Math.round(final), saved: Math.round(base - final), discountLabel, hasPersonalDiscount: !!disc, hasCampaignDiscount: campDisc, hasDealDiscount };
  };

  const totalCargoForItem = (item: typeof items[0]) => calcItemCargoCharge(item.product, item.quantity, item.selected_size, categoryShippingMap);

  const discountedTotal = items.reduce((s, item) => s + calcItemPrice(item).final, 0);
  const totalSaved = items.reduce((s, item) => s + calcItemPrice(item).saved, 0);
  const totalCargoCharge = Math.round(items.reduce((s, item) => s + totalCargoForItem(item), 0));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[60] w-full max-w-md bg-card shadow-elevated flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-primary" />
                <h2 className="font-display font-bold text-lg text-foreground">Cart ({totalItems})</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Items */}
            <div className={`flex-1 px-6 py-4 space-y-4 ${items.length > 0 ? "overflow-y-auto" : "overflow-hidden flex items-center justify-center"}`}>
              {items.length === 0 ? (
                <div className="flex flex-col items-center text-center">
                  <ShoppingBag size={48} className="text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-body">Your cart is empty</p>
                </div>
              ) : (
                items.map((item) => {
                  const pricing = calcItemPrice(item);
                  const disc = getDiscount(item.product_id);

                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 p-3 rounded-2xl bg-muted/40 border border-border/50"
                    >
                      <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                        {item.product?.image_url ? (
                          <img 
                            src={item.product.image_url} 
                            alt={item.product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted/40" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate font-body">
                          {item.product?.title}
                        </h3>
                        {item.selected_size && (
                          <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{item.selected_size}</span>
                        )}

                        {/* Price with discount */}
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-primary font-display font-bold text-sm">
                            ৳{pricing.final.toLocaleString()}
                          </span>
                          {pricing.saved > 0 && (
                            <span className="text-xs text-muted-foreground line-through">
                              ৳{pricing.original.toLocaleString()}
                            </span>
                          )}
                          {pricing.hasDealDiscount && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                              <Zap size={8} />
                              Deal
                            </span>
                          )}
                          {pricing.hasCampaignDiscount && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-medium">
                              <Tag size={8} />
                              Campaign
                            </span>
                          )}
                          {pricing.hasPersonalDiscount && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-medium">
                              <Percent size={8} />
                              Personal
                            </span>
                          )}
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-medium w-6 text-center font-body">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Checkout Summary */}
            {items.length > 0 && (
              <div className="border-t border-border px-6 py-5 pb-[calc(1.25rem+var(--app-safe-bottom))] space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground font-medium">৳{totalPrice.toLocaleString()}</span>
                  </div>
                  {totalSaved > 0 && (
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Percent size={12} /> Discount</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">−৳{totalSaved.toLocaleString()}</span>
                    </div>
                  )}
                  {totalCargoCharge > 0 && (
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-muted-foreground flex items-center gap-1"><Plane size={12} /> Int'l Cargo (আনুমানিক)</span>
                      <span className="text-foreground font-medium">৳{totalCargoCharge.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-display font-bold text-lg pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">৳{(discountedTotal + totalCargoCharge).toLocaleString()}</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={checkingIp}
                  onClick={async () => {
                    if (!user) {
                      setIsOpen(false);
                      setAuthModalOpen(true);
                      return;
                    }
                    // Check IP block before navigating
                    setCheckingIp(true);
                    try {
                      const ip = await getClientIp();
                      if (ip) {
                        const blocked = await isIpBlocked(ip);
                        if (blocked) {
                          toast({ title: "আপনার অর্ডার প্রসেস করা সম্ভব হচ্ছে না", description: "সাপোর্টে যোগাযোগ করুন।", variant: "destructive" });
                          setCheckingIp(false);
                          return;
                        }
                      }
                    } catch {}
                    setCheckingIp(false);
                    setIsOpen(false);
                    navigate("/checkout");
                  }}
                  className="w-full py-3.5 rounded-2xl gradient-brand text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {checkingIp ? (
                    <><Loader2 size={16} className="animate-spin" /> Checking...</>
                  ) : user ? "Proceed to Checkout" : "Login to Checkout"}
                  {!checkingIp && <ArrowRight size={16} />}
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
