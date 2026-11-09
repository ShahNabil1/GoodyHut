import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit3, X, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { isDeveloperEmail } from "@/hooks/useDeveloper";
import { navItems } from "./AdminLayout";

// Auto-derive unique permissions from sidebar nav items
const ALL_PERMISSIONS = (() => {
  const seen = new Set<string>();
  const perms: { key: string; label: string }[] = [];
  for (const item of navItems) {
    if (!seen.has(item.perm)) {
      seen.add(item.perm);
      perms.push({ key: item.perm, label: item.label });
    }
  }
  return perms;
})();

const AdminManagement = () => {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const fetchAdmins = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (!roles || roles.length === 0) { setAdmins([]); setLoading(false); return; }

    const adminIds = roles.map((r: any) => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", adminIds);
    const { data: perms } = await supabase.from("admin_permissions").select("*").in("user_id", adminIds);

    const adminsWithPerms = (profiles || [])
      .filter((p: any) => !isDeveloperEmail(p.email))
      .map((p: any) => ({
        ...p,
        permissions: perms?.find((pr: any) => pr.user_id === p.id)?.permissions || [],
      }));

    setAdmins(adminsWithPerms);
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const openEdit = (admin: any) => {
    setEditingUser(admin);
    setSelectedPerms(admin.permissions || []);
  };

  const savePermissions = async () => {
    if (!editingUser) return;

    const { data: existing } = await supabase
      .from("admin_permissions")
      .select("id")
      .eq("user_id", editingUser.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("admin_permissions").update({ permissions: selectedPerms }).eq("user_id", editingUser.id);
    } else {
      await supabase.from("admin_permissions").insert({ user_id: editingUser.id, permissions: selectedPerms });
    }

    toast({ title: "Permissions updated" });
    setEditingUser(null);
    fetchAdmins();
  };

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; onConfirm: () => Promise<void> }>({ open: false, onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const removeAdmin = async (userId: string) => {
    setConfirmDialog({
      open: true,
      onConfirm: async () => {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        await supabase.from("admin_permissions").delete().eq("user_id", userId);
        toast({ title: "Admin role removed" });
        fetchAdmins();
      },
    });
  };

  const togglePerm = (key: string) => {
    setSelectedPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl skeleton-shimmer"/>)}</div>;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-foreground">Admin Management ({admins.length})</h2>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setEditingUser(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Set Permissions</h3>
              <button onClick={() => setEditingUser(null)}><X size={18} /></button>
            </div>
            <p className="text-sm text-muted-foreground">{editingUser.full_name || editingUser.email || "Admin"}</p>
            <p className="text-xs text-muted-foreground">Leave empty for full access</p>
            <div className="space-y-2">
              {ALL_PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer">
                  <input type="checkbox" checked={selectedPerms.includes(p.key)} onChange={() => togglePerm(p.key)} className="rounded" />
                  <span className="text-sm">{p.label}</span>
                </label>
              ))}
            </div>
            <button onClick={savePermissions} className="w-full py-2.5 rounded-lg gradient-brand text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      )}

      {/* Mobile card view */}
      <div className="space-y-3 sm:hidden">
        {admins.map((a: any) => (
          <div key={a.id} className="rounded-xl bg-card border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{a.full_name || "—"}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"><Edit3 size={14} /></button>
                <button onClick={() => removeAdmin(a.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{a.email || (a.phone ? `+${a.phone}` : "—")}</p>
            {a.permissions.length === 0 ? (
              <span className="text-xs text-green-600 font-medium">Full Access</span>
            ) : (
              <span className="text-xs text-muted-foreground">{a.permissions.length} permissions</span>
            )}
          </div>
        ))}
        {admins.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">No admins yet</p>}
      </div>

      {/* Desktop table view */}
      <div className="rounded-xl bg-card border border-border overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Admin</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Email / Phone</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Permissions</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a: any) => (
              <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20">
                <td className="p-3 font-medium">{a.full_name || "—"}</td>
                <td className="p-3 text-muted-foreground">{a.email || (a.phone ? `+${a.phone}` : "—")}</td>
                <td className="p-3">
                  {a.permissions.length === 0 ? (
                    <span className="text-xs text-green-600 font-medium">Full Access</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{a.permissions.length} permissions</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"><Edit3 size={14} /></button>
                  <button onClick={() => removeAdmin(a.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive ml-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {admins.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">No admins yet</p>}
      </div>
      <ConfirmDialog open={confirmDialog.open} onClose={() => setConfirmDialog(d => ({ ...d, open: false }))} onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }} loading={confirmLoading} title="Remove Admin?" description="This user will lose all admin permissions." confirmLabel="Remove" variant="warning" />
    </div>
  );
};

export default AdminManagement;
