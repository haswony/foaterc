import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authMiddleware, requireRole, requireStoreId } from '../middleware/auth.js';
import type { AppVariables } from '../types.js';

export const userRoutes = new Hono<{ Variables: AppVariables }>();

userRoutes.use('*', authMiddleware);

// List staff in current store (STORE_OWNER or SUPER_ADMIN scoped)
userRoutes.get('/', requireRole('STORE_OWNER', 'SUPER_ADMIN'), async (c) => {
  const storeId = requireStoreId(c);
  const users = await prisma.user.findMany({
    where: { storeId },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ data: users });
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['STORE_OWNER', 'STAFF']).default('STAFF'),
});

userRoutes.post('/', requireRole('STORE_OWNER', 'SUPER_ADMIN'), zValidator('json', createUserSchema), async (c) => {
  const storeId = requireStoreId(c);
  const data = c.req.valid('json');
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return c.json({ error: 'البريد مستخدم سلفاً' }, 400);
  const hashed = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { ...data, password: hashed, storeId },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  return c.json({ data: user }, 201);
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['STORE_OWNER', 'STAFF']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

userRoutes.patch('/:id', requireRole('STORE_OWNER', 'SUPER_ADMIN'), zValidator('json', updateUserSchema), async (c) => {
  const storeId = requireStoreId(c);
  const id = c.req.param('id');
  const target = await prisma.user.findFirst({ where: { id, storeId } });
  if (!target) return c.json({ error: 'غير موجود' }, 404);
  const data = c.req.valid('json');
  const update: Record<string, unknown> = { ...data };
  if (data.password) update.password = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.update({
    where: { id },
    data: update,
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  return c.json({ data: user });
});

userRoutes.delete('/:id', requireRole('STORE_OWNER', 'SUPER_ADMIN'), async (c) => {
  const storeId = requireStoreId(c);
  const id = c.req.param('id');
  const target = await prisma.user.findFirst({ where: { id, storeId } });
  if (!target) return c.json({ error: 'غير موجود' }, 404);
  await prisma.user.delete({ where: { id } });
  return c.json({ ok: true });
});
