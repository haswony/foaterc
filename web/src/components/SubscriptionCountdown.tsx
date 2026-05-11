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

function Box({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white border border-slate-200 rounded-xl px-3 sm:px-5 py-3 sm:py-4 min-w-[68px] sm:min-w-[88px] text-center">
        <div className="text-2xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-slate-800" dir="ltr">{value}</div>
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
        <div className="flex items-center gap-2 text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium">
          <InfinityIcon size={16} />
          <span>اشتراك مجاني — بلا حدود</span>
        </div>
      );
    }
    return (
      <div className="card p-6 bg-white border border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-slate-100 text-slate-600 p-2.5 rounded-xl"><CheckCircle2 size={22} /></div>
          <div>
            <div className="font-bold text-lg text-slate-800">اشتراك مجاني</div>
            <div className="text-sm text-slate-500">يعمل المتجر بلا تاريخ انتهاء</div>
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
        <div className="flex items-center gap-2 text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold">
          <AlertTriangle size={16} />
          <span>انتهى الاشتراك</span>
        </div>
      );
    }
    return (
      <div className="card p-6 bg-white border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 text-slate-600 p-2.5 rounded-xl"><AlertTriangle size={22} /></div>
          <div>
            <div className="font-bold text-lg text-slate-800">انتهى اشتراك المتجر</div>
            <div className="text-sm text-slate-500">يرجى تجديد الاشتراك لمتابعة العمل</div>
          </div>
        </div>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = diffParts(expiresAt!);
  const tone: 'normal' | 'warn' | 'danger' = days < 1 ? 'danger' : days <= 7 ? 'warn' : 'normal';
  const expiryDate = new Date(expiresAt!);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm font-semibold text-slate-700" dir="ltr">
        <Clock size={16} />
        <span className="tabular-nums">{days}d : {pad(hours)}h : {pad(minutes)}m : {pad(seconds)}s</span>
      </div>
    );
  }

  const headerTitle =
    days < 1 ? 'الاشتراك ينتهي خلال ساعات!' : days <= 7 ? 'الاشتراك يقترب من الانتهاء' : 'اشتراك المتجر فعّال';

  return (
    <div className="card p-5 sm:p-6 bg-white border border-slate-200">
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
            {days > 7 ? <Clock size={22} /> : <AlertTriangle size={22} />}
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
        <Box value={String(days)} label="أيام" />
        <Box value={pad(hours)} label="ساعات" />
        <Box value={pad(minutes)} label="دقائق" />
        <Box value={pad(seconds)} label="ثواني" />
      </div>
    </div>
  );
}
