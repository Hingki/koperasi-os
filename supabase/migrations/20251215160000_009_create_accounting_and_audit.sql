-- Create accounting_period and chart_of_accounts tables and audit logging

-- accounting_period (from arsitektur-final.md)
CREATE TABLE IF NOT EXISTS accounting_period (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  koperasi_id UUID NOT NULL REFERENCES koperasi(id),
  period_name TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  year INTEGER NOT NULL,
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status period_status DEFAULT 'draft',
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  opening_balances JSONB,
  closing_balances JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1
);

-- chart_of_accounts (from arsitektur-final.md)
-- Ensure unit_usaha exists (used by chart_of_accounts FK)
CREATE TABLE IF NOT EXISTS unit_usaha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  koperasi_id UUID NOT NULL REFERENCES koperasi(id),
  kode_unit TEXT NOT NULL,
  nama_unit TEXT NOT NULL,
  deskripsi TEXT,
  jenis_unit TEXT NOT NULL CHECK (jenis_unit IN (
    'simpan_pinjam', 'sembako', 'frozen_food', 'lpg',
    'akuaponik', 'maggot', 'pupuk', 'klinik',
    'apotek', 'billboard', 'other'
  )),
  pic_name TEXT,
  pic_phone TEXT,
  alamat TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  tanggal_operasi DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  koperasi_id UUID NOT NULL REFERENCES koperasi(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  parent_code TEXT,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  account_type account_type NOT NULL,
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  is_header BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  allow_transaction BOOLEAN DEFAULT true,
  unit_usaha_id UUID REFERENCES unit_usaha(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1
);

-- Audit log table and trigger
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  row_data JSONB,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_audit_log() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log(table_name, operation, row_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), NULL);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log(table_name, operation, row_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), NULL);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log(table_name, operation, row_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach audit trigger to core tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'audit_koperasi' AND c.relname = 'koperasi'
  ) THEN
    CREATE TRIGGER audit_koperasi AFTER INSERT OR UPDATE OR DELETE ON koperasi
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'audit_member' AND c.relname = 'member'
  ) THEN
    CREATE TRIGGER audit_member AFTER INSERT OR UPDATE OR DELETE ON member
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'audit_user_role' AND c.relname = 'user_role'
  ) THEN
    CREATE TRIGGER audit_user_role AFTER INSERT OR UPDATE OR DELETE ON user_role
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'audit_accounting_period' AND c.relname = 'accounting_period'
  ) THEN
    CREATE TRIGGER audit_accounting_period AFTER INSERT OR UPDATE OR DELETE ON accounting_period
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'audit_chart_of_accounts' AND c.relname = 'chart_of_accounts'
  ) THEN
    CREATE TRIGGER audit_chart_of_accounts AFTER INSERT OR UPDATE OR DELETE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
  END IF;
END$$;
