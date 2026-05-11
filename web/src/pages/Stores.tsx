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
  subscriptionPlan: 'FREE' | 'MONTHLY';
  subscriptionExpiresAt: string | null;
  createdAt: string;
  _count: { users: number; customers: number; debts: number };
};

function subscriptionStatus(s: Store): { label: string; tone: 'free' | 'active' | 'expiring' | 'expired' | 'disabled'; daysLeft?: number } {
  if (!s.isActive) return { label: 'معطّل', tone: 'disabled' };
  if (s.subscriptionPlan === 'FREE') return { label: 'مجاني', tone: 'free' };
  if (!s.subscriptionExpiresAt) return { label: 'منتهي', tone: 'expired' };
  const ms = new Date(s.subscriptionExpiresAt).getTime() - Date.now();
  if (ms <= 0) return { label: 'منتهي', tone: 'expired' };
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return { label: `${days} يوم متبقي`, tone: days <= 7 ? 'expiring' : 'active', daysLeft: days };
}

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

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/stores/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    onSuccess: () => {
      toast.success('تم التحديث');
      qc.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Subscription modal
  const [subStore, setSubStore] = useState<Store | null>(null);
  const [subForm, setSubForm] = useState<{ plan: 'FREE' | 'MONTHLY'; months: number; extend: boolean }>({ plan: 'MONTHLY', months: 1, extend: true });

  const setSubscription = useMutation({
    mutationFn: () =>
      api(`/api/stores/${subStore!.id}/subscription`, {
        method: 'POST',
        body: JSON.stringify({
          plan: subForm.plan,
          months: subForm.plan === 'MONTHLY' ? subForm.months : undefined,
          extend: subForm.plan === 'MONTHLY' ? subForm.extend : undefined,
        }),
      }),
    onSuccess: () => {
      toast.success('تم تحديث الاشتراك');
      setSubStore(null);
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
                <th className="table-th">الاشتراك</th>
                <th className="table-th">المستخدمون</th>
                <th className="table-th">الزبائن</th>
                <th className="table-th">الديون</th>
                <th className="table-th">تاريخ الإنشاء</th>
                <th className="table-th">إجراءات</th>
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
                  <td className="table-td">{(() => {
                    const st = subscriptionStatus(s);
                    const cls = st.tone === 'free' ? 'bg-slate-100 text-slate-600'
                      : st.tone === 'active' ? 'bg-emerald-50 text-emerald-700'
                      : st.tone === 'expiring' ? 'bg-amber-50 text-amber-700'
                      : st.tone === 'expired' ? 'bg-red-50 text-red-700'
                      : 'bg-slate-200 text-slate-700';
                    return <span className={`badge ${cls}`}>{st.label}</span>;
                  })()}</td>
                  <td className="table-td">{s._count.users}</td>
                  <td className="table-td">{s._count.customers}</td>
                  <td className="table-td">{s._count.debts}</td>
                  <td className="table-td text-xs">{formatDate(s.createdAt)}</td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-medium"
                        onClick={() => { setSubStore(s); setSubForm({ plan: s.subscriptionPlan, months: 1, extend: true }); }}
                      >
                        اشتراك
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${s.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                        onClick={async () => {
                          const next = !s.isActive;
                          if (await confirm({
                            title: next ? 'تفعيل المتجر؟' : 'تعطيل المتجر؟',
                            message: next ? 'سيعود المتجر للعمل.' : 'لن يتمكن صاحب المتجر وموظفوه من تسجيل الدخول.',
                            confirmText: next ? 'تفعيل' : 'تعطيل',
                            tone: next ? 'info' : 'danger',
                          })) toggleActive.mutate({ id: s.id, isActive: next });
                        }}
                      >
                        {s.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                        onClick={async () => {
                          if (await confirm({ title: 'حذف المتجر؟', message: 'سيتم حذف جميع بيانات المتجر وموظفيه وزبائنه وديونهم نهائياً. لا يمكن التراجع.', confirmText: 'حذف نهائي', tone: 'danger' })) del.mutate(s.id);
                        }}
                      >
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

      <Modal open={!!subStore} onClose={() => setSubStore(null)} title={`إدارة اشتراك: ${subStore?.name || ''}`}>
        <form onSubmit={(e) => { e.preventDefault(); setSubscription.mutate(); }} className="space-y-4">
          {subStore?.subscriptionExpiresAt && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              <div>تاريخ الانتهاء الحالي: <span className="font-semibold" dir="ltr">{new Date(subStore.subscriptionExpiresAt).toLocaleString('ar')}</span></div>
            </div>
          )}
          <div>
            <label className="label">الخطة</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`cursor-pointer border rounded-xl p-3 text-center ${subForm.plan === 'FREE' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                <input type="radio" className="hidden" checked={subForm.plan === 'FREE'} onChange={() => setSubForm({ ...subForm, plan: 'FREE' })} />
                <div className="font-semibold">مجاني</div>
                <div className="text-xs text-slate-500">بدون تاريخ انتهاء</div>
              </label>
              <label className={`cursor-pointer border rounded-xl p-3 text-center ${subForm.plan === 'MONTHLY' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                <input type="radio" className="hidden" checked={subForm.plan === 'MONTHLY'} onChange={() => setSubForm({ ...subForm, plan: 'MONTHLY' })} />
                <div className="font-semibold">شهري</div>
                <div className="text-xs text-slate-500">ينتهي تلقائياً</div>
              </label>
            </div>
          </div>
          {subForm.plan === 'MONTHLY' && (
            <>
              <div>
                <label className="label">عدد الأشهر</label>
                <input type="number" min={1} max={60} className="input" dir="ltr" value={subForm.months} onChange={(e) => setSubForm({ ...subForm, months: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={subForm.extend} onChange={(e) => setSubForm({ ...subForm, extend: e.target.checked })} />
                <span>إضافة على المدة الحالية (إذا لم تنتهي)</span>
              </label>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setSubStore(null)}>إلغاء</button>
            <button type="submit" className="btn-primary" disabled={setSubscription.isPending}>
              {setSubscription.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </Modal>

      {ConfirmUI}
    </div>
  );
}
