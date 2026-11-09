import { MapPin, Mail, Phone, Facebook, Instagram } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo-transparent.png";
import bkashLogo from "@/assets/bkash-logo.webp";
import nagadLogo from "@/assets/nagad-logo.png";
import ificLogo from "@/assets/ific-logo.jpg";
import { usePageContent } from "@/hooks/usePageContent";

type FooterLink = {label: string;href: string;};

const footerColumns: {title: string;links: FooterLink[];}[] = [
{
  title: "Customer Services",
  links: [
  { label: "Contact Us", href: "/contact" },
  { label: "Help Center", href: "/help" },
  { label: "Track Order", href: "/track-order" }]
},
{
  title: "Our Services",
  links: [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Shipping Info", href: "/shipping" },
  { label: "Customs Guide", href: "/customs-guide" }]
},
{
  title: "Important Links",
  links: [
  { label: "About Us", href: "/about" },
  { label: "Returns Policy", href: "/returns-policy" }]
}];


const Footer = () => {
  const { data: footerData } = usePageContent("footer-settings");

  const content = footerData?.content as Record<string, string> | undefined;
  const facebookUrl = content?.facebook_url || "#";
  const instagramUrl = content?.instagram_url || "#";
  const whatsappUrl = content?.whatsapp_url || "#";
  const address = content?.address || "Bogura, Bangladesh";
  const supportEmail = content?.support_email || "support@goodyhut.bd";
  const supportPhone = content?.support_phone || "+880 XXXX-XXXXXX";
  const location = useLocation();
  const isCheckoutOrPayment = location.pathname.startsWith("/checkout") || location.pathname.startsWith("/payment");

  return (
    <footer className="relative bg-background text-foreground overflow-hidden">
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-bl from-primary/4 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr from-secondary/4 to-transparent blur-3xl pointer-events-none" />
      {/* Top section - Links */}
      <div className={`border-t border-border ${isCheckoutOrPayment ? "hidden md:block" : ""}`}>
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8">
            {footerColumns.map((col) =>
            <div key={col.title}>
                <h4 className="font-display font-bold text-sm text-foreground mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) =>
                <li key={link.label}>
                      {link.href.startsWith("/") ?
                  <Link to={link.href} className="group relative inline-block text-muted-foreground text-sm font-body transition-all duration-500">
                          <span className="relative z-10 bg-gradient-to-r from-muted-foreground to-muted-foreground bg-clip-text text-transparent transition-all duration-500 group-hover:from-[#f09433] group-hover:via-[#e6683c] group-hover:to-[#bc1888]">
                            {link.label}
                          </span>
                          <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] transition-all duration-500 group-hover:w-full rounded-full" />
                        </Link> :
                  <a href={link.href} className="group relative inline-block text-muted-foreground text-sm font-body transition-all duration-500">
                          <span className="relative z-10 bg-gradient-to-r from-muted-foreground to-muted-foreground bg-clip-text text-transparent transition-all duration-500 group-hover:from-[#f09433] group-hover:via-[#e6683c] group-hover:to-[#bc1888]">
                            {link.label}
                          </span>
                          <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] transition-all duration-500 group-hover:w-full rounded-full" />
                        </a>
                  }
                    </li>
                )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom section - Brand, Support, Payment */}
      <div className={`border-t border-border bg-muted/30 ${isCheckoutOrPayment ? "hidden md:block" : ""}`}>
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {/* Brand + Contact */}
            <div>
              <img src={logo} alt="GoodyHut" className="h-28 mb-4" />
              <div className="space-y-3 mt-4">
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground font-body">
                  <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                  <span>{address}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground font-body">
                  <Mail size={16} className="text-primary shrink-0" />
                  <a href={`mailto:${supportEmail}`} className="hover:text-primary transition-colors">{supportEmail}</a>
                </div>
              </div>
              {/* Social Icons */}
              <div className="flex items-center gap-3 mt-5">
                {[
                  { icon: Facebook, href: facebookUrl, hoverBg: "hover:bg-[#1877F2]/10", hoverText: "hover:text-[#1877F2]", hoverBorder: "hover:border-[#1877F2]/30", hoverShadow: "hover:shadow-[0_0_20px_rgba(24,119,242,0.15)]" },
                  { icon: Instagram, href: instagramUrl, hoverBg: "hover:bg-[#E4405F]/10", hoverText: "hover:text-[#E4405F]", hoverBorder: "hover:border-[#E4405F]/30", hoverShadow: "hover:shadow-[0_0_20px_rgba(228,64,95,0.15)]" },
                ].map(({ icon: Icon, href, hoverBg, hoverText, hoverBorder, hoverShadow }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-xl bg-card/50 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground transition-all duration-300 ${hoverBg} ${hoverText} ${hoverBorder} ${hoverShadow} hover:scale-110`}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                  </a>
                ))}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-card/50 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground transition-all duration-300 hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30 hover:shadow-[0_0_20px_rgba(37,211,102,0.15)] hover:scale-110"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* 24/7 Support */}
            <div>
              <h4 className="font-display font-bold text-sm text-foreground mb-4">24/7 Support</h4>
              <p className="text-sm text-muted-foreground font-body mb-4">
                We're here for you 24/7, around the clock.
              </p>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground font-body">
                <Phone size={16} className="text-primary shrink-0" />
                <a href={`tel:${supportPhone}`} className="group relative inline-block font-semibold transition-all duration-500">
                  <span className="relative z-10 bg-gradient-to-r from-foreground to-foreground bg-clip-text text-transparent transition-all duration-500 group-hover:from-[#f09433] group-hover:via-[#e6683c] group-hover:to-[#bc1888]">{supportPhone}</span>
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] transition-all duration-500 group-hover:w-full rounded-full" />
                </a>
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <h4 className="font-display font-bold text-sm text-foreground mb-4">Payment Methods We Accept</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center justify-center h-12 rounded-lg border border-border bg-background px-3">
                  <img src={bkashLogo} alt="bKash" className="h-7 w-auto object-contain" />
                </div>
                <div className="flex items-center justify-center h-12 rounded-lg border border-border bg-background px-3">
                  <img src={nagadLogo} alt="Nagad" className="h-7 w-auto object-contain" />
                </div>
                <div className="flex items-center justify-center h-12 rounded-lg border border-border bg-background px-3">
                  <img src={ificLogo} alt="IFIC Bank" className="h-7 w-auto object-contain" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground font-body">
            © 2026 GoodyHut. All rights reserved.
          </p>
          <div className="group/credit flex items-center gap-2 text-xs font-body px-4 py-2 rounded-full bg-card/40 backdrop-blur-md border border-border/40 hover:border-primary/20 hover:bg-card/60 hover:shadow-[0_0_24px_rgba(228,64,95,0.08)] transition-all duration-500">
            <span className="text-muted-foreground">Designed & Developed by</span>
            <a
              href="https://www.shahnabil.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative font-bold tracking-wide"
            >
              <span className="relative z-10 bg-gradient-to-r from-foreground/90 to-foreground/70 bg-clip-text text-transparent transition-all duration-500 group-hover:from-[#f09433] group-hover:via-[#e6683c] group-hover:to-[#bc1888]">
                Shahriar Nabil
              </span>
              <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] transition-all duration-500 group-hover:w-full rounded-full" />
            </a>
            <span className="text-sm transition-transform duration-500 group-hover/credit:scale-125" style={{ animation: "pulse 1.5s ease-in-out infinite", color: "#e74c6f" }}>✦</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
            <Link to="/terms-of-service" className="group relative inline-block transition-all duration-500">
              <span className="relative z-10 bg-gradient-to-r from-muted-foreground to-muted-foreground bg-clip-text text-transparent transition-all duration-500 group-hover:from-[#f09433] group-hover:via-[#e6683c] group-hover:to-[#bc1888]">Terms & Conditions</span>
              <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] transition-all duration-500 group-hover:w-full rounded-full" />
            </Link>
            <span>•</span>
            <Link to="/privacy-policy" className="group relative inline-block transition-all duration-500">
              <span className="relative z-10 bg-gradient-to-r from-muted-foreground to-muted-foreground bg-clip-text text-transparent transition-all duration-500 group-hover:from-[#f09433] group-hover:via-[#e6683c] group-hover:to-[#bc1888]">Privacy Policy</span>
              <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] transition-all duration-500 group-hover:w-full rounded-full" />
            </Link>
          </div>
        </div>
      </div>
    </footer>);
};

export default Footer;
