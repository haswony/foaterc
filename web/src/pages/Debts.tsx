import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, Modal, Empty, ShimmerTable } from '@/components/ui';
import { Plus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/format';
import Money from '@/components/Money';
import { useConfirm } from '@/components/useConfirm';

type Debt = {
  id: string;
  customer: { id: string; name: string; phone: string | null };
  amount: number;
  description: string | null;
  debtDate: string;
  dueDate: string | null;
  type: 'FULL' | 'INSTALLMENT';
  freq: 'WEEKLY' | 'MONTHLY' | null;
  installments: number | null;
  status: 'ACTIVE' | 'CLOSED';
  totalPaid: number;
  remaining: number;
  lateInstallments: number;
  isLate: boolean;
};

export default function Debts() {
  const qc = useQueryClient();
  const { confirm, ConfirmUI } = useConfirm();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'late' | 'closed'>(
    searchParams.get('late') === '1' ? 'late' : 'all',
  );
  useEffect(() => {
    if (searchParams.get('late') === '1') setFilter('late');
  }, [searchParams]);
  const [form, setForm] = useState({
    customerId: '',
    amount: '',
    description: '',
    debtDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    type: 'FULL' as 'FULL' | 'INSTALLMENT',
    freq: 'MONTHLY' as 'WEEKLY' | 'MONTHLY',
    installments: 3,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['debts', filter],
    queryFn: () =>
      api<{ data: Debt[] }>(
        `/api/debts${filter === 'late' ? '?late=1' : filter === 'closed' ? '?status=CLOSED' : ''}`,
      ),
  });

  const customers = useQuery({
    queryKey: ['customers', ''],
    queryFn: () => api<{ data: { id: string; name: string }[] }>('/api/customers'),
  });

  const create = useMutation({
    mutationFn: () =>
      api('/api/debts', {
        method: 'POST',
        body: JSON.stringify({
          customerId: form.customerId,
          amount: Number(form.amount),
          description: form.description || null,
          debtDate: form.debtDate,
          dueDate: form.dueDate || null,
          type: form.type,
          freq: form.type === 'INSTALLMENT' ? form.freq : undefined,
          installments: form.type === 'INSTALLMENT' ? Number(form.installments) : undefined,
        }),
      }),
    onSuccess: () => {
      toast.success('تم إضافة الدين');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/debts/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['debts'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="الديون"
        subtitle="جميع الديون النشطة والمتأخرة والمسددة"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={18} /> دين جديد
          </button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'late', 'closed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white border text-slate-600'
            }`}
          >
            {f === 'all' ? 'الكل' : f === 'late' ? 'متأخرة' : 'مسددة'}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="p-2"><ShimmerTable rows={5} cols={7} /></div>
        ) : data?.data.length === 0 ? (
          <Empty text="لا توجد ديون" />
        ) : (
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="table-th">الزبون</th>
                <th className="table-th">المبلغ</th>
                <th className="table-th">المتبقي</th>
                <th className="table-th">النوع</th>
                <th className="table-th">التاريخ</th>
                <th className="table-th">الحالة</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((d) => (
                <tr key={d.id} className={`hover:bg-slate-50 ${d.isLate ? 'bg-red-50/50' : ''}`}>
                  <td className="table-td">
                    <Link to={`/customers/${d.customer.id}`} className="font-semibold text-brand-700 hover:underline">
                      {d.customer.name}
                    </Link>
                    <div className="text-xs text-slate-400" dir="ltr">{d.customer.phone}</div>
                  </td>
                  <td className="table-td font-semibold"><Money value={d.amount} /></td>
                  <td className={`table-td font-semibold ${d.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    <Money value={d.remaining} />
                  </td>
                  <td className="table-td text-sm">
                    {d.type === 'FULL' ? 'كاملة' : `${d.freq === 'WEEKLY' ? 'أسبوعي' : 'شهري'} × ${d.installments}`}
                  </td>
                  <td className="table-td text-sm">{formatDate(d.debtDate)}</td>
                  <td className="table-td">
                    {d.isLate ? (
                      <span className="badge bg-red-50 text-red-700">
                        <AlertTriangle size={12} /> متأخر ({d.lateInstallments})
                      </span>
                    ) : d.status === 'CLOSED' ? (
                      <span className="badge bg-emerald-50 text-emerald-700">مسدد</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-600">نشط</span>
                    )}
                  </td>
                  <td className="table-td">
                    <div className="flex gap-3">
                      <Link to={`/debts/${d.id}`} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium">
                        عرض
                      </Link>
                      <button onClick={async () => { if (await confirm({ title: 'حذف الدين؟', message: 'إذا كان الدين فيه دفعات سيتم أرشفته بدل حذفه لحفظ السجل.', confirmText: 'حذف', tone: 'danger' })) del.mutate(d.id); }} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة دين جديد" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="label">الزبون *</label>
            <select className="input" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">— اختر زبون —</option>
              {customers.data?.data.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">المبلغ *</label>
            <input className="input" type="number" min={0.01} step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">تاريخ الدين *</label>
            <input className="input" type="date" required value={form.debtDate} onChange={(e) => setForm({ ...form, debtDate: e.target.value })} />
          </div>
          <div>
            <label className="label">موعد الدفع (اختياري)</label>
            <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div>
            <label className="label">نوع الدفع *</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
              <option value="FULL">دفعة كاملة</option>
              <option value="INSTALLMENT">أقساط</option>
            </select>
          </div>
          {form.type === 'INSTALLMENT' && (
            <>
              <div>
                <label className="label">التكرار</label>
                <select className="input" value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value as any })}>
                  <option value="MONTHLY">شهري</option>
                  <option value="WEEKLY">أسبوعي</option>
                </select>
              </div>
              <div>
                <label className="label">عدد الأقساط</label>
                <input className="input" type="number" min={1} value={form.installments} onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })} />
              </div>
            </>
          )}
          <div className="md:col-span-2">
            <label className="label">الوصف</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>إلغاء</button>
            <button type="submit" className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'جاري الحفظ...' : 'إضافة'}
            </button>
          </div>
        </form>
      </Modal>
      {ConfirmUI}
    </div>
  );
}
