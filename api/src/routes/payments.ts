import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db.js';
import { authMiddleware, requireStoreId } from '../middleware/auth.js';
import type { AppVariables } from '../types.js';

export const paymentRoutes = new Hono<{ Variables: AppVariables }>();
paymentRoutes.use('*', authMiddleware);

paymentRoutes.get('/', async (c) => {
  const storeId = requireStoreId(c);
  const debtId = c.req.query('debtId') || undefined;
  const payments = await prisma.payment.findMany({
    where: { storeId, debtId },
    orderBy: { paidAt: 'desc' },
    take: 200,
    include: {
      debt: { select: { customer: { select: { id: true, name: true } } } },
      recordedBy: { select: { id: true, name: true } },
    },
  });
  return c.json({
    data: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  });
});

const createSchema = z.object({
  debtId: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional().nullable(),
  paidAt: z.string().optional(),
});

paymentRoutes.post('/', zValidator('json', createSchema), async (c) => {
  const storeId = requireStoreId(c);
  const user = c.get('user');
  const { debtId, amount, note, paidAt } = c.req.valid('json');

  const debt = await prisma.debt.findFirst({
    where: { id: debtId, storeId },
    include: { schedule: { orderBy: { seq: 'asc' } }, payments: true },
  });
  if (!debt) return c.json({ error: 'الدين غير موجود' }, 404);

  const totalPaidBefore = debt.payments.reduce((s, p) => s + Number(p.amount), 0);
  const remainingBefore = +(Number(debt.amount) - totalPaidBefore).toFixed(2);
  if (amount > remainingBefore + 0.001) {
    return c.json({ error: `المبلغ أكبر من المتبقي (${remainingBefore})` }, 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        storeId,
        debtId,
        amount,
        note,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        recordedById: user.id,
      },
    });

    // Allocate to installments (oldest unpaid first)
    let remainingToApply = amount;
    for (const inst of debt.schedule) {
      if (remainingToApply <= 0) break;
      if (inst.status === 'PAID') continue;
      const due = +(Number(inst.amount) - Number(inst.paid)).toFixed(2);
      const apply = Math.min(due, remainingToApply);
      const newPaid = +(Number(inst.paid) + apply).toFixed(2);
      const fullyPaid = newPaid >= Number(inst.amount) - 0.001;
      await tx.installment.update({
        where: { id: inst.id },
        data: {
          paid: newPaid,
          status: fullyPaid ? 'PAID' : 'PARTIAL',
        },
      });
      remainingToApply = +(remainingToApply - apply).toFixed(2);
    }

    // Close debt if fully paid
    const totalPaidNow = totalPaidBefore + amount;
    if (totalPaidNow >= Number(debt.amount) - 0.001) {
      await tx.debt.update({ where: { id: debtId }, data: { status: 'CLOSED' } });
    }

    return payment;
  });

  return c.json({ data: { ...result, amount: Number(result.amount) } }, 201);
});

paymentRoutes.delete('/:id', async (c) => {
  const storeId = requireStoreId(c);
  const id = c.req.param('id');
  const target = await prisma.payment.findFirst({ where: { id, storeId } });
  if (!target) return c.json({ error: 'غير موجود' }, 404);
  // Note: deletion does not auto-recalc installments allocation; recommend reset/recompute as future improvement.
  await prisma.payment.delete({ where: { id } });
  return c.json({ ok: true });
});
