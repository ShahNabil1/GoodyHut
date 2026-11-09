import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import HeroSection from "@/components/HeroSection";
import CampaignOfferSection from "@/components/CampaignOfferSection";
import DealsSection from "@/components/DealsSection";
import BentoCategories from "@/components/BentoCategories";
import ProductGrid from "@/components/ProductGrid";
import TrustBadges from "@/components/TrustBadges";
import AboutUsSection from "@/components/AboutUsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden">
      {/* Layered gradient background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-background to-secondary/[0.08]" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-bl from-secondary/20 via-accent/12 to-transparent blur-[120px]" />
        <div className="absolute top-[30%] -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-primary/15 via-primary/8 to-transparent blur-[100px]" />
        <div className="absolute top-[60%] right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-l from-accent/12 to-transparent blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[700px] h-[500px] rounded-full bg-gradient-to-t from-primary/10 via-accent/8 to-transparent blur-[120px]" />
      </div>
      <Navbar />
      <main className="pt-[6.5rem] md:pt-20">
        <HeroSection />
        <CampaignOfferSection />
        <DealsSection />
        <BentoCategories />
        <ProductGrid midSection={<TrustBadges />} />
        <AboutUsSection />
      </main>
      <Footer />
      <MobileBottomNav />
      {/* Bottom padding for mobile nav — stable and shared with navbar height */}
      <div className="lg:hidden" style={{ height: "var(--mobile-nav-total-height)" }} />
    </div>
  );
};

export default Index;
