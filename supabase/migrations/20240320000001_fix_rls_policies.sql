-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON user_credits;
DROP POLICY IF EXISTS "Service role can manage all credits" ON user_credits;

-- Enable RLS on tables if not already enabled
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE takes ENABLE ROW LEVEL SECURITY;

-- Create new policies for user_credits
CREATE POLICY "Users can view their own credits"
  ON user_credits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
  ON user_credits
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all credits"
  ON user_credits
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for takes table
CREATE POLICY "Users can view all takes"
  ON takes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own takes"
  ON takes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own takes"
  ON takes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own takes"
  ON takes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all takes"
  ON takes
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant necessary permissions
GRANT SELECT, UPDATE ON user_credits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON takes TO authenticated;
GRANT ALL ON user_credits TO service_role;
GRANT ALL ON takes TO service_role; 