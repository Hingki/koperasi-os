-- Create RPC for ReportService
CREATE OR REPLACE FUNCTION get_ledger_balance_summary(p_koperasi_id uuid, p_date date)
RETURNS TABLE (
    account_id uuid,
    total_debit numeric,
    total_credit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH debit_sum AS (
        SELECT 
            account_debit as acc_id, 
            SUM(amount) as amount 
        FROM ledger_entry 
        WHERE koperasi_id = p_koperasi_id 
          AND book_date <= p_date
        GROUP BY account_debit
    ),
    credit_sum AS (
        SELECT 
            account_credit as acc_id, 
            SUM(amount) as amount 
        FROM ledger_entry 
        WHERE koperasi_id = p_koperasi_id 
          AND book_date <= p_date
        GROUP BY account_credit
    ),
    all_accounts AS (
        SELECT acc_id FROM debit_sum
        UNION
        SELECT acc_id FROM credit_sum
    )
    SELECT 
        a.acc_id,
        COALESCE(d.amount, 0) as total_debit,
        COALESCE(c.amount, 0) as total_credit
    FROM all_accounts a
    LEFT JOIN debit_sum d ON a.acc_id = d.acc_id
    LEFT JOIN credit_sum c ON a.acc_id = c.acc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ledger_balance_summary(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ledger_balance_summary(uuid, date) TO service_role;
