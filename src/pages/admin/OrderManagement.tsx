import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { sendOrderStatusEmail } from "@/lib/emailUtils";
import { sendOrderSms } from "@/lib/smsUtils";
import { useToast } from "@/hooks/use-toast";
import { Eye, X, Edit2, Check, Loader2, Phone, MapPin, Clock, Package, CreditCard, Image as ImageIcon, Search, Filter, ShieldCheck, ShieldAlert, AlertTriangle, Send, Wifi, WifiOff, Zap, Copy, CheckCircle2, Scale, Ban, Globe, ShieldOff, Trash2 } from "lucide-react";
import { useDeveloper } from "@/hooks/useDeveloper";
import ConfirmDialog from "@/components/ConfirmDialog";
import chinaFlag from "@/assets/china-flag.png";
import bdFlag from "@/assets/bd-flag.webp";

const CHINA_STATUSES = ["auto_saved", "pending_payment", "pending", "confirmed", "processing", "received_at_warehouse", "cancelled", "refunded"];
const BD_STATUSES = ["shipped_via_air", "arrived_in_bd", "awaiting_weight", "adjustment_due", "at_bd_warehouse", "pickup_requested", "handed_to_steadfast", "out_for_delivery", "delivered"];
const ALL_STATUSES = [...CHINA_STATUSES, ...BD_STATUSES];

const statusLabels: Record<string, string> = {
  auto_saved: "Auto Saved", pending_payment: "Pending Payment", pending: "Pending", confirmed: "Confirmed",
  processing: "Processing/Purchasing", received_at_warehouse: "Received at China Warehouse",
  shipped_via_air: "Shipped via Air Cargo", arrived_in_bd: "Arrived in BD / Customs",
  awaiting_weight: "Awaiting Weight", adjustment_due: "Adjustment Due",
  at_bd_warehouse: "At BD Warehouse", pickup_requested: "Pickup Request Sent To Local Delivery Partner",
  handed_to_steadfast: "Handed over to Steadfast",
  out_for_delivery: "Out for Delivery", delivered: "Delivered",
  cancelled: "Cancelled", refunded: "Refunded",
  // Legacy mappings
  shipped: "Shipped", in_transit: "In Transit", customs: "Customs",
};

const statusColors: Record<string, string> = {
  auto_saved: "bg-cyan-100 text-cyan-700", pending_payment: "bg-amber-100 text-amber-700",
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700", received_at_warehouse: "bg-violet-100 text-violet-700",
  shipped_via_air: "bg-purple-100 text-purple-700", arrived_in_bd: "bg-amber-100 text-amber-700",
  awaiting_weight: "bg-teal-100 text-teal-700", adjustment_due: "bg-rose-100 text-rose-700",
  at_bd_warehouse: "bg-sky-100 text-sky-700", pickup_requested: "bg-violet-100 text-violet-700", handed_to_steadfast: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-orange-100 text-orange-700", delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700", refunded: "bg-gray-100 text-gray-700",
  // Legacy
  shipped: "bg-purple-100 text-purple-700", in_transit: "bg-orange-100 text-orange-700", customs: "bg-amber-100 text-amber-700",
};

const isInChinaSection = (status: string) => CHINA_STATUSES.includes(status);
const isInBDSection = (status: string) => BD_STATUSES.includes(status) || ["shipped", "in_transit", "customs"].includes(status);

interface Order {
  id: string; status: string; total_amount: number; created_at: string; updated_at: string;
  phone: string | null; shipping_address: string | null; shipping_city: string | null;
  shipping_postal_code: string | null; tracking_number: string | null; notes: string | null;
  user_id: string;
  payment_type: string | null; payment_amount: number | null; payment_method: string | null;
  payment_proof_url: string | null; payment_verified: boolean | null;
  estimated_cargo_charge: number | null; actual_weight_gm: number | null; actual_cargo_charge: number | null;
  domestic_delivery_charge: number | null; shipping_adjustment: number | null; adjustment_status: string | null;
  wallet_amount_used: number | null;
  due_payment_proof_url: string | null; due_payment_method: string | null; due_payment_verified: boolean | null;
  customer_ip: string | null;
  order_items: { id: string; quantity: number; price: number; selected_size: string | null; products: { title: string; emoji: string | null; product_images: { image_url: string; sort_order: number | null }[] } | null }[];
}

interface Profile {
  id: string; full_name: string | null; phone: string | null; email: string | null;
}

const formatBDDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  });
};

const formatBDDateShort = (d: string) => {
  const date = new Date(d);
  return date.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Dhaka",
  });
};

// In-memory courier cache (populated from DB on load)
const courierCache: Record<string, any> = {};
let dbCacheLoaded = false;

// Helper: load all cached courier data from Supabase
const loadDbCourierCache = async () => {
  if (dbCacheLoaded) return;
  const { data } = await supabase.from("courier_cache").select("phone, data");
  (data || []).forEach((row: any) => {
    courierCache[row.phone] = row.data;
  });
  dbCacheLoaded = true;
};

// Helper: save courier data to Supabase
const saveToDbCache = async (phone: string, apiData: any) => {
  await supabase.from("courier_cache").upsert(
    { phone, data: apiData, updated_at: new Date().toISOString() },
    { onConflict: "phone" }
  );
};

const OrderManagement = () => {
  const { toast } = useToast();
  const { isDeveloper } = useDeveloper();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [proofZoom, setProofZoom] = useState<"original" | "due" | false>(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [customerHistory, setCustomerHistory] = useState<Order[]>([]);
  const [courierData, setCourierData] = useState<any>(null);
  const [courierLoading, setCourierLoading] = useState(false);
  const [cardCourierData, setCardCourierData] = useState<Record<string, any>>({});
  // Steadfast
  const [showSteadfast, setShowSteadfast] = useState(false);
  const [codAmount, setCodAmount] = useState("");
  const [sendingSteadfast, setSendingSteadfast] = useState(false);
  const [steadfastStatus, setSteadfastStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("admin_order_status_filter");
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [statusChangeDropOpen, setStatusChangeDropOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"china" | "bd">("china");
  // API Status
  const [apiStatuses, setApiStatuses] = useState<Record<string, { ok: boolean; message: string; latency?: number }>>({});
  const [checkingApis, setCheckingApis] = useState(false);
  // Steadfast result (after sending)
  const [lastSteadfastResult, setLastSteadfastResult] = useState<any>(null);

  // Editable fields
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);

  // Weight adjustment
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);

  // IP block
  const [ipBlocked, setIpBlocked] = useState<boolean | null>(null);
  const [ipBlockLoading, setIpBlockLoading] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; confirmLabel: string;
    variant: "danger" | "warning" | "info"; onConfirm: () => Promise<void>;
  }>({ open: false, title: "", description: "", confirmLabel: "", variant: "danger", onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  interface WeightGroup {
    categoryId: string;
    categoryName: string;
    chargeType: "per_kg" | "per_piece";
    rate: number;
    items: { title: string; variant: string | null; qty: number; estWeightGm: number }[];
    totalEstWeightGm: number;
    estCharge: number;
    actualWeightGm: string;
  }
  const [weightGroups, setWeightGroups] = useState<WeightGroup[]>([]);
  const tabStatuses = activeTab === "china" ? CHINA_STATUSES : BD_STATUSES;

  // Persist selected statuses to localStorage
  useEffect(() => {
    localStorage.setItem("admin_order_status_filter", JSON.stringify(Array.from(selectedStatuses)));
  }, [selectedStatuses]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Filter by tab section
      const inChina = isInChinaSection(o.status);
      const inBD = isInBDSection(o.status);
      if (activeTab === "china" && !inChina) return false;
      if (activeTab === "bd" && !inBD) return false;

      if (selectedStatuses.size > 0 && !selectedStatuses.has(o.status)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const profile = profiles[o.user_id];
        const name = (profile?.full_name || "").toLowerCase();
        const phone = (profile?.phone || o.phone || "").toLowerCase();
        const orderId = o.id.slice(0, 8).toUpperCase().toLowerCase();
        const dateStr = formatBDDateShort(o.created_at).toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !orderId.includes(q) && !dateStr.includes(q)) return false;
      }
      return true;
    });
  }, [orders, profiles, searchQuery, selectedStatuses, activeTab]);

  const fetchOrders = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`*, order_items(id, quantity, price, selected_size, products:product_id(title, emoji, product_images(image_url, sort_order)))`)
      .order("created_at", { ascending: false });

    const ordersList = (ordersData || []) as unknown as Order[];
    setOrders(ordersList);

    const userIds = [...new Set(ordersList.map(o => o.user_id))];
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, phone, email")
        .in("id", userIds);

      const profileMap: Record<string, Profile> = {};
      (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });
      setProfiles(profileMap);
    }

    setLoading(false);
  };

  // Refresh selectedOrder in-place after actions (keeps modal open)
  const refreshSelectedOrder = async (orderId: string) => {
    await fetchOrders();
    // Re-select from fresh data
    const { data } = await supabase
      .from("orders")
      .select(`*, order_items(id, quantity, price, selected_size, products:product_id(title, emoji, product_images(image_url, sort_order)))`)
      .eq("id", orderId)
      .single();
    if (data) setSelectedOrder(data as unknown as Order);
  };

  useEffect(() => { fetchOrders(); checkApiStatuses(); }, []);

  // Fetch weight/rate details grouped by category when order selected
  useEffect(() => {
    if (!selectedOrder) { setWeightGroups([]); return; }
    (async () => {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("quantity, selected_size, product_id, products:product_id(title, estimated_weight_gm, shipping_charge_type, shipping_rate_override, category_id, variants)")
        .eq("order_id", selectedOrder.id);
      if (!orderItems || orderItems.length === 0) return;

      // Group by category_id + chargeType + rate
      const groupMap: Record<string, WeightGroup> = {};
      const catCache: Record<string, any> = {};

      for (const item of orderItems as any[]) {
        const prod = item.products;
        if (!prod) continue;
        const chargeType = (prod.shipping_charge_type || "per_kg") as "per_kg" | "per_piece";
        const catId = prod.category_id || "unknown";

        // Resolve variant weight using same logic as shippingUtils
        let itemWeightGm = prod.estimated_weight_gm || 0;
        if (item.selected_size && Array.isArray(prod.variants)) {
          for (const group of prod.variants) {
            if (!group.options) continue;
            for (const opt of group.options) {
              const label = `${group.name}: ${opt.name}`;
              if (label === item.selected_size && opt.weight) {
                const w = parseFloat(opt.weight);
                if (w > 0) itemWeightGm = w;
              }
            }
          }
        }

        // Resolve effective rate per product (override > category)
        let catName = "Unknown";
        let effectiveRate = 0;
        if (catId !== "unknown") {
          if (!catCache[catId]) {
            const { data: cat } = await supabase.from("categories").select("name, shipping_rate_per_kg, shipping_rate_per_piece").eq("id", catId).single();
            catCache[catId] = cat;
          }
          const cat = catCache[catId];
          if (cat) {
            catName = cat.name || "Unknown";
            effectiveRate = prod.shipping_rate_override ?? (chargeType === "per_piece" ? (cat.shipping_rate_per_piece || 0) : (cat.shipping_rate_per_kg || 0));
          }
        }

        // Group by category + chargeType + rate so products with different overrides stay separate
        const key = `${catId}_${chargeType}_${effectiveRate}`;

        if (!groupMap[key]) {
          groupMap[key] = {
            categoryId: catId,
            categoryName: catName,
            chargeType,
            rate: effectiveRate,
            items: [],
            totalEstWeightGm: 0,
            estCharge: 0,
            actualWeightGm: "",
          };
        }

        groupMap[key].items.push({
          title: prod.title || "Product",
          variant: item.selected_size,
          qty: item.quantity,
          estWeightGm: itemWeightGm,
        });
        groupMap[key].totalEstWeightGm += itemWeightGm * item.quantity;
      }

      // Calc estimated charge per group
      for (const g of Object.values(groupMap)) {
        if (g.chargeType === "per_piece") {
          g.estCharge = g.rate * g.items.reduce((s, i) => s + i.qty, 0);
        } else {
          g.estCharge = Math.round(g.rate * (g.totalEstWeightGm / 1000));
        }
      }

      setWeightGroups(Object.values(groupMap));
    })();
  }, [selectedOrder?.id]);

  const checkApiStatuses = useCallback(async () => {
    setCheckingApis(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-order-apis");
      if (data?.statuses) setApiStatuses(data.statuses);
    } catch {}
    setCheckingApis(false);
  }, []);

  // Load DB courier cache on mount, then populate card badges
  useEffect(() => {
    if (orders.length === 0) return;
    const run = async () => {
      await loadDbCourierCache();
      // Populate from cache first
      const cached: Record<string, any> = {};
      const phonesToFetch = new Set<string>();
      orders.forEach(o => {
        const phone = o.phone || profiles[o.user_id]?.phone;
        if (!phone) return;
        if (courierCache[phone]) {
          cached[phone] = courierCache[phone];
        } else {
          phonesToFetch.add(phone);
        }
      });
      if (Object.keys(cached).length > 0) setCardCourierData(prev => ({ ...prev, ...cached }));
      
      // Fetch missing ones from API
      if (phonesToFetch.size === 0) return;
      const results: Record<string, any> = {};
      for (const phone of phonesToFetch) {
        try {
          const { data, error } = await supabase.functions.invoke('check-courier', { body: { phone } });
          if (!error && data) {
            courierCache[phone] = data;
            results[phone] = data;
            saveToDbCache(phone, data); // persist to DB
          }
        } catch {}
      }
      if (Object.keys(results).length > 0) setCardCourierData(prev => ({ ...prev, ...results }));
    };
    run();
  }, [orders, profiles]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (selectedOrder) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    };
  }, [selectedOrder]);

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusNote("");
    setTrackingNumber(order.tracking_number || "");
    setEditPhone(order.phone || "");
    setEditAddress(order.shipping_address || "");
    setEditAmount(String(order.total_amount));
    setEditingField(null);
    setCourierData(null);
    setSteadfastStatus(null);
    setLastSteadfastResult(null);
    setIpBlocked(null);
    // Check IP block status
    const ip = (order as any).customer_ip;
    if (ip) {
      const { data: existing } = await supabase.from("blocked_ips").select("id").eq("ip_address", ip).maybeSingle();
      setIpBlocked(!!existing);
    }

    const { data: history } = await supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false });
    setStatusHistory(history || []);

    const { data: custOrders } = await supabase
      .from("orders")
      .select("id, status, total_amount, created_at")
      .eq("user_id", order.user_id)
      .neq("id", order.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setCustomerHistory((custOrders || []) as any);

    // Fetch BD Courier reliability (DB cache → in-memory → API)
    const phone = order.phone || profiles[order.user_id]?.phone;
    if (phone) {
      await loadDbCourierCache();
      if (courierCache[phone]) {
        setCourierData(courierCache[phone]);
      } else {
        setCourierLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke('check-courier', { body: { phone } });
          if (!error && data) {
            courierCache[phone] = data;
            setCourierData(data);
            saveToDbCache(phone, data);
          } else {
            setCourierData({ error: 'Failed to check courier' });
          }
        } catch (e) {
          setCourierData({ error: 'Failed to check courier' });
        }
        setCourierLoading(false);
      }
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setSaving(true);

    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (trackingNumber.trim()) updates.tracking_number = trackingNumber.trim();
    if (statusNote.trim()) updates.notes = statusNote.trim();

    const { error } = await supabase.from("orders").update(updates).eq("id", selectedOrder.id);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); setSaving(false); return; }

    await supabase.from("order_status_history").insert({
      order_id: selectedOrder.id,
      status: newStatus,
      note: statusNote.trim() || null,
    });

    // Send email notification to customer
    const orderItems = selectedOrder.order_items?.map(oi => ({
      title: oi.products?.title || "Product",
      quantity: oi.quantity,
    })) || [];
    sendOrderStatusEmail(
      { ...selectedOrder, status: newStatus, ...updates },
      orderItems
    ).catch(console.error);

    // Send SMS for cancelled orders
    if (newStatus === "cancelled") {
      const profile = profiles[selectedOrder.user_id];
      const phone = selectedOrder.phone || profile?.phone;
      if (phone) {
        sendOrderSms("order_cancelled", phone, {
          name: profile?.full_name || "Customer",
          order_id: selectedOrder.id.slice(0, 8).toUpperCase(),
        });
      }
    }

    toast({ title: "Order status updated ✅" });
    setSaving(false);
    refreshSelectedOrder(selectedOrder.id);
  };

  const handleSaveField = async (field: string) => {
    if (!selectedOrder) return;
    let updates: any = { updated_at: new Date().toISOString() };

    if (field === "phone") updates.phone = editPhone;
    if (field === "address") updates.shipping_address = editAddress;
    if (field === "amount") updates.total_amount = Number(editAmount);

    await supabase.from("orders").update(updates).eq("id", selectedOrder.id);
    toast({ title: "Updated successfully" });
    setEditingField(null);
    fetchOrders();
    setSelectedOrder(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleVerifyPayment = async () => {
    if (!selectedOrder) return;
    await supabase.from("orders").update({
      payment_verified: true,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    } as any).eq("id", selectedOrder.id);

    await supabase.from("order_status_history").insert({
      order_id: selectedOrder.id,
      status: "confirmed",
      note: "Payment verified ✅",
    });

    // Send confirmed email
    const orderItems = selectedOrder.order_items?.map(oi => ({
      title: oi.products?.title || "Product",
      quantity: oi.quantity,
    })) || [];
    sendOrderStatusEmail(
      { ...selectedOrder, status: "confirmed" },
      orderItems
    ).catch(console.error);

    // Send confirmed SMS
    const profile = profiles[selectedOrder.user_id];
    const phone = selectedOrder.phone || profile?.phone;
    if (phone) {
      const shortId = selectedOrder.id.slice(0, 8).toUpperCase();
      sendOrderSms("order_confirmed", phone, {
        name: profile?.full_name || "Customer",
        order_id: shortId,
        tracking_link: `https://www.goodyhut.bd/track-order/${selectedOrder.id}`,
      });
    }

    toast({ title: "Payment verified & order confirmed ✅" });
    refreshSelectedOrder(selectedOrder.id);
  };

  const handleVerifyDuePayment = async () => {
    if (!selectedOrder) return;
    await supabase.from("orders").update({
      due_payment_verified: true,
      adjustment_status: "paid",
      updated_at: new Date().toISOString(),
    } as any).eq("id", selectedOrder.id);

    await supabase.from("order_status_history").insert({
      order_id: selectedOrder.id,
      status: selectedOrder.status,
      note: `Due payment verified ✅ — ৳${Math.abs(Number(selectedOrder.shipping_adjustment || 0))} received`,
    });

    toast({ title: "Due payment verified ✅" });
    refreshSelectedOrder(selectedOrder.id);
  };

  const handleSendToSteadfast = async () => {
    if (!selectedOrder || !codAmount) return;
    setSendingSteadfast(true);
    setLastSteadfastResult(null);
    try {
      const profile = profiles[selectedOrder.user_id];
      const { data, error } = await supabase.functions.invoke('steadfast-order', {
        body: {
          order_id: selectedOrder.id,
          invoice: selectedOrder.id.slice(0, 8).toUpperCase(),
          recipient_name: profile?.full_name || 'Customer',
          recipient_phone: selectedOrder.phone || profile?.phone || '',
          recipient_address: selectedOrder.shipping_address || '',
          cod_amount: Number(codAmount),
          note: selectedOrder.notes || '',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.status === 200 && data.consignment) {
        setLastSteadfastResult(data.consignment);
        toast({ title: `Sent to Steadfast ✅` });
        fetchOrders();
      } else {
        toast({ title: data?.message || 'Steadfast API error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: e.message || 'Failed to send', variant: 'destructive' });
    }
    setSendingSteadfast(false);
  };

  const handleCheckSteadfastStatus = async () => {
    if (!selectedOrder?.tracking_number) return;
    setCheckingStatus(true);
    setSteadfastStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke('steadfast-status', {
        body: { tracking_code: selectedOrder.tracking_number },
      });
      if (error) throw new Error(error.message);
      setSteadfastStatus(data);
    } catch (e: any) {
      toast({ title: e.message || 'Failed to check status', variant: 'destructive' });
    }
    setCheckingStatus(false);
  };

  const steadfastToOrderStatus = (deliveryStatus: string): string | null => {
    const map: Record<string, string> = {
      'pending': 'handed_to_steadfast',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'in_review': 'out_for_delivery',
      'partial_delivered': 'delivered',
      'unknown': null as any,
      'picked': 'out_for_delivery',
      'on_the_way': 'out_for_delivery',
    };
    return map[deliveryStatus] ?? 'out_for_delivery';
  };

  const handleSyncSteadfastStatus = async () => {
    if (!selectedOrder || !steadfastStatus?.delivery_status) return;
    const mappedStatus = steadfastToOrderStatus(steadfastStatus.delivery_status);
    if (!mappedStatus) {
      toast({ title: 'Unknown Steadfast status, cannot sync', variant: 'destructive' });
      return;
    }
    if (mappedStatus === selectedOrder.status) {
      toast({ title: 'Order status is already synced' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("orders").update({
      status: mappedStatus as any,
      updated_at: new Date().toISOString(),
    }).eq("id", selectedOrder.id);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); setSaving(false); return; }
    await supabase.from("order_status_history").insert({
      order_id: selectedOrder.id,
      status: mappedStatus,
      note: `Steadfast sync: ${steadfastStatus.delivery_status} → ${mappedStatus}`,
    });
    toast({ title: `Order status updated to "${mappedStatus}" ✅` });
    setSaving(false);
    refreshSelectedOrder(selectedOrder.id);
  };
  const handleWeightAdjustment = async () => {
    if (!selectedOrder || weightGroups.length === 0) return;
    // Validate: all per_kg groups must have actual weight
    const kgGroups = weightGroups.filter(g => g.chargeType === "per_kg");
    if (kgGroups.some(g => !g.actualWeightGm || Number(g.actualWeightGm) <= 0)) {
      toast({ title: "Please enter actual weight for all groups", variant: "destructive" });
      return;
    }
    setAdjustmentSaving(true);

    const estimatedCharge = Number(selectedOrder.estimated_cargo_charge || 0);

    // Calculate new total cargo charge from all groups
    let actualCharge = 0;
    let totalActualWeightGm = 0;
    for (const g of weightGroups) {
      if (g.chargeType === "per_piece") {
        actualCharge += g.estCharge; // piece charge doesn't change
      } else {
        const w = Number(g.actualWeightGm);
        totalActualWeightGm += w;
        actualCharge += Math.round(g.rate * (w / 1000));
      }
    }

    const adjustment = actualCharge - estimatedCharge;

    const updates: any = {
      actual_weight_gm: totalActualWeightGm,
      actual_cargo_charge: actualCharge,
      shipping_adjustment: adjustment,
      updated_at: new Date().toISOString(),
    };

    if (adjustment > 0) {
      updates.adjustment_status = "due";
      updates.status = "adjustment_due";
    } else if (adjustment < 0) {
      updates.adjustment_status = "refunded";
      const { data: wallet } = await supabase.from("wallet").select("balance").eq("user_id", selectedOrder.user_id).single();
      if (wallet) {
        await supabase.from("wallet").update({ balance: (wallet as any).balance + Math.abs(adjustment), updated_at: new Date().toISOString() } as any).eq("user_id", selectedOrder.user_id);
      } else {
        await supabase.from("wallet").insert({ user_id: selectedOrder.user_id, balance: Math.abs(adjustment) } as any);
      }
      await supabase.from("wallet_transactions").insert({
        user_id: selectedOrder.user_id, amount: Math.abs(adjustment), type: "credit", reason: "weight_refund", order_id: selectedOrder.id,
      } as any);
    } else {
      updates.adjustment_status = "none";
    }

    await supabase.from("orders").update(updates).eq("id", selectedOrder.id);
    await supabase.from("order_status_history").insert({
      order_id: selectedOrder.id,
      status: adjustment > 0 ? "adjustment_due" : selectedOrder.status,
      note: `Weight adjustment: ${totalActualWeightGm}gm. Estimated: ৳${estimatedCharge} → Actual: ৳${actualCharge}. ${adjustment > 0 ? `Due: ৳${adjustment}` : adjustment < 0 ? `Refund: ৳${Math.abs(adjustment)}` : "No change"}`,
    });

    // Send SMS for adjustment_due
    if (adjustment > 0) {
      const profile = profiles[selectedOrder.user_id];
      const phone = selectedOrder.phone || profile?.phone;
      if (phone) {
        const shortId = selectedOrder.id.slice(0, 8).toUpperCase();
        const estWeightGm = Number(selectedOrder.order_items?.reduce((s: number, oi: any) => s + (oi.quantity * (oi.products?.estimated_weight_gm || 0)), 0) || 0);
        sendOrderSms("order_adjustment_due", phone, {
          name: profile?.full_name || "Customer",
          order_id: shortId,
          estimated_weight: String(estWeightGm || selectedOrder.estimated_cargo_charge || 0),
          actual_weight: String(totalActualWeightGm),
          paid_amount: String(estimatedCharge),
          due_amount: String(adjustment),
          payment_link: `https://www.goodyhut.bd/payment/${selectedOrder.id}`,
        });
      }
    }

    toast({ title: adjustment > 0 ? `৳${adjustment} due from customer` : adjustment < 0 ? `৳${Math.abs(adjustment)} refunded to wallet` : "No adjustment needed" });
    setAdjustmentSaving(false);
    refreshSelectedOrder(selectedOrder.id);
  };

  const StatusBadge = ({ status }: { status?: { ok: boolean; message: string; latency?: number } }) => {
    if (checkingApis && !status) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 size={10} className="animate-spin" />Checking</span>;
    if (!status) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><WifiOff size={10} />—</span>;
    return (
      <span className={`flex items-center gap-1 text-xs font-medium ${status.ok ? "text-emerald-600" : "text-destructive"}`}>
        {status.ok ? <Wifi size={10} /> : <WifiOff size={10} />}
        {status.message}
        {status.latency !== undefined && status.ok && <span className="text-muted-foreground">({status.latency}ms)</span>}
      </span>
    );
  };

  return (
    <div className="space-y-4">

      {/* API Connection Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-card flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Steadfast API:</span>
            <StatusBadge status={apiStatuses.steadfast_api} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Webhook:</span>
            <StatusBadge status={apiStatuses.steadfast_webhook} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">BD Courier:</span>
            <StatusBadge status={apiStatuses.bdcourier} />
          </div>
        </div>
        <button onClick={checkApiStatuses} disabled={checkingApis}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50">
          {checkingApis ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Recheck
        </button>
      </div>

      {/* China / Bangladesh Tabs */}
      <div className="relative flex rounded-xl border border-border bg-muted/30 p-1 gap-1">
        {/* Animated sliding indicator */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-lg bg-primary shadow-sm"
          layout
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          style={{ width: "calc(50% - 4px)", left: activeTab === "china" ? 4 : "calc(50% + 2px)" }}
        />
        <button
          onClick={() => { setActiveTab("china"); setSelectedStatuses(new Set()); }}
          className={`relative z-10 flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "china" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <img src={chinaFlag} alt="China" className="w-5 h-3.5 rounded-[2px] object-cover shadow-sm shrink-0" />
          <span>China ({orders.filter(o => isInChinaSection(o.status)).length})</span>
        </button>
        <button
          onClick={() => { setActiveTab("bd"); setSelectedStatuses(new Set()); }}
          className={`relative z-10 flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "bd" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <img src={bdFlag} alt="BD" className="w-5 h-3.5 rounded-[2px] object-cover shadow-sm shrink-0" />
          <span className="hidden sm:inline">Bangladesh</span><span className="sm:hidden">BD</span> ({orders.filter(o => isInBDSection(o.status)).length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, order number..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {/* Multi-select status filter */}
        <div className="relative">
          <button
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm min-w-[180px] hover:bg-muted/30 transition-colors"
          >
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <span className="flex-1 text-left truncate">
              {selectedStatuses.size === 0 ? "All Statuses" : `${selectedStatuses.size} selected`}
            </span>
            <motion.svg
              animate={{ rotate: statusDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-muted-foreground shrink-0"
            >
              <path d="m6 9 6 6 6-6" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {statusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-card shadow-xl shadow-black/10 overflow-hidden"
                >
                  <div className="p-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground px-1">Filter by Status</span>
                    {selectedStatuses.size > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedStatuses(new Set()); }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="p-1.5 max-h-[280px] overflow-y-auto">
                    {tabStatuses.map(s => {
                      const count = orders.filter(o => o.status === s).length;
                      const isSelected = selectedStatuses.has(s);
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            setSelectedStatuses(prev => {
                              const next = new Set(prev);
                              if (next.has(s)) next.delete(s);
                              else next.add(s);
                              return next;
                            });
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors duration-150 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                            <svg
                              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                              className={`transition-all duration-150 ${isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[s] || "bg-muted"}`}>
                            {statusLabels[s]}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground font-medium">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Selected status chips */}
      {selectedStatuses.size > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-1.5"
        >
          {Array.from(selectedStatuses).map(s => (
            <button
              key={s}
              onClick={() => {
                setSelectedStatuses(prev => {
                  const next = new Set(prev);
                  next.delete(s);
                  return next;
                });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-70 ${statusColors[s] || "bg-muted"}`}
            >
              {statusLabels[s]}
              <X size={12} />
            </button>
          ))}
        </motion.div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
      {selectedOrder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 bg-foreground/40 backdrop-blur-sm overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
          onClick={(e) => e.target === e.currentTarget && setSelectedOrder(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-3xl rounded-2xl bg-card border border-border shadow-2xl shadow-black/10 my-4 overflow-visible"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground">{formatBDDate(selectedOrder.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.status] || "bg-muted"}`}>
                  {statusLabels[selectedOrder.status] || selectedOrder.status}
                </span>
                {isDeveloper && (
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        open: true,
                        title: "Permanently Delete Order?",
                        description: `This will permanently delete order #${selectedOrder.id.slice(0, 8).toUpperCase()} and all related data (items, status history, wallet transactions). This action cannot be undone.`,
                        confirmLabel: "Delete Forever",
                        variant: "danger",
                        onConfirm: async () => {
                          const orderId = selectedOrder.id;
                          // Delete in correct order due to foreign keys
                          await supabase.from("order_status_history").delete().eq("order_id", orderId);
                          await supabase.from("order_items").delete().eq("order_id", orderId);
                          await supabase.from("wallet_transactions").delete().eq("order_id", orderId);
                          const { error } = await supabase.from("orders").delete().eq("id", orderId);
                          if (error) {
                            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
                          } else {
                            setOrders(prev => prev.filter(o => o.id !== orderId));
                            setSelectedOrder(null);
                            toast({ title: "Order deleted permanently 🗑️" });
                          }
                        },
                      });
                    }}
                    className="p-2 rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete order permanently"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">

            {/* BD Courier Delivery Reliability — China tab only */}
            {isInChinaSection(selectedOrder.status) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border p-4 bg-muted/10">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <ShieldCheck size={14} /> Delivery Reliability (BD Courier)
              </h4>
              {courierLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Checking...
                </div>
              ) : courierData?.status === "success" && courierData?.data?.summary ? (
                (() => {
                  const summary = courierData.data.summary;
                  const total = Number(summary.total_parcel || 0);
                  const success = Number(summary.success_parcel || 0);
                  const cancel = Number(summary.cancelled_parcel || 0);
                  const successRate = Number(summary.success_ratio || 0);
                  const isRisky = successRate < 50 && total > 2;
                  const isGood = successRate >= 70;

                  // Get individual courier data
                  const couriers = Object.entries(courierData.data)
                    .filter(([key]) => key !== 'summary')
                    .filter(([, val]: [string, any]) => val.total_parcel > 0)
                    .sort(([, a]: [string, any], [, b]: [string, any]) => b.total_parcel - a.total_parcel);

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-muted/40 p-2.5">
                          <p className="text-lg font-bold text-foreground">{total}</p>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
                          <p className="text-lg font-bold text-emerald-600">{success}</p>
                          <p className="text-[10px] text-muted-foreground">Success</p>
                        </div>
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2.5">
                          <p className="text-lg font-bold text-red-500">{cancel}</p>
                          <p className="text-[10px] text-muted-foreground">Cancel</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isGood ? "bg-emerald-500" : isRisky ? "bg-red-500" : "bg-yellow-500"}`} style={{ width: `${successRate}%` }} />
                        </div>
                        <span className={`text-sm font-bold ${isGood ? "text-emerald-600" : isRisky ? "text-red-500" : "text-yellow-600"}`}>{successRate}%</span>
                      </div>
                      {isRisky && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg p-2">
                          <ShieldAlert size={14} /> ⚠️ Risky customer — low delivery success rate!
                        </div>
                      )}
                      {isGood && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2">
                          <ShieldCheck size={14} /> ✅ Good customer — delivery success rate is solid
                        </div>
                      )}
                      {/* Individual courier breakdown */}
                      {couriers.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border">
                          {couriers.map(([key, val]: [string, any]) => (
                            <div key={key} className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-muted/30">
                              {val.logo && <img src={val.logo} alt={val.name} className="w-4 h-4 rounded object-contain" />}
                              <div className="min-w-0">
                                <p className="font-medium truncate">{val.name}</p>
                                <p className="text-muted-foreground">{val.success_parcel}/{val.total_parcel} ({val.success_ratio}%)</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : courierData?.error ? (
                <div className="flex items-center gap-2 text-sm text-yellow-600">
                  <AlertTriangle size={14} /> {courierData.error}
                </div>
              ) : !courierLoading && courierData !== null ? (
                <p className="text-sm text-muted-foreground">No data found</p>
              ) : (
                <p className="text-sm text-muted-foreground">Will check using phone number</p>
              )}
            </motion.div>
            )}

            {/* Customer Info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border p-4 space-y-3 bg-muted/10">
              <h4 className="font-semibold text-sm flex items-center gap-2">👤 Customer Info</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{profiles[selectedOrder.user_id]?.full_name || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-medium">{profiles[selectedOrder.user_id]?.email || "—"}</span>
                </div>

                {/* Editable Phone */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Phone:</span>
                  {editingField === "phone" ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                        className="flex-1 px-2 py-1 rounded border border-input bg-background text-sm" />
                      <button onClick={() => handleSaveField("phone")} className="p-1 text-emerald-600"><Check size={14} /></button>
                      <button onClick={() => setEditingField(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                    </div>
                  ) : (
                    <span className="font-medium">
                      {selectedOrder.phone || "—"}
                      <button onClick={() => { setEditPhone(selectedOrder.phone || ""); setEditingField("phone"); }} className="ml-1 text-muted-foreground hover:text-foreground"><Edit2 size={12} /></button>
                    </span>
                  )}
                </div>

                {/* Editable Address */}
                <div className="flex items-start gap-2 col-span-full">
                  <span className="text-muted-foreground shrink-0">Address:</span>
                  {editingField === "address" ? (
                    <div className="flex items-start gap-1 flex-1">
                      <textarea value={editAddress} onChange={e => setEditAddress(e.target.value)}
                        className="flex-1 px-2 py-1 rounded border border-input bg-background text-sm min-h-[50px]" />
                      <button onClick={() => handleSaveField("address")} className="p-1 text-emerald-600"><Check size={14} /></button>
                      <button onClick={() => setEditingField(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                    </div>
                  ) : (
                    <span className="font-medium">
                      {selectedOrder.shipping_address || "—"}
                      <button onClick={() => { setEditAddress(selectedOrder.shipping_address || ""); setEditingField("address"); }} className="ml-1 text-muted-foreground hover:text-foreground"><Edit2 size={12} /></button>
                    </span>
                  )}
                </div>
                {/* IP Address */}
                {(selectedOrder as any).customer_ip && (
                  <div className="col-span-full mt-1">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Globe size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Client IP Address</p>
                        <code className="text-sm font-mono font-semibold text-foreground">{(selectedOrder as any).customer_ip}</code>
                      </div>
                      {ipBlocked === true ? (
                        <button
                          onClick={() => {
                            const ip = (selectedOrder as any).customer_ip;
                            setConfirmDialog({
                              open: true,
                              title: "Unblock IP?",
                              description: `This will allow orders from ${ip} again.`,
                              confirmLabel: "Unblock",
                              variant: "info",
                              onConfirm: async () => {
                                setIpBlockLoading(true);
                                await supabase.from("blocked_ips").delete().eq("ip_address", ip);
                                setIpBlocked(false);
                                setIpBlockLoading(false);
                                toast({ title: `IP ${ip} unblocked ✅` });
                              },
                            });
                          }}
                          disabled={ipBlockLoading}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all shrink-0"
                        >
                          <ShieldOff size={13} /> Unblock
                        </button>
                      ) : ipBlocked === false ? (
                        <button
                          onClick={() => {
                            const ip = (selectedOrder as any).customer_ip;
                            setConfirmDialog({
                              open: true,
                              title: "Block IP Address?",
                              description: `IP ${ip} will be permanently blocked from placing any orders. This can be reversed later from the Blocked IPs page.`,
                              confirmLabel: "Block IP",
                              variant: "danger",
                              onConfirm: async () => {
                                setIpBlockLoading(true);
                                const reason = `Blocked from order #${selectedOrder.id.slice(0, 8).toUpperCase()} — ${profiles[selectedOrder.user_id]?.full_name || "Unknown"}`;
                                await supabase.from("blocked_ips").insert({ ip_address: ip, reason, blocked_by: (await supabase.auth.getUser()).data.user?.id });
                                setIpBlocked(true);
                                setIpBlockLoading(false);
                                toast({ title: `IP ${ip} blocked! 🚫`, description: "This IP can no longer place orders." });
                              },
                            });
                          }}
                          disabled={ipBlockLoading}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all shrink-0"
                        >
                          <Ban size={13} /> Block
                        </button>
                      ) : (
                        <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {ipBlocked === true && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600"
                      >
                        <ShieldAlert size={13} /> This IP is currently blocked from placing orders
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Order Items */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border overflow-hidden bg-muted/10">
              <div className="px-4 py-2 bg-muted/30 border-b border-border">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Package size={14} /> Order Items</h4>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium">Size</th>
                  <th className="text-center p-3 font-medium">Qty</th>
                  <th className="text-right p-3 font-medium">Price</th>
                </tr></thead>
                <tbody>
                  {selectedOrder.order_items.map(item => {
                    const img = item.products?.product_images?.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))[0];
                    return (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {img ? (
                            <img src={img.image_url} alt={item.products?.title} className="w-8 h-8 rounded object-cover bg-muted" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted" />
                          )}
                          <span>{item.products?.title || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="p-3">{item.selected_size || "—"}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right font-semibold">৳{Number(item.price).toLocaleString()}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>

            {/* Amount & Payment Info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border p-4 space-y-3 bg-muted/10">
              <h4 className="font-semibold text-sm flex items-center gap-2"><CreditCard size={14} /> Payment Info</h4>
              
              {/* Cost Breakdown */}
              {(() => {
                const productSubtotal = selectedOrder.order_items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const intlCargo = Number(selectedOrder.estimated_cargo_charge || 0);
                const domesticCharge = Number(selectedOrder.domestic_delivery_charge || 0);
                const walletUsed = Number(selectedOrder.wallet_amount_used || 0);
                const totalAmount = Number(selectedOrder.total_amount);
                const knownCosts = productSubtotal + intlCargo + domesticCharge;
                const discountOrCoupon = knownCosts - totalAmount - walletUsed > 0 ? knownCosts - totalAmount - walletUsed : 0;
                
                return (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">🛒 Products Subtotal</span>
                      <span className="font-medium">৳{productSubtotal.toLocaleString()}</span>
                    </div>
                    {intlCargo > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">✈️ Int'l Air Cargo (Est.)</span>
                        <span className="font-medium">৳{intlCargo.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedOrder.actual_weight_gm && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">⚖️ Actual Weight</span>
                        <span className="font-medium">{selectedOrder.actual_weight_gm}gm</span>
                      </div>
                    )}
                    {selectedOrder.actual_cargo_charge != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">✈️ Actual Cargo Charge</span>
                        <span className="font-medium">৳{Number(selectedOrder.actual_cargo_charge).toLocaleString()}</span>
                      </div>
                    )}
                    {domesticCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">🚚 Local Delivery (Steadfast)</span>
                        <span className="font-medium">৳{domesticCharge.toLocaleString()}</span>
                      </div>
                    )}
                    {discountOrCoupon > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>🏷️ Discount / Coupon</span>
                        <span className="font-medium">-৳{discountOrCoupon.toLocaleString()}</span>
                      </div>
                    )}
                    {walletUsed > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>💳 Wallet Used</span>
                        <span className="font-medium">-৳{walletUsed.toLocaleString()}</span>
                      </div>
                    )}
                    {Number(selectedOrder.shipping_adjustment || 0) !== 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>📐 Shipping Adjustment</span>
                        <span className="font-medium">{Number(selectedOrder.shipping_adjustment) > 0 ? "+" : ""}৳{Number(selectedOrder.shipping_adjustment).toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-border my-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Grand Total</span>
                      {editingField === "amount" ? (
                        <div className="flex items-center gap-1">
                          <span>৳</span>
                          <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-input bg-background text-sm" />
                          <button onClick={() => handleSaveField("amount")} className="p-1 text-emerald-600"><Check size={14} /></button>
                          <button onClick={() => setEditingField(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                        </div>
                      ) : (
                        <span className="font-bold text-primary text-base">
                          ৳{totalAmount.toLocaleString()}
                          <button onClick={() => { setEditAmount(String(selectedOrder.total_amount)); setEditingField("amount"); }} className="ml-1 text-muted-foreground hover:text-foreground"><Edit2 size={12} /></button>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Payment Method Details */}
              <div className="border-t border-border pt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Payment Type:</span>{" "}
                  <span className="font-medium">{selectedOrder.payment_type === "partial" ? "40% Advance" : "Full"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paid Amount:</span>{" "}
                  <span className="font-medium">৳{Number(selectedOrder.payment_amount || selectedOrder.total_amount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Method:</span>{" "}
                  <span className="font-medium">{selectedOrder.payment_method || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Verified:</span>{" "}
                  <span className={`font-medium ${selectedOrder.payment_verified ? "text-emerald-600" : "text-yellow-600"}`}>
                    {selectedOrder.payment_verified ? "✅ Yes" : "⏳ Pending"}
                  </span>
                </div>
              </div>

              {/* Payment Proof */}
              {selectedOrder.payment_proof_url && (
                <div className="pt-3 border-t border-border">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2"><ImageIcon size={14} /> Payment Proof</p>
                  <img
                    src={selectedOrder.payment_proof_url}
                    alt="Payment proof"
                    className="w-32 h-32 object-cover rounded-lg border border-border cursor-zoom-in hover:ring-2 hover:ring-primary/30 transition-all"
                    onClick={() => setProofZoom("original")}
                  />
                  {!selectedOrder.payment_verified && (
                    <button onClick={handleVerifyPayment}
                      className="mt-3 w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                      ✅ Verify Payment & Confirm Order
                    </button>
                  )}
                </div>
              )}
            </motion.div>

            {/* Send to Steadfast — BD tab only */}
            {isInBDSection(selectedOrder.status) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border p-4 space-y-3 bg-muted/10">
              <h4 className="font-semibold text-sm flex items-center gap-2"><Send size={14} /> Send to Steadfast</h4>
              {selectedOrder.tracking_number && !lastSteadfastResult ? (
                /* ─── Already sent: Show stored tracking info ─── */
                <div className="space-y-3">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700">Successfully sent to Steadfast!</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tracking Code</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-lg font-bold text-primary font-mono">{selectedOrder.tracking_number}</p>
                      <button onClick={() => { navigator.clipboard.writeText(selectedOrder.tracking_number!); toast({ title: "Copied!" }); }}
                        className="p-1 text-muted-foreground hover:text-foreground"><Copy size={14} /></button>
                    </div>
                  </div>
                </div>
              ) : !showSteadfast && !lastSteadfastResult ? (
                <button onClick={() => { setShowSteadfast(true); setCodAmount(String(selectedOrder.total_amount)); }}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Send size={14} /> Send to Steadfast
                </button>
              ) : lastSteadfastResult ? (
                /* ─── Success: Show Consignment ID prominently ─── */
                <div className="space-y-3">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700">Successfully sent to Steadfast!</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/40 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Consignment ID</p>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-lg font-bold text-foreground font-mono">{lastSteadfastResult.consignment_id}</p>
                        <button onClick={() => { navigator.clipboard.writeText(String(lastSteadfastResult.consignment_id)); toast({ title: "Copied!" }); }}
                          className="p-1 text-muted-foreground hover:text-foreground"><Copy size={14} /></button>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tracking Code</p>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-lg font-bold text-primary font-mono">{lastSteadfastResult.tracking_code}</p>
                        <button onClick={() => { navigator.clipboard.writeText(String(lastSteadfastResult.tracking_code)); toast({ title: "Copied!" }); }}
                          className="p-1 text-muted-foreground hover:text-foreground"><Copy size={14} /></button>
                      </div>
                    </div>
                  </div>
                  {lastSteadfastResult.invoice && (
                    <p className="text-xs text-muted-foreground text-center">Invoice: {lastSteadfastResult.invoice}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">COD Amount (৳)</label>
                    <input type="number" value={codAmount} onChange={e => setCodAmount(e.target.value)}
                      placeholder="Enter COD amount"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">Name:</span> {profiles[selectedOrder.user_id]?.full_name || '—'}</p>
                    <p><span className="font-medium text-foreground">Phone:</span> {selectedOrder.phone || profiles[selectedOrder.user_id]?.phone || '—'}</p>
                    <p><span className="font-medium text-foreground">Address:</span> {selectedOrder.shipping_address || '—'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSendToSteadfast} disabled={sendingSteadfast || !codAmount}
                      className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                      {sendingSteadfast ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Confirm & Send</>}
                    </button>
                    <button onClick={() => setShowSteadfast(false)}
                      className="px-4 py-2.5 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
            )}

            {/* Steadfast Consignment Status — BD tab only */}
            {isInBDSection(selectedOrder.status) && selectedOrder.tracking_number && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-border p-4 space-y-3 bg-muted/10">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Package size={14} /> Consignment Status</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Tracking:</span> {selectedOrder.tracking_number}
                </div>
                <button
                  onClick={handleCheckSteadfastStatus}
                  disabled={checkingStatus}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkingStatus ? <><Loader2 size={14} className="animate-spin" /> Checking...</> : <><Eye size={14} /> Check Consignment Status</>}
                </button>

                {steadfastStatus && (
                  <div className="mt-3 rounded-lg border border-border bg-card p-3 space-y-2">
                    {steadfastStatus.delivery_status !== undefined ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Status:</span> <span className={`ml-1 px-2 py-0.5 rounded-full font-medium ${
                            steadfastStatus.delivery_status === 'delivered' ? 'bg-green-100 text-green-700' :
                            steadfastStatus.delivery_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            steadfastStatus.delivery_status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
                            steadfastStatus.delivery_status === 'pending' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{steadfastStatus.delivery_status || '—'}</span></div>
                          <div><span className="text-muted-foreground">Consignment ID:</span> <span className="font-medium text-foreground ml-1">{steadfastStatus.consignment_id || '—'}</span></div>
                          <div><span className="text-muted-foreground">Invoice:</span> <span className="font-medium text-foreground ml-1">{steadfastStatus.invoice || '—'}</span></div>
                          <div><span className="text-muted-foreground">COD:</span> <span className="font-medium text-foreground ml-1">৳{steadfastStatus.cod_amount || 0}</span></div>
                          {steadfastStatus.recipient_name && <div><span className="text-muted-foreground">Recipient:</span> <span className="font-medium text-foreground ml-1">{steadfastStatus.recipient_name}</span></div>}
                          {steadfastStatus.recipient_phone && <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-foreground ml-1">{steadfastStatus.recipient_phone}</span></div>}
                          {steadfastStatus.recipient_address && <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium text-foreground ml-1">{steadfastStatus.recipient_address}</span></div>}
                          {steadfastStatus.note && <div className="col-span-2"><span className="text-muted-foreground">Note:</span> <span className="font-medium text-foreground ml-1">{steadfastStatus.note}</span></div>}
                         </div>
                        {/* Sync button */}
                        {steadfastStatus.delivery_status && steadfastStatus.delivery_status !== 'unknown' && (
                          <button
                            onClick={handleSyncSteadfastStatus}
                            disabled={saving}
                            className="w-full mt-2 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {saving ? <><Loader2 size={12} className="animate-spin" /> Syncing...</> : <>🔄 Sync Status → {steadfastToOrderStatus(steadfastStatus.delivery_status) || '?'}</>}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-xs">
                        <p className="text-muted-foreground">Response:</p>
                        <pre className="mt-1 p-2 rounded bg-muted text-xs overflow-auto max-h-40">{JSON.stringify(steadfastStatus, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Weight & Shipping Adjustment — BD tab only */}
            {isInBDSection(selectedOrder.status) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="rounded-xl border border-border p-4 space-y-4 bg-muted/10">
              <h4 className="font-semibold text-sm flex items-center gap-2"><Scale size={14} /> Weight & Shipping Adjustment</h4>
              
              {/* Summary row */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Customer Paid Cargo:</span> <span className="font-medium">৳{Number(selectedOrder.estimated_cargo_charge || 0).toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Domestic Delivery:</span> <span className="font-medium">৳{Number(selectedOrder.domestic_delivery_charge || 0).toLocaleString()}</span></div>
                {selectedOrder.actual_weight_gm && (
                  <>
                    <div><span className="text-muted-foreground">Actual Weight:</span> <span className="font-medium">{selectedOrder.actual_weight_gm}gm</span></div>
                    <div><span className="text-muted-foreground">Actual Cargo:</span> <span className="font-medium">৳{Number(selectedOrder.actual_cargo_charge || 0).toLocaleString()}</span></div>
                  </>
                )}
                {selectedOrder.shipping_adjustment !== null && selectedOrder.shipping_adjustment !== 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Adjustment:</span>{" "}
                    <span className={`font-bold ${Number(selectedOrder.shipping_adjustment) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {Number(selectedOrder.shipping_adjustment) > 0 ? "+" : ""}৳{Number(selectedOrder.shipping_adjustment).toLocaleString()}
                      {" "}({selectedOrder.adjustment_status})
                    </span>
                  </div>
                )}
              </div>

              {/* Per-category weight groups */}
              {(!selectedOrder.actual_weight_gm || selectedOrder.adjustment_status === "none") && weightGroups.length > 0 && (
                <div className="pt-3 border-t border-border space-y-4">
                  {weightGroups.map((group, gi) => {
                    const newCharge = group.chargeType === "per_piece"
                      ? group.estCharge
                      : (group.actualWeightGm && Number(group.actualWeightGm) > 0)
                        ? Math.round(group.rate * (Number(group.actualWeightGm) / 1000))
                        : null;

                    return (
                      <div key={gi} className="rounded-lg border border-border p-3 space-y-2 bg-card">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{group.categoryName}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {group.chargeType === "per_piece" ? "Per Piece" : "Per KG"} • ৳{group.rate}/{group.chargeType === "per_piece" ? "pc" : "kg"}
                          </span>
                        </div>

                        {/* Items in this group */}
                        <div className="space-y-1">
                          {group.items.map((item, ii) => (
                            <div key={ii} className="flex justify-between text-xs text-muted-foreground">
                              <span>{item.title}{item.variant ? ` (${item.variant})` : ""} × {item.qty}</span>
                              <span>{item.estWeightGm}gm × {item.qty} = {item.estWeightGm * item.qty}gm</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between text-sm border-t border-border/50 pt-1.5">
                          <span className="text-muted-foreground">Estimated Weight:</span>
                          <span className="font-medium">{group.totalEstWeightGm}gm → ৳{group.estCharge.toLocaleString()}</span>
                        </div>

                        {/* Actual weight input (only for per_kg) */}
                        {group.chargeType === "per_kg" && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Actual Weight (gm)</label>
                            <input
                              type="number"
                              value={group.actualWeightGm}
                              onChange={e => {
                                const updated = [...weightGroups];
                                updated[gi] = { ...updated[gi], actualWeightGm: e.target.value };
                                setWeightGroups(updated);
                              }}
                              placeholder={`Actual weight for ${group.categoryName}`}
                              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            {newCharge !== null && (
                              <div className="mt-1.5 flex justify-between text-xs">
                                <span className="text-muted-foreground">New Charge ({group.actualWeightGm}gm):</span>
                                <span className={`font-semibold ${newCharge > group.estCharge ? "text-rose-600" : newCharge < group.estCharge ? "text-emerald-600" : "text-foreground"}`}>
                                  ৳{newCharge.toLocaleString()} ({newCharge - group.estCharge > 0 ? "+" : ""}{(newCharge - group.estCharge).toLocaleString()})
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {group.chargeType === "per_piece" && (
                          <p className="text-xs text-muted-foreground italic">পিস চার্জ পরিবর্তন হয় না</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Total preview */}
                  {(() => {
                    const kgGroups = weightGroups.filter(g => g.chargeType === "per_kg");
                    const allFilled = kgGroups.every(g => g.actualWeightGm && Number(g.actualWeightGm) > 0);
                    if (!allFilled) return null;

                    const estTotal = Number(selectedOrder.estimated_cargo_charge || 0);
                    let newTotal = 0;
                    for (const g of weightGroups) {
                      if (g.chargeType === "per_piece") {
                        newTotal += g.estCharge;
                      } else {
                        newTotal += Math.round(g.rate * (Number(g.actualWeightGm) / 1000));
                      }
                    }
                    const diff = newTotal - estTotal;

                    return (
                      <div className={`p-3 rounded-lg border text-sm space-y-1.5 ${diff > 0 ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800" : diff < 0 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" : "bg-muted/40 border-border"}`}>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">নতুন মোট কার্গো চার্জ:</span>
                          <span className="font-semibold">৳{newTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">কাস্টমার পেইড কার্গো:</span>
                          <span className="font-medium">৳{estTotal.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-current/10 pt-1.5 flex justify-between font-bold">
                          <span>{diff > 0 ? "🔴 কাস্টমারকে পে করতে হবে:" : diff < 0 ? "🟢 কাস্টমারের ওয়ালেটে রিফান্ড:" : "✅ কোনো পরিবর্তন নেই"}</span>
                          {diff !== 0 && (
                            <span className={diff > 0 ? "text-rose-600" : "text-emerald-600"}>
                              {diff > 0 ? "+" : ""}৳{Math.abs(diff).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={handleWeightAdjustment}
                    disabled={adjustmentSaving || weightGroups.filter(g => g.chargeType === "per_kg").some(g => !g.actualWeightGm || Number(g.actualWeightGm) <= 0)}
                    className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {adjustmentSaving ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <><Scale size={14} /> Confirm Weight Adjustment</>}
                  </button>
                </div>
              )}
            </motion.div>
            )}

            {/* Due Payment Section — BD tab only */}
            {isInBDSection(selectedOrder.status) && (selectedOrder.adjustment_status === "due" || selectedOrder.adjustment_status === "paid") && Number(selectedOrder.shipping_adjustment || 0) > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="rounded-xl border border-rose-200 dark:border-rose-900/40 p-4 space-y-3 bg-rose-50/50 dark:bg-rose-950/10">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-rose-700 dark:text-rose-400"><CreditCard size={14} /> Due Payment — ৳{Math.abs(Number(selectedOrder.shipping_adjustment)).toLocaleString()}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Due Amount:</span>{" "}
                    <span className="font-bold text-rose-600">৳{Math.abs(Number(selectedOrder.shipping_adjustment)).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Method:</span>{" "}
                    <span className="font-medium">{(selectedOrder as any).due_payment_method || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Verified:</span>{" "}
                    <span className={`font-medium ${(selectedOrder as any).due_payment_verified ? "text-emerald-600" : "text-yellow-600"}`}>
                      {(selectedOrder as any).due_payment_verified ? "✅ Yes" : "⏳ Pending"}
                    </span>
                  </div>
                </div>
                {(selectedOrder as any).due_payment_proof_url && (
                  <div className="pt-3 border-t border-rose-200 dark:border-rose-900/40">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2"><ImageIcon size={14} /> Due Payment Proof</p>
                    <img
                      src={(selectedOrder as any).due_payment_proof_url}
                      alt="Due payment proof"
                      className="w-32 h-32 object-cover rounded-lg border border-border cursor-zoom-in hover:ring-2 hover:ring-rose-400/30 transition-all"
                      onClick={() => setProofZoom("due")}
                    />
                    {!(selectedOrder as any).due_payment_verified && (
                      <button onClick={handleVerifyDuePayment}
                        className="mt-3 w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                        ✅ Verify Due Payment
                      </button>
                    )}
                  </div>
                )}
                {!(selectedOrder as any).due_payment_proof_url && (
                  <p className="text-xs text-rose-600/70 italic">কাস্টমার এখনো due payment proof জমা দেননি</p>
                )}
              </motion.div>
            )}

            <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/10">
              <h4 className="font-semibold text-sm flex items-center gap-2">🔄 Change Status</h4>
              {(() => {
                const currentInChina = isInChinaSection(selectedOrder.status);
                const availableStatuses = currentInChina
                  ? [...CHINA_STATUSES, "shipped_via_air"]
                  : BD_STATUSES;
                const statusDropOpen = statusChangeDropOpen;
                const setStatusDropOpen = setStatusChangeDropOpen;
                const currentLabel = statusLabels[newStatus] || newStatus;

                return (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setStatusDropOpen(!statusDropOpen)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[newStatus] || "bg-muted"}`}>
                          {currentLabel}
                        </span>
                      </div>
                      <motion.svg
                        animate={{ rotate: statusDropOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="text-muted-foreground shrink-0"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </motion.svg>
                    </button>

                    <AnimatePresence>
                      {statusDropOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setStatusDropOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            onWheel={(e) => e.stopPropagation()}
                            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-card shadow-xl shadow-black/10 overflow-y-auto overscroll-contain max-h-[22rem]"
                          >
                            {/* China section */}
                            {currentInChina && (
                              <div className="p-1.5 border-b border-border">
                                <p className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                  <img src={chinaFlag} alt="" className="w-3.5 h-2.5 rounded-[2px] object-cover" /> China Warehouse
                                </p>
                                {CHINA_STATUSES.map(s => (
                                  <button
                                    key={s}
                                    onClick={() => { setNewStatus(s); setStatusDropOpen(false); }}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${newStatus === s ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/50"}`}
                                  >
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${newStatus === s ? "bg-primary" : "bg-muted-foreground/20"}`} />
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[s] || "bg-muted"}`}>
                                      {statusLabels[s]}
                                    </span>
                                    {s === selectedOrder.status && (
                                      <span className="ml-auto text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">current</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            {/* Transition / BD section */}
                            <div className="p-1.5">
                              <p className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                {currentInChina ? (
                                  <><span className="text-xs">✈️</span> Transition to BD</>
                                ) : (
                                  <><img src={bdFlag} alt="" className="w-3.5 h-2.5 rounded-[2px] object-cover" /> Bangladesh</>
                                )}
                              </p>
                              {(currentInChina ? ["shipped_via_air"] : BD_STATUSES).map(s => (
                                <button
                                  key={s}
                                  onClick={() => { setNewStatus(s); setStatusDropOpen(false); }}
                                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${newStatus === s ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/50"}`}
                                >
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${newStatus === s ? "bg-primary" : "bg-muted-foreground/20"}`} />
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[s] || "bg-muted"}`}>
                                    {statusLabels[s]}
                                  </span>
                                  {s === selectedOrder.status && (
                                    <span className="ml-auto text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">current</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
              <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm min-h-[50px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow" placeholder="Add a note (optional)..." />
              <button onClick={handleUpdateStatus} disabled={saving}
                className="w-full py-2.5 rounded-xl gradient-brand text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-md">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Updating...</> : "Update Status"}
              </button>
            </div>

            {/* Status History */}
            {statusHistory.length > 0 && (
              <div className="rounded-xl border border-border p-4">
                <h4 className="font-semibold text-sm mb-3">📋 Status History</h4>
                <div className="space-y-2">
                  {statusHistory.map((h: any) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColors[h.status] || "bg-muted"}`}>{statusLabels[h.status] || h.status}</span>
                      <div>
                        {h.note && <p className="text-foreground">{h.note}</p>}
                        <p className="text-xs text-muted-foreground">{formatBDDate(h.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Order History — China tab only */}
            {isInChinaSection(selectedOrder.status) && customerHistory.length > 0 && (
              <div className="rounded-xl border border-border p-4">
                <h4 className="font-semibold text-sm mb-3">🕐 Other Orders by This Customer</h4>
                <div className="space-y-2">
                  {customerHistory.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                      <div>
                        <span className="font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-muted-foreground ml-2">{formatBDDateShort(o.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">৳{Number(o.total_amount).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] || "bg-muted"}`}>{statusLabels[o.status] || o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedOrder.notes && (
              <div className="rounded-xl border border-border p-4">
                <h4 className="font-semibold text-sm mb-1">📝 Notes</h4>
                <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
              </div>
            )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Orders List */}
      <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="space-y-3"
      >
        {filteredOrders.map((o) => {
          const profile = profiles[o.user_id];
          const phone = o.phone || profile?.phone;
          const cd = phone ? (cardCourierData[phone] || courierCache[phone]) : null;
          const successRate = cd?.status === "success" && cd?.data?.summary ? Number(cd.data.summary.success_ratio || 0) : null;
          const isAutoCancelled = o.status === "cancelled" && (o.notes || "").includes("[AUTO-CANCELLED]");
          return (
            <div key={o.id} className={`rounded-xl bg-card border p-4 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow ${isAutoCancelled ? "border-orange-300 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/10" : "border-border"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{profile?.full_name || profile?.phone || "Unknown"}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] || "bg-muted"}`}>
                    {statusLabels[o.status] || o.status}
                  </span>
                  {isAutoCancelled && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                      ⏰ Auto
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</span>
                  {successRate !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${successRate >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : successRate < 50 ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"}`}>
                      {successRate.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatBDDateShort(o.created_at)}</span>
                  <span className="font-semibold text-primary">৳{Number(o.total_amount).toLocaleString()}</span>
                  {o.customer_ip && (
                    <span className="flex items-center gap-1 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      <Globe size={10} /> {o.customer_ip}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => openOrder(o)}
                className="px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium flex items-center gap-1.5 transition-colors">
                <Eye size={14} /> View
              </button>
            </div>
          );
        })}
        {filteredOrders.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">No orders found</p>}
      </motion.div>
      </AnimatePresence>

      {/* Payment Proof Lightbox - rendered at root level for proper z-index */}
      {proofZoom && selectedOrder && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setProofZoom(false)}>
          <div className="relative bg-card rounded-2xl shadow-2xl p-3 max-w-lg max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setProofZoom(false)} className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors">
              <X size={16} />
            </button>
            <img
              src={proofZoom === "due" ? (selectedOrder as any).due_payment_proof_url : selectedOrder.payment_proof_url}
              alt="Payment proof"
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
        onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }}
        loading={confirmLoading}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />
    </div>
  );
};

export default OrderManagement;
