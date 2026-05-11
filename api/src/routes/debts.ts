import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db.js';
import { authMiddleware, requireStoreId } from '../middleware/auth.js';
import { buildScheduleDates, splitAmount } from '../lib/schedule.js';
import type { AppVariables } from '../types.js';

export const debtRoutes = new Hono<{ Variables: AppVariables }>();
debtRoutes.use('*', authMiddleware);

debtRoutes.get('/', async (c) => {
  const storeId = requireStoreId(c);
  const customerId = c.req.query('customerId') || undefined;
  const status = c.req.query('status') as 'ACTIVE' | 'CLOSED' | undefined;
  const onlyLate = c.req.query('late') === '1';

  const includeArchived = c.req.query('archived') === '1';
  const debts = await prisma.debt.findMany({
    where: { storeId, customerId, status, ...(includeArchived ? {} : { archivedAt: null }) },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      schedule: { orderBy: { seq: 'asc' } },
      payments: { select: { amount: true, paidAt: true } },
    },
  });

  const now = new Date();
  let data = debts.map((d) => {
    const totalPaid = d.payments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining = +(Number(d.amount) - totalPaid).toFixed(2);
    const lateInstallments = d.schedule.filter(
      (s) => s.status !== 'PAID' && new Date(s.dueDate) < now,
    ).length;
    const nextInstallment = d.schedule.find((s) => s.status !== 'PAID');
    const lastPayment = d.payments.length
      ? d.payments.reduce((a, b) => (a.paidAt > b.paidAt ? a : b))
      : null;
    return {
      id: d.id,
      customer: d.customer,
      amount: Number(d.amount),
      description: d.description,
      debtDate: d.debtDate,
      dueDate: d.dueDate,
      type: d.type,
      freq: d.freq,
      installments: d.installments,
      status: d.status,
      totalPaid: +totalPaid.toFixed(2),
      remaining,
      lateInstallments,
      isLate: lateInstallments > 0,
      nextInstallment,
      lastPaymentAt: lastPayment?.paidAt ?? null,
      createdAt: d.createdAt,
    };
  });
  if (onlyLate) data = data.filter((d) => d.isLate);
  return c.json({ data });
});

const createDebtSchema = z
  .object({
    customerId: z.string().min(1),
    amount: z.number().positive(),
    description: z.string().optional().nullable(),
    debtDate: z.string(),
    dueDate: z.string().optional().nullable(),
    type: z.enum(['FULL', 'INSTALLMENT']),
    freq: z.enum(['WEEKLY', 'MONTHLY']).optional(),
    installments: z.number().int().positive().optional(),
  })
  .refine((d) => d.type === 'FULL' || (d.freq && d.installments && d.installments >= 1), {
    message: 'يجب تحديد التكرار وعدد الأقساط لنوع INSTALLMENT',
  });

debtRoutes.post('/', zValidator('json', createDebtSchema), async (c) => {
  const storeId = requireStoreId(c);
  const data = c.req.valid('json');
  const customer = await prisma.customer.findFirst({ where: { id: data.customerId, storeId } });
  if (!customer) return c.json({ error: 'الزبون غير موجود' }, 404);

  const debt = await prisma.$transaction(async (tx) => {
    const created = await tx.debt.create({
      data: {
        storeId,
        customerId: data.customerId,
        amount: data.amount,
        description: data.description,
        debtDate: new Date(data.debtDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        type: data.type,
        freq: data.type === 'INSTALLMENT' ? data.freq! : null,
        installments: data.type === 'INSTALLMENT' ? data.installments! : null,
      },
    });

    if (data.type === 'INSTALLMENT') {
      const dates = buildScheduleDates(new Date(data.debtDate), data.installments!, data.freq!);
      const amounts = splitAmount(data.amount, data.installments!);
      await tx.installment.createMany({
        data: dates.map((dt, i) => ({
          debtId: created.id,
          seq: i + 1,
          dueDate: dt,
          amount: amounts[i],
        })),
      });
    }
    return created;
  });

  return c.json({ data: debt }, 201);
});

debtRoutes.get('/:id', async (c) => {
  const storeId = requireStoreId(c);
  const id = c.req.param('id');
  const debt = await prisma.debt.findFirst({
    where: { id, storeId },
    include: {
      customer: true,
      schedule: { orderBy: { seq: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' }, include: { recordedBy: { select: { name: true } } } },
    },
  });
  if (!debt) return c.json({ error: 'غير موجود' }, 404);
  const totalPaid = debt.payments.reduce((s, p) => s + Number(p.amount), 0);
  const now = new Date();
  return c.json({
    data: {
      ...debt,
      amount: Number(debt.amount),
      schedule: debt.schedule.map((s) => ({
        ...s,
        amount: Number(s.amount),
        paid: Number(s.paid),
        isLate: s.status !== 'PAID' && new Date(s.dueDate) < now,
      })),
      totals: {
        totalPaid: +totalPaid.toFixed(2),
        remaining: +(Number(debt.amount) - totalPaid).toFixed(2),
      },
    },
  });
});

debtRoutes.delete('/:id', async (c) => {
  const storeId = requireStoreId(c);
  const id = c.req.param('id');
  const target = await prisma.debt.findFirst({
    where: { id, storeId },
    include: { _count: { select: { payments: true } } },
  });
  if (!target) return c.json({ error: 'غير موجود' }, 404);

  // If debt has payments, soft-delete (archive) for audit trail
  if (target._count.payments > 0) {
    await prisma.debt.update({ where: { id }, data: { archivedAt: new Date() } });
    return c.json({ ok: true, archived: true });
  }
  // No payments: safe to hard-delete
  await prisma.debt.delete({ where: { id } });
  return c.json({ ok: true, archived: false });
});

// Restore archived debt
debtRoutes.post('/:id/restore', async (c) => {
  const storeId = requireStoreId(c);
  const id = c.req.param('id');
  const target = await prisma.debt.findFirst({ where: { id, storeId } });
  if (!target) return c.json({ error: 'غير موجود' }, 404);
  await prisma.debt.update({ where: { id }, data: { archivedAt: null } });
  return c.json({ ok: true });
});
