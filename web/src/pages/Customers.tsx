import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, Modal, Empty, ShimmerTable } from '@/components/ui';
import { Plus, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatMoney, downloadCSV } from '@/lib/format';
import Money from '@/components/Money';
import { useConfirm } from '@/components/useConfirm';

type Customer = {
  id: string; name: string; phone: string | null; address: string | null; notes: string | null;
  debtsCount: number; totalDebt: number; totalPaid: number; remaining: number;
};

export default function Customers() {
  const qc = useQueryClient();
  const { confirm, ConfirmUI } = useConfirm();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', q],
    queryFn: () => api<{ data: Customer[] }>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api(`/api/customers/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) })
        : api('/api/customers', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success('تم الحفظ');
      setOpen(false); setEditing(null);
      setForm({ name: '', phone: '', address: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['customers'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', phone: '', address: '', notes: '' });
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', notes: c.notes || '' });
    setOpen(true);
  };

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['الاسم', 'الهاتف', 'العنوان', 'إجمالي الديون', 'المدفوع', 'المتبقي'],
      ...(data?.data || []).map((c) => [c.name, c.phone || '', c.address || '', c.totalDebt, c.totalPaid, c.remaining]),
    ];
    downloadCSV('customers.csv', rows);
  };

  return (
    <div>
      <PageHeader
        title="الزبائن"
        subtitle="إدارة بيانات الزبائن"
        actions={
          <>
            <button className="btn-ghost" onClick={exportCSV}><Download size={16} /> تصدير CSV</button>
            <button className="btn-primary" onClick={openCreate}><Plus size={18} /> زبون جديد</button>
          </>
        }
      />

      <div className="card mb-4 p-3">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pr-9"
            placeholder="ابحث بالاسم أو الهاتف..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="p-2"><ShimmerTable rows={6} cols={7} /></div>
        ) : data?.data.length === 0 ? (
          <Empty text="لا يوجد زبائن" />
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                <th className="table-th">الاسم</th>
                <th className="table-th">الهاتف</th>
                <th className="table-th">عدد الديون</th>
                <th className="table-th">إجمالي</th>
                <th className="table-th">مدفوع</th>
                <th className="table-th">متبقي</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <Link to={`/customers/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                    {c.notes && <div className="text-xs text-slate-400">{c.notes}</div>}
                  </td>
                  <td className="table-td" dir="ltr">{c.phone || '-'}</td>
                  <td className="table-td">{c.debtsCount}</td>
                  <td className="table-td"><Money value={c.totalDebt} /></td>
                  <td className="table-td text-emerald-600"><Money value={c.totalPaid} /></td>
                  <td className={`table-td font-semibold ${c.remaining > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    <Money value={c.remaining} />
                  </td>
                  <td className="table-td">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(c)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium">
                        تعديل
                      </button>
                      <button onClick={async () => { if (await confirm({ title: 'حذف الزبون؟', message: 'سيتم حذف الزبون وجميع ديونه نهائياً. هذا الإجراء لا يمكن التراجع عنه.', confirmText: 'حذف', tone: 'danger' })) del.mutate(c.id); }} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل زبون' : 'إضافة زبون جديد'}>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <div>
            <label className="label">الاسم *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">الهاتف</label>
            <input className="input" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">العنوان</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>إلغاء</button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>
              {save.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </Modal>
      {ConfirmUI}
    </div>
  );
}
