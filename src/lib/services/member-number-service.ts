import { SupabaseClient } from '@supabase/supabase-js';

export class MemberNumberGeneratorService {
    private supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    private getTypePrefix(memberType: string): string {
        const map: Record<string, string> = {
            'regular': 'A', // Anggota Biasa
            'honorary': 'L', // Anggota Luar Biasa
            'family': 'K', // Anggota Keluarga
            'student': 'S', // Anggota Siswa
            'staff': 'KA', // Karyawan
            'mitra_umkm': 'M', // Mitra UMKM
        };
        return map[memberType] || 'X';
    }

    /**
     * Generates a new member number formatted as:
     * {KODE_KOPERASI}-{KODE_JENIS_ANGGOTA}-{TAHUN_GABUNG}-{RUNNING_NUMBER}
     * Example: KKMP-AB-2025-000123
     */
    async generate(koperasiId: string, memberType: string, joinDate: Date = new Date()): Promise<string> {
        // 1. Get Koperasi Code
        const { data: koperasi, error: kopError } = await this.supabase
            .from('koperasi')
            .select('code')
            .eq('id', koperasiId)
            .single();

        if (kopError || !koperasi) {
            throw new Error('Koperasi not found or code not configured');
        }

        const kopCode = koperasi.code || 'KOP'; // Fallback if code is null
        const typeCode = this.getTypePrefix(memberType);
        const year = joinDate.getFullYear();

        // 2. Get Next Sequence
        const sequence = await this.getNextSequence(koperasiId, 'member_number', year);

        // 3. Format
        // Format: KOP-AB-2025-000123
        const runningNumber = sequence.toString().padStart(6, '0');
        return `${kopCode}-${typeCode}-${year}-${runningNumber}`;
    }

    private async getNextSequence(koperasiId: string, type: string, year: number): Promise<number> {
        // Use an atomic update to increment and return the new value
        // If row doesn't exist, we need to insert it.
        // Supabase/Postgres doesn't have a simple "upsert and return new value" in one go without a function,
        // but we can try an RPC or a loop.
        // For now, let's use a robust approach: Try UPDATE returning, if 0 rows, INSERT.

        // Attempt UPDATE
        const { data: updated, error: updateError } = await this.supabase
            .rpc('increment_document_sequence', {
                p_koperasi_id: koperasiId,
                p_type: type,
                p_year: year
            });

        if (updateError) {
            // Fallback: If RPC doesn't exist (yet), implement client-side locking logic (less safe)
            // Or better: Create the RPC in the migration.
            // Let's assume we can do a client-side check-and-set for now if RPC is missing,
            // BUT strict requirement says "Integrity".
            // I will implement a client-side safe loop.

            // 1. Try to fetch
            const { data: current } = await this.supabase
                .from('document_sequences')
                .select('*')
                .match({ koperasi_id: koperasiId, type, year })
                .single();

            if (!current) {
                // Insert initial
                const { data: inserted, error: insertError } = await this.supabase
                    .from('document_sequences')
                    .insert({
                        koperasi_id: koperasiId,
                        type,
                        year,
                        current_value: 1
                    })
                    .select()
                    .single();

                if (insertError) {
                    // Concurrency hit? retry or throw
                    if (insertError.code === '23505') { // Unique violation
                        return this.getNextSequence(koperasiId, type, year); // Retry
                    }
                    throw insertError;
                }
                return 1;
            } else {
                // Update
                const { data: next, error: nextError } = await this.supabase
                    .from('document_sequences')
                    .update({ current_value: current.current_value + 1 })
                    .match({ id: current.id, current_value: current.current_value }) // Optimistic Lock
                    .select()
                    .single();

                if (nextError || !next) {
                    // Version mismatch or error -> Retry
                    return this.getNextSequence(koperasiId, type, year);
                }
                return next.current_value;
            }
        }

        return updated as number;
    }
}
