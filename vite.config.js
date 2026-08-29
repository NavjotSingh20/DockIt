import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import Stripe from 'stripe'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-serverless-middleware',
      configureServer(server) {
        server.middlewares.use('/api/payments/create-intent', async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.statusCode = 200;
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { amount, currency = 'usd', requirementId, requirementName, businessName } = JSON.parse(body || '{}');
              const secretKey = process.env.STRIPE_SECRET_KEY;
              
              if (!secretKey) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                  clientSecret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`,
                  paymentIntentId: `pi_mock_${Date.now()}`,
                  amount: Math.round(Number(amount) * 100),
                  currency: (currency || 'usd').toLowerCase(),
                  mock: true,
                }));
                return;
              }

              const stripe = new Stripe(secretKey);
              
              const normalizedCurrency = (currency || 'usd').toLowerCase();
              const multiplier = ['jpy', 'krw'].includes(normalizedCurrency) ? 1 : 100;
              const amountInSmallestUnit = Math.round(Number(amount) * multiplier);

              const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInSmallestUnit,
                currency: normalizedCurrency,
                automatic_payment_methods: { enabled: true },
                description: `DockIt Government Fee: ${requirementName || 'Business License'} · ${businessName || 'Business'}`,
                metadata: {
                  platform: 'DockIt Compliance Engine',
                  requirement_id: String(requirementId || 'N/A'),
                  requirement_name: String(requirementName || 'Government Permit'),
                  business_name: String(businessName || 'Business Client'),
                  environment: 'sandbox_test_mode'
                }
              });

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status
              }));
            } catch (err) {
              console.error('[Vite Dev API /api/payments/create-intent error]:', err);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message || 'Failed to create PaymentIntent' }));
            }
          });
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor'
          if (id.includes('framer-motion') || id.includes('lucide-react')) return 'ui'
          if (id.includes('recharts')) return 'charts'
          if (id.includes('@supabase/supabase-js')) return 'supabase'
          if (id.includes('@google/generative-ai') || id.includes('tesseract.js')) return 'ai'
        },
      },
    },
  },
})
