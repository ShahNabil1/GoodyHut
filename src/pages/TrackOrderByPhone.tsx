import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Package, Search, Clock, Check, Truck, ShieldCheck, AlertCircle, X, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  auto_saved: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: Clock },
  pending_payment: { label: "Pending Payment", color: "bg-amber-100 text-amber-700", icon: Clock },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: Check },
  processing: { label: "Processing/Purchasing", color: "bg-indigo-100 text-indigo-700", icon: Package },
  received_at_warehouse: { label: "Received at China Warehouse", color: "bg-violet-100 text-violet-700", icon: Package },
  shipped_via_air: { label: "Shipped via Air Cargo", color: "bg-purple-100 text-purple-700", icon: Truck },
  arrived_in_bd: { label: "Arrived in BD / Customs", color: "bg-amber-100 text-amber-700", icon: ShieldCheck },
  awaiting_weight: { label: "Awaiting Weight", color: "bg-teal-100 text-teal-700", icon: Package },
  adjustment_due: { label: "Due Payment", color: "bg-rose-100 text-rose-700", icon: AlertCircle },
  at_bd_warehouse: { label: "At BD Warehouse", color: "bg-sky-100 text-sky-700", icon: Package },
  handed_to_steadfast: { label: "Handed to Steadfast", color: "bg-indigo-100 text-indigo-700", icon: Truck },
  out_for_delivery: { label: "Out for Delivery", color: "bg-orange-100 text-orange-700", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700", icon: Check },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: X },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-700", icon: AlertCircle },
  // Legacy
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-700", icon: Truck },
  in_transit: { label: "In Transit", color: "bg-orange-100 text-orange-700", icon: Truck },
  customs: { label: "Customs", color: "bg-amber-100 text-amber-700", icon: ShieldCheck },
};

const TrackOrderByPhone = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) return;

    setLoading(true);
    setSearched(true);

    // Search orders by phone number
    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items(id, quantity, price, selected_size, products:product_id(title, slug, product_images(image_url)))`)
      .eq("phone", cleanPhone)
      .order("created_at", { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-2 md:pt-24 pb-28 max-w-xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="text-center pt-4">
            <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-3">
              <Truck size={28} className="text-primary-foreground" />
            </div>
            <h1 className="font-display text-xl font-bold">Track Your Order</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter the phone number you used while ordering</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="tel"
              placeholder="e.g. 01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 h-12 rounded-xl text-base"
            />
            <Button type="submit" disabled={loading || phone.replace(/[^0-9]/g, "").length < 10} className="h-12 px-5 rounded-xl gradient-brand">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </Button>
          </form>

          {/* Results */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-12">
                <Loader2 size={28} className="animate-spin text-primary" />
              </motion.div>
            )}

            {!loading && searched && orders.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-12">
                <Package size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-display font-semibold">No orders found</p>
                <p className="text-sm text-muted-foreground mt-1">Please check the phone number and try again</p>
              </motion.div>
            )}

            {!loading && orders.length > 0 && (
              <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-sm text-muted-foreground">{orders.length} order{orders.length > 1 ? "s" : ""} found</p>
                {orders.map((order) => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const itemCount = (order.order_items || []).reduce((sum: number, i: any) => sum + i.quantity, 0);

                  return (
                    <motion.button
                      key={order.id}
                      onClick={() => navigate(`/track-order/${order.id}`)}
                      className="w-full text-left rounded-2xl bg-card border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                          <StatusIcon size={12} /> {sc.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">৳{Number(order.total_amount).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {itemCount} item{itemCount > 1 ? "s" : ""} · {formatDate(order.created_at)}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </div>

                      {/* Product thumbnails */}
                      {order.order_items?.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {order.order_items.slice(0, 4).map((item: any) => (
                            <div key={item.id} className="w-10 h-10 rounded-lg bg-muted/60 overflow-hidden flex-shrink-0">
                              {item.products?.product_images?.[0]?.image_url ? (
                                <img src={item.products.product_images[0].image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-muted/40" />
                              )}
                            </div>
                          ))}
                          {order.order_items.length > 4 && (
                            <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center text-xs text-muted-foreground font-medium">
                              +{order.order_items.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
      <div className="hidden lg:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default TrackOrderByPhone;
