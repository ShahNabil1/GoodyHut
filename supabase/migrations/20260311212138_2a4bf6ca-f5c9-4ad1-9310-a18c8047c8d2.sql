
-- Add shipping columns to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS shipping_rate_per_kg numeric DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS shipping_rate_per_piece numeric DEFAULT 0;

-- Add shipping columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS estimated_weight_gm integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_charge_type text DEFAULT 'per_kg';
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_rate_override numeric DEFAULT NULL;

-- Add shipping columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_cargo_charge numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_weight_gm integer DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_cargo_charge numeric DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS domestic_delivery_charge numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_adjustment numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS adjustment_status text DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wallet_amount_used numeric DEFAULT 0;

-- Add new order status values
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_weight';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'adjustment_due';

-- Create wallet table
CREATE TABLE IF NOT EXISTS wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wallet" ON wallet FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all wallets" ON wallet FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert wallets" ON wallet FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update wallets" ON wallet FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own wallet" ON wallet FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  reason text,
  order_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions" ON wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage transactions" ON wallet_transactions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create domestic_shipping_rates table
CREATE TABLE IF NOT EXISTS domestic_shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  min_weight_gm integer DEFAULT 0,
  max_weight_gm integer DEFAULT 1000,
  charge_inside_dhaka numeric DEFAULT 60,
  charge_outside_dhaka numeric DEFAULT 120,
  sort_order integer DEFAULT 0
);
ALTER TABLE domestic_shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Domestic rates publicly readable" ON domestic_shipping_rates FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage domestic rates" ON domestic_shipping_rates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
