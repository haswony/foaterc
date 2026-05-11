import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={18} />;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 text-[15px] mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatCard({
  title,
  value,
  icon,
  tone = 'brand',
  hint,
}: {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: 'brand' | 'green' | 'amber' | 'red' | 'slate';
  hint?: string;
}) {
  const tones: Record<string, string> = {
    brand: 'text-brand-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    slate: 'text-slate-500',
  };
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {icon && (
          <div className={`flex-shrink-0 ${tones[tone]}`}>{icon}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-500">{title}</div>
          <div className="text-2xl font-extrabold mt-0.5 truncate" dir="ltr">{value}</div>
          {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
        </div>
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-xl">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-lg">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="text-center py-14 text-slate-400">
      {icon && <div className="flex justify-center mb-3 text-slate-300">{icon}</div>}
      <div className="text-[15px]">{text}</div>
    </div>
  );
}

/** Shimmer skeleton for table rows */
export function ShimmerTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="table-th">
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c} className="table-td">
                <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${Math.random() * 40 + 40}%` }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Shimmer skeleton for stat cards */
export function ShimmerCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
              <div className="h-7 w-20 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Shimmer skeleton for a single card body */
export function ShimmerCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/** Full page shimmer with header + cards + table */
export function ShimmerPage({ cards = 6, tableRows = 5, tableCols = 6 }: { cards?: number; tableRows?: number; tableCols?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-9 w-48 bg-slate-200 rounded mb-2" />
      <div className="h-5 w-64 bg-slate-100 rounded" />
      <ShimmerCards count={cards} />
      <div className="card p-0 overflow-hidden">
        <ShimmerTable rows={tableRows} cols={tableCols} />
      </div>
    </div>
  );
}

export function RatingBadge({ label }: { label: 'COMMITTED' | 'MEDIUM' | 'RISK' | 'NEW' }) {
  const map = {
    COMMITTED: { text: 'ملتزم', cls: 'bg-emerald-50 text-emerald-700' },
    MEDIUM: { text: 'متوسط', cls: 'bg-amber-50 text-amber-700' },
    RISK: { text: 'خطر', cls: 'bg-red-50 text-red-700' },
    NEW: { text: 'جديد', cls: 'bg-slate-100 text-slate-600' },
  } as const;
  const m = map[label];
  return <span className={`badge ${m.cls} text-sm px-3 py-1`}>{m.text}</span>;
}
