import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, Users, DollarSign } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [prodRes, orderRes, userRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total_amount").not("status", "in", '("auto_saved","pending","cancelled","refunded")'),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const revenue = (orderRes.data || []).reduce((s: number, o: any) => s + Number(o.total_amount), 0);

      setStats({
        products: prodRes.count || 0,
        orders: (orderRes.data || []).length,
        users: userRes.count || 0,
        revenue,
      });

      const { data: recent } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

      const recentList = recent || [];
      
      // Fetch profiles for the orders
      const userIds = [...new Set(recentList.map((o: any) => o.user_id))];
      const profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", userIds);
        (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });
      }

      setRecentOrders(recentList.map((o: any) => ({ ...o, profile: profileMap[o.user_id] || null })));
      setLoading(false);
    };
    fetch();
  }, []);

  const statCards = [
    { label: "Total Products", value: stats.products, icon: Package, color: "text-blue-600 bg-blue-100" },
    { label: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "text-orange-600 bg-orange-100" },
    { label: "Total Users", value: stats.users, icon: Users, color: "text-green-600 bg-green-100" },
    { label: "Total Revenue", value: `৳${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-purple-600 bg-purple-100" },
  ];

  const formatDate = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl skeleton-shimmer"/>)}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-card border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-display font-semibold text-foreground">Recent Orders</h2>
        </div>

        {/* Mobile card view */}
        <div className="sm:hidden divide-y divide-border">
          {recentOrders.map((o: any) => (
            <div key={o.id} className="p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{o.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{o.profile?.full_name || o.profile?.phone || "—"}</span>
                <span className="text-sm font-semibold">৳{Number(o.total_amount).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
            </div>
          ))}
        </div>

        {/* Desktop table view */}
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Order</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o: any) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3">{o.profile?.full_name || o.profile?.phone || "—"}</td>
                  <td className="p-3 font-semibold">৳{Number(o.total_amount).toLocaleString()}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">{o.status}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
