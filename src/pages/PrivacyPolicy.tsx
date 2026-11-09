import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHeroBg from "@/components/PageHeroBg";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { usePageContent } from "@/hooks/usePageContent";
import { Loader2 } from "lucide-react";

const PrivacyPolicy = () => {
  const { data: page, isLoading } = usePageContent("privacy");

  const lastUpdated = (page?.content?.lastUpdated || "") as string;
  const sections = (page?.content?.sections || []) as Array<{
    title: string;
    content?: string;
    items?: string[];
    extraText?: string;
    subsections?: Array<{ title: string; items: string[] }>;
  }>;

  return (
    <div className="min-h-screen bg-background relative">
      <PageHeroBg />
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-3xl relative z-10">
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
                <Shield size={28} className="text-primary-foreground" />
              </motion.div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{page?.title || "Privacy Policy"}</h1>
              {lastUpdated && <p className="text-muted-foreground text-sm mt-2">Last updated: {lastUpdated}</p>}
            </div>
            <div className="space-y-4">
              {sections.map((section, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 p-5 md:p-6 shadow-card"
                >
                  <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-full" />
                  <div className="relative">
                    <h2 className="font-display text-lg font-semibold text-foreground mb-2">{section.title}</h2>
                    {section.content && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>}
                    {section.subsections?.map((sub, si) => (
                      <div key={si} className="mt-3">
                        <h3 className="font-display text-base font-medium text-foreground mb-1.5">{sub.title}</h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                          {sub.items.map((item, j) => <li key={j}>{item}</li>)}
                        </ul>
                      </div>
                    ))}
                    {section.items && section.items.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1.5 mt-2 text-sm text-muted-foreground">
                        {section.items.map((item, j) => <li key={j}>{item}</li>)}
                      </ul>
                    )}
                    {section.extraText && <p className="mt-2 text-sm text-muted-foreground">{section.extraText}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
