import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { financeService, projectService, labourService } from '../../services/api';
import { generatePayrollPDF } from '../../utils/payrollPdf';
import {
  Plus, IndianRupee, FileText, CreditCard, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Trash2, Eye, Download
} from 'lucide-react';
import { generateInvoicePDF } from '../../utils/invoicePdf';
import ConfirmModal from '../../components/ui/ConfirmModal';

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const invoiceStatusBadge = {
  DRAFT: 'p-in',
  SENT: 'p-ok',
  PAID: 'p-nt',
  OVERDUE: 'p-dn',
  PARTIAL: 'p-wn',
};

export default function FinancePage() {
  const [tab, setTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [labourCosts, setLabourCosts] = useState({ weekly: 0, monthly: 0, projects: [] });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deleteConfig, setDeleteConfig] = useState({ show: false, invoiceId: null });
  const toast = useToast();

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (tab === 'invoices') {
        const res = await financeService.getInvoices();
        setInvoices(res.data?.data || res.data || []);
      } else if (tab === 'transactions') {
        const res = await financeService.getTransactions();
        setTransactions(res.data?.data || res.data || []);
      } else if (tab === 'labour') {
        // Aggregated Labour Logic
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
        const endStr = now.toISOString().split('T')[0];

        const [weekRes, monthRes] = await Promise.all([
          labourService.getPayroll({ startDate: startOfWeekStr, endDate: endStr }),
          labourService.getPayroll({ startDate: startOfMonth, endDate: endStr })
        ]);

        const weeklyTotal = weekRes.data?.data?.totalPayroll || 0;
        const monthlyTotal = monthRes.data?.data?.totalPayroll || 0;
        
        // Group by project for the monthly view
        const projectMap = {};
        (monthRes.data?.data?.breakdown || []).forEach(b => {
          const pName = b.worker?.project?.name || 'Central Yard';
          projectMap[pName] = (projectMap[pName] || 0) + b.totalWage;
        });

        setLabourCosts({
          weekly: weeklyTotal,
          monthly: monthlyTotal,
          projects: Object.entries(projectMap).map(([name, total]) => ({ name, total }))
        });
      } else {
        const res = await financeService.getPayments();
        setPayments(res.data?.data || res.data || []);
      }
    } catch { toast.error('Failed to load finance data'); }
    finally { setLoading(false); }
  };

  const handleDeleteInvoice = async (id) => {
    setDeleteConfig({ show: true, invoiceId: id });
  };

  const confirmDeleteInvoice = async () => {
    try { 
      await financeService.deleteInvoice(deleteConfig.invoiceId); 
      toast.success('Invoice deleted'); 
      setDeleteConfig({ show: false, invoiceId: null });
      loadData(); 
    }
    catch { toast.error('Failed to delete'); }
  };

  // Calculate summary stats
  const totalInvoiced = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalDue = invoices.reduce((s, i) => s + (i.dueAmount || 0), 0);

  return (
    <PageWrapper
      title="Finance & Accounting"
      subtitle="Manage invoices, payments & transactions"
      actions={
        <div className="flex gap-md">
          {tab === 'invoices' && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Invoice</button>}
          {tab === 'transactions' && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Record Transaction</button>}
          {tab === 'labour' && <button className="btn btn-primary" onClick={() => generatePayrollPDF({ totalPayroll: labourCosts.monthly, totalWorkers: 'Monthly Aggregated', breakdown: labourCosts.projects.map(p => ({ worker: { firstName: p.name, lastName: '' }, totalWage: p.total })) }, 'Monthly_Finance')}><Download size={16} /> Download Monthly Spend</button>}
        </div>
      }
    >
      {/* Quick Stats */}
      {tab === 'invoices' && invoices.length > 0 && (
        <div className="att-summary-row">
          <div className="att-kpi"><div className="att-kpi-val" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalInvoiced)}</div><div className="att-kpi-lbl">Total Invoiced</div></div>
          <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#059669' }}>{formatCurrency(totalPaid)}</div><div className="att-kpi-lbl">Collected</div></div>
          <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#DC2626' }}>{formatCurrency(totalDue)}</div><div className="att-kpi-lbl">Outstanding</div></div>
        </div>
      )}

      <div className="labour-tab-bar" style={{ background: 'transparent', padding: 0 }}>
        {['invoices', 'payments', 'transactions', 'labour'].map(t => (
          <button key={t} className={`labour-tab ${tab === t ? 'act' : ''}`} onClick={() => setTab(t)}>
            {t === 'labour' ? 'Labour Costs' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ height: 16 }} />

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : tab === 'invoices' ? (
        <div className="erp-card">
          <table className="erp-tbl">
            <thead><tr><th>Invoice #</th><th>Client</th><th>Project</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Due Date</th><th style={{ width: 80 }}></th></tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="prim-cell">{inv.invoiceNumber}</td>
                  <td>{inv.clientName}</td>
                  <td>{inv.project?.name || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{formatCurrency(inv.totalAmount)}</td>
                  <td style={{ color: '#059669' }}>{formatCurrency(inv.paidAmount)}</td>
                  <td style={{ color: inv.dueAmount > 0 ? '#DC2626' : 'var(--text-muted)' }}>{formatCurrency(inv.dueAmount)}</td>
                  <td><span className={`status-pill ${invoiceStatusBadge[inv.status] || 'p-in'}`}>{inv.status}</span></td>
                  <td>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div className="flex gap-xs">
                      {inv.status !== 'PAID' && (
                        <button className="ra-btn text-accent" title="Record Payment" onClick={() => { setSelectedInvoice(inv); setShowRecordPayment(true); }}>
                          <CreditCard size={12} />
                        </button>
                      )}
                      <button className="ra-btn" title="Download PDF" onClick={() => generateInvoicePDF(inv)}>
                        <Download size={12} />
                      </button>
                      <button className="ra-btn text-danger" title="Delete Invoice" onClick={() => handleDeleteInvoice(inv.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32 }}>No invoices yet</td></tr>}
            </tbody>
          </table>
        </div>
      ) : tab === 'payments' ? (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Invoice</th><th>Details / Reference</th></tr></thead>
            <tbody>
              {payments.map(p => {
                const desc = p.transaction?.description || '';
                const detail = desc.includes('(') ? desc.slice(desc.indexOf('(') + 1, desc.lastIndexOf(')')) : '—';
                return (
                  <tr key={p.id}>
                    <td>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                    <td className="font-semibold" style={{ color: 'var(--accent-secondary)' }}>{formatCurrency(p.amount)}</td>
                    <td><span className="badge badge-blue">{p.method || 'N/A'}</span></td>
                    <td className="text-sm">{p.invoice?.invoiceNumber || '—'}</td>
                    <td className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{detail}</td>
                  </tr>
                );
              })}
              {payments.length === 0 && <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>No payments recorded</td></tr>}
            </tbody>
          </table>
        </div>
      ) : tab === 'labour' ? (
        <div className="finance-labour-view animate-fade-up">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="att-kpi" style={{ background: 'var(--accent-primary)', color: 'white', border: 'none' }}>
              <div className="att-kpi-val" style={{ color: 'white', fontSize: 24 }}>{formatCurrency(labourCosts.weekly)}</div>
              <div className="att-kpi-lbl" style={{ color: 'rgba(255,255,255,0.8)' }}>Aggregated Weekly Spend</div>
            </div>
            <div className="att-kpi" style={{ border: '1.5px solid var(--accent-primary)' }}>
              <div className="att-kpi-val" style={{ color: 'var(--accent-primary)', fontSize: 24 }}>{formatCurrency(labourCosts.monthly)}</div>
              <div className="att-kpi-lbl">Aggregated Monthly Spend</div>
            </div>
          </div>

          <div className="erp-card">
            <div className="card-header">
              <span className="card-title">Project-wise Labour Spend (Current Month)</span>
            </div>
            <table className="erp-tbl">
              <thead>
                <tr>
                  <th>Project / Site Name</th>
                  <th style={{ textAlign: 'right' }}>Total Spend (₹)</th>
                </tr>
              </thead>
              <tbody>
                {labourCosts.projects.length === 0 ? (
                  <tr><td colSpan={2} style={{ textAlign: 'center', padding: 32 }}>No labour costs recorded this month.</td></tr>
                ) : labourCosts.projects.map(p => (
                  <tr key={p.name}>
                    <td className="prim-cell">{p.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                      {formatCurrency(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            * These totals are aggregated from daily attendance records and base wages.
          </p>
        </div>
      ) : (
        <div className="erp-card">
          <table className="erp-tbl">
            <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                  <td>
                    {t.type === 'INCOME'
                      ? <span className="status-pill p-ok">Income</span>
                      : <span className="status-pill p-dn">Expense</span>
                    }
                  </td>
                  <td>{t.category || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{formatCurrency(t.amount)}</td>
                  <td>{t.description || '—'}</td>
                </tr>
              ))}
              {transactions.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>No transactions recorded</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && tab === 'invoices' && <CreateInvoiceModal onClose={() => setShowCreate(false)} onCreated={loadData} />}
      {showCreate && tab === 'transactions' && <CreateTransactionModal onClose={() => setShowCreate(false)} onCreated={loadData} />}
      {showRecordPayment && selectedInvoice && (
        <RecordPaymentModal 
          invoice={selectedInvoice} 
          onClose={() => { setShowRecordPayment(false); setSelectedInvoice(null); }} 
          onDone={loadData} 
        />
      )}

      <ConfirmModal
        isOpen={deleteConfig.show}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        onConfirm={confirmDeleteInvoice}
        onClose={() => setDeleteConfig({ show: false, invoiceId: null })}
        type="danger"
      />
    </PageWrapper>
  );
}

function CreateInvoiceModal({ onClose, onCreated }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ projectId: '', invoiceNumber: '', clientName: '', totalAmount: '', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    projectService.getAll().then(r => setProjects(r.data?.data || r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.projectId || !form.invoiceNumber || !form.clientName || !form.totalAmount || !form.dueDate) {
      toast.warning('All fields are required'); return;
    }
    try {
      setSubmitting(true);
      await financeService.createInvoice({
        projectId: form.projectId,
        invoiceNumber: form.invoiceNumber,
        clientName: form.clientName,
        dueDate: new Date(form.dueDate).toISOString(),
        items: [
          {
            description: "Contracting Milestone Billing / Construction Work",
            quantity: 1,
            unitPrice: Number(form.totalAmount)
          }
        ]
      });
      toast.success('Invoice created');
      onCreated(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Create Invoice</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">Invoice # *</label><input className="form-input" value={form.invoiceNumber} onChange={e => setForm({...form, invoiceNumber: e.target.value})} placeholder="INV-001" /></div>
              <div className="form-group"><label className="form-label">Client Name *</label><input className="form-input" value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} /></div>
            </div>
            <div className="form-group"><label className="form-label">Project *</label>
              <select className="form-select" value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})}>
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">Total Amount (₹) *</label><input className="form-input" type="number" value={form.totalAmount} onChange={e => setForm({...form, totalAmount: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Due Date *</label><input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Invoice'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateTransactionModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ type: 'EXPENSE', category: '', amount: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) { toast.warning('Amount is required'); return; }
    try {
      setSubmitting(true);
      await financeService.createTransaction({ ...form, amount: Number(form.amount) });
      toast.success('Transaction recorded');
      onCreated(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Record Transaction</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="INCOME">Income</option><option value="EXPENSE">Expense</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Amount (₹) *</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
            </div>
            <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g., Materials, Labor, Office" /></div>
            <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Recording...' : 'Record'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordPaymentModal({ invoice, onClose, onDone }) {
  const [amount, setAmount] = useState(invoice.dueAmount || '');
  const [method, setMethod] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) { toast.warning('Amount is required'); return; }
    
    // Construct descriptive notes based on selected payment method details
    let notes = '';
    if (method === 'UPI' && referenceNo) {
      notes = `UPI Transaction ID: ${referenceNo}`;
    } else if (method === 'CHEQUE') {
      notes = `Cheque No: ${referenceNo || 'N/A'}${bankName ? ` | Bank: ${bankName}` : ''}`;
    } else if (method === 'BANK_TRANSFER' && referenceNo) {
      notes = `Bank Transfer Ref: ${referenceNo}`;
    }

    try {
      setSubmitting(true);
      await financeService.recordPayment({
        invoiceId: invoice.id,
        amount: Number(amount),
        paymentMethod: method,
        paymentDate: new Date().toISOString(),
        notes: notes || undefined
      });
      toast.success('Payment recorded successfully');
      onDone(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Record Payment for {invoice.invoiceNumber}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Due amount for this invoice: <strong>{formatCurrency(invoice.dueAmount)}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Payment Amount (₹) *</label>
              <input 
                className="form-input" 
                type="number" 
                max={invoice.dueAmount} 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select className="form-select" value={method} onChange={e => { setMethod(e.target.value); setReferenceNo(''); setBankName(''); }}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            {/* Render conditional inputs based on selected payment method */}
            {method === 'UPI' && (
              <div className="form-group animate-fade-in">
                <label className="form-label">UPI Transaction ID (UTR) *</label>
                <input 
                  className="form-input" 
                  value={referenceNo} 
                  onChange={e => setReferenceNo(e.target.value)} 
                  placeholder="e.g. 301294820194"
                  required
                />
              </div>
            )}

            {method === 'CHEQUE' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }} className="animate-fade-in">
                <div className="form-group">
                  <label className="form-label">Cheque Number *</label>
                  <input 
                    className="form-input" 
                    value={referenceNo} 
                    onChange={e => setReferenceNo(e.target.value)} 
                    placeholder="e.g. 000412"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Name *</label>
                  <input 
                    className="form-input" 
                    value={bankName} 
                    onChange={e => setBankName(e.target.value)} 
                    placeholder="e.g. HDFC Bank"
                    required
                  />
                </div>
              </div>
            )}

            {method === 'BANK_TRANSFER' && (
              <div className="form-group animate-fade-in">
                <label className="form-label">Reference / UTR Number *</label>
                <input 
                  className="form-input" 
                  value={referenceNo} 
                  onChange={e => setReferenceNo(e.target.value)} 
                  placeholder="e.g. TXN987654321"
                  required
                />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

