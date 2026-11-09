import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Save, Eye, Loader2, CheckCircle2, ChevronDown, ChevronRight,
  Users, Shield, Search, RefreshCw, Code2, BarChart3
} from "lucide-react";
import EmailAnalytics from "./EmailAnalytics";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  subject: string;
  html_body: string;
  description: string | null;
  variables: string[];
  active: boolean;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  customer: { label: "Customer Emails", icon: Users, color: "text-blue-500" },
  admin: { label: "Admin Notifications", icon: Shield, color: "text-amber-500" },
};

const EmailTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ customer: true, admin: true });
  const [search, setSearch] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("category")
      .order("name");

    if (data) setTemplates(data as EmailTemplate[]);
    if (error) console.error(error);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const selectedTemplate = templates.find((t) => t.slug === selectedSlug);

  useEffect(() => {
    if (selectedTemplate) {
      setEditSubject(selectedTemplate.subject);
      setEditBody(selectedTemplate.html_body);
      setShowPreview(false);
    }
  }, [selectedSlug]);

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({ subject: editSubject, html_body: editBody, updated_at: new Date().toISOString() })
      .eq("id", selectedTemplate.id);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: "Template saved ✅" });
      loadTemplates();
    }
  };

  const getSampleData = (tpl: EmailTemplate): Record<string, string> => {
    const samples: Record<string, string> = {
      customer_name: "রাহাত আহমেদ",
      order_id: "ORD-2024-001",
      order_number: "#2024-001",
      order_date: "১২ মার্চ ২০২৬",
      total_amount: "৳ 2,450",
      status: "Confirmed",
      status_bn: "কনফার্মড",
      tracking_url: "https://goodyhut.bd/track-order/sample",
      payment_url: "https://goodyhut.bd/payment/sample",
      profile_url: "https://goodyhut.bd/profile",
      order_summary: "Premium Leather Bag × 1, Wireless Earbuds × 2",
      product_name: "Premium Leather Bag",
      estimated_weight: "500gm",
      actual_weight: "650gm",
      old_shipping: "৳ 500",
      new_shipping: "৳ 650",
      adjustment_amount: "৳ 150",
      refund_amount: "৳ 100",
      admin_order_url: "https://goodyhut.bd/dev/orders",
      customer_email: "rahat@example.com",
      customer_phone: "01712345678",
      item_count: "3",
      order_type: "Pending Payment",
      site_url: "https://goodyhut.bd",
      review_product: "Premium Leather Bag",
    };
    return samples;
  };

  const getPreviewHtml = (): string => {
    if (!selectedTemplate) return "";
    const data = getSampleData(selectedTemplate);
    let html = editBody;
    for (const [key, value] of Object.entries(data)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    html = html.replace(/\{\{[^}]+\}\}/g, '<span style="background:#fef3c7;padding:2px 4px;border-radius:3px;font-size:12px">⚠️ missing</span>');
    return html;
  };

  const grouped = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  const filteredGrouped = Object.entries(grouped).reduce((acc, [cat, tpls]) => {
    const filtered = search
      ? tpls.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase()))
      : tpls;
    if (filtered.length > 0) acc[cat] = filtered;
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  if (showAnalytics) {
    return <EmailAnalytics onBack={() => setShowAnalytics(false)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Sidebar - Template List */}
      <div className="w-72 shrink-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-2">
            <Mail size={18} className="text-primary" /> Email Templates
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Object.entries(filteredGrouped).map(([cat, tpls]) => {
            const catInfo = CATEGORY_LABELS[cat] || { label: cat, icon: Mail, color: "text-muted-foreground" };
            const CatIcon = catInfo.icon;
            const expanded = expandedCats[cat] !== false;
            return (
              <div key={cat}>
                <button
                  onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !expanded }))}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                >
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <CatIcon size={13} className={catInfo.color} />
                  {catInfo.label} ({tpls.length})
                </button>
                {expanded && tpls.map(t => (
                  <button
                    key={t.slug}
                    onClick={() => setSelectedSlug(t.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedSlug === t.slug
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <div className="truncate">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</div>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
          {Object.keys(filteredGrouped).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No templates found</p>
          )}
        </div>
        <div className="p-2 border-t border-border space-y-1">
          <button
            onClick={() => setShowAnalytics(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <BarChart3 size={14} /> Analytics & Webhooks
          </button>
          <button
            onClick={loadTemplates}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Content - Editor */}
      <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
        {selectedTemplate ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{selectedTemplate.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  slug: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{selectedTemplate.slug}</code>
                  {selectedTemplate.variables?.length > 0 && (
                    <span className="ml-2">
                      Variables: {selectedTemplate.variables.map(v => (
                        <code key={v} className="bg-primary/10 text-primary px-1 py-0.5 rounded text-xs ml-1">{`{{${v}}}`}</code>
                      ))}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showPreview ? "bg-primary/10 text-primary" : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {showPreview ? <Code2 size={14} /> : <Eye size={14} />}
                  {showPreview ? "Editor" : "Preview"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    saved
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  } disabled:opacity-50`}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                  {saved ? "Saved" : "Save"}
                </button>
              </div>
            </div>

            {showPreview ? (
              <div className="flex-1 overflow-auto bg-muted/20 p-4">
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-3 bg-muted/50 border-b text-sm text-muted-foreground">
                    <strong>Subject:</strong>{" "}
                    {(() => {
                      const data = getSampleData(selectedTemplate);
                      let subj = editSubject;
                      for (const [k, v] of Object.entries(data)) {
                        subj = subj.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
                      }
                      return subj;
                    })()}
                  </div>
                  <div
                    className="p-0"
                    dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">HTML Body</label>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full h-[calc(100vh-20rem)] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a template from the left panel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailTemplates;
