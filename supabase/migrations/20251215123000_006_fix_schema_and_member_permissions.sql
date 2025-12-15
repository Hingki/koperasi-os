-- Ensure the public schema exists and grant usage
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant all permissions on the member table specifically
GRANT ALL ON TABLE public.member TO authenticated;
GRANT ALL ON TABLE public.member TO anon;

-- Grant all permissions on sequences for the member table (for auto-incrementing UUIDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.member;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON public.member;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.member;

-- Enable RLS on the member table
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;

-- Create a new, simple policy for insertion
CREATE POLICY "Enable insert for all authenticated users" ON public.member
  FOR INSERT
  TO authenticated
  WITH CHECK ( true );

-- Create a new, simple policy for updates
CREATE POLICY "Enable update for all users on their own profile" ON public.member
  FOR UPDATE
  TO authenticated
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );