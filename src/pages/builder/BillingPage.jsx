import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { billingService } from '../../services/api';
import {
  Plus, Search, FileText, Download, DollarSign,
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
  CreditCard, Receipt, ArrowUpRight, ArrowDownRight,
  X, Save, Calendar, IndianRupee
} from 'lucide-react';
import './Builder.css';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes, payRes, summRes, duesRes] = await Promise.allSettled([
        billingService.getInvoices(),
        billingService.getPayments(),
        billingService.getReports?.() || Promise.resolve({ data: { data: null } }),
        billingService.getDues?.() || Promise.resolve({ data: { data: [] } })
      ]);
      setInvoices(invRes.status === 'fulfilled' ? (invRes.value.data?.data || []) : []);
      setPayments(payRes.status === 'fulfilled' ? (payRes.value.data?.data || []) : []);
      setSummary(summRes.status === 'fulfilled' ? (summRes.value.data?.data || null) : null);
      setDues(duesRes.status === 'fulfilled' ? (duesRes.value.data?.data || []) : []);
    } catch {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'invoices', label: 'Invoices / Demands', icon: FileText },
    { key: 'payments', label: 'Collections', icon: CreditCard },
    { key: 'dues', label: 'Pending Dues', icon: AlertTriangle },
  ];

  return (
    <PageWrapper
      title="Billing & Collections"
      subtitle="Manage demand letters, payments, and track revenue"
      actions={
        <div className="flex gap-md">
          <button className="btn btn-secondary" onClick={() => setShowPaymentModal(true)}>
            <CreditCard size={16} /> Record Payment
          </button>
          <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}>
            <Plus size={16} /> Create Demand
          </button>
        </div>
      }
    >
      <div className="hub-tabs" style={{ marginBottom: 'var(--space-xl)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`hub-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <t.icon size={16} style={{ marginBottom: -3, marginRight: 6 }} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : (
        <>
          {activeTab === 'overview' && <BillingOverview summary={summary} invoices={invoices} payments={payments} />}
          {activeTab === 'invoices' && <InvoiceList invoices={invoices} onRecordPayment={(inv) => { setSelectedInvoice(inv); setShowPaymentModal(true); }} />}
          {activeTab === 'payments' && <PaymentList payments={payments} />}
          {activeTab === 'dues' && <DuesList dues={dues} onSendReminder={(d) => toast.info(`Reminder sent for Invoice #${d.invoiceNumber}`)} />}
        </>
      )}

      {showInvoiceModal && (
        <InvoiceModal
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={() => { setShowInvoiceModal(false); fetchAll(); }}
        />
      )}
      {showPaymentModal && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => { setShowPaymentModal(false); setSelectedInvoice(null); }}
          onSuccess={() => { setShowPaymentModal(false); setSelectedInvoice(null); fetchAll(); }}
        />
      )}
    </PageWrapper>
  );
}

/* ─── Overview Tab ─────────────────────────────────────────────────────────── */
function BillingOverview({ summary, invoices, payments }) {
  const totalInvoiced = summary?.totalInvoiced || invoices.reduce((s, i) => s + (i.grandTotal || i.totalAmount || 0), 0);
  const totalCollected = summary?.totalCollected || payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalDue = totalInvoiced - totalCollected;
  const efficiency = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const stats = [
    { label: 'Total Invoiced', value: totalInvoiced, icon: FileText, color: '#3b82f6', trend: `${invoices.length} demands` },
    { label: 'Total Collected', value: totalCollected, icon: CheckCircle2, color: '#10b981', trend: `${payments.length} receipts` },
    { label: 'Outstanding Dues', value: totalDue, icon: AlertTriangle, color: totalDue > 0 ? '#f59e0b' : '#10b981', trend: totalDue > 0 ? 'Action needed' : 'All clear!' },
    { label: 'Collection Rate', value: null, displayValue: `${efficiency}%`, icon: TrendingUp, color: efficiency >= 80 ? '#10b981' : '#f59e0b', trend: efficiency >= 80 ? 'Healthy' : 'Needs attention' },
  ];

  return (
    <div className="flex flex-col gap-xl">
      <div className="grid grid-4 gap-lg">
        {stats.map((s, i) => (
          <div key={i} className="card-flat p-lg">
            <div className="flex justify-between items-start mb-md">
              <div className="p-sm radius-md" style={{ background: `${s.color}15`, color: s.color }}>
                <s.icon size={20} />
              </div>
              <span className="text-xs text-muted">{s.trend}</span>
            </div>
            <div className="text-2xl font-bold mb-xs">
              {s.displayValue || `₹${(s.value || 0).toLocaleString('en-IN')}`}
            </div>
            <div className="text-sm text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2 gap-xl">
        <div className="card-flat">
          <h3 className="card-title mb-lg">Collection Efficiency Gauge</h3>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl) 0' }}>
            <svg viewBox="0 0 120 70" width="240" height="140">
              <path d="M 15 55 A 45 45 0 0 1 105 55" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" strokeLinecap="round" />
              <path
                d="M 15 55 A 45 45 0 0 1 105 55" fill="none"
                stroke={efficiency >= 80 ? '#10b981' : efficiency >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(efficiency / 100) * 141.3}, 141.3`}
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
              <text x="60" y="50" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--text-primary)">{efficiency}%</text>
              <text x="60" y="63" textAnchor="middle" fontSize="8" fill="var(--text-muted)">Collection Rate</text>
            </svg>
          </div>
        </div>

        <div className="card-flat">
          <h3 className="card-title mb-lg">Recent Activity</h3>
          <div className="flex flex-col gap-md" style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {[...invoices.slice(0, 3).map(i => ({ type: 'invoice', date: i.createdAt, label: `Demand #${i.invoiceNumber || i.id?.slice(0, 8)}`, amount: i.grandTotal || i.totalAmount })),
              ...payments.slice(0, 3).map(p => ({ type: 'payment', date: p.paymentDate || p.createdAt, label: `Payment received`, amount: p.amount }))]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 5)
              .map((item, i) => (
                <div key={i} className="flex items-center gap-md p-sm border-b border-secondary">
                  <div className="p-xs radius-md" style={{ background: item.type === 'invoice' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', color: item.type === 'invoice' ? '#3b82f6' : '#10b981' }}>
                    {item.type === 'invoice' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted">{new Date(item.date).toLocaleDateString()}</div>
                  </div>
                  <div className="font-bold text-sm">₹{(item.amount || 0).toLocaleString('en-IN')}</div>
                </div>
              ))}
            {invoices.length === 0 && payments.length === 0 && (
              <p className="text-muted text-center py-xl">No billing activity yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Invoice List ─────────────────────────────────────────────────────────── */
function InvoiceList({ invoices, onRecordPayment }) {
  const statusColors = { UNPAID: 'badge-red', PARTIAL: 'badge-amber', PAID: 'badge-green', DRAFT: 'badge-gray' };

  return (
    <div className="table-container card-flat" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Project / Unit</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Due</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id}>
              <td className="font-semibold">#{inv.invoiceNumber || inv.id?.slice(0, 8)}</td>
              <td>
                <div className="text-sm">{inv.booking?.project?.name || '—'}</div>
                <div className="text-xs text-muted">{inv.booking?.unit?.unitNumber || ''}</div>
              </td>
              <td className="font-bold">₹{(inv.grandTotal || inv.totalAmount || 0).toLocaleString('en-IN')}</td>
              <td className="text-success">₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</td>
              <td className="text-danger font-medium">₹{(inv.dueAmount || 0).toLocaleString('en-IN')}</td>
              <td className="text-sm">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
              <td><span className={`status-pill ${statusColors[inv.status] || 'badge-gray'}`}>{inv.status}</span></td>
              <td>
                <div className="flex gap-xs">
                  {inv.status !== 'PAID' && (
                    <button className="btn btn-xs btn-primary" onClick={() => onRecordPayment(inv)}>
                      <IndianRupee size={12} /> Collect
                    </button>
                  )}
                  <button className="btn btn-icon btn-ghost btn-xs" title="Download PDF"><Download size={12} /></button>
                </div>
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr><td colSpan={8} className="text-center text-muted py-2xl">
              <FileText size={48} className="mb-md opacity-20" />
              <p>No invoices created yet. Click "Create Demand" to get started.</p>
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Payment List ─────────────────────────────────────────────────────────── */
function PaymentList({ payments }) {
  return (
    <div className="table-container card-flat" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Invoice</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td className="text-sm">{new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</td>
              <td className="font-medium">{p.booking?.clientName || '—'}</td>
              <td><span className="badge badge-blue">#{p.invoice?.invoiceNumber || p.invoiceId?.slice(0, 8) || 'Direct'}</span></td>
              <td className="font-bold text-success">₹{(p.amount || 0).toLocaleString('en-IN')}</td>
              <td className="text-sm">{p.paymentMethod || '—'}</td>
              <td className="text-xs text-muted">{p.reference || '—'}</td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr><td colSpan={6} className="text-center text-muted py-2xl">
              <CreditCard size={48} className="mb-md opacity-20" />
              <p>No payments recorded yet.</p>
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Dues List (Traffic Light) ────────────────────────────────────────────── */
function DuesList({ dues, onSendReminder }) {
  return (
    <div className="flex flex-col gap-md">
      {dues.length === 0 && (
        <div className="empty-state py-2xl">
          <CheckCircle2 size={48} className="mb-md" style={{ color: '#10b981' }} />
          <h3>All Clear!</h3>
          <p>No outstanding dues at the moment.</p>
        </div>
      )}
      {dues.map(d => {
        const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(d.dueDate).getTime()) / 86400000));
        const severity = overdueDays > 30 ? 'critical' : overdueDays > 7 ? 'warning' : 'normal';
        const colors = { critical: '#ef4444', warning: '#f59e0b', normal: '#3b82f6' };

        return (
          <div key={d.id} className="card-flat flex items-center gap-lg p-lg" style={{ borderLeft: `4px solid ${colors[severity]}` }}>
            <div className="p-md radius-full" style={{ background: `${colors[severity]}15`, color: colors[severity] }}>
              {severity === 'critical' ? <AlertTriangle size={20} /> : severity === 'warning' ? <Clock size={20} /> : <FileText size={20} />}
            </div>
            <div className="flex-1">
              <div className="font-semibold">#{d.invoiceNumber || d.id?.slice(0, 8)}</div>
              <div className="text-sm text-muted">{d.booking?.clientName} • Due: {new Date(d.dueDate).toLocaleDateString()}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg" style={{ color: colors[severity] }}>₹{(d.dueAmount || 0).toLocaleString('en-IN')}</div>
              <div className="text-xs text-muted">{overdueDays > 0 ? `${overdueDays} days overdue` : 'Due soon'}</div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => onSendReminder(d)}>
              Send Reminder
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Invoice Modal ────────────────────────────────────────────────────────── */
function InvoiceModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ bookingId: '', description: '', totalAmount: 0, taxAmount: 0, dueDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bookingId || !form.totalAmount || !form.dueDate) return toast.warning('Please fill all required fields');
    setSubmitting(true);
    try {
      await billingService.createInvoice(form);
      toast.success('Demand letter created successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create demand');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="c-modal-overlay">
      <div className="c-modal-content animate-slide-up" style={{ maxWidth: '500px' }}>
        <button className="c-modal-close" onClick={onClose}><X size={20} /></button>
        <div className="c-modal-header"><h2 className="c-modal-title">Create Demand Letter</h2></div>
        <form onSubmit={handleSubmit}>
          <div className="c-modal-body flex flex-col gap-lg">
            <div className="form-group">
              <label className="form-label">Booking ID *</label>
              <input className="form-input" placeholder="Paste Booking UUID" value={form.bookingId} onChange={e => setForm({ ...form, bookingId: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input type="number" className="form-input" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Tax (₹)</label>
                <input type="number" className="form-input" value={form.taxAmount} onChange={e => setForm({ ...form, taxAmount: Number(e.target.value) })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Description / Milestone</label>
              <textarea className="form-input" rows={2} placeholder="e.g. 3rd Floor Slab Milestone Payment" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="c-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Demand'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Payment Modal ────────────────────────────────────────────────────────── */
function PaymentModal({ invoice, onClose, onSuccess }) {
  const [form, setForm] = useState({
    bookingId: invoice?.bookingId || '',
    invoiceId: invoice?.id || '',
    amount: invoice?.dueAmount || 0,
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bookingId || !form.amount) return toast.warning('Booking ID and Amount are required');
    setSubmitting(true);
    try {
      await billingService.recordPayment(form);
      toast.success('Payment recorded successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="c-modal-overlay">
      <div className="c-modal-content animate-slide-up" style={{ maxWidth: '500px' }}>
        <button className="c-modal-close" onClick={onClose}><X size={20} /></button>
        <div className="c-modal-header"><h2 className="c-modal-title">Record Payment</h2></div>
        <form onSubmit={handleSubmit}>
          <div className="c-modal-body flex flex-col gap-lg">
            <div className="form-group">
              <label className="form-label">Booking ID *</label>
              <input className="form-input" value={form.bookingId} onChange={e => setForm({ ...form, bookingId: e.target.value })} />
            </div>
            {invoice && (
              <div className="p-md bg-tertiary radius-md text-sm">
                Collecting against Invoice <strong>#{invoice.invoiceNumber || invoice.id?.slice(0, 8)}</strong> • Due: ₹{(invoice.dueAmount || 0).toLocaleString('en-IN')}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input type="number" className="form-input" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input type="date" className="form-input" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Reference / Transaction ID</label>
                <input className="form-input" placeholder="UTR / Cheque No." value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="c-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Recording...' : 'Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
