import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  Store,
  UserCog,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import QuickPay from './QuickPay';
import BlockedScreen from './BlockedScreen';

type Role = 'SUPER_ADMIN' | 'STORE_OWNER' | 'STAFF';

const navItems: { to: string; label: string; icon: ReactNode; roles: Role[] }[] = [
  { to: '/', label: 'الرئيسية', icon: <LayoutDashboard size={22} />, roles: ['SUPER_ADMIN', 'STORE_OWNER', 'STAFF'] },
  { to: '/stores', label: 'المتاجر', icon: <Store size={22} />, roles: ['SUPER_ADMIN'] },
  { to: '/customers', label: 'الزبائن', icon: <Users size={22} />, roles: ['SUPER_ADMIN', 'STORE_OWNER', 'STAFF'] },
  { to: '/debts', label: 'الديون', icon: <Wallet size={22} />, roles: ['SUPER_ADMIN', 'STORE_OWNER', 'STAFF'] },
  { to: '/payments', label: 'الدفعات', icon: <Receipt size={22} />, roles: ['SUPER_ADMIN', 'STORE_OWNER', 'STAFF'] },
  { to: '/users', label: 'الموظفون', icon: <UserCog size={22} />, roles: ['STORE_OWNER', 'SUPER_ADMIN'] },
];

function StoreSwitcher() {
  const { user, activeStoreId, setActiveStoreId } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api<{ data: { id: string; name: string }[] }>('/api/stores'),
    enabled: user?.role === 'SUPER_ADMIN',
  });
  if (user?.role !== 'SUPER_ADMIN') return null;
  return (
    <select
      value={activeStoreId || ''}
      onChange={(e) => setActiveStoreId(e.target.value || null)}
      className="input !py-2 !text-sm w-full !bg-slate-800 !border-slate-700 !text-white"
    >
      <option value="">— كل المتاجر (إحصاء) —</option>
      {data?.data.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, activeStoreId } = useAuthStore();
  const setStore = useSettings((s) => s.setStore);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  // Fetch /me whenever active store changes (or on login) to load currency etc.
  const me = useQuery({
    queryKey: ['me', activeStoreId],
    queryFn: () => api<{ user: any; store: any }>('/api/auth/me'),
    enabled: !!user,
  });

  useEffect(() => {
    if (me.data?.store) setStore(me.data.store);
    else if (me.data && !me.data.store) setStore(null);
  }, [me.data, setStore]);

  if (!user) return null;

  // Subscription / disabled store gate (for non-super-admin store users)
  if (user.role !== 'SUPER_ADMIN' && me.data?.store) {
    const s = me.data.store as { isActive?: boolean; subscriptionPlan?: string; subscriptionExpiresAt?: string | null };
    if (s.isActive === false) return <BlockedScreen reason="disabled" />;
    if (s.subscriptionPlan === 'MONTHLY') {
      const exp = s.subscriptionExpiresAt ? new Date(s.subscriptionExpiresAt) : null;
      if (!exp || exp.getTime() <= Date.now()) return <BlockedScreen reason="expired" />;
    }
  }

  const items = navItems.filter((i) => i.roles.includes(user.role));
  const showQuickPay = !!activeStoreId; // need a scoped store for payments

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 right-0 z-40 w-72 bg-slate-900 border-l border-slate-800 transform transition-transform overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <Wallet size={22} />
            </div>
            <div>
              <div className="font-bold text-white text-lg leading-tight">نظام الديون</div>
              <div className="text-xs text-slate-400">إدارة الأقساط والدفعات</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={22} />
          </button>
        </div>
        {user.role === 'SUPER_ADMIN' && (
          <div className="px-4 pt-4">
            <div className="text-xs font-semibold text-slate-400 mb-2 px-1">المتجر النشط</div>
            <StoreSwitcher />
          </div>
        )}
        <nav className="p-3 space-y-1 mt-2">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active !bg-slate-800 !text-white' : '!text-slate-400 hover:!bg-slate-800 hover:!text-white'}`}
            >
              {it.icon}
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 inset-x-0 p-4 border-t border-slate-800">
          <div className="px-3 py-2">
            <div className="font-semibold text-[15px] text-white">{user.name}</div>
            <div className="text-xs text-slate-400" dir="ltr">{user.email}</div>
            <div className="text-xs text-brand-400 mt-1 font-semibold">
              {user.role === 'SUPER_ADMIN' ? '👑 مالك النظام' : user.role === 'STORE_OWNER' ? '🏪 صاحب متجر' : '👤 موظف'}
            </div>
          </div>
          <button
            onClick={() => { logout(); nav('/login'); }}
            className="btn-ghost w-full mt-2 !bg-slate-800 !text-slate-300 hover:!bg-slate-700"
          >
            <LogOut size={18} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden fixed top-4 right-4 z-30 w-11 h-11 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700"
          aria-label="فتح القائمة"
        >
          <Menu size={22} />
        </button>
        <main className="flex-1 p-5 lg:p-8 w-full">{children}</main>
      </div>

      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      {showQuickPay && <QuickPay />}
    </div>
  );
}
