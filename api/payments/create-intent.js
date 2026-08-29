/**
 * /api/payments/create-intent.js
 * Vercel Serverless Function — Create Stripe PaymentIntent for Government License Fee.
 * POST body: { amount, currency, requirementId, requirementName, businessName }
 * Response:  { clientSecret, paymentIntentId, amount, currency }
 */
import Stripe from 'stripe';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET) : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, currency = 'usd', requirementId, requirementName, businessName } = req.body || {};

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'A valid payment amount is required' });
  }

  try {
    // Stripe expects amounts in the smallest currency unit (e.g. cents for USD, paise for INR)
    const normalizedCurrency = (currency || 'usd').toLowerCase();
    const multiplier = ['jpy', 'krw'].includes(normalizedCurrency) ? 1 : 100;
    if (!stripe) {
      // In local dev/sandbox when env var is not set, provide simulated client_secret
      return res.status(200).json({
        clientSecret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`,
        paymentIntentId: `pi_mock_${Date.now()}`,
        amount: Math.round(Number(amount) * 100),
        currency: (currency || 'usd').toLowerCase(),
        mock: true,
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: normalizedCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
      description: `DockIt Government Fee: ${requirementName || 'Business License'} · ${businessName || 'Business'}`,
      metadata: {
        platform: 'DockIt Compliance Engine',
        requirement_id: String(requirementId || 'N/A'),
        requirement_name: String(requirementName || 'Government Permit'),
        business_name: String(businessName || 'Business Client'),
        environment: 'sandbox_test_mode'
      }
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });
  } catch (err) {
    console.error('[/api/payments/create-intent error]:', err);
    return res.status(500).json({
      error: err.message || 'Failed to initialize Stripe PaymentIntent'
    });
  }
}
