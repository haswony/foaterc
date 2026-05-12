import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { Store as StoreIcon, Phone, MapPin, Coins, MessageCircle, DollarSign, User, Headphones } from 'lucide-react';
import SubscriptionCountdown from '@/components/SubscriptionCountdown';
import { useAuthStore } from '@/store/auth';
import { useSettings } from '@/store/settings';

const SUPPORT_PHONE = '07748312099';
const WHATSAPP_NUMBER = '9647748312099';

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: any; store: any }>('/api/auth/me'),
  });

  const store = data?.store;
  const { defaultCurrency, setDefaultCurrency } = useSettings();

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `مرحباً، أنا ${user?.name || ''} وأرغب بالاستفسار عن الاشتراك.`
  )}`;

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="إدارة معلومات المتجر، الاشتراك، والتفضيلات" />

      {!store && (
        <div className="card p-10 text-center text-slate-500">
          لا يوجد متجر مرتبط بحسابك
        </div>
      )}

      {store && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column - main settings (2/3 width) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Store info */}
            <Section
              icon={<StoreIcon size={20} />}
              title="معلومات المتجر"
              subtitle="البيانات الأساسية للمتجر"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field icon={<StoreIcon size={14} />} label="اسم المتجر" value={store.name} />
                <Field icon={<Coins size={14} />} label="العملة الأساسية" value={store.currency} />
                <Field icon={<Phone size={14} />} label="الهاتف" value={store.phone || '—'} ltr />
                <Field icon={<MapPin size={14} />} label="العنوان" value={store.address || '—'} />
              </div>
            </Section>

            {/* Account info */}
            {user && (
              <Section
                icon={<User size={20} />}
                title="حسابي"
                subtitle="معلومات المستخدم الحالي"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field icon={<User size={14} />} label="الاسم" value={user.name || '—'} />
                  <Field icon={<User size={14} />} label="البريد الإلكتروني" value={user.email || '—'} ltr />
                </div>
              </Section>
            )}

            {/* Currency preferences */}
            <Section
              icon={<DollarSign size={20} />}
              title="تفضيلات العرض"
              subtitle="اختر العملة الافتراضية للعرض في جميع الصفحات"
            >
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDefaultCurrency('IQD')}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    defaultCurrency === 'IQD'
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`text-2xl font-extrabold mb-1 ${defaultCurrency === 'IQD' ? 'text-brand-700' : 'text-slate-700'}`}>
                    د.ع
                  </div>
                  <div className="text-xs text-slate-500">دينار عراقي</div>
                  {defaultCurrency === 'IQD' && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs">✓</div>
                  )}
                </button>
                <button
                  onClick={() => setDefaultCurrency('USD')}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    defaultCurrency === 'USD'
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`text-2xl font-extrabold mb-1 ${defaultCurrency === 'USD' ? 'text-brand-700' : 'text-slate-700'}`}>
                    $
                  </div>
                  <div className="text-xs text-slate-500">دولار أمريكي</div>
                  {defaultCurrency === 'USD' && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs">✓</div>
                  )}
                </button>
              </div>
            </Section>
          </div>

          {/* Right column - subscription + support (1/3 width) */}
          <div className="space-y-5">
            <SubscriptionCountdown store={store} />

            <Section
              icon={<Headphones size={20} />}
              title="الدعم الفني"
              subtitle="للتجديد أو الاستفسار"
            >
              <div className="bg-slate-50 rounded-xl p-4 mb-3">
                <div className="text-xs text-slate-500 mb-1">رقم التواصل</div>
                <div className="text-lg font-extrabold text-slate-800 tabular-nums" dir="ltr">{SUPPORT_PHONE}</div>
              </div>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
              >
                <MessageCircle size={18} />
                تواصل عبر واتساب
              </a>
              <a
                href={`tel:${SUPPORT_PHONE}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold mt-2 transition-colors"
              >
                <Phone size={18} />
                اتصال مباشر
              </a>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 bg-white border border-slate-200">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="bg-brand-50 text-brand-700 p-2 rounded-lg">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
        {icon}
        {label}
      </div>
      <div className="font-semibold text-slate-800 truncate" dir={ltr ? 'ltr' : undefined}>{value}</div>
    </div>
  );
}
