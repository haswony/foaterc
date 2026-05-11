import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, Modal, Empty, ShimmerTable } from '@/components/ui';
import { Plus, Store as StoreIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, CURRENCIES } from '@/lib/format';
import { useConfirm } from '@/components/useConfirm';

type Store = {
  id: string;
  name: string;
  ownerName: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; customers: number; debts: number };
};

export default function Stores() {
  const qc = useQueryClient();
  const { confirm, ConfirmUI } = useConfirm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', ownerName: '', phone: '', address: '', currency: 'IQD', ownerEmail: '', ownerPassword: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api<{ data: Store[] }>('/api/stores'),
  });

  const create = useMutation({
    mutationFn: () => api('/api/stores', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success('تم إنشاء المتجر مع حساب صاحبه');
      setOpen(false);
      setForm({ name: '', ownerName: '', phone: '', address: '', currency: 'IQD', ownerEmail: '', ownerPassword: '' });
      qc.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/stores/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="المتاجر"
        subtitle="إدارة المتاجر التابعة لنظامك"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={18} /> متجر جديد
          </button>
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-2"><ShimmerTable rows={5} cols={9} /></div>
        ) : data?.data.length === 0 ? (
          <Empty text="لا توجد متاجر بعد" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">المتجر</th>
                <th className="table-th">المالك</th>
                <th className="table-th">الهاتف</th>
                <th className="table-th">العملة</th>
                <th className="table-th">المستخدمون</th>
                <th className="table-th">الزبائن</th>
                <th className="table-th">الديون</th>
                <th className="table-th">تاريخ الإنشاء</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="bg-brand-50 text-brand-700 p-1.5 rounded-lg">
                        <StoreIcon size={16} />
                      </div>
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-slate-400">{s.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">{s.ownerName || '-'}</td>
                  <td className="table-td" dir="ltr">{s.phone || '-'}</td>
                  <td className="table-td">
                    <span className="badge bg-brand-50 text-brand-700">{s.currency}</span>
                  </td>
                  <td className="table-td">{s._count.users}</td>
                  <td className="table-td">{s._count.customers}</td>
                  <td className="table-td">{s._count.debts}</td>
                  <td className="table-td text-xs">{formatDate(s.createdAt)}</td>
                  <td className="table-td">
                    <button
                      className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                      onClick={async () => {
                        if (await confirm({ title: 'حذف المتجر؟', message: 'سيتم حذف جميع بيانات المتجر وموظفيه وزبائنه وديونهم نهائياً. لا يمكن التراجع.', confirmText: 'حذف نهائي', tone: 'danger' })) del.mutate(s.id);
                      }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="إنشاء متجر جديد" size="lg">
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div>
            <label className="label">اسم المتجر *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">اسم صاحب المتجر</label>
            <input className="input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </div>
          <div>
            <label className="label">الهاتف</label>
            <input className="input" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">العنوان</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">العملة *</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label} ({c.symbol}) — {c.code}</option>
              ))}
            </select>
          </div>
          <div className="col-span-full border-t pt-3 mt-2">
            <div className="text-sm font-semibold text-slate-700 mb-2">حساب الدخول لصاحب المتجر</div>
          </div>
          <div>
            <label className="label">البريد الإلكتروني *</label>
            <input className="input" type="email" required dir="ltr" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
          </div>
          <div>
            <label className="label">كلمة المرور *</label>
            <input className="input" type="text" required minLength={6} value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} />
          </div>
          <div className="col-span-full flex justify-end gap-2 mt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>إلغاء</button>
            <button type="submit" className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'جاري الحفظ...' : 'إنشاء'}
            </button>
          </div>
        </form>
      </Modal>
      {ConfirmUI}
    </div>
  );
}
