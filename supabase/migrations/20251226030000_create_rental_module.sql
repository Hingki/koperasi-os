-- Migration: Create Rental Module Tables
-- Description: Creates tables for Rental Unit Usaha (Assets, Bookings, Returns)
-- Date: 2025-12-26

-- 1. Rental Categories
CREATE TABLE IF NOT EXISTS rental_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rental Items (Assets)
CREATE TABLE IF NOT EXISTS rental_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    category_id UUID REFERENCES rental_categories(id),
    
    name TEXT NOT NULL, -- e.g. "Toyota Avanza B 1234 CD", "Gedung Serbaguna"
    code TEXT, -- Internal Asset Code
    description TEXT,
    condition TEXT DEFAULT 'good', -- good, maintenance, damaged
    
    -- Pricing
    price_per_hour NUMERIC(15, 2) DEFAULT 0,
    price_per_day NUMERIC(15, 2) DEFAULT 0,
    
    status TEXT DEFAULT 'available', -- available, rented, maintenance
    
    image_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Rental Customers (External/Non-Member support)
-- Can be linked to 'member' table if it's a member, or standalone for public
CREATE TABLE IF NOT EXISTS rental_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID REFERENCES member(id), -- Optional link
    
    name TEXT NOT NULL,
    identity_number TEXT, -- KTP/SIM
    phone TEXT,
    address TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rental Bookings / Transactions
CREATE TABLE IF NOT EXISTS rental_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    item_id UUID NOT NULL REFERENCES rental_items(id),
    customer_id UUID NOT NULL REFERENCES rental_customers(id),
    
    booking_code TEXT NOT NULL, -- Auto-gen
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time_planned TIMESTAMPTZ NOT NULL,
    end_time_actual TIMESTAMPTZ,
    
    -- Costs
    duration_days INTEGER DEFAULT 0,
    duration_hours INTEGER DEFAULT 0,
    base_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'booked', -- booked, active (picked up), completed, cancelled
    payment_status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
    
    notes TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Rental Returns / Fines
-- Can be part of bookings, but separate table is cleaner for fines/damages
CREATE TABLE IF NOT EXISTS rental_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES rental_bookings(id),
    
    return_time TIMESTAMPTZ DEFAULT NOW(),
    condition_on_return TEXT DEFAULT 'good',
    
    late_fee NUMERIC(15, 2) DEFAULT 0,
    damage_fee NUMERIC(15, 2) DEFAULT 0,
    total_fine NUMERIC(15, 2) DEFAULT 0,
    
    notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers
DROP TRIGGER IF EXISTS handle_rental_items_updated_at ON rental_items;
CREATE TRIGGER handle_rental_items_updated_at BEFORE UPDATE ON rental_items FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_rental_bookings_updated_at ON rental_bookings;
CREATE TRIGGER handle_rental_bookings_updated_at BEFORE UPDATE ON rental_bookings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE rental_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_returns ENABLE ROW LEVEL SECURITY;

-- Simple RLS: Admins manage all, Authenticated (Members) can view available items
CREATE POLICY "Admins manage rental categories" ON rental_categories FOR ALL TO authenticated USING (
    koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
);

CREATE POLICY "Admins manage rental items" ON rental_items FOR ALL TO authenticated USING (
    koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
);
CREATE POLICY "Members view rental items" ON rental_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage rental customers" ON rental_customers FOR ALL TO authenticated USING (
    koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
);

CREATE POLICY "Admins manage rental bookings" ON rental_bookings FOR ALL TO authenticated USING (
    koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
);
CREATE POLICY "Members view own bookings" ON rental_bookings FOR SELECT TO authenticated USING (
    customer_id IN (SELECT id FROM rental_customers WHERE member_id IN (SELECT id FROM member WHERE user_id = auth.uid()))
);

CREATE POLICY "Admins manage rental returns" ON rental_returns FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM rental_bookings b WHERE b.id = rental_returns.booking_id AND b.koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()))
);
