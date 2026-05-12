import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader, Empty, ShimmerTable } from '@/components/ui';
import { Download } from 'lucide-react';
import { formatDateTime, downloadCSV } from '@/lib/format';
import Money from '@/components/Money';

type Payment = {
  id: string; amount: number; paidAt: string; note: string | null;
  debt: { currency?: 'IQD' | 'USD'; customer: { id: string; name: string } };
  recordedBy: { id: string; name: string } | null;
};

export default function Payments() {
  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api<{ data: Payment[] }>('/api/payments'),
  });

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['التاريخ', 'الزبون', 'المبلغ', 'الموظف', 'ملاحظة'],
      ...(data?.data || []).map((p) => [
        new Date(p.paidAt).toISOString(), p.debt.customer.name, p.amount, p.recordedBy?.name || '', p.note || '',
      ]),
    ];
    downloadCSV('payments.csv', rows);
  };

  return (
    <div>
      <PageHeader
        title="الدفعات"
        subtitle="جميع الدفعات المستلمة"
        actions={<button className="btn-ghost" onClick={exportCSV}><Download size={16} /> تصدير CSV</button>}
      />
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="p-2"><ShimmerTable rows={5} cols={5} /></div>
        ) : data?.data.length === 0 ? (
          <Empty text="لا توجد دفعات" />
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                <th className="table-th">التاريخ</th>
                <th className="table-th">الزبون</th>
                <th className="table-th">المبلغ</th>
                <th className="table-th">الموظف</th>
                <th className="table-th">ملاحظة</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="table-td text-sm">{formatDateTime(p.paidAt)}</td>
                  <td className="table-td">
                    <Link to={`/customers/${p.debt.customer.id}`} className="text-brand-700 font-semibold hover:underline">
                      {p.debt.customer.name}
                    </Link>
                  </td>
                  <td className="table-td font-semibold text-emerald-600"><Money value={p.amount} currency={p.debt.currency} /></td>
                  <td className="table-td text-sm text-slate-500">{p.recordedBy?.name || '-'}</td>
                  <td className="table-td text-sm text-slate-500">{p.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
