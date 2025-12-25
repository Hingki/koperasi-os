
-- Create PPOB Products Table
CREATE TABLE IF NOT EXISTS ppob_products (
  id VARCHAR(50) PRIMARY KEY, -- Slug e.g., 'tsel_10'
  category VARCHAR(50) NOT NULL, -- 'pulsa', 'data', 'listrik', 'pdam'
  provider VARCHAR(50) NOT NULL, -- 'Telkomsel', 'PLN', etc.
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE ppob_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active products" ON ppob_products;
CREATE POLICY "Everyone can view active products"
  ON ppob_products FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON ppob_products;
CREATE POLICY "Admins can manage products"
  ON ppob_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role WHERE user_id = auth.uid() AND role IN ('admin', 'pengurus', 'ketua', 'bendahara')
    )
  );

-- Seed Initial Data
INSERT INTO ppob_products (id, category, provider, name, description, price) VALUES
('tsel_10', 'pulsa', 'Telkomsel', 'Pulsa 10.000', 'Menambah masa aktif 15 hari', 12000),
('tsel_25', 'pulsa', 'Telkomsel', 'Pulsa 25.000', 'Menambah masa aktif 30 hari', 27000),
('tsel_50', 'pulsa', 'Telkomsel', 'Pulsa 50.000', 'Menambah masa aktif 45 hari', 52000),
('tsel_100', 'pulsa', 'Telkomsel', 'Pulsa 100.000', 'Menambah masa aktif 60 hari', 102000),

('isat_10', 'pulsa', 'Indosat', 'Pulsa 10.000', 'Menambah masa aktif 15 hari', 12000),
('isat_25', 'pulsa', 'Indosat', 'Pulsa 25.000', 'Menambah masa aktif 30 hari', 27000),

('data_tsel_3gb', 'data', 'Telkomsel', 'Data 3GB / 30 Hari', 'Kuota Nasional 3GB', 35000),
('data_tsel_10gb', 'data', 'Telkomsel', 'Data 10GB / 30 Hari', 'Kuota Nasional 10GB', 85000),

('pln_20', 'listrik', 'PLN', 'Token PLN 20.000', 'Token Listrik Prabayar', 22500),
('pln_50', 'listrik', 'PLN', 'Token PLN 50.000', 'Token Listrik Prabayar', 52500),
('pln_100', 'listrik', 'PLN', 'Token PLN 100.000', 'Token Listrik Prabayar', 102500)
ON CONFLICT (id) DO UPDATE SET
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  name = EXCLUDED.name;
