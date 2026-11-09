
-- Clear existing demo data
DELETE FROM cart_items;
DELETE FROM product_images;
DELETE FROM products;
DELETE FROM categories;

-- Insert Categories
INSERT INTO categories (name, slug, image_url, sort_order) VALUES
('Electronics', 'electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80', 1),
('Fashion & Clothing', 'fashion-clothing', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80', 2),
('Home & Kitchen', 'home-kitchen', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80', 3),
('Beauty & Health', 'beauty-health', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80', 4),
('Sports & Outdoor', 'sports-outdoor', 'https://images.unsplash.com/photo-1461896836934-bd45ba8c034b?w=400&q=80', 5),
('Bags & Accessories', 'bags-accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80', 6);

-- Insert Products using subqueries for category_id
INSERT INTO products (title, slug, description, price, original_price, category, category_id, in_stock, stock, rating, reviews_count, min_quantity, meta_title, meta_description, specifications, variants) VALUES
('TWS Bluetooth Earbuds Pro', 'tws-bluetooth-earbuds-pro', 'Premium quality TWS wireless earbuds with active noise cancellation, 30-hour battery life, and IPX5 waterproof rating. Crystal clear sound with deep bass.', 450, 850, 'Electronics', (SELECT id FROM categories WHERE slug='electronics'), true, 500, 4.5, 128, 10, 'TWS Bluetooth Earbuds Pro - Wholesale Price', 'Buy TWS Bluetooth Earbuds Pro wholesale. ANC, 30hr battery, IPX5 waterproof.',
'[{"key":"Brand","value":"GoodyHut"},{"key":"Connectivity","value":"Bluetooth 5.3"},{"key":"Battery","value":"30 Hours"},{"key":"Waterproof","value":"IPX5"},{"key":"ANC","value":"Yes"},{"key":"Driver","value":"13mm"}]',
'[{"id":"vg1","name":"Color","options":[{"id":"vo1a","name":"Black","price":450,"min_quantity":10,"size":"","weight":"45g","image_id":""},{"id":"vo1b","name":"White","price":450,"min_quantity":10,"size":"","weight":"45g","image_id":""},{"id":"vo1c","name":"Navy Blue","price":480,"min_quantity":10,"size":"","weight":"45g","image_id":""}]}]'),

('Smart Watch Ultra Series', 'smart-watch-ultra-series', 'Feature-packed smartwatch with AMOLED display, heart rate monitor, SpO2 tracking, 100+ sports modes. 7-day battery life.', 890, 1500, 'Electronics', (SELECT id FROM categories WHERE slug='electronics'), true, 300, 4.7, 256, 5, 'Smart Watch Ultra Series - Wholesale Deal', 'Buy Smart Watch Ultra wholesale. AMOLED, health tracking, 7-day battery.',
'[{"key":"Display","value":"1.96 AMOLED"},{"key":"Battery","value":"7 Days"},{"key":"Waterproof","value":"IP68"},{"key":"Compatibility","value":"Android & iOS"},{"key":"Sensors","value":"Heart Rate, SpO2"}]',
'[{"id":"vg2","name":"Strap Color","options":[{"id":"vo2a","name":"Black Silicone","price":890,"min_quantity":5,"size":"46mm","weight":"52g","image_id":""},{"id":"vo2b","name":"Army Green","price":890,"min_quantity":5,"size":"46mm","weight":"52g","image_id":""},{"id":"vo2c","name":"Orange Sport","price":920,"min_quantity":5,"size":"46mm","weight":"52g","image_id":""},{"id":"vo2d","name":"Steel Band","price":1100,"min_quantity":5,"size":"46mm","weight":"85g","image_id":""}]}]'),

('Premium Cotton Hoodie', 'premium-cotton-hoodie', 'High quality 320 GSM cotton blend hoodie with brushed fleece interior. Double-stitched for durability. Multiple sizes and colors.', 380, 650, 'Fashion & Clothing', (SELECT id FROM categories WHERE slug='fashion-clothing'), true, 1000, 4.3, 89, 20, 'Premium Cotton Hoodie - Wholesale', 'Buy premium cotton hoodies wholesale. 320 GSM, fleece lined, multiple sizes.',
'[{"key":"Material","value":"80% Cotton, 20% Polyester"},{"key":"GSM","value":"320"},{"key":"Lining","value":"Brushed Fleece"},{"key":"Closure","value":"Zipper + Drawstring"},{"key":"Pockets","value":"2 Side"},{"key":"Care","value":"Machine Washable"}]',
'[{"id":"vg3","name":"Size","options":[{"id":"vo3a","name":"Small","price":380,"min_quantity":20,"size":"S (36)","weight":"380g","image_id":""},{"id":"vo3b","name":"Medium","price":380,"min_quantity":20,"size":"M (38)","weight":"400g","image_id":""},{"id":"vo3c","name":"Large","price":380,"min_quantity":15,"size":"L (40)","weight":"420g","image_id":""},{"id":"vo3d","name":"X-Large","price":400,"min_quantity":15,"size":"XL (42)","weight":"440g","image_id":""},{"id":"vo3e","name":"XX-Large","price":420,"min_quantity":10,"size":"XXL (44)","weight":"460g","image_id":""}]}]'),

('Portable USB Blender', 'portable-usb-blender', 'Rechargeable portable blender with 6 stainless steel blades. 400ml capacity, USB-C charging, perfect for smoothies on the go.', 320, 550, 'Home & Kitchen', (SELECT id FROM categories WHERE slug='home-kitchen'), true, 800, 4.4, 167, 15, 'Portable USB Blender - Wholesale', 'Buy portable USB blenders wholesale. 6 blades, USB-C, 400ml capacity.',
'[{"key":"Capacity","value":"400ml"},{"key":"Blades","value":"6 Stainless Steel"},{"key":"Battery","value":"2000mAh"},{"key":"Charging","value":"USB-C"},{"key":"Material","value":"BPA-Free Tritan"},{"key":"RPM","value":"22000"}]',
'[{"id":"vg4","name":"Color","options":[{"id":"vo4a","name":"Sakura Pink","price":320,"min_quantity":15,"size":"","weight":"350g","image_id":""},{"id":"vo4b","name":"Sky Blue","price":320,"min_quantity":15,"size":"","weight":"350g","image_id":""},{"id":"vo4c","name":"Mint Green","price":320,"min_quantity":15,"size":"","weight":"350g","image_id":""},{"id":"vo4d","name":"Pearl White","price":340,"min_quantity":15,"size":"","weight":"350g","image_id":""}]}]'),

('Vitamin C Brightening Serum', 'vitamin-c-brightening-serum', 'Professional grade 20% Vitamin C serum with Hyaluronic Acid and Vitamin E. Brightens skin, reduces dark spots.', 250, 480, 'Beauty & Health', (SELECT id FROM categories WHERE slug='beauty-health'), true, 600, 4.6, 312, 30, 'Vitamin C Serum 20% - Wholesale', 'Buy Vitamin C serum wholesale. 20% concentration, dermatologist tested.',
'[{"key":"Volume","value":"30ml"},{"key":"Ingredients","value":"20% Vit C, HA, Vit E"},{"key":"Skin Type","value":"All"},{"key":"Shelf Life","value":"12 Months"},{"key":"Tested","value":"Dermatologist"},{"key":"Origin","value":"South Korea"}]',
'[{"id":"vg5","name":"Pack Size","options":[{"id":"vo5a","name":"30ml Single","price":250,"min_quantity":30,"size":"30ml","weight":"65g","image_id":""},{"id":"vo5b","name":"50ml Premium","price":380,"min_quantity":20,"size":"50ml","weight":"95g","image_id":""},{"id":"vo5c","name":"30ml+50ml Combo","price":580,"min_quantity":15,"size":"Combo","weight":"160g","image_id":""}]}]'),

('Non-Slip Yoga Mat Premium', 'non-slip-yoga-mat-premium', 'Extra thick 8mm TPE yoga mat with double-sided non-slip texture. Eco-friendly, odor-free. Comes with carrying strap.', 280, 500, 'Sports & Outdoor', (SELECT id FROM categories WHERE slug='sports-outdoor'), true, 400, 4.2, 78, 10, 'Yoga Mat Premium - Wholesale', 'Buy premium yoga mats wholesale. 8mm TPE, non-slip, eco-friendly.',
'[{"key":"Material","value":"TPE Eco-Friendly"},{"key":"Thickness","value":"8mm"},{"key":"Size","value":"183x61cm"},{"key":"Surface","value":"Double Non-Slip"},{"key":"Includes","value":"Carrying Strap"},{"key":"Cert","value":"SGS, RoHS"}]',
'[{"id":"vg6","name":"Color","options":[{"id":"vo6a","name":"Deep Purple","price":280,"min_quantity":10,"size":"183x61cm","weight":"850g","image_id":""},{"id":"vo6b","name":"Teal Blue","price":280,"min_quantity":10,"size":"183x61cm","weight":"850g","image_id":""},{"id":"vo6c","name":"Coral Pink","price":280,"min_quantity":10,"size":"183x61cm","weight":"850g","image_id":""}]}]'),

('Leather Crossbody Sling Bag', 'leather-crossbody-sling-bag', 'Premium PU leather crossbody bag with anti-theft pocket, adjustable strap, and multiple compartments. Water-resistant.', 350, 600, 'Bags & Accessories', (SELECT id FROM categories WHERE slug='bags-accessories'), true, 350, 4.5, 145, 10, 'Crossbody Bag - Wholesale', 'Buy leather crossbody bags wholesale. PU leather, anti-theft, water resistant.',
'[{"key":"Material","value":"Premium PU Leather"},{"key":"Compartments","value":"3 Main + 2 Side + Anti-theft"},{"key":"Strap","value":"Adjustable 60-130cm"},{"key":"Waterproof","value":"PU Coating"},{"key":"Size","value":"30x18x8cm"},{"key":"Gender","value":"Unisex"}]',
'[{"id":"vg7","name":"Color","options":[{"id":"vo7a","name":"Classic Black","price":350,"min_quantity":10,"size":"30x18cm","weight":"320g","image_id":""},{"id":"vo7b","name":"Vintage Brown","price":350,"min_quantity":10,"size":"30x18cm","weight":"320g","image_id":""},{"id":"vo7c","name":"Charcoal Grey","price":370,"min_quantity":10,"size":"30x18cm","weight":"320g","image_id":""}]}]'),

('LED Desk Lamp Touch Control', 'led-desk-lamp-touch-control', 'Modern LED desk lamp with touch dimmer, 3 color temperatures, USB charging port, and flexible gooseneck. Eye-care technology.', 420, 750, 'Home & Kitchen', (SELECT id FROM categories WHERE slug='home-kitchen'), true, 250, 4.4, 93, 10, 'LED Desk Lamp - Wholesale', 'Buy LED desk lamps wholesale. Touch dimmer, USB port, 3 color temps.',
'[{"key":"Light","value":"LED Eye-Care"},{"key":"Colors","value":"3000K/4500K/6000K"},{"key":"Dimming","value":"Stepless"},{"key":"USB Port","value":"5V/2A"},{"key":"Power","value":"12W"},{"key":"Neck","value":"360° Gooseneck"}]',
'[{"id":"vg8","name":"Body Color","options":[{"id":"vo8a","name":"Matte White","price":420,"min_quantity":10,"size":"","weight":"680g","image_id":""},{"id":"vo8b","name":"Matte Black","price":420,"min_quantity":10,"size":"","weight":"680g","image_id":""}]}]'),

('Air Mesh Running Shoes', 'air-mesh-running-shoes', 'Lightweight breathable running shoes with air cushion sole, anti-slip rubber outsole, and knit mesh upper. All sizes available.', 520, 900, 'Sports & Outdoor', (SELECT id FROM categories WHERE slug='sports-outdoor'), true, 700, 4.6, 234, 12, 'Running Shoes - Wholesale', 'Buy air mesh running shoes wholesale. Lightweight, air cushion, breathable.',
'[{"key":"Upper","value":"Fly Knit Mesh"},{"key":"Sole","value":"Air Cushion + Rubber"},{"key":"Closure","value":"Lace-Up"},{"key":"Weight","value":"~280g/shoe"},{"key":"Use","value":"Running, Gym, Casual"},{"key":"Gender","value":"Unisex"}]',
'[{"id":"vg9","name":"Size (EU)","options":[{"id":"vo9a","name":"39","price":520,"min_quantity":12,"size":"EU 39","weight":"280g","image_id":""},{"id":"vo9b","name":"40","price":520,"min_quantity":12,"size":"EU 40","weight":"290g","image_id":""},{"id":"vo9c","name":"41","price":520,"min_quantity":12,"size":"EU 41","weight":"300g","image_id":""},{"id":"vo9d","name":"42","price":520,"min_quantity":12,"size":"EU 42","weight":"310g","image_id":""},{"id":"vo9e","name":"43","price":540,"min_quantity":12,"size":"EU 43","weight":"320g","image_id":""},{"id":"vo9f","name":"44","price":540,"min_quantity":10,"size":"EU 44","weight":"330g","image_id":""}]}]'),

('RGB Mechanical Gaming Keyboard', 'rgb-mechanical-gaming-keyboard', 'Hot-swappable mechanical keyboard with per-key RGB, PBT keycaps, gasket mount. USB-C, 2.4GHz wireless, Bluetooth.', 750, 1200, 'Electronics', (SELECT id FROM categories WHERE slug='electronics'), true, 200, 4.8, 189, 5, 'Mechanical Keyboard - Wholesale', 'Buy RGB mechanical keyboards wholesale. Hot-swap, PBT keycaps, wireless.',
'[{"key":"Switch","value":"Hot-Swappable 3/5 pin"},{"key":"Keycaps","value":"PBT Double-Shot"},{"key":"Connect","value":"USB-C/2.4GHz/BT"},{"key":"Backlight","value":"Per-Key RGB"},{"key":"Layout","value":"75% (84 Keys)"},{"key":"Battery","value":"4000mAh"}]',
'[{"id":"vg10","name":"Switch Type","options":[{"id":"vo10a","name":"Red (Linear)","price":750,"min_quantity":5,"size":"75%","weight":"780g","image_id":""},{"id":"vo10b","name":"Brown (Tactile)","price":750,"min_quantity":5,"size":"75%","weight":"780g","image_id":""},{"id":"vo10c","name":"Blue (Clicky)","price":750,"min_quantity":5,"size":"75%","weight":"780g","image_id":""}]}]');

-- Insert Product Images
INSERT INTO product_images (product_id, image_url, sort_order)
SELECT id, 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=800&q=80', 0 FROM products WHERE slug='tws-bluetooth-earbuds-pro'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80', 1 FROM products WHERE slug='tws-bluetooth-earbuds-pro'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&q=80', 2 FROM products WHERE slug='tws-bluetooth-earbuds-pro'

UNION ALL SELECT id, 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=800&q=80', 0 FROM products WHERE slug='smart-watch-ultra-series'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80', 1 FROM products WHERE slug='smart-watch-ultra-series'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80', 2 FROM products WHERE slug='smart-watch-ultra-series'

UNION ALL SELECT id, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', 0 FROM products WHERE slug='premium-cotton-hoodie'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1578768079470-fa604cf498e5?w=800&q=80', 1 FROM products WHERE slug='premium-cotton-hoodie'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80', 2 FROM products WHERE slug='premium-cotton-hoodie'

UNION ALL SELECT id, 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80', 0 FROM products WHERE slug='portable-usb-blender'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=800&q=80', 1 FROM products WHERE slug='portable-usb-blender'

UNION ALL SELECT id, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80', 0 FROM products WHERE slug='vitamin-c-brightening-serum'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&q=80', 1 FROM products WHERE slug='vitamin-c-brightening-serum'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80', 2 FROM products WHERE slug='vitamin-c-brightening-serum'

UNION ALL SELECT id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80', 0 FROM products WHERE slug='non-slip-yoga-mat-premium'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80', 1 FROM products WHERE slug='non-slip-yoga-mat-premium'

UNION ALL SELECT id, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80', 0 FROM products WHERE slug='leather-crossbody-sling-bag'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 1 FROM products WHERE slug='leather-crossbody-sling-bag'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80', 2 FROM products WHERE slug='leather-crossbody-sling-bag'

UNION ALL SELECT id, 'https://images.unsplash.com/photo-1507473885765-e6ed057ab613?w=800&q=80', 0 FROM products WHERE slug='led-desk-lamp-touch-control'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1534073737927-85f1ebff1f5d?w=800&q=80', 1 FROM products WHERE slug='led-desk-lamp-touch-control'

UNION ALL SELECT id, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 0 FROM products WHERE slug='air-mesh-running-shoes'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80', 1 FROM products WHERE slug='air-mesh-running-shoes'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', 2 FROM products WHERE slug='air-mesh-running-shoes'

UNION ALL SELECT id, 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80', 0 FROM products WHERE slug='rgb-mechanical-gaming-keyboard'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80', 1 FROM products WHERE slug='rgb-mechanical-gaming-keyboard'
UNION ALL SELECT id, 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80', 2 FROM products WHERE slug='rgb-mechanical-gaming-keyboard';
