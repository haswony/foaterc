import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db.js';
import { authMiddleware, requireStoreId } from '../middleware/auth.js';
import { computeRating } from '../lib/rating.js';
import type { AppVariables } from '../types.js';

export const customerRoutes = new Hono<{ Variables: AppVariables }>();
customerRoutes.use('*', authMiddleware);

customerRoutes.get('/', async (c) => {
  const storeId = requireStoreId(c);
  const q = c.req.query('q')?.trim();
  const customers = await prisma.customer.findMany({
    where: {
      storeId,
      ...(q
        ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      debts: { select: { amount: true, currency: true, payments: { select: { amount: true } } } },
      _count: { select: { debts: true } },
    },
  });

  const data = customers.map((cu) => {
    const byCur: Record<string, { total: number; paid: number }> = { IQD: { total: 0, paid: 0 }, USD: { total: 0, paid: 0 } };
    let total = 0;
    let paid = 0;
    for (const d of cu.debts) {
      const cur = (d as any).currency || 'IQD';
      const amt = Number(d.amount);
      total += amt;
      byCur[cur] = byCur[cur] || { total: 0, paid: 0 };
      byCur[cur].total += amt;
      for (const p of d.payments) {
        const pa = Number(p.amount);
        paid += pa;
        byCur[cur].paid += pa;
      }
    }
    return {
      id: cu.id,
      name: cu.name,
      phone: cu.phone,
      address: cu.address,
      notes: cu.notes,
      createdAt: cu.createdAt,
      debtsCount: cu._count.debts,
      totalDebt: +total.toFixed(2),
      totalPaid: +paid.toFixed(2),
      remaining: +(total - paid).toFixed(2),
      byCurrency: {
        IQD: { totalDebt: +byCur.IQD.total.toFixed(2), totalPaid: +byCur.IQD.paid.toFixed(2), remaining: +(byCur.IQD.total - byCur.IQD.paid).toFixed(2) },
        USD: { totalDebt: +byCur.USD.total.toFixed(2), totalPaid: +byCur.USD.paid.toFixed(2), remaining: +(byCur.USD.total - byCur.USD.paid).toFixed(2) },
      },
    };
  });
  return c.json({ data });
});

const upsertSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

customerRoutes.post('/', zValidator('json', upsertSchema), async (c) => {
  const storeId = requireStoreId(c);
  const data = c.req.valid('json');
  const customer = await prisma.customer.create({ data: { ...data, storeId } });
  return c.json({ data: customer }, 201);
});

customerRoutes.get('/:id', async (c) => {
  const storeId = requireStoreId(c);
  const id = c.req.param('id');
  const customer = await prisma.customer.findFirst({
    where: { id, storeId },
    include: {
      debts: {
        orderBy: { createdAt: 'desc' },
        include: {
          schedule: { orderBy: { seq: 'asc' } },
          payments: { orderBy: { paidAt: 'desc' } },
        },
      },
    },
  });
  if (!customer) return c.json({ error: 'غير موجود' }, 404);

  // Compute rating from installment schedule
  const now = new Date();
  let totalInstallments = 0;
  let paidOnTime = 0;
  let latePaid = 0;
  let currentlyLate = 0;
  let lastPaymentAt: Date | null = null;

  for (const debt of customer.debts) {
    for (const inst of debt.schedule) {
      // count installments that are due (not future)
      const due = new Date(inst.dueDate);
      if (inst.status === 'PAID') {
        totalInstallments++;
        // if updatedAt > dueDate consider late
        if (inst.updatedAt > inst.dueDate) latePaid++;
        else paidOnTime++;
      } else if (due < now) {
        totalInstallments++;
        currentlyLate++;
      }
    }
    for (const p of debt.payments) {
      if (!lastPaymentAt || p.paidAt > lastPaymentAt) lastPaymentAt = p.paidAt;
    }
  }

  const rating = computeRating({ totalInstallments, paidOnTime, latePaid, currentlyLate });

  // Totals
  let total = 0;
  let paid = 0;
  for (const d of customer.debts) {
    total += Number(d.amount);
    for (const p of d.payments) paid += Number(p.amount);
  }

  return c.json({
    data: {
      ...customer,
      totals: {
        totalDebt: +total.toFixed(2),
        totalPaid: +paid.toFixed(2),
        remaining: +(total - paid).toFixed(2),
        lastPaymentAt,
      },
      rating,
    },
  });
});

customerRoutes.patch('/:id', zValidator('json', upsertSchema.partial()), async (c) => {
  const storeId = requireStoreId(c);
  const id = c.req.param('id');
  const target = await prisma.customer.findFirst({ where: { id, storeId } });
  if (!target) return c.json({ error: 'غير موجود' }, 404);
  const customer = await prisma.customer.update({ where: { id }, data: c.req.valid('json') });
  return c.json({ data: customer });
});

customerRoutes.delete('/:id', async (c) => {
  const storeId = requireStoreId(c);
  const id = c.req.param('id');
  const target = await prisma.customer.findFirst({ where: { id, storeId } });
  if (!target) return c.json({ error: 'غير موجود' }, 404);
  await prisma.customer.delete({ where: { id } });
  return c.json({ ok: true });
});
