import { motion } from "framer-motion";
import { Globe, ShieldCheck, Heart, Sparkles, Users } from "lucide-react";
import logo from "@/assets/logo-transparent.png";
import { usePageContent } from "@/hooks/usePageContent";

const iconMap: Record<string, any> = { Globe, ShieldCheck, Heart, Sparkles, Users };

const AboutUsSection = () => {
  const { data: page } = usePageContent("about");

  const story = (page?.content?.story || []) as string[];
  const stats = (page?.content?.stats || []) as Array<{ value: string; label: string }>;
  const values = (page?.content?.values || []) as Array<{ iconName: string; title: string; text: string }>;

  if (!page) return null;

  return (
    <section className="relative py-14 md:py-20 overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-20 left-1/4 w-[500px] h-[400px] rounded-full bg-gradient-to-br from-primary/6 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-secondary/8 to-transparent blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/12 to-secondary/12 blur-2xl scale-150" />
            <img src={logo} alt="GoodyHut" className="h-28 relative z-10" />
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-3">
            {page.title || "About GoodyHut"}
          </h2>
          {page.subtitle && (
            <p className="text-muted-foreground font-body max-w-lg mx-auto">{page.subtitle}</p>
          )}
        </div>

        {/* Story + Stats Layout */}
        <div className="grid lg:grid-cols-5 gap-6 mb-8 max-w-5xl mx-auto">
          {/* Story Card */}
          <div className="lg:col-span-3 relative overflow-hidden rounded-3xl bg-card/80 backdrop-blur-md border border-border/60 p-6 md:p-8 shadow-card">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-md">
                  <Heart size={18} className="text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg">Our Story</h3>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                {story.slice(0, 3).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3 content-center">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
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
        </div>

        {/* Values Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
          {values.slice(0, 5).map((v) => {
            const Icon = iconMap[v.iconName] || Globe;
            return (
              <motion.div
                key={v.title}
                whileHover={{ y: -4 }}
                className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 p-4 shadow-card hover:shadow-card-hover transition-all group"
              >
                <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gradient-to-tl from-primary/8 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5 group-hover:bg-primary/15 transition-colors">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <p className="font-display font-semibold text-xs">{v.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{v.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AboutUsSection;
