
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

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_unit_usaha_updated_at ON unit_usaha;
CREATE TRIGGER handle_unit_usaha_updated_at BEFORE UPDATE ON unit_usaha
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE unit_usaha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Unit Usaha" ON unit_usaha FOR SELECT TO authenticated USING (true);
