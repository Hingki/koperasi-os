-- Master Data: Customers, Employees, Fixed Assets, Email Settings
-- Aligns with SmartScoop Data Master features

-- Management Board (Pengurus)
CREATE TABLE IF NOT EXISTS management_board (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID REFERENCES member(id),
    position TEXT NOT NULL, -- Ketua, Sekretaris, Bendahara, dsb.
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Retail Customers
CREATE TABLE IF NOT EXISTS retail_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID REFERENCES member(id),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Employees (Karyawan)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    user_id UUID REFERENCES auth.users(id),
    employee_no TEXT,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    job_title TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Fixed Assets (Aset Barang)
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    asset_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    purchase_date DATE,
    purchase_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
    useful_life_months INTEGER,
    depreciation_method TEXT DEFAULT 'straight_line', -- straight_line, declining_balance
    residual_value NUMERIC(15,2) DEFAULT 0,
    unit_usaha_id UUID REFERENCES unit_usaha(id),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Email Settings (Pengaturan Email)
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    provider TEXT DEFAULT 'smtp',
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_username TEXT,
    smtp_password TEXT,
    from_name TEXT,
    from_email TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Payment Sources (Sumber Bayar)
-- Konfigurasi daftar sumber pembayaran yang diizinkan per koperasi/unit usaha
CREATE TABLE IF NOT EXISTS payment_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID REFERENCES unit_usaha(id),
    name TEXT NOT NULL, -- e.g., Kas Toko, QRIS Unit Retail, VA BCA
    method payment_method_type NOT NULL, -- Reuse enum from payment module
    provider payment_provider_type DEFAULT 'manual',
    account_code TEXT, -- Optional mapping to COA code
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Updated At Triggers
DROP TRIGGER IF EXISTS handle_management_board_updated_at ON management_board;
CREATE TRIGGER handle_management_board_updated_at BEFORE UPDATE ON management_board FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_retail_customers_updated_at ON retail_customers;
CREATE TRIGGER handle_retail_customers_updated_at BEFORE UPDATE ON retail_customers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_employees_updated_at ON employees;
CREATE TRIGGER handle_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_fixed_assets_updated_at ON fixed_assets;
CREATE TRIGGER handle_fixed_assets_updated_at BEFORE UPDATE ON fixed_assets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_email_settings_updated_at ON email_settings;
CREATE TRIGGER handle_email_settings_updated_at BEFORE UPDATE ON email_settings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_payment_sources_updated_at ON payment_sources;
CREATE TRIGGER handle_payment_sources_updated_at BEFORE UPDATE ON payment_sources FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS Enable
ALTER TABLE management_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;

-- Basic Policies (to be refined with koperasi_id checks)
DROP POLICY IF EXISTS "View Management Board" ON management_board;
CREATE POLICY "View Management Board" ON management_board FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Insert Management Board" ON management_board;
CREATE POLICY "Insert Management Board" ON management_board FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Update Management Board" ON management_board;
CREATE POLICY "Update Management Board" ON management_board FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "View Retail Customers" ON retail_customers;
CREATE POLICY "View Retail Customers" ON retail_customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Insert Retail Customers" ON retail_customers;
CREATE POLICY "Insert Retail Customers" ON retail_customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Update Retail Customers" ON retail_customers;
CREATE POLICY "Update Retail Customers" ON retail_customers FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "View Employees" ON employees;
CREATE POLICY "View Employees" ON employees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Insert Employees" ON employees;
CREATE POLICY "Insert Employees" ON employees FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Update Employees" ON employees;
CREATE POLICY "Update Employees" ON employees FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "View Fixed Assets" ON fixed_assets;
CREATE POLICY "View Fixed Assets" ON fixed_assets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Insert Fixed Assets" ON fixed_assets;
CREATE POLICY "Insert Fixed Assets" ON fixed_assets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Update Fixed Assets" ON fixed_assets;
CREATE POLICY "Update Fixed Assets" ON fixed_assets FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "View Email Settings" ON email_settings;
CREATE POLICY "View Email Settings" ON email_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Insert Email Settings" ON email_settings;
CREATE POLICY "Insert Email Settings" ON email_settings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Update Email Settings" ON email_settings;
CREATE POLICY "Update Email Settings" ON email_settings FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "View Payment Sources" ON payment_sources;
CREATE POLICY "View Payment Sources" ON payment_sources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Insert Payment Sources" ON payment_sources;
CREATE POLICY "Insert Payment Sources" ON payment_sources FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Update Payment Sources" ON payment_sources;
CREATE POLICY "Update Payment Sources" ON payment_sources FOR UPDATE TO authenticated USING (true);
