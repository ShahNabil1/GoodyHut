import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Phone, User, CreditCard, ShoppingBag, Percent, Check, Loader2, Tag, Wallet, Info, Plane, BadgeCheck, X, Package, Scale, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { calcItemCargoCharge as calcCargoCharge, getVariantWeight, getVariantPrice } from "@/lib/shippingUtils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sendOrderStatusEmail, sendAdminOrderNotification } from "@/lib/emailUtils";
import { useToast } from "@/hooks/use-toast";
import { useTracking } from "@/hooks/useTracking";
import { getCatalogContentId } from "@/lib/catalogIds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import AddressPicker, { type AddressData, formatAddress, parseAddress } from "@/components/AddressPicker";
import { getClientIp, isIpBlocked } from "@/lib/ipUtils";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useCampaignDiscounts } from "@/hooks/useCampaignDiscounts";
import { useProductDeals } from "@/hooks/useProductDeals";

interface PersonalDiscount {
  id: string;
  product_id: string;
  discount_type: string;
  discount_value: number;
  active: boolean;
}

interface DomesticRate {
  min_weight_gm: number;
  max_weight_gm: number;
  charge_inside_dhaka: number;
  charge_outside_dhaka: number;
}

interface CategoryShippingMap {
  [categoryId: string]: { shipping_rate_per_kg: number; shipping_rate_per_piece: number };
}


const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, refresh } = useCart();
  const { user, setAuthModalOpen } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = useTracking();

  const productIds = useMemo(() => items.map(i => i.product_id), [items]);
  const { getCampaignDiscount } = useCampaignDiscounts(productIds);
  const { getDeal } = useProductDeals(productIds);
  const [discounts, setDiscounts] = useState<PersonalDiscount[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const orderPlacedRef = useRef(false);
  
  // Shipping state
  const [domesticRates, setDomesticRates] = useState<DomesticRate[]>([]);
  const [categoryShippingMap, setCategoryShippingMap] = useState<CategoryShippingMap>({});
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  // Form state
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    notes: "",
    payment_type: "full" as "full" | "partial",
  });

  // Address state
  const [addressData, setAddressData] = useState<AddressData>({
    division: "",
    district: "",
    thana: "",
    address: "",
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [showCargoBreakdown, setShowCargoBreakdown] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    if (showCargoBreakdown) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showCargoBreakdown]);
  const [couponError, setCouponError] = useState("");

  // Redirect to home if not logged in
  useEffect(() => {
    if (!user) {
      setAuthModalOpen(true);
      navigate("/");
    }
  }, [user]);

  // Fetch user profile, discounts, domestic rates, category shipping, wallet
  // Track begin_checkout
  useEffect(() => {
    if (items.length > 0 && user) {
      const checkoutContentIds = items.map(i => 
        getCatalogContentId(i.product_id, i.product?.variants, i.selected_size)
      );
      trackEvent("begin_checkout", {
        currency: "BDT",
        value: totalPrice,
        user_id: user.id,
        content_ids: checkoutContentIds,
        content_type: "product",
        items: items.map(i => ({ 
          item_id: getCatalogContentId(i.product_id, i.product?.variants, i.selected_size), 
          item_name: i.product?.title, 
          quantity: i.quantity 
        })),
      });
    }
  }, []); // fire once on mount

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, discountsRes, ratesRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("personal_discounts").select("*").eq("user_id", user.id).eq("active", true),
        supabase.from("domestic_shipping_rates").select("*").order("sort_order"),
        supabase.from("wallet").select("balance").eq("user_id", user.id).single(),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setForm(prev => ({
          ...prev,
          full_name: profileRes.data.full_name || "",
          phone: profileRes.data.phone || "",
        }));
        setAddressData(parseAddress(profileRes.data.address, profileRes.data.city));
      }

      if (discountsRes.data) setDiscounts(discountsRes.data);
      if (ratesRes.data) setDomesticRates(ratesRes.data as DomesticRate[]);
      if (walletRes.data) setWalletBalance((walletRes.data as any).balance || 0);

      // Fetch category shipping rates for cart items
      const catIds = [...new Set(items.map(i => (i.product as any)?.category_id).filter(Boolean))];
      if (catIds.length > 0) {
        const { data: cats } = await supabase.from("categories").select("id, shipping_rate_per_kg, shipping_rate_per_piece").in("id", catIds);
        if (cats) {
          const map: CategoryShippingMap = {};
          cats.forEach((c: any) => { map[c.id] = { shipping_rate_per_kg: c.shipping_rate_per_kg || 0, shipping_rate_per_piece: c.shipping_rate_per_piece || 0 }; });
          setCategoryShippingMap(map);
        }
      }
    };

    fetchData();
  }, [user, items]);

  // Auto-save order when user leaves checkout without completing
  // Only fires if user actually filled name, valid phone, AND at least division
  useEffect(() => {
    const isValidBDPhone = (phone: string) => /^01[3-9]\d{8}$/.test(phone.trim());

    return () => {
      if (orderPlacedRef.current) return;
      if (!user || items.length === 0) return;

      // Get latest form values from DOM
      const nameInput = document.getElementById("full_name") as HTMLInputElement;
      const phoneInput = document.getElementById("phone") as HTMLInputElement;
      const name = nameInput?.value?.trim() || "";
      const phone = phoneInput?.value?.trim() || "";

      // Only auto-save if user genuinely started filling checkout
      if (!name || !isValidBDPhone(phone) || !addressData.division) return;

      // Fire and forget - auto save
      const fullAddress = formatAddress(addressData);
      supabase.from("orders").insert({
        user_id: user.id,
        total_amount: grandTotal,
        shipping_address: fullAddress || null,
        shipping_city: addressData.division || null,
        phone: phone,
        estimated_cargo_charge: totalCargoCharge,
        domestic_delivery_charge: 0,
        wallet_amount_used: walletApplied,
        notes: `Auto saved — Name: ${name}`,
        status: "auto_saved" as any,
      } as any).select().single().then(async (res) => {
        if (res.data) {
          const orderItems = items.map(item => ({
            order_id: (res.data as any).id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: calcItemPrice(item).final / item.quantity,
            selected_size: item.selected_size,
          }));
          await supabase.from("order_items").insert(orderItems);
        }

        // Auto-save phone to profile if not set
        if (phone) {
          supabase.from("profiles").update({ phone: phone, updated_at: new Date().toISOString() }).eq("id", user.id);
        }
      });
    };
  }, [user, items, addressData]);

  const getDiscount = (productId: string) => discounts.find(d => d.product_id === productId);

  const calcItemPrice = (item: typeof items[0]) => {
    const variantPrice = getVariantPrice(item.product?.variants, item.selected_size);
    const baseUnitPrice = variantPrice ?? (item.product?.price ?? 0);
    let unitPrice = baseUnitPrice;

    // Deal discount takes highest priority, then campaign
    const deal = getDeal(item.product_id);
    if (deal && deal.discount_percentage > 0) {
      unitPrice = Math.round(baseUnitPrice * (1 - deal.discount_percentage / 100));
    } else {
      const campDisc = getCampaignDiscount(item.product_id);
      if (campDisc && campDisc.discount_percentage > 0) {
        unitPrice = Math.round(baseUnitPrice * (1 - campDisc.discount_percentage / 100));
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

    const hasDeal = !!deal;
    const hasCampaign = !deal && !!getCampaignDiscount(item.product_id);
    return { original: base, final: Math.round(final), saved: Math.round(base - final), hasCampaignDiscount: hasCampaign, hasPersonalDiscount: !!disc, hasDealDiscount: hasDeal };
  };

  const subtotal = items.reduce((s, item) => s + calcItemPrice(item).final, 0);
  const totalSaved = items.reduce((s, item) => s + calcItemPrice(item).saved, 0);
  const isDhaka = addressData.division === "Dhaka" && addressData.district === "Dhaka";

  // Calculate cargo charge per item using shared utility
  const calcItemCargoForCheckout = (item: typeof items[0]) =>
    calcCargoCharge(item.product, item.quantity, item.selected_size, categoryShippingMap);

  const totalCargoCharge = Math.round(items.reduce((s, item) => s + calcItemCargoForCheckout(item), 0));

  // Calculate total estimated weight for domestic delivery (use variant weight when available)
  const totalWeightGm = items.reduce((s, item) => {
    const product = item.product as any;
    if (!product) return s;
    let w = product.estimated_weight_gm || 0;
    if (item.selected_size && product.variants) {
      const vw = getVariantWeight(product.variants, item.selected_size);
      if (vw) w = vw;
    }
    return s + w * item.quantity;
  }, 0);

  // Domestic delivery charge removed — calculated after arrival in BD

  // Wallet usage
  const walletApplied = useWallet ? Math.min(walletBalance, subtotal + totalCargoCharge) : 0;

  // Coupon discount calculation
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      couponDiscount = Math.round(subtotal * appliedCoupon.discount_value / 100);
    } else {
      couponDiscount = Math.min(appliedCoupon.discount_value, subtotal);
    }
  }

  const grandTotal = subtotal - couponDiscount + totalCargoCharge - walletApplied;

  // Apply coupon
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase().trim())
      .eq("active", true)
      .single();

    if (error || !data) {
      setCouponError("Invalid or expired coupon code");
      setAppliedCoupon(null);
    } else if (data.min_order_amount && subtotal < data.min_order_amount) {
      setCouponError(`Minimum order ৳${data.min_order_amount} required`);
      setAppliedCoupon(null);
    } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponError("This coupon has expired");
      setAppliedCoupon(null);
    } else if (data.max_uses && data.used_count >= data.max_uses) {
      setCouponError("This coupon has reached its usage limit");
      setAppliedCoupon(null);
    } else {
      setAppliedCoupon(data);
      toast({ title: "Coupon applied!", description: `You saved ৳${data.discount_type === "percentage" ? Math.round(subtotal * data.discount_value / 100) : data.discount_value}` });
    }

    setCouponLoading(false);
  };

  // Place order
  const placeOrder = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!form.full_name || !form.phone || !addressData.division || !addressData.district || !addressData.thana || !addressData.address) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Your cart is empty", variant: "destructive" });
      return;
    }

    setLoading(true);

    const fullAddress = formatAddress(addressData);

    try {
      // Fetch client IP and check blocklist
      const clientIp = await getClientIp();
      if (clientIp) {
        const blocked = await isIpBlocked(clientIp);
        if (blocked) {
          toast({ title: "আপনার অর্ডার প্রসেস করা সম্ভব হচ্ছে না", description: "সাপোর্টে যোগাযোগ করুন।", variant: "destructive" });
          setLoading(false);
          return;
        }
      }
      // Auto-save profile info if not already set
      const profileUpdates: Record<string, any> = {};
      if (!profile?.full_name && form.full_name) profileUpdates.full_name = form.full_name.trim();
      if (!profile?.phone && form.phone) profileUpdates.phone = form.phone.trim();
      if (!profile?.address && fullAddress) {
        profileUpdates.address = fullAddress;
        profileUpdates.city = addressData.division;
      }
      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at = new Date().toISOString();
        await supabase.from("profiles").update(profileUpdates).eq("id", user.id);
      }

      const paymentAmount = form.payment_type === "partial" ? Math.ceil(grandTotal * 0.4) : grandTotal;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total_amount: grandTotal,
          shipping_address: fullAddress,
          shipping_city: addressData.division,
          phone: form.phone,
          notes: form.notes,
          status: "pending_payment",
          payment_type: form.payment_type,
          payment_amount: paymentAmount,
          estimated_cargo_charge: totalCargoCharge,
          domestic_delivery_charge: 0,
          wallet_amount_used: walletApplied,
          customer_ip: clientIp || null,
        } as any)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: calcItemPrice(item).final / item.quantity,
        selected_size: item.selected_size,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Update coupon usage if applied
      if (appliedCoupon) {
        await supabase
          .from("coupons")
          .update({ used_count: (appliedCoupon.used_count || 0) + 1 })
          .eq("id", appliedCoupon.id);
      }

      // Note: Wallet debit is now handled in Payment.tsx when proof is submitted

      // Clear cart
      const sessionId = localStorage.getItem("goodyhut_session");
      if (sessionId) {
        await supabase.from("cart_items").delete().eq("session_id", sessionId);
      }

      // Create initial order status history
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "pending_payment",
        note: "Order placed, awaiting payment proof",
      });

      // Send emails (non-blocking)
      const emailItems = items.map(item => ({
        title: item.product?.title || "Product",
        quantity: item.quantity,
      }));
      sendOrderStatusEmail(
        { id: order.id, user_id: user.id, status: "pending_payment", total_amount: grandTotal, estimated_cargo_charge: totalCargoCharge },
        emailItems
      ).catch(console.error);
      sendAdminOrderNotification(
        { id: order.id, user_id: user.id, status: "pending_payment", total_amount: grandTotal },
        emailItems
      ).catch(console.error);

      await refresh();

      // Track purchase event — content_ids match catalog feed g:id
      const purchaseContentIds = items.map(i => 
        getCatalogContentId(i.product_id, i.product?.variants, i.selected_size)
      );
      trackEvent("purchase", {
        event_id: order.id,
        value: grandTotal,
        currency: "BDT",
        content_ids: purchaseContentIds,
        content_type: "product",
        user_id: user.id,
        full_name: form.full_name,
        phone: form.phone,
        email: profile?.email || "",
        city: addressData.district,
        state: addressData.division,
        postal_code: "",
        country: "BD",
        items: items.map(i => ({ 
          item_id: getCatalogContentId(i.product_id, i.product?.variants, i.selected_size), 
          item_name: i.product?.title, 
          quantity: i.quantity, 
          price: calcItemPrice(i).final / i.quantity 
        })),
      });

      orderPlacedRef.current = true;
      toast({ title: "Order placed! Now make payment 💳" });
      navigate(`/payment/${order.id}`);

    } catch (error: any) {
      console.error("Order error:", error);
      toast({ title: "Failed to place order", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag size={64} className="mx-auto text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">Add some products to checkout</p>
          <Button onClick={() => navigate("/")}>Continue Shopping</Button>
        </div>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      <div className="container mx-auto px-3 sm:px-4 pt-16 sm:pt-28 md:pt-6 pb-4 sm:py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
          <button onClick={() => navigate(-1)} className="p-1.5 sm:p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg sm:text-2xl font-display font-bold text-foreground">Checkout</h1>
          <span className="text-xs sm:text-sm text-muted-foreground ml-auto">{items.length} items</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Shipping Information */}
            <Card>
              <CardHeader className="px-4 py-3 sm:p-6 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin size={20} className="text-primary" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="full_name"
                        placeholder="Your full name"
                        value={form.full_name}
                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="01XXXXXXXXX"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Picker */}
                <AddressPicker value={addressData} onChange={setAddressData} />

                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special instructions..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Type - Desktop only (mobile shows after Total) */}
            <Card className="hidden md:block overflow-hidden">
              <CardHeader className="px-4 py-3 sm:p-6 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <CreditCard size={20} className="text-primary" />
                  Payment Option
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
                <div className="grid grid-cols-2 gap-3">
                  {/* Partial Payment */}
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => setForm({ ...form, payment_type: "partial" })}
                    className={`relative rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 border-2 ${
                      form.payment_type === "partial"
                        ? "border-primary bg-primary/5 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]"
                        : "border-border/60 bg-card hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <AnimatePresence>
                      {form.payment_type === "partial" && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check size={14} className="text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                      <Wallet className="w-5 h-5 text-secondary" />
                    </div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">40% Advance</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pay the rest on delivery</p>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-lg sm:text-xl font-bold text-primary">৳{Math.ceil(grandTotal * 0.4).toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">Due later: ৳{(grandTotal - Math.ceil(grandTotal * 0.4)).toLocaleString()}</p>
                    </div>
                  </motion.button>

                  {/* Full Payment */}
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => setForm({ ...form, payment_type: "full" })}
                    className={`relative rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 border-2 ${
                      form.payment_type === "full"
                        ? "border-primary bg-primary/5 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]"
                        : "border-border/60 bg-card hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <AnimatePresence>
                      {form.payment_type === "full" && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check size={14} className="text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <BadgeCheck className="w-5 h-5 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">Full Payment</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pay everything upfront</p>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-lg sm:text-xl font-bold text-primary">৳{grandTotal.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">No dues remaining</p>
                    </div>
                  </motion.button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Order Items */}
            <Card>
              <CardHeader className="px-4 py-3 sm:p-6 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShoppingBag size={20} className="text-primary" />
                  Order Summary ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
                <div className="max-h-[280px] overflow-y-auto space-y-3 sm:space-y-4 pr-1 scrollbar-thin">
                {items.map(item => {
                  const pricing = calcItemPrice(item);
                  const disc = getDiscount(item.product_id);

                  return (
                    <div key={item.id} className="flex gap-2.5 sm:gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt={item.product.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{item.product?.title}</h4>
                        {item.selected_size && (
                          <p className="text-xs text-muted-foreground">Size: {item.selected_size}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm font-semibold text-primary">৳{pricing.final.toLocaleString()}</span>
                          {pricing.saved > 0 && (
                            <span className="text-xs text-muted-foreground line-through">৳{pricing.original.toLocaleString()}</span>
                          )}
                          {pricing.hasDealDiscount && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary/10 text-primary text-[10px]">
                              <Tag size={8} /> Deal
                            </span>
                          )}
                          {pricing.hasCampaignDiscount && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px]">
                              <Tag size={8} /> Campaign
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </CardContent>
            </Card>

            {/* Coupon */}
            <Card>
              <CardContent className="px-4 py-4 sm:pt-6 sm:p-6">
                <Label className="flex items-center gap-2 mb-2">
                  <Percent size={16} className="text-primary" />
                  Have a coupon?
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon}
                  />
                  {appliedCoupon ? (
                    <Button variant="outline" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}>
                      Remove
                    </Button>
                  ) : (
                    <Button onClick={applyCoupon} disabled={couponLoading}>
                      {couponLoading ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                    </Button>
                  )}
                </div>
                {couponError && <p className="text-sm text-destructive mt-2">{couponError}</p>}
                {appliedCoupon && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                    <Check size={16} />
                    <span>Coupon "{appliedCoupon.code}" applied!</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Wallet Balance */}
            {walletBalance > 0 && (
              <Card>
                <CardContent className="px-4 py-4 sm:pt-6 sm:p-6">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Wallet size={16} className="text-primary" />
                      Wallet Balance: <span className="font-bold text-primary">৳{walletBalance.toLocaleString()}</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setUseWallet(!useWallet)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${useWallet ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${useWallet ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {useWallet && (
                    <p className="text-xs text-muted-foreground mt-2">৳{walletApplied.toLocaleString()} will be deducted from your wallet</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Price Breakdown */}
            <Card>
              <CardContent className="px-4 py-4 sm:pt-6 sm:p-6 space-y-2.5 sm:space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>৳{(subtotal + totalSaved).toLocaleString()}</span>
                </div>
                {totalSaved > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1"><Tag size={14} /> Discount</span>
                    <span>−৳{totalSaved.toLocaleString()}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1"><Percent size={14} /> Coupon</span>
                    <span>−৳{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                {totalCargoCharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <button
                      onClick={() => setShowCargoBreakdown(true)}
                      className="text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors group"
                    >
                      <Plane size={14} /> Int'l Cargo (আনুমানিক)
                      <span className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium group-hover:bg-primary/20 transition-colors">
                        Details <ChevronRight size={10} />
                      </span>
                    </button>
                    <span>৳{totalCargoCharge.toLocaleString()}</span>
                  </div>
                )}
                {walletApplied > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1"><Wallet size={14} /> Wallet</span>
                    <span>−৳{walletApplied.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">৳{grandTotal.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Option - Mobile only (after Total) */}
            <Card className="md:hidden overflow-hidden">
              <CardHeader className="px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard size={20} className="text-primary" />
                  Payment Option
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Partial Payment - Mobile */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => setForm({ ...form, payment_type: "partial" })}
                    className={`relative rounded-2xl p-3.5 text-left transition-all duration-300 border-2 ${
                      form.payment_type === "partial"
                        ? "border-primary bg-primary/5 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.25)]"
                        : "border-border/60 bg-card"
                    }`}
                  >
                    <AnimatePresence>
                      {form.payment_type === "partial" && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check size={12} className="text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
                      <Wallet className="w-4 h-4 text-secondary" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">40% Advance</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Rest on delivery</p>
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-base font-bold text-primary">৳{Math.ceil(grandTotal * 0.4).toLocaleString()}</p>
                    </div>
                  </motion.button>

                  {/* Full Payment - Mobile */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => setForm({ ...form, payment_type: "full" })}
                    className={`relative rounded-2xl p-3.5 text-left transition-all duration-300 border-2 ${
                      form.payment_type === "full"
                        ? "border-primary bg-primary/5 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.25)]"
                        : "border-border/60 bg-card"
                    }`}
                  >
                    <AnimatePresence>
                      {form.payment_type === "full" && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check size={12} className="text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <BadgeCheck className="w-4 h-4 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">Full Payment</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Pay everything now</p>
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-base font-bold text-primary">৳{grandTotal.toLocaleString()}</p>
                    </div>
                  </motion.button>
                </div>
                <motion.div whileTap={{ scale: 0.98 }} className="mt-4">
                  <Button
                    onClick={placeOrder}
                    disabled={loading}
                    className="w-full py-5 text-base font-semibold gradient-brand"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                      <Check size={18} className="mr-2" />
                    )}
                    {user ? "Proceed to Payment" : "Login to Order"}
                  </Button>
                </motion.div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  By placing this order, you agree to our Terms of Service
                </p>
              </CardContent>
            </Card>

            {/* Shipping Disclaimer */}
            {totalCargoCharge > 0 && (
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-accent/20 to-primary/5 p-3 sm:p-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-accent/30 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Plane size={15} className="text-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">কার্গো শিপিং চার্জ সম্পর্কে জানুন</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      আন্তর্জাতিক কার্গো চার্জ আনুমানিক ওজনের ওপর হিসাব করা হয়েছে। বাংলাদেশে পৌঁছানোর পর প্রকৃত ওজন মেপে চূড়ান্ত হিসাব হবে —
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span className="flex items-center gap-1 text-destructive/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                        বেশি হলে পরিশোধ করতে হবে
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        কম হলে ওয়ালেটে রিফান্ড
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Local Delivery Info Notice */}
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-50/80 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-amber-950/20 p-3 sm:p-4">
              <div className="relative flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Package size={15} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">লোকাল ডেলিভারি চার্জ সম্পর্কে</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    বাংলাদেশের অভ্যন্তরীণ ডেলিভারি চার্জ পণ্য বাংলাদেশে পৌঁছানোর পর ওজন ও লোকেশন অনুযায়ী হিসাব করা হবে। এই চার্জ <span className="font-semibold text-foreground">ক্যাশ অন ডেলিভারিতে (COD)</span> পরিশোধ করতে হবে।
                  </p>
                </div>
              </div>
            </div>

            {/* Place Order Button - Desktop only (mobile has sticky bottom) */}
            <div className="hidden md:block">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={placeOrder}
                  disabled={loading}
                  className="w-full py-6 text-lg font-semibold gradient-brand"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin mr-2" />
                  ) : (
                    <Check size={20} className="mr-2" />
                  )}
                  {user ? "Proceed to Payment" : "Login to Order"}
                </Button>
              </motion.div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                By placing this order, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Cargo Breakdown Modal */}
      {showCargoBreakdown && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCargoBreakdown(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
          >
            <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Plane size={18} className="text-primary" /> Cargo Charge Breakdown
              </h3>
              <button onClick={() => setShowCargoBreakdown(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {items.map((item) => {
                const product = item.product as any;
                if (!product) return null;
                const chargeType = product.shipping_charge_type || "per_kg";
                const catShipping = categoryShippingMap[product.category_id || ""];
                const rate = product.shipping_rate_override ?? (chargeType === "per_piece"
                  ? (catShipping?.shipping_rate_per_piece || 0)
                  : (catShipping?.shipping_rate_per_kg || 0));
                const variantWeight = getVariantWeight(product.variants, item.selected_size);
                const weightGm = variantWeight ?? (product.estimated_weight_gm || 0);
                const itemCargo = calcCargoCharge(product, item.quantity, item.selected_size, categoryShippingMap);

                return (
                  <div key={item.id} className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                    <div className="flex items-start gap-3">
                      {product.product_images?.[0]?.image_url && (
                        <img src={product.product_images[0].image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-muted flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight truncate">{product.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          {item.selected_size && (
                            <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.selected_size}</span>
                          )}
                          <span className="text-[11px] text-muted-foreground">Qty: {item.quantity}</span>
                          <span className="text-[11px] text-muted-foreground">{product.category || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-background p-2">
                        <p className="text-muted-foreground mb-0.5 flex items-center gap-1"><Scale size={11} /> Est. Weight</p>
                        <p className="font-semibold text-foreground">{weightGm}gm {chargeType === "per_piece" ? "(per piece)" : `(${(weightGm / 1000).toFixed(2)}kg)`}</p>
                      </div>
                      <div className="rounded-lg bg-background p-2">
                        <p className="text-muted-foreground mb-0.5">Charge Type</p>
                        <p className="font-semibold text-foreground">{chargeType === "per_piece" ? "Per Piece" : "Per KG"}</p>
                      </div>
                      <div className="rounded-lg bg-background p-2">
                        <p className="text-muted-foreground mb-0.5">Rate</p>
                        <p className="font-semibold text-foreground">৳{rate}/{chargeType === "per_piece" ? "pc" : "kg"}</p>
                      </div>
                      <div className="rounded-lg bg-primary/10 p-2">
                        <p className="text-primary/70 mb-0.5">Subtotal</p>
                        <p className="font-bold text-primary">৳{Math.round(itemCargo).toLocaleString()}</p>
                      </div>
                    </div>
                    {chargeType !== "per_piece" && (
                      <p className="text-[10px] text-muted-foreground">
                        ৳{rate}/kg × {(weightGm / 1000).toFixed(2)}kg × {item.quantity}pc = ৳{Math.round(itemCargo).toLocaleString()}
                      </p>
                    )}
                    {chargeType === "per_piece" && (
                      <p className="text-[10px] text-muted-foreground">
                        ৳{rate}/pc × {item.quantity}pc = ৳{Math.round(itemCargo).toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })}
              {/* Total */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-2"><Package size={16} className="text-primary" /> Total Estimated Cargo</span>
                <span className="text-xl font-bold text-primary">৳{totalCargoCharge.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                ⚠️ এটি আনুমানিক চার্জ। বাংলাদেশে পৌঁছানোর পর প্রকৃত ওজন মেপে চূড়ান্ত হিসাব হবে।
              </p>
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Checkout;
