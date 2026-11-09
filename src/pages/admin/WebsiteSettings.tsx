import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary, optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { toast } from "sonner";
import { ImagePlus, Trash2, Loader2, Info, Monitor, Smartphone, Tablet, FileText, Image } from "lucide-react";
import PageContentEditor from "./PageContentEditor";
import FooterSettingsEditor from "./FooterSettingsEditor";
import ConfirmDialog from "@/components/ConfirmDialog";

interface HeroSlide {
  id: string;
  image_url: string;
  sort_order: number;
  active: boolean;
}

const MAX_SLIDES = 3;

const WebsiteSettings = () => {
  const [activeTab, setActiveTab] = useState<"hero" | "pages" | "footer">("hero");
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const fetchSlides = async () => {
    const { data } = await supabase
      .from("hero_slides")
      .select("*")
      .order("sort_order", { ascending: true });
    setSlides(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSlides(); }, []);

  const handleUploadClick = (slideId: string | null) => {
    setUploadTarget(slideId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only image files are allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File size cannot exceed 5MB"); return; }

    const targetId = uploadTarget;
    setUploading(targetId || "new");

    try {
      const imageUrl = await uploadToCloudinary(file, "goodyhut/hero-slides");
      if (targetId) {
        await supabase.from("hero_slides").update({ image_url: imageUrl }).eq("id", targetId);
        toast.success("Slide updated");
      } else {
        const nextOrder = slides.length;
        await supabase.from("hero_slides").insert({ image_url: imageUrl, sort_order: nextOrder });
        toast.success("New slide added");
      }
      await fetchSlides();
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(null);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; onConfirm: () => Promise<void> }>({ open: false, onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      open: true,
      onConfirm: async () => {
        await supabase.from("hero_slides").delete().eq("id", id);
        toast.success("Slide deleted");
        await fetchSlides();
      },
    });
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("hero_slides").update({ active: !active }).eq("id", id);
    await fetchSlides();
    toast.success(active ? "Slide deactivated" : "Slide activated");
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const reordered = [...slides];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updates = reordered.map((slide, i) =>
      supabase.from("hero_slides").update({ sort_order: i }).eq("id", slide.id)
    );
    await Promise.all(updates);
    await fetchSlides();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 bg-muted/40 rounded-xl p-1 w-fit flex-wrap">
        <button
          onClick={() => setActiveTab("hero")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "hero" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Image size={16} /> Hero Slider
        </button>
        <button
          onClick={() => setActiveTab("pages")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "pages" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={16} /> Page Contents
        </button>
        <button
          onClick={() => setActiveTab("footer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "footer" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={16} /> Footer Settings
        </button>
      </div>

      {activeTab === "pages" ? (
        <PageContentEditor />
      ) : activeTab === "footer" ? (
        <FooterSettingsEditor />
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-display font-bold text-foreground">Hero Slider</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage homepage hero slider images. Maximum {MAX_SLIDES} images.</p>
          </div>

          <div className="mx-5 mt-5 p-4 rounded-xl bg-primary/5 border border-primary/15">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">📐 Recommended Image Size</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-start gap-2 bg-card rounded-lg p-3 border border-border/50">
                    <Monitor size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Desktop</p>
                      <p className="text-xs text-muted-foreground">1920 × 800 px</p>
                      <p className="text-[10px] text-muted-foreground">Aspect: 2.4:1</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-card rounded-lg p-3 border border-border/50">
                    <Tablet size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Tablet</p>
                      <p className="text-xs text-muted-foreground">1024 × 427 px</p>
                      <p className="text-[10px] text-muted-foreground">Aspect: 2.4:1</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-card rounded-lg p-3 border border-border/50">
                    <Smartphone size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Mobile</p>
                      <p className="text-xs text-muted-foreground">750 × 417 px</p>
                      <p className="text-[10px] text-muted-foreground">Aspect: 1.8:1</p>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>✅ <strong>Best Size:</strong> 1920 × 800 px (auto-crops on all devices)</p>
                  <p>✅ <strong>Format:</strong> JPG or WebP (to keep file size small)</p>
                  <p>✅ <strong>Max File Size:</strong> 5MB</p>
                  <p>⚠️ Keep text/logo in the center of the image — sides may be cropped on mobile</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                  slide.active ? "border-border bg-background" : "border-border/50 bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex flex-col gap-1">
                  {index > 0 && (
                    <button onClick={() => handleReorder(index, index - 1)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Move up">↑</button>
                  )}
                  {index < slides.length - 1 && (
                    <button onClick={() => handleReorder(index, index + 1)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Move down">↓</button>
                  )}
                </div>

                <div
                  className="w-40 sm:w-56 aspect-[2.4/1] rounded-lg overflow-hidden bg-muted/40 border border-border/30 flex-shrink-0 cursor-pointer group relative"
                  onClick={() => handleUploadClick(slide.id)}
                >
                  {slide.image_url ? (
                    <>
                      <img src={optimizeCloudinaryUrl(slide.image_url, 400)} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
                        <ImagePlus size={20} className="text-background opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                      {uploading === slide.id ? <Loader2 size={20} className="animate-spin" /> : <><ImagePlus size={20} /><span className="text-[10px]">Upload Image</span></>}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Slide {index + 1}</p>
                  <p className="text-xs text-muted-foreground truncate">{slide.image_url ? "Image set" : "No image"}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(slide.id, slide.active)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      slide.active ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {slide.active ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => handleDelete(slide.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {slides.length < MAX_SLIDES && (
              <button
                onClick={() => handleUploadClick(null)}
                disabled={uploading === "new"}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm font-medium text-muted-foreground hover:text-primary"
              >
                {uploading === "new" ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                Add New Slide ({slides.length}/{MAX_SLIDES})
              </button>
            )}
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <ConfirmDialog open={confirmDialog.open} onClose={() => setConfirmDialog(d => ({ ...d, open: false }))} onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }} loading={confirmLoading} title="Delete Slide?" description="This hero slide will be permanently removed." confirmLabel="Delete" variant="danger" />
    </div>
  );
};

export default WebsiteSettings;
