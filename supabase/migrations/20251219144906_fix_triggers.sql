-- Perbaikan trigger koperasi
DROP TRIGGER IF EXISTS handle_koperasi_updated_at ON koperasi;

CREATE TRIGGER handle_koperasi_updated_at
BEFORE UPDATE ON koperasi
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
