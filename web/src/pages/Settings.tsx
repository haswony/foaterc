import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { Store as StoreIcon, Phone, MapPin, Coins, MessageCircle } from 'lucide-react';
import SubscriptionCountdown from '@/components/SubscriptionCountdown';
import { useAuthStore } from '@/store/auth';

const SUPPORT_PHONE = '07748312099';
const WHATSAPP_NUMBER = '9647748312099';

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: any; store: any }>('/api/auth/me'),
  });

  const store = data?.store;

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `مرحباً، أنا ${user?.name || ''} وأرغب بالاستفسار عن الاشتراك.`
  )}`;

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="معلومات المتجر وحالة الاشتراك" />

      {store && (
        <div className="grid grid-cols-1 gap-5">
          {/* Store info card */}
          <div className="card p-6 bg-white border border-slate-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-slate-100 text-slate-600 p-2.5 rounded-xl">
                <StoreIcon size={22} />
              </div>
              <div>
                <div className="font-bold text-lg">معلومات المتجر</div>
                <div className="text-sm text-slate-500">البيانات الأساسية</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field icon={<StoreIcon size={16} />} label="اسم المتجر" value={store.name} />
              <Field icon={<Coins size={16} />} label="العملة" value={store.currency} />
              <Field icon={<Phone size={16} />} label="الهاتف" value={store.phone || '—'} ltr />
              <Field icon={<MapPin size={16} />} label="العنوان" value={store.address || '—'} />
            </div>
          </div>

          {/* Subscription countdown */}
          <div className="mb-5">
            <SubscriptionCountdown store={store} />
          </div>

          {/* Support card */}
          <div className="card p-5 bg-white border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-100 text-slate-600 p-2.5 rounded-xl">
                <MessageCircle size={22} />
              </div>
              <div>
                <div className="font-bold text-slate-800">الدعم وتجديد الاشتراك</div>
                <div className="text-xs text-slate-500">للتجديد أو الاستفسار</div>
              </div>
            </div>
            <div className="text-sm text-slate-600 mb-2">رقم التواصل:</div>
            <div className="text-xl font-extrabold text-slate-800 mb-4 tabular-nums" dir="ltr">{SUPPORT_PHONE}</div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full"
            >
              <MessageCircle size={18} />
              فتح واتساب
            </a>
          </div>
        </div>
      )}

      {!store && (
        <div className="card p-10 text-center text-slate-500">
          لا يوجد متجر مرتبط بحسابك
        </div>
      )}
    </div>
  );
}

function Field({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
        {icon}
        {label}
      </div>
      <div className="font-semibold text-slate-800 truncate" dir={ltr ? 'ltr' : undefined}>{value}</div>
    </div>
  );
}
