-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON user_credits;
DROP POLICY IF EXISTS "Service role can manage all credits" ON user_credits;
DROP POLICY IF EXISTS "Users can view all takes" ON takes;
DROP POLICY IF EXISTS "Users can insert their own takes" ON takes;
DROP POLICY IF EXISTS "Users can update their own takes" ON takes;
DROP POLICY IF EXISTS "Users can delete their own takes" ON takes;
DROP POLICY IF EXISTS "Service role can manage all takes" ON takes;

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE takes ENABLE ROW LEVEL SECURITY;

-- Create simpler policies for user_credits
CREATE POLICY "Enable read access for authenticated users"
ON user_credits FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable write access for authenticated users"
ON user_credits FOR ALL
TO authenticated
USING (true);

-- Create simpler policies for takes
CREATE POLICY "Enable read access for authenticated users"
ON takes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable write access for authenticated users"
ON takes FOR ALL
TO authenticated
USING (true);

-- Grant permissions
GRANT ALL ON user_credits TO authenticated;
GRANT ALL ON takes TO authenticated;
GRANT ALL ON user_credits TO service_role;
GRANT ALL ON takes TO service_role;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_credits', 'takes'); 