import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { superadminService } from '../../services/api';
import {
  Building2, Users, IndianRupee, Activity, CheckCircle, XCircle, PauseCircle, PlayCircle, Loader
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Real SaaS Data will be fetched from API later
const saasStats = [
  { label: 'Monthly Recurring Rev', value: '₹0', icon: IndianRupee, change: '+0%', positive: true },
  { label: 'Active Tenant Companies', value: '0', icon: Building2, change: '0 new', positive: true },
  { label: 'Total active users', value: '0', icon: Users, change: '0', positive: true },
  { label: 'System Health', value: '100%', icon: Activity, change: 'Optimal', positive: true },
];

const revenueData = [
  { month: 'Jan', mrr: 0 },
  { month: 'Feb', mrr: 0 },
  { month: 'Mar', mrr: 0 },
  { month: 'Apr', mrr: 0 },
  { month: 'May', mrr: 0 },
  { month: 'Jun', mrr: 0 },
];

export default function SuperadminDashboard() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await superadminService.getCompanies();
      setCompanies(res.data);
    } catch (err) {
      toast.error('Failed to load companies: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await superadminService.approveCompany(id);
      toast.success('Company activated successfully!');
      fetchCompanies(); // Refresh list to get updated status
    } catch (err) {
      toast.error('Failed to activate company');
    }
  };

  const handleSuspend = async (id) => {
    try {
      await superadminService.updateStatus(id, 'SUSPENDED');
      toast.warning('Company access suspended');
      fetchCompanies();
    } catch (err) {
      toast.error('Failed to suspend company');
    }
  };

  return (
    <PageWrapper
      title="SaaS Control Center"
      subtitle="Superadmin overview of platform revenue and tenant companies."
    >
      {/* SaaS Stats */}
      <div className="grid grid-4 gap-lg mb-xl">
        {saasStats.map((stat, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{ background: 'var(--bg-tertiary)' }}>
              <stat.icon size={22} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
              <div className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MRR Chart */}
      <div className="card-flat mb-xl">
        <h3 className="mb-md">MRR Growth (Lakhs ₹)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
            <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#1a2540', border: 'none', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="mrr" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMrr)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tenant Companies Table */}
      <div className="card-flat">
        <div className="flex justify-between items-center mb-lg">
          <h3>Registered Tenant Companies</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>ERP Type</th>
                <th>Plan</th>
                <th>Users</th>
                <th>MRR</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center" style={{ padding: 'var(--space-2xl)' }}>
                    <Loader size={24} className="spin" style={{ color: 'var(--accent-primary)', margin: '0 auto' }} />
                  </td>
                </tr>
              ) : (
                <>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="font-semibold text-primary">{company.name}</td>
                      <td>
                        <span className={`badge ${company.erpType === 'BUILDER' ? 'badge-blue' : 'badge-amber'}`}>
                          {company.erpType}
                        </span>
                      </td>
                      <td>Trial</td>
                      <td>{company.users ? company.users.length : 0}</td>
                      <td className="font-medium">₹0</td>
                      <td>
                        {company.status === 'ACTIVE' && <span className="badge badge-green"><CheckCircle size={12}/> Active</span>}
                        {company.status === 'PENDING' && <span className="badge badge-yellow"><PauseCircle size={12}/> Pending</span>}
                        {company.status === 'SUSPENDED' && <span className="badge badge-red"><XCircle size={12}/> Suspended</span>}
                        {company.status === 'REJECTED' && <span className="badge badge-red"><XCircle size={12}/> Rejected</span>}
                        {company.status === 'TRIAL' && <span className="badge badge-purple"><Activity size={12}/> Trial</span>}
                      </td>
                      <td>
                        {(company.status === 'PENDING' || company.status === 'SUSPENDED' || company.status === 'REJECTED') ? (
                          <button className="btn btn-sm btn-ghost text-success" onClick={() => handleApprove(company.id)}>
                            <PlayCircle size={14}/> Activate
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-ghost text-danger" onClick={() => handleSuspend(company.id)}>
                            <PauseCircle size={14}/> Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center" style={{ padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                        No companies registered yet.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
