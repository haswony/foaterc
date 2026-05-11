export const CURRENCIES: { code: string; label: string; symbol: string }[] = [
  { code: 'IQD', label: 'دينار عراقي', symbol: 'د.ع' },
  { code: 'USD', label: 'دولار أمريكي', symbol: '$' },
  { code: 'JOD', label: 'دينار أردني', symbol: 'د.أ' },
  { code: 'SAR', label: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'AED', label: 'درهم إماراتي', symbol: 'د.إ' },
  { code: 'EGP', label: 'جنيه مصري', symbol: 'ج.م' },
  { code: 'EUR', label: 'يورو', symbol: '€' },
  { code: 'TRY', label: 'ليرة تركية', symbol: '₺' },
];

export function currencySymbol(code: string | null | undefined): string {
  if (!code) return '';
  return CURRENCIES.find((x) => x.code === code)?.symbol || code;
}

export function formatMoney(n: number | string | null | undefined): string {
  const num = Number(n || 0);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
}

export function formatMoneyWithCurrency(
  n: number | string | null | undefined,
  currency?: string | null,
): string {
  const sym = currencySymbol(currency);
  const formatted = formatMoney(n);
  return sym ? `${formatted} ${sym}` : formatted;
}

// Compact for dashboard tiles: 12,500 -> "12.5k", 1,500,000 -> "1.5M"
export function formatCompact(n: number | string | null | undefined): string {
  const num = Number(n || 0);
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return formatMoney(num);
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? '');
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
