import { Mail, Phone, MapPin, Clock } from "lucide-react";
import whatsappLogo from "@/assets/whatsapp-logo.png";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageHeroBg from "@/components/PageHeroBg";
import { usePageContent } from "@/hooks/usePageContent";
import { Loader2 } from "lucide-react";

const iconMap: Record<string, any> = { Phone, Mail, MapPin, Clock };

const ContactPage = () => {
  const { data: page, isLoading } = usePageContent("contact");

  const methods = (page?.content?.methods || []) as Array<{ iconName: string; title: string; detail: string; sub: string }>;
  const businessHours = (page?.content?.businessHours || "") as string;

  return (
    <div className="min-h-screen bg-background relative">
      <PageHeroBg />
      <Navbar />
      <main className="container mx-auto px-4 pt-2 md:pt-24 pb-28 relative z-10">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
            <div className="text-center mb-10 pt-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <Mail size={28} className="text-primary-foreground" />
              </motion.div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">{page?.title || "Contact Us"}</h1>
              {page?.subtitle && (
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm md:text-base">{page.subtitle}</p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
              {methods.map((method, i) => {
                const Icon = iconMap[method.iconName];
                const isWhatsApp = method.iconName === "whatsapp";
                return (
                  <motion.div
                    key={method.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 p-4 md:p-5 text-center shadow-card hover:shadow-card-hover transition-all group"
                  >
                    <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-bl from-primary/8 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 overflow-hidden group-hover:bg-primary/15 transition-colors">
                        {isWhatsApp ? (
                          <img src={whatsappLogo} alt="WhatsApp" className="w-7 h-7 object-contain" />
                        ) : Icon ? (
                          <Icon size={20} className="text-primary" />
                        ) : null}
                      </div>
                      <p className="font-display font-semibold text-sm">{method.title}</p>
                      <p className="text-xs md:text-sm font-medium mt-1">{method.detail}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{method.sub}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="relative overflow-hidden mt-6 rounded-2xl bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 border border-primary/15 p-5 flex items-start gap-3 shadow-card"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-primary" />
              </div>
              <div className="relative">
                <p className="font-display font-semibold text-sm">Business Hours</p>
                <p className="text-sm text-muted-foreground mt-1">{businessHours}</p>
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

export default ContactPage;
