import { useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useDeveloper } from "@/hooks/useDeveloper";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Package, ShoppingCart, FolderTree,
  Star, Users, Shield, LogOut, Menu, X, HeartHandshake, Megaphone, Zap, Globe, ShieldBan
} from "lucide-react";
import { useState } from "react";

export const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard" },
  { path: "/admin/products", label: "Products", icon: Package, perm: "products" },
  { path: "/admin/orders", label: "Order Management", icon: ShoppingCart, perm: "orders" },
  { path: "/admin/categories", label: "Categories", icon: FolderTree, perm: "categories" },
  { path: "/admin/reviews", label: "Reviews", icon: Star, perm: "reviews" },
  { path: "/admin/crm", label: "CRM", icon: HeartHandshake, perm: "users" },
  { path: "/admin/campaigns", label: "Campaigns", icon: Megaphone, perm: "products" },
  { path: "/admin/deals", label: "Deals", icon: Zap, perm: "products" },
  { path: "/admin/website", label: "Website", icon: Globe, perm: "products" },
  { path: "/admin/blocked-ips", label: "Blocked IPs", icon: ShieldBan, perm: "management" },
  { path: "/admin/management", label: "Management", icon: Shield, perm: "management" },
];

const AdminLayout = () => {
  const { isAdmin, hasPermission, loading } = useAdmin();
  const { isDeveloper } = useDeveloper();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const canAccess = isAdmin || isDeveloper;

  useEffect(() => {
    if (!loading && !authLoading) {
      if (!user) navigate("/");
      else if (!canAccess) navigate("/");
    }
  }, [loading, authLoading, user, canAccess, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!canAccess) return null;

  return (
    <div className="min-h-screen flex bg-muted/30">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link to="/admin" className="font-display text-lg font-bold text-primary">Admin Panel</Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.filter(item => isDeveloper || hasPermission(item.perm)).map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            ← Back to Site
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-14 bg-card/80 backdrop-blur-lg border-b border-border flex items-center px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted/60">
            <Menu size={20} />
          </button>
          <h1 className="ml-2 lg:ml-0 font-display text-lg font-semibold text-foreground">
            {navItems.find(n => n.path === location.pathname)?.label || "Admin"}
          </h1>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
