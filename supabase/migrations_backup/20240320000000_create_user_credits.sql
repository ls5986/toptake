-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_type TEXT NOT NULL,
  balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, credit_type)
);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create function to check expired credits
CREATE OR REPLACE FUNCTION check_expired_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update expired credits logic here
  -- This is a placeholder for the actual expiration logic
END;
$$;

-- Create function to get credit history
CREATE OR REPLACE FUNCTION get_credit_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  credit_type TEXT,
  amount INTEGER,
  action TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  related_purchase_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM credit_history
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$; 