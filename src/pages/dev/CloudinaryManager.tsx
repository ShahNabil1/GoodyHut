import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Folder, Image, Trash2, RefreshCw, ChevronRight, Home, Check, X, 
  ArrowLeft, AlertCircle, CheckSquare, Square
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
}

interface CloudinaryFolder {
  name: string;
  path: string;
}

const CloudinaryManager = () => {
  const { toast } = useToast();
  const [folders, setFolders] = useState<CloudinaryFolder[]>([]);
  const [resources, setResources] = useState<CloudinaryResource[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadFolder(currentPath);
  }, [currentPath]);

  const loadFolder = async (path: string) => {
    setLoading(true);
    setSelected(new Set());

    const { data, error } = await supabase.functions.invoke("dev-cloudinary", {
      body: { action: "browse", folder: path },
    });

    if (error || data?.error) {
      toast({ title: "Failed to load", description: data?.error || error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    setFolders(data?.folders || []);
    setResources(data?.resources || []);
    setLoading(false);
  };

  const toggleSelect = (publicId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === resources.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(resources.map(r => r.public_id)));
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; onConfirm: () => Promise<void> }>({ open: false, onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    setConfirmDialog({
      open: true,
      onConfirm: async () => {
        setDeleting(true);
        const { data, error } = await supabase.functions.invoke("dev-cloudinary", {
          body: { action: "delete", public_ids: Array.from(selected) },
        });
        setDeleting(false);
        if (error || data?.error) {
          toast({ title: "Delete failed", description: data?.error || error?.message, variant: "destructive" });
        } else {
          toast({ title: `${count} image(s) deleted ✅` });
          setSelected(new Set());
          loadFolder(currentPath);
        }
      },
    });
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  const breadcrumbs = currentPath ? currentPath.split("/") : [];

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Image size={22} className="text-emerald-500" /> Cloudinary Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Browse folders, view images & delete</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} />
              {deleting ? "Deleting..." : `Delete ${selected.size}`}
            </button>
          )}
          <button
            onClick={() => loadFolder(currentPath)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-wrap text-sm">
        <button
          onClick={() => navigateTo("")}
          className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors ${!currentPath ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}
        >
          <Home size={14} /> Root
        </button>
        {breadcrumbs.map((crumb, i) => {
          const path = breadcrumbs.slice(0, i + 1).join("/");
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={path} className="flex items-center gap-1.5">
              <ChevronRight size={12} className="text-muted-foreground" />
              <button
                onClick={() => navigateTo(path)}
                className={`px-2 py-1 rounded hover:bg-muted transition-colors ${isLast ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}
              >
                {crumb}
              </button>
            </span>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Folders */}
          {folders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {folders.map((folder) => (
                <button
                  key={folder.path}
                  onClick={() => navigateTo(folder.path)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
                >
                  <Folder size={40} className="text-amber-500 group-hover:text-amber-600" />
                  <span className="text-sm font-medium text-foreground truncate w-full text-center">{folder.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Select All */}
          {resources.length > 0 && (
            <div className="flex items-center gap-3 pt-2">
              <button onClick={selectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {selected.size === resources.length ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} />}
                {selected.size === resources.length ? "Deselect All" : "Select All"} ({resources.length})
              </button>
            </div>
          )}

          {/* Images */}
          {resources.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {resources.map((res) => {
                const isSelected = selected.has(res.public_id);
                return (
                  <div
                    key={res.public_id}
                    className={`relative group rounded-xl border overflow-hidden transition-all cursor-pointer ${
                      isSelected ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="aspect-square" onClick={() => setPreviewImage(res.secure_url)}>
                      <img
                        src={res.secure_url.replace("/upload/", "/upload/c_fill,w_300,h_300,q_auto/")}
                        alt={res.public_id}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {/* Select checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(res.public_id); }}
                      className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                        isSelected ? "bg-emerald-500 text-white" : "bg-foreground/50 text-white opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSelected && <Check size={14} />}
                    </button>
                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate">{res.public_id.split("/").pop()}</p>
                      <p className="text-[10px] text-white/70">{res.width}×{res.height} · {formatBytes(res.bytes)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {folders.length === 0 && resources.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Image size={48} className="mx-auto mb-3 opacity-30" />
              <p>This folder is empty</p>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <X size={20} />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <ConfirmDialog open={confirmDialog.open} onClose={() => setConfirmDialog(d => ({ ...d, open: false }))} onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }} loading={confirmLoading} title="Delete Images?" description="Selected images will be permanently deleted from Cloudinary." confirmLabel="Delete" variant="danger" />
    </div>
  );
};

export default CloudinaryManager;
