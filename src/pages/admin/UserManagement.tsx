import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Ban, Trash2, Shield, Eye, X, ShoppingCart, Search } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { isDeveloperEmail } from "@/hooks/useDeveloper";
import ConfirmDialog from "@/components/ConfirmDialog";

const UserManagement = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userCart, setUserCart] = useState<any[]>([]);
  const [adminRoles, setAdminRoles] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; confirmLabel: string; variant: "danger" | "warning" | "info"; onConfirm: () => Promise<void> }>({ open: false, title: "", description: "", confirmLabel: "", variant: "danger", onConfirm: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").eq("role", "admin");
    const adminIds = (roles || []).map((r: any) => r.user_id);
    setAdminRoles(adminIds);
    // Filter out admins AND developer emails (stealth mode)
    setUsers((profiles || []).filter((p: any) => !adminIds.includes(p.id) && !isDeveloperEmail(p.email)));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openUser = async (u: any) => {
    setSelectedUser(u);
    setUserCart([]);
  };

  const toggleBan = async (userId: string, banned: boolean) => {
    const { error } = await supabase.from("profiles").update({ banned: !banned }).eq("id", userId);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else toast({ title: banned ? "User unbanned" : "User banned" });
    fetchUsers();
    setSelectedUser(null);
  };

  const deleteUser = async (userId: string) => {
    setConfirmDialog({
      open: true, title: "Delete User?", description: "This will permanently delete this user's account. This cannot be undone.",
      confirmLabel: "Delete Permanently", variant: "danger",
      onConfirm: async () => {
        const { error } = await supabase.functions.invoke("admin-users", { body: { action: "delete", user_id: userId } });
        if (error) toast({ title: "Delete failed", variant: "destructive" });
        else toast({ title: "User deleted" });
        fetchUsers(); setSelectedUser(null);
      },
    });
  };

  const makeAdmin = async (userId: string) => {
    setConfirmDialog({
      open: true, title: "Grant Admin Role?", description: "This user will get full admin access to the panel.",
      confirmLabel: "Make Admin", variant: "info",
      onConfirm: async () => {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
        else toast({ title: "Admin role granted" });
        fetchUsers(); setSelectedUser(null);
      },
    });
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").includes(q)
    );
  });

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl skeleton-shimmer"/>)}</div>;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-foreground">Customers ({filteredUsers.length})</h2>

      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, phone or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-foreground/40 backdrop-blur-sm overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setSelectedUser(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">User Details</h3>
              <button onClick={() => setSelectedUser(null)}><X size={18} /></button>
            </div>

            <div className="flex items-center gap-4">
              {selectedUser.avatar_url ? (
                <img src={optimizeCloudinaryUrl(selectedUser.avatar_url, 80)} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-xl font-bold">
                  {(selectedUser.full_name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{selectedUser.full_name || "—"}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email || "—"}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.phone ? `+${selectedUser.phone}` : "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">City:</span> {selectedUser.city || "—"}</div>
              <div><span className="text-muted-foreground">Postal Code:</span> {selectedUser.postal_code || "—"}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {selectedUser.address || "—"}</div>
              <div><span className="text-muted-foreground">Banned:</span> {selectedUser.banned ? "Yes 🚫" : "No ✓"}</div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-border">
              <button onClick={() => toggleBan(selectedUser.id, selectedUser.banned)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium ${selectedUser.banned ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                <Ban size={14} /> {selectedUser.banned ? "Unban" : "Ban"}
              </button>
              <button onClick={() => makeAdmin(selectedUser.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
                <Shield size={14} /> Make Admin
              </button>
              <button onClick={() => deleteUser(selectedUser.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u: any) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? (
                        <img src={optimizeCloudinaryUrl(u.avatar_url, 32)} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{(u.full_name || "U").charAt(0)}</div>
                      )}
                      <span className="font-medium">{u.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.phone ? `+${u.phone}` : "—"}</td>
                  <td className="p-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="p-3">
                    {u.banned ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Banned</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => openUser(u)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">{searchQuery ? "No results found" : "No customers yet"}</p>}
      </div>
      <ConfirmDialog open={confirmDialog.open} onClose={() => setConfirmDialog(d => ({ ...d, open: false }))} onConfirm={async () => { setConfirmLoading(true); await confirmDialog.onConfirm(); setConfirmLoading(false); setConfirmDialog(d => ({ ...d, open: false })); }} loading={confirmLoading} title={confirmDialog.title} description={confirmDialog.description} confirmLabel={confirmDialog.confirmLabel} variant={confirmDialog.variant} />
    </div>
  );
};

export default UserManagement;
