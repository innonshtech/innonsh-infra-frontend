import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { procurementService, projectService, inventoryService } from '../../services/api';
import {
  Plus, ShoppingCart, Truck, Users, CheckCircle, XCircle, Clock,
  Eye, Trash2, FileText, ChevronRight, Package
} from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const statusBadge = {
  PENDING: { cls: 'badge-amber', icon: Clock, label: 'Pending' },
  APPROVED: { cls: 'badge-green', icon: CheckCircle, label: 'Approved' },
  REJECTED: { cls: 'badge-red', icon: XCircle, label: 'Rejected' },
  DRAFT: { cls: 'badge-gray', icon: FileText, label: 'Draft' },
  SENT: { cls: 'badge-blue', icon: Truck, label: 'Sent' },
  RECEIVED: { cls: 'badge-green', icon: Package, label: 'Received' },
};

export default function ProcurementPage() {
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showVendorCreate, setShowVendorCreate] = useState(false);
  const [showPOModal, setShowPOModal] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(null);
  const [deleteConfig, setDeleteConfig] = useState({ show: false, vendorId: null });
  const [processing, setProcessing] = useState(false);
  const toast = useToast();

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (tab === 'requests') {
        const res = await procurementService.getRequests();
        setRequests(res.data?.data || res.data || []);
      } else if (tab === 'vendors') {
        const res = await procurementService.getVendors();
        setVendors(res.data?.data || res.data || []);
      } else {
        const res = await procurementService.getPOs();
        setPOs(res.data?.data || res.data || []);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    if (processing) return;
    try {
      setProcessing(true);
      await procurementService.approveRequest(id);
      toast.success('Request approved');
      loadData();
    } catch {
      toast.error('Failed to approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id) => {
    if (processing) return;
    try {
      setProcessing(true);
      await procurementService.rejectRequest(id);
      toast.warning('Request rejected');
      loadData();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteVendor = async (id) => {
    setDeleteConfig({ show: true, vendorId: id });
  };

  const confirmDeleteVendor = async () => {
    try { 
      await procurementService.deleteVendor(deleteConfig.vendorId); 
      toast.success('Vendor deleted'); 
      setDeleteConfig({ show: false, vendorId: null });
      loadData(); 
    }
    catch { toast.error('Failed to delete vendor'); }
  };

  return (
    <PageWrapper
      title="Procurement"
      subtitle="Manage purchase requests, vendors & purchase orders"
      actions={
        <div className="flex gap-md">
          {tab === 'requests' && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Request</button>}
          {tab === 'vendors' && <button className="btn btn-primary" onClick={() => setShowVendorCreate(true)}><Plus size={16} /> Add Vendor</button>}
        </div>
      }
    >
      <div className="projects-filters" style={{ marginBottom: 'var(--space-lg)' }}>
        {['requests', 'purchase-orders', 'vendors'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'requests' ? `Requests (${requests.length})` : t === 'vendors' ? `Vendors (${vendors.length})` : `POs (${pos.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : tab === 'requests' ? (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Project</th><th>Status</th><th>Items</th><th>Requested By</th><th>Actions</th></tr></thead>
            <tbody>
              {requests.map(r => {
                const s = statusBadge[r.status] || statusBadge.PENDING;
                return (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.title}</td>
                    <td>{r.project?.name || '—'}</td>
                    <td><span className={`badge ${s.cls}`}><s.icon size={10} /> {s.label}</span></td>
                    <td>{r.items?.length || 0} items</td>
                    <td>{r.requestedBy?.firstName} {r.requestedBy?.lastName}</td>
                    <td>
                      <div className="flex gap-xs">
                        {r.status === 'PENDING' && (
                          <>
                            <button className="btn btn-sm btn-ghost text-success" onClick={() => handleApprove(r.id)} disabled={processing}>Approve</button>
                            <button className="btn btn-sm btn-ghost text-danger" onClick={() => handleReject(r.id)} disabled={processing}>Reject</button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <button className="btn btn-sm btn-ghost text-primary" onClick={() => setShowPOModal(r)}>Create PO</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>No procurement requests yet</td></tr>}
            </tbody>
          </table>
        </div>
      ) : tab === 'vendors' ? (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Actions</th></tr></thead>
            <tbody>
              {vendors.map(v => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v.name}</td>
                  <td>{v.email || '—'}</td>
                  <td>{v.phone || '—'}</td>
                  <td className="text-sm">{v.address || '—'}</td>
                  <td>
                    <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => handleDeleteVendor(v.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>No vendors registered</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>PO Number</th><th>Vendor</th><th>Total</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {pos.map(po => {
                const s = statusBadge[po.status] || statusBadge.DRAFT;
                return (
                  <tr key={po.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{po.poNumber}</td>
                    <td>{po.vendor?.name || '—'}</td>
                    <td className="font-semibold">{formatCurrency(po.totalAmount)}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td className="text-sm">{new Date(po.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      {po.status !== 'RECEIVED' ? (
                        <button className="btn btn-sm btn-ghost btn-icon text-success" title="Receive Goods" onClick={() => setShowReceiveModal(po)}>
                          <Package size={14} /> <span style={{ marginLeft: 4 }}>Receive</span>
                        </button>
                      ) : (
                        <span className="text-muted text-sm flex items-center gap-xs"><CheckCircle size={14} className="text-success" /> Received</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pos.length === 0 && <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>No purchase orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateRequestModal onClose={() => setShowCreate(false)} onCreated={loadData} />}
      {showVendorCreate && <CreateVendorModal onClose={() => setShowVendorCreate(false)} onCreated={loadData} />}
      {showPOModal && <CreatePOModal request={showPOModal} onClose={() => setShowPOModal(null)} onCreated={loadData} />}
      {showReceiveModal && <ReceivePOModal po={showReceiveModal} onClose={() => setShowReceiveModal(null)} onCreated={loadData} />}

      <ConfirmModal
        isOpen={deleteConfig.show}
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor? This will remove their record from the system."
        onConfirm={confirmDeleteVendor}
        onClose={() => setDeleteConfig({ show: false, vendorId: null })}
        type="danger"
      />
    </PageWrapper>
  );
}

function CreateRequestModal({ onClose, onCreated }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ projectId: '', title: '', description: '', items: [] });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    projectService.getAll().then(res => setProjects(res.data?.data || res.data || [])).catch(() => {});
  }, []);

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { description: '', quantity: 1, unit: 'pcs', estimatedRate: 0 }] }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    setForm({ ...form, items: newItems });
  };

  const removeItem = (index) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.projectId || !form.title) { toast.warning('Select project and enter title'); return; }
    if (form.items.length === 0) { toast.warning('Please add at least one material item'); return; }
    for (const item of form.items) {
      if (!item.description || item.quantity <= 0) {
        toast.warning('All items must have a description and quantity > 0'); return;
      }
    }
    
    try {
      setSubmitting(true);
      await procurementService.createRequest(form);
      toast.success('Request created');
      onCreated();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header"><h3>New Procurement Request</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Project *</label>
                <select className="form-select" value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})}>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., Steel & Cement Supply" autoFocus />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional notes..." />
            </div>

            <div className="card-flat" style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)' }}>
              <div className="flex justify-between items-center mb-md">
                <h4 style={{ margin: 0 }}>Materials Needed</h4>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}><Plus size={14} /> Add Item</button>
              </div>
              
              {form.items.length === 0 ? (
                <div className="text-center text-muted text-sm py-md">No items added. Click 'Add Item' above.</div>
              ) : (
                <div className="flex flex-col gap-sm">
                  {form.items.map((item, index) => (
                    <div key={index} className="flex gap-sm items-start bg-white p-sm rounded border border-secondary">
                      <div className="form-group flex-1 m-0">
                        <label className="form-label text-xs">Description *</label>
                        <input className="form-input text-sm" value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} placeholder="e.g. Portland Cement" />
                      </div>
                      <div className="form-group m-0" style={{ width: '80px' }}>
                        <label className="form-label text-xs">Qty *</label>
                        <input className="form-input text-sm" type="number" min="0.1" step="0.1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value))} />
                      </div>
                      <div className="form-group m-0" style={{ width: '100px' }}>
                        <label className="form-label text-xs">Unit</label>
                        <select className="form-select text-sm" value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)}>
                          <option value="pcs">pcs</option>
                          <option value="bags">bags</option>
                          <option value="tonnes">tonnes</option>
                          <option value="kg">kg</option>
                          <option value="liters">liters</option>
                          <option value="m3">m³</option>
                          <option value="sqft">sqft</option>
                        </select>
                      </div>
                      <div className="form-group m-0" style={{ width: '120px' }}>
                        <label className="form-label text-xs">Est. Rate (₹)</label>
                        <input className="form-input text-sm" type="number" min="0" value={item.estimatedRate} onChange={e => updateItem(index, 'estimatedRate', parseFloat(e.target.value))} />
                      </div>
                      <div className="pt-xl mt-xs">
                        <button type="button" className="btn btn-icon btn-ghost text-danger" onClick={() => removeItem(index)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                  <div className="text-right text-sm font-semibold mt-xs text-primary">
                    Est. Total: ₹{form.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.estimatedRate || 0)), 0).toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateVendorModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.warning('Vendor name is required'); return; }
    try {
      setSubmitting(true);
      await procurementService.createVendor(form);
      toast.success('Vendor added');
      onCreated();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Add Vendor</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div className="form-group"><label className="form-label">Address</label><textarea className="form-input" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add Vendor'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatePOModal({ request, onClose, onCreated }) {
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ vendorId: '', items: [] });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    procurementService.getVendors().then(res => setVendors(res.data?.data || res.data || [])).catch(() => {});
    
    if (request?.items) {
      setForm(prev => ({
        ...prev,
        items: request.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.estimatedRate || 0
        }))
      }));
    }
  }, [request]);

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    setForm({ ...form, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId) { toast.warning('Please select a vendor'); return; }
    try {
      setSubmitting(true);
      await procurementService.createPO({
        vendorId: form.vendorId,
        requestId: request.id,
        items: form.items
      });
      toast.success('Purchase Order created');
      onCreated();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create PO'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h3>Create Purchase Order</h3>
          <span className="badge badge-gray text-xs ml-sm">from PR: {request.title}</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-group">
              <label className="form-label">Vendor *</label>
              <select className="form-select" value={form.vendorId} onChange={e => setForm({...form, vendorId: e.target.value})}>
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div className="card-flat" style={{ padding: 'var(--space-md)' }}>
              <h4 style={{ margin: '0 0 var(--space-md) 0' }}>PO Items (Pre-filled from Request)</h4>
              <div className="flex flex-col gap-sm">
                {form.items.map((item, index) => (
                  <div key={index} className="flex gap-sm items-start p-sm bg-secondary rounded border border-secondary">
                    <div className="form-group flex-1 m-0">
                      <label className="form-label text-xs">Description</label>
                      <input className="form-input text-sm" value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} />
                    </div>
                    <div className="form-group m-0" style={{ width: '80px' }}>
                      <label className="form-label text-xs">Qty</label>
                      <input className="form-input text-sm" type="number" step="0.1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value))} />
                    </div>
                    <div className="form-group m-0" style={{ width: '80px' }}>
                      <label className="form-label text-xs">Unit</label>
                      <input className="form-input text-sm" value={item.unit} readOnly />
                    </div>
                    <div className="form-group m-0" style={{ width: '120px' }}>
                      <label className="form-label text-xs">Final Rate (₹) *</label>
                      <input className="form-input text-sm font-semibold" type="number" min="0" value={item.rate} onChange={e => updateItem(index, 'rate', parseFloat(e.target.value))} />
                    </div>
                    <div className="form-group m-0" style={{ width: '120px' }}>
                      <label className="form-label text-xs">Total</label>
                      <input className="form-input text-sm font-bold bg-transparent" readOnly value={`₹${((item.quantity || 0) * (item.rate || 0)).toLocaleString('en-IN')}`} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right text-lg font-bold mt-md pt-md border-t border-secondary" style={{ color: 'var(--accent-primary)' }}>
                PO Total: ₹{form.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating PO...' : 'Confirm & Create PO'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReceivePOModal({ po, onClose, onReceived }) {
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    inventoryService.getWarehouses()
      .then(res => setWarehouses(res.data?.data || res.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warehouseId) {
      toast.warning('Please select a warehouse');
      return;
    }
    try {
      setSubmitting(true);
      await procurementService.receivePO(po.id, warehouseId);
      toast.success('Purchase order marked as received! Stocks and accounting updated.');
      onReceived();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive goods');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Receive Goods (GRN)</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <p className="text-sm text-muted">
              Select the destination warehouse to receive materials for <strong>{po.poNumber}</strong> (ordered from <strong>{po.vendor?.name}</strong>). This will automatically add items to your inventory stock and record the expense in Finance.
            </p>
            <div className="form-group">
              <label className="form-label">Warehouse *</label>
              <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                <option value="">Select destination warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Marking Received...' : 'Receive Goods & Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

