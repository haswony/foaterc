import { AlertTriangle, Phone, MessageCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useNavigate } from 'react-router-dom';

const SUPPORT_PHONE = '07748312099';
// International format for wa.me (Iraq +964, drop leading 0)
const WHATSAPP_NUMBER = '9647748312099';

export default function BlockedScreen({
  reason,
}: {
  reason: 'disabled' | 'expired';
}) {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();

  const title = reason === 'disabled' ? 'تم تعطيل المتجر' : 'انتهى اشتراك المتجر';
  const message =
    reason === 'disabled'
      ? 'تم تعطيل متجرك من قِبَل الإدارة. يرجى التواصل لإعادة التفعيل.'
      : 'انتهى اشتراك متجرك الشهري. يرجى تجديد الاشتراك للمتابعة.';

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `مرحباً، أنا ${user?.name || ''} من المتجر وأرغب بتجديد/تفعيل الاشتراك.`
  )}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 via-white to-amber-50">
      <div className="card w-full max-w-lg p-8 sm:p-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-5 shadow-md">
          <AlertTriangle size={42} />
        </div>
        <h1 className="text-2xl font-extrabold mb-3">{title}</h1>
        <p className="text-slate-600 leading-relaxed mb-6">{message}</p>

        <div className="bg-slate-50 rounded-2xl p-5 mb-6">
          <div className="text-sm text-slate-500 mb-2">يرجى الدفع والتواصل مع الإدارة</div>
          <div className="flex items-center justify-center gap-2 text-2xl font-extrabold text-slate-800" dir="ltr">
            <Phone size={22} />
            <span>{SUPPORT_PHONE}</span>
          </div>
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full !py-3 text-base !bg-emerald-600 hover:!bg-emerald-700"
        >
          <MessageCircle size={20} />
          التواصل عبر واتساب
        </a>

        <button
          onClick={() => { logout(); nav('/login'); }}
          className="btn-ghost w-full mt-3 !text-slate-500"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
