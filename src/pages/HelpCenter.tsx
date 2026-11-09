import { HelpCircle, Package, Truck, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageHeroBg from "@/components/PageHeroBg";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { usePageContent } from "@/hooks/usePageContent";
import { Loader2 } from "lucide-react";

const iconMap: Record<string, any> = { Package, Truck, CreditCard, RotateCcw, ShieldCheck, HelpCircle };

const HelpCenter = () => {
  const { data: page, isLoading } = usePageContent("help");

  const sections = (page?.content?.sections || []) as Array<{ iconName: string; title: string; faqs: Array<{ q: string; a: string }> }>;
  const ctaTitle = (page?.content?.ctaTitle || "Still need help?") as string;
  const ctaText = (page?.content?.ctaText || "") as string;

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
                <HelpCircle size={28} className="text-primary-foreground" />
              </motion.div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">{page?.title || "Help Center"}</h1>
              {page?.subtitle && (
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm md:text-base">{page.subtitle}</p>
              )}
            </div>

            <div className="space-y-5">
              {sections.map((section, i) => {
                const Icon = iconMap[section.iconName] || HelpCircle;
                return (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 shadow-card"
                  >
                    <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-bl from-primary/6 to-transparent rounded-full" />
                    <div className="flex items-center gap-3 px-5 pt-5 pb-2 relative">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <h2 className="font-display font-semibold text-base">{section.title}</h2>
                    </div>
                    <Accordion type="single" collapsible className="px-5 pb-3">
                      {section.faqs.map((faq, j) => (
                        <AccordionItem key={j} value={`${section.title}-${j}`} className="border-border/50">
                          <AccordionTrigger className="text-sm font-medium text-left py-3 hover:no-underline">{faq.q}</AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground pb-3">{faq.a}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="relative overflow-hidden mt-8 rounded-2xl bg-gradient-to-br from-primary/8 via-accent/15 to-secondary/8 border border-primary/15 p-6 text-center shadow-card"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/8 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-secondary/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <p className="font-display font-semibold">{ctaTitle}</p>
                <p className="text-sm text-muted-foreground mt-1 mb-3">{ctaText}</p>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  Contact Us
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
      <div className="hidden lg:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default HelpCenter;
