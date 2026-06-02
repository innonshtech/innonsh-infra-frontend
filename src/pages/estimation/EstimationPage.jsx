import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { estimationService, projectService, userService, inventoryService } from '../../services/api';
import {
  Plus, Calculator, FileText, CheckCircle, Clock, ChevronRight,
  Trash2, Edit2, Loader, IndianRupee, Layers, Send, AlertCircle
} from 'lucide-react';
import './Estimation.css';
import ConfirmModal from '../../components/ui/ConfirmModal';

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

export default function EstimationPage() {
  const { user } = useAuth();
  const [estimations, setEstimations] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' or 'MY_APPROVALS'
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedEstimation, setSelectedEstimation] = useState(null);
  const [editingEstimation, setEditingEstimation] = useState(null);
  const [deleteConfig, setDeleteConfig] = useState({ show: false, estimationId: null });
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => { fetchEstimations(); }, []);

  const fetchEstimations = async () => {
    try {
      setLoading(true);
      const res = await estimationService.getAll();
      const data = res.data?.data || res.data || [];
      setEstimations(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load estimations');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeleteConfig({ show: true, estimationId: id });
  };

  const confirmDelete = async () => {
    try {
      await estimationService.delete?.(deleteConfig.estimationId);
      toast.success('Estimation deleted');
      setDeleteConfig({ show: false, estimationId: null });
      fetchEstimations();
    } catch { toast.error('Failed to delete'); }
  };

  if (selectedEstimation) {
    return <BOQEditor estimation={selectedEstimation} onBack={() => { setSelectedEstimation(null); fetchEstimations(); }} />;
  }

  const filteredEstimations = estimations.filter(est => {
    const latest = est.versions?.[0];
    if (activeTab === 'PENDING_MY_APPROVAL') {
      return latest?.status === 'PENDING_APPROVAL' && latest?.designatedApproverId === user.id;
    }
    if (activeTab === 'APPROVED_BY_ME') {
      return latest?.status === 'APPROVED' && latest?.approvedById === user.id;
    }
    return true;
  });

  return (
    <PageWrapper
      title="Estimation & BOQ"
      subtitle="Create and manage Bill of Quantities for your projects"
      actions={
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Estimation
        </button>
      }
    >
      <div className="labour-tab-bar" style={{ marginBottom: 'var(--space-lg)' }}>
        <button className={`labour-tab ${activeTab === 'ALL' ? 'act' : ''}`} onClick={() => setActiveTab('ALL')}>All Estimations</button>
        <button className={`labour-tab ${activeTab === 'PENDING_MY_APPROVAL' ? 'act' : ''}`} onClick={() => setActiveTab('PENDING_MY_APPROVAL')}>
          Pending My Approval
        </button>
        <button className={`labour-tab ${activeTab === 'APPROVED_BY_ME' ? 'act' : ''}`} onClick={() => setActiveTab('APPROVED_BY_ME')}>
          Approved By Me
        </button>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : filteredEstimations.length === 0 ? (
        <div className="empty-state">
          <Calculator size={48} />
          <h3>No Estimations Found</h3>
          <p>{activeTab === 'PENDING_MY_APPROVAL' ? 'You have no pending approvals at this time.' : 'Create your first estimation to start building BOQs for projects.'}</p>
        </div>
      ) : (
        <div className="estimation-grid">
          {filteredEstimations.map((est, i) => {
            const latestVersion = est.versions?.[0];
            const isPendingMe = latestVersion?.status === 'PENDING_APPROVAL' && latestVersion?.designatedApproverId === user.id;
            const isApprovedByMe = latestVersion?.status === 'APPROVED' && latestVersion?.approvedById === user.id;

            return (
              <div className="estimation-card card" key={est.id} onClick={() => setSelectedEstimation(est)} style={{ animationDelay: `${i * 60}ms`, position: 'relative' }}>
                <div className="flex justify-between items-center">
                  <span className={`badge ${est.status === 'APPROVED' || latestVersion?.status === 'APPROVED' ? 'badge-green' : 'badge-blue'}`}>
                    {latestVersion?.status === 'APPROVED' ? <><CheckCircle size={10} /> Approved</> : <><Clock size={10} /> {latestVersion?.status || 'Active'}</>}
                  </span>
                  <div className="flex gap-xs" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-icon btn-ghost btn-sm text-accent" onClick={(e) => { setEditingEstimation(est); setShowEdit(true); }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={(e) => handleDelete(est.id, e)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {isPendingMe && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-warning)', fontSize: '12px', fontWeight: 600 }}>
                    <AlertCircle size={12} /> Action Required: Review
                  </div>
                )}
                {isApprovedByMe && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-success)', fontSize: '12px', fontWeight: 600 }}>
                    <CheckCircle size={12} /> You Approved This
                  </div>
                )}

                <h3 className="project-card-title" style={{ marginTop: (isPendingMe || isApprovedByMe) ? '8px' : '16px' }}>{latestVersion?.title || 'Untitled Estimation'}</h3>
                <p className="project-card-desc" style={{ marginBottom: '8px' }}>{latestVersion?.description || 'No description'}</p>
                
                {/* Approval Track Record */}
                {(latestVersion?.requestedBy || latestVersion?.approvedBy) && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    {latestVersion.requestedBy && (
                      <div style={{ marginBottom: latestVersion.approvedBy ? '4px' : '0' }}>
                        <strong>Requested by:</strong> {latestVersion.requestedBy.firstName} {latestVersion.requestedBy.lastName}
                      </div>
                    )}
                    {latestVersion.approvedBy && (
                      <div>
                        <strong>Approved by:</strong> {latestVersion.approvedBy.firstName} {latestVersion.approvedBy.lastName}
                      </div>
                    )}
                  </div>
                )}
                <div className="estimation-card-footer">
                  <div className="flex items-center gap-sm">
                    <IndianRupee size={14} style={{ color: 'var(--accent-warning)' }} />
                    <span className="font-semibold">{formatCurrency(latestVersion?.totalAmount)}</span>
                  </div>
                  <div className="flex items-center gap-sm text-sm text-muted">
                    <Layers size={13} />
                    v{latestVersion?.versionNumber || 1}
                  </div>
                  <div className="flex items-center gap-xs text-sm" style={{ color: 'var(--accent-primary)' }}>
                    Open BOQ <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateEstimationModal onClose={() => setShowCreate(false)} onCreated={fetchEstimations} />}
      {showEdit && <EditEstimationModal isOpen={showEdit} estimation={editingEstimation} onClose={() => { setShowEdit(false); setEditingEstimation(null); }} onUpdated={fetchEstimations} />}

      <ConfirmModal
        isOpen={deleteConfig.show}
        title="Delete Estimation"
        message="Are you sure you want to delete this estimation? This will remove all versions and BOQ data."
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfig({ show: false, estimationId: null })}
        type="danger"
      />
    </PageWrapper>
  );
}

/* ─── Request Approval Wizard Modal ─────────────────────────────────────────────── */
function RequestApprovalModal({ isOpen, onClose, onSubmit, totalAmount }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form State
  const [selectedApprover, setSelectedApprover] = useState('');
  const [notes, setNotes] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedApprover('');
      setNotes('');
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getAll();
      const userList = res.data?.data || res.data || [];
      setUsers(userList.filter(u => u.isActive));
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
        
        {/* Wizard Header */}
        <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-secondary)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} style={{ color: 'var(--accent-primary)' }} /> Request BOQ Approval
            </h3>
            <button className="icon-btn" onClick={onClose}>✕</button>
          </div>
          
          {/* Progress Bar */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, height: '4px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '4px', background: step >= 2 ? 'var(--accent-primary)' : 'var(--border-secondary)', borderRadius: '2px', transition: 'all 0.3s' }} />
            <div style={{ flex: 1, height: '4px', background: step >= 3 ? 'var(--accent-primary)' : 'var(--border-secondary)', borderRadius: '2px', transition: 'all 0.3s' }} />
          </div>
          <div className="flex justify-between mt-sm text-xs text-muted font-medium">
            <span>Review</span>
            <span>Assign</span>
            <span>Confirm</span>
          </div>
        </div>

        <div style={{ padding: 'var(--space-lg)', minHeight: '220px' }}>
          {loading ? (
             <div className="page-loader"><div className="spinner"></div></div>
          ) : (
            <>
              {/* STEP 1: Review */}
              {step === 1 && (
                <div className="wizard-step fade-in">
                  <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>1. Review Estimation Value</h4>
                  <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border-secondary)' }}>
                    <div className="text-muted text-sm font-medium" style={{ marginBottom: '8px' }}>Total BOQ Amount</div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                      {formatCurrency(totalAmount)}
                    </div>
                    <p className="text-xs text-muted" style={{ marginTop: '12px' }}>
                      Ensure all quantities and rates are finalized before sending. Once sent, the BOQ will be locked.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: Assign Approver */}
              {step === 2 && (
                <div className="wizard-step fade-in">
                  <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>2. Assign Approver</h4>
                  <div className="form-group">
                    <label className="form-label">Select Authorized Approver *</label>
                    <select 
                      className="form-select" 
                      value={selectedApprover} 
                      onChange={e => setSelectedApprover(e.target.value)}
                      style={{ padding: '12px', fontSize: '14px' }}
                    >
                      <option value="">-- Choose Team Member --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <label className="form-label">Approval Notes (Optional)</label>
                    <textarea 
                      className="form-input" 
                      rows={3} 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. 'Steel rates have been updated to match the new vendor quote.'"
                      style={{ resize: 'none' }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Confirm */}
              {step === 3 && (
                <div className="wizard-step fade-in" style={{ textAlign: 'center', paddingTop: '20px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Send size={28} style={{ color: 'var(--accent-primary)', marginLeft: '-2px' }} />
                  </div>
                  <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Ready to Send</h4>
                  <p className="text-muted text-sm">
                    This will lock the estimation and notify the selected approver to review the BOQ totaling <strong>{formatCurrency(totalAmount)}</strong>.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div style={{ padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          {step > 1 ? (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>
          ) : (
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          )}
          
          {step < 3 ? (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (step === 2 && !selectedApprover) return toast.warning('Please select an approver to continue');
                setStep(s => s + 1);
              }}
              disabled={loading}
            >
              Continue
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => onSubmit(selectedApprover, notes)}
              disabled={loading}
            >
              Confirm & Send
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

/* ─── BOQ Editor (TreeGrid-style) ────────────────────────────────────────── */
function BOQEditor({ estimation, onBack }) {
  const [items, setItems] = useState([]);
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catalogItems, setCatalogItems] = useState([]);
  const [predefinedItems, setPredefinedItems] = useState([]);
  const [newItem, setNewItem] = useState({ inventoryItemId: '', description: '', quantity: '', unit: 'NOS', rate: '' });
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showProcurementPopup, setShowProcurementPopup] = useState(false);
  const [inventoryCheck, setInventoryCheck] = useState([]);
  const [checkingInventory, setCheckingInventory] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingForm, setEditingForm] = useState({ description: '', quantity: '', unit: '', rate: '', inventoryItemId: '' });
  const [editCatalogSearch, setEditCatalogSearch] = useState('');
  const [showEditCatalogDropdown, setShowEditCatalogDropdown] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const toast = useToast();

  useEffect(() => { loadEstimation(); loadCatalog(); }, []);

  const loadEstimation = async () => {
    try {
      setLoading(true);
      const res = await estimationService.getById(estimation.id);
      const data = res.data?.data || res.data;
      if (data?.versions?.length) {
        setVersions(data.versions);
        const latest = data.versions[0];
        setActiveVersion(latest);
        setItems(latest.items || []);
      }
    } catch { toast.error('Failed to load BOQ data'); }
    finally { setLoading(false); }
  };

  const loadCatalog = async () => {
    try {
      const res = await inventoryService.getItems();
      const data = res.data?.data || res.data || [];
      setCatalogItems(Array.isArray(data) ? data : []);
    } catch { /* silent */ }

    try {
      const stored = localStorage.getItem('erp_predefined_materials');
      const predefined = stored ? JSON.parse(stored) : [
        { id: '1', name: 'Portland Pozzolana Cement (PPC)', category: 'Cement', unit: 'BAG' },
        { id: '2', name: 'OPC 53 Grade Cement', category: 'Cement', unit: 'BAG' },
        { id: '3', name: 'TMT Steel Rebars (12mm)', category: 'Steel', unit: 'MT' },
        { id: '4', name: 'TMT Steel Rebars (10mm)', category: 'Steel', unit: 'MT' },
        { id: '5', name: 'Binding Wire', category: 'Steel', unit: 'KG' },
        { id: '6', name: 'Manufactured Sand (M-Sand)', category: 'Aggregate', unit: 'CUM' },
        { id: '7', name: 'Crushed Stone Aggregate (20mm)', category: 'Aggregate', unit: 'CUM' },
        { id: '8', name: 'AAC Blocks (600x200x200mm)', category: 'Masonry', unit: 'NOS' },
        { id: '9', name: 'Red Clay Bricks', category: 'Masonry', unit: 'NOS' },
        { id: '10', name: 'PVC Plumbing Pipe (1 inch)', category: 'Plumbing', unit: 'RMT' },
        { id: '11', name: 'FR Copper Wire (2.5 sq mm)', category: 'Electrical', unit: 'NOS' }
      ];
      setPredefinedItems(predefined);
    } catch { /* silent */ }
  };

  const selectCatalogItem = (catItem) => {
    setNewItem({ inventoryItemId: catItem.id, description: catItem.name, quantity: '', unit: catItem.unit, rate: '' });
    setShowCatalogDropdown(false);
    setCatalogSearch('');
  };

  const selectTemplateItem = (tplItem) => {
    setNewItem({ inventoryItemId: '', description: tplItem.name, quantity: '', unit: tplItem.unit, rate: '' });
    setShowCatalogDropdown(false);
    setCatalogSearch('');
  };

  const handleDescriptionChange = (val) => {
    setCatalogSearch(val);
    setNewItem({ ...newItem, description: val, inventoryItemId: '' });
    setShowCatalogDropdown(val.length > 0);
  };

  const filteredCatalog = catalogItems.filter(c =>
    c.name.toLowerCase().includes((catalogSearch || newItem.description || '').toLowerCase())
  );

  const filteredTemplates = predefinedItems.filter(t =>
    t.name.toLowerCase().includes((catalogSearch || newItem.description || '').toLowerCase())
  );

  const addItem = async () => {
    if (!newItem.description || !newItem.quantity || !newItem.rate) {
      toast.warning('Fill in Description, Qty, and Rate'); return;
    }
    try {
      await estimationService.addItem(estimation.id, {
        inventoryItemId: newItem.inventoryItemId || undefined,
        description: newItem.description,
        quantity: Number(newItem.quantity),
        unit: newItem.unit,
        rate: Number(newItem.rate),
      });
      setNewItem({ inventoryItemId: '', description: '', quantity: '', unit: 'NOS', rate: '' });
      toast.success('Item added');
      loadEstimation();
    } catch (err) {
      toast.error('Failed to add item: ' + (err.response?.data?.message || err.message));
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await estimationService.deleteItem(estimation.id, itemId);
      toast.success('Item removed');
      loadEstimation();
    } catch { toast.error('Failed to remove item'); }
  };

  const handleStartEdit = (item) => {
    setEditingItemId(item.id);
    setEditingForm({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      inventoryItemId: item.inventoryItemId || ''
    });
    setEditCatalogSearch('');
    setShowEditCatalogDropdown(false);
  };

  const handleEditDescriptionChange = (val) => {
    setEditCatalogSearch(val);
    setEditingForm({ ...editingForm, description: val, inventoryItemId: '' });
    setShowEditCatalogDropdown(val.length > 0);
  };

  const selectEditCatalogItem = (catItem) => {
    setEditingForm({
      ...editingForm,
      inventoryItemId: catItem.id,
      description: catItem.name,
      unit: catItem.unit
    });
    setShowEditCatalogDropdown(false);
    setEditCatalogSearch('');
  };

  const selectEditTemplateItem = (tplItem) => {
    setEditingForm({
      ...editingForm,
      inventoryItemId: '',
      description: tplItem.name,
      unit: tplItem.unit
    });
    setShowEditCatalogDropdown(false);
    setEditCatalogSearch('');
  };

  const saveEditItem = async (itemId) => {
    if (!editingForm.description || !editingForm.quantity || !editingForm.rate) {
      toast.warning('Fill in Description, Qty, and Rate'); return;
    }
    try {
      await estimationService.updateItem(estimation.id, itemId, {
        inventoryItemId: editingForm.inventoryItemId || null,
        description: editingForm.description,
        quantity: Number(editingForm.quantity),
        unit: editingForm.unit,
        rate: Number(editingForm.rate)
      });
      setEditingItemId(null);
      toast.success('Item updated');
      loadEstimation();
    } catch (err) {
      toast.error('Failed to update item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRequestApproval = async (approverId, notes) => {
    if (requesting) return;
    try {
      setRequesting(true);
      await estimationService.requestApproval(estimation.id, { designatedApproverId: approverId, notes });
      toast.success('Approval requested successfully');
      setShowRequestModal(false);
      loadEstimation();
    } catch (err) {
      toast.error('Failed to request approval: ' + (err.response?.data?.message || err.message));
    } finally {
      setRequesting(false);
    }
  };

  const approveEstimation = async () => {
    if (approving) return;
    try {
      setApproving(true);
      await estimationService.approve(estimation.id);
      toast.success('Estimation approved successfully');
      loadEstimation();
    } catch (err) {
      toast.error('Failed to approve: ' + (err.response?.data?.message || err.message));
    } finally {
      setApproving(false);
    }
  };

  const handleSendToProcurementClick = async () => {
    try {
      setCheckingInventory(true);
      const res = await estimationService.checkInventory(estimation.id, activeVersion.id);
      const data = res.data?.data || res.data || [];
      setInventoryCheck(data);
      setShowProcurementPopup(true);
    } catch (err) {
      toast.error('Failed to check inventory: ' + (err.response?.data?.message || err.message));
    } finally { setCheckingInventory(false); }
  };

  const confirmPushToProcurement = async () => {
    if (pushing) return;
    try {
      setPushing(true);
      await estimationService.pushToProcurement(estimation.id, activeVersion.id);
      toast.success('Procurement request generated successfully!');
      setShowProcurementPopup(false);
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setPushing(false);
    }
  };

  const createNewVersion = async () => {
    if (creatingVersion) return;
    try {
      setCreatingVersion(true);
      await estimationService.createNextVersion(estimation.id);
      toast.success('New version created');
      loadEstimation();
    } catch (err) {
      toast.error('Failed to create new version: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreatingVersion(false);
    }
  };

  const totalAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <>
    <PageWrapper
      title={activeVersion?.title || 'BOQ Editor'}
      subtitle={`Estimation for Project · Version ${activeVersion?.versionNumber || 1}`}
      actions={
        <div className="flex gap-md">
          {activeVersion?.status === 'DRAFT' && (
            <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>
              Request Approval
            </button>
          )}
          {activeVersion?.status === 'PENDING_APPROVAL' && (
            <button className="btn btn-primary" onClick={() => setShowApproveConfirm(true)} disabled={approving}>
              {approving ? 'Approving...' : 'Approve Version'}
            </button>
          )}
          {activeVersion?.status === 'APPROVED' && (
            <>
              <button className="btn btn-success" onClick={handleSendToProcurementClick} disabled={checkingInventory} style={{ background: 'var(--accent-success)', color: 'white' }}>
                {checkingInventory ? 'Checking...' : 'Send to Procurement'}
              </button>
              <button className="btn btn-primary" onClick={createNewVersion} disabled={creatingVersion}>
                {creatingVersion ? 'Creating...' : 'Create New Version'}
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={onBack} disabled={approving || creatingVersion || checkingInventory}>← Back to List</button>
        </div>
      }
    >
      {versions.length > 1 && (
        <div className="version-tabs">
          {versions.map((v) => (
            <button key={v.id} className={`version-tab ${activeVersion?.id === v.id ? 'active' : ''}`}
              onClick={() => { setActiveVersion(v); setItems(v.items || []); }}>
              v{v.versionNumber} — {v.status}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : (
        <div className="boq-table-wrapper">
          <table className="boq-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Description</th>
                <th style={{ width: '80px' }}>Unit</th>
                <th style={{ width: '100px' }}>Qty</th>
                <th style={{ width: '120px' }}>Rate (₹)</th>
                <th style={{ width: '130px' }}>Amount (₹)</th>
                <th style={{ width: '100px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                if (editingItemId === item.id) {
                  return (
                    <tr key={item.id}>
                      <td className="text-muted">{idx + 1}</td>
                      <td style={{ position: 'relative' }}>
                        <input className="boq-inline-input" placeholder="Search catalog or type..."
                          value={editingForm.description}
                          onChange={(e) => handleEditDescriptionChange(e.target.value)}
                          onFocus={() => { if (editingForm.description) setShowEditCatalogDropdown(true); }}
                          onBlur={() => setTimeout(() => setShowEditCatalogDropdown(false), 200)}
                        />
                        {showEditCatalogDropdown && (filteredCatalog.length > 0 || filteredTemplates.length > 0) && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-md)', maxHeight: '200px', overflowY: 'auto', zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
                            {filteredCatalog.length > 0 && (
                              <>
                                <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>INVENTORY CATALOG</div>
                                {filteredCatalog.map(c => (
                                  <div key={c.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between' }}
                                    onMouseDown={() => selectEditCatalogItem(c)}>
                                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{c.unit} · {c.category || 'General'}</span>
                                  </div>
                                ))}
                              </>
                            )}
                            {filteredTemplates.length > 0 && (
                              <>
                                <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>STANDARD MATERIAL TEMPLATES</div>
                                {filteredTemplates.map(t => (
                                  <div key={t.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between' }}
                                    onMouseDown={() => selectEditTemplateItem(t)}>
                                    <span style={{ fontWeight: 500 }}>{t.name}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t.unit} · {t.category || 'General'}</span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                        {editingForm.inventoryItemId && <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--accent-success)' }}>✓ Linked</span>}
                      </td>
                      <td>
                        <select className="boq-inline-input" value={editingForm.unit} onChange={(e) => setEditingForm({ ...editingForm, unit: e.target.value })} style={{ padding: '2px 4px' }}>
                          <option>NOS</option><option>KG</option><option>MT</option><option>BAG</option><option>SQM</option><option>CUM</option><option>RMT</option><option>LTR</option>
                        </select>
                      </td>
                      <td>
                        <input className="boq-inline-input" type="number" value={editingForm.quantity} onChange={(e) => setEditingForm({ ...editingForm, quantity: e.target.value })} style={{ width: '80px' }} />
                      </td>
                      <td>
                        <input className="boq-inline-input" type="number" value={editingForm.rate} onChange={(e) => setEditingForm({ ...editingForm, rate: e.target.value })} style={{ width: '100px' }} />
                      </td>
                      <td className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                        {Number(editingForm.quantity * editingForm.rate || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <div className="flex gap-xs" style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-link btn-xs text-accent" onClick={() => saveEditItem(item.id)} style={{ padding: '2px 4px', fontSize: '12px' }}>Save</button>
                          <span style={{ color: 'var(--border-secondary)' }}>|</span>
                          <button className="btn btn-link btn-xs text-muted" onClick={() => setEditingItemId(null)} style={{ padding: '2px 4px', fontSize: '12px' }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {item.description}
                      {item.inventoryItemId && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: '4px' }}>Catalog</span>}
                    </td>
                    <td>{item.unit}</td>
                    <td className="font-medium">{item.quantity}</td>
                    <td className="font-medium">{Number(item.rate).toLocaleString('en-IN')}</td>
                    <td className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                      {Number(item.amount).toLocaleString('en-IN')}
                    </td>
                    <td>
                      {(activeVersion?.status === 'DRAFT' || activeVersion?.status === 'PENDING_APPROVAL') && (
                        <div className="flex gap-xs">
                          <button className="btn btn-icon btn-ghost btn-sm text-accent" onClick={() => handleStartEdit(item)}>
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => deleteItem(item.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Add New Row (only for DRAFT or PENDING_APPROVAL) */}
              {(activeVersion?.status === 'DRAFT' || activeVersion?.status === 'PENDING_APPROVAL') && (
                <tr>
                  <td className="text-muted">+</td>
                  <td style={{ position: 'relative' }}>
                    <input className="boq-inline-input" placeholder="Search catalog or type new..."
                      value={newItem.description}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      onFocus={() => { if (newItem.description) setShowCatalogDropdown(true); }}
                      onBlur={() => setTimeout(() => setShowCatalogDropdown(false), 200)}
                    />
                    {showCatalogDropdown && (filteredCatalog.length > 0 || filteredTemplates.length > 0) && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-md)', maxHeight: '200px', overflowY: 'auto', zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
                        {filteredCatalog.length > 0 && (
                          <>
                            <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>INVENTORY CATALOG</div>
                            {filteredCatalog.map(c => (
                              <div key={c.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between' }}
                                onMouseDown={() => selectCatalogItem(c)}>
                                <span style={{ fontWeight: 500 }}>{c.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{c.unit} · {c.category || 'General'}</span>
                              </div>
                            ))}
                          </>
                        )}
                        {filteredTemplates.length > 0 && (
                          <>
                            <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>STANDARD MATERIAL TEMPLATES</div>
                            {filteredTemplates.map(t => (
                              <div key={t.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between' }}
                                onMouseDown={() => selectTemplateItem(t)}>
                                <span style={{ fontWeight: 500 }}>{t.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t.unit} · {t.category || 'General'}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    {newItem.inventoryItemId && <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--accent-success)' }}>✓ Linked</span>}
                  </td>
                  <td>
                    <select className="boq-inline-input" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}>
                      <option>NOS</option><option>SQM</option><option>CUM</option><option>RMT</option><option>KG</option><option>MT</option><option>LS</option><option>BAG</option>
                    </select>
                  </td>
                  <td><input className="boq-inline-input" type="number" placeholder="Qty" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} /></td>
                  <td><input className="boq-inline-input" type="number" placeholder="Rate" value={newItem.rate} onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })} /></td>
                  <td className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {newItem.quantity && newItem.rate ? Number(newItem.quantity * newItem.rate).toLocaleString('en-IN') : '—'}
                  </td>
                  <td>
                    <button className="btn btn-icon btn-ghost btn-sm" style={{ color: 'var(--accent-secondary)' }} onClick={addItem}>
                      <Plus size={14} />
                    </button>
                  </td>
                </tr>
              )}

              <tr className="total-row">
                <td colSpan={5} style={{ textAlign: 'right' }}>GRAND TOTAL</td>
                <td>{formatCurrency(totalAmount)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <RequestApprovalModal 
        isOpen={showRequestModal} 
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleRequestApproval}
        totalAmount={totalAmount}
      />

      {/* ─── Inventory Check Popup Before Procurement ─── */}
      {showProcurementPopup && (
        <div className="modal-overlay" onClick={() => setShowProcurementPopup(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ color: 'var(--accent-warning)' }} /> Inventory Cross-Check
              </h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowProcurementPopup(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Below is the current stock status for each item in this BOQ. Review before generating the procurement request.
              </p>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Material</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>BOQ Qty</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>In Stock</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>To Order</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryCheck.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-secondary)', background: item.currentStock > 0 ? 'rgba(34,197,94,0.05)' : 'transparent' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 500 }}>
                        {item.description}
                        {item.catalogLinked && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: '4px' }}>Catalog</span>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>{item.boqQuantity} {item.unit}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: item.currentStock > 0 ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                        {item.currentStock > 0 ? `${item.currentStock} ${item.unit}` : '0'}
                        {item.currentStock > 0 && <span style={{ display: 'block', fontSize: '10px', fontWeight: 400, color: 'var(--accent-success)' }}>Available</span>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: item.deficit > 0 ? 'var(--accent-danger, #ef4444)' : 'var(--accent-success)' }}>
                        {item.deficit > 0 ? `${item.deficit} ${item.unit}` : '✓ Covered'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventoryCheck.some(i => i.currentStock > 0) && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--accent-warning)' }}>
                  <strong>Note:</strong> Some materials are already available in your inventory. The full BOQ quantities will still be requested as-is. You can adjust manually if needed.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProcurementPopup(false)} disabled={pushing}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmPushToProcurement} disabled={pushing}>
                {pushing ? 'Generating...' : 'Confirm & Generate Request'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showApproveConfirm}
        title="Approve BOQ Version"
        message="Are you sure you want to approve this BOQ version? Once approved, it will be locked and ready to be pushed to procurement."
        onConfirm={() => {
          setShowApproveConfirm(false);
          approveEstimation();
        }}
        onClose={() => setShowApproveConfirm(false)}
        confirmText="Yes, Approve"
      />
    </PageWrapper>
    </>
  );
}

/* ─── Create Modal ──────────────────────────────────────────────────────── */
function CreateEstimationModal({ onClose, onCreated }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ projectId: '', title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    projectService.getAll().then(res => {
      const data = res.data?.data || res.data || [];
      setProjects(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.projectId || !form.title) { toast.warning('Select a project and enter a title'); return; }
    try {
      setSubmitting(true);
      await estimationService.create({ projectId: form.projectId, title: form.title, description: form.description || undefined });
      toast.success('Estimation created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.message || err.message));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Estimation</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="form-group">
              <label className="form-label">Project *</label>
              <select className="form-select" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g., Civil Works BOQ" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} placeholder="Optional description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Estimation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Edit Modal ────────────────────────────────────────────────────────── */
function EditEstimationModal({ isOpen, estimation, onClose, onUpdated }) {
  const [form, setForm] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && estimation) {
      const latest = estimation.versions?.[0];
      setForm({
        title: latest?.title || '',
        description: latest?.description || ''
      });
    }
  }, [isOpen, estimation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { toast.warning('Title is required'); return; }
    try {
      setSubmitting(true);
      await estimationService.update(estimation.id, { title: form.title, description: form.description || undefined });
      toast.success('Estimation updated successfully');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error('Failed to update: ' + (err.response?.data?.message || err.message));
    } finally { setSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Estimation</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g., Civil Works BOQ" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} placeholder="Optional description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
