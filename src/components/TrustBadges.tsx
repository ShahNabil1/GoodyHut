import { ShieldCheck, Wallet, Truck, RotateCcw, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const badges = [
{ icon: ShieldCheck, title: "Verified from China", desc: "Every supplier is vetted so you receive only authentic, quality products.", href: "" },
{ icon: Wallet, title: "Secure Payments", desc: "Pay safely via bKash, Nagad or bank transfer — fully encrypted.", href: "" },
{ icon: Truck, title: "Fast Delivery", desc: "Orders ship quickly and reach your doorstep in the shortest time.", href: "" },
{ icon: RotateCcw, title: "Easy Returns", desc: "Not satisfied? Get a hassle-free return and refund, guaranteed.", href: "/returns-policy" },
{ icon: Eye, title: "Full Transparency", desc: "Clear pricing, honest quality info and upfront shipping costs.", href: "" }];


const TrustBadges = () =>
<section className="hidden md:block relative py-8 md:py-10 bg-primary/[0.04] overflow-hidden">
    <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-gradient-to-bl from-secondary/8 to-transparent blur-3xl pointer-events-none" />
    <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr from-primary/8 to-transparent blur-3xl pointer-events-none" />
    <div className="container mx-auto px-4 relative">
      <h2 className="text-2xl font-display font-bold text-foreground mb-4 text-center italic md:text-2xl">
        Why GoodyHut? 
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-6">
        {badges.map((b) => {
        const inner =
        <motion.div
          whileHover={{ y: -6, scale: 1.04 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex flex-col items-center text-center gap-3 group cursor-pointer">
          
              <div className="relative w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <b.icon size={28} className="text-primary-foreground drop-shadow-sm" />
                <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <h3 className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-300">
                {b.title}
              </h3>
              <p className="text-xs text-muted-foreground font-body leading-relaxed max-w-[180px]">
                {b.desc}
              </p>
            </motion.div>;

        return (
          <div key={b.title}>
              {b.href ?
            <Link to={b.href}>{inner}</Link> :
            inner
            }
          </div>);
      })}
      </div>
    </div>
  </section>;


export default TrustBadges;
