import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Check, Loader2, Copy, ImageIcon, X, Receipt, Package, Truck, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { sendOrderSms } from "@/lib/smsUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import bkashLogo from "@/assets/bkash-logo.webp";
import nagadLogo from "@/assets/nagad-logo.png";
import ificLogo from "@/assets/ific-logo.jpg";
import logoImg from "@/assets/logo-transparent.png";

type PaymentMethod = "bkash" | "nagad" | "bank";

const PAYMENT_INFO: Record<PaymentMethod, { name: string; logo: string; color: string; instructions: string[]; number?: string; bankDetails?: { label: string; value: string }[] }> = {
  bkash: {
    name: "bKash",
    logo: bkashLogo,
    color: "border-rose-500 bg-rose-50 dark:bg-rose-950/20",
    number: "01777889284",
    instructions: [
      "Open your bKash app",
      "Go to \"Send Money\" option",
      "Send money to the number below",
      "Enter your order number as Reference",
      "Take a screenshot after successful payment and upload below",
    ],
  },
  nagad: {
    name: "Nagad",
    logo: nagadLogo,
    color: "border-orange-500 bg-orange-50 dark:bg-orange-950/20",
    number: "01777889284",
    instructions: [
      "Open your Nagad app",
      "Go to \"Send Money\" option",
      "Send money to the number below",
      "Enter your order number as Reference",
      "Take a screenshot after successful payment and upload below",
    ],
  },
  bank: {
    name: "Bank Transfer",
    logo: ificLogo,
    color: "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
    bankDetails: [
      { label: "Bank", value: "IFIC Bank PLC" },
      { label: "Account Name", value: "Mohammad Emon" },
      { label: "Account No", value: "0230140804811" },
      { label: "Branch", value: "Dupchanchia" },
    ],
    instructions: [
      "Open your banking app or internet banking",
      "Go to \"NPSB Fund Transfer\" option",
      "⚠️ Only NPSB transfer is accepted. BEFTN & RTGS will NOT be accepted.",
      "Enter your order number as Reference/Narration",
      "Take a screenshot after successful transfer and upload below",
      "⚠️ All payments are Non-Refundable",
    ],
  },
};

const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("bkash");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(id, quantity, price, selected_size, products:product_id(title, slug, product_images(image_url, sort_order)))")
        .eq("id", id)
        .single();
      setOrder(data);
      setOrderItems(data?.order_items || []);
      setLoading(false);
      const isDue = data?.status === "adjustment_due" && data?.adjustment_status === "due";
      if (data?.payment_proof_url && !isDue) {
        setSubmitted(true);
      }
    };
    fetchOrder();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File size cannot exceed 5MB", variant: "destructive" });
      return;
    }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key || text);
    setTimeout(() => setCopiedKey(null), 1500);
    toast({ title: "Copied!" });
  };

  const isDueBill = order?.status === "adjustment_due" && order?.adjustment_status === "due";
  const paymentAmountValue = isDueBill
    ? Math.abs(Number(order?.shipping_adjustment || 0))
    : Number(order?.payment_amount || order?.total_amount || 0);

  const handleSubmit = async () => {
    if (!proofFile || !order || !user) return;
    setSubmitting(true);

    try {
      const imageUrl = await uploadToCloudinary(proofFile, "payment-proofs");

      if (isDueBill) {
        // Due bill payment — save to separate due columns, don't touch original payment info
        await supabase
          .from("orders")
          .update({
            due_payment_method: method,
            due_payment_proof_url: imageUrl,
            due_payment_verified: false,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", order.id);

        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "adjustment_due",
          note: `Due bill payment proof submitted via ${PAYMENT_INFO[method].name}. Amount: ৳${paymentAmountValue}`,
        });
      } else {
        // Regular payment
        await supabase
          .from("orders")
          .update({
            payment_method: method,
            payment_proof_url: imageUrl,
            status: "pending",
          } as any)
          .eq("id", order.id);

        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "pending",
          note: `Payment proof submitted via ${PAYMENT_INFO[method].name}. Verification pending.`,
        });

        // Debit wallet now (only when proof is actually submitted)
        const walletUsed = Number(order.wallet_amount_used || 0);
        if (walletUsed > 0 && user) {
          const { data: walletData } = await supabase.from("wallet").select("balance").eq("user_id", user.id).single();
          const currentBalance = (walletData as any)?.balance || 0;
          await supabase.from("wallet").update({ balance: currentBalance - walletUsed, updated_at: new Date().toISOString() } as any).eq("user_id", user.id);
          await supabase.from("wallet_transactions").insert({
            user_id: user.id, amount: walletUsed, type: "debit", reason: "order_usage", order_id: order.id,
          } as any);
        }
      }

      // Send SMS notification
      if (order.phone && !isDueBill) {
        const shortId = order.id.slice(0, 8).toUpperCase();
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        sendOrderSms("order_payment_submitted", order.phone, {
          name: profile?.full_name || "Customer",
          order_id: shortId,
          tracking_link: `https://www.goodyhut.bd/track-order/${order.id}`,
        });
      }

      setSubmitted(true);
      toast({ title: "Payment proof submitted!", description: isDueBill ? "Admin will verify your due payment." : "Your order will be confirmed once admin verifies the payment." });
    } catch (error: any) {
      console.error("Payment proof upload error:", error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-28 pb-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Order not found</h1>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const paymentAmount = paymentAmountValue;
  const info = PAYMENT_INFO[method];

  if (submitted) {
    const methodName = isDueBill
      ? (order.due_payment_method ? PAYMENT_INFO[order.due_payment_method as PaymentMethod]?.name || order.due_payment_method : PAYMENT_INFO[method].name)
      : (order.payment_method ? PAYMENT_INFO[order.payment_method as PaymentMethod]?.name || order.payment_method : PAYMENT_INFO[method].name);

    const productSubtotal = orderItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const walletUsed = Number(order.wallet_amount_used || 0);
    const estimatedCargo = Number(order.estimated_cargo_charge || 0);
    const domesticDelivery = Number(order.domestic_delivery_charge || 0);
    const shippingAdjustment = Number(order.shipping_adjustment || 0);

    return (
      <div className="min-h-screen bg-muted/30 pb-24 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 md:pt-28 pb-10 max-w-md">
          <div>

            {/* Receipt Card */}
            <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">

              {/* Receipt Header */}
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4 text-center border-b border-dashed border-border">
                <img src={logoImg} alt="GoodyHut" className="h-14 mx-auto mb-3 object-contain" />
                <h1 className="text-lg font-display font-bold text-foreground">
                  {isDueBill ? "Due Payment Submitted!" : "Payment Proof Submitted!"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Dhaka" })}
                </p>
              </div>

              {/* Order ID & Status */}
              <div className="px-6 py-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Order ID</span>
                  </div>
                  <span className="font-mono font-bold text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Payment Method</span>
                  </div>
                  <span className="text-sm font-medium">{methodName}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    ⏳ Verification Pending
                  </span>
                </div>
              </div>

              {/* Product Items */}
              {orderItems.length > 0 && (
                <div className="px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</span>
                  </div>
                  <div className="space-y-2.5">
                    {orderItems.map((item: any) => {
                      const img = item.products?.product_images?.sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))[0];
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted/60 flex-shrink-0 overflow-hidden">
                            {img?.image_url ? (
                              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight truncate">{item.products?.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Qty: {item.quantity}{item.selected_size && ` · ${item.selected_size}`}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-foreground whitespace-nowrap">৳{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="px-6 py-4 border-b border-dashed border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">৳{productSubtotal.toLocaleString()}</span>
                </div>
                {estimatedCargo > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Truck size={12} /> Cargo Charge</span>
                    <span className="text-foreground">৳{estimatedCargo.toLocaleString()}</span>
                  </div>
                )}
                {domesticDelivery > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Domestic Delivery</span>
                    <span className="text-foreground">৳{domesticDelivery.toLocaleString()}</span>
                  </div>
                )}
                {walletUsed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Wallet Used</span>
                    <span className="text-emerald-600">−৳{walletUsed.toLocaleString()}</span>
                  </div>
                )}
                {shippingAdjustment !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping Adjustment</span>
                    <span className={shippingAdjustment > 0 ? "text-destructive" : "text-emerald-600"}>
                      {shippingAdjustment > 0 ? "+" : "−"}৳{Math.abs(shippingAdjustment).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="px-6 py-4 border-b border-border">
                {!isDueBill && (
                  <div className="flex justify-between items-center">
                    <span className="font-display font-bold text-foreground">Grand Total</span>
                    <span className="text-xl font-display font-bold text-primary">৳{Number(order.total_amount).toLocaleString()}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center ${!isDueBill ? "mt-2 pt-2 border-t border-border/50" : ""}`}>
                  <span className="text-sm font-semibold text-foreground">
                    {isDueBill ? "Due Amount" : order.payment_type === "partial" ? "Paid (40% Advance)" : "Amount Paid"}
                  </span>
                  <span className="text-lg font-bold text-primary">৳{Number(paymentAmount).toLocaleString()}</span>
                </div>
                {!isDueBill && order.payment_type === "partial" && (
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Due on Delivery</span>
                    <span className="text-sm font-semibold text-destructive">৳{(Number(order.total_amount) - Number(order.payment_amount)).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Shipping Info */}
              {order.shipping_address && (
                <div className="px-6 py-3 border-b border-border/50">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Delivery Address</p>
                  <p className="text-sm text-foreground">{order.shipping_address}</p>
                  {order.shipping_city && <p className="text-xs text-muted-foreground">{order.shipping_city}{order.shipping_postal_code && ` - ${order.shipping_postal_code}`}</p>}
                  {order.phone && <p className="text-xs text-muted-foreground mt-0.5">📞 {order.phone}</p>}
                </div>
              )}

              {/* Footer Note */}
              <div className="px-6 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {isDueBill
                    ? "Your due payment will be verified by admin. Order will be updated once confirmed."
                    : "Your payment will be verified by admin. Once verified, your order will be confirmed."}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">Thank you for shopping with GoodyHut ❤️</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-5">
              <Button onClick={() => navigate(`/track-order/${order.id}`)} className="flex-1 gradient-brand">
                Track Order
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
        <div className="hidden md:block"><Footer /></div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 pt-16 md:pt-28 pb-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-display font-bold text-foreground">{isDueBill ? "Pay Due Amount" : "Make Payment"}</h1>
        </div>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isDueBill ? "Due Shipping Charge" : order.payment_type === "partial" ? "40% Advance Payment" : "Full Payment"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">৳{Number(paymentAmount).toLocaleString()}</p>
                {!isDueBill && order.payment_type === "partial" && (
                  <p className="text-xs text-muted-foreground">Total: ৳{Number(order.total_amount).toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(Object.keys(PAYMENT_INFO) as PaymentMethod[]).map((key) => {
                const isSelected = method === key;
                return (
                  <motion.button
                    key={key}
                    onClick={() => setMethod(key)}
                    whileTap={{ scale: 0.98 }}
                    className={`relative w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                      isSelected
                        ? `${PAYMENT_INFO[key].color} shadow-lg`
                        : "border-border/60 bg-card hover:border-primary/30 hover:shadow-md"
                    }`}
                  >
                    {/* Logo */}
                    <img src={PAYMENT_INFO[key].logo} alt={PAYMENT_INFO[key].name} className="h-7 w-auto object-contain shrink-0" />

                    {/* Text */}
                    <div className="flex-1 text-left">
                      <motion.p
                        animate={{ x: isSelected ? 2 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${
                          isSelected ? "text-foreground" : "text-foreground/80"
                        }`}
                      >
                        {PAYMENT_INFO[key].name}
                      </motion.p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        {key === "bank" ? "IFIC Bank PLC" : `Send to ${PAYMENT_INFO[key].number}`}
                      </p>
                    </div>

                    {/* Radio indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      <motion.div
                        initial={false}
                        animate={{ scale: isSelected ? 1 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-2 h-2 rounded-full bg-primary-foreground"
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <img src={info.logo} alt={info.name} className="h-6 w-auto object-contain" />
              {info.name} Payment Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {info.number && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <span className="text-sm font-medium">Number:</span>
                <span className="font-mono font-bold text-lg">{info.number}</span>
                <button onClick={() => copyToClipboard(info.number!, "number")} className="ml-auto p-1.5 rounded-md hover:bg-muted transition-colors">
                  <span className="relative w-4 h-4 flex items-center justify-center">
                    <Copy size={16} className={`text-muted-foreground transition-all duration-200 ${copiedKey === "number" ? "scale-0 opacity-0" : "scale-100 opacity-100"}`} />
                    <Check size={16} className={`absolute text-emerald-500 transition-all duration-200 ${copiedKey === "number" ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
                  </span>
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm font-medium">Payment Amount:</span>
              <span className="font-bold text-lg text-primary">৳{Number(paymentAmount).toLocaleString()}</span>
              <button onClick={() => copyToClipboard(String(paymentAmount), "amount")} className="ml-auto p-1.5 rounded-md hover:bg-muted transition-colors">
                <span className="relative w-4 h-4 flex items-center justify-center">
                  <Copy size={16} className={`text-muted-foreground transition-all duration-200 ${copiedKey === "amount" ? "scale-0 opacity-0" : "scale-100 opacity-100"}`} />
                  <Check size={16} className={`absolute text-emerald-500 transition-all duration-200 ${copiedKey === "amount" ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
                </span>
              </button>
            </div>
            {info.bankDetails && (
              <div className="space-y-2">
                {info.bankDetails.map((detail, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <span className="text-sm font-medium text-muted-foreground">{detail.label}:</span>
                    <span className="font-bold text-foreground">{detail.value}</span>
                    <button onClick={() => copyToClipboard(detail.value, `bank-${i}`)} className="ml-auto p-1.5 rounded-md hover:bg-muted transition-colors">
                      <span className="relative w-4 h-4 flex items-center justify-center">
                        <Copy size={16} className={`text-muted-foreground transition-all duration-200 ${copiedKey === `bank-${i}` ? "scale-0 opacity-0" : "scale-100 opacity-100"}`} />
                        <Check size={16} className={`absolute text-emerald-500 transition-all duration-200 ${copiedKey === `bank-${i}` ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <ol className="space-y-2">
              {info.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Upload Screenshot */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Upload Payment Proof</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {proofPreview ? (
              <div className="relative">
                <img src={proofPreview} alt="Payment proof" className="w-full max-h-80 object-contain rounded-lg border border-border" />
                <button
                  onClick={() => { setProofFile(null); setProofPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background border border-border"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-12 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon size={24} className="text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Upload Screenshot</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG — Max 5MB</p>
                </div>
              </button>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleSubmit}
            disabled={!proofFile || submitting}
            className="w-full py-6 text-lg font-semibold gradient-brand"
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin mr-2" />
            ) : (
              <Upload size={20} className="mr-2" />
            )}
            Submit Payment Proof
          </Button>
        </motion.div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          After submitting payment proof, admin will verify and confirm your order
        </p>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Payment;
