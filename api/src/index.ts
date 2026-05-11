import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from '@hono/node-server';
import { authRoutes } from './routes/auth.js';
import { storeRoutes } from './routes/stores.js';
import { userRoutes } from './routes/users.js';
import { customerRoutes } from './routes/customers.js';
import { debtRoutes } from './routes/debts.js';
import { paymentRoutes } from './routes/payments.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { searchRoutes } from './routes/search.js';
import type { AppVariables } from './types.js';

const app = new Hono<{ Variables: AppVariables }>();

app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map((s) => s.trim());
      if (!origin) return allowed[0];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Store-Id'],
  }),
);

app.get('/', (c) => c.json({ name: 'Debt API', ok: true }));
app.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

app.route('/api/auth', authRoutes);
app.route('/api/stores', storeRoutes);
app.route('/api/users', userRoutes);
app.route('/api/customers', customerRoutes);
app.route('/api/debts', debtRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/search', searchRoutes);

app.onError((err, c) => {
  console.error(err);
  if (err.message === 'STORE_REQUIRED') {
    return c.json({ error: 'يجب اختيار متجر أولاً' }, 400);
  }
  return c.json({ error: err.message || 'Server error' }, 500);
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

const port = Number(process.env.PORT || 4000);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 API listening on http://localhost:${info.port}`);
});
