import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import type { AppVariables } from '../types.js';

export const storeRoutes = new Hono<{ Variables: AppVariables }>();

storeRoutes.use('*', authMiddleware);

// List stores (SUPER_ADMIN only)
storeRoutes.get('/', requireRole('SUPER_ADMIN'), async (c) => {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, customers: true, debts: true } },
    },
  });
  return c.json({ data: stores });
});

const createStoreSchema = z.object({
  name: z.string().min(2),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().min(1).max(8).optional(),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(6),
});

// Create a store + its owner user (SUPER_ADMIN)
storeRoutes.post('/', requireRole('SUPER_ADMIN'), zValidator('json', createStoreSchema), async (c) => {
  const body = c.req.valid('json');
  const exists = await prisma.user.findUnique({ where: { email: body.ownerEmail } });
  if (exists) return c.json({ error: 'البريد مستخدم سلفاً' }, 400);

  const hashed = await bcrypt.hash(body.ownerPassword, 10);
  const store = await prisma.$transaction(async (tx) => {
    const s = await tx.store.create({
      data: {
        name: body.name,
        ownerName: body.ownerName,
        phone: body.phone,
        address: body.address,
        currency: body.currency || 'IQD',
      },
    });
    await tx.user.create({
      data: {
        email: body.ownerEmail,
        password: hashed,
        name: body.ownerName || body.name,
        role: 'STORE_OWNER',
        storeId: s.id,
      },
    });
    return s;
  });
  return c.json({ data: store }, 201);
});

const updateStoreSchema = z.object({
  name: z.string().min(2).optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().min(1).max(8).optional(),
  isActive: z.boolean().optional(),
});

storeRoutes.patch('/:id', requireRole('SUPER_ADMIN'), zValidator('json', updateStoreSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const store = await prisma.store.update({ where: { id }, data });
  return c.json({ data: store });
});

// Subscription management (SUPER_ADMIN)
const subscriptionSchema = z.object({
  plan: z.enum(['FREE', 'MONTHLY']),
  months: z.number().int().min(1).max(60).optional(), // for MONTHLY: how many months to extend/set
  extend: z.boolean().optional(), // if true: extend from current expiry; else set from now
});

storeRoutes.post('/:id/subscription', requireRole('SUPER_ADMIN'), zValidator('json', subscriptionSchema), async (c) => {
  const id = c.req.param('id');
  const { plan, months, extend } = c.req.valid('json');
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) return c.json({ error: 'المتجر غير موجود' }, 404);

  let expiresAt: Date | null = null;
  if (plan === 'MONTHLY') {
    const n = months ?? 1;
    const base = extend && store.subscriptionExpiresAt && store.subscriptionExpiresAt > new Date()
      ? new Date(store.subscriptionExpiresAt)
      : new Date();
    base.setMonth(base.getMonth() + n);
    expiresAt = base;
  }

  const updated = await prisma.store.update({
    where: { id },
    data: { subscriptionPlan: plan, subscriptionExpiresAt: expiresAt, isActive: true },
  });
  return c.json({ data: updated });
});

storeRoutes.delete('/:id', requireRole('SUPER_ADMIN'), async (c) => {
  const id = c.req.param('id');
  await prisma.store.delete({ where: { id } });
  return c.json({ ok: true });
});
