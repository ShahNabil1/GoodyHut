import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Package, Check, Truck, ShieldCheck, Clock, AlertCircle, X, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string; icon: any; step: number }> = {
  auto_saved: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: Clock, step: 0 },
  pending_payment: { label: "Pending Payment", color: "bg-amber-100 text-amber-700", icon: Clock, step: 0 },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock, step: 0 },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: Check, step: 1 },
  processing: { label: "Processing/Purchasing", color: "bg-indigo-100 text-indigo-700", icon: Package, step: 2 },
  received_at_warehouse: { label: "Received at China Warehouse", color: "bg-violet-100 text-violet-700", icon: Package, step: 2 },
  shipped_via_air: { label: "Shipped via Air Cargo", color: "bg-purple-100 text-purple-700", icon: Truck, step: 3 },
  arrived_in_bd: { label: "Arrived in BD / Customs", color: "bg-amber-100 text-amber-700", icon: ShieldCheck, step: 4 },
  awaiting_weight: { label: "Awaiting Weight", color: "bg-blue-100 text-blue-700", icon: Package, step: 4 },
  adjustment_due: { label: "Due Payment", color: "bg-amber-100 text-amber-700", icon: AlertCircle, step: 4 },
  at_bd_warehouse: { label: "At BD Warehouse", color: "bg-sky-100 text-sky-700", icon: Package, step: 4 },
  handed_to_steadfast: { label: "Handed over to Steadfast", color: "bg-indigo-100 text-indigo-700", icon: Truck, step: 5 },
  out_for_delivery: { label: "Out for Delivery", color: "bg-orange-100 text-orange-700", icon: Truck, step: 5 },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700", icon: Check, step: 6 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: X, step: -1 },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-700", icon: AlertCircle, step: -1 },
  // Legacy
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-700", icon: Truck, step: 3 },
  in_transit: { label: "In Transit", color: "bg-orange-100 text-orange-700", icon: Truck, step: 4 },
  customs: { label: "Customs", color: "bg-amber-100 text-amber-700", icon: ShieldCheck, step: 5 },
};

const TrackOrder = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Dhaka" });

  const fetchOrder = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("orders")
      .select(`*, order_items(id, quantity, price, selected_size, products:product_id(title, slug, product_images(image_url)))`)
      .eq("id", id)
      .single();
    setOrder(data);

    const { data: hist } = await supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false });
    setHistory(hist || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrder(); }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`track-order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => fetchOrder())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_status_history", filter: `order_id=eq.${id}` }, () => fetchOrder())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-20">
          <div className="max-w-2xl mx-auto space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl skeleton-shimmer" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-2 md:pt-24 pb-10 text-center">
          <Package size={48} className="mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="font-display text-xl font-bold">Order not found</h2>
        </div>
      </div>
    );
  }

  const sc = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-2 md:pt-24 pb-24 max-w-2xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Go Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-2xl bg-card border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
              </div>
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${sc.color}`}>
                <StatusIcon size={14} /> {sc.label}
              </span>
            </div>

            {order.tracking_number && (
              <p className="text-sm mb-2"><span className="text-muted-foreground">Tracking:</span> <span className="font-mono font-medium">{order.tracking_number}</span></p>
            )}

            <p className="text-lg font-display font-bold text-primary">Total: ৳{Number(order.total_amount).toLocaleString()}</p>
          </div>

          {sc.step >= 0 && (
            <div className="rounded-2xl bg-card border border-border p-6">
              <h3 className="font-display font-semibold mb-4">Order Tracking</h3>
              <div className="flex items-center gap-1">
                {["pending", "confirmed", "processing", "shipped", "in_transit", "customs", "delivered"].map((s, i) => {
                  const active = sc.step >= i;
                  return (
                    <div key={s} className="flex-1 flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${active ? "gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                      <p className={`text-[9px] mt-1 text-center ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {statusConfig[s]?.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="font-display font-semibold mb-3">Products</h3>
            <div className="space-y-3">
              {(order.order_items || []).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center overflow-hidden">
                    {item.products?.product_images?.[0]?.image_url ? (
                      <img src={item.products.product_images[0].image_url} alt={item.products?.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.products?.title}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}{item.selected_size && ` · Size: ${item.selected_size}`}</p>
                  </div>
                  <p className="text-sm font-semibold">৳{item.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {history.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-6">
              <h3 className="font-display font-semibold mb-3">Update History</h3>
              <div className="space-y-3">
                {history.map((h: any) => {
                  const hsc = statusConfig[h.status];
                  return (
                    <div key={h.id} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${hsc?.color || "bg-muted"}`}>
                        {hsc?.label || h.status}
                      </span>
                      <div>
                        {h.note && <p className="text-sm text-foreground">{h.note}</p>}
                        <p className="text-xs text-muted-foreground">{formatDate(h.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {order.notes && (
            <div className="rounded-2xl bg-card border border-border p-6">
              <h3 className="font-display font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </motion.div>
      </main>
      <div className="hidden lg:block"><Footer /></div>
    </div>
  );
};

export default TrackOrder;
