import { SupabaseClient } from '@supabase/supabase-js';
import { MemberNumberGeneratorService } from './member-number-service';

export type MemberStatus = 'pending' | 'active' | 'suspended' | 'resigned' | 'deceased' | 'inactive';
export type MemberType = 'regular' | 'honorary' | 'family' | 'student' | 'staff' | 'mitra_umkm';

export interface CreateMemberDTO {
  user_id?: string;
  koperasi_id: string;
  nama_lengkap: string;
  nik: string;
  phone: string;
  email?: string;
  alamat_lengkap: string;
  member_type?: MemberType;
  metadata?: any;
}

export class MemberService {
  private supabase: SupabaseClient;
  private numberGenerator: MemberNumberGeneratorService;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.numberGenerator = new MemberNumberGeneratorService(supabase);
  }

  /**
   * Register a new member (Pending State by default)
   * DOES NOT generate Member Number (generated at approval).
   */
  async register(data: CreateMemberDTO & { status?: MemberStatus }) {
    // 1. Validate NIK Uniqueness
    const { data: existingNik } = await this.supabase
      .from('member')
      .select('id')
      .eq('nik', data.nik)
      .single();

    if (existingNik) {
      throw new Error('NIK sudah terdaftar');
    }

    // 2. Insert Member (Without Number)
    const { data: newMember, error } = await this.supabase
      .from('member')
      .insert({
        ...data,
        member_type: data.member_type || 'regular',
        status: data.status || 'pending',
        tanggal_daftar: new Date().toISOString(),
        // If status is explicitly active (e.g. migration), handle with caution.
        // Ideally, use approve() for activation.
      })
      .select()
      .single();

    if (error) {
      console.error('Register Member Error:', error);
      throw new Error(`Gagal mendaftar anggota: ${error.message}`);
    }

    return newMember;
  }

  /**
   * Approve a pending member
   */
  async approve(memberId: string, approverId: string) {
    // 1. Get current member
    const { data: member, error: fetchError } = await this.supabase
      .from('member')
      .select('status, koperasi_id, member_type')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) throw new Error('Member tidak ditemukan');
    if (member.status !== 'pending') throw new Error('Member bukan status pending');

    // 2. Generate Member Number
    // Format: [KODE_KOPERASI]-[TIPE]-[TAHUN]-[URUT]
    const memberNumber = await this.numberGenerator.generate(
      member.koperasi_id,
      member.member_type || 'regular',
      new Date() // Use approval date for year
    );

    // 3. Update status and number
    const { data: updated, error } = await this.supabase
      .from('member')
      .update({
        status: 'active',
        nomor_anggota: memberNumber,
        approved_at: new Date().toISOString(),
        approved_by: approverId,
        tanggal_aktif: new Date().toISOString() // Set active date
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw new Error(`Gagal mengesahkan anggota: ${error.message}`);
    return updated;
  }

  /**
   * Get Member by diverse identifiers (WA Readiness)
   */
  async findMember(identifier: string, koperasiId: string) {
    // Try by member_number
    let { data, error } = await this.supabase
      .from('member')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('nomor_anggota', identifier)
      .single();

    if (data) return data;

    // Try by NIK
    ({ data, error } = await this.supabase
      .from('member')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('nik', identifier)
      .single());

    if (data) return data;

    // Try by Phone/WA
    ({ data, error } = await this.supabase
      .from('member')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('phone', identifier)
      .single());

    if (data) return data;

    // Try by wa_number if different
    ({ data, error } = await this.supabase
      .from('member')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('wa_number', identifier)
      .single());

    return data;
  }
}
