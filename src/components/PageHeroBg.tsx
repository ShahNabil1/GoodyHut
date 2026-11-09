import { motion } from "framer-motion";

/**
 * Decorative floating blobs for page backgrounds.
 * Adds depth & premium feel without affecting content.
 */
const PageHeroBg = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      {/* Top-right warm blob */}
      <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-secondary/8 to-accent/12 blur-3xl" />
      {/* Bottom-left teal blob */}
      <div className="absolute -bottom-32 -left-32 w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-primary/8 to-primary/4 blur-3xl" />
      {/* Center subtle glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-gradient-to-b from-accent/5 to-transparent blur-3xl" />
    </motion.div>
  </div>
);

export default PageHeroBg;
