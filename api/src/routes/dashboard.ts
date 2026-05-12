import { Hono } from 'hono';
import { prisma } from '../db.js';
import { authMiddleware, getScopedStoreId } from '../middleware/auth.js';
import type { AppVariables } from '../types.js';

export const dashboardRoutes = new Hono<{ Variables: AppVariables }>();
dashboardRoutes.use('*', authMiddleware);

dashboardRoutes.get('/summary', async (c) => {
  const storeId = getScopedStoreId(c);
  const where = storeId ? { storeId } : {};

  const debtWhere: any = { ...where, archivedAt: null };
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [
    debtAgg,
    paidAgg,
    customersCount,
    debtsCount,
    recentPayments,
    recentDebts,
    schedule,
    todayPaidAgg,
    todayPaymentsCount,
    todayCustomersServed,
    lateInstallments,
    dueTodayInstallments,
    dueTodayFullDebts,
  ] = await Promise.all([
    prisma.debt.aggregate({ where: debtWhere, _sum: { amount: true } }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
    prisma.customer.count({ where: storeId ? { storeId } : {} }),
    prisma.debt.count({ where: debtWhere }),
    prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      take: 8,
      include: { debt: { select: { currency: true, customer: { select: { name: true } } } } },
    }),
    prisma.debt.findMany({
      where: debtWhere,
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { customer: { select: { name: true } } },
    }),
    prisma.installment.findMany({
      where: { debt: { ...(storeId ? { storeId } : {}), archivedAt: null } },
      select: { dueDate: true, status: true, amount: true, paid: true },
    }),
    prisma.payment.aggregate({
      where: { ...where, paidAt: { gte: startOfDay, lt: endOfDay } },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: { ...where, paidAt: { gte: startOfDay, lt: endOfDay } },
    }),
    prisma.payment.findMany({
      where: { ...where, paidAt: { gte: startOfDay, lt: endOfDay } },
      select: { debt: { select: { customerId: true } } },
      distinct: ['debtId'],
    }),
    // Late installments with customer info for the late list
    prisma.installment.findMany({
      where: {
        debt: { ...(storeId ? { storeId } : {}), archivedAt: null },
        status: { not: 'PAID' },
        dueDate: { lt: now },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
      include: {
        debt: {
          select: {
            id: true,
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    }),
    // Due today installments
    prisma.installment.findMany({
      where: {
        debt: { ...(storeId ? { storeId } : {}), archivedAt: null },
        status: { not: 'PAID' },
        dueDate: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        debt: {
          select: {
            id: true,
            type: true,
            amount: true,
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    }),
    // Due today FULL debts
    prisma.debt.findMany({
      where: {
        ...debtWhere,
        type: 'FULL',
        status: 'ACTIVE',
        dueDate: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
  ]);

  const totalDebt = Number(debtAgg._sum.amount || 0);
  const totalPaid = Number(paidAgg._sum.amount || 0);
  const remaining = +(totalDebt - totalPaid).toFixed(2);

  let lateCount = 0;
  let lateAmount = 0;
  for (const i of schedule) {
    if (i.status !== 'PAID' && new Date(i.dueDate) < now) {
      lateCount++;
      lateAmount += Number(i.amount) - Number(i.paid);
    }
  }

  // Group late installments by customer
  const lateByCustomer = new Map<
    string,
    { id: string; name: string; phone: string | null; lateCount: number; lateAmount: number; oldestDue: Date }
  >();
  for (const li of lateInstallments) {
    const c = li.debt.customer;
    const existing = lateByCustomer.get(c.id);
    const remainingAmt = Number(li.amount) - Number(li.paid);
    if (existing) {
      existing.lateCount += 1;
      existing.lateAmount += remainingAmt;
      if (li.dueDate < existing.oldestDue) existing.oldestDue = li.dueDate;
    } else {
      lateByCustomer.set(c.id, {
        id: c.id,
        name: c.name,
        phone: c.phone,
        lateCount: 1,
        lateAmount: remainingAmt,
        oldestDue: li.dueDate,
      });
    }
  }
  const lateCustomers = Array.from(lateByCustomer.values())
    .sort((a, b) => a.oldestDue.getTime() - b.oldestDue.getTime())
    .slice(0, 12)
    .map((x) => ({
      ...x,
      lateAmount: +x.lateAmount.toFixed(2),
      daysLate: Math.floor((now.getTime() - x.oldestDue.getTime()) / (24 * 60 * 60 * 1000)),
    }));

  // Process due-today data
  const dueTodayMap = new Map<string, { id: string; name: string; phone: string | null; totalDue: number; debts: string[] }>();
  
  for (const inst of dueTodayInstallments) {
    const c = inst.debt.customer;
    const existing = dueTodayMap.get(c.id);
    const remainingAmt = Number(inst.amount) - Number(inst.paid);
    if (existing) {
      existing.totalDue += remainingAmt;
      if (!existing.debts.includes(inst.debt.id)) existing.debts.push(inst.debt.id);
    } else {
      dueTodayMap.set(c.id, {
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalDue: remainingAmt,
        debts: [inst.debt.id],
      });
    }
  }
  
  for (const debt of dueTodayFullDebts) {
    const c = debt.customer;
    const existing = dueTodayMap.get(c.id);
    const remainingAmt = Number(debt.amount); // FULL debt - calculate remaining from payments
    if (existing) {
      existing.totalDue += remainingAmt;
      if (!existing.debts.includes(debt.id)) existing.debts.push(debt.id);
    } else {
      dueTodayMap.set(c.id, {
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalDue: remainingAmt,
        debts: [debt.id],
      });
    }
  }
  
  const dueToday = Array.from(dueTodayMap.values())
    .sort((a, b) => b.totalDue - a.totalDue)
    .slice(0, 12)
    .map((x) => ({
      ...x,
      totalDue: +x.totalDue.toFixed(2),
    }));

  // Monthly stats: last 6 months (collections)
  const months: { key: string; label: string; collected: number; debts: number }[] = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - k + 1, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const [pa, da] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...where, paidAt: { gte: d, lt: next } },
        _sum: { amount: true },
      }),
      prisma.debt.count({ where: { ...debtWhere, debtDate: { gte: d, lt: next } } }),
    ]);
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    months.push({
      key,
      label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      collected: Number(pa._sum.amount || 0),
      debts: da,
    });
  }

  return c.json({
    data: {
      totals: {
        totalDebt: +totalDebt.toFixed(2),
        totalPaid: +totalPaid.toFixed(2),
        remaining,
        customersCount,
        debtsCount,
        lateCount,
        lateAmount: +lateAmount.toFixed(2),
      },
      today: {
        collected: Number(todayPaidAgg._sum.amount || 0),
        paymentsCount: todayPaymentsCount,
        customersServed: todayCustomersServed.length,
      },
      months,
      lateCustomers,
      dueToday,
      recentPayments: recentPayments.map((p) => ({ ...p, amount: Number(p.amount) })),
      recentDebts: recentDebts.map((d) => ({ ...d, amount: Number(d.amount) })),
    },
  });
});
