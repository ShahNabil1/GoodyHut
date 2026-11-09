import { Package, Search, CreditCard, Truck, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageHeroBg from "@/components/PageHeroBg";
import { usePageContent } from "@/hooks/usePageContent";
import { Loader2 } from "lucide-react";

const iconMap: Record<string, any> = { Search, Package, CreditCard, Truck, CheckCircle };

const HowItWorks = () => {
  const { data: page, isLoading } = usePageContent("how-it-works");

  const steps = (page?.content?.steps || []) as Array<{ iconName: string; title: string; description: string }>;

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
                <Package size={28} className="text-primary-foreground" />
              </motion.div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">{page?.title || "How It Works"}</h1>
              {page?.subtitle && (
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm md:text-base">{page.subtitle}</p>
              )}
            </div>

            <div className="space-y-4">
              {steps.map((step, i) => {
                const Icon = iconMap[step.iconName] || Package;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ x: 4 }}
                    className="relative overflow-hidden flex gap-4 md:gap-5 rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 p-5 md:p-6 shadow-card hover:shadow-card-hover transition-all group"
                  >
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-bl from-primary/6 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex flex-col items-center shrink-0 relative">
                      <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center text-primary-foreground font-display font-bold text-sm shadow-md">
                        {i + 1}
                      </div>
                      {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-primary/30 to-border mt-2" />}
                    </div>
                    <div className="relative">
                      <h3 className="font-display font-semibold text-base mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
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

export default HowItWorks;
