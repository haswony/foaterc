import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authMiddleware, signToken } from '../middleware/auth.js';
import type { AppVariables } from '../types.js';

export const authRoutes = new Hono<{ Variables: AppVariables }>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return c.json({ error: 'بيانات الدخول غير صحيحة' }, 401);

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return c.json({ error: 'بيانات الدخول غير صحيحة' }, 401);

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    storeId: user.storeId,
  };
  const token = signToken(payload);
  return c.json({ token, user: payload });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const u = c.get('user');
  let store = null;
  if (u.storeId) {
    store = await prisma.store.findUnique({
      where: { id: u.storeId },
      select: { id: true, name: true, currency: true, phone: true, address: true },
    });
  }
  return c.json({ user: u, store });
});

const changePwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});
authRoutes.post('/change-password', authMiddleware, zValidator('json', changePwSchema), async (c) => {
  const u = c.get('user');
  const { currentPassword, newPassword } = c.req.valid('json');
  const dbUser = await prisma.user.findUnique({ where: { id: u.id } });
  if (!dbUser) return c.json({ error: 'Unauthorized' }, 401);
  const ok = await bcrypt.compare(currentPassword, dbUser.password);
  if (!ok) return c.json({ error: 'كلمة المرور الحالية غير صحيحة' }, 400);
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: u.id }, data: { password: hashed } });
  return c.json({ ok: true });
});
