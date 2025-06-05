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
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const priceId = session.metadata?.priceId || session.display_items?.[0]?.price?.id || session.line_items?.[0]?.price?.id;
    const userId = session.client_reference_id;
    // TODO: Map priceId to credit type and increment in Supabase
    // Example: if (priceId === 'price_late_submit') { ... }
    // await supabase.from('profiles').update({ late_submit_credits: ... }).eq('id', userId);
  }
  res.json({ received: true });
});

// For all other endpoints, use JSON body
app.use(bodyParser.json());

app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, userId } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: process.env.SUCCESS_URL || 'https://your-frontend.com/success',
      cancel_url: process.env.CANCEL_URL || 'https://your-frontend.com/cancel',
      client_reference_id: userId,
      // Optionally, add metadata: { priceId }
    });
    res.json({ sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all active prices and their products
app.get('/api/products', async (req, res) => {
  try {
    const prices = await stripe.prices.list({ active: true, expand: ['data.product'] });
    res.json(prices.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Stripe + Supabase backend is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 