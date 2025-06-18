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
        
        // Start a transaction
        const { error: transactionError } = await supabaseClient.rpc('begin_transaction');
        if (transactionError) throw transactionError;

        try {
          // Update user's late submission status
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

          // Record credit history
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

          // Update user credits
          const { error: creditError } = await supabaseClient
            .from('user_credits')
            .upsert({
              user_id: userId,
              credit_type: 'late_submit',
              balance: 1,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,credit_type',
              count: 'balance'
            });

          if (creditError) throw creditError;

          // Commit transaction
          const { error: commitError } = await supabaseClient.rpc('commit_transaction');
          if (commitError) throw commitError;
        } catch (error) {
          // Rollback transaction on any error
          await supabaseClient.rpc('rollback_transaction');
          throw error;
        }
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