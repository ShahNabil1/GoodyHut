import { Heart, Globe, Users, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageHeroBg from "@/components/PageHeroBg";
import logo from "@/assets/logo-transparent.png";
import { usePageContent } from "@/hooks/usePageContent";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const iconMap: Record<string, any> = { Globe, ShieldCheck, Heart, Sparkles, Users };

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

const AboutUs = () => {
  const { data: page, isLoading } = usePageContent("about");

  const story = (page?.content?.story || []) as string[];
  const stats = (page?.content?.stats || []) as Array<{ value: string; label: string }>;
  const values = (page?.content?.values || []) as Array<{ iconName: string; title: string; text: string }>;
  const ctaTitle = (page?.content?.ctaTitle || "") as string;
  const ctaText = (page?.content?.ctaText || "") as string;

  return (
    <div className="min-h-screen bg-background relative">
      <PageHeroBg />
      <Navbar />
      <main className="container mx-auto px-4 pt-2 md:pt-24 pb-28 relative z-10">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Hero Header */}
            <motion.div {...fadeUp()} className="text-center mb-12 pt-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative inline-block mb-5"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 blur-2xl scale-150" />
                <img src={logo} alt="GoodyHut" className="h-24 relative z-10" />
              </motion.div>
              <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
                {page?.title || "About GoodyHut"}
              </h1>
              {page?.subtitle && (
                <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm md:text-base leading-relaxed">{page.subtitle}</p>
              )}
            </motion.div>

            {/* Our Story - Premium Card */}
            <motion.div
              {...fadeUp(0.1)}
              className="relative overflow-hidden rounded-3xl bg-card/80 backdrop-blur-md border border-border/60 p-6 md:p-8 mb-6 shadow-card"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                    <Heart size={18} className="text-primary-foreground" />
                  </div>
                  <h2 className="font-display font-bold text-lg">Our Story</h2>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed pl-[52px]">
                  {story.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 200 }}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 p-5 text-center shadow-card group cursor-default"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <p className="relative font-display text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="relative text-xs text-muted-foreground mt-1.5 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Values Section */}
            <motion.div
              {...fadeUp(0.3)}
              className="relative overflow-hidden rounded-3xl bg-card/80 backdrop-blur-md border border-border/60 mb-6 shadow-card"
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-bl from-accent/10 to-transparent rounded-full" />
              <div className="px-6 pt-6 pb-3 relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                    <Sparkles size={18} className="text-primary-foreground" />
                  </div>
                  <h2 className="font-display font-bold text-lg">What We Stand For</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 pt-2 relative">
                {values.map((v, i) => {
                  const Icon = iconMap[v.iconName] || Globe;
                  return (
                    <motion.div
                      key={v.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      whileHover={{ x: 4 }}
                      className="flex gap-3 p-3 rounded-xl hover:bg-primary/5 transition-colors duration-300 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-sm">{v.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{v.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              {...fadeUp(0.5)}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/8 via-accent/15 to-secondary/8 border border-primary/15 p-7 text-center shadow-card"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-primary/8 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-secondary/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-3">
                  <Users size={22} className="text-primary-foreground" />
                </div>
                <p className="font-display font-bold text-lg">{ctaTitle}</p>
                <p className="text-sm text-muted-foreground mt-1.5 mb-4 max-w-md mx-auto">{ctaText}</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-primary-foreground text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  Browse Products
                  <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </main>
      <div className="hidden lg:block"><Footer /></div>
      <MobileBottomNav />
    </div>
  );
};

export default AboutUs;
