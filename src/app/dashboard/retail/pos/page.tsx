import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { redirect } from 'next/navigation';
import { PosLayout } from '@/components/retail/pos/pos-layout';

export default async function PosPage({ searchParams }: { searchParams: { resume_tx?: string } }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const koperasiId = user.user_metadata.koperasi_id;
    if (!koperasiId) redirect('/dashboard');

    const retailService = new RetailService(supabase);
    // Fetch initial products (popular or recent)
    // We might want to add pagination or limit here in the service, but getProducts returns all for now or we can assume it's fine for MVP
    const products = await retailService.getProducts(koperasiId);
    
    let initialTransaction = null;
    if (searchParams?.resume_tx) {
        try {
            initialTransaction = await retailService.getPosTransactionById(searchParams.resume_tx);
        } catch (e) {
            console.error('Failed to load transaction', e);
        }
    }

    return (
        <div className="h-full">
            <PosLayout 
                koperasiId={koperasiId} 
                initialProducts={products} 
                initialTransaction={initialTransaction}
            />
        </div>
    );
}
