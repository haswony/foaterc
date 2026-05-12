import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, StatCard, Empty, ShimmerPage, ShimmerCard, ShimmerCards } from '@/components/ui';
import Money from '@/components/Money';
import { useSettings } from '@/store/settings';
import {
  Wallet, TrendingUp, AlertTriangle, Users, Receipt, ArrowDownCircle, Activity, FileText,
  Sun, Phone, MessageCircle, Clock, ArrowLeft,
} from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/format';
import {
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
// BarChart kept only for shimmer placeholder; actual data shown as table
import { useAuthStore } from '@/store/auth';

type Summary = {
  totals: {
    totalDebt: number;
    totalPaid: number;
    remaining: number;
    customersCount: number;
    debtsCount: number;
    lateCount: number;
    lateAmount: number;
  };
  today: { collected: number; paymentsCount: number; customersServed: number };
  lateCustomers: { id: string; name: string; phone: string | null; lateCount: number; lateAmount: number; daysLate: number }[];
  dueToday: { id: string; name: string; phone: string | null; totalDue: number; debts: string[] }[];
  months: { key: string; label: string; collected: number; debts: number }[];
  recentPayments: { id: string; amount: number; paidAt: string; debt: { customer: { name: string } } }[];
  recentDebts: { id: string; amount: number; createdAt: string; customer: { name: string } }[];
};

function normalizePhoneForWa(phone: string): string {
  // Remove non-digits, drop leading 00 or +
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  // Iraqi numbers starting with 0 -> 964
  if (p.startsWith('0')) p = '964' + p.slice(1);
  return p;
}

export default function Dashboard() {
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  const user = useAuthStore((s) => s.user);
  const store = useSettings((s) => s.store);
  const { defaultCurrency, setDefaultCurrency } = useSettings();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activeStoreId],
    queryFn: () => api<{ data: Summary }>('/api/dashboard/summary'),
  });
  const t = data?.data.totals;
  const today = data?.data.today;
  const lateCustomers = data?.data.lateCustomers || [];
  const dueToday = data?.data.dueToday || [];
  const todayDate = new Date().toLocaleDateString('en-GB');

  if (isLoading) {
    return (
      <div>
        <PageHeader title="لوحة التحكم" subtitle="نظرة عامة على أداء المتجر" />
        <div className="mb-5 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-64 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="mb-6 rounded-2xl bg-slate-200 p-6 shadow-lg animate-pulse">
          <div className="h-5 w-24 bg-slate-300 rounded mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}><div className="h-3 w-16 bg-slate-300 rounded mb-1" /><div className="h-8 w-20 bg-slate-300 rounded" /></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-2 animate-pulse">
              <div className="h-3 w-16 bg-slate-100 rounded" />
              <div className="h-6 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-6 space-y-4 animate-pulse">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
          </div>
          <div className="card p-6 space-y-4 animate-pulse">
            <div className="h-5 w-32 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ShimmerCard rows={5} />
          <ShimmerCard rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="لوحة التحكم" subtitle="نظرة عامة على أداء المتجر" />

      {/* Late warning banner */}
      {(t?.lateCount ?? 0) > 0 && (
        <div className="mb-5 rounded-2xl border-2 border-red-200 bg-gradient-to-l from-red-50 to-white p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 animate-pulse">
            <AlertTriangle size={26} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-red-700 text-lg">
              لديك {t?.lateCount} قسط متأخر · بقيمة <Money value={t?.lateAmount} className="font-extrabold" />
            </div>
            <div className="text-sm text-red-600/80 mt-0.5">تواصل مع الزبائن المتأخرين أدناه للتذكير بالدفع</div>
          </div>
          <Link to="/debts?late=1" className="btn-danger flex-shrink-0">
            عرض الكل <ArrowLeft size={16} />
          </Link>
        </div>
      )}

      {/* Today panel */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sun size={22} />
            </div>
            <div>
              <h2 className="font-bold text-xl leading-tight">اليوم</h2>
              <div className="text-xs text-white/70 mt-0.5" dir="ltr">{todayDate}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
            <div className="text-xs text-white/70 mb-1.5">المبلغ المستلم</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight" dir="ltr">
              <Money value={today?.collected} />
            </div>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
            <div className="text-xs text-white/70 mb-1.5">عدد الدفعات</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight" dir="ltr">{today?.paymentsCount ?? 0}</div>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
            <div className="text-xs text-white/70 mb-1.5">زبائن تمّت خدمتهم</div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight" dir="ltr">{today?.customersServed ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { title: 'إجمالي الديون', value: <Money value={t?.totalDebt} /> },
          { title: 'المدفوع', value: <Money value={t?.totalPaid} /> },
          { title: 'المتبقي', value: <Money value={t?.remaining} /> },
          { title: 'ديون متأخرة', value: <span dir="ltr">{t?.lateCount ?? 0} · <Money value={t?.lateAmount} /></span> },
          { title: 'عدد الزبائن', value: t?.customersCount ?? 0 },
          { title: 'عدد الديون', value: t?.debtsCount ?? 0 },
        ].map((s, i) => (
          <div key={i} className="card p-4 text-center">
            <div className="text-lg text-slate-500 mb-1">{s.title}</div>
            <div className="text-xl font-extrabold" dir="ltr">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Due today alerts and monthly stats side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {dueToday.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-slate-600" />
                <h3 className="font-bold text-lg text-slate-800">تنبيهات الاستحقاق اليومي</h3>
              </div>
              <span className="badge bg-slate-100 text-slate-600" dir="ltr">{dueToday.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {dueToday.slice(0, 1).map((c) => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                  <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold flex-shrink-0">
                    {c.name.slice(0, 1)}
                  </div>
                  <Link to={`/customers/${c.id}`} className="flex-1 min-w-0">
                    <div className="font-semibold hover:text-brand-700 truncate text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5" dir="ltr">
                      {c.phone && <span>{c.phone}</span>}
                      <span>· {c.debts.length} دين</span>
                    </div>
                  </Link>
                  <div className="text-slate-700 font-extrabold flex-shrink-0">
                    <Money value={c.totalDue} />
                  </div>
                  {c.phone && (
                    <div className="flex gap-2 flex-shrink-0">
                      <a
                        href={`tel:${c.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
                      >
                        <Phone size={14} /> اتصال
                      </a>
                      <a
                        href={`https://wa.me/${normalizePhoneForWa(c.phone)}?text=${encodeURIComponent(`السلام عليكم أستاذ ${c.name}، تذكير ودي بأن موعد سداد دينكم اليوم. المبلغ المتبقي: ${formatMoney(c.totalDue)} د.ع.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium"
                      >
                        <MessageCircle size={14} /> تواصل واتساب
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {dueToday.length > 1 && (
                <div className="px-5 py-3 text-center">
                  <Link to="/debts" className="text-sm text-brand-600 font-semibold hover:underline">
                    عرض المزيد ({dueToday.length - 1} آخرين) ←
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-6">
            <Empty text="لا توجد تنبيهات لليوم" />
          </div>
        )}
        <div className="card p-6">
          <div className="font-bold text-lg mb-4 pb-3 border-b border-slate-200">عدد الديون شهرياً</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-right border-b border-slate-200">
                  <th className="pb-2 pt-1 text-sm text-slate-500 font-medium">#</th>
                  <th className="pb-2 pt-1 text-sm text-slate-500 font-medium">الشهر</th>
                  <th className="pb-2 pt-1 text-sm text-slate-500 font-medium">عدد الديون</th>
                  <th className="pb-2 pt-1 text-sm text-slate-500 font-medium">الأموال المسترجعة</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data.months || []).map((m, i) => (
                  <tr key={m.key} className="text-right border-b border-slate-100 hover:bg-slate-50 last:border-0">
                    <td className="py-3 text-sm text-slate-400" dir="ltr">{i + 1}</td>
                    <td className="py-3 text-sm font-semibold text-slate-700">{m.label}</td>
                    <td className="py-3 text-sm font-extrabold text-brand-600" dir="ltr">{m.debts}</td>
                    <td className="py-3 text-sm font-bold text-emerald-600" dir="ltr"><Money value={m.collected} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Late customers list with call/WA buttons */}
      {lateCustomers.length > 0 && (
        <div className="card mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between bg-red-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-600" />
              <h3 className="font-bold text-lg">زبائن يحتاجون للاتصال اليوم</h3>
            </div>
            <span className="badge bg-red-100 text-red-700" dir="ltr">{lateCustomers.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {lateCustomers.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                <div className="w-11 h-11 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold flex-shrink-0">
                  {c.name.slice(0, 1)}
                </div>
                <Link to={`/customers/${c.id}`} className="flex-1 min-w-0">
                  <div className="font-semibold hover:text-brand-700 truncate">{c.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5" dir="ltr">
                    {c.phone && <span>{c.phone}</span>}
                    <span className="flex items-center gap-1"><Clock size={12} /> {c.daysLate} يوم</span>
                    <span>· {c.lateCount} قسط</span>
                  </div>
                </Link>
                <div className="text-red-600 font-extrabold flex-shrink-0">
                  <Money value={c.lateAmount} />
                </div>
                {c.phone && (
                  <div className="flex gap-2 flex-shrink-0">
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-medium"
                    >
                      <Phone size={14} /> اتصال
                    </a>
                    <a
                      href={`https://wa.me/${normalizePhoneForWa(c.phone)}?text=${encodeURIComponent(`السلام عليكم أستاذ ${c.name}، تذكير ودي بوجود قسط متأخر عليكم.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium"
                    >
                      <MessageCircle size={14} /> تواصل واتساب
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6 mb-6">
        <div className="font-bold text-lg mb-4 pb-3 border-b border-slate-200">الأموال المسترجعة (آخر 6 أشهر)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-right border-b border-slate-200">
                <th className="pb-2 pt-1 text-sm text-slate-500 font-medium">#</th>
                <th className="pb-2 pt-1 text-sm text-slate-500 font-medium">الشهر</th>
                <th className="pb-2 pt-1 text-sm text-slate-500 font-medium">المبلغ المسترجع</th>
                <th className="pb-2 pt-1 text-sm text-slate-500 font-medium">عدد الديون</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data.months || []).map((m, i) => (
                <tr key={m.key} className="text-right border-b border-slate-100 hover:bg-slate-50 last:border-0">
                  <td className="py-3 text-sm text-slate-400" dir="ltr">{i + 1}</td>
                  <td className="py-3 text-sm font-semibold text-slate-700">{m.label}</td>
                  <td className="py-3 text-sm font-extrabold text-emerald-600" dir="ltr"><Money value={m.collected} /></td>
                  <td className="py-3 text-sm text-slate-600" dir="ltr">{m.debts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="font-bold text-lg mb-4 pb-3 border-b border-slate-200">آخر الدفعات</div>
          {(data?.data.recentPayments || []).length === 0 ? (
            <Empty text="لا توجد دفعات حتى الآن" />
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {data?.data.recentPayments.slice(0, 5).map((p) => (
                  <li key={p.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.debt.customer.name}</div>
                      <div className="text-xs text-slate-400" dir="ltr">{formatDate(p.paidAt)}</div>
                    </div>
                    <div className="text-emerald-600 font-extrabold"><Money value={p.amount} prefix="+" /></div>
                  </li>
                ))}
              </ul>
              {(data?.data.recentPayments.length || 0) > 5 && (
                <div className="pt-3 border-t text-center">
                  <Link to="/payments" className="text-sm text-brand-600 font-semibold hover:underline">
                    عرض المزيد ←
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
        <div className="card p-6">
          <div className="font-bold text-lg mb-4 pb-3 border-b border-slate-200">آخر الديون</div>
          {(data?.data.recentDebts || []).length === 0 ? (
            <Empty text="لا توجد ديون حتى الآن" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data?.data.recentDebts.map((d) => (
                <li key={d.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{d.customer.name}</div>
                    <div className="text-xs text-slate-400" dir="ltr">{formatDate(d.createdAt)}</div>
                  </div>
                  <div className="text-brand-700 font-extrabold"><Money value={d.amount} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}
