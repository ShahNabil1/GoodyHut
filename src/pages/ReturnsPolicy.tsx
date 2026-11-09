import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageHeroBg from "@/components/PageHeroBg";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { usePageContent } from "@/hooks/usePageContent";
import { Loader2 } from "lucide-react";

const ReturnsPolicy = () => {
  const { data: page, isLoading } = usePageContent("returns-policy");

  const sections = (page?.content?.sections || []) as Array<{ title: string; content?: string; items?: string[] }>;

  return (
    <div className="min-h-screen bg-background relative">
      <PageHeroBg />
      <Navbar />
      <main className="pt-[7rem] md:pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4 max-w-3xl">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <RotateCcw size={28} className="text-primary-foreground" />
                </motion.div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{page?.title || "Returns & Refund Policy"}</h1>
              </div>
              <div className="space-y-4">
                {sections.map((section, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 p-5 md:p-6 shadow-card"
                  >
                    <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-full" />
                    <div className="relative">
                      <h2 className="text-lg font-display font-semibold text-foreground mb-2">{section.title}</h2>
                      {section.content && <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>}
                      {section.items && section.items.length > 0 && (
                        <ul className="list-disc pl-5 space-y-1.5 mt-2 text-sm text-muted-foreground">
                          {section.items.map((item, j) => <li key={j}>{item}</li>)}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
      <div className="h-16 lg:hidden" />
    </div>
  );
};

export default ReturnsPolicy;
