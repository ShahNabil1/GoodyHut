import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Search, Flame, Zap, Tag, Clock } from "lucide-react";
import { format } from "date-fns";

interface Deal {
  id: string;
  product_id: string;
  deal_type: string;
  discount_percentage: number;
  label: string;
  start_date: string;
  end_date: string;
  active: boolean;
  product_title?: string;
  product_price?: number;
}

interface Product {
  id: string;
  title: string;
  price: number;
  slug: string;
}

const dealTypeLabels: Record<string, { label: string; icon: any }> = {
  flash_sale: { label: "Flash Sale", icon: Zap },
  deal_of_the_day: { label: "Deal of the Day", icon: Flame },
  clearance: { label: "Clearance", icon: Tag },
  special: { label: "Special Offer", icon: Clock },
};

const toBDTime = (date: Date, time: string) => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  // Convert BD time (UTC+6) to UTC
  return new Date(d.getTime() - 6 * 60 * 60 * 1000).toISOString();
};

const formatBD = (iso: string) => {
  const d = new Date(iso);
  d.setHours(d.getHours() + 6);
  return format(d, "dd MMM yyyy, hh:mm a");
};

const DealManagement = () => {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dealType, setDealType] = useState("flash_sale");
  const [discountPct, setDiscountPct] = useState("");
  const [label, setLabel] = useState("Hot Deal 🔥");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [active, setActive] = useState(true);

  const fetchDeals = async () => {
    const { data } = await supabase
      .from("product_deals")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data?.length) { setDeals([]); setLoading(false); return; }

    const productIds = data.map(d => d.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, title, price")
      .in("id", productIds);

    setDeals(data.map(d => {
      const p = products?.find(pr => pr.id === d.product_id);
      return { ...d, product_title: p?.title, product_price: p?.price };
    }) as Deal[]);
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, []);

  // Product search
  useEffect(() => {
    if (productSearch.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, slug")
        .ilike("title", `%${productSearch}%`)
        .limit(10);
      setSearchResults((data || []) as Product[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const resetForm = () => {
    setSelectedProduct(null);
    setProductSearch("");
    setSearchResults([]);
    setDealType("flash_sale");
    setDiscountPct("");
    setLabel("Hot Deal 🔥");
    setStartDate("");
    setEndDate("");
    setActive(true);
    setEditing(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setSelectedProduct({ id: deal.product_id, title: deal.product_title || "", price: deal.product_price || 0, slug: "" });
    setDealType(deal.deal_type);
    setDiscountPct(String(deal.discount_percentage));
    setLabel(deal.label || "");
    // Convert to local datetime-local format (BD time)
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      d.setHours(d.getHours() + 6);
      return d.toISOString().slice(0, 16);
    };
    setStartDate(toLocal(deal.start_date));
    setEndDate(toLocal(deal.end_date));
    setActive(deal.active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedProduct) { toast({ title: "Select a product", variant: "destructive" }); return; }
    if (!discountPct || Number(discountPct) <= 0) { toast({ title: "Enter discount %", variant: "destructive" }); return; }
    if (!startDate || !endDate) { toast({ title: "Set start & end dates", variant: "destructive" }); return; }

    setSaving(true);

    // Convert BD local time to UTC
    const startUTC = new Date(new Date(startDate).getTime() - 6 * 60 * 60 * 1000).toISOString();
    const endUTC = new Date(new Date(endDate).getTime() - 6 * 60 * 60 * 1000).toISOString();

    const payload = {
      product_id: selectedProduct.id,
      deal_type: dealType,
      discount_percentage: Number(discountPct),
      label: label.trim() || "Hot Deal 🔥",
      start_date: startUTC,
      end_date: endUTC,
      active,
    };

    if (editing) {
      const { error } = await supabase.from("product_deals").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); }
      else toast({ title: "Deal updated" });
    } else {
      const { error } = await supabase.from("product_deals").insert(payload);
      if (error) { toast({ title: "Creation failed", description: error.message, variant: "destructive" }); }
      else toast({ title: "Deal created" });
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchDeals();
  };

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; onConfirm: () => Promise<void> }>({ open: false, onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const deleteDeal = async (id: string) => {
    setConfirmDialog({
      open: true,
      onConfirm: async () => {
        await supabase.from("product_deals").delete().eq("id", id);
        toast({ title: "Deal deleted" });
        fetchDeals();
      },
    });
  };

  const toggleActive = async (deal: Deal) => {
    await supabase.from("product_deals").update({ active: !deal.active }).eq("id", deal.id);
    fetchDeals();
  };

  const isActive = (deal: Deal) => deal.active && new Date(deal.end_date) > new Date() && new Date(deal.start_date) <= new Date();

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl skeleton-shimmer" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Product Deals</h2>
          <p className="text-sm text-muted-foreground">Create flash sales, daily deals & promotions for individual products</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} /> New Deal
        </Button>
      </div>

      {deals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No deals yet. Create your first deal!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {deals.map(deal => {
            const TypeIcon = dealTypeLabels[deal.deal_type]?.icon || Tag;
            const active = isActive(deal);
            return (
              <Card key={deal.id} className={`${!deal.active ? "opacity-60" : ""}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                      <TypeIcon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{deal.product_title || "Unknown"}</p>
                        <Badge variant={active ? "destructive" : "secondary"} className="text-[10px]">
                          {active ? "Live" : deal.active ? "Scheduled" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{deal.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{deal.discount_percentage}% off</span>
                        <span>৳{deal.product_price?.toLocaleString()}</span>
                        <span>→ ৳{Math.round((deal.product_price || 0) * (1 - deal.discount_percentage / 100)).toLocaleString()}</span>
                        <span className="hidden sm:inline">Ends: {formatBD(deal.end_date)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 sm:hidden">Ends: {formatBD(deal.end_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/50 md:mt-0 md:pt-0 md:border-0">
                    <Switch checked={deal.active} onCheckedChange={() => toggleActive(deal)} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(deal)}><Edit size={16} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteDeal(deal.id)} className="text-destructive"><Trash2 size={16} /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Deal Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Deal" : "Create New Deal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Product Search */}
            <div>
              <Label>Product</Label>
              {selectedProduct ? (
                <div className="flex items-center gap-2 mt-1 p-2 rounded-lg border border-input bg-muted/30">
                  <span className="flex-1 text-sm font-medium truncate">{selectedProduct.title}</span>
                  <span className="text-xs text-muted-foreground">৳{selectedProduct.price.toLocaleString()}</span>
                  {!editing && (
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedProduct(null); setProductSearch(""); }}>
                      Change
                    </Button>
                  )}
                </div>
              ) : (
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="pl-9"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map(p => (
                        <button key={p.id} onClick={() => { setSelectedProduct(p); setProductSearch(""); setSearchResults([]); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted/60 text-sm flex justify-between">
                          <span className="truncate">{p.title}</span>
                          <span className="text-muted-foreground">৳{p.price.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deal Type */}
            <div>
              <Label>Deal Type</Label>
              <Select value={dealType} onValueChange={setDealType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(dealTypeLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discount */}
            <div>
              <Label>Discount Percentage</Label>
              <Input type="number" value={discountPct} onChange={e => setDiscountPct(e.target.value)}
                placeholder="e.g. 25" className="mt-1" min={1} max={99} />
            </div>

            {/* Badge Label */}
            <div>
              <Label>Badge Label</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)}
                placeholder="Hot Deal 🔥" className="mt-1" />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start (BD Time)</Label>
                <Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>End (BD Time)</Label>
                <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Active</Label>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editing ? "Update Deal" : "Create Deal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirmDialog.open} onClose={() => setConfirmDialog(d => ({ ...d, open: false }))} onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }} loading={confirmLoading} title="Delete Deal?" description="This deal will be permanently removed." confirmLabel="Delete" variant="danger" />
    </div>
  );
};

export default DealManagement;
