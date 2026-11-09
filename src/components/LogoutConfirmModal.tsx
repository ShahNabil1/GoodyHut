import { motion, AnimatePresence } from "framer-motion";
import { LogOut, AlertTriangle } from "lucide-react";

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const LogoutConfirmModal = ({ open, onClose, onConfirm, loading }: LogoutConfirmModalProps) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[6px]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.5)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.4) inset",
              }}
            >
              {/* Icon & Content */}
              <div className="px-6 pt-8 pb-5 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4"
                >
                  <LogOut size={28} className="text-destructive" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="font-display text-lg font-bold text-foreground"
                >
                  Sign Out?
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-muted-foreground mt-2 leading-relaxed"
                >
                  Are you sure you want to sign out? You'll need to sign in again to access your account.
                </motion.p>
              </div>

              {/* Actions */}
              <div className="px-5 pb-6 flex gap-3">
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold text-foreground/70 bg-black/[0.04] hover:bg-black/[0.07] backdrop-blur-sm transition-all duration-200"
                >
                  Cancel
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold text-white bg-destructive hover:bg-destructive/90 shadow-[0_4px_16px_rgba(239,68,68,0.25)] hover:shadow-[0_6px_24px_rgba(239,68,68,0.3)] transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogOut size={15} />
                      Sign Out
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LogoutConfirmModal;
