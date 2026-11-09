import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const MobileBottomNav = () => {
  const { totalItems, setIsOpen, isOpen } = useCart();
  const { user, setAuthModalOpen } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const getActiveIndex = () => {
    if (location.pathname === "/") return 0;
    if (location.pathname.startsWith("/category")) return 1;
    if (location.pathname === "/profile") return 3;
    return -1;
  };

  const active = getActiveIndex();

  const navItems = [
    { icon: Home, label: "Home", action: () => { if (isOpen) setIsOpen(false); nav("/"); } },
    { icon: LayoutGrid, label: "Categories", action: () => { if (isOpen) setIsOpen(false); nav("/category/all"); } },
    { icon: ShoppingCart, label: "Cart", badge: totalItems || undefined, action: () => setIsOpen(true) },
    { icon: User, label: "Profile", action: () => { if (isOpen) setIsOpen(false); user ? nav("/profile") : setAuthModalOpen(true); } },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/40"
      style={{
        height: "var(--mobile-nav-total-height)",
        paddingBottom: "var(--app-safe-bottom)",
        backgroundColor: "hsl(var(--background))",
        transform: "translate3d(0, 0, 0)",
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = i === 2 ? isOpen : active === i;
          return (
            <motion.button
              key={item.label}
              onClick={() => { item.action(); }}
              whileTap={{ scale: 0.9 }}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavActive"
                  className="absolute -top-0.5 w-8 h-0.5 rounded-full gradient-brand"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <Icon
                  size={22}
                  className={`transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full gradient-brand text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
