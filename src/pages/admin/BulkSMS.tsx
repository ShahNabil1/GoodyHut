import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { format, subMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Search, Users, PackageSearch, UserCheck, X, Check,
  Loader2, Settings, RefreshCw, CheckCircle2, XCircle, Clock, Filter,
  Megaphone, ChevronDown, Ban, Wifi, WifiOff, Zap, Save, Trash2, BookmarkPlus
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  banned: boolean | null;
  created_at: string;
}

interface SmsLog {
  id: string;
  campaign_id: string;
  recipient_phone: string;
  recipient_name: string | null;
  message: string;
  status: string;
  error_message: string | null;
  sent_by: string | null;
  mode: string;
  created_at: string;
}

interface SmsTemplate {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

type Tab = "all" | "product" | "custom";
type ExcludeFilter = "inactive_2m" | "cancelled" | "banned";

const BulkSMS = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orderStats, setOrderStats] = useState<Record<string, { count: number; lastOrder: string | null; hasCancelled: boolean }>>({});
  const [loading, setLoading] = useState(true);

  // Tab
  const [tab, setTab] = useState<Tab>("all");

  // Filters for All / Custom
  const [searchQuery, setSearchQuery] = useState("");
  const [excludeFilters, setExcludeFilters] = useState<ExcludeFilter[]>([]);

  // Product mode
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [productCartUsers, setProductCartUsers] = useState<string[]>([]);

  // Custom select
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  // Message
  const [message, setMessage] = useState("");

  // Sending
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

  // Settings/History
  const [showHistory, setShowHistory] = useState(false);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [adminProfiles, setAdminProfiles] = useState<Record<string, string>>({});

  // API Status
  const [apiStatus, setApiStatus] = useState<{ ok: boolean; message: string; latency?: number } | null>(null);
  const [checkingApi, setCheckingApi] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [templateTitle, setTemplateTitle] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // ─── Fetch data ───────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone, avatar_url, banned, created_at").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id, created_at, status").order("created_at", { ascending: false }),
      ]);

      setProfiles(profilesRes.data || []);

      const stats: Record<string, { count: number; lastOrder: string | null; hasCancelled: boolean }> = {};
      (ordersRes.data || []).forEach((o: any) => {
        if (!stats[o.user_id]) stats[o.user_id] = { count: 0, lastOrder: null, hasCancelled: false };
        stats[o.user_id].count++;
        if (!stats[o.user_id].lastOrder || o.created_at > stats[o.user_id].lastOrder!)
          stats[o.user_id].lastOrder = o.created_at;
        if (o.status === "cancelled" || o.status === "refunded") stats[o.user_id].hasCancelled = true;
      });
      setOrderStats(stats);
      setLoading(false);
    };
    fetchAll();
    checkApiStatus();
    loadTemplates();
  }, []);

  // ─── Check BulkSMSBD API status ──────
  const checkApiStatus = useCallback(async () => {
    setCheckingApi(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-sms-status");
      if (error) {
        setApiStatus({ ok: false, message: "Check failed" });
      } else if (data) {
        setApiStatus({ ok: data.ok, message: data.message, latency: data.latency });
      }
    } catch {
      setApiStatus({ ok: false, message: "Check failed" });
    }
    setCheckingApi(false);
  }, []);

  // ─── Templates ────────────────────────
  const loadTemplates = async () => {
    const { data } = await supabase.from("sms_templates").select("id, title, message, created_at").order("created_at", { ascending: false });
    setTemplates((data as SmsTemplate[]) || []);
  };

  const saveTemplate = async () => {
    if (!templateTitle.trim() || !message.trim()) return;
    setSavingTemplate(true);
    const { error } = await supabase.from("sms_templates").insert({
      title: templateTitle.trim(),
      message: message.trim(),
      created_by: user?.id,
    } as any);
    setSavingTemplate(false);
    if (error) {
      toast({ title: "Failed to save template", variant: "destructive" });
    } else {
      toast({ title: "Template saved ✅" });
      setShowSaveTemplate(false);
      setTemplateTitle("");
      loadTemplates();
    }
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("sms_templates").delete().eq("id", id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast({ title: "Template deleted" });
  };

  // ─── Filtered customers for All tab ───
  const filteredCustomers = useMemo(() => {
    let list = profiles.filter(p => p.phone);
    const twoMonthsAgo = subMonths(new Date(), 2).toISOString();

    if (excludeFilters.includes("inactive_2m")) {
      list = list.filter(p => {
        const s = orderStats[p.id];
        return !(s && s.lastOrder && s.lastOrder < twoMonthsAgo);
      });
    }
    if (excludeFilters.includes("cancelled")) {
      list = list.filter(p => !orderStats[p.id]?.hasCancelled);
    }
    if (excludeFilters.includes("banned")) {
      list = list.filter(p => !p.banned);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.phone || "").includes(q) ||
        (p.email || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [profiles, searchQuery, excludeFilters, orderStats]);

  // ─── Product search ───────────────────
  const searchProducts = async (q: string) => {
    setProductSearch(q);
    if (q.length < 2) { setProductResults([]); return; }
    const { data } = await supabase.from("products").select("id, title, emoji").ilike("title", `%${q}%`).limit(15);
    setProductResults(data || []);
  };

  const toggleProduct = (p: any) => {
    setSelectedProducts(prev =>
      prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]
    );
  };

  // Fetch cart users when products change
  useEffect(() => {
    if (selectedProducts.length === 0) { setProductCartUsers([]); return; }
    const fetchCartUsers = async () => {
      const ids = selectedProducts.map(p => p.id);
      const { data } = await supabase.from("cart_items").select("session_id").in("product_id", ids);
      setProductCartUsers([...new Set((data || []).map((c: any) => c.session_id))]);
    };
    fetchCartUsers();
  }, [selectedProducts]);

  const productRecipients = useMemo(() => {
    return profiles.filter(p => p.phone && productCartUsers.includes(p.id));
  }, [profiles, productCartUsers]);

  // ─── Toggle custom select ─────────────
  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const ids = filteredCustomers.map(c => c.id);
    setSelectedCustomerIds(new Set(ids));
  };

  const deselectAll = () => setSelectedCustomerIds(new Set());

  // ─── Recipients based on tab ──────────
  const recipients = useMemo(() => {
    if (tab === "all") return filteredCustomers;
    if (tab === "product") return productRecipients;
    if (tab === "custom") return profiles.filter(p => p.phone && selectedCustomerIds.has(p.id));
    return [];
  }, [tab, filteredCustomers, productRecipients, selectedCustomerIds, profiles]);

  // ─── Send ─────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || recipients.length === 0 || !user) return;
    setSending(true);
    setProgress({ sent: 0, failed: 0, total: recipients.length });

    const campaignId = crypto.randomUUID();

    const logEntries = recipients.map(r => ({
      campaign_id: campaignId,
      recipient_phone: r.phone!,
      recipient_name: r.full_name || null,
      recipient_user_id: r.id,
      message: message.replace(/\{name\}/gi, r.full_name || "Customer"),
      status: "pending",
      sent_by: user.id,
      mode: tab,
    }));

    const { data: insertedLogs } = await supabase.from("sms_logs").insert(logEntries).select("id, recipient_phone, recipient_name, message");

    if (!insertedLogs) {
      toast({ title: "Failed to create SMS logs", variant: "destructive" });
      setSending(false);
      return;
    }

    let sent = 0, failed = 0;

    for (const log of insertedLogs) {
      try {
        const { data, error } = await supabase.functions.invoke("send-promo-sms", {
          body: { phone: log.recipient_phone, message: log.message, log_id: log.id },
        });
        if (error || data?.error) failed++;
        else sent++;
      } catch {
        failed++;
      }
      setProgress({ sent, failed, total: recipients.length });
    }

    setSending(false);
    toast({ title: `Campaign Complete`, description: `Sent: ${sent}, Failed: ${failed}` });
    // Re-check API status after send
    checkApiStatus();
  };

  // ─── History / Settings ───────────────
  const loadHistory = async () => {
    setShowHistory(true);
    setLogsLoading(true);
    const { data } = await supabase.from("sms_logs").select("*").order("created_at", { ascending: false }).limit(500);
    setSmsLogs(data || []);

    const adminIds = [...new Set((data || []).map((l: any) => l.sent_by).filter(Boolean))];
    if (adminIds.length > 0) {
      const { data: adminP } = await supabase.from("profiles").select("id, full_name").in("id", adminIds);
      const map: Record<string, string> = {};
      (adminP || []).forEach((p: any) => { map[p.id] = p.full_name || "Admin"; });
      setAdminProfiles(map);
    }
    setLogsLoading(false);
  };

  const retrySms = async (log: SmsLog) => {
    toast({ title: "Retrying..." });
    const { data, error } = await supabase.functions.invoke("send-promo-sms", {
      body: { phone: log.recipient_phone, message: log.message, log_id: log.id },
    });
    if (error || data?.error) {
      toast({ title: "Retry failed", variant: "destructive" });
    } else {
      toast({ title: "Sent successfully! ✅" });
      setSmsLogs(prev => prev.map(l => l.id === log.id ? { ...l, status: "sent", error_message: null } : l));
    }
  };

  const campaignGroups = useMemo(() => {
    const groups: Record<string, { logs: SmsLog[]; date: string; sentBy: string; sent: number; failed: number; pending: number }> = {};
    smsLogs.forEach(l => {
      if (!groups[l.campaign_id]) {
        groups[l.campaign_id] = { logs: [], date: l.created_at, sentBy: l.sent_by ? (adminProfiles[l.sent_by] || "Admin") : "System", sent: 0, failed: 0, pending: 0 };
      }
      groups[l.campaign_id].logs.push(l);
      if (l.status === "sent") groups[l.campaign_id].sent++;
      else if (l.status === "failed") groups[l.campaign_id].failed++;
      else groups[l.campaign_id].pending++;
    });
    return Object.entries(groups).sort((a, b) => b[1].date.localeCompare(a[1].date));
  }, [smsLogs, adminProfiles]);

  const toggleExclude = (f: ExcludeFilter) => {
    setExcludeFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  // ─── Customer row component ───────────
  const CustomerRow = ({ p, selectable = false, selected = false, onToggle }: { p: Profile; selectable?: boolean; selected?: boolean; onToggle?: () => void }) => (
    <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${selectable ? "cursor-pointer hover:bg-muted/40" : ""} ${selected ? "bg-primary/5" : ""}`}
      onClick={selectable ? onToggle : undefined}>
      {selectable && (
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-primary border-primary" : "border-border"}`}>
          {selected && <Check size={12} className="text-primary-foreground" />}
        </div>
      )}
      {p.avatar_url ? (
        <img src={optimizeCloudinaryUrl(p.avatar_url, 32)} className="w-8 h-8 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {(p.full_name || "U").charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{p.full_name || "—"}</p>
        <p className="text-xs text-muted-foreground">+{p.phone}</p>
      </div>
      {p.banned && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive">Banned</span>}
    </div>
  );

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl skeleton-shimmer"/>)}</div>;

  // ═══ HISTORY VIEW ═══
  if (showHistory) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(false)} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground"><ArrowLeft size={20} /></button>
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">SMS Campaign History</h2>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : campaignGroups.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No SMS campaigns yet</div>
        ) : (
          <div className="space-y-3">
            {campaignGroups.map(([campaignId, group]) => (
              <CampaignCard key={campaignId} campaignId={campaignId} group={group} onRetry={retrySms} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══ MAIN VIEW ═══
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/crm")} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Bulk SMS Campaign</h2>
            <p className="text-xs text-muted-foreground">Send promotional messages to customers</p>
          </div>
        </div>
        <button onClick={loadHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 text-sm font-medium text-foreground hover:bg-muted transition-colors ml-11 sm:ml-0">
          <Settings size={16} /> History & Logs
        </button>
      </div>

      {/* ─── BulkSMSBD API Status Bar ─── */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-foreground">📱 BulkSMSBD API</span>
          {checkingApi ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <Loader2 size={12} className="animate-spin" /> Checking...
            </span>
          ) : apiStatus ? (
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              apiStatus.ok
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            }`}>
              {apiStatus.ok ? <Wifi size={12} /> : <WifiOff size={12} />}
              {apiStatus.message}
              {apiStatus.latency !== undefined && apiStatus.ok && (
                <span className="text-muted-foreground ml-1">({apiStatus.latency}ms)</span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <WifiOff size={12} /> Not checked
            </span>
          )}
        </div>
        <button
          onClick={checkApiStatus}
          disabled={checkingApi}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
        >
          {checkingApi ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          Recheck
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ─── LEFT: Recipient Selection (3 cols) ─── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tab selector */}
          <div className="flex gap-2">
            {([
              { key: "all" as Tab, label: "All Customers", icon: Users },
              { key: "product" as Tab, label: "By Product Cart", icon: PackageSearch },
              { key: "custom" as Tab, label: "Select Customers", icon: UserCheck },
            ]).map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                    tab === t.key
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card border border-border text-muted-foreground hover:bg-muted/40"
                  }`}>
                  <Icon size={16} /> <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          {(tab === "all" || tab === "custom") && (
            <div className="space-y-3">
              <div className="relative">
                <input type="text" placeholder="Search customers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Filter size={12} /> Exclude:</span>
                {([
                  { key: "inactive_2m" as ExcludeFilter, label: "Inactive 2M+" },
                  { key: "cancelled" as ExcludeFilter, label: "Cancelled/Returned" },
                  { key: "banned" as ExcludeFilter, label: "Banned" },
                ]).map(f => (
                  <button key={f.key} onClick={() => toggleExclude(f.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      excludeFilters.includes(f.key)
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent"
                    }`}>
                    {excludeFilters.includes(f.key) && <Ban size={10} className="inline mr-1" />}{f.label}
                  </button>
                ))}
              </div>

              {tab === "custom" && (
                <div className="flex items-center gap-2">
                  <button onClick={selectAllVisible} className="text-xs text-primary font-medium hover:underline">Select all ({filteredCustomers.length})</button>
                  {selectedCustomerIds.size > 0 && (
                    <button onClick={deselectAll} className="text-xs text-muted-foreground hover:underline">Deselect all</button>
                  )}
                  <span className="ml-auto text-xs font-medium text-foreground">{selectedCustomerIds.size} selected</span>
                </div>
              )}
            </div>
          )}

          {/* Product search */}
          {tab === "product" && (
            <div className="space-y-3">
              <div className="relative">
                <input type="text" placeholder="Search products to find cart owners..." value={productSearch} onChange={e => searchProducts(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              {productResults.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  {productResults.map(p => (
                    <button key={p.id} onClick={() => toggleProduct(p)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        selectedProducts.find(x => x.id === p.id) ? "bg-primary/5 text-primary" : "hover:bg-muted/40 text-foreground"
                      }`}>
                      <span className="text-lg">{p.emoji || "📦"}</span>
                      <span className="flex-1">{p.title}</span>
                      {selectedProducts.find(x => x.id === p.id) && <Check size={16} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map(p => (
                    <span key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {p.emoji} {p.title}
                      <button onClick={() => toggleProduct(p)} className="hover:text-destructive"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customer list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {tab === "all" && `${filteredCustomers.length} customers with phone`}
                {tab === "product" && `${productRecipients.length} customers have these in cart`}
                {tab === "custom" && `${filteredCustomers.length} customers · ${selectedCustomerIds.size} selected`}
              </span>
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
              {(tab === "all" ? filteredCustomers : tab === "product" ? productRecipients : filteredCustomers).map(p => (
                <CustomerRow
                  key={p.id}
                  p={p}
                  selectable={tab === "custom"}
                  selected={selectedCustomerIds.has(p.id)}
                  onToggle={() => toggleCustomer(p.id)}
                />
              ))}
              {(tab === "all" ? filteredCustomers : tab === "product" ? productRecipients : filteredCustomers).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">
                  {tab === "product" ? "Search and select products first" : "No customers found"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Compose + Send (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 sticky top-20">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Megaphone size={18} className="text-primary" /> Compose Message</h3>

            {/* Recipients summary */}
            <div className="p-3 rounded-xl bg-muted/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Recipients</span>
                <span className="text-sm font-bold text-foreground">{recipients.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Mode</span>
                <span className="text-xs font-medium text-primary capitalize">{tab === "all" ? "All Customers" : tab === "product" ? "Product Cart" : "Manual Select"}</span>
              </div>
            </div>

            {/* Template selector dropdown */}
            {templates.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">📋 Use Template</label>
                <select
                  onChange={e => {
                    const t = templates.find(t => t.id === e.target.value);
                    if (t) setMessage(t.message);
                    e.target.value = "";
                  }}
                  defaultValue=""
                  className="w-full rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="" disabled>Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title} — {t.message.slice(0, 50)}...</option>
                  ))}
                </select>
              </div>
            )}

            {/* Message */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Message <span className="text-primary">(use {"{name}"} for personalization)</span>
              </label>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Hi {name}, check out our exclusive deals! 🎉"
                rows={5}
                className="w-full rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">{message.length} chars</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">~{Math.ceil(message.length / 160) || 1} SMS/recipient</span>
                  {message.trim() && (
                    <button
                      onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                      className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    >
                      <BookmarkPlus size={12} /> Save
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Save template inline */}
            <AnimatePresence>
              {showSaveTemplate && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={templateTitle}
                      onChange={e => setTemplateTitle(e.target.value)}
                      placeholder="Template name..."
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={saveTemplate}
                      disabled={savingTemplate || !templateTitle.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                    >
                      {savingTemplate ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saved & Quick templates */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {templates.length > 0 ? "Saved Templates" : "Quick Templates"}
              </p>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center gap-1.5 group">
                    <button
                      onClick={() => setMessage(t.message)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-primary/5 text-xs text-foreground hover:bg-primary/10 transition-colors text-left truncate"
                      title={t.message}
                    >
                      <span className="font-medium text-primary mr-1.5">{t.title}:</span>
                      {t.message.slice(0, 40)}...
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {/* Default quick templates shown when no saved templates */}
                {templates.length === 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Hi {name}, check out our new collection! 🛍️",
                      "Hi {name}, you have items waiting in your cart! ⏰",
                      "Hi {name}, exclusive discount just for you! 🎉",
                    ].map((t, i) => (
                      <button key={i} onClick={() => setMessage(t)}
                        className="px-2.5 py-1.5 rounded-lg bg-muted/40 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors text-left">
                        {t.slice(0, 35)}...
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            {sending && (
              <div className="space-y-2">
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${progress.total ? ((progress.sent + progress.failed) / progress.total * 100) : 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{progress.sent + progress.failed} / {progress.total}</span>
                  <div className="flex gap-3">
                    <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> {progress.sent}</span>
                    {progress.failed > 0 && <span className="text-destructive flex items-center gap-1"><XCircle size={12} /> {progress.failed}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || !message.trim() || recipients.length === 0}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors hover:bg-primary/90"
            >
              {sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send to {recipients.length} Customers</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Campaign Card Component ────────────
const CampaignCard = ({ campaignId, group, onRetry }: {
  campaignId: string;
  group: { logs: SmsLog[]; date: string; sentBy: string; sent: number; failed: number; pending: number };
  onRetry: (log: SmsLog) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const total = group.sent + group.failed + group.pending;
  const msgPreview = group.logs[0]?.message || "";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-start sm:items-center gap-3 p-3 sm:p-4 hover:bg-muted/20 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-2 sm:truncate">{msgPreview.slice(0, 80)}...</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(group.date), "dd MMM yyyy, hh:mm a")} · by {group.sentBy}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 size={12} />{group.sent}</span>
            {group.failed > 0 && <span className="flex items-center gap-0.5 text-destructive"><XCircle size={12} />{group.failed}</span>}
            {group.pending > 0 && <span className="flex items-center gap-0.5 text-amber-600"><Clock size={12} />{group.pending}</span>}
            <span className="text-muted-foreground">/ {total}</span>
          </div>
          <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-border max-h-60 overflow-y-auto divide-y divide-border/50">
              {group.logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                  {log.status === "sent" && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                  {log.status === "failed" && <XCircle size={14} className="text-destructive shrink-0" />}
                  {log.status === "pending" && <Clock size={14} className="text-amber-600 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">{log.recipient_name || "—"}</span>
                    <span className="text-muted-foreground ml-2">+{log.recipient_phone}</span>
                  </div>
                  {log.status === "failed" && (
                    <button onClick={() => onRetry(log)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                      <RefreshCw size={10} /> Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BulkSMS;
