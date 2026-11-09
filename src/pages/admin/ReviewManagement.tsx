import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Star, ShieldCheck } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

const ReviewManagement = () => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; onConfirm: () => Promise<void> }>({ open: false, onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fetchReviews = async () => {
    let query = supabase
      .from("reviews")
      .select("*, profiles:user_id(full_name, avatar_url), products:product_id(title, emoji)")
      .order("created_at", { ascending: false });

    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setReviews(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else toast({ title: status === "approved" ? "Approved" : "Rejected" });
    fetchReviews();
  };

  const deleteReview = async (id: string) => {
    setConfirmDialog({
      open: true,
      onConfirm: async () => {
        await supabase.from("reviews").delete().eq("id", id);
        toast({ title: "Review deleted" });
        fetchReviews();
      },
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeZone: "Asia/Dhaka" });

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl skeleton-shimmer"/>)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl font-bold text-foreground">Reviews ({reviews.length})</h2>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/60">
          {(["pending", "approved", "rejected", "all"] as const).map(f => (
            <button key={f} onClick={() => { setFilter(f); setLoading(true); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {f === "all" ? "All" : f === "pending" ? "Pending" : f === "approved" ? "Approved" : "Rejected"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((r: any) => (
          <div key={r.id} className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{r.profiles?.full_name || "Unknown"}</span>
                  {r.verified_purchase && (
                    <span className="flex items-center gap-1 text-xs text-green-600"><ShieldCheck size={12} /> Verified</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{r.status}</span>
                </div>
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"} />
                  ))}
                </div>
                {r.products && <p className="text-xs text-muted-foreground mb-1">{r.products.emoji} {r.products.title} {r.is_site_review && "• Site Review"}</p>}
                <p className="text-sm text-foreground">{r.comment}</p>
                {r.images && r.images.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">{r.images.map((img: string, i: number) => (
                    <img key={i} src={img} onClick={() => setLightboxImg(img)} className="w-16 h-16 rounded-lg object-cover border border-border hover:ring-2 hover:ring-primary/30 transition-all cursor-zoom-in" />
                  ))}</div>
                )}
                <p className="text-xs text-muted-foreground mt-2">{formatDate(r.created_at)}</p>
              </div>
              <div className="flex gap-1">
                {r.status !== "approved" && (
                  <button onClick={() => updateStatus(r.id, "approved")} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200">
                    <Check size={14} />
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button onClick={() => updateStatus(r.id, "rejected")} className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">
                    <X size={14} />
                  </button>
                )}
                <button onClick={() => deleteReview(r.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">No reviews yet</p>}
      </div>

      {lightboxImg && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setLightboxImg(null)}>
          <div className="relative bg-card rounded-2xl shadow-2xl p-3 max-w-lg max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxImg(null)} className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors">
              <X size={16} />
            </button>
            <img src={lightboxImg} alt="Review image" className="max-w-full max-h-[75vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
      <ConfirmDialog open={confirmDialog.open} onClose={() => setConfirmDialog(d => ({ ...d, open: false }))} onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }} loading={confirmLoading} title="Delete Review?" description="This review will be permanently removed." confirmLabel="Delete" variant="danger" />
    </div>
  );
};

export default ReviewManagement;
