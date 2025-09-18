import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    )

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      
      // Handle late submission payment
      if (paymentIntent.metadata.type === 'late_submission') {
        const { userId, promptDate } = paymentIntent.metadata

        // Update user's late submission status (idempotent on user_id + prompt_date)
        const { error: submissionError } = await supabaseClient
          .from('user_late_submissions')
          .upsert({
            user_id: userId,
            prompt_date: promptDate,
            payment_id: paymentIntent.id,
            amount_paid: paymentIntent.amount / 100,
            status: 'completed',
            created_at: new Date().toISOString()
          });
        if (submissionError) throw submissionError;

        // Record credit history (safe to insert multiple rows)
        const { error: historyError } = await supabaseClient
          .from('credit_history')
          .insert({
            user_id: userId,
            credit_type: 'late_submit',
            amount: 1,
            action: 'purchase',
            price: paymentIntent.amount / 100,
            stripe_payment_id: paymentIntent.id,
            created_at: new Date().toISOString()
          });
        if (historyError) throw historyError;

        // Increment credits using RPC (idempotency handled upstream by your Stripe event replay protections)
        const { error: creditRpcError } = await supabaseClient.rpc('add_user_credits', {
          p_user_id: userId,
          p_credit_type: 'late_submit',
          p_amount: 1
        });
        if (creditRpcError) throw creditRpcError;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 