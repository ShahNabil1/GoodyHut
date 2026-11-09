import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { isDeveloperEmail } from "@/hooks/useDeveloper";
import { format, formatDistanceToNow, subMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import {
  Ban, Trash2, Shield, X, Search, Phone, MessageSquare,
  ShoppingCart, Package, Send, Tag, ChevronDown, ChevronRight,
  Filter, Users, TrendingUp, Clock, UserX, Crown, Gift, Copy, Check, ArrowLeft,
  Percent, BadgeDollarSign, Megaphone
} from "lucide-react";

// ─── Types ──────────────────────────────
interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  banned: boolean | null;
  created_at: string;
  updated_at: string;
}

interface OrderWithItems {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  shipping_address: string | null;
  shipping_city: string | null;
  phone: string | null;
  tracking_number: string | null;
  notes: string | null;
  items: { id: string; product_id: string; quantity: number; price: number; selected_size: string | null; product_title?: string }[];
}

type FilterType = "all" | "most_bought" | "inactive_2m" | "no_buys";

// ─── Main Component ─────────────────────
const CRM = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // List state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [orderStats, setOrderStats] = useState<Record<string, { count: number; total: number; lastOrder: string | null }>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  // Detail state
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userOrders, setUserOrders] = useState<OrderWithItems[]>([]);
  const [userCart, setUserCart] = useState<any[]>([]);
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // SMS modal
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsApiStatus, setSmsApiStatus] = useState<{ ok: boolean; message: string; latency?: number } | null>(null);
  const [smsApiChecking, setSmsApiChecking] = useState(false);
  const [smsTemplates, setSmsTemplates] = useState<{ id: string; title: string; message: string }[]>([]);

  // Coupon modal
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "", discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "", min_order_amount: "", max_uses: "1", expires_days: "30", note: "",
  });
  const [couponSaving, setCouponSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Personal discount state
  const [userDiscounts, setUserDiscounts] = useState<any[]>([]);
  const [discountModal, setDiscountModal] = useState<{ cartItem: any } | null>(null);
  const [discountForm, setDiscountForm] = useState({
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "", expires_days: "30", note: "",
  });
  const [discountSaving, setDiscountSaving] = useState(false);

  // Cart modal state
  const [cartModalOpen, setCartModalOpen] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "danger" | "warning" | "info";
    onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", confirmLabel: "", variant: "danger", onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);


  // ─── Fetch all data ───────────────────
  const fetchAll = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, ordersRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
      supabase.from("orders").select("user_id, total_amount, created_at, status").neq("status", "auto_saved").order("created_at", { ascending: false }),
    ]);

    const aids = (rolesRes.data || []).map((r: any) => r.user_id);
    setAdminIds(aids);
    // Filter out admins AND developer emails (stealth mode)
    setProfiles((profilesRes.data || []).filter((p: any) => !aids.includes(p.id) && !isDeveloperEmail(p.email)));

    // Build order stats
    const stats: Record<string, { count: number; total: number; lastOrder: string | null }> = {};
    (ordersRes.data || []).forEach((o: any) => {
      if (!stats[o.user_id]) stats[o.user_id] = { count: 0, total: 0, lastOrder: null };
      stats[o.user_id].count++;
      // Only add to LTV if not cancelled/refunded
      if (!["cancelled", "refunded"].includes(o.status)) {
        stats[o.user_id].total += Number(o.total_amount);
      }
      if (!stats[o.user_id].lastOrder || o.created_at > stats[o.user_id].lastOrder!)
        stats[o.user_id].lastOrder = o.created_at;
    });
    setOrderStats(stats);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ─── Filters ──────────────────────────
  const filteredUsers = useMemo(() => {
    let list = profiles;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").includes(q)
      );
    }

    // Filter
    const twoMonthsAgo = subMonths(new Date(), 2).toISOString();
    switch (filter) {
      case "most_bought":
        list = [...list].sort((a, b) => (orderStats[b.id]?.total || 0) - (orderStats[a.id]?.total || 0));
        break;
      case "inactive_2m":
        list = list.filter(u => {
          const s = orderStats[u.id];
          return s && s.lastOrder && s.lastOrder < twoMonthsAgo;
        });
        break;
      case "no_buys":
        list = list.filter(u => !orderStats[u.id] || orderStats[u.id].count === 0);
        break;
    }

    return list;
  }, [profiles, searchQuery, filter, orderStats]);

  // ─── Open user detail ─────────────────
  const openUser = async (u: Profile) => {
    setSelectedUser(u);
    setDetailLoading(true);
    setUserOrders([]);
    setUserCart([]);
    setUserCoupons([]);
    setExpandedOrder(null);

    const [ordersRes, cartRes, couponsRes, discountsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
      supabase.from("cart_items").select("*, products(id, title, price, emoji, product_images(image_url))").eq("user_id", u.id),
      supabase.from("coupons").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
      supabase.from("personal_discounts").select("*").eq("user_id", u.id),
    ]);

    // Fetch order items for each order
    const orders = ordersRes.data || [];
    if (orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);
      const { data: allItems } = await supabase
        .from("order_items")
        .select("*, products(title)")
        .in("order_id", orderIds);

      const itemsByOrder: Record<string, any[]> = {};
      (allItems || []).forEach((item: any) => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push({
          ...item,
          product_title: item.products?.title || "Unknown",
        });
      });

      setUserOrders(orders.map((o: any) => ({ ...o, items: itemsByOrder[o.id] || [] })));
    }

    setUserCart((cartRes.data || []).map((c: any) => ({
      ...c,
      product: c.products ? {
        ...c.products,
        image_url: c.products.product_images?.[0]?.image_url,
      } : null,
    })));
    setUserCoupons(couponsRes.data || []);
    setUserDiscounts(discountsRes.data || []);
    setDetailLoading(false);
  };

  // ─── Actions ──────────────────────────
  const toggleBan = async (userId: string, banned: boolean) => {
    setConfirmDialog({
      open: true,
      title: banned ? "Unban User?" : "Ban User?",
      description: banned
        ? "This user will be able to access the platform again."
        : "This user will be blocked from accessing the platform.",
      confirmLabel: banned ? "Unban" : "Ban",
      variant: "warning",
      onConfirm: async () => {
        const { error } = await supabase.from("profiles").update({ banned: !banned }).eq("id", userId);
        if (error) toast({ title: "Failed", variant: "destructive" });
        else toast({ title: banned ? "User unbanned ✅" : "User banned 🚫" });
        fetchAll();
        setSelectedUser(null);
      },
    });
  };

  const deleteUser = async (userId: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete User?",
      description: "This action is permanent and cannot be undone. All user data, orders, and reviews will be removed.",
      confirmLabel: "Delete Permanently",
      variant: "danger",
      onConfirm: async () => {
        const { error } = await supabase.functions.invoke("admin-users", {
          body: { action: "delete", user_id: userId },
        });
        if (error) toast({ title: "Delete failed", variant: "destructive" });
        else toast({ title: "User deleted 🗑️" });
        fetchAll();
        setSelectedUser(null);
      },
    });
  };

  const makeAdmin = async (userId: string) => {
    setConfirmDialog({
      open: true,
      title: "Grant Admin Access?",
      description: "This user will have full access to the admin panel including orders, products, and user management.",
      confirmLabel: "Make Admin",
      variant: "info",
      onConfirm: async () => {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
        else toast({ title: "Admin role granted 🛡️" });
        fetchAll();
        setSelectedUser(null);
      },
    });
  };

  // ─── SMS API Status Check ─────────────
  const checkSmsApi = async () => {
    setSmsApiChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-sms-status");
      if (error) setSmsApiStatus({ ok: false, message: "Check failed" });
      else setSmsApiStatus(data);
    } catch { setSmsApiStatus({ ok: false, message: "Check failed" }); }
    setSmsApiChecking(false);
  };

  useEffect(() => {
    if (smsOpen) {
      checkSmsApi();
      supabase.from("sms_templates").select("id, title, message").order("created_at", { ascending: false })
        .then(({ data }) => setSmsTemplates(data || []));
    }
  }, [smsOpen]);

  // ─── SMS ──────────────────────────────
  const sendSMS = async () => {
    if (!selectedUser?.phone || !smsMessage.trim()) return;
    setSmsSending(true);
    const { data, error } = await supabase.functions.invoke("send-promo-sms", {
      body: { phone: selectedUser.phone, message: smsMessage },
    });
    setSmsSending(false);
    if (error || data?.error) {
      toast({ title: "SMS failed", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "SMS sent successfully! ✅" });
      setSmsMessage("");
      setSmsOpen(false);
    }
  };

  // ─── Coupon ───────────────────────────
  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setCouponForm(prev => ({ ...prev, code }));
  };

  const saveCoupon = async () => {
    if (!selectedUser || !couponForm.code || !couponForm.discount_value) return;
    setCouponSaving(true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(couponForm.expires_days || 30));

    const { error } = await supabase.from("coupons").insert({
      code: couponForm.code.toUpperCase(),
      user_id: selectedUser.id,
      discount_type: couponForm.discount_type,
      discount_value: Number(couponForm.discount_value),
      min_order_amount: Number(couponForm.min_order_amount || 0),
      max_uses: Number(couponForm.max_uses || 1),
      expires_at: expiresAt.toISOString(),
      note: couponForm.note || null,
    });

    setCouponSaving(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Coupon created! 🎉" });
      setCouponOpen(false);
      setCouponForm({ code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_uses: "1", expires_days: "30", note: "" });
      // Refresh coupons
      const { data } = await supabase.from("coupons").select("*").eq("user_id", selectedUser.id).order("created_at", { ascending: false });
      setUserCoupons(data || []);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ─── Personal Discount ────────────────
  const saveDiscount = async () => {
    if (!selectedUser || !discountModal || !discountForm.discount_value) return;
    setDiscountSaving(true);
    const productId = discountModal.cartItem.product_id;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(discountForm.expires_days || 30));

    const { error } = await supabase.from("personal_discounts").upsert({
      user_id: selectedUser.id,
      product_id: productId,
      discount_type: discountForm.discount_type,
      discount_value: Number(discountForm.discount_value),
      note: discountForm.note || null,
      expires_at: expiresAt.toISOString(),
      active: true,
    }, { onConflict: "user_id,product_id" });

    setDiscountSaving(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Discount applied! 🏷️" });
      setDiscountModal(null);
      setDiscountForm({ discount_type: "percentage", discount_value: "", expires_days: "30", note: "" });
      const { data } = await supabase.from("personal_discounts").select("*").eq("user_id", selectedUser.id);
      setUserDiscounts(data || []);
    }
  };

  const removeDiscount = async (discountId: string) => {
    await supabase.from("personal_discounts").delete().eq("id", discountId);
    setUserDiscounts(prev => prev.filter(d => d.id !== discountId));
    toast({ title: "Discount removed" });
  };

  const getDiscountForProduct = (productId: string) => {
    return userDiscounts.find(d => d.product_id === productId && d.active);
  };


  // ─── Stats cards ──────────────────────
  const totalCustomers = profiles.length;
  const activeCustomers = profiles.filter(p => orderStats[p.id]?.count).length;
  const totalLTV = Object.values(orderStats).reduce((s, o) => s + o.total, 0);

  const filterOptions: { key: FilterType; label: string; icon: any }[] = [
    { key: "all", label: "All", icon: Users },
    { key: "most_bought", label: "Most Bought", icon: TrendingUp },
    { key: "inactive_2m", label: "Inactive 2M+", icon: Clock },
    { key: "no_buys", label: "No Buys", icon: UserX },
  ];

  // ─── Status badge ─────────────────────
  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
      processing: "bg-indigo-100 text-indigo-700", shipped: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
      refunded: "bg-orange-100 text-orange-700",
    };
    return map[s] || "bg-muted text-muted-foreground";
  };

  // ═══════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════
  if (selectedUser) {
    const stats = orderStats[selectedUser.id];
    const ltv = stats?.total || 0;
    const totalOrders = stats?.count || 0;

    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedUser(null)} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-display text-xl font-bold text-foreground">Customer Details</h2>
        </div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-4 flex-1">
              {selectedUser.avatar_url ? (
                <img src={optimizeCloudinaryUrl(selectedUser.avatar_url, 80)} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {(selectedUser.full_name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground truncate">{selectedUser.full_name || "—"}</h3>
                <p className="text-sm text-muted-foreground">{selectedUser.email || "—"}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.phone ? `+${selectedUser.phone}` : "—"}</p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {selectedUser.phone && (
                <>
                  <a href={`tel:+${selectedUser.phone}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200 transition-colors">
                    <Phone size={14} /> Call
                  </a>
                  <a href={`https://wa.me/${selectedUser.phone}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200 transition-colors">
                    <MessageSquare size={14} /> WhatsApp
                  </a>
                  <button onClick={() => { setSmsOpen(true); setSmsMessage(""); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-colors">
                    <Send size={14} /> SMS
                  </button>
                </>
              )}
              <button onClick={() => { setCouponOpen(true); generateCode(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 text-xs font-medium hover:bg-purple-200 transition-colors">
                <Gift size={14} /> Coupon
              </button>
              <button onClick={() => setCartModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-100 text-orange-700 text-xs font-medium hover:bg-orange-200 transition-colors">
                <ShoppingCart size={14} /> See Cart {userCart.length > 0 && `(${userCart.length})`}
              </button>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            <div className="text-center p-3 rounded-xl bg-muted/40">
              <p className="text-2xl font-bold text-foreground">৳{ltv.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Lifetime Value</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/40">
              <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/40">
              <p className="text-sm font-medium text-foreground">{format(new Date(selectedUser.created_at), "dd MMM yyyy")}</p>
              <p className="text-xs text-muted-foreground">Signed Up</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/40">
              <p className="text-sm font-medium text-foreground">
                {stats?.lastOrder ? formatDistanceToNow(new Date(stats.lastOrder), { addSuffix: true }) : "Never"}
              </p>
              <p className="text-xs text-muted-foreground">Last Order</p>
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div><span className="text-muted-foreground">City:</span> {selectedUser.city || "—"}</div>
            <div><span className="text-muted-foreground">Postal:</span> {selectedUser.postal_code || "—"}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {selectedUser.address || "—"}</div>
          </div>

          {/* Admin actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <button onClick={() => toggleBan(selectedUser.id, !!selectedUser.banned)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${selectedUser.banned ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              <Ban size={14} /> {selectedUser.banned ? "Unban" : "Ban"}
            </button>
            <button onClick={() => makeAdmin(selectedUser.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">
              <Shield size={14} /> Make Admin
            </button>
            <button onClick={() => deleteUser(selectedUser.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-100 text-red-700">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </motion.div>

        {detailLoading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 rounded-xl skeleton-shimmer"/>)}</div>
        ) : (
          <>
            {/* ─── Coupons ──────────────────── */}
            {userCoupons.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-2xl bg-card border border-border p-5">
                <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Tag size={16} className="text-primary" /> Coupons ({userCoupons.length})
                </h4>
                <div className="space-y-2">
                  {userCoupons.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <code className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm font-bold">{c.code}</code>
                        <div>
                          <p className="text-sm text-foreground">
                            {c.discount_type === "percentage" ? `${c.discount_value}% off` : `৳${c.discount_value} off`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Used {c.used_count}/{c.max_uses} · Expires {c.expires_at ? format(new Date(c.expires_at), "dd MMM") : "Never"}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Order History ─────────────── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl bg-card border border-border p-5">
              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Package size={16} className="text-primary" /> Order History ({userOrders.length})
              </h4>
              {userOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No orders yet</p>
              ) : (
                <div className="space-y-2">
                  {userOrders.map(order => (
                    <div key={order.id} className="rounded-xl border border-border overflow-hidden">
                      <button
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedOrder === order.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">#{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(order.status)}`}>{order.status}</span>
                          <span className="text-sm font-semibold text-foreground">৳{Number(order.total_amount).toLocaleString()}</span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedOrder === order.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                              {/* Order details */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-muted-foreground">Phone:</span> {order.phone || "—"}</div>
                                <div><span className="text-muted-foreground">Tracking:</span> {order.tracking_number || "—"}</div>
                                <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {order.shipping_address || "—"}, {order.shipping_city || ""}</div>
                                {order.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {order.notes}</div>}
                              </div>
                              {/* Items */}
                              <div className="space-y-1">
                                {order.items.map(item => (
                                  <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/20 text-xs">
                                    <div>
                                      <span className="font-medium text-foreground">{item.product_title}</span>
                                      {item.selected_size && <span className="text-muted-foreground ml-1">({item.selected_size})</span>}
                                    </div>
                                    <span className="text-foreground">×{item.quantity} · ৳{(item.price * item.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* ─── SMS Modal ─────────────────── */}
        <AnimatePresence>
          {smsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setSmsOpen(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Send SMS</h3>
                  <button onClick={() => setSmsOpen(false)}><X size={18} /></button>
                </div>

                {/* API Status */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">API Status:</span>
                  {smsApiChecking ? (
                    <span className="text-muted-foreground">Checking...</span>
                  ) : smsApiStatus ? (
                    <span className={smsApiStatus.ok ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                      {smsApiStatus.ok ? "●" : "●"} {smsApiStatus.message}
                      {smsApiStatus.latency != null && ` (${smsApiStatus.latency}ms)`}
                    </span>
                  ) : null}
                </div>

                <p className="text-sm text-muted-foreground">To: +{selectedUser.phone}</p>

                {/* Template Selector */}
                {smsTemplates.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Quick Template</label>
                    <select
                      onChange={(e) => {
                        const tpl = smsTemplates.find(t => t.id === e.target.value);
                        if (tpl) {
                          const msg = tpl.message.replace(/\{name\}/g, selectedUser.full_name || "Customer");
                          setSmsMessage(msg);
                        }
                        e.target.value = "";
                      }}
                      defaultValue=""
                      className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="" disabled>Select a template...</option>
                      {smsTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type your promotional message..."
                  rows={4}
                  className="w-full rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <p className="text-xs text-muted-foreground">{smsMessage.length}/160 characters</p>
                <button
                  onClick={sendSMS}
                  disabled={smsSending || !smsMessage.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
                >
                  {smsSending ? "Sending..." : "Send SMS"}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Coupon Modal ──────────────── */}
        <AnimatePresence>
          {couponOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setCouponOpen(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Create Coupon</h3>
                  <button onClick={() => setCouponOpen(false)}><X size={18} /></button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Coupon Code</label>
                    <div className="flex gap-2">
                      <input value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        className="flex-1 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm font-mono font-bold text-foreground" />
                      <button onClick={generateCode} className="px-3 py-2 rounded-lg bg-muted text-xs font-medium text-foreground">Generate</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                      <select value={couponForm.discount_type} onChange={e => setCouponForm(p => ({ ...p, discount_type: e.target.value as any }))}
                        className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
                        <option value="percentage">Percentage %</option>
                        <option value="fixed">Fixed ৳</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Value</label>
                      <input type="number" value={couponForm.discount_value} onChange={e => setCouponForm(p => ({ ...p, discount_value: e.target.value }))}
                        placeholder={couponForm.discount_type === "percentage" ? "10" : "100"}
                        className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Order ৳</label>
                      <input type="number" value={couponForm.min_order_amount} onChange={e => setCouponForm(p => ({ ...p, min_order_amount: e.target.value }))}
                        placeholder="0"
                        className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Uses</label>
                      <input type="number" value={couponForm.max_uses} onChange={e => setCouponForm(p => ({ ...p, max_uses: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Expires In (days)</label>
                    <input type="number" value={couponForm.expires_days} onChange={e => setCouponForm(p => ({ ...p, expires_days: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Note (optional)</label>
                    <input value={couponForm.note} onChange={e => setCouponForm(p => ({ ...p, note: e.target.value }))}
                      placeholder="VIP customer discount..."
                      className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground" />
                  </div>
                </div>

                <button
                  onClick={saveCoupon}
                  disabled={couponSaving || !couponForm.code || !couponForm.discount_value}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
                >
                  {couponSaving ? "Creating..." : "Create Coupon"}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Discount Modal ────────────── */}
        <AnimatePresence>
          {discountModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setDiscountModal(null)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Set Personal Discount</h3>
                  <button onClick={() => setDiscountModal(null)}><X size={18} /></button>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-2">
                  <span className="text-lg">{discountModal.cartItem.product?.emoji || "📦"}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{discountModal.cartItem.product?.title}</p>
                    <p className="text-xs text-muted-foreground">৳{discountModal.cartItem.product?.price} × {discountModal.cartItem.quantity}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                    <select value={discountForm.discount_type} onChange={e => setDiscountForm(p => ({ ...p, discount_type: e.target.value as any }))}
                      className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
                      <option value="percentage">Percentage %</option>
                      <option value="fixed">Fixed ৳/unit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Value</label>
                    <input type="number" value={discountForm.discount_value} onChange={e => setDiscountForm(p => ({ ...p, discount_value: e.target.value }))}
                      placeholder={discountForm.discount_type === "percentage" ? "15" : "50"}
                      className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Expires In (days)</label>
                  <input type="number" value={discountForm.expires_days} onChange={e => setDiscountForm(p => ({ ...p, expires_days: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Note (optional)</label>
                  <input value={discountForm.note} onChange={e => setDiscountForm(p => ({ ...p, note: e.target.value }))}
                    placeholder="Special price for loyal customer..."
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground" />
                </div>

                {/* Preview */}
                {discountForm.discount_value && (
                  <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-center">
                    <p className="text-xs text-muted-foreground">Discounted price per unit</p>
                    <p className="text-lg font-bold text-green-700">
                      ৳{discountForm.discount_type === "percentage"
                        ? Math.round(discountModal.cartItem.product?.price * (1 - Number(discountForm.discount_value) / 100)).toLocaleString()
                        : Math.max(0, discountModal.cartItem.product?.price - Number(discountForm.discount_value)).toLocaleString()
                      }
                    </p>
                    <p className="text-xs text-muted-foreground line-through">৳{discountModal.cartItem.product?.price.toLocaleString()}</p>
                  </div>
                )}

                <button
                  onClick={saveDiscount}
                  disabled={discountSaving || !discountForm.discount_value}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
                >
                  {discountSaving ? "Applying..." : "Apply Discount"}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Cart Modal ─────────────────── */}
        <AnimatePresence>
          {cartModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setCartModalOpen(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between sticky top-0 bg-card pb-3 border-b border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <ShoppingCart size={18} className="text-primary" /> 
                    {selectedUser.full_name}'s Cart ({userCart.length})
                  </h3>
                  <button onClick={() => setCartModalOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                    <X size={18} />
                  </button>
                </div>

                {userCart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart size={48} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userCart.map((item: any) => {
                      const disc = getDiscountForProduct(item.product_id);
                      const origPrice = item.product?.price * item.quantity;
                      const discountedPrice = disc
                        ? disc.discount_type === "percentage"
                          ? origPrice * (1 - disc.discount_value / 100)
                          : Math.max(0, origPrice - disc.discount_value * item.quantity)
                        : origPrice;

                      return (
                        <div key={item.id} className="p-4 rounded-xl bg-muted/30 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              {item.product?.image_url ? (
                                <img src={item.product.image_url} alt={item.product.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                              ) : (
                                <span className="text-2xl w-12 h-12 flex items-center justify-center rounded-lg bg-muted shrink-0">{item.product?.emoji || "📦"}</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{item.product?.title || "Unknown"}</p>
                                {item.selected_size && (
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                                    {item.selected_size}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-foreground">×{item.quantity}</p>
                              {disc ? (
                                <div className="mt-1">
                                  <p className="text-xs text-muted-foreground line-through">৳{origPrice.toLocaleString()}</p>
                                  <p className="text-sm font-bold text-green-600">৳{Math.round(discountedPrice).toLocaleString()}</p>
                                </div>
                              ) : (
                                <p className="text-sm font-semibold text-foreground mt-1">৳{origPrice.toLocaleString()}</p>
                              )}
                            </div>
                          </div>

                          {/* Discount section */}
                          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            {disc ? (
                              <div className="flex items-center gap-2 flex-1">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                                  <Percent size={10} />
                                  {disc.discount_type === "percentage" ? `${disc.discount_value}% off` : `৳${disc.discount_value} off`}
                                </span>
                                {disc.note && <span className="text-xs text-muted-foreground truncate">{disc.note}</span>}
                                <button onClick={() => removeDiscount(disc.id)}
                                  className="ml-auto p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => {
                                setDiscountModal({ cartItem: item });
                                setDiscountForm({ discount_type: "percentage", discount_value: "", expires_days: "30", note: "" });
                                setCartModalOpen(false);
                              }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                <BadgeDollarSign size={14} /> Set Discount
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Total */}
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">
                          ৳{userCart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0).toLocaleString()}
                        </span>
                      </div>
                      {userCart.some(item => getDiscountForProduct(item.product_id)) && (
                        <>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-green-600 flex items-center gap-1">
                              <Percent size={12} /> Personal Discounts
                            </span>
                            <span className="font-medium text-green-600">
                              −৳{(userCart.reduce((sum, item) => {
                                const disc = getDiscountForProduct(item.product_id);
                                if (!disc) return sum;
                                const origPrice = item.product?.price * item.quantity;
                                const discPrice = disc.discount_type === "percentage"
                                  ? origPrice * (1 - disc.discount_value / 100)
                                  : Math.max(0, origPrice - disc.discount_value * item.quantity);
                                return sum + (origPrice - discPrice);
                              }, 0)).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-bold text-base pt-2 border-t border-border">
                            <span className="text-foreground">Total</span>
                            <span className="text-primary">
                              ৳{userCart.reduce((sum, item) => {
                                const disc = getDiscountForProduct(item.product_id);
                                const origPrice = (item.product?.price || 0) * item.quantity;
                                if (!disc) return sum + origPrice;
                                const discPrice = disc.discount_type === "percentage"
                                  ? origPrice * (1 - disc.discount_value / 100)
                                  : Math.max(0, origPrice - disc.discount_value * item.quantity);
                                return sum + Math.round(discPrice);
                              }, 0).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmDialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
          onConfirm={async () => {
            setConfirmLoading(true);
            await confirmDialog.onConfirm();
            setConfirmLoading(false);
            setConfirmDialog(d => ({ ...d, open: false }));
          }}
          loading={confirmLoading}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════
  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl skeleton-shimmer"/>)}</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card border border-border p-2.5 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-foreground">{totalCustomers}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Customers</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-2.5 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-foreground">{activeCustomers}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Ordered</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-2.5 md:p-4 text-center overflow-hidden">
          <p className="text-base md:text-2xl font-bold text-foreground truncate">৳{totalLTV.toLocaleString()}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Revenue</p>
        </div>
      </div>

      {/* Bulk SMS Button */}
      <button onClick={() => navigate("/admin/bulk-sms")}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
        <Megaphone size={16} /> Bulk SMS Campaign
      </button>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input type="text" placeholder="Search by name, phone or email..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filterOptions.map(f => {
            const Icon = f.icon;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}>
                <Icon size={13} /> {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile card view */}
      <div className="space-y-2 md:hidden">
        {filteredUsers.map((u) => {
          const s = orderStats[u.id];
          return (
            <div key={u.id} onClick={() => openUser(u)} className="rounded-xl bg-card border border-border p-3 cursor-pointer hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                {u.avatar_url ? (
                  <img src={optimizeCloudinaryUrl(u.avatar_url, 32)} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{(u.full_name || "U").charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground truncate">{u.full_name || "—"}</span>
                    {u.banned ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 flex-shrink-0">Banned</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 flex-shrink-0">Active</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{u.phone ? `+${u.phone}` : u.email || "—"}</span>
                    {s && <span className="text-[10px] text-muted-foreground">· {s.count} orders · ৳{s.total.toLocaleString()}</span>}
                  </div>
                </div>
                {u.phone && (
                  <a href={`tel:+${u.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-green-100 text-muted-foreground hover:text-green-600 flex-shrink-0"><Phone size={14} /></a>
                )}
              </div>
            </div>
          );
        })}
        {filteredUsers.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">{searchQuery ? "No results found" : "No customers yet"}</p>}
      </div>

      {/* Desktop table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Orders</th>
                <th className="text-left p-3 font-medium text-muted-foreground">LTV</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const s = orderStats[u.id];
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer" onClick={() => openUser(u)}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {u.avatar_url ? (
                          <img src={optimizeCloudinaryUrl(u.avatar_url, 32)} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{(u.full_name || "U").charAt(0)}</div>
                        )}
                        <span className="font-medium text-foreground">{u.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{u.phone ? `+${u.phone}` : "—"}</td>
                    <td className="p-3">{s?.count || 0}</td>
                    <td className="p-3 font-medium">৳{(s?.total || 0).toLocaleString()}</td>
                    <td className="p-3">
                      {u.banned ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Banned</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.phone && (
                          <>
                            <a href={`tel:+${u.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-green-100 text-muted-foreground hover:text-green-600"><Phone size={13} /></a>
                            <a href={`https://wa.me/${u.phone}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-emerald-100 text-muted-foreground hover:text-emerald-600"><MessageSquare size={13} /></a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">{searchQuery ? "No results found" : "No customers yet"}</p>}
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
        onConfirm={async () => {
          setConfirmLoading(true);
          await confirmDialog.onConfirm();
          setConfirmLoading(false);
          setConfirmDialog(d => ({ ...d, open: false }));
        }}
        loading={confirmLoading}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />
    </div>
  );
};

export default CRM;
