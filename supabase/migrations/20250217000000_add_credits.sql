-- Drop triggers first
DROP TRIGGER IF EXISTS set_updated_at ON user_credits;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all versions of get_user_credits
DROP FUNCTION IF EXISTS get_user_credits();
DROP FUNCTION IF EXISTS get_user_credits(UUID);
DROP FUNCTION IF EXISTS get_user_credits(UUID, TEXT);

-- Drop other functions
DROP FUNCTION IF EXISTS add_user_credits(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS use_user_credits(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS handle_user_registration();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres;

-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION handle_user_registration()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert initial credits for new user
    INSERT INTO user_credits (user_id, credit_type, balance)
    VALUES 
        (NEW.id, 'anonymous', 1),
        (NEW.id, 'late_submit', 0),
        (NEW.id, 'sneak_peek', 0),
        (NEW.id, 'boost', 0),
        (NEW.id, 'extra_takes', 0),
        (NEW.id, 'delete', 0);
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create or update user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    credit_type TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, credit_type)
);

-- Create function to get user credits
CREATE OR REPLACE FUNCTION get_user_credits(
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    credit_type TEXT,
    balance INTEGER
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.credit_type,
        uc.balance
    FROM user_credits uc
    WHERE uc.user_id = COALESCE(p_user_id, auth.uid());
END;
$$;

-- Create function to add credits
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_credit_type TEXT,
    p_amount INTEGER
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user_credits (user_id, credit_type, balance)
    VALUES (p_user_id, p_credit_type, p_amount)
    ON CONFLICT (user_id, credit_type)
    DO UPDATE SET 
        balance = user_credits.balance + p_amount,
        updated_at = NOW();
END;
$$;

-- Create function to use credits
CREATE OR REPLACE FUNCTION use_user_credits(
    p_user_id UUID,
    p_credit_type TEXT,
    p_amount INTEGER
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance
    FROM user_credits
    WHERE user_id = p_user_id
    AND credit_type = p_credit_type;

    -- If no credits exist or insufficient balance
    IF current_balance IS NULL OR current_balance < p_amount THEN
        RETURN FALSE;
    END IF;

    -- Update balance
    UPDATE user_credits
    SET 
        balance = balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    AND credit_type = p_credit_type;

    RETURN TRUE;
END;
$$;

-- Add RLS policies
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credits" ON user_credits;
CREATE POLICY "Users can view their own credits"
    ON user_credits FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credits" ON user_credits;
CREATE POLICY "Users can update their own credits"
    ON user_credits FOR UPDATE
    USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_registration(); 