const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:8080',
  'http://192.168.1.66:8080',
  'https://toptake.app',
  'https://www.toptake.app',
  'https://toptake.onrender.com'
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, stripe-signature');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

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
      // Get the actual price (expand to get lookup_key)
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price'] });
      const price = lineItems.data[0]?.price;
      const priceId = price?.id;
      const lookupKey = price?.lookup_key;
      
      console.log('Processing payment:', { userId, priceId, lookupKey, sessionId: session.id, mode: session.mode });
      
      // Map price LOOKUP KEYS (preferred) and legacy price IDs to credit types
      const creditMapping = {
        // Preferred lookup keys
        'credits_anonymous_10_299': { type: 'anonymous', amount: 10 },
        'credits_late_submit_5_199': { type: 'late_submit', amount: 5 },
        'credits_sneak_peek_5_399': { type: 'sneak_peek', amount: 5 },
        'credits_boost_3_499': { type: 'boost', amount: 3 },
        'credits_extra_takes_5_299': { type: 'extra_takes', amount: 5 },
        'credits_delete_5_199': { type: 'delete', amount: 5 },
        'suggestion_boost_1_299': { type: 'suggestion_boost', amount: 1 },

        // Legacy price IDs (optional, if you already created prices before)
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
      
      // Membership handling
      if ((lookupKey === 'sub_toptake_plus_monthly') && userId) {
        try {
          const creditTypes = ['anonymous', 'late_submit', 'sneak_peek', 'boost', 'extra_takes', 'delete'];
          for (const type of creditTypes) {
            await supabase.rpc('add_user_credits', { p_user_id: userId, p_credit_type: type, p_amount: 5 });
          }
          await supabase.from('purchases').insert({
            user_id: userId,
            product_type: 'membership',
            amount: 1,
            price_id: priceId,
            stripe_session_id: session.id,
            amount_paid: (session.amount_total || 0) / 100
          });
          console.log('✅ Granted TopTake+ monthly starter credits');
        } catch (err) {
          console.error('Error granting membership credits:', err);
        }

        return res.json({ received: true });
      }

      // Theme one-off purchase (record only; entitlement implementation TBD)
      if (lookupKey === 'theme_single_099' && userId) {
        try {
          const themeId = session.metadata?.theme_id || 'default_theme';
          await supabase.from('purchases').insert({
            user_id: userId,
            product_type: 'theme',
            amount: 1,
            price_id: priceId,
            stripe_session_id: session.id,
            amount_paid: (session.amount_total || 0) / 100,
            metadata: session.metadata || null
          });
          // grant entitlement
          await supabase.from('user_themes').insert({ user_id: userId, theme_id: themeId }).select();
          console.log('✅ Recorded theme purchase');
        } catch (err) {
          console.error('Error recording theme purchase:', err);
        }

        return res.json({ received: true });
      }

      const creditInfo = creditMapping[lookupKey] || creditMapping[priceId];
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

            // If suggestion_boost, record request for admin review
            if (creditInfo.type === 'suggestion_boost') {
              await supabase.from('suggestion_boosts').insert({ user_id: userId, prompt_text: session.metadata?.prompt_text || null });
            }
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

// Helper: ensure the LINDSEY 100% promo exists and return promotion_code id
async function getOrCreateLindseyPromo(isSubscription) {
  try {
    const existing = await stripe.promotionCodes.list({ code: 'LINDSEY', limit: 1 });
    if (existing.data[0]) return existing.data[0].id;
  } catch (e) {
    console.warn('Promo lookup failed, will attempt create:', e?.message);
  }
  const coupon = await stripe.coupons.create({ percent_off: 100, duration: isSubscription ? 'forever' : 'once' });
  const promo = await stripe.promotionCodes.create({ coupon: coupon.id, code: 'LINDSEY' });
  return promo.id;
}

app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, lookupKey, userId, mode, promoCode, metadata } = req.body;
  
  if ((!priceId && !lookupKey) || !userId) {
    return res.status(400).json({ error: 'Missing priceId/lookupKey or userId' });
  }
  
  try {
    let line_items;
    if (lookupKey) {
      // Retrieve price by lookup_key to avoid hardcoding IDs
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], expand: ['data.product'] });
      const price = prices.data[0];
      if (!price) return res.status(400).json({ error: 'Lookup key not found' });
      line_items = [{ price: price.id, quantity: 1 }];
    } else {
      line_items = [{ price: priceId, quantity: 1 }];
    }

    const successUrl = process.env.SUCCESS_URL || 'https://toptake.app/checkout/success';
    const cancelUrl = process.env.CANCEL_URL || 'https://toptake.app/checkout/cancel';
    const params = {
      payment_method_types: ['card'],
      line_items,
      mode: mode || 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: { priceId: priceId || '', lookupKey: lookupKey || '', ...(metadata || {}) },
      allow_promotion_codes: true,
    };

    if ((promoCode || '').toUpperCase() === 'LINDSEY') {
      const promotion_code = await getOrCreateLindseyPromo((mode || 'payment') === 'subscription');
      params.discounts = [{ promotion_code }];
    }

    const session = await stripe.checkout.sessions.create(params);
    
    console.log('Created checkout session:', { sessionId: session.id, userId, priceId, lookupKey });
    res.json({ sessionId: session.id, url: session.url });
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

// Optional: sync helper to ensure required lookup keys exist (dry-run by default)
app.post('/api/sync-products', async (req, res) => {
  const required = [
    { name: 'Anonymous Credits (10)', lookup_key: 'credits_anonymous_10_299', amount: 299, currency: 'usd' },
    { name: 'Late Submit Credits (5)', lookup_key: 'credits_late_submit_5_199', amount: 199, currency: 'usd' },
    { name: 'Sneak Peek Credits (5)', lookup_key: 'credits_sneak_peek_5_399', amount: 399, currency: 'usd' },
    { name: 'Boost Credits (3)', lookup_key: 'credits_boost_3_499', amount: 499, currency: 'usd' },
    { name: 'Extra Takes Credits (5)', lookup_key: 'credits_extra_takes_5_299', amount: 299, currency: 'usd' },
    { name: 'Delete Credits (5)', lookup_key: 'credits_delete_5_199', amount: 199, currency: 'usd' },
    { name: 'Suggestion Boost', lookup_key: 'suggestion_boost_1_299', amount: 299, currency: 'usd' },
    { name: 'Theme (single)', lookup_key: 'theme_single_099', amount: 99, currency: 'usd' },
  ];
  const sub = { name: 'TopTake+ Monthly', lookup_key: 'sub_toptake_plus_monthly', amount: 799, currency: 'usd' };

  const created = [];
  for (const r of required) {
    const existing = await stripe.prices.list({ lookup_keys: [r.lookup_key] });
    if (!existing.data.length) {
      const prod = await stripe.products.create({ name: r.name });
      const price = await stripe.prices.create({ product: prod.id, unit_amount: r.amount, currency: r.currency, lookup_key: r.lookup_key });
      created.push({ type: 'one_time', lookup_key: r.lookup_key, price: price.id });
    }
  }
  const subExisting = await stripe.prices.list({ lookup_keys: [sub.lookup_key] });
  if (!subExisting.data.length) {
    const prod = await stripe.products.create({ name: sub.name });
    const price = await stripe.prices.create({ product: prod.id, unit_amount: sub.amount, currency: sub.currency, lookup_key: sub.lookup_key, recurring: { interval: 'month' } });
    created.push({ type: 'subscription', lookup_key: sub.lookup_key, price: price.id });
  }
  res.json({ created });
});

app.get('/', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, stripe-signature');
  res.status(200).send('Stripe + Supabase backend is running.');
});

app.listen(PORT, () => {
  console.log(`🚀 Stripe backend server running on port ${PORT}`);
  console.log(`📊 Webhook endpoint: /api/stripe/webhook`);
  console.log(`💳 Checkout endpoint: /api/create-checkout-session`);
}); 