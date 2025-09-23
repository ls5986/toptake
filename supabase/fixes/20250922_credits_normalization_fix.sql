-- Fix credit_history missing columns and ensure indexes/functions exist

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='credit_history' AND column_name='stripe_payment_id'
  ) THEN
    ALTER TABLE public.credit_history ADD COLUMN stripe_payment_id text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='credit_history' AND column_name='purchase_id'
  ) THEN
    ALTER TABLE public.credit_history ADD COLUMN purchase_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_credit_history_user_created ON public.credit_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_history_payment ON public.credit_history(stripe_payment_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='purchases') THEN
    CREATE TABLE public.purchases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      product_type text NOT NULL,
      amount integer NOT NULL DEFAULT 1,
      price_id text,
      stripe_session_id text,
      amount_paid numeric NOT NULL DEFAULT 0,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
  -- Ensure required columns exist on existing purchases table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchases' AND column_name='stripe_session_id') THEN
    ALTER TABLE public.purchases ADD COLUMN stripe_session_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchases' AND column_name='amount_paid') THEN
    ALTER TABLE public.purchases ADD COLUMN amount_paid numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchases' AND column_name='price_id') THEN
    ALTER TABLE public.purchases ADD COLUMN price_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='purchases' AND column_name='metadata') THEN
    ALTER TABLE public.purchases ADD COLUMN metadata jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uniq_purchases_stripe_session') THEN
    CREATE UNIQUE INDEX uniq_purchases_stripe_session ON public.purchases(stripe_session_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_balance_row(p_user uuid, p_type credit_type_enum)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_credits_balances(user_id, credit_type, balance)
  VALUES (p_user, p_type, 0)
  ON CONFLICT (user_id, credit_type) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.grant_credit(
  p_user uuid,
  p_type credit_type_enum,
  p_amount integer,
  p_source text DEFAULT 'purchase',
  p_description text DEFAULT NULL,
  p_purchase_id uuid DEFAULT NULL,
  p_stripe_payment_id text DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ensure_balance_row(p_user, p_type);
  IF p_stripe_payment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_history WHERE stripe_payment_id = p_stripe_payment_id
  ) THEN RETURN; END IF;
  UPDATE public.user_credits_balances SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user AND credit_type = p_type;
  INSERT INTO public.credit_history(user_id, credit_type, amount, action, description, stripe_payment_id, purchase_id)
  VALUES (p_user, p_type, p_amount, 'purchase', COALESCE(p_description, CONCAT('Granted ', p_amount, ' ', p_type,' credit(s)')), p_stripe_payment_id, p_purchase_id);
END $$;

CREATE OR REPLACE FUNCTION public.spend_credit(
  p_user uuid,
  p_type credit_type_enum,
  p_amount integer,
  p_reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance integer; BEGIN
  PERFORM public.ensure_balance_row(p_user, p_type);
  SELECT balance INTO v_balance FROM public.user_credits_balances
  WHERE user_id = p_user AND credit_type = p_type FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_amount THEN RETURN FALSE; END IF;
  UPDATE public.user_credits_balances SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user AND credit_type = p_type;
  INSERT INTO public.credit_history(user_id, credit_type, amount, action, description)
  VALUES (p_user, p_type, p_amount, 'use', COALESCE(p_reason, CONCAT('Used ', p_amount, ' ', p_type,' credit(s)')));
  RETURN TRUE;
END $$;

GRANT EXECUTE ON FUNCTION public.grant_credit(uuid,credit_type_enum,integer,text,text,uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credit(uuid,credit_type_enum,integer,text) TO anon, authenticated;


