-- Savings Withdrawal Requests
create table if not exists savings_withdrawal_requests (
    id uuid default gen_random_uuid() primary key,
    koperasi_id uuid references koperasi(id),
    member_id uuid references member(id),
    account_id uuid references savings_accounts(id),
    amount numeric(15,2) not null,
    bank_name text not null,
    account_number text not null,
    account_holder text not null,
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
    admin_note text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Support Tickets
create table if not exists support_tickets (
    id uuid default gen_random_uuid() primary key,
    koperasi_id uuid references koperasi(id),
    member_id uuid references member(id),
    subject text not null,
    message text not null,
    status text default 'open' check (status in ('open', 'in_progress', 'closed')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS
alter table savings_withdrawal_requests enable row level security;
alter table support_tickets enable row level security;

-- Policies for Withdrawal Requests
create policy "Members can view own requests" on savings_withdrawal_requests
    for select to authenticated using (
        member_id in (select id from member where user_id = auth.uid())
    );

create policy "Members can insert own requests" on savings_withdrawal_requests
    for insert to authenticated with check (
        member_id in (select id from member where user_id = auth.uid())
    );

create policy "Admins can view all requests" on savings_withdrawal_requests
    for select to authenticated using (
        exists (select 1 from user_role where user_id = auth.uid() and role in ('admin', 'chairman', 'manager', 'teller'))
    );

create policy "Admins can update requests" on savings_withdrawal_requests
    for update to authenticated using (
        exists (select 1 from user_role where user_id = auth.uid() and role in ('admin', 'chairman', 'manager', 'teller'))
    );

-- Policies for Support Tickets
create policy "Members can view own tickets" on support_tickets
    for select to authenticated using (
        member_id in (select id from member where user_id = auth.uid())
    );

create policy "Members can insert own tickets" on support_tickets
    for insert to authenticated with check (
        member_id in (select id from member where user_id = auth.uid())
    );

create policy "Admins can view all tickets" on support_tickets
    for select to authenticated using (
        exists (select 1 from user_role where user_id = auth.uid() and role in ('admin', 'chairman', 'manager', 'teller'))
    );

create policy "Admins can update tickets" on support_tickets
    for update to authenticated using (
        exists (select 1 from user_role where user_id = auth.uid() and role in ('admin', 'chairman', 'manager', 'teller'))
    );
