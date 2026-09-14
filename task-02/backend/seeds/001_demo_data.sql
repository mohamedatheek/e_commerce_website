-- Idempotent seed: demo customer + catalog.
-- Fixed UUIDs keep re-runs safe and make concurrency tests predictable.

INSERT INTO users (id, name, email)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Demo Customer',
  'customer@example.com'
)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = NOW();

INSERT INTO products (
  id, name, description, category, price, image_url, total_stock, reserved_stock
) VALUES
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'Aurora Wireless Headphones',
  'Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.',
  'Electronics',
  129.99,
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  25,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'Nova 14 Laptop',
  'Lightweight 14-inch laptop with 16GB RAM, 512GB SSD, and a sharp IPS display for work and study.',
  'Electronics',
  999.00,
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
  8,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'Pulse Smartphone',
  'Flagship smartphone with a 6.5-inch OLED screen, dual cameras, and all-day battery.',
  'Electronics',
  699.00,
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
  12,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'Orbit Smartwatch',
  'Fitness smartwatch with heart-rate tracking, GPS, and five-day battery life.',
  'Electronics',
  249.50,
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
  18,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
  'Canyon Denim Jacket',
  'Classic mid-weight denim jacket with a relaxed fit and durable stitching.',
  'Fashion',
  89.00,
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
  20,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
  'Trail Runner Sneakers',
  'Breathable everyday sneakers with cushioned soles for walking and light running.',
  'Fashion',
  119.00,
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  15,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
  'Meridian Cotton Tee',
  'Soft organic-cotton t-shirt with a clean crew neck and a tailored unisex cut.',
  'Fashion',
  29.00,
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  40,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
  'Harbor Ceramic Lamp',
  'Warm ceramic table lamp with a linen shade, sized for desks and bedside tables.',
  'Home',
  64.00,
  'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=900&q=80',
  10,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9',
  'Linen Throw Blanket',
  'Stonewashed linen throw for sofas and beds. Lightweight, breathable, and machine washable.',
  'Home',
  45.00,
  'https://images.unsplash.com/photo-1616628188550-808682f3926d?auto=format&fit=crop&w=900&q=80',
  22,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10',
  'Oak Serving Board',
  'Solid oak serving board with a juice groove. Suitable for cheese, bread, and entertaining.',
  'Home',
  38.00,
  'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=900&q=80',
  16,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11',
  'Daylight Sunglasses',
  'UV400 acetate sunglasses with polarized lenses and a medium unisex frame.',
  'Accessories',
  79.00,
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=900&q=80',
  30,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12',
  'Compact Travel Backpack',
  '20L daily backpack with a padded laptop sleeve, water-resistant shell, and hidden pocket.',
  'Accessories',
  94.00,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
  14,
  0
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13',
  'Leather Card Holder',
  'Slim vegetable-tanned leather card holder. Low stock — useful for demonstrating inventory limits.',
  'Accessories',
  35.00,
  'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80',
  3,
  0
),
(
  '22222222-2222-4222-8222-222222222222',
  'Lab Stock Widget',
  'Assessment product with very limited stock. Use this item to demonstrate concurrent checkout protection. Do not treat as a live catalog SKU.',
  'Electronics',
  1.00,
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  2,
  0
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();
