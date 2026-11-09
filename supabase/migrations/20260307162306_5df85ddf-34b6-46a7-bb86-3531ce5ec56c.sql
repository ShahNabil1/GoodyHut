
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  category TEXT NOT NULL DEFAULT 'General',
  sizes TEXT[] DEFAULT '{}',
  emoji TEXT DEFAULT '📦',
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product images table
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Cart items table (anonymous carts using session id)
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  selected_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Products: public read
CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (true);

-- Product images: public read
CREATE POLICY "Product images are publicly readable" ON public.product_images FOR SELECT USING (true);

-- Cart items: full access by session_id (no auth needed for now)
CREATE POLICY "Cart items accessible by session" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);

-- Seed products
INSERT INTO public.products (title, description, price, original_price, category, sizes, emoji, rating, reviews_count) VALUES
('TWS Bluetooth Earbuds Pro', 'High-quality wireless earbuds with active noise cancellation, 30hr battery life, and premium sound quality.', 1250, 1800, 'Electronics', '{}', '🎧', 4.8, 234),
('Smart Watch Ultra Series', 'Advanced smartwatch with health monitoring, GPS tracking, and 7-day battery life. Water resistant to 50m.', 2450, 3200, 'Electronics', '{"38mm","42mm","46mm"}', '⌚', 4.6, 189),
('USB-C Fast Charging Hub', '7-in-1 USB-C hub with 100W PD charging, 4K HDMI, SD card reader, and 3x USB 3.0 ports.', 850, 1200, 'Electronics', '{}', '🔌', 4.9, 412),
('LED Ring Light 18"', 'Professional ring light with adjustable color temperature, remote control, and phone/camera mount.', 1800, 2500, 'Gadgets', '{}', '💡', 4.7, 156),
('Leather Crossbody Bag', 'Premium genuine leather crossbody bag with multiple compartments. Available in multiple sizes.', 950, 1400, 'Fashion', '{"Small","Medium","Large"}', '👜', 4.5, 298),
('Mechanical Keyboard RGB', 'Hot-swappable mechanical keyboard with per-key RGB, PBT keycaps, and wireless connectivity.', 3200, 4200, 'Electronics', '{}', '⌨️', 4.8, 567),
('Portable Bluetooth Speaker', 'IPX7 waterproof speaker with 360° surround sound, 24hr battery, and built-in power bank.', 1650, 2200, 'Electronics', '{}', '🔊', 4.4, 321),
('Phone Gimbal Stabilizer', '3-axis gimbal stabilizer with gesture control, face tracking, and portable folding design.', 4500, 5800, 'Gadgets', '{}', '📱', 4.7, 142);
