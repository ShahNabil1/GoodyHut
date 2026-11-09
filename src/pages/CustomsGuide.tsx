import { ShieldCheck, FileText, AlertTriangle, CheckCircle, HelpCircle, Package } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageHeroBg from "@/components/PageHeroBg";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePageContent } from "@/hooks/usePageContent";
import { Loader2 } from "lucide-react";

const iconMap: Record<string, any> = { ShieldCheck, FileText, AlertTriangle, CheckCircle, HelpCircle, Package };

const CustomsGuide = () => {
  const { data: page, isLoading } = usePageContent("customs-guide");

  const guidelines = (page?.content?.guidelines || []) as Array<{ iconName: string; title: string; text: string }>;
  const faqs = (page?.content?.faqs || []) as Array<{ q: string; a: string }>;

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
                <ShieldCheck size={28} className="text-primary-foreground" />
              </motion.div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">{page?.title || "Customs Guide"}</h1>
              {page?.subtitle && (
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm md:text-base">{page.subtitle}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {guidelines.map((item, i) => {
                const Icon = iconMap[item.iconName] || FileText;
                return (
                  <motion.div
                    key={item.title}
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
                      <h3 className="font-display font-semibold text-sm mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 shadow-card">
              <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-bl from-primary/6 to-transparent rounded-full" />
              <div className="flex items-center gap-2 px-5 pt-5 pb-2 relative">
                <HelpCircle size={18} className="text-primary" />
                <h2 className="font-display font-semibold">Frequently Asked Questions</h2>
              </div>
              <Accordion type="single" collapsible className="px-5 pb-3">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-border/50">
                    <AccordionTrigger className="text-sm font-medium text-left py-3 hover:no-underline">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-3">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </motion.div>
        )}
      </main>
      <div className="hidden lg:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default CustomsGuide;
