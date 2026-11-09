import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ShieldBan, Trash2, Plus, Search, Globe, Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

const BlockedIPs = () => {
  const queryClient = useQueryClient();
  const [newIp, setNewIp] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string; ip: string }>({ open: false, id: "", ip: "" });

  const { data: blockedIps = [], isLoading } = useQuery({
    queryKey: ["blocked-ips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_ips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      const trimmed = newIp.trim();
      if (!trimmed) throw new Error("IP address required");
      const { error } = await supabase.from("blocked_ips").insert({ ip_address: trimmed, reason: reason.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-ips"] });
      setNewIp("");
      setReason("");
      toast({ title: "IP blocked successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_ips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-ips"] });
      toast({ title: "IP unblocked" });
    },
  });

  const filtered = blockedIps.filter((ip) => ip.ip_address.includes(search) || ip.reason?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Block New IP */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus size={18} /> Block New IP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input placeholder="IP Address (e.g. 103.12.45.67)" value={newIp} onChange={(e) => setNewIp(e.target.value)} />
            <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button
              onClick={() => blockMutation.mutate()}
              disabled={blockMutation.isPending || !newIp.trim()}
              className="w-full gradient-brand text-primary-foreground hover:opacity-90"
            >
              {blockMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldBan size={16} />}
              Block
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blocked IPs List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Globe size={18} /> Blocked IPs
              <Badge variant="secondary" className="ml-1">{blockedIps.length}</Badge>
            </CardTitle>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search IP or reason..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldBan size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-sm">No blocked IPs found</p>
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="space-y-2 md:hidden">
                {filtered.map((ip) => (
                  <div key={ip.id} className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-mono text-sm font-semibold text-foreground">{ip.ip_address}</p>
                        {ip.reason && (
                          <p className="text-xs text-muted-foreground leading-snug">{ip.reason}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(ip.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8"
                        onClick={() => setConfirmDialog({ open: true, id: ip.id, ip: ip.ip_address })}
                        disabled={unblockMutation.isPending}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Blocked At</TableHead>
                      <TableHead className="w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell className="font-mono text-sm">{ip.ip_address}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{ip.reason || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(ip.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDialog({ open: true, id: ip.id, ip: ip.ip_address })}
                            disabled={unblockMutation.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        title="Unblock IP Address"
        description={`Are you sure you want to unblock ${confirmDialog.ip}? This IP will be able to place orders again.`}
        confirmLabel="Unblock"
        variant="warning"
        onConfirm={() => unblockMutation.mutate(confirmDialog.id)}
      />
    </div>
  );
};

export default BlockedIPs;
