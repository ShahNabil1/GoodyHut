import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, MapPin, Phone, Mail, Package, Clock, ChevronRight, Edit3, Check, X, Truck, ShieldCheck, AlertCircle, Settings, LogOut, Code2, Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, Copy, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useDeveloper } from "@/hooks/useDeveloper";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useToast } from "@/hooks/use-toast";
import AddressPicker, { type AddressData, formatAddress, parseAddress } from "@/components/AddressPicker";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  shipping_address: string | null;
  tracking_number: string | null;
  created_at: string;
  estimated_cargo_charge?: number;
  actual_cargo_charge?: number;
  shipping_adjustment?: number;
  adjustment_status?: string;
  order_items: {
    id: string;
    quantity: number;
    price: number;
    selected_size: string | null;
    products: {
      title: string;
      slug: string;
      product_images?: { image_url: string }[];
    };
  }[];
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  reason: string | null;
  order_id: string | null;
  created_at: string;
}




const statusConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending_payment: { label: "Pending Payment", color: "bg-amber-100 text-amber-700", icon: CreditCard },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700", icon: Check },
  processing: { label: "Processing", color: "bg-indigo-100 text-indigo-700", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-700", icon: Truck },
  in_transit: { label: "In Transit", color: "bg-orange-100 text-orange-700", icon: Truck },
  customs: { label: "Customs", color: "bg-amber-100 text-amber-700", icon: ShieldCheck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700", icon: Check },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: X },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-700", icon: AlertCircle },
  awaiting_weight: { label: "Awaiting Weight", color: "bg-cyan-100 text-cyan-700", icon: Package },
  adjustment_due: { label: "Due Payment", color: "bg-rose-100 text-rose-700", icon: CreditCard },
};

const ProfilePage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { isDeveloper } = useDeveloper();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const [addressData, setAddressData] = useState<AddressData>({
    division: "",
    district: "",
    thana: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "wallet">(
    searchParams.get("tab") === "orders" ? "orders" : searchParams.get("tab") === "wallet" ? "wallet" : "profile"
  );

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(true);


  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOrders();
      fetchWallet();
    }
  }, [user]);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();

    if (!error && data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
      });
      setAddressData(parseAddress(data.address, data.city));
    }
    setLoadingProfile(false);
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id, quantity, price, selected_size,
          products:product_id ( title, slug, product_images(image_url) )
        )
      `)
      .eq("user_id", user!.id)
      .neq("status", "auto_saved")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as unknown as Order[]);
    }
    setLoadingOrders(false);
  };

  const fetchWallet = async () => {
    setLoadingWallet(true);
    const [walletRes, txRes] = await Promise.all([
      supabase.from("wallet").select("balance").eq("user_id", user!.id).single(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (walletRes.data) setWalletBalance((walletRes.data as any).balance || 0);
    if (txRes.data) setWalletTransactions(txRes.data as unknown as WalletTransaction[]);
    setLoadingWallet(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const newPhone = formData.phone.trim() || null;
    if (newPhone && newPhone !== profile?.phone) {
      let normalized = newPhone.replace(/[\s\-\(\)]/g, "");
      if (normalized.startsWith("+880")) normalized = normalized.slice(1);
      else if (normalized.startsWith("0")) normalized = "880" + normalized.slice(1);
      else if (!normalized.startsWith("880")) normalized = "880" + normalized;

      const { data: available } = await supabase.rpc("check_phone_available", {
        p_phone: normalized,
        p_user_id: user!.id,
      });

      if (available === false) {
        toast({ title: "Phone number unavailable", description: "This number is linked to another account.", variant: "destructive" });
        setSaving(false);
        return;
      }
      formData.phone = normalized;
    }

    const newEmail = formData.email.trim() || null;
    if (newEmail && newEmail !== user!.email) {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("update-user-email", { body: { email: newEmail } });
      if (fnError || fnData?.error) {
        toast({ title: "Email update failed", description: fnData?.error || fnError?.message || "Unknown error", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const fullAddress = formatAddress(addressData);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: fullAddress || null,
        city: addressData.division || null,
        postal_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user!.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Profile updated!" });
      setEditing(false);
      fetchProfile();
    }
    setSaving(false);
  };

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key || text);
    setTimeout(() => setCopiedKey(null), 1500);
    toast({ title: "Copied!" });
  };




  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isPhoneUser = !!user.phone && !user.email;
  const phoneDisplay = user.phone ? "+" + user.phone.replace("+", "") : (profile?.phone ? "+" + profile.phone : null);
  const avatar = profile?.avatar_url || user.user_metadata?.avatar_url;
  const displayName = profile?.full_name || user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : phoneDisplay) || "User";
  const displayContact = user.email || phoneDisplay;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-4 md:pt-24 pb-24 max-w-4xl">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl glass-strong p-6 md:p-8 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {avatar ? (
              <img src={avatar} alt={displayName} className="w-20 h-20 rounded-full object-cover ring-4 ring-primary/20" />
            ) : (
              <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-center sm:text-left flex-1">
              <h1 className="font-display text-2xl font-bold text-foreground">{displayName}</h1>
              <p className="text-muted-foreground text-sm font-body">{displayContact}</p>
              {!isPhoneUser && profile?.phone && (
                <p className="text-muted-foreground text-sm font-body mt-0.5">+{profile.phone}</p>
              )}
            </div>
            {/* Wallet balance badge */}
            {walletBalance > 0 && (
              <button onClick={() => setActiveTab("wallet")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors">
                <Wallet size={16} /> ৳{walletBalance.toLocaleString()}
              </button>
            )}
          </div>
        </motion.div>

        {/* Admin Panel Button */}
        {!adminLoading && (isAdmin || isDeveloper) && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate("/admin")}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl glass-strong mb-4 group hover:shadow-card-hover transition-all border border-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                <Settings size={20} className="text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-display font-semibold text-foreground text-sm">Admin Panel</p>
                <p className="text-xs text-muted-foreground font-body">Manage products, orders & more</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.button>
        )}

        {/* Developer Panel Button */}
        {isDeveloper && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate("/dev")}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl glass-strong mb-6 group hover:shadow-card-hover transition-all border border-secondary/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Code2 size={20} className="text-secondary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-display font-semibold text-foreground text-sm">Developer Panel</p>
                <p className="text-xs text-muted-foreground font-body">API keys, Cloudinary & secrets</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground group-hover:text-secondary transition-colors" />
          </motion.button>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/60 mb-6">
          {(["profile", "orders", "wallet"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "profile" ? (
                <span className="flex items-center justify-center gap-2"><User size={16} /> Profile</span>
              ) : tab === "orders" ? (
                <span className="flex items-center justify-center gap-2"><Package size={16} /> Orders ({orders.length})</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><Wallet size={16} /> Wallet</span>
              )}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl glass-strong p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-semibold text-foreground">Personal Information</h2>
              <AnimatePresence mode="wait">
                {!editing ? (
                  <motion.button
                    key="edit"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileTap={{ scale: 0.93 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-primary/8 text-primary hover:bg-primary/12 backdrop-blur-sm border border-primary/10 transition-all duration-300 hover:shadow-[0_4px_16px_rgba(59,130,246,0.1)]"
                  >
                    <Edit3 size={14} /> Edit
                  </motion.button>
                ) : (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex gap-2"
                  >
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => { setEditing(false); fetchProfile(); }}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl bg-white/50 backdrop-blur-sm border border-border/60 hover:border-border transition-all duration-300 hover:shadow-sm"
                    >
                      <X size={14} /> Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1 text-sm text-primary-foreground gradient-brand px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 hover:shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
                    >
                      <Check size={14} /> {saving ? "Saving..." : "Save"}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {loadingProfile ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-muted/60 skeleton-shimmer" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldItem
                  icon={<User size={16} />}
                  label="Full Name"
                  value={formData.full_name}
                  editing={editing}
                  onChange={(v) => setFormData({ ...formData, full_name: v })}
                  placeholder="Enter your name"
                />
                <FieldItem
                  icon={<Mail size={16} />}
                  label="Email"
                  value={editing ? formData.email : (profile?.email || user.email || "")}
                  editing={editing}
                  onChange={(v) => setFormData({ ...formData, email: v })}
                  placeholder="Enter your email"
                />
                <FieldItem
                  icon={<Phone size={16} />}
                  label="Phone"
                  value={formData.phone}
                  editing={editing}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                  placeholder="+880 1XXX-XXXXXX"
                />
                <div className="md:col-span-2">
                  <div className="p-3 rounded-xl bg-muted/30">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-muted-foreground"><MapPin size={16} /></div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-body mb-2">Address</p>
                        {editing ? (
                          <AddressPicker value={addressData} onChange={setAddressData} />
                        ) : (
                          <p className="text-sm text-foreground font-body">
                            {formatAddress(addressData) || <span className="text-muted-foreground/50 italic">Not set</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Wallet Tab */}
        {activeTab === "wallet" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Balance Card */}
            <div className="rounded-2xl glass-strong p-6 text-center">
              <Wallet size={32} className="mx-auto text-primary mb-3" />
              <p className="text-sm text-muted-foreground font-body mb-1">Wallet Balance</p>
              <p className="text-4xl font-display font-bold text-foreground">৳{walletBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">This balance can be applied at checkout to reduce your order total</p>
            </div>

            {/* Transactions */}
            <div className="rounded-2xl glass-strong p-6">
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">Transaction History</h3>
              {loadingWallet ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/60 skeleton-shimmer" />)}
                </div>
              ) : walletTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {walletTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === "credit" ? "bg-emerald-100 dark:bg-emerald-950/30" : "bg-red-100 dark:bg-red-950/30"}`}>
                        {tx.type === "credit" ? <ArrowDownLeft size={16} className="text-emerald-600" /> : <ArrowUpRight size={16} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {tx.reason === "weight_refund" ? "Weight Refund" : tx.reason === "due_payment" ? "Due Payment" : tx.reason === "order_usage" ? "Order Deduction" : tx.reason || "Transaction"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          {tx.order_id && ` · Order #${tx.order_id.slice(0, 8).toUpperCase()}`}
                        </p>
                      </div>
                      <span className={`font-semibold text-sm ${tx.type === "credit" ? "text-emerald-600" : "text-red-500"}`}>
                        {tx.type === "credit" ? "+" : "−"}৳{Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loadingOrders ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-muted/60 skeleton-shimmer" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl glass-strong p-12 text-center">
                <Package size={48} className="mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">No orders yet</h3>
                <p className="text-muted-foreground text-sm font-body mb-6">Start shopping to see your orders here!</p>
                <button
                  onClick={() => navigate("/")}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full gradient-brand text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Browse Products <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const dueAmount = order.adjustment_status === "due" ? Math.abs(order.shipping_adjustment || 0) : 0;
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl glass-strong p-5 md:p-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground font-body">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground font-body mt-0.5">
                            {new Date(order.created_at).toLocaleDateString("en-US", {
                              year: "numeric", month: "long", day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                            <StatusIcon size={12} /> {sc.label}
                          </span>
                        </div>
                      </div>

                      {/* Order items */}
                      <div className="space-y-3 mb-4">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center overflow-hidden">
                              {item.products?.product_images?.[0]?.image_url ? (
                                <img src={item.products.product_images[0].image_url} alt={item.products?.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-muted/40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.products?.title || "Product"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity}
                                {item.selected_size && ` · Size: ${item.selected_size}`}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              ৳{item.price.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <span className="text-sm text-muted-foreground font-body">Total</span>
                        <span className="text-lg font-display font-bold text-foreground">
                          ৳{order.total_amount.toLocaleString()}
                        </span>
                      </div>

                      {/* Due Bill Alert */}
                      {dueAmount > 0 && order.adjustment_status === "due" && (
                        <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Due Shipping Charge</p>
                              <p className="text-xs text-rose-600/80 dark:text-rose-400/70">Additional charge due to actual weight difference</p>
                            </div>
                            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">৳{dueAmount.toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => navigate(`/payment/${order.id}`)}
                            className="mt-2 w-full py-2.5 rounded-lg gradient-brand text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                          >
                            <CreditCard size={14} /> Pay Due Amount
                          </button>
                        </div>
                      )}

                      {/* Pay Now button for pending_payment orders */}
                      {order.status === "pending_payment" && (
                        <div className="mt-3">
                          <button
                            onClick={() => navigate(`/payment/${order.id}`)}
                            className="w-full py-2.5 rounded-lg gradient-brand text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                          >
                            <CreditCard size={14} /> Pay Now
                          </button>
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        {order.tracking_number && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                            <Truck size={14} />
                            Tracking: <span className="font-medium text-foreground">{order.tracking_number}</span>
                          </div>
                        )}
                        <button
                          onClick={() => navigate(`/track-order/${order.id}`)}
                          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Truck size={14} /> Track Order
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowLogout(true)}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-all mt-6 mb-4"
        >
          <LogOut size={18} />
          <span className="font-semibold text-sm">Log Out</span>
        </motion.button>

        <LogoutConfirmModal
          open={showLogout}
          onClose={() => setShowLogout(false)}
          onConfirm={async () => {
            setLoggingOut(true);
            await signOut();
            setLoggingOut(false);
            setShowLogout(false);
            navigate("/");
          }}
          loading={loggingOut}
        />



      </main>
      <div className="hidden lg:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

// Reusable field component
const FieldItem = ({
  icon, label, value, editing, onChange, placeholder, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
    <div className="mt-0.5 text-muted-foreground">{icon}</div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground font-body mb-1">{label}</p>
      {editing && !disabled ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-foreground font-body outline-none border-b border-border/50 focus:border-primary pb-0.5 transition-colors"
        />
      ) : (
        <p className="text-sm text-foreground font-body">
          {value || <span className="text-muted-foreground/50 italic">Not set</span>}
        </p>
      )}
    </div>
  </div>
);

export default ProfilePage;
