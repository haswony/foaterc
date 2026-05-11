import type { InstallmentFreq } from '@prisma/client';

/** Computes due dates for a list of installments. */
export function buildScheduleDates(start: Date, count: number, freq: InstallmentFreq): Date[] {
  const dates: Date[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(start);
    if (freq === 'WEEKLY') d.setDate(d.getDate() + 7 * i);
    else d.setMonth(d.getMonth() + i);
    dates.push(d);
  }
  return dates;
}

/** Splits an amount into n equal parts, distributing the rounding remainder to the LAST installment. */
export function splitAmount(total: number, count: number): number[] {
  const base = Math.floor((total * 100) / count) / 100;
  const parts: number[] = Array(count).fill(base);
  const distributed = +(base * count).toFixed(2);
  const remainder = +(total - distributed).toFixed(2);
  parts[count - 1] = +(parts[count - 1] + remainder).toFixed(2);
  return parts;
}
