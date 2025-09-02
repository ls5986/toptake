const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const allowedOrigins = [
  'http://localhost:8080',
  'http://192.168.1.66:8080',
  'https://toptake.onrender.com',
  'https://toptake.app',
  'https://your-frontend.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// For webhook, Stripe requires the raw body
app.post('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Processing webhook event:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    
    try {
      // Get the actual price ID from line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      
      console.log('Processing payment:', { userId, priceId, sessionId: session.id });
      
      // Map price IDs to credit types and amounts
      const creditMapping = {
        'price_anonymous_1': { type: 'anonymous', amount: 1 },
        'price_anonymous_5': { type: 'anonymous', amount: 5 },
        'price_anonymous_10': { type: 'anonymous', amount: 10 },
        'price_late_submit_1': { type: 'late_submit', amount: 1 },
        'price_late_submit_3': { type: 'late_submit', amount: 3 },
        'price_sneak_peek_1': { type: 'sneak_peek', amount: 1 },
        'price_sneak_peek_5': { type: 'sneak_peek', amount: 5 },
        'price_boost_1': { type: 'boost', amount: 1 },
        'price_extra_takes_1': { type: 'extra_takes', amount: 1 },
        'price_delete_1': { type: 'delete', amount: 1 }
      };
      
      const creditInfo = creditMapping[priceId];
      if (creditInfo && userId) {
        try {
          // Use the add_user_credits function from the database
          const { error } = await supabase.rpc('add_user_credits', {
            p_user_id: userId,
            p_credit_type: creditInfo.type,
            p_amount: creditInfo.amount
          });
          
          if (error) {
            console.error('Error adding credits:', error);
            // Log to monitoring service in production
          } else {
            console.log(`✅ Added ${creditInfo.amount} ${creditInfo.type} credits to user ${userId}`);
            
            // Also log the purchase for analytics
            await supabase.from('purchases').insert({
              user_id: userId,
              product_type: creditInfo.type,
              amount: creditInfo.amount,
              price_id: priceId,
              stripe_session_id: session.id,
              amount_paid: session.amount_total / 100 // Convert from cents
            });
          }
        } catch (err) {
          console.error('Error processing credit purchase:', err);
          // In production, send to error monitoring service
        }
      } else {
        console.warn('Unknown price ID or missing user ID:', { priceId, userId });
      }
    } catch (error) {
      console.error('Error processing checkout session:', error);
      // Don't fail the webhook, but log the error
    }
  }
  
  res.json({ received: true });
});

// For all other endpoints, use JSON body
app.use(bodyParser.json());

app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, userId } = req.body;
  
  if (!priceId || !userId) {
    return res.status(400).json({ error: 'Missing priceId or userId' });
  }
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: process.env.SUCCESS_URL || 'https://your-frontend.com/success',
      cancel_url: process.env.CANCEL_URL || 'https://your-frontend.com/cancel',
      client_reference_id: userId,
      metadata: { priceId }
    });
    
    console.log('Created checkout session:', { sessionId: session.id, userId, priceId });
    res.json({ sessionId: session.id });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: err.message });
  }
});

// List all active prices and their products
app.get('/api/products', async (req, res) => {
  try {
    const prices = await stripe.prices.list({ active: true, expand: ['data.product'] });
    res.json(prices.data);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Stripe + Supabase backend is running.');
});

app.listen(PORT, () => {
  console.log(`🚀 Stripe backend server running on port ${PORT}`);
  console.log(`📊 Webhook endpoint: /api/stripe/webhook`);
  console.log(`💳 Checkout endpoint: /api/create-checkout-session`);
}); 