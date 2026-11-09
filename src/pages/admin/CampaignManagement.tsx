import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Package, X, CalendarIcon, Search, Check, Percent } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  title: string;
  banner_image_url: string | null;
  start_date: string;
  end_date: string;
  active: boolean;
}

interface Product {
  id: string;
  title: string;
  price: number;
  slug: string;
}

interface CampaignProductRow {
  id: string;
  product_id: string;
  discount_percentage: number;
  product_title?: string;
  product_price?: number;
}

const CampaignManagement = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignProductCounts, setCampaignProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState("23:59");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [discountDescription, setDiscountDescription] = useState("");
  const [rulesText, setRulesText] = useState("");

  // Products dialog
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignProducts, setCampaignProducts] = useState<CampaignProductRow[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
    setLoading(false);

    // Fetch product counts for all campaigns
    if (data?.length) {
      const { data: cpData } = await supabase
        .from("campaign_products")
        .select("campaign_id");
      const counts: Record<string, number> = {};
      cpData?.forEach(cp => {
        counts[cp.campaign_id] = (counts[cp.campaign_id] || 0) + 1;
      });
      setCampaignProductCounts(counts);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setStartDate(undefined);
    setStartTime("00:00");
    setEndDate(undefined);
    setEndTime("23:59");
    setBannerFile(null);
    setBannerPreview(null);
    setMinOrderAmount("");
    setMaxDiscount("");
    setDiscountDescription("");
    setRulesText("");
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setTitle(c.title);
    const toBDDate = (utc: string) => {
      const d = new Date(utc);
      const bdMs = d.getTime() + (6 * 60 + d.getTimezoneOffset()) * 60000;
      return new Date(bdMs);
    };
    const bdStart = toBDDate(c.start_date);
    const bdEnd = toBDDate(c.end_date);
    setStartDate(bdStart);
    setStartTime(`${String(bdStart.getHours()).padStart(2, '0')}:${String(bdStart.getMinutes()).padStart(2, '0')}`);
    setEndDate(bdEnd);
    setEndTime(`${String(bdEnd.getHours()).padStart(2, '0')}:${String(bdEnd.getMinutes()).padStart(2, '0')}`);
    setBannerPreview(c.banner_image_url);
    setBannerFile(null);
    setMinOrderAmount((c as any).min_order_amount?.toString() || "");
    setMaxDiscount((c as any).max_discount?.toString() || "");
    setDiscountDescription((c as any).discount_description || "");
    setRulesText((c as any).rules_text || "");
    setDialogOpen(true);
  };

  const combineDateTimeToUTC = (date: Date, time: string) => {
    const [h, m] = time.split(":").map(Number);
    const bd = new Date(date);
    bd.setHours(h, m, 0, 0);
    const browserOffset = bd.getTimezoneOffset();
    const bdOffset = -360;
    const diff = bdOffset - browserOffset;
    bd.setMinutes(bd.getMinutes() - diff);
    return bd.toISOString();
  };

  const handleSave = async () => {
    if (!title || !startDate || !endDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);

    let bannerUrl = editing?.banner_image_url || null;
    if (bannerFile) {
      bannerUrl = await uploadToCloudinary(bannerFile, "goodyhut/campaigns");
    }

    const payload = {
      title,
      start_date: combineDateTimeToUTC(startDate, startTime),
      end_date: combineDateTimeToUTC(endDate, endTime),
      banner_image_url: bannerUrl,
      min_order_amount: minOrderAmount ? Number(minOrderAmount) : 0,
      max_discount: maxDiscount ? Number(maxDiscount) : null,
      discount_description: discountDescription || null,
      rules_text: rulesText || null,
    };

    if (editing) {
      await supabase.from("campaigns").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("campaigns").insert(payload);
    }

    setSaving(false);
    setDialogOpen(false);
    fetchCampaigns();
    toast({ title: editing ? "Campaign updated" : "Campaign created" });
  };

  const toggleActive = async (c: Campaign) => {
    await supabase.from("campaigns").update({ active: !c.active }).eq("id", c.id);
    fetchCampaigns();
  };

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; onConfirm: () => Promise<void> }>({ open: false, onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const deleteCampaign = async (id: string) => {
    setConfirmDialog({
      open: true,
      onConfirm: async () => {
        await supabase.from("campaigns").delete().eq("id", id);
        fetchCampaigns();
        toast({ title: "Campaign deleted" });
      },
    });
  };

  // --- Products management ---
  const openProductsDialog = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setProductsDialogOpen(true);
    setProductSearch("");

    const { data: cpData } = await supabase
      .from("campaign_products")
      .select("id, product_id, discount_percentage")
      .eq("campaign_id", campaign.id);

    if (cpData?.length) {
      const pIds = cpData.map(cp => cp.product_id);
      const { data: prods } = await supabase.from("products").select("id, title, price").in("id", pIds);
      setCampaignProducts(cpData.map(cp => {
        const p = prods?.find(pr => pr.id === cp.product_id);
        return { ...cp, product_title: p?.title, product_price: p?.price };
      }));
    } else {
      setCampaignProducts([]);
    }

    const { data: allProds } = await supabase.from("products").select("id, title, price, slug").order("title").limit(500);
    setAllProducts(allProds || []);
  };

  const addProductToCampaign = async (productId: string) => {
    if (!selectedCampaign) return;
    if (campaignProducts.some(cp => cp.product_id === productId)) {
      toast({ title: "Already added", variant: "destructive" });
      return;
    }
    setAddingProduct(true);
    const { data } = await supabase
      .from("campaign_products")
      .insert({ campaign_id: selectedCampaign.id, product_id: productId, discount_percentage: 0 })
      .select("id, product_id, discount_percentage")
      .single();

    if (data) {
      const prod = allProducts.find(p => p.id === productId);
      setCampaignProducts(prev => [...prev, { ...data, product_title: prod?.title, product_price: prod?.price }]);
      setCampaignProductCounts(prev => ({ ...prev, [selectedCampaign.id]: (prev[selectedCampaign.id] || 0) + 1 }));
    }
    setAddingProduct(false);
  };

  const updateDiscount = async (cpId: string, discount: number) => {
    await supabase.from("campaign_products").update({ discount_percentage: discount }).eq("id", cpId);
    setCampaignProducts(prev => prev.map(cp => cp.id === cpId ? { ...cp, discount_percentage: discount } : cp));
  };

  const removeProduct = async (cpId: string) => {
    await supabase.from("campaign_products").delete().eq("id", cpId);
    setCampaignProducts(prev => prev.filter(cp => cp.id !== cpId));
    if (selectedCampaign) {
      setCampaignProductCounts(prev => ({ ...prev, [selectedCampaign.id]: Math.max(0, (prev[selectedCampaign.id] || 1) - 1) }));
    }
  };

  const filteredProducts = allProducts.filter(p =>
    p.title.toLowerCase().includes(productSearch.toLowerCase()) &&
    !campaignProducts.some(cp => cp.product_id === p.id)
  );

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Campaign Management</h2>
        <Button onClick={openCreate}><Plus size={16} /> New Campaign</Button>
      </div>

      {/* Campaign Cards */}
      <div className="space-y-3">
        {campaigns.map(c => {
          const productCount = campaignProductCounts[c.id] || 0;
          return (
            <Card key={c.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                  {/* Campaign Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{c.title}</h3>
                      <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.start_date), "dd MMM yyyy, hh:mm a")} → {format(new Date(c.end_date), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openProductsDialog(c)}
                    >
                      <Package size={14} />
                      Products
                      {productCount > 0 && (
                        <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 text-xs">
                          {productCount}
                        </Badge>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Edit size={15} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCampaign(c.id)}>
                      <Trash2 size={15} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!campaigns.length && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No campaigns yet. Create your first campaign!
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Ramadan Offer" />
            </div>
            <div className="space-y-3">
              <div>
                <Label>Start Date (BD)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Time</Label>
                  <div className="flex gap-1">
                    <Select value={startTime.split(":")[0]} onValueChange={h => setStartTime(`${h}:${startTime.split(":")[1]}`)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="flex items-center">:</span>
                    <Select value={startTime.split(":")[1]} onValueChange={m => setStartTime(`${startTime.split(":")[0]}:${m}`)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>End Time</Label>
                  <div className="flex gap-1">
                    <Select value={endTime.split(":")[0]} onValueChange={h => setEndTime(`${h}:${endTime.split(":")[1]}`)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="flex items-center">:</span>
                    <Select value={endTime.split(":")[1]} onValueChange={m => setEndTime(`${endTime.split(":")[0]}:${m}`)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div>
                <Label>End Date (BD)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">All times are in Bangladesh Standard Time (UTC+6)</p>
            <div>
              <Label>Offer Description (shown on banner)</Label>
              <Input value={discountDescription} onChange={e => setDiscountDescription(e.target.value)} placeholder="e.g. Ramadan Offer! Buy ৳1000+ & Get 5% Discount" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Order Amount (৳)</Label>
                <Input type="number" value={minOrderAmount} onChange={e => setMinOrderAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Max Discount (৳)</Label>
                <Input type="number" value={maxDiscount} onChange={e => setMaxDiscount(e.target.value)} placeholder="Unlimited" />
              </div>
            </div>
            <div>
              <Label>Additional Rules (optional)</Label>
              <textarea
                value={rulesText}
                onChange={e => setRulesText(e.target.value)}
                placeholder="Add any additional rules here..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              />
            </div>
            <div>
              <Label>Banner Image</Label>
              <Input type="file" accept="image/*" onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); }
              }} />
              {bannerPreview && <img src={bannerPreview} alt="preview" className="mt-2 h-32 rounded-lg object-cover" />}
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Products Dialog - Redesigned */}
      <Dialog open={productsDialogOpen} onOpenChange={setProductsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package size={18} />
              Products — {selectedCampaign?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Search & Add Section */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products to add..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Search Results Dropdown */}
            {productSearch && filteredProducts.length > 0 && (
              <div className="border border-border rounded-lg bg-card shadow-sm max-h-44 overflow-y-auto -mt-2">
                {filteredProducts.slice(0, 15).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { addProductToCampaign(p.id); setProductSearch(""); }}
                    disabled={addingProduct}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent/50 transition-colors text-left border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Plus size={14} className="text-primary shrink-0" />
                      <span className="text-sm truncate">{p.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">৳{p.price}</span>
                  </button>
                ))}
              </div>
            )}

            {productSearch && filteredProducts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2 -mt-2">No matching products found</p>
            )}

            {/* Added Products List */}
            <div className="flex-1 overflow-y-auto space-y-1.5">
              <div className="flex items-center justify-between sticky top-0 bg-background pb-2">
                <Label className="text-sm font-medium">
                  Campaign Products
                  <Badge variant="outline" className="ml-2">{campaignProducts.length}</Badge>
                </Label>
              </div>

              {campaignProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Package size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No products added yet</p>
                  <p className="text-xs mt-1">Search above to add products to this campaign</p>
                </div>
              ) : (
                campaignProducts.map(cp => (
                  <div key={cp.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-card hover:bg-accent/20 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cp.product_title}</p>
                      <p className="text-xs text-muted-foreground">৳{cp.product_price}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 bg-muted/60 rounded-md px-1.5">
                        <Percent size={12} className="text-muted-foreground" />
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={cp.discount_percentage}
                          onChange={e => updateDiscount(cp.id, Number(e.target.value))}
                          className="w-14 h-7 text-xs border-0 bg-transparent p-1 text-center"
                          placeholder="0"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-50 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeProduct(cp.id)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirmDialog.open} onClose={() => setConfirmDialog(d => ({ ...d, open: false }))} onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }} loading={confirmLoading} title="Delete Campaign?" description="This campaign and all its product links will be removed." confirmLabel="Delete" variant="danger" />
    </div>
  );
};

export default CampaignManagement;
