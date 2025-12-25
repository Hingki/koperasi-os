'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { RentalService } from '@/lib/services/rental-service';

const rentalItemSchema = z.object({
    name: z.string().min(3),
    code: z.string().optional(),
    category_id: z.string().optional(),
    condition: z.enum(['good', 'maintenance', 'damaged']),
    price_per_hour: z.coerce.number().min(0),
    price_per_day: z.coerce.number().min(0),
    status: z.enum(['available', 'rented', 'maintenance']),
    description: z.string().optional(),
});

const customerSchema = z.object({
    name: z.string().min(3),
    identity_number: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    member_id: z.string().optional().nullable(),
});

const bookingSchema = z.object({
    item_id: z.string(),
    customer_id: z.string(),
    start_time: z.string(), // ISO String
    end_time_planned: z.string(), // ISO String
    notes: z.string().optional(),
});

// --- ITEMS ---

export async function getRentalItemsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
    if (!userRole?.koperasi_id) return { success: false, error: 'Koperasi context not found' };

    try {
        const { data, error } = await supabase
            .from('rental_items')
            .select(`
                *,
                category:rental_categories(name)
            `)
            .eq('koperasi_id', userRole.koperasi_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createRentalItemAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
    if (!userRole?.koperasi_id) throw new Error("No Koperasi context");

    const rawData = {
        name: formData.get('name'),
        code: formData.get('code'),
        category_id: formData.get('category_id') || null,
        condition: formData.get('condition'),
        price_per_hour: formData.get('price_per_hour'),
        price_per_day: formData.get('price_per_day'),
        status: formData.get('status'),
        description: formData.get('description'),
    };

    const validated = rentalItemSchema.parse(rawData);

    const { error } = await supabase.from('rental_items').insert({
        koperasi_id: userRole.koperasi_id,
        ...validated
    });

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/rental/items');
    redirect('/dashboard/rental/items');
}

// --- CUSTOMERS ---

export async function getRentalCustomersAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
    
    try {
        const { data, error } = await supabase
            .from('rental_customers')
            .select('*')
            .eq('koperasi_id', userRole?.koperasi_id)
            .order('name');
            
        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createRentalCustomerAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();

    const rawData = {
        name: formData.get('name'),
        identity_number: formData.get('identity_number'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        member_id: formData.get('member_id') || null,
    };

    const validated = customerSchema.parse(rawData);

    const { error } = await supabase.from('rental_customers').insert({
        koperasi_id: userRole?.koperasi_id,
        ...validated
    });

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/rental/customers');
    // Usually called via AJAX/Modal, so maybe no redirect or redirect back
    return { success: true };
}

// --- BOOKINGS ---

export async function getRentalBookingsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();

    try {
        const { data, error } = await supabase
            .from('rental_bookings')
            .select(`
                *,
                item:rental_items(name, code),
                customer:rental_customers(name, phone)
            `)
            .eq('koperasi_id', userRole?.koperasi_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createRentalBookingAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    
    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();

    const rawData = {
        item_id: formData.get('item_id'),
        customer_id: formData.get('customer_id'),
        start_time: formData.get('start_time'),
        end_time_planned: formData.get('end_time_planned'),
        notes: formData.get('notes'),
    };

    const validated = bookingSchema.parse(rawData);

    // Calculate duration and price
    const start = new Date(validated.start_time);
    const end = new Date(validated.end_time_planned);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffHours / 24);

    // Get Item Price
    const { data: item } = await supabase.from('rental_items').select('*').eq('id', validated.item_id).single();
    if (!item) throw new Error("Item not found");

    let totalPrice = 0;
    if (diffDays >= 1 && item.price_per_day > 0) {
        totalPrice = diffDays * item.price_per_day;
    } else {
        totalPrice = diffHours * item.price_per_hour;
    }

    // Generate Booking Code
    const bookingCode = `R-${Date.now().toString().slice(-6)}`;

    const { error } = await supabase.from('rental_bookings').insert({
        koperasi_id: userRole?.koperasi_id,
        booking_code: bookingCode,
        ...validated,
        duration_hours: diffHours,
        duration_days: diffDays,
        base_price: totalPrice, // Assuming no discounts yet
        total_price: totalPrice,
        status: 'booked',
        created_by: user.id
    });

    if (error) throw new Error(error.message);

    // Update Item Status
    await supabase.from('rental_items').update({ status: 'rented' }).eq('id', validated.item_id);

    revalidatePath('/dashboard/rental/bookings');
    redirect('/dashboard/rental/bookings');
}

export async function returnRentalItemAction(bookingId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const condition = formData.get('condition') as string;
    const late_fee = Number(formData.get('late_fee') || 0);
    const damage_fee = Number(formData.get('damage_fee') || 0);
    const notes = formData.get('notes') as string;

    // 1. Create Return Record
    const { error: returnError } = await supabase.from('rental_returns').insert({
        booking_id: bookingId,
        condition_on_return: condition,
        late_fee,
        damage_fee,
        total_fine: late_fee + damage_fee,
        notes,
        processed_by: user?.id
    });
    if (returnError) throw new Error(returnError.message);

    // 2. Update Booking Status
    const { data: booking } = await supabase.from('rental_bookings').select('item_id').eq('id', bookingId).single();
    
    await supabase.from('rental_bookings').update({ 
        status: 'completed', 
        end_time_actual: new Date().toISOString() 
    }).eq('id', bookingId);

    // 3. Update Item Status -> 'available' or 'maintenance' if damaged
    const newItemStatus = condition === 'damaged' ? 'maintenance' : 'available';
    if (booking?.item_id) {
        await supabase.from('rental_items').update({ status: newItemStatus }).eq('id', booking.item_id);
    }

    revalidatePath('/dashboard/rental/bookings');
    return { success: true };
}

// --- TRANSACTIONS ---

export async function createRentalTransactionAction(
  header: {
    transaction_number: string;
    customer_type: 'member' | 'general';
    member_id?: string | null;
    customer_id?: string | null;
    rental_date: string;
    return_date_plan: string;
    status: 'active' | 'booked';
    total_amount: number;
    deposit_amount: number;
    discount_amount: number;
    fine_amount: number;
    notes?: string;
  },
  items: {
    item_id: string;
    quantity: number;
    price_at_rental: number;
    duration_value: number;
    duration_unit: 'hour' | 'day';
    subtotal: number;
  }[],
  paymentAmount: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Resolve koperasi_id from user_role or metadata
  let koperasiId: string | undefined = user.user_metadata?.koperasi_id;
  if (!koperasiId) {
    const { data: role } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).maybeSingle();
    koperasiId = role?.koperasi_id;
  }
  if (!koperasiId) return { success: false, error: 'Koperasi context not found' };

  try {
    const service = new RentalService(supabase);
    const tx = await service.createRentalTransaction({
      koperasi_id: koperasiId,
      transaction_number: header.transaction_number,
      customer_type: header.customer_type,
      member_id: header.member_id || undefined,
      customer_id: header.customer_id || undefined,
      rental_date: header.rental_date,
      return_date_plan: header.return_date_plan,
      status: header.status,
      total_amount: header.total_amount,
      deposit_amount: header.deposit_amount,
      discount_amount: header.discount_amount,
      fine_amount: header.fine_amount,
      notes: header.notes,
      created_by: user.id
    }, items, paymentAmount);

    revalidatePath('/dashboard/rental/transactions');
    return { success: true, data: tx };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function returnRentalTransactionAction(
  id: string,
  returnDate: Date,
  fineAmount: number,
  notes: string,
  refundDeposit: boolean = true
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    const service = new RentalService(supabase);
    await service.returnRentalTransaction(id, returnDate, fineAmount, notes, refundDeposit, user.id);
    revalidatePath('/dashboard/rental/transactions');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
