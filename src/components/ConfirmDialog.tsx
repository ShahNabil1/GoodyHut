import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Ban, Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "info";
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    buttonClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-[0_4px_20px_rgba(239,68,68,0.25)] hover:shadow-[0_8px_30px_rgba(239,68,68,0.35)]",
  },
  warning: {
    icon: Ban,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-600",
    buttonClass: "bg-yellow-600 hover:bg-yellow-700 text-white shadow-[0_4px_20px_rgba(202,138,4,0.25)] hover:shadow-[0_8px_30px_rgba(202,138,4,0.35)]",
  },
  info: {
    icon: Shield,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    buttonClass: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_20px_hsla(197,55%,42%,0.25)] hover:shadow-[0_8px_30px_hsla(197,55%,42%,0.35)]",
  },
};

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  loading = false,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "danger",
}: ConfirmDialogProps) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.4) inset",
              }}
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 transition-all"
              >
                <X size={16} />
              </button>

              <div className="p-6 text-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                  className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center mx-auto mb-4`}
                >
                  <Icon size={24} className={config.iconColor} strokeWidth={1.8} />
                </motion.div>

                {/* Title */}
                <motion.h3
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="font-display text-lg font-bold text-foreground mb-1.5"
                >
                  {title}
                </motion.h3>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-muted-foreground font-body leading-relaxed"
                >
                  {description}
                </motion.p>
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="px-6 pb-6 flex gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:text-foreground transition-all duration-300"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 ${config.buttonClass}`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : confirmLabel}
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
