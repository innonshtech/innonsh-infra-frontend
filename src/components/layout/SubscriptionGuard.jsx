import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';

export default function SubscriptionGuard() {
  const { user, company } = useAuth();
  
  const role = user?.role?.name || user?.role;

  // Superadmins always bypass the subscription lock and shouldn't be in the tenant view
  if (role === 'SUPERADMIN' || user?.email === 'superadmin@constructerp.com') {
    return <Navigate to="/superadmin" replace />;
  }

  // Check if company subscription is active
  const isPending = company?.status === 'PENDING';
  const isSuspended = company?.status === 'SUSPENDED';
  const isExpired = company?.subscriptionStatus === 'EXPIRED';

  if (isPending || isSuspended || isExpired) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="card text-center" style={{ maxWidth: '480px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)', color: isPending ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>
            <Lock size={48} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-md)' }}>
            {isPending ? 'Approval Pending' : 'Access Suspended'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
            {isPending
              ? "Your company registration is currently pending approval from the platform administrator. We will notify you once access is granted."
              : isSuspended 
                ? "Your company's access to the ConstructERP platform has been suspended by the administrator."
                : "Your trial or subscription has expired. Please upgrade your plan to restore access."}
          </p>
          {!isPending && (
            <button className="btn btn-primary w-full" onClick={() => window.location.href = 'mailto:billing@constructerp.com'}>
              <CreditCard size={18} /> Contact Billing Support
            </button>
          )}
        </div>
      </div>
    );
  }

  return <Outlet />;
}
