-- Migration: Create Rental Module Tables
-- Description: Tables for managing rental business unit (items, customers, transactions)

-- 1. Rental Items (Barang Sewa)
CREATE TABLE IF NOT EXISTS rental_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES public.koperasi(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- e.g. 'Kendaraan', 'Tenda', 'Elektronik'
    description TEXT,
    price_per_hour NUMERIC(15, 2) DEFAULT 0,
    price_per_day NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'available', -- available, rented, maintenance, lost
    condition TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Rental Customers (Penyewa Non-Anggota)
CREATE TABLE IF NOT EXISTS rental_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES public.koperasi(id),
    name VARCHAR(255) NOT NULL,
    identity_number VARCHAR(50), -- KTP/SIM
    phone VARCHAR(50),
    address TEXT,
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Rental Transactions (Sewa)
CREATE TABLE IF NOT EXISTS rental_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES public.koperasi(id),
    transaction_number VARCHAR(50) NOT NULL, -- Auto-generated e.g. RENT-20241223-001
    customer_type VARCHAR(20) NOT NULL, -- 'member' or 'general'
    member_id UUID REFERENCES public.member(id), -- If member
    customer_id UUID REFERENCES public.rental_customers(id), -- If general public
    
    rental_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    return_date_plan TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date_actual TIMESTAMP WITH TIME ZONE,
    
    status VARCHAR(20) DEFAULT 'booked', -- booked, active, returned, cancelled, overdue
    
    total_amount NUMERIC(15, 2) DEFAULT 0,
    deposit_amount NUMERIC(15, 2) DEFAULT 0,
    fine_amount NUMERIC(15, 2) DEFAULT 0, -- Denda keterlambatan/kerusakan
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    final_amount NUMERIC(15, 2) DEFAULT 0,
    
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, partial, paid
    
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Rental Transaction Items
CREATE TABLE IF NOT EXISTS rental_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.rental_transactions(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.rental_items(id),
    quantity INTEGER DEFAULT 1,
    
    price_at_rental NUMERIC(15, 2) NOT NULL, -- Price per day/hour at that time
    duration_value INTEGER NOT NULL, -- e.g. 2
    duration_unit VARCHAR(10) NOT NULL, -- 'hour', 'day'
    
    subtotal NUMERIC(15, 2) NOT NULL,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_transaction_items ENABLE ROW LEVEL SECURITY;

-- Policy: Read/Write for authenticated users in same koperasi
DROP POLICY IF EXISTS "Users can view rental items of their koperasi" ON rental_items;
CREATE POLICY "Users can view rental items of their koperasi" ON rental_items
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.user_role WHERE koperasi_id = rental_items.koperasi_id));

DROP POLICY IF EXISTS "Users can insert rental items of their koperasi" ON rental_items;
CREATE POLICY "Users can insert rental items of their koperasi" ON rental_items
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_role WHERE koperasi_id = rental_items.koperasi_id));

DROP POLICY IF EXISTS "Users can update rental items of their koperasi" ON rental_items;
CREATE POLICY "Users can update rental items of their koperasi" ON rental_items
    FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.user_role WHERE koperasi_id = rental_items.koperasi_id));

-- (Repeat specific policies or use broad authenticated check for MVP if safe, but specific is better)
-- For brevity in this interaction, assuming standard pattern:

DROP POLICY IF EXISTS "Users can manage rental customers" ON rental_customers;
CREATE POLICY "Users can manage rental customers" ON rental_customers
    USING (auth.uid() IN (SELECT user_id FROM public.user_role WHERE koperasi_id = rental_customers.koperasi_id));

DROP POLICY IF EXISTS "Users can manage rental transactions" ON rental_transactions;
CREATE POLICY "Users can manage rental transactions" ON rental_transactions
    USING (auth.uid() IN (SELECT user_id FROM public.user_role WHERE koperasi_id = rental_transactions.koperasi_id));

DROP POLICY IF EXISTS "Users can manage rental transaction items" ON rental_transaction_items;
CREATE POLICY "Users can manage rental transaction items" ON rental_transaction_items
    USING (auth.uid() IN (SELECT user_id FROM public.user_role WHERE koperasi_id = (SELECT koperasi_id FROM public.rental_transactions WHERE id = rental_transaction_items.transaction_id)));
