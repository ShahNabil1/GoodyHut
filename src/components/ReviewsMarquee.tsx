import { motion } from "framer-motion";
import { Star } from "lucide-react";

const reviews = [
  { name: "Rafiq Ahmed", avatar: "RA", text: "Customs cleared in just 3 days! GoodyHut made importing electronics from Shenzhen incredibly smooth.", rating: 5 },
  { name: "Nusrat Jahan", avatar: "NJ", text: "Best wholesale prices I've found. My clothing business margins doubled since switching to GoodyHut.", rating: 5 },
  { name: "Tanvir Hasan", avatar: "TH", text: "The tracking system is amazing. I could see my shipment moving from Guangzhou to Dhaka in real-time.", rating: 4 },
  { name: "Sabrina Akter", avatar: "SA", text: "I was nervous about importing for the first time. Their support team guided me through every step.", rating: 5 },
  { name: "Imran Khan", avatar: "IK", text: "Been using GoodyHut for 6 months. Quality verification service saved me from a bad supplier.", rating: 5 },
  { name: "Fatema Begum", avatar: "FB", text: "Fast delivery to Chittagong. Products matched the Alibaba listing exactly. Very trustworthy.", rating: 4 },
];

const ReviewCard = ({ review }: { review: typeof reviews[0] }) => (
  <div className="flex-shrink-0 w-[340px] p-6 rounded-3xl bg-card border border-border/50 shadow-card">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold">
        {review.avatar}
      </div>
      <div>
        <div className="font-body font-semibold text-sm text-foreground">{review.name}</div>
        <div className="flex gap-0.5">
          {Array.from({ length: review.rating }).map((_, i) => (
            <Star key={i} size={10} className="text-secondary fill-secondary" />
          ))}
        </div>
      </div>
    </div>
    <p className="text-sm text-muted-foreground font-body leading-relaxed">"{review.text}"</p>
  </div>
);

const ReviewsMarquee = () => {
  return (
    <section className="py-10 md:py-16 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            Trusted by Importers
          </h2>
          <p className="text-muted-foreground font-body max-w-md mx-auto">
            10,000+ Bangladeshi businesses import with confidence
          </p>
        </div>
      </div>

      {/* Marquee */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        <div className="flex gap-6 animate-marquee">
          {[...reviews, ...reviews].map((r, i) => (
            <ReviewCard key={i} review={r} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsMarquee;
