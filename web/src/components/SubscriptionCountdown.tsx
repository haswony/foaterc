import { useEffect, useState } from 'react';
import { Clock, Calendar, AlertTriangle, CheckCircle2, Infinity as InfinityIcon } from 'lucide-react';

type Store = {
  subscriptionPlan?: 'FREE' | 'MONTHLY' | string;
  subscriptionExpiresAt?: string | null;
  isActive?: boolean;
};

function diffParts(target: number) {
  const now = Date.now();
  const ms = Math.max(0, target - now);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { ms, days, hours, minutes, seconds };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function Box({ value, label, tone }: { value: string; label: string; tone: 'normal' | 'warn' | 'danger' }) {
  const bg =
    tone === 'danger' ? 'from-red-500 to-rose-600'
    : tone === 'warn' ? 'from-amber-400 to-orange-500'
    : 'from-brand-500 to-brand-700';
  return (
    <div className="flex flex-col items-center">
      <div className={`bg-gradient-to-br ${bg} text-white rounded-2xl shadow-lg shadow-slate-200/60 px-3 sm:px-5 py-3 sm:py-4 min-w-[68px] sm:min-w-[88px] text-center`}>
        <div className="text-2xl sm:text-4xl font-extrabold tabular-nums tracking-tight" dir="ltr">{value}</div>
      </div>
      <div className="mt-2 text-xs sm:text-sm text-slate-500 font-medium">{label}</div>
    </div>
  );
}

export default function SubscriptionCountdown({
  store,
  variant = 'card',
}: {
  store: Store | null | undefined;
  variant?: 'card' | 'compact';
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!store) return null;

  // FREE plan
  if (store.subscriptionPlan === 'FREE') {
    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm font-medium">
          <InfinityIcon size={16} />
          <span>اشتراك مجاني — بلا حدود</span>
        </div>
      );
    }
    return (
      <div className="card p-6 bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl"><CheckCircle2 size={22} /></div>
          <div>
            <div className="font-bold text-lg text-emerald-800">اشتراك مجاني</div>
            <div className="text-sm text-emerald-600">يعمل المتجر بلا تاريخ انتهاء</div>
          </div>
        </div>
      </div>
    );
  }

  // MONTHLY without expiry or expired
  const expiresAt = store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt).getTime() : null;
  const expired = !expiresAt || expiresAt <= Date.now();

  if (expired) {
    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm font-bold">
          <AlertTriangle size={16} />
          <span>انتهى الاشتراك</span>
        </div>
      );
    }
    return (
      <div className="card p-6 bg-gradient-to-br from-red-50 to-white border-2 border-red-200">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 text-red-600 p-2.5 rounded-xl"><AlertTriangle size={22} /></div>
          <div>
            <div className="font-bold text-lg text-red-700">انتهى اشتراك المتجر</div>
            <div className="text-sm text-red-600">يرجى تجديد الاشتراك لمتابعة العمل</div>
          </div>
        </div>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = diffParts(expiresAt!);
  const tone: 'normal' | 'warn' | 'danger' = days < 1 ? 'danger' : days <= 7 ? 'warn' : 'normal';
  const expiryDate = new Date(expiresAt!);

  if (variant === 'compact') {
    const cls = tone === 'danger' ? 'bg-red-50 text-red-700 border-red-200' : tone === 'warn' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-brand-50 text-brand-700 border-brand-200';
    return (
      <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm font-semibold ${cls}`} dir="ltr">
        <Clock size={16} />
        <span className="tabular-nums">{days}d : {pad(hours)}h : {pad(minutes)}m : {pad(seconds)}s</span>
      </div>
    );
  }

  const headerCls =
    tone === 'danger' ? 'from-red-50 to-white border-red-200'
    : tone === 'warn' ? 'from-amber-50 to-white border-amber-200'
    : 'from-brand-50 to-white border-brand-100';

  const headerTitle =
    tone === 'danger' ? 'الاشتراك ينتهي خلال ساعات!' : tone === 'warn' ? 'الاشتراك يقترب من الانتهاء' : 'اشتراك المتجر فعّال';

  const headerIconCls =
    tone === 'danger' ? 'bg-red-100 text-red-600' : tone === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700';

  return (
    <div className={`card p-5 sm:p-6 bg-gradient-to-br ${headerCls} border-2`}>
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${headerIconCls}`}>
            {tone === 'normal' ? <Clock size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div>
            <div className="font-bold text-base sm:text-lg text-slate-800">{headerTitle}</div>
            <div className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Calendar size={14} />
              ينتهي في <span dir="ltr" className="tabular-nums">{expiryDate.toLocaleString('ar')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4 justify-items-center" dir="ltr">
        <Box value={String(days)} label="أيام" tone={tone} />
        <Box value={pad(hours)} label="ساعات" tone={tone} />
        <Box value={pad(minutes)} label="دقائق" tone={tone} />
        <Box value={pad(seconds)} label="ثواني" tone={tone} />
      </div>
    </div>
  );
}
