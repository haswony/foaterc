import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X, Phone, Receipt, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatMoney, currencySymbol } from '@/lib/format';
import { useCurrency } from '@/store/settings';
import { printThermalReceipt } from '@/lib/print';

type SearchCustomer = {
  id: string;
  name: string;
  phone: string | null;
  totalRemaining: number;
  activeDebts: { id: string; amount: number; remaining: number; description: string | null; debtDate: string }[];
};

export default function QuickPay() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [step, setStep] = useState<'search' | 'pay'>('search');
  const [selected, setSelected] = useState<SearchCustomer | null>(null);
  const [debtId, setDebtId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState('');
  const qc = useQueryClient();
  const cur = useCurrency();

  // Open with Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api<{ data: SearchCustomer[] }>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: open && q.trim().length > 0 && step === 'search',
  });

  const selectedDebt = useMemo(
    () => selected?.activeDebts.find((d) => d.id === debtId) || null,
    [selected, debtId],
  );

  const pay = useMutation({
    mutationFn: () =>
      api<{ data: any }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ debtId, amount: Number(amount), note: note || null }),
      }),
    onSuccess: (res) => {
      toast.success('تم تسجيل الدفعة');
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['debt'] });
      qc.invalidateQueries({ queryKey: ['customer'] });
      qc.invalidateQueries({ queryKey: ['search'] });
      // print thermal receipt
      printThermalReceipt({
        amount: res.data.amount,
        paidAt: res.data.paidAt,
        note: res.data.note,
        customerName: selected?.name || '',
        customerPhone: selected?.phone || '',
        debtAmount: selectedDebt?.amount || 0,
        debtRemaining: Math.max(0, (selectedDebt?.remaining || 0) - Number(amount)),
        currency: cur,
      });
      close();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const close = () => {
    setOpen(false);
    setQ('');
    setStep('search');
    setSelected(null);
    setDebtId('');
    setAmount('');
    setNote('');
  };

  const choose = (c: SearchCustomer) => {
    setSelected(c);
    if (c.activeDebts.length === 1) {
      setDebtId(c.activeDebts[0].id);
    } else {
      setDebtId('');
    }
    setStep('pay');
  };

  return (
    <>
      {!open ? null : (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-50"
          onClick={close}
        >
          <div
            className="bg-white w-full h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                {step === 'pay' && (
                  <button
                    onClick={() => setStep('search')}
                    className="text-slate-500 hover:text-slate-700 p-1"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <Search size={22} className="text-slate-600" />
                <h3 className="font-bold text-lg">
                  {step === 'search' ? 'بحث ودفعة سريعة' : `دفعة لـ ${selected?.name}`}
                </h3>
              </div>
              <button onClick={close} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            {step === 'search' ? (
              <div className="p-5">
                <div className="relative mb-4">
                  <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    className="input pr-11 text-lg !py-3"
                    placeholder="ابحث بالاسم أو الهاتف..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                {!q.trim() ? (
                  <div className="text-center py-12 text-slate-400">
                    <Search size={40} className="mx-auto mb-3 opacity-50" />
                    <p>ابدأ بالكتابة للبحث عن زبون</p>
                    <p className="text-xs mt-2">اختصار: Ctrl+K</p>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-8 text-slate-400">جاري البحث...</div>
                ) : !data?.data.length ? (
                  <div className="text-center py-12 text-slate-400">لا توجد نتائج</div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {data.data.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => choose(c)}
                        disabled={c.activeDebts.length === 0}
                        className="w-full text-right bg-slate-50 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl p-3 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                          {c.name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{c.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2" dir="ltr">
                            {c.phone && <span><Phone size={12} className="inline" /> {c.phone}</span>}
                            <span>· {c.activeDebts.length} ديون نشطة</span>
                          </div>
                        </div>
                        <div className="text-left flex-shrink-0">
                          <div className="text-xs text-slate-500">المتبقي</div>
                          <div className={`font-extrabold ${c.totalRemaining > 0 ? 'text-red-600' : 'text-slate-500'}`} dir="ltr">
                            {formatMoney(c.totalRemaining)} {currencySymbol(cur)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!debtId) return toast.error('اختر دين');
                  if (!amount || Number(amount) <= 0) return toast.error('أدخل المبلغ');
                  pay.mutate();
                }}
                className="p-5 space-y-4"
              >
                {/* Choose debt */}
                {selected && selected.activeDebts.length > 1 && (
                  <div>
                    <label className="label">اختر الدين</label>
                    <div className="space-y-2">
                      {selected.activeDebts.map((d) => (
                        <label
                          key={d.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                            debtId === d.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="debt"
                            checked={debtId === d.id}
                            onChange={() => setDebtId(d.id)}
                            className="sr-only"
                          />
                          <Receipt size={18} className="text-slate-400" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{d.description || 'بدون وصف'}</div>
                            <div className="text-xs text-slate-400" dir="ltr">
                              المبلغ: {formatMoney(d.amount)} {currencySymbol(cur)}
                            </div>
                          </div>
                          <div className="text-red-600 font-bold" dir="ltr">
                            {formatMoney(d.remaining)} {currencySymbol(cur)}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected debt summary */}
                {selectedDebt && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-emerald-700">المتبقي على هذا الدين</div>
                      <div className="text-2xl font-extrabold text-emerald-800" dir="ltr">
                        {formatMoney(selectedDebt.remaining)} {currencySymbol(cur)}
                      </div>
                    </div>
                    <Receipt size={32} className="text-emerald-400" />
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="label">المبلغ المستلم</label>
                  <div className="relative">
                    <input
                      autoFocus
                      type="number"
                      className="input !py-4 !text-2xl !font-bold !text-emerald-700 !text-center"
                      min={0.01}
                      step="0.01"
                      max={selectedDebt?.remaining}
                      required
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                      {currencySymbol(cur)}
                    </span>
                  </div>
                  {selectedDebt && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setAmount(String(selectedDebt.remaining))}
                        className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200"
                      >
                        كامل المتبقي
                      </button>
                      {[0.25, 0.5, 0.75].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAmount(String(+(selectedDebt.remaining * p).toFixed(2)))}
                          className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200"
                        >
                          {Math.round(p * 100)}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="label">ملاحظة (اختياري)</label>
                  <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button type="button" className="btn-ghost" onClick={close}>
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn-success px-8 !py-3 text-base"
                    disabled={pay.isPending || !debtId || !amount}
                  >
                    {pay.isPending ? 'جاري الحفظ...' : '✓ تأكيد الدفعة وطباعة'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
