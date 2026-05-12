import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, Modal, Empty, ShimmerTable } from '@/components/ui';
import { Plus, AlertTriangle, Search, X, SlidersHorizontal } from 'lucide-react';
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
  currency: string | null;
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
    currency: 'IQD' as 'IQD' | 'USD',
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  // Advanced filters (select-only)
  const [typeFilter, setTypeFilter] = useState<'all' | 'FULL' | 'INSTALLMENT'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'IQD' | 'USD'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'remaining_desc'>('newest');
  const [amountRange, setAmountRange] = useState<'all' | 'small' | 'medium' | 'large' | 'huge'>('all');
  const [datePeriod, setDatePeriod] = useState<'all' | 'today' | 'week' | 'month' | 'quarter' | 'year'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['debts', filter],
    queryFn: () =>
      api<{ data: Debt[] }>(
        `/api/debts${filter === 'late' ? '?late=1' : filter === 'closed' ? '?status=CLOSED' : ''}`,
      ),
  });

  const customers = useQuery({
    queryKey: ['customers', ''],
    queryFn: () => api<{ data: { id: string; name: string; phone: string | null }[] }>('/api/customers'),
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
          currency: form.currency,
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

  // Apply advanced filters & sorting
  const periodStart = (() => {
    const d = new Date();
    if (datePeriod === 'today') { d.setHours(0, 0, 0, 0); return d; }
    if (datePeriod === 'week') { d.setDate(d.getDate() - 7); return d; }
    if (datePeriod === 'month') { d.setMonth(d.getMonth() - 1); return d; }
    if (datePeriod === 'quarter') { d.setMonth(d.getMonth() - 3); return d; }
    if (datePeriod === 'year') { d.setFullYear(d.getFullYear() - 1); return d; }
    return null;
  })();

  const filteredDebts = (data?.data || [])
    .filter((d) => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (currencyFilter !== 'all' && (d.currency || 'IQD') !== currencyFilter) return false;
      if (amountRange !== 'all') {
        const a = d.amount;
        if (amountRange === 'small' && a >= 100000) return false;
        if (amountRange === 'medium' && (a < 100000 || a >= 500000)) return false;
        if (amountRange === 'large' && (a < 500000 || a >= 1000000)) return false;
        if (amountRange === 'huge' && a < 1000000) return false;
      }
      if (periodStart && new Date(d.debtDate) < periodStart) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.debtDate).getTime() - new Date(b.debtDate).getTime();
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        case 'remaining_desc': return b.remaining - a.remaining;
        default: return new Date(b.debtDate).getTime() - new Date(a.debtDate).getTime();
      }
    });

  const advActiveCount = (typeFilter !== 'all' ? 1 : 0)
    + (currencyFilter !== 'all' ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0)
    + (amountRange !== 'all' ? 1 : 0) + (datePeriod !== 'all' ? 1 : 0);

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

      <div className="flex gap-2 mb-3 flex-wrap items-center">
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
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            showFilters || advActiveCount > 0
              ? 'bg-brand-600 text-white'
              : 'bg-white border text-slate-600 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal size={14} />
          فلترة متقدمة
          {advActiveCount > 0 && (
            <span className="bg-white text-brand-700 text-xs px-1.5 rounded-full font-bold min-w-[18px] text-center">
              {advActiveCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="label">النوع</label>
              <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                <option value="all">الكل</option>
                <option value="FULL">دين</option>
                <option value="INSTALLMENT">أقساط</option>
              </select>
            </div>
            <div>
              <label className="label">العملة</label>
              <select className="input" value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value as any)}>
                <option value="all">الكل</option>
                <option value="IQD">دينار (د.ع)</option>
                <option value="USD">دولار ($)</option>
              </select>
            </div>
            <div>
              <label className="label">الترتيب</label>
              <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="newest">الأحدث</option>
                <option value="oldest">الأقدم</option>
                <option value="amount_desc">المبلغ (الأعلى)</option>
                <option value="amount_asc">المبلغ (الأقل)</option>
                <option value="remaining_desc">المتبقي (الأعلى)</option>
              </select>
            </div>
            <div>
              <label className="label">حجم المبلغ</label>
              <select className="input" value={amountRange} onChange={(e) => setAmountRange(e.target.value as any)}>
                <option value="all">الكل</option>
                <option value="small">صغير (أقل من 100ألف)</option>
                <option value="medium">متوسط (100ألف - 500ألف)</option>
                <option value="large">كبير (500ألف - مليون)</option>
                <option value="huge">ضخم (أكثر من مليون)</option>
              </select>
            </div>
            <div>
              <label className="label">الفترة الزمنية</label>
              <select className="input" value={datePeriod} onChange={(e) => setDatePeriod(e.target.value as any)}>
                <option value="all">جميع الفترات</option>
                <option value="today">اليوم</option>
                <option value="week">آخر أسبوع</option>
                <option value="month">آخر شهر</option>
                <option value="quarter">آخر 3 أشهر</option>
                <option value="year">آخر سنة</option>
              </select>
            </div>
          </div>
          {advActiveCount > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
              <div className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{filteredDebts.length}</span> نتيجة من أصل {data?.data.length || 0}
              </div>
              <button
                onClick={() => {
                  setTypeFilter('all'); setCurrencyFilter('all');
                  setSortBy('newest'); setAmountRange('all'); setDatePeriod('all');
                }}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600"
              >
                <X size={14} /> إعادة تعيين
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="p-2"><ShimmerTable rows={5} cols={7} /></div>
        ) : filteredDebts.length === 0 ? (
          <Empty text={data?.data.length === 0 ? 'لا توجد ديون' : 'لا توجد نتائج مطابقة للفلترة'} />
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
              {filteredDebts.map((d) => (
                <tr key={d.id} className={`hover:bg-slate-50 ${d.isLate ? 'bg-red-50/50' : ''}`}>
                  <td className="table-td">
                    <Link to={`/customers/${d.customer.id}`} className="font-semibold text-brand-700 hover:underline">
                      {d.customer.name}
                    </Link>
                    <div className="text-xs text-slate-400" dir="ltr">{d.customer.phone}</div>
                  </td>
                  <td className="table-td font-semibold"><Money value={d.amount} currency={d.currency} /></td>
                  <td className={`table-td font-semibold ${d.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    <Money value={d.remaining} currency={d.currency} />
                  </td>
                  <td className="table-td text-sm">
                    {d.type === 'FULL' ? 'دين' : `${d.freq === 'WEEKLY' ? 'أسبوعي' : 'شهري'} × ${d.installments}`}
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
            <div className="relative">
              {form.customerId ? (
                <div className="input flex items-center justify-between gap-2 bg-slate-50">
                  <span className="font-medium">
                    {customers.data?.data.find((c) => c.id === form.customerId)?.name || ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, customerId: '' }); setCustomerSearch(''); }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9"
                    placeholder="ابحث عن زبون..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                  />
                </div>
              )}
              {showCustomerDropdown && !form.customerId && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                  {(() => {
                    const list = customers.data?.data.filter((c) => {
                      const q = customerSearch.toLowerCase();
                      return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
                    }) || [];
                    if (list.length === 0) {
                      return (
                        <div className="px-4 py-3 text-sm text-slate-400 text-center">
                          لا يوجد زبون مطابق
                        </div>
                      );
                    }
                    return list.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-right px-4 py-2.5 hover:bg-slate-50 text-sm"
                        onClick={() => {
                          setForm({ ...form, customerId: c.id });
                          setCustomerSearch('');
                          setShowCustomerDropdown(false);
                        }}
                      >
                        {c.name}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
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
            <label className="label">العملة *</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as any })}>
              <option value="IQD">دينار عراقي (د.ع)</option>
              <option value="USD">دولار أمريكي ($)</option>
            </select>
          </div>
          <div>
            <label className="label">نوع الدفع *</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
              <option value="FULL">دين</option>
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
