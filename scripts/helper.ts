
async function getAccountId(supabase: any, koperasiId: string, code: string): Promise<string | undefined> {
    const { data } = await supabase.from('chart_of_accounts').select('id').eq('koperasi_id', koperasiId).eq('account_code', code).single();
    return data?.id;
}
