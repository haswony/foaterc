import { useCurrency } from '@/store/settings';
import { formatMoney, currencySymbol } from '@/lib/format';

export default function Money({
  value,
  className = '',
  showSymbol = true,
  prefix,
  currency,
}: {
  value: number | string | null | undefined;
  className?: string;
  showSymbol?: boolean;
  prefix?: string;
  currency?: string | null;
}) {
  const cur = currency || useCurrency();
  const sym = showSymbol ? currencySymbol(cur) : '';
  return (
    <span className={className} dir="ltr" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
      {prefix}
      {formatMoney(value)}
      {sym && <span className="text-[0.85em] mx-1 opacity-70">{sym}</span>}
    </span>
  );
}
