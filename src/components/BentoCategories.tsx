import { useNavigate, Link } from "react-router-dom";
import { useTopCategories } from "@/hooks/useCategories";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { ArrowRight, Crown } from "lucide-react";

const BentoCategories = () => {
  const navigate = useNavigate();
  const { data: categories, isLoading: loading } = useTopCategories();

  if (loading) {
    return (
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 space-y-3">
            <div className="h-8 w-48 mx-auto rounded-xl skeleton-shimmer" />
            <div className="h-4 w-72 mx-auto rounded-lg skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl skeleton-shimmer aspect-[3/4]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="relative py-10 md:py-20 overflow-hidden hidden md:block">
      <div className="absolute top-10 left-1/4 w-[500px] h-[400px] rounded-full bg-gradient-to-br from-primary/6 to-secondary/4 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-gradient-to-tl from-secondary/6 to-accent/4 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/15 mb-4">
            <Crown size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Top Categories</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-3">
            Shop by Category
          </h2>
          <p className="text-muted-foreground font-body max-w-lg mx-auto text-sm md:text-base">
            Browse thousands of wholesale products from verified Chinese suppliers
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/category/${cat.slug}`)}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden
                bg-muted/30 border border-border/40
                shadow-[var(--shadow-card)]
                hover:shadow-[var(--shadow-card-hover)]
                hover:border-primary/25
                hover:-translate-y-2
                transition-all duration-500"
              >
                {cat.image_url ? (
                  <img
                    src={optimizeCloudinaryUrl(cat.image_url, 500)}
                    alt={cat.name}
                    loading="eager"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover
                      transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted/40" />
                )}

                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/35 to-transparent z-[1]" />

                <div className="absolute top-3 right-3 z-10
                  w-8 h-8 rounded-full bg-white/15 backdrop-blur-md border border-white/20
                  flex items-center justify-center
                  opacity-0 group-hover:opacity-100
                  translate-y-2 group-hover:translate-y-0
                  transition-all duration-300"
                >
                  <ArrowRight size={14} className="text-white" />
                </div>

                <div className="absolute bottom-0 inset-x-0 p-3 md:p-4 z-10">
                  <h3 className="font-display font-bold text-white text-sm md:text-base drop-shadow-lg leading-tight">
                    {cat.name}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/category/all"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
              bg-primary/8 border border-primary/15
              hover:bg-primary/12 hover:border-primary/25
              active:scale-[0.98] transition-all group"
          >
            <span className="text-sm font-bold text-primary">View All Categories</span>
            <ArrowRight size={15} className="text-primary/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BentoCategories;
