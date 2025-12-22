
-- Create retail_customers table for non-member customers
CREATE TABLE IF NOT EXISTS retail_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_retail_customers_updated_at ON retail_customers;
CREATE TRIGGER handle_retail_customers_updated_at BEFORE UPDATE ON retail_customers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE retail_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Retail Customers" ON retail_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage Retail Customers" ON retail_customers FOR ALL TO authenticated USING (true);
