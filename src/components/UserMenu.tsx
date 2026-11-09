import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Package, Settings, ChevronDown, Shield, Code2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useDeveloper } from "@/hooks/useDeveloper";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

const UserMenu = () => {
  const { user, loading, signOut, setAuthModalOpen } = useAuth();
  const { isAdmin } = useAdmin();
  const { isDeveloper } = useDeveloper();
  const [open, setOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={() => setAuthModalOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Sign in
      </button>
    );
  }

  const avatar = user.user_metadata?.avatar_url;
  const phoneNumber = user.phone ? "+" + user.phone.replace("+", "") : null;
  const name = user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : phoneNumber) || "User";
  const subtitle = user.email || phoneNumber;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.06 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl border backdrop-blur-xl transition-all duration-400 ${
          open
            ? "bg-white/70 border-primary/25 shadow-[0_8px_32px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.6)_inset,0_0_20px_rgba(59,130,246,0.06)]"
            : "bg-white/30 border-white/20 hover:bg-white/50 hover:border-border/60 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]"
        }`}
      >
        {avatar ? (
          <div className={`relative rounded-full transition-all duration-400 ${open ? "shadow-[0_0_16px_rgba(59,130,246,0.2)]" : ""}`}>
            <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white/80" />
            <div className={`absolute inset-0 rounded-full ring-2 transition-all duration-400 ${open ? "ring-primary/30" : "ring-transparent"}`} />
          </div>
        ) : (
          <div className={`w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold shadow-md transition-all duration-400 ${open ? "shadow-[0_4px_20px_rgba(59,130,246,0.25)]" : ""}`}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <ChevronDown size={13} className="hidden md:block text-muted-foreground/70" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="absolute right-0 top-full mt-3 w-60 z-50 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.5)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.4) inset, 0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* User Info */}
              <div className="p-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <div className="flex items-center gap-3">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/80 shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-1.5">
                {[
                  { label: "My Orders", icon: Package, onClick: () => { navigate("/profile?tab=orders"); setOpen(false); } },
                  { label: "My Profile", icon: Settings, onClick: () => { navigate("/profile"); setOpen(false); } },
                  ...((isAdmin || isDeveloper) ? [{ label: "Admin Panel", icon: Shield, onClick: () => { navigate("/admin"); setOpen(false); }, accent: true }] : []),
                  ...(isDeveloper ? [{ label: "Developer Panel", icon: Code2, onClick: () => { navigate("/dev"); setOpen(false); }, accent: true }] : []),
                ].map((item, i) => (
                  <motion.button
                    key={item.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, type: "spring", stiffness: 400, damping: 25 }}
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ x: 3 }}
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 ${
                      (item as any).accent
                        ? "text-primary font-medium hover:bg-primary/8"
                        : "text-foreground/75 hover:text-foreground hover:bg-black/[0.04]"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      (item as any).accent ? "bg-primary/10" : "bg-muted/60"
                    }`}>
                      <item.icon size={14} strokeWidth={1.8} />
                    </div>
                    {item.label}
                  </motion.button>
                ))}
              </div>

              {/* Sign out */}
              <div className="p-1.5 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ x: 3 }}
                  onClick={() => { setOpen(false); setShowLogout(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/[0.06] rounded-xl transition-all duration-200"
                >
                  <div className="w-7 h-7 rounded-lg bg-destructive/8 flex items-center justify-center">
                    <LogOut size={14} strokeWidth={1.8} />
                  </div>
                  Sign out
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LogoutConfirmModal
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={async () => {
          setLoggingOut(true);
          await signOut();
          setLoggingOut(false);
          setShowLogout(false);
        }}
        loading={loggingOut}
      />
    </div>
  );
};

export default UserMenu;
