-- Migration: Add Marketplace, HRM, and Transport Features
-- Description: Adds tables for Marketplace, HRM (Attendance/Payroll), and Transport (Travi)
-- Date: 2025-12-26

-- ==========================================
-- 1. MARKETPLACE (Member Products)
-- ==========================================

-- Allow members to own inventory products
ALTER TABLE inventory_products 
ADD COLUMN IF NOT EXISTS owner_member_id UUID REFERENCES member(id);

ALTER TABLE inventory_products
ADD COLUMN IF NOT EXISTS is_marketplace_item BOOLEAN DEFAULT false;

-- Marketplace Orders (distinct from POS for online/member-to-member)
CREATE TABLE IF NOT EXISTS marketplace_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    buyer_member_id UUID REFERENCES member(id),
    
    total_amount NUMERIC(15,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
    shipping_address TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES marketplace_orders(id),
    product_id UUID NOT NULL REFERENCES inventory_products(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(15,2) NOT NULL,
    seller_member_id UUID REFERENCES member(id) -- For easy revenue splitting
);

-- ==========================================
-- 2. HRM (Human Resource Management)
-- ==========================================

-- Attendance (Absensi)
CREATE TABLE IF NOT EXISTS hrm_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ,
    
    status TEXT DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'leave', 'sick')),
    notes TEXT,
    location_lat NUMERIC(10, 8), -- For mobile attendance
    location_long NUMERIC(11, 8),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Payroll (Slip Gaji)
CREATE TABLE IF NOT EXISTS hrm_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    
    basic_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
    allowances NUMERIC(15,2) DEFAULT 0,
    deductions NUMERIC(15,2) DEFAULT 0, -- BPJS, Potongan Kasbon, dll
    net_salary NUMERIC(15,2) NOT NULL,
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    payment_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. TRANSPORTASI ONLINE (TRAVI)
-- ==========================================

-- Drivers
CREATE TABLE IF NOT EXISTS transport_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID NOT NULL REFERENCES member(id),
    
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('motor', 'mobil', 'pickup')),
    vehicle_plate TEXT NOT NULL,
    license_number TEXT,
    
    is_online BOOLEAN DEFAULT false,
    current_lat NUMERIC(10, 8),
    current_long NUMERIC(11, 8),
    
    status TEXT DEFAULT 'active', -- active, suspended
    rating NUMERIC(3,2) DEFAULT 5.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips
CREATE TABLE IF NOT EXISTS transport_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    passenger_member_id UUID REFERENCES member(id), -- Can be null if public guest
    driver_id UUID REFERENCES transport_drivers(id),
    
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    distance_km NUMERIC(5,2),
    
    price NUMERIC(15,2) NOT NULL,
    driver_commission NUMERIC(15,2) NOT NULL, -- Driver earnings
    koperasi_fee NUMERIC(15,2) NOT NULL, -- Platform fee
    
    status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'accepted', 'ongoing', 'completed', 'cancelled')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_trips ENABLE ROW LEVEL SECURITY;

-- Simplified RLS for development (Allow Auth Read)
CREATE POLICY "Auth read marketplace" ON marketplace_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read attendance" ON hrm_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read payroll" ON hrm_payroll FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read transport" ON transport_drivers FOR SELECT TO authenticated USING (true);
