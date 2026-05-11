import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, Modal, Empty, ShimmerTable } from '@/components/ui';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/format';
import { useConfirm } from '@/components/useConfirm';

type User = {
  id: string; email: string; name: string;
  role: 'STORE_OWNER' | 'STAFF';
  isActive: boolean; createdAt: string;
};

export default function Users() {
  const qc = useQueryClient();
  const { confirm, ConfirmUI } = useConfirm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'STAFF' as 'STAFF' | 'STORE_OWNER' });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api<{ data: User[] }>('/api/users'),
  });

  const create = useMutation({
    mutationFn: () => api('/api/users', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success('تم إضافة الموظف');
      setOpen(false);
      setForm({ email: '', password: '', name: '', role: 'STAFF' });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="الموظفون"
        subtitle="إدارة موظفي المتجر وصلاحياتهم"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={18} /> موظف جديد
          </button>
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-2"><ShimmerTable rows={5} cols={5} /></div>
        ) : data?.data.length === 0 ? (
          <Empty text="لا يوجد موظفون" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">الاسم</th>
                <th className="table-th">البريد</th>
                <th className="table-th">الدور</th>
                <th className="table-th">تاريخ الإضافة</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium">{u.name}</td>
                  <td className="table-td" dir="ltr">{u.email}</td>
                  <td className="table-td">
                    <span className={`badge ${u.role === 'STORE_OWNER' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role === 'STORE_OWNER' ? 'صاحب المتجر' : 'موظف'}
                    </span>
                  </td>
                  <td className="table-td text-xs">{formatDate(u.createdAt)}</td>
                  <td className="table-td">
                    <button
                      className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                      onClick={async () => { if (await confirm({ title: 'حذف الموظف؟', message: 'لن يستطيع الموظف تسجيل الدخول بعد الحذف.', confirmText: 'حذف', tone: 'danger' })) del.mutate(u.id); }}
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

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة موظف جديد">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          <div>
            <label className="label">الاسم *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">البريد الإلكتروني *</label>
            <input className="input" type="email" required dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">كلمة المرور *</label>
            <input className="input" type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">الدور</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
              <option value="STAFF">موظف</option>
              <option value="STORE_OWNER">صاحب متجر</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
