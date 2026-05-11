import { Hono } from 'hono';
import { prisma } from '../db.js';
import { authMiddleware, requireStoreId } from '../middleware/auth.js';
import type { AppVariables } from '../types.js';

export const searchRoutes = new Hono<{ Variables: AppVariables }>();
searchRoutes.use('*', authMiddleware);

// Global search across customers + debts. Returns customers with their active debts.
searchRoutes.get('/', async (c) => {
  const storeId = requireStoreId(c);
  const q = (c.req.query('q') || '').trim();
  if (q.length < 1) return c.json({ data: [] });

  const customers = await prisma.customer.findMany({
    where: {
      storeId,
      OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }],
    },
    take: 20,
    orderBy: { name: 'asc' },
    include: {
      debts: {
        where: { archivedAt: null, status: 'ACTIVE' },
        include: {
          payments: { select: { amount: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const data = customers.map((c) => {
    const activeDebts = c.debts.map((d) => {
      const totalPaid = d.payments.reduce((s, p) => s + Number(p.amount), 0);
      const remaining = +(Number(d.amount) - totalPaid).toFixed(2);
      return {
        id: d.id,
        amount: Number(d.amount),
        remaining,
        description: d.description,
        debtDate: d.debtDate,
      };
    });
    const totalRemaining = activeDebts.reduce((s, d) => s + d.remaining, 0);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address,
      activeDebts,
      totalRemaining: +totalRemaining.toFixed(2),
    };
  });

  return c.json({ data });
});
