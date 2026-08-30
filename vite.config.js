import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import Stripe from 'stripe'
import extractHandler from './api/ai/extract.js'
import chatHandler from './api/ai/chat.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
  process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  process.env.STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY || env.VITE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY

  return {
  plugins: [
    react(),
    {
      name: 'api-serverless-middleware',
      configureServer(server) {
        // PDF Proxy Middleware for local development
        server.middlewares.use('/api/pdf-proxy', async (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          try {
            const parsedUrl = new URL(req.url, 'http://localhost:3000');
            const targetUrl = parsedUrl.searchParams.get('url');

            if (!targetUrl) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing url query param' }));
              return;
            }

            const upstreamRes = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DockIt-Proxy/1.0',
                Accept: 'application/pdf,*/*',
              },
            });

            if (!upstreamRes.ok) {
              res.statusCode = upstreamRes.status;
              res.end(JSON.stringify({ error: `Upstream error: ${upstreamRes.status}` }));
              return;
            }

            const buf = await upstreamRes.arrayBuffer();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', buf.byteLength);
            res.statusCode = 200;
            res.end(Buffer.from(buf));
          } catch (err) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: err.message }));
          }
        });

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

        server.middlewares.use('/api/ai/extract', async (req, res) => {
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
              const parsedBody = JSON.parse(body || '{}');
              const mockReq = { method: 'POST', body: parsedBody, headers: req.headers };
              const mockRes = {
                setHeader: (k, v) => res.setHeader(k, v),
                status: (code) => {
                  res.statusCode = code;
                  return {
                    json: (data) => {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end()
                  };
                }
              };
              await extractHandler(mockReq, mockRes);
            } catch (err) {
              console.error('[Vite Dev API /api/ai/extract error]:', err);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ data: null, confidence: 0, error: err.message }));
            }
          });
        });

        server.middlewares.use('/api/ai/chat', async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
              const parsedBody = JSON.parse(body || '{}');
              const mockReq = { method: 'POST', body: parsedBody, headers: req.headers };
              const mockRes = {
                setHeader: (k, v) => res.setHeader(k, v),
                status: (code) => {
                  res.statusCode = code;
                  return {
                    json: (data) => {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end()
                  };
                }
              };
              await chatHandler(mockReq, mockRes);
            } catch (err) {
              console.error('[Vite Dev API /api/ai/chat error]:', err);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message || 'Chat service error' }));
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
    chunkSizeWarningLimit: 1600,
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
};
});
