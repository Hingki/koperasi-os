import { SupabaseClient } from '@supabase/supabase-js';

export interface FinancingObject {
    id: string;
    category: 'vehicle' | 'electronics' | 'furniture' | 'property' | 'gold' | 'other';
    name: string;
    condition: 'new' | 'used' | 'refurbished';
    price_otr: number;
    down_payment: number;
    financing_amount: number;
    attributes: Record<string, any>;
    supplier_id?: string;
    description?: string;
}

export interface FinancingApplicationData {
    koperasi_id: string;
    member_id: string;
    product_id: string;
    tenor_months: number;
    object_details: Omit<FinancingObject, 'id' | 'financing_amount'>;
    created_by: string;
}

export class FinancingService {
    constructor(private supabase: SupabaseClient) {}

    async getFinancingProducts() {
        const { data, error } = await this.supabase
            .from('loan_products')
            .select('*')
            .eq('is_financing', true)
            .eq('is_active', true);
        
        if (error) throw error;
        return data;
    }

    async getSuppliers() {
        const { data, error } = await this.supabase
            .from('inventory_suppliers')
            .select('*')
            .eq('is_active', true);
        
        if (error) throw error;
        return data;
    }

    async applyForFinancing(data: FinancingApplicationData) {
        // 1. Get Product & Validate
        const { data: product, error: productError } = await this.supabase
            .from('loan_products')
            .select('*')
            .eq('id', data.product_id)
            .single();
        
        if (productError || !product) throw new Error('Produk pembiayaan tidak ditemukan');

        const financingAmount = data.object_details.price_otr - data.object_details.down_payment;
        if (financingAmount <= 0) throw new Error('Nilai pembiayaan tidak valid (Harga < DP)');
        if (financingAmount > product.max_amount) throw new Error(`Nilai pembiayaan melebihi batas maksimal (Max: ${product.max_amount.toLocaleString()})`);
        
        const tenor = data.tenor_months;
        if (tenor > product.max_tenor_months) throw new Error(`Tenor melebihi batas maksimal (${product.max_tenor_months} bulan)`);

        // 2. Create Loan Application
        const { data: app, error: appError } = await this.supabase
            .from('loan_applications')
            .insert({
                koperasi_id: data.koperasi_id,
                member_id: data.member_id,
                product_id: data.product_id,
                amount: financingAmount,
                tenor_months: tenor,
                purpose: `Pembiayaan ${data.object_details.category}: ${data.object_details.name}`,
                status: 'submitted',
                created_by: data.created_by
            })
            .select()
            .single();

        if (appError) throw appError;

        // 3. Create Financing Object Detail
        const { error: objError } = await this.supabase
            .from('financing_objects')
            .insert({
                koperasi_id: data.koperasi_id,
                application_id: app.id,
                supplier_id: data.object_details.supplier_id,
                category: data.object_details.category,
                name: data.object_details.name,
                condition: data.object_details.condition,
                price_otr: data.object_details.price_otr,
                down_payment: data.object_details.down_payment,
                financing_amount: financingAmount,
                attributes: data.object_details.attributes,
                description: data.object_details.description
            });

        if (objError) {
            // Rollback application if object creation fails (manual rollback since no transactions in Supabase JS yet without RPC)
            await this.supabase.from('loan_applications').delete().eq('id', app.id);
            throw objError;
        }

        return app;
    }

    async getMemberFinancing(memberId: string) {
        // Fetch applications that have financing objects
        const { data, error } = await this.supabase
            .from('loan_applications')
            .select(`
                *,
                product:loan_products(*),
                financing_object:financing_objects(*)
            `)
            .eq('member_id', memberId)
            .not('financing_object', 'is', null) // Only those with financing objects
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Also fetch active loans that are financing
        const { data: loans, error: loansError } = await this.supabase
            .from('loans')
            .select(`
                *,
                product:loan_products(*),
                financing_object:financing_objects(*)
            `)
            .eq('member_id', memberId)
            .not('financing_object', 'is', null);

        if (loansError) throw loansError;

        return { applications: data, active_financing: loans };
    }
}
