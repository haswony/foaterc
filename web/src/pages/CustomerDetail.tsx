import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, RatingBadge, Empty, ShimmerCards, ShimmerTable } from '@/components/ui';
import { ArrowRight } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/format';
import Money from '@/components/Money';

export default function CustomerDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api<{ data: any }>(`/api/customers/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="..." subtitle="" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="card p-5 lg:col-span-2 space-y-4 animate-pulse">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center space-y-2">
                  <div className="h-3 w-16 bg-slate-100 rounded mx-auto" />
                  <div className="h-7 w-20 bg-slate-200 rounded mx-auto" />
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="card p-5 space-y-4 animate-pulse">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-16 w-full bg-slate-100 rounded-xl" />
          </div>
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold animate-pulse h-5 w-16 bg-slate-200 rounded" />
          <ShimmerTable rows={4} cols={6} />
        </div>
      </div>
    );
  }
  const c = data?.data;
  if (!c) return <Empty text="غير موجود" />;

  return (
    <div>
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700 mb-3">
        <ArrowRight size={14} /> العودة للزبائن
      </Link>
      <PageHeader title={c.name} subtitle={c.phone || ''} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card p-5 lg:col-span-2">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-500">إجمالي الديون</div>
              <div className="text-xl font-bold mt-1"><Money value={c.totals.totalDebt} /></div>
            </div>
            <div>
              <div className="text-xs text-slate-500">المدفوع</div>
              <div className="text-xl font-bold text-emerald-600 mt-1"><Money value={c.totals.totalPaid} /></div>
            </div>
            <div>
              <div className="text-xs text-slate-500">المتبقي</div>
              <div className="text-xl font-bold text-red-600 mt-1"><Money value={c.totals.remaining} /></div>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500 border-t pt-3">
            آخر دفعة: <span className="font-semibold">{formatDateTime(c.totals.lastPaymentAt)}</span>
            {c.address && <div className="mt-1">العنوان: {c.address}</div>}
            {c.notes && <div className="mt-1">ملاحظات: {c.notes}</div>}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm text-slate-500 mb-2">التقييم الذكي</div>
          <div className="flex items-center gap-2 mb-3">
            <RatingBadge label={c.rating.label} />
            <div className="text-2xl font-bold">{c.rating.score}/100</div>
          </div>
          <div className="text-sm text-slate-600 mb-2">
            نسبة الالتزام: <strong>{Math.round(c.rating.commitmentRate * 100)}%</strong>
          </div>
          <div className="text-sm text-slate-600 mb-3">
            مرات التأخير: <strong>{c.rating.lateCount}</strong>
          </div>
          <div className="text-sm bg-slate-50 rounded-xl p-3 text-slate-700">
            💡 {c.rating.suggestion}
          </div>
        </div>
      </div>

      <div className="card mb-4 overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold">الديون</div>
        {c.debts.length === 0 ? (
          <Empty text="لا توجد ديون" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">التاريخ</th>
                <th className="table-th">المبلغ</th>
                <th className="table-th">النوع</th>
                <th className="table-th">الوصف</th>
                <th className="table-th">الحالة</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {c.debts.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="table-td">{formatDate(d.debtDate)}</td>
                  <td className="table-td font-semibold"><Money value={d.amount} /></td>
                  <td className="table-td">
                    {d.type === 'FULL' ? 'دين' : `أقساط ${d.freq === 'WEEKLY' ? 'أسبوعية' : 'شهرية'} (${d.installments})`}
                  </td>
                  <td className="table-td text-slate-500">{d.description || '-'}</td>
                  <td className="table-td">
                    <span className={`badge ${d.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {d.status === 'CLOSED' ? 'مسددة' : 'نشطة'}
                    </span>
                  </td>
                  <td className="table-td">
                    <Link to={`/debts/${d.id}`} className="text-brand-700 hover:underline text-sm">عرض</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
