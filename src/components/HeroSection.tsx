import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import heroSlide1 from "@/assets/hero-slide-1.jpg";
import heroSlide2 from "@/assets/hero-slide-2.jpg";
import heroSlide3 from "@/assets/hero-slide-3.jpg";

const fallbackSlides = [heroSlide1, heroSlide2, heroSlide3];

const HeroSection = () => {
  const { data: dbSlides } = useHeroSlides();
  const slides = dbSlides && dbSlides.length > 0 ? dbSlides : fallbackSlides;
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  useEffect(() => {
    setCurrent(0);
  }, [slides.length]);

  const getImageSrc = (src: string) => {
    if (src.includes("cloudinary.com")) {
      return optimizeCloudinaryUrl(src, 1920);
    }
    return src;
  };

  return (
    <section className="relative w-full bg-background px-3 md:px-6 lg:px-10 pt-2 md:pt-3">
      <div className="relative aspect-[1.8/1] md:aspect-[2.4/1] w-full rounded-2xl md:rounded-3xl overflow-hidden">
        {slides.map((src, i) => (
          <img
            key={i}
            src={getImageSrc(src)}
            alt={`Banner ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
            loading={i === 0 ? "eager" : "lazy"}
            decoding={i === 0 ? "sync" : "async"}
            fetchPriority={i === 0 ? "high" : "low"}
          />
        ))}

        <button
          onClick={prev}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/70 backdrop-blur items-center justify-center hover:bg-background transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft size={20} className="text-foreground" />
        </button>
        <button
          onClick={next}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/70 backdrop-blur items-center justify-center hover:bg-background transition-colors"
          aria-label="Next"
        >
          <ChevronRight size={20} className="text-foreground" />
        </button>

        <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 md:gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all ${
                i === current ? "bg-primary scale-125" : "bg-background/60"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
