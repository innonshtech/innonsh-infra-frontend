import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { projectService, financeService } from '../../services/api';
import {
  FolderKanban, TrendingUp, IndianRupee, Users, Package,
  BookOpen, Building2, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Plus, Eye, FileText, CreditCard
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const statusBadgeMap = {
  'PLANNED': 'p-in',
  'IN_PROGRESS': 'p-ok',
  'COMPLETED': 'p-nt',
  'ON_HOLD': 'p-wn',
};

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: ₹{p.value}L
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { erpType, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const svc = erpType === 'BUILDER' ? projectService.builderGetAll : projectService.getAll;
      const [projRes, finRes] = await Promise.all([
        svc(),
        financeService.getReportsSummary().catch(() => null),
      ]);
      const data = projRes.data?.data || projRes.data || [];
      setProjects(Array.isArray(data) ? data : []);
      if (finRes) setFinanceData(finRes.data?.data || finRes.data || null);
    } catch (err) {
      // Silent fail on dashboard — show what we can
    } finally { setLoading(false); }
  };

  // Compute live stats from real projects
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'ONGOING').length;
  
  // Builder specific aggregation
  const totalUnits = projects.reduce((s, p) => s + (p._count?.units || 0), 0);
  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalMembers = projects.reduce((s, p) => s + (p._count?.members || 0), 0);

  const stats = erpType === 'BUILDER' ? [
    { label: 'Total Projects', value: totalProjects, icon: FolderKanban, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', change: `${activeProjects} ongoing`, positive: true },
    { label: 'Total Inventory', value: `${totalUnits} Units`, icon: Building2, color: '#10b981', bg: 'rgba(16,185,129,0.12)', change: 'Across projects', positive: true },
    { label: 'Sales Target', value: formatCurrency(totalBudget), icon: IndianRupee, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', change: 'Projected value', positive: false },
    { label: 'CRM Leads', value: 'Live', icon: Users, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', change: 'Check CRM board', positive: true },
  ] : [
    { label: 'Total Projects', value: totalProjects, icon: FolderKanban, color: '#3b82f6' },
    { label: 'Active Projects', value: activeProjects, icon: TrendingUp, color: '#10b981' },
    { label: 'Total Budget', value: formatCurrency(totalBudget), icon: IndianRupee, color: '#f59e0b' },
    { label: 'Team Members', value: totalMembers, icon: Users, color: '#8b5cf6' },
  ];

  const pieData = [
    { name: 'Planned', value: projects.filter(p => p.status === 'PLANNED').length, color: '#3b82f6' },
    { name: 'In Progress', value: projects.filter(p => p.status === 'IN_PROGRESS').length, color: '#f59e0b' },
    { name: 'Completed', value: projects.filter(p => p.status === 'COMPLETED').length, color: '#10b981' },
    { name: 'On Hold', value: projects.filter(p => p.status === 'ON_HOLD').length, color: '#64748b' },
  ].filter(d => d.value > 0);

  const recentProjects = projects.slice(0, 5);

  return (
    <PageWrapper
      title={`Welcome back, ${user?.firstName || 'Admin'}`}
      subtitle={`Here's your ${erpType === 'BUILDER' ? 'real estate' : 'construction'} overview for today`}
      actions={
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
          <Plus size={16} /> New Project
        </button>
      }
    >
      {/* Stat Cards */}
      <div className="att-summary-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {stats.map((stat, i) => (
          <div className="att-kpi" key={i}>
            <div className="att-kpi-val" style={{ color: stat.color }}>{stat.value}</div>
            <div className="att-kpi-lbl">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Financial KPI Row — NEW */}
      {financeData && erpType !== 'BUILDER' && (
        <>
          <div className="att-summary-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
            <div className="att-kpi" style={{ borderLeft: '3px solid #10b981' }}>
              <div className="att-kpi-val" style={{ color: '#10b981' }}>{formatCurrency(financeData.totalIncome)}</div>
              <div className="att-kpi-lbl">Total Income</div>
            </div>
            <div className="att-kpi" style={{ borderLeft: '3px solid #ef4444' }}>
              <div className="att-kpi-val" style={{ color: '#ef4444' }}>{formatCurrency(financeData.totalExpenses)}</div>
              <div className="att-kpi-lbl">Total Expenses</div>
            </div>
            <div className="att-kpi" style={{ borderLeft: '3px solid #f59e0b' }}>
              <div className="att-kpi-val" style={{ color: '#f59e0b' }}>{formatCurrency(financeData.totalReceivables)}</div>
              <div className="att-kpi-lbl">Outstanding Receivables</div>
            </div>
            <div className="att-kpi" style={{ borderLeft: `3px solid ${financeData.netProfit >= 0 ? '#10b981' : '#ef4444'}` }}>
              <div className="att-kpi-val" style={{ color: financeData.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                {formatCurrency(Math.abs(financeData.netProfit))}
              </div>
              <div className="att-kpi-lbl">{financeData.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</div>
            </div>
          </div>

          {/* Overdue Alert Banner */}
          {financeData.overdueCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 'var(--radius-md)', marginBottom: 20,
              cursor: 'pointer'
            }} onClick={() => navigate('/reports')}>
              <AlertTriangle size={18} color="#ef4444" />
              <span style={{ fontSize: 13, color: '#ef4444' }}>
                <strong>{financeData.overdueCount} overdue invoice{financeData.overdueCount > 1 ? 's' : ''}</strong> — {formatCurrency(financeData.overdueAmount)} pending collection
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>View Reports →</span>
            </div>
          )}
        </>
      )}

      {/* Charts Row */}
      <div className="dashboard-charts">
        {/* Budget Distribution */}
        <div className="card-flat dashboard-chart-card">
          <div className="chart-header">
            <h3>Budget by Project</h3>
          </div>
          {projects.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={projects.slice(0, 6).map(p => ({ name: p.name?.substring(0, 15), budget: Math.round((p.budget || 0) / 100000) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="budget" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} name="Budget" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
              <p>Create projects to see budget distribution</p>
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card-flat dashboard-pie-card">
          <h3>Project Status</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1a2540',
                      border: '1px solid rgba(148,163,184,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map((item, i) => (
                  <div className="pie-legend-item" key={i}>
                    <span className="pie-legend-dot" style={{ background: item.color }} />
                    <span className="pie-legend-label">{item.name}</span>
                    <span className="pie-legend-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
              <p>No projects to show</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Projects Table */}
      <div className="erp-card">
        <div className="card-header">
          <span className="card-title">Recent Projects</span>
          <span className="card-action" onClick={() => navigate('/projects')}>View All</span>
        </div>
        <table className="erp-tbl">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Project Name</th>
              <th style={{ width: '20%' }}>Status</th>
              <th style={{ width: '20%' }}>Budget</th>
              <th style={{ width: '20%' }}>Members</th>
            </tr>
          </thead>
          <tbody>
            {recentProjects.map((project) => (
              <tr key={project.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)}>
                <td className="prim-cell">{project.name}</td>
                <td>
                  <span className={`status-pill ${statusBadgeMap[project.status] || 'p-in'}`}>
                    {project.status?.replace('_', ' ')}
                  </span>
                </td>
                <td>{formatCurrency(project.budget)}</td>
                <td>{project._count?.members || 0}</td>
              </tr>
            ))}
            {recentProjects.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32 }}>No projects yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}
