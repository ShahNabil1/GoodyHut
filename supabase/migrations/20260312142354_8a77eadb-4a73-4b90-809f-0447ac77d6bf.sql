
-- Remove emojis from seeded products
UPDATE products SET emoji = NULL WHERE slug IN ('wireless-bluetooth-earbuds-pro', 'leather-crossbody-bag', 'vitamin-c-face-serum-30ml', 'mens-casual-hoodie', 'stainless-steel-water-bottle-750ml');

-- Add product images
INSERT INTO product_images (product_id, image_url, sort_order) VALUES
('1fab375b-d4f2-4b5d-987b-beb35278f3c3', 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600&q=80', 0),
('1f203889-d312-49fc-a2d1-7c0d9411691c', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80', 0),
('4e9aaf3d-ef85-4c50-a53e-3deac202684a', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80', 0),
('af6dabf0-63db-4c31-84fa-7c1d794adce0', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80', 0),
('872bb677-c745-48bc-8d85-ed8866cd94b6', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80', 0);
