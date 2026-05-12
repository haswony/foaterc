import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, Modal, Empty, ShimmerTable } from '@/components/ui';
import { Plus, Search, Download, MessageCircle, SlidersHorizontal, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatMoney, downloadCSV } from '@/lib/format';
import Money from '@/components/Money';
import { useConfirm } from '@/components/useConfirm';

type CurTotals = { totalDebt: number; totalPaid: number; remaining: number };
type Customer = {
  id: string; name: string; phone: string | null; address: string | null; notes: string | null;
  debtsCount: number; totalDebt: number; totalPaid: number; remaining: number;
  byCurrency?: { IQD: CurTotals; USD: CurTotals };
};

type DebtFilter = 'all' | 'with_debt' | 'no_debt' | 'paid';
type SortBy = 'name' | 'remaining_desc' | 'remaining_asc' | 'totalDebt_desc' | 'debtsCount_desc';

export default function Customers() {
  const qc = useQueryClient();
  const { confirm, ConfirmUI } = useConfirm();
  const [q, setQ] = useState('');
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [amountRange, setAmountRange] = useState<'all' | 'small' | 'medium' | 'large' | 'huge'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', q],
    queryFn: () => api<{ data: Customer[] }>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });

  // Apply client-side filters and sorting
  const filtered = (data?.data || [])
    .filter((c) => {
      if (debtFilter === 'with_debt' && c.remaining <= 0) return false;
      if (debtFilter === 'no_debt' && c.debtsCount > 0) return false;
      if (debtFilter === 'paid' && (c.debtsCount === 0 || c.remaining > 0)) return false;
      if (amountRange !== 'all') {
        const r = c.remaining;
        if (amountRange === 'small' && (r <= 0 || r >= 100000)) return false;
        if (amountRange === 'medium' && (r < 100000 || r >= 500000)) return false;
        if (amountRange === 'large' && (r < 500000 || r >= 1000000)) return false;
        if (amountRange === 'huge' && r < 1000000) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'remaining_desc': return b.remaining - a.remaining;
        case 'remaining_asc': return a.remaining - b.remaining;
        case 'totalDebt_desc': return b.totalDebt - a.totalDebt;
        case 'debtsCount_desc': return b.debtsCount - a.debtsCount;
        default: return a.name.localeCompare(b.name, 'ar');
      }
    });

  const resetFilters = () => {
    setDebtFilter('all');
    setSortBy('name');
    setAmountRange('all');
  };
  const activeFilterCount = (debtFilter !== 'all' ? 1 : 0) + (sortBy !== 'name' ? 1 : 0) + (amountRange !== 'all' ? 1 : 0);

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
      ...filtered.map((c) => [c.name, c.phone || '', c.address || '', c.totalDebt, c.totalPaid, c.remaining]),
    ];
    downloadCSV('customers.csv', rows);
  };

  const normalizePhoneForWa = (phone: string): string => {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('00')) p = p.slice(2);
    if (p.startsWith('0')) p = '964' + p.slice(1);
    return p;
  };

  const sendWhatsAppReminder = (c: Customer) => {
    const waUrl = `https://wa.me/${normalizePhoneForWa(c.phone || '')}?text=${encodeURIComponent(
      `السلام عليكم أستاذ ${c.name}، تذكير ودي بوجود دين متبقي بقيمة ${formatMoney(c.remaining)} د.ع. يرجى التواصل للسداد.`
    )}`;
    window.open(waUrl, '_blank');
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pr-9"
              placeholder="ابحث بالاسم أو الهاتف..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <SlidersHorizontal size={16} />
            فلترة
            {activeFilterCount > 0 && (
              <span className="bg-white text-brand-700 text-xs px-1.5 rounded-full font-bold min-w-[20px] text-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">حالة الديون</label>
              <select className="input" value={debtFilter} onChange={(e) => setDebtFilter(e.target.value as DebtFilter)}>
                <option value="all">الكل</option>
                <option value="with_debt">لديهم ديون غير مسددة</option>
                <option value="paid">مسددة بالكامل</option>
                <option value="no_debt">بدون ديون</option>
              </select>
            </div>
            <div>
              <label className="label">الترتيب</label>
              <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                <option value="name">الاسم (أبجدي)</option>
                <option value="remaining_desc">المتبقي (الأعلى)</option>
                <option value="remaining_asc">المتبقي (الأقل)</option>
                <option value="totalDebt_desc">إجمالي الديون (الأعلى)</option>
                <option value="debtsCount_desc">عدد الديون (الأكثر)</option>
              </select>
            </div>
            <div>
              <label className="label">حجم المتبقي</label>
              <select className="input" value={amountRange} onChange={(e) => setAmountRange(e.target.value as any)}>
                <option value="all">الكل</option>
                <option value="small">صغير (أقل من 100ألف)</option>
                <option value="medium">متوسط (100ألف - 500ألف)</option>
                <option value="large">كبير (500ألف - مليون)</option>
                <option value="huge">ضخم (أكثر من مليون)</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <div className="md:col-span-3 flex items-center justify-between pt-2">
                <div className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">{filtered.length}</span> نتيجة من أصل {data?.data.length || 0}
                </div>
                <button onClick={resetFilters} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600">
                  <X size={14} /> إعادة تعيين
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="p-2"><ShimmerTable rows={6} cols={7} /></div>
        ) : filtered.length === 0 ? (
          <Empty text={data?.data.length === 0 ? 'لا يوجد زبائن' : 'لا توجد نتائج مطابقة للفلترة'} />
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
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <Link to={`/customers/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                    {c.notes && <div className="text-xs text-slate-400">{c.notes}</div>}
                  </td>
                  <td className="table-td" dir="ltr">{c.phone || '-'}</td>
                  <td className="table-td">{c.debtsCount}</td>
                  <td className="table-td">
                    <CurrencyCell iqd={c.byCurrency?.IQD.totalDebt ?? c.totalDebt} usd={c.byCurrency?.USD.totalDebt ?? 0} />
                  </td>
                  <td className="table-td">
                    <CurrencyCell iqd={c.byCurrency?.IQD.totalPaid ?? c.totalPaid} usd={c.byCurrency?.USD.totalPaid ?? 0} tone="paid" />
                  </td>
                  <td className="table-td font-semibold">
                    <CurrencyCell iqd={c.byCurrency?.IQD.remaining ?? c.remaining} usd={c.byCurrency?.USD.remaining ?? 0} tone="remaining" />
                  </td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      {c.phone && (
                        <button onClick={() => sendWhatsAppReminder(c)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium">
                          <MessageCircle size={14} /> تواصل واتساب
                        </button>
                      )}
                      <button onClick={() => openEdit(c)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium">
                        تعديل
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
          {editing && (
            <div className="pt-4 border-t mt-4">
              <button
                type="button"
                onClick={async () => {
                  if (await confirm({ title: 'حذف الزبون؟', message: 'سيتم حذف الزبون وجميع ديونه نهائياً. هذا الإجراء لا يمكن التراجع عنه.', confirmText: 'حذف', tone: 'danger' })) {
                    del.mutate(editing.id);
                    setOpen(false);
                  }
                }}
                className="w-full btn-danger"
              >
                حذف الزبون
              </button>
            </div>
          )}
        </form>
      </Modal>
      {ConfirmUI}
    </div>
  );
}

function CurrencyCell({ iqd, usd, tone }: { iqd: number; usd: number; tone?: 'paid' | 'remaining' }) {
  const hasIQD = iqd > 0;
  const hasUSD = usd > 0;
  if (!hasIQD && !hasUSD) {
    return <span className="text-slate-400">—</span>;
  }
  const toneCls =
    tone === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : tone === 'remaining'
        ? 'bg-red-50 text-red-700 border-red-100'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <div className="flex flex-wrap gap-1.5">
      {hasIQD && (
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border ${toneCls}`}>
          <Money value={iqd} currency="IQD" />
        </span>
      )}
      {hasUSD && (
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border ${toneCls}`}>
          <Money value={usd} currency="USD" />
        </span>
      )}
    </div>
  );
}
