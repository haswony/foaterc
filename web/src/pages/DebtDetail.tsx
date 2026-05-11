import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, Modal, Empty, ShimmerTable } from '@/components/ui';
import { ArrowRight, Plus, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatMoney, formatDate, formatDateTime } from '@/lib/format';
import Money from '@/components/Money';
import { useSettings, useCurrency } from '@/store/settings';
import { printThermalReceipt } from '@/lib/print';

export default function DebtDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const cur = useCurrency();
  const storeInfo = useSettings((s) => s.store);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['debt', id],
    queryFn: () => api<{ data: any }>(`/api/debts/${id}`),
    enabled: !!id,
  });

  const pay = useMutation({
    mutationFn: () =>
      api<{ data: any }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ debtId: id, amount: Number(amount), note: note || null }),
      }),
    onSuccess: (res) => {
      toast.success('تم تسجيل الدفعة');
      setOpen(false); setAmount(''); setNote('');
      qc.invalidateQueries({ queryKey: ['debt', id] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      // Auto-print thermal receipt
      const d = data?.data;
      if (d) {
        printThermalReceipt({
          amount: res.data.amount,
          paidAt: res.data.paidAt,
          note: res.data.note,
          customerName: d.customer?.name || '',
          customerPhone: d.customer?.phone || '',
          debtAmount: d.amount,
          debtRemaining: Math.max(0, (d.totals?.remaining || 0) - Number(amount)),
          currency: cur,
          storeName: storeInfo?.name,
          storePhone: storeInfo?.phone,
          paymentId: res.data.id,
        });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reprintReceipt = (payment: any) => {
    const d = data?.data;
    if (!d) return;
    printThermalReceipt({
      amount: payment.amount,
      paidAt: payment.paidAt,
      note: payment.note,
      customerName: d.customer?.name || '',
      customerPhone: d.customer?.phone || '',
      debtAmount: d.amount,
      currency: cur,
      storeName: storeInfo?.name,
      storePhone: storeInfo?.phone,
      paymentId: payment.id,
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="..." subtitle="" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-2 animate-pulse">
              <div className="h-3 w-16 bg-slate-100 rounded" />
              <div className="h-7 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="card p-0 overflow-hidden mb-4">
          <div className="px-5 py-3 border-b animate-pulse h-5 w-24 bg-slate-200 rounded" />
          <ShimmerTable rows={4} cols={5} />
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b animate-pulse h-5 w-24 bg-slate-200 rounded" />
          <ShimmerTable rows={3} cols={5} />
        </div>
      </div>
    );
  }
  const d = data?.data;
  if (!d) return <Empty text="غير موجود" />;
  const now = new Date();

  return (
    <div>
      <Link to="/debts" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700 mb-3">
        <ArrowRight size={14} /> العودة للديون
      </Link>
      <PageHeader
        title={`دين ${d.customer.name}`}
        subtitle={d.description || ''}
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={18} /> دفعة جديدة
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">المبلغ الأصلي</div>
          <div className="text-xl font-bold mt-1"><Money value={d.amount} /></div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">المدفوع</div>
          <div className="text-xl font-bold text-emerald-600 mt-1"><Money value={d.totals.totalPaid} /></div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">المتبقي</div>
          <div className="text-xl font-bold text-red-600 mt-1"><Money value={d.totals.remaining} /></div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">الحالة</div>
          <div className="text-xl font-bold mt-1">
            {d.status === 'CLOSED' ? '✅ مسدد' : '⏳ نشط'}
          </div>
        </div>
      </div>

      {d.type === 'INSTALLMENT' && d.schedule.length > 0 && (
        <div className="card mb-4 overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold">جدول الأقساط</div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">#</th>
                <th className="table-th">تاريخ الاستحقاق</th>
                <th className="table-th">المبلغ</th>
                <th className="table-th">المدفوع</th>
                <th className="table-th">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {d.schedule.map((s: any) => {
                const late = s.status !== 'PAID' && new Date(s.dueDate) < now;
                return (
                  <tr key={s.id} className={late ? 'bg-red-50' : ''}>
                    <td className="table-td">{s.seq}</td>
                    <td className={`table-td ${late ? 'text-red-700 font-semibold' : ''}`}>{formatDate(s.dueDate)}</td>
                    <td className="table-td"><Money value={s.amount} /></td>
                    <td className="table-td text-emerald-600"><Money value={s.paid} /></td>
                    <td className="table-td">
                      {s.status === 'PAID' ? (
                        <span className="badge bg-emerald-50 text-emerald-700">مدفوع</span>
                      ) : late ? (
                        <span className="badge bg-red-50 text-red-700">متأخر</span>
                      ) : s.status === 'PARTIAL' ? (
                        <span className="badge bg-amber-50 text-amber-700">جزئي</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600">قيد الانتظار</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold">سجل الدفعات</div>
        {d.payments.length === 0 ? (
          <Empty text="لا توجد دفعات" />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">التاريخ</th>
                <th className="table-th">المبلغ</th>
                <th className="table-th">ملاحظة</th>
                <th className="table-th">المسجل</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {d.payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="table-td">{formatDateTime(p.paidAt)}</td>
                  <td className="table-td font-semibold text-emerald-600"><Money value={p.amount} /></td>
                  <td className="table-td text-slate-500">{p.note || '-'}</td>
                  <td className="table-td text-sm text-slate-500">{p.recordedBy?.name || '-'}</td>
                  <td className="table-td">
                    <button
                      className="text-slate-500 hover:text-brand-700"
                      title="طباعة وصل"
                      onClick={() => reprintReceipt(p)}
                    >
                      <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="تسجيل دفعة جديدة">
        <form onSubmit={(e) => { e.preventDefault(); pay.mutate(); }} className="space-y-3">
          <div>
            <label className="label">المبلغ * (المتبقي: {formatMoney(d.totals.remaining)})</label>
            <input className="input" type="number" min={0.01} step="0.01" max={d.totals.remaining} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">ملاحظة</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>إلغاء</button>
            <button type="submit" className="btn-primary" disabled={pay.isPending}>
              {pay.isPending ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
