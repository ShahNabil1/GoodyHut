import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, ShoppingCart, ChevronDown, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import UserMenu from "@/components/UserMenu";
import SearchOverlay from "@/components/SearchOverlay";
import { useCategories } from "@/hooks/useCategories";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import logo from "@/assets/logo-transparent.png";

const Navbar = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { totalItems, isOpen, setIsOpen } = useCart();
  const { data: allCats = [] } = useCategories();
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Mobile scroll-hide logic (Instagram style)
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!isMobile) return;
    const threshold = 10;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 60) {
        setNavHidden(false);
      } else if (currentY - lastScrollY.current > threshold) {
        setNavHidden(true);
      } else if (lastScrollY.current - currentY > threshold) {
        setNavHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  // Derived category hierarchy
  const parents = allCats.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => allCats.filter(c => c.parent_id === parentId);

  // Auto-select first parent when mega menu opens
  const effectiveParent = hoveredParent || (parents.length > 0 ? parents[0].id : null);
  const activeSubs = effectiveParent ? getChildren(effectiveParent) : [];
  const effectiveSub = hoveredSub && activeSubs.some(s => s.id === hoveredSub) ? hoveredSub : (activeSubs.length > 0 ? activeSubs[0].id : null);
  const activeGrandChildren = effectiveSub ? getChildren(effectiveSub) : [];
  const activeSubName = activeSubs.find(s => s.id === effectiveSub)?.name || "";

  const handleMegaOpen = () => {
    setMegaOpen(true);
    setHoveredParent(null);
    setHoveredSub(null);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-card/95 backdrop-blur-none md:bg-card/85 md:backdrop-blur-2xl ${!isHome ? "hidden md:block" : ""}`}
      style={{
        transform: isMobile && navHidden ? "translateY(-105%)" : "translateY(0)",
        transition: isMobile ? "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease" : undefined,
        willChange: "transform",
        boxShadow: isMobile && !navHidden && lastScrollY.current > 20 ? "0 2px 16px hsla(220, 25%, 10%, 0.08)" : undefined,
      }}
    >
      {/* Top row: Logo + desktop nav + icons */}
      <div className="container mx-auto flex items-center justify-between h-14 md:h-20 px-4">
        {/* Logo - centered on mobile */}
        <a href="/" className="flex items-center gap-2 shrink-0 md:shrink-0 absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
          <img src={logo} alt="GoodyHut" className="h-16 md:h-20 w-auto" />
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8 ml-10">
          <button
            onMouseEnter={handleMegaOpen}
            onMouseLeave={() => setMegaOpen(false)}
            className="flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Categories <ChevronDown size={14} className={`transition-transform ${megaOpen ? "rotate-180" : ""}`} />
          </button>
          <Link to="/deals" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Deals</Link>
          <Link to="/track-order" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Track Order</Link>
        </nav>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <button onClick={() => setSearchOpen(true)} className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <div className="w-full h-10 pl-10 pr-4 rounded-full bg-muted/60 border border-border/50 text-sm font-body text-muted-foreground flex items-center cursor-text hover:border-primary/50 transition-all">
              Search products, categories...
            </div>
          </button>
        </div>

        {/* Right icons (desktop only) */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-muted/60 transition-colors relative">
            <ShoppingCart size={20} className="text-foreground/70" />
            {totalItems > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full gradient-brand text-[10px] font-bold text-primary-foreground flex items-center justify-center"
              >
                {totalItems}
              </motion.span>
            )}
          </button>
          <UserMenu />
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-3 pb-3">
        <button onClick={() => setSearchOpen(true)} className="relative flex items-center w-full bg-background rounded-full border border-border shadow-sm overflow-hidden">
          <div className="w-full h-11 pl-4 pr-12 bg-transparent text-sm font-body text-muted-foreground/60 flex items-center">
            Search products...
          </div>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full gradient-brand flex items-center justify-center">
            <Search size={15} className="text-primary-foreground" />
          </span>
        </button>
      </div>

      {/* Mega Menu — MoveOn Style 3-Panel */}
      <AnimatePresence>
        {megaOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => { setMegaOpen(false); setHoveredParent(null); setHoveredSub(null); }}
            className="absolute top-full left-0 right-0 bg-background border-t border-border/40 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]"
          >
            <div className="container mx-auto px-4">
              <div className="flex min-h-[420px] max-h-[520px]">
                {/* Panel 1 — Parent Categories */}
                <div className="w-[220px] border-r border-border/30 py-3 overflow-y-auto shrink-0">
                  {parents.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug}`}
                      onMouseEnter={() => { setHoveredParent(cat.id); setHoveredSub(null); }}
                      onClick={() => setMegaOpen(false)}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all rounded-lg mx-1
                        ${effectiveParent === cat.id
                          ? "bg-primary/8 text-primary font-semibold"
                          : "text-foreground/70 hover:bg-muted/40 hover:text-foreground"
                        }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {getChildren(cat.id).length > 0 && (
                        <ChevronRight size={13} className={`shrink-0 transition-colors ${effectiveParent === cat.id ? "text-primary/60" : "text-muted-foreground/30"}`} />
                      )}
                    </Link>
                  ))}
                </div>

                {/* Panel 2 — Sub-Categories */}
                {activeSubs.length > 0 && (
                  <div className="w-[200px] border-r border-border/30 py-3 overflow-y-auto shrink-0">
                    {activeSubs.map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/category/${sub.slug}`}
                        onMouseEnter={() => setHoveredSub(sub.id)}
                        onClick={() => setMegaOpen(false)}
                        className={`flex items-center justify-between px-4 py-2 text-sm transition-all rounded-lg mx-1
                          ${effectiveSub === sub.id
                            ? "bg-primary/6 text-primary font-semibold"
                            : "text-foreground/60 hover:bg-muted/30 hover:text-foreground"
                          }`}
                      >
                        <span className="truncate">{sub.name}</span>
                        {getChildren(sub.id).length > 0 && (
                          <ChevronRight size={12} className={`shrink-0 ${effectiveSub === sub.id ? "text-primary/50" : "text-muted-foreground/20"}`} />
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Panel 3 — Grandchildren Grid with Images */}
                <div className="flex-1 py-4 px-5 overflow-y-auto">
                  {activeGrandChildren.length > 0 ? (
                    <>
                      <h3 className="text-sm font-display font-bold text-foreground mb-4">{activeSubName}</h3>
                      <div className="grid grid-cols-4 xl:grid-cols-5 gap-3">
                        {activeGrandChildren.map((gc) => (
                          <Link
                            key={gc.id}
                            to={`/category/${gc.slug}`}
                            onClick={() => setMegaOpen(false)}
                            className="group flex flex-col items-center text-center gap-2 p-2 rounded-xl
                              hover:bg-muted/30 transition-colors"
                          >
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted/20 border border-border/30
                              group-hover:border-primary/20 group-hover:shadow-sm transition-all">
                              {gc.image_url ? (
                                <img src={optimizeCloudinaryUrl(gc.image_url, 120)} alt={gc.name}
                                  className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-muted/30" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-foreground/70 group-hover:text-primary transition-colors leading-tight line-clamp-2">
                              {gc.name}
                            </span>
                          </Link>
                        ))}
                      </div>

                      {/* Explore more link */}
                      <Link
                        to={`/category/${activeSubs.find(s => s.id === effectiveSub)?.slug || ""}`}
                        onClick={() => setMegaOpen(false)}
                        className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Explore More {activeSubName}
                        <ChevronRight size={14} />
                      </Link>
                    </>
                  ) : effectiveSub ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-sm text-muted-foreground/50">No sub-categories in {activeSubName}</p>
                      <Link
                        to={`/category/${activeSubs.find(s => s.id === effectiveSub)?.slug || ""}`}
                        onClick={() => setMegaOpen(false)}
                        className="mt-3 text-sm font-semibold text-primary hover:underline"
                      >
                        Browse {activeSubName} →
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground/40">Hover over a category to explore</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};

export default Navbar;
