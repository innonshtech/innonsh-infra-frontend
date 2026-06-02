import React, { useState, useEffect } from 'react';
import { contractService, projectService } from '../../services/api';
import { Plus, FileText, Trash2, Edit2, X, Calendar, DollarSign, ListTree, ClipboardList, HardHat } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/layout/PageWrapper';
import ConfirmModal from '../../components/ui/ConfirmModal';

const PARTY_TYPES = ['SUB_CONTRACTOR', 'CLIENT', 'SUPPLIER'];
const CONTRACT_TYPES = ['WORK_ORDER', 'RATE_CONTRACT', 'LUMP_SUM'];
const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED'];

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [deleteConfig, setDeleteConfig] = useState({ show: false, contractId: null });
  const toast = useToast();

  const loadContracts = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.partyType = filterType;
      const { data } = await contractService.getAll(params);
      setContracts(data.data || []);
    } catch (e) { console.error(e); }
  };

  const loadProjects = async () => {
    try {
      const { data } = await projectService.getAll();
      setProjects(data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadContracts(), loadProjects()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => { loadContracts(); }, [filterStatus, filterType]);

  const handleSubmit = async (formData) => {
    try {
      const data = {
        ...formData,
        totalValue: parseFloat(formData.totalValue) || 0,
        retentionPercent: parseFloat(formData.retentionPercent) || 0,
        projectId: formData.projectId || null,
        linkedTaskId: formData.linkedTaskId || null,
      };
      if (editing) {
        await contractService.update(editing.id, data);
        toast.success('Contract updated successfully');
      } else {
        await contractService.create(data);
        toast.success('Contract created successfully');
      }
      setShowModal(false);
      setEditing(null);
      loadContracts();
    } catch (err) { 
      console.error(err); 
      toast.error(err.response?.data?.message || 'Failed to save contract');
    }
  };

  const handleEdit = (c) => {
    setEditing(c);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setDeleteConfig({ show: true, contractId: id });
  };

  const confirmDelete = async () => {
    try {
      await contractService.delete(deleteConfig.contractId);
      toast.success('Contract deleted');
      setDeleteConfig({ show: false, contractId: null });
      loadContracts();
    } catch (err) {
      toast.error('Failed to delete contract');
    }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const totalValue = contracts.reduce((s, c) => s + (c.totalValue || 0), 0);
  const totalPaid = contracts.reduce((s, c) => s + (c.paidAmount || 0), 0);
  const activeCount = contracts.filter(c => c.status === 'ACTIVE').length;

  return (
    <PageWrapper
      title="Contract Management"
      subtitle="Oversee active work orders, supplier rates, and sub-contractors."
      actions={
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus size={16} /> New Contract
        </button>
      }
    >
      {/* Stats Summary */}
      <div className="stats-grid mb-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
        <div className="stat-card">
          <div className="flex flex-col">
            <span className="text-sm text-muted font-medium">Total Value</span>
            <span className="text-2xl font-bold tracking-tight">{fmt(totalValue)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex flex-col">
            <span className="text-sm text-muted font-medium">Paid Amount</span>
            <span className="text-2xl font-bold tracking-tight text-success">{fmt(totalPaid)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex flex-col">
            <span className="text-sm text-muted font-medium">Outstanding</span>
            <span className="text-2xl font-bold tracking-tight text-danger">{fmt(totalValue - totalPaid)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex flex-col">
            <span className="text-sm text-muted font-medium">Active Contracts</span>
            <span className="text-2xl font-bold tracking-tight text-primary">{activeCount}</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="filters-bar card-flat flex items-center justify-between gap-md mb-md p-sm" style={{ background: 'var(--bg-secondary)', borderRadius: 8 }}>
        <div className="flex items-center gap-sm flex-1">
          <select className="form-select" style={{ maxWidth: '200px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Filter by Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" style={{ maxWidth: '200px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Filter by Type</option>
            {PARTY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Compact Table Rendering */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Contract Title / Party</th>
              <th>Classification</th>
              <th>Linked Project</th>
              <th>Value (₹)</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map(c => (
              <tr key={c.id}>
                <td className="font-medium text-sm text-muted">{c.contractNumber}</td>
                <td>
                  <div className="flex flex-col">
                    <span className="font-semibold text-primary">{c.title}</span>
                    <span className="text-xs text-muted flex items-center gap-1 mt-1"><HardHat size={10} /> {c.partyName}</span>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>{c.partyType?.replace('_', ' ')}</span>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>{c.type?.replace('_', ' ')}</span>
                  </div>
                </td>
                <td>
                  {c.project ? (
                    <span className="text-sm">{c.project.name}</span>
                  ) : (
                    <span className="text-xs italic text-muted">No Project</span>
                  )}
                </td>
                <td>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{fmt(c.totalValue)}</span>
                    {c.paidAmount > 0 && <span className="text-xs text-success">Paid: {fmt(c.paidAmount)}</span>}
                  </div>
                </td>
                <td>
                  <span className={`badge ${c.status === 'ACTIVE' ? 'badge-green' : c.status === 'DRAFT' ? 'badge-gray' : c.status === 'COMPLETED' ? 'badge-blue' : 'badge-red'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex gap-xs justify-end">
                    <button className="btn btn-icon btn-ghost btn-sm" title="Edit Details" onClick={() => handleEdit(c)}><Edit2 size={14} /></button>
                    <button className="btn btn-icon btn-ghost btn-sm text-danger" title="Delete" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-2xl text-muted">
                  <div className="flex flex-col items-center gap-sm">
                    <ClipboardList size={32} className="text-muted opacity-50" />
                    <p>No contracts tracked yet. Click "+ New Contract" to define terms and costs.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ContractFormModal
          editing={editing}
          projects={projects}
          onSubmit={handleSubmit}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfig.show}
        title="Delete Contract"
        message="Permanently remove this contract definition? Associated history is kept for billing, but you can no longer link new transactions."
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfig({ show: false, contractId: null })}
        type="danger"
      />
    </PageWrapper>
  );
}

/* ─── Monolithic Rebuilt Modal Component ───────────────────────────────────── */
function ContractFormModal({ editing, projects, onSubmit, onClose }) {
  const [wbsTasks, setWbsTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  const [form, setForm] = useState(() => {
    if (editing) {
      return {
        title: editing.title || '',
        partyName: editing.partyName || '',
        partyType: editing.partyType || 'SUB_CONTRACTOR',
        type: editing.type || 'WORK_ORDER',
        description: editing.description || '',
        totalValue: editing.totalValue || '',
        retentionPercent: editing.retentionPercent || '',
        projectId: editing.projectId || '',
        linkedTaskId: editing.linkedTaskId || '',
        startDate: editing.startDate ? editing.startDate.split('T')[0] : '',
        endDate: editing.endDate ? editing.endDate.split('T')[0] : '',
        terms: editing.terms || '',
        status: editing.status || 'DRAFT'
      };
    }
    return {
      title: '', partyName: '', partyType: 'SUB_CONTRACTOR', type: 'WORK_ORDER',
      description: '', totalValue: '', retentionPercent: '', projectId: '', linkedTaskId: '',
      startDate: '', endDate: '', terms: '', status: 'DRAFT'
    };
  });

  const loadWbsTasks = async (projId) => {
    if (!projId) { setWbsTasks([]); return; }
    try {
      setLoadingTasks(true);
      const { data } = await projectService.getTasks(projId);
      setWbsTasks(data.data || []);
    } catch { 
      setWbsTasks([]); 
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleProjectChange = (projId) => {
    setForm(f => ({ ...f, projectId: projId, linkedTaskId: '', title: '' }));
    loadWbsTasks(projId);
  };

  // Run fetch strictly once on mount
  useEffect(() => {
    if (form.projectId) {
      loadWbsTasks(form.projectId);
    }
  }, []);

  const handleTaskChange = (taskId) => {
    if (!taskId) {
      setForm(f => ({ ...f, linkedTaskId: '', title: '' }));
      return;
    }
    const selectedTask = wbsTasks.find(t => String(t.id) === String(taskId));
    if (selectedTask) {
      setForm(f => ({ ...f, linkedTaskId: taskId, title: selectedTask.name }));
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.partyName) {
      alert('Contract Title and Party Name are strictly required.');
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '850px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editing ? 'Update Contract Mapping' : 'Execute New Contract'}</h3>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>
            
            {/* Group A: Identification */}
            <div className="card-flat bg-secondary mb-lg p-md" style={{ border: '1px solid var(--border-secondary)', borderRadius: 12 }}>
              <h4 className="flex items-center gap-2 mb-md mt-0" style={{ fontSize: '1rem', fontWeight: 600 }}>
                <FileText size={16} className="text-primary" /> Contextual Targeting
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label text-xs font-bold uppercase">Linked Development / Project</label>
                  <select className="form-select" value={form.projectId} onChange={e => handleProjectChange(e.target.value)}>
                    <option value="">— Free-standing Contract (No Project) —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-bold uppercase">Contract Entity / Party *</label>
                  <input className="form-input" value={form.partyName} placeholder="Contractor / Vendor Name" onChange={e => setForm({...form, partyName: e.target.value})} />
                </div>
              </div>

              <div className="form-group mt-md">
                <label className="form-label text-xs font-bold uppercase">Subject Title / Associated Task *</label>
                {form.projectId && (wbsTasks.length > 0 || loadingTasks) ? (
                  <select 
                    className="form-select" 
                    value={form.linkedTaskId} 
                    disabled={loadingTasks}
                    onChange={e => handleTaskChange(e.target.value)}
                  >
                    <option value="">— {loadingTasks ? 'Loading project schedule...' : 'Bind to WBS Job Level'} —</option>
                    {wbsTasks.map(t => <option key={t.id} value={t.id}>{t.wbsCode} : {t.name}</option>)}
                  </select>
                ) : (
                  <input 
                    className="form-input font-semibold" 
                    placeholder="Input concrete title (e.g., Structure Works Phase A)" 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                  />
                )}
                {form.projectId && wbsTasks.length === 0 && !loadingTasks && (
                  <span className="text-xs text-muted mt-1 flex items-center gap-1">Note: No scheduled WBS items mapped for current project. Title defaults to override.</span>
                )}
              </div>
            </div>

            {/* Group B: Classification Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Category</label>
                <select className="form-select" value={form.partyType} onChange={e => setForm({...form, partyType: e.target.value})}>
                  {PARTY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Contract Model</label>
                <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Operational Lifecycle</label>
                <select className="form-select font-bold text-primary" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Group C: Commercials & Schedule */}
            <div className="card-flat bg-secondary mb-lg p-md" style={{ border: '1px solid var(--border-secondary)', borderRadius: 12 }}>
              <h4 className="flex items-center gap-2 mb-md mt-0" style={{ fontSize: '1rem', fontWeight: 600 }}>
                <DollarSign size={16} className="text-success" /> Financials & Terminus
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label text-xs font-bold">Agreed Contract Value (₹) *</label>
                  <input className="form-input font-bold text-lg" style={{ color: 'var(--accent-primary)' }} type="number" placeholder="0.00" value={form.totalValue} onChange={e => setForm({...form, totalValue: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label text-xs font-bold">Security Retention (%)</label>
                  <input className="form-input" type="number" step="0.1" placeholder="Default 5%" value={form.retentionPercent} onChange={e => setForm({...form, retentionPercent: e.target.value})} />
                </div>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label text-xs font-bold">Execution Start Date</label>
                  <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label text-xs font-bold">Tentative Completion</label>
                  <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Group D: Descriptive Overlays */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Brief of Services / Description</label>
                <textarea className="form-input text-sm" rows={4} placeholder="Summarize critical boundary conditions..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Key Legal Constraints / Terms</label>
                <textarea className="form-input text-sm" rows={4} placeholder="List specific payment terms or delivery delays penalties..." value={form.terms} onChange={e => setForm({...form, terms: e.target.value})} />
              </div>
            </div>

          </div>

          <div className="modal-footer" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Dismiss</button>
            <button type="submit" className="btn btn-primary font-bold px-xl">
              {editing ? 'Commit Changes' : 'Establish Final Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

