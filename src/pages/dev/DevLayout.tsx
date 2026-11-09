import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useDeveloper } from "@/hooks/useDeveloper";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Package, ShoppingCart, FolderTree,
  Star, Shield, LogOut, Menu, X, HeartHandshake, Megaphone, Zap, Globe,
  Key, Image, Code2, Users, Mail, BarChart3, MessageSquare, Activity
} from "lucide-react";

const navItems = [
  { path: "/dev", label: "Dashboard", icon: LayoutDashboard },
  { path: "/dev/products", label: "Products", icon: Package },
  { path: "/dev/orders", label: "Orders", icon: ShoppingCart },
  { path: "/dev/categories", label: "Categories", icon: FolderTree },
  { path: "/dev/reviews", label: "Reviews", icon: Star },
  { path: "/dev/crm", label: "CRM", icon: HeartHandshake },
  { path: "/dev/campaigns", label: "Campaigns", icon: Megaphone },
  { path: "/dev/deals", label: "Deals", icon: Zap },
  { path: "/dev/website", label: "Website", icon: Globe },
  { path: "/dev/management", label: "Management", icon: Shield },
  { path: "/dev/api-keys", label: "API Management", icon: Key },
  { path: "/dev/email-templates", label: "Email Templates", icon: Mail },
  { path: "/dev/sms-templates", label: "SMS Templates", icon: MessageSquare },
  { path: "/dev/cloudinary", label: "Cloudinary", icon: Image },
  { path: "/dev/tracking", label: "Analytics & Tracking", icon: BarChart3 },
  { path: "/dev/tracking-events", label: "Event Monitor", icon: Activity },
];

const DevLayout = () => {
  const { isDeveloper, loading } = useDeveloper();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !authLoading) {
      if (!user) navigate("/");
      else if (!isDeveloper) navigate("/");
    }
  }, [loading, authLoading, user, isDeveloper, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isDeveloper) return null;

  return (
    <div className="min-h-screen flex bg-muted/30">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link to="/dev" className="font-display text-lg font-bold flex items-center gap-2">
            <Code2 size={20} className="text-emerald-500" />
            <span className="text-emerald-600">Dev Panel</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-600"
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
          <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            <Shield size={18} /> Admin Panel
          </Link>
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
          <h1 className="ml-2 lg:ml-0 font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Code2 size={18} className="text-emerald-500" />
            {navItems.find(n => n.path === location.pathname)?.label || "Developer"}
          </h1>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DevLayout;
