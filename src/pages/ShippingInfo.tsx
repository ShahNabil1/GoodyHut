import { Truck, MapPin, Clock, Package, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageHeroBg from "@/components/PageHeroBg";
import { usePageContent } from "@/hooks/usePageContent";
import { Loader2 } from "lucide-react";

const iconMap: Record<string, any> = { Truck, MapPin, Clock, Package, AlertCircle, CheckCircle };

const ShippingInfo = () => {
  const { data: page, isLoading } = usePageContent("shipping");

  const zones = (page?.content?.zones || []) as Array<{ zone: string; time: string; cost: string }>;
  const policies = (page?.content?.policies || []) as Array<{ iconName: string; title: string; text: string }>;

  return (
    <div className="min-h-screen bg-background relative">
      <PageHeroBg />
      <Navbar />
      <main className="container mx-auto px-4 pt-2 md:pt-24 pb-28 relative z-10">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <div className="text-center mb-10 pt-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <Truck size={28} className="text-primary-foreground" />
              </motion.div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">{page?.title || "Shipping Information"}</h1>
              {page?.subtitle && (
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm md:text-base">{page.subtitle}</p>
              )}
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 mb-6 shadow-card">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-bl from-primary/6 to-transparent rounded-full" />
              <div className="px-5 py-4 border-b border-border/60 relative">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  <h2 className="font-display font-semibold">Domestic Delivery Zones</h2>
                </div>
              </div>
              <div className="divide-y divide-border/50 relative">
                {zones.map((zone, i) => (
                  <motion.div
                    key={zone.zone}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-primary/[0.03] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{zone.zone}</p>
                      <p className="text-xs text-muted-foreground">{zone.time}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{zone.cost}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((policy, i) => {
                const Icon = iconMap[policy.iconName] || Package;
                return (
                  <motion.div
                    key={policy.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -3 }}
                    className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 p-5 shadow-card hover:shadow-card-hover transition-all group"
                  >
                    <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-gradient-to-tl from-primary/8 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <h3 className="font-display font-semibold text-sm mb-1">{policy.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{policy.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>
      <div className="hidden lg:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default ShippingInfo;
