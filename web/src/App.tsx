import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Stores from '@/pages/Stores';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/CustomerDetail';
import Debts from '@/pages/Debts';
import DebtDetail from '@/pages/DebtDetail';
import Payments from '@/pages/Payments';
import Users from '@/pages/Users';
import Settings from '@/pages/Settings';
import Developer from '@/pages/Developer';

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function RoleGate({
  roles,
  children,
}: {
  roles: ('SUPER_ADMIN' | 'STORE_OWNER' | 'STAFF')[];
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route
          path="/stores"
          element={
            <Protected>
              <RoleGate roles={['SUPER_ADMIN']}><Stores /></RoleGate>
            </Protected>
          }
        />
        <Route path="/customers" element={<Protected><Customers /></Protected>} />
        <Route path="/customers/:id" element={<Protected><CustomerDetail /></Protected>} />
        <Route path="/debts" element={<Protected><Debts /></Protected>} />
        <Route path="/debts/:id" element={<Protected><DebtDetail /></Protected>} />
        <Route path="/payments" element={<Protected><Payments /></Protected>} />
        <Route
          path="/users"
          element={
            <Protected>
              <RoleGate roles={['STORE_OWNER', 'SUPER_ADMIN']}><Users /></RoleGate>
            </Protected>
          }
        />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/developer" element={<Protected><Developer /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
