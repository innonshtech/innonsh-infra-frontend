import { useState, useEffect } from 'react';
import { financeService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import {
  IndianRupee, TrendingUp, TrendingDown, AlertTriangle,
  FileText, ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './ReportsHub.css';

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const EXPENSE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const CATEGORY_LABELS = {
  'MATERIAL_PURCHASE': 'Material Purchase',
  'LABOUR_WAGES': 'Labour Wages',
  'EQUIPMENT_MAINTENANCE': 'Equipment Maintenance',
  'INVOICE_PAYMENT': 'Invoice Payment',
  'UNCATEGORIZED': 'Other / Misc',
};

export default function ReportsHub() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('overview');
  const toast = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await financeService.getReportsSummary();
      setData(res.data?.data || res.data || {});
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner spinner-lg"></div></div>;
  if (!data) return <div className="empty-state"><h2>No data available</h2></div>;

  const expensePieData = Object.entries(data.expenseByCategory || {}).map(([key, value], i) => ({
    name: CATEGORY_LABELS[key] || key,
    value,
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  }));

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'cashflow', label: 'Cash Flow' },
    { key: 'outstanding', label: 'Outstanding Dues' },
    { key: 'projectpl', label: 'Project P&L' },
  ];

  return (
    <div className="reports-hub-page">
      {/* Tab Bar */}
      <div className="labour-tab-bar">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`labour-tab ${activeReport === t.key ? 'act' : ''}`}
            onClick={() => setActiveReport(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="labour-content">
        <div className="labour-page-title">Reports & Analytics</div>
        <div className="labour-page-sub">Live financial intelligence from your construction business.</div>

        {/* ─── Overview Tab ─── */}
        {activeReport === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="att-summary-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
              <div className="att-kpi">
                <div className="att-kpi-val" style={{ color: '#10b981' }}>{formatCurrency(data.totalIncome)}</div>
                <div className="att-kpi-lbl">Total Income</div>
              </div>
              <div className="att-kpi">
                <div className="att-kpi-val" style={{ color: '#ef4444' }}>{formatCurrency(data.totalExpenses)}</div>
                <div className="att-kpi-lbl">Total Expenses</div>
              </div>
              <div className="att-kpi">
                <div className="att-kpi-val" style={{ color: data.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                  {formatCurrency(Math.abs(data.netProfit))}
                </div>
                <div className="att-kpi-lbl">{data.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</div>
              </div>
              <div className="att-kpi">
                <div className="att-kpi-val" style={{ color: '#f59e0b' }}>{formatCurrency(data.totalReceivables)}</div>
                <div className="att-kpi-lbl">Outstanding Receivables</div>
              </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Cash Flow Bar Chart */}
              <div className="card-flat" style={{ padding: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Monthly Cash Flow (Last 6 Months)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.cashFlow || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ background: '#1a2540', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                    />
                    <Bar dataKey="inflow" fill="#10b981" radius={[4, 4, 0, 0]} name="Inflow" maxBarSize={28} />
                    <Bar dataKey="outflow" fill="#ef4444" radius={[4, 4, 0, 0]} name="Outflow" maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Expense Breakdown Pie */}
              <div className="card-flat" style={{ padding: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Expense Breakdown</h3>
                {expensePieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {expensePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#1a2540', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8, fontSize: 12 }}
                          formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {expensePieData.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state" style={{ padding: 40 }}><p>No expenses recorded</p></div>
                )}
              </div>
            </div>

            {/* Income vs Expense Summary */}
            <div className="card-flat" style={{ padding: 20 }}>
              <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Collection Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
                  <div className="text-xs text-muted uppercase" style={{ marginBottom: 4 }}>Total Invoiced</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(data.totalInvoiced)}</div>
                </div>
                <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
                  <div className="text-xs text-muted uppercase" style={{ marginBottom: 4 }}>Total Collected</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>{formatCurrency(data.totalCollected)}</div>
                </div>
                <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
                  <div className="text-xs text-muted uppercase" style={{ marginBottom: 4 }}>Pending Receivables</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(data.totalReceivables)}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── Cash Flow Tab ─── */}
        {activeReport === 'cashflow' && (
          <div className="card-flat" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Cash Flow Statement — Last 6 Months</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.cashFlow || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#1a2540', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8, fontSize: 13 }}
                  formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                />
                <Legend />
                <Bar dataKey="inflow" fill="#10b981" radius={[6, 6, 0, 0]} name="Income / Inflow" maxBarSize={40} />
                <Bar dataKey="outflow" fill="#ef4444" radius={[6, 6, 0, 0]} name="Expense / Outflow" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 24 }}>
              <table className="erp-tbl">
                <thead>
                  <tr><th>Month</th><th>Inflow</th><th>Outflow</th><th>Net</th></tr>
                </thead>
                <tbody>
                  {(data.cashFlow || []).map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{row.month}</td>
                      <td style={{ color: '#10b981' }}>{formatCurrency(row.inflow)}</td>
                      <td style={{ color: '#ef4444' }}>{formatCurrency(row.outflow)}</td>
                      <td style={{ fontWeight: 600, color: (row.inflow - row.outflow) >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatCurrency(Math.abs(row.inflow - row.outflow))}
                        {(row.inflow - row.outflow) >= 0 ? ' ↑' : ' ↓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Outstanding Dues Tab ─── */}
        {activeReport === 'outstanding' && (
          <div>
            {/* Alert Banner */}
            {data.overdueCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-md)', marginBottom: 20, color: '#ef4444'
              }}>
                <AlertTriangle size={20} />
                <div>
                  <strong>{data.overdueCount} overdue invoice{data.overdueCount > 1 ? 's' : ''}</strong> totalling <strong>{formatCurrency(data.overdueAmount)}</strong>
                </div>
              </div>
            )}

            <div className="att-summary-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
              <div className="att-kpi">
                <div className="att-kpi-val" style={{ color: '#3b82f6' }}>{formatCurrency(data.totalInvoiced)}</div>
                <div className="att-kpi-lbl">Total Invoiced</div>
              </div>
              <div className="att-kpi">
                <div className="att-kpi-val" style={{ color: '#10b981' }}>{formatCurrency(data.totalCollected)}</div>
                <div className="att-kpi-lbl">Total Collected</div>
              </div>
              <div className="att-kpi">
                <div className="att-kpi-val" style={{ color: '#ef4444' }}>{formatCurrency(data.totalReceivables)}</div>
                <div className="att-kpi-lbl">Outstanding Dues</div>
              </div>
            </div>

            {/* Collection Progress Bar */}
            <div className="card-flat" style={{ padding: 20 }}>
              <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>Collection Progress</h3>
              <div className="progressBar" style={{ height: 14, borderRadius: 7 }}>
                <div className="progressFill" style={{
                  width: `${data.totalInvoiced > 0 ? Math.min((data.totalCollected / data.totalInvoiced) * 100, 100) : 0}%`,
                  background: 'var(--accent-primary)',
                  transition: 'width 0.6s ease'
                }} />
              </div>
              <div className="flex justify-between text-xs text-muted mt-sm">
                <span>{data.totalInvoiced > 0 ? Math.round((data.totalCollected / data.totalInvoiced) * 100) : 0}% collected</span>
                <span>{formatCurrency(data.totalCollected)} / {formatCurrency(data.totalInvoiced)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Project P&L Tab ─── */}
        {activeReport === 'projectpl' && (
          <div className="card-flat" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-secondary)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Project-wise Profit & Loss</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="erp-tbl">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Budget</th>
                    <th>Invoiced</th>
                    <th>Collected</th>
                    <th>Outstanding</th>
                    <th>Collection %</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.projectPL || []).map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                      <td>
                        <span className={`status-pill ${p.status === 'IN_PROGRESS' ? 'p-ok' : p.status === 'COMPLETED' ? 'p-nt' : 'p-in'}`}>
                          {p.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{formatCurrency(p.budget)}</td>
                      <td style={{ color: '#3b82f6' }}>{formatCurrency(p.invoiced)}</td>
                      <td style={{ color: '#10b981' }}>{formatCurrency(p.collected)}</td>
                      <td style={{ color: p.due > 0 ? '#ef4444' : 'var(--text-muted)' }}>{formatCurrency(p.due)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progressBar" style={{ flex: 1, height: 6, borderRadius: 3 }}>
                            <div className="progressFill" style={{
                              width: `${p.invoiced > 0 ? Math.min((p.collected / p.invoiced) * 100, 100) : 0}%`,
                              background: 'var(--accent-primary)'
                            }} />
                          </div>
                          <span className="text-xs" style={{ minWidth: 32 }}>
                            {p.invoiced > 0 ? Math.round((p.collected / p.invoiced) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!data.projectPL || data.projectPL.length === 0) && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No projects found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
