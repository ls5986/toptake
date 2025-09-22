-- Credits normalization and RPCs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_type_enum') THEN
    CREATE TYPE credit_type_enum AS ENUM ('anonymous','late_submit','sneak_peek','boost','extra_takes','delete');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_credits_balances (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_type credit_type_enum NOT NULL,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, credit_type)
);

ALTER TABLE public.user_credits_balances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ucb_select_self' AND tablename='user_credits_balances') THEN
    CREATE POLICY ucb_select_self ON public.user_credits_balances FOR SELECT
      USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ucb_update_self' AND tablename='user_credits_balances') THEN
    CREATE POLICY ucb_update_self ON public.user_credits_balances FOR UPDATE
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ucb_insert_self' AND tablename='user_credits_balances') THEN
    CREATE POLICY ucb_insert_self ON public.user_credits_balances FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.credit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_type credit_type_enum NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  action text NOT NULL CHECK (action IN ('purchase','use','expire','refund')),
  description text,
  stripe_payment_id text,
  purchase_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_history_user_created ON public.credit_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_history_payment ON public.credit_history(stripe_payment_id);

ALTER TABLE public.credit_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='credit_history_select_self' AND tablename='credit_history') THEN
    CREATE POLICY credit_history_select_self ON public.credit_history FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='purchases') THEN
    CREATE TABLE public.purchases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      product_type text NOT NULL,
      amount integer NOT NULL DEFAULT 1,
      price_id text,
      stripe_session_id text UNIQUE,
      amount_paid numeric NOT NULL DEFAULT 0,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uniq_purchases_stripe_session') THEN
    CREATE UNIQUE INDEX uniq_purchases_stripe_session ON public.purchases(stripe_session_id);
  END IF;
END $$;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='purchases_select_self' AND tablename='purchases') THEN
    CREATE POLICY purchases_select_self ON public.purchases FOR SELECT
      USING (user_id = auth.uid());
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
  ) THEN
    RETURN;
  END IF;

  UPDATE public.user_credits_balances
  SET balance = balance + p_amount, updated_at = now()
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
DECLARE v_balance integer;
BEGIN
  PERFORM public.ensure_balance_row(p_user, p_type);
  SELECT balance INTO v_balance FROM public.user_credits_balances
  WHERE user_id = p_user AND credit_type = p_type FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  UPDATE public.user_credits_balances
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user AND credit_type = p_type;
  INSERT INTO public.credit_history(user_id, credit_type, amount, action, description)
  VALUES (p_user, p_type, p_amount, 'use', COALESCE(p_reason, CONCAT('Used ', p_amount, ' ', p_type,' credit(s)')));
  RETURN TRUE;
END $$;

GRANT EXECUTE ON FUNCTION public.grant_credit(uuid,credit_type_enum,integer,text,text,uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credit(uuid,credit_type_enum,integer,text) TO anon, authenticated;

-- Optional backfill from legacy table (no-op if not present)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_credits') THEN
    INSERT INTO public.user_credits_balances(user_id, credit_type, balance)
    SELECT id, 'anonymous'::credit_type_enum, COALESCE(anonymous,0) FROM public.user_credits
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_credits_balances(user_id, credit_type, balance)
    SELECT id, 'late_submit'::credit_type_enum, COALESCE(late_submit,0) FROM public.user_credits
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_credits_balances(user_id, credit_type, balance)
    SELECT id, 'sneak_peek'::credit_type_enum, COALESCE(sneak_peek,0) FROM public.user_credits
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_credits_balances(user_id, credit_type, balance)
    SELECT id, 'boost'::credit_type_enum, COALESCE(boost,0) FROM public.user_credits
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_credits_balances(user_id, credit_type, balance)
    SELECT id, 'extra_takes'::credit_type_enum, COALESCE(extra_takes,0) FROM public.user_credits
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_credits_balances(user_id, credit_type, balance)
    SELECT id, 'delete'::credit_type_enum, COALESCE(delete,0) FROM public.user_credits
    ON CONFLICT DO NOTHING;
  END IF;
END $$;


