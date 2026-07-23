import React, { useState, useEffect } from 'react';
import { equipmentService, projectService } from '../../services/api';
import { Truck, Fuel, Settings, Trash2, MapPin, History, ArrowRightLeft, Home, Edit2 } from 'lucide-react';
import './Equipment.css';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/ui/ConfirmModal';

const TYPES = ['Excavator', 'Crane', 'Generator', 'Truck', 'Mixer', 'Compressor', 'Drill', 'JCB', 'Other'];

export default function EquipmentPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('register');
  const [equipment, setEquipment] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total: 0, operational: 0, inMaintenance: 0, idle: 0, rented: 0 });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [depReport, setDepReport] = useState({ assets: [], summary: {} });
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditDepModal, setShowEditDepModal] = useState(false);
  const [editDep, setEditDep] = useState(null);
  const [depToDelete, setDepToDelete] = useState(null);
  const [isDeletingDep, setIsDeletingDep] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showEditFuelModal, setShowEditFuelModal] = useState(false);
  const [editFuel, setEditFuel] = useState(null);
  const [fuelToDelete, setFuelToDelete] = useState(null);
  const [isDeletingFuel, setIsDeletingFuel] = useState(false);

  const [newItem, setNewItem] = useState({ name: '', type: 'Excavator', serialNumber: '', ownership: 'OWNED', projectId: '', dailyRentalRate: '', hourlyRate: '', purchaseCost: '', assetLifeYears: '10', depreciationMethod: 'SLM', purchaseDate: '' });
  const [deployForm, setDeployForm] = useState({ projectId: '', startDate: '', dailyRate: '', notes: '' });
  const [fuelForm, setFuelForm] = useState({ fuelType: 'DIESEL', quantity: '', costPerUnit: '', operatorName: '', projectId: '', notes: '' });
  const [fuelPurchases, setFuelPurchases] = useState([]);
  const [showBuyFuelModal, setShowBuyFuelModal] = useState(false);
  const [buyFuelForm, setBuyFuelForm] = useState({ date: new Date().toISOString().split('T')[0], vendorName: '', projectId: '', quantity: '', rate: '', notes: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      const [eqRes, statRes, projRes] = await Promise.all([
        equipmentService.getAll(params), equipmentService.getStats(), projectService.getAll()
      ]);
      setEquipment(eqRes.data.data || []);
      setStats(statRes.data.data || {});
      setProjects(projRes.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadDeployments = async () => {
    try { const { data } = await equipmentService.getDeployments(); setDeployments(data.data || []); } catch (e) { console.error(e); }
  };
  const loadFuelLogs = async () => {
    try { const { data } = await equipmentService.getFuelLogs(); setFuelLogs(data.data || []); } catch (e) { console.error(e); }
  };
  const loadFuelPurchases = async () => {
    try { const { data } = await equipmentService.getFuelPurchases(); setFuelPurchases(data.data || []); } catch (e) { console.error(e); }
  };
  const loadDepreciation = async () => {
    try { const { data } = await equipmentService.getDepreciation(); setDepReport(data.data || { assets: [], summary: {} }); } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, [filterType, filterStatus]);
  useEffect(() => {
    if (activeTab === 'deployments') loadDeployments();
    if (activeTab === 'fuel') loadFuelLogs();
    if (activeTab === 'fuel_container') loadFuelPurchases();
    if (activeTab === 'depreciation') loadDepreciation();
  }, [activeTab]);

  const handleEditFuel = async (e) => {
    e.preventDefault();
    if (!editFuel.quantity || !editFuel.costPerUnit) {
      toast.warning('Quantity and Rate are required');
      return;
    }
    setSubmitting(true);
    try {
      await equipmentService.updateFuelLog(editFuel.id, {
        equipmentId: editFuel.equipmentId,
        projectId: editFuel.projectId || null,
        fuelType: editFuel.fuelType,
        quantity: parseFloat(editFuel.quantity),
        costPerUnit: parseFloat(editFuel.costPerUnit),
        operatorName: editFuel.operatorName,
        date: editFuel.date || undefined,
        notes: editFuel.notes
      });
      toast.success('Fuel log record updated successfully');
      setShowEditFuelModal(false);
      loadFuelLogs();
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update fuel log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyFuelSubmit = async (e) => {
    e.preventDefault();
    if (!buyFuelForm.vendorName || !buyFuelForm.quantity || !buyFuelForm.rate) {
      toast.warning('Please enter Vendor Name, Quantity and Rate');
      return;
    }
    setSubmitting(true);
    try {
      await equipmentService.purchaseFuel({
        date: buyFuelForm.date,
        vendorName: buyFuelForm.vendorName,
        projectId: buyFuelForm.projectId || undefined,
        quantity: parseFloat(buyFuelForm.quantity),
        rate: parseFloat(buyFuelForm.rate),
        notes: buyFuelForm.notes
      });
      toast.success('Fuel purchase logged. Pending bill created in Finance!');
      setShowBuyFuelModal(false);
      setBuyFuelForm({ date: new Date().toISOString().split('T')[0], vendorName: '', projectId: '', quantity: '', rate: '', notes: '' });
      loadFuelPurchases();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to purchase fuel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFuel = async () => {
    if (!fuelToDelete || isDeletingFuel) return;
    setIsDeletingFuel(true);
    try {
      await equipmentService.deleteFuelLog(fuelToDelete.id);
      toast.success('Fuel log record deleted successfully');
      loadFuelLogs();
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete fuel log');
    } finally {
      setIsDeletingFuel(false);
      setFuelToDelete(null);
    }
  };

  const handleEditDep = async (e) => {
    e.preventDefault();
    if (!editDep.projectId || !editDep.startDate) {
      toast.warning('Project and Start Date are required');
      return;
    }
    setSubmitting(true);
    try {
      await equipmentService.updateDeployment(editDep.id, {
        projectId: editDep.projectId,
        startDate: editDep.startDate,
        endDate: editDep.endDate || null,
        dailyRate: editDep.dailyRate ? parseFloat(editDep.dailyRate) : undefined,
        hoursPerDay: editDep.hoursPerDay ? parseInt(editDep.hoursPerDay) : undefined,
        status: editDep.status,
        notes: editDep.notes
      });
      toast.success('Deployment record updated successfully');
      setShowEditDepModal(false);
      loadDeployments();
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update deployment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDep = async () => {
    if (!depToDelete || isDeletingDep) return;
    setIsDeletingDep(true);
    try {
      await equipmentService.deleteDeployment(depToDelete.id);
      toast.success('Deployment record deleted successfully');
      loadDeployments();
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete deployment');
    } finally {
      setIsDeletingDep(false);
      setDepToDelete(null);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editItem.name || !editItem.type) {
      toast.warning('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await equipmentService.update(editItem.id, {
        name: editItem.name,
        type: editItem.type,
        status: editItem.status,
        serialNumber: editItem.serialNumber || undefined,
        ownership: editItem.ownership,
        purchaseCost: editItem.purchaseCost ? parseFloat(editItem.purchaseCost) : undefined,
        purchaseDate: editItem.purchaseDate || undefined,
        assetLifeYears: editItem.assetLifeYears ? parseInt(editItem.assetLifeYears) : undefined,
        depreciationMethod: editItem.depreciationMethod || undefined,
        dailyRentalRate: editItem.dailyRentalRate ? parseFloat(editItem.dailyRentalRate) : undefined,
        hourlyRate: editItem.hourlyRate ? parseFloat(editItem.hourlyRate) : undefined,
        projectId: editItem.projectId || null
      });
      toast.success('Equipment asset updated successfully');
      setShowEditModal(false);
      setShowDrawer(false);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update equipment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await equipmentService.delete(itemToDelete.id);
      toast.success('Equipment asset deleted successfully');
      setShowDrawer(false);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete equipment');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      await equipmentService.create({
        ...newItem,
        dailyRentalRate: newItem.dailyRentalRate ? parseFloat(newItem.dailyRentalRate) : undefined,
        hourlyRate: newItem.hourlyRate ? parseFloat(newItem.hourlyRate) : undefined,
        purchaseCost: newItem.purchaseCost ? parseFloat(newItem.purchaseCost) : undefined,
        assetLifeYears: newItem.assetLifeYears ? parseInt(newItem.assetLifeYears) : undefined,
        depreciationMethod: newItem.depreciationMethod || undefined,
        purchaseDate: newItem.purchaseDate || undefined,
        projectId: newItem.projectId || undefined
      });
      setShowAddModal(false);
      setNewItem({ name: '', type: 'Excavator', serialNumber: '', ownership: 'OWNED', projectId: '', dailyRentalRate: '', hourlyRate: '', purchaseCost: '', assetLifeYears: '10', depreciationMethod: 'SLM', purchaseDate: '' });
      toast.success('Equipment registered successfully');
      loadData();
    } catch (e) { 
      toast.error(e.response?.data?.message || e.message || 'Failed to add equipment');
      console.error(e); 
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      await equipmentService.deployToProject(selectedEquipment.id, {
        ...deployForm, dailyRate: parseFloat(deployForm.dailyRate) || selectedEquipment.dailyRentalRate || 0
      });
      setShowDeployModal(false); 
      setShowDrawer(false);
      toast.success('Equipment deployed to project successfully');
      loadData(); 
      loadDeployments();
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Failed to deploy equipment'); 
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndDeployment = async (depId) => {
    if (!confirm('End this deployment? Cost will be calculated and recorded as expense.')) return;
    try {
      const { data } = await equipmentService.endDeployment(depId);
      toast.success(`Deployment ended. Total cost: ₹${data.data?.totalCost?.toLocaleString('en-IN') || 0}`);
      loadDeployments(); 
      loadData();
    } catch (e) { 
      toast.error('Failed to end deployment'); 
    }
  };

  const handleFuelLog = async (e) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      await equipmentService.addFuelLog(selectedEquipment.id, {
        ...fuelForm, quantity: parseFloat(fuelForm.quantity), costPerUnit: parseFloat(fuelForm.costPerUnit),
        projectId: fuelForm.projectId || undefined
      });
      setShowFuelModal(false); 
      setShowDrawer(false);
      toast.success('Fuel log recorded & expense created');
      loadFuelLogs();
      loadData();
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Failed to record fuel log'); 
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  const tabs = [
    { id: 'register', label: 'Equipment Register' },
    { id: 'deployments', label: 'Deployments' },
    { id: 'fuel', label: 'Fuel Logs' },
    { id: 'fuel_container', label: 'Fuel Container' },
    { id: 'depreciation', label: 'Depreciation' },
  ];

  return (
    <div className="equipment-page">
      <div className="labour-tab-bar">
        {tabs.map(t => (
          <button key={t.id} className={`labour-tab ${activeTab === t.id ? 'act' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        {activeTab === 'register' && <button className="btn-pp" onClick={() => setShowAddModal(true)}>+ Add Equipment</button>}
        {activeTab === 'fuel_container' && <button className="btn-pp" onClick={() => setShowBuyFuelModal(true)}>⛽ Purchase Fuel</button>}
      </div>

      {/* ─── REGISTER TAB ─── */}
      {activeTab === 'register' && (
        <div className="labour-content">
          <div className="att-summary-row">
            <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#059669' }}>{stats.operational}</div><div className="att-kpi-lbl">Operational</div></div>
            <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#D97706' }}>{stats.inMaintenance}</div><div className="att-kpi-lbl">In Maintenance</div></div>
            <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#4B5563' }}>{stats.idle}</div><div className="att-kpi-lbl">Idle</div></div>
            <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#3b82f6' }}>{stats.rented || 0}</div><div className="att-kpi-lbl">Rented</div></div>
          </div>
          <div className="labour-filter-bar">
            <select className="labour-filter-sel" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="labour-filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="OPERATIONAL">Operational</option><option value="MAINTENANCE">Maintenance</option><option value="IDLE">Idle</option>
            </select>
          </div>
          <div className="erp-card" style={{ overflowX: 'auto' }}>
            <table className="erp-tbl">
              <thead><tr><th>Machine</th><th>Type</th><th>Ownership</th><th>Rate/Day</th><th>Current Site</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Loading...</td></tr> :
                equipment.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>No equipment found.</td></tr> :
                equipment.map(item => (
                  <tr key={item.id}>
                    <td className="prim-cell">
                      <div className="worker-avatar" style={{ borderRadius: '6px' }}>{item.type[0]}</div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{item.name}</span>
                        <small style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.serialNumber || 'No S/N'}</small>
                      </div>
                    </td>
                    <td>{item.type}</td>
                    <td><span className={`status-pill ${item.ownership === 'OWNED' ? 'p-ok' : 'p-in'}`}>{item.ownership}</span></td>
                    <td>{item.dailyRentalRate ? fmt(item.dailyRentalRate) : '—'}</td>
                    <td>{item.project?.name || 'Central Yard'}</td>
                    <td><span className={`status-pill ${item.status === 'OPERATIONAL' ? 'p-ok' : item.status === 'MAINTENANCE' ? 'p-wn' : 'p-nt'}`}>{item.status}</span></td>
                    <td>
                      <button 
                        className="ra-btn-primary" 
                        onClick={() => { 
                          setSelectedEquipment(item); 
                          setShowDrawer(true); 
                        }}
                      >
                        <Settings size={12} />
                        <span>Actions</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="card-footer"><span>Showing {equipment.length} assets</span></div>
          </div>
        </div>
      )}

      {/* ─── DEPLOYMENTS TAB ─── */}
      {activeTab === 'deployments' && (
        <div className="labour-content">
          <div className="erp-card" style={{ overflowX: 'auto' }}>
            <div className="card-header"><span className="card-title">Equipment Deployment History</span></div>
            <table className="erp-tbl">
              <thead><tr><th>Equipment</th><th>Project</th><th>Start</th><th>End</th><th>Rate/Day</th><th>Total Cost</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {deployments.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No deployments yet</td></tr> :
                deployments.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.equipment?.name}</td>
                    <td>{d.project?.name}</td>
                    <td>{fmtDate(d.startDate)}</td>
                    <td>{fmtDate(d.endDate)}</td>
                    <td>{fmt(d.dailyRate)}</td>
                    <td style={{ fontWeight: 600 }}>{d.status === 'COMPLETED' ? fmt(d.totalCost) : '—'}</td>
                    <td><span className={`status-pill ${d.status === 'ACTIVE' ? 'p-ok' : 'p-nt'}`}>{d.status}</span></td>
                     <td>
                       <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                         {d.status === 'ACTIVE' && (
                           <button className="ra-btn" style={{ color: '#ef4444' }} onClick={() => handleEndDeployment(d.id)}>
                             End
                           </button>
                         )}
                         <button 
                           className="ra-btn" 
                           title="Edit deployment details"
                           onClick={() => {
                             setEditDep({
                               id: d.id,
                               equipmentId: d.equipmentId,
                               projectId: d.projectId,
                               startDate: d.startDate ? new Date(d.startDate).toISOString().split('T')[0] : '',
                               endDate: d.endDate ? new Date(d.endDate).toISOString().split('T')[0] : '',
                               dailyRate: d.dailyRate || '',
                               hoursPerDay: d.hoursPerDay || '',
                               status: d.status,
                               notes: d.notes || ''
                             });
                             setShowEditDepModal(true);
                           }}
                         >
                           <Edit2 size={12} />
                           <span>Edit</span>
                         </button>
                         <button 
                           className="ra-btn-danger" 
                           title="Delete deployment record"
                           onClick={() => setDepToDelete(d)}
                         >
                           <Trash2 size={12} />
                           <span>Delete</span>
                         </button>
                       </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── FUEL LOGS TAB ─── */}
      {activeTab === 'fuel' && (
        <div className="labour-content">
          <div className="erp-card" style={{ overflowX: 'auto' }}>
            <div className="card-header"><span className="card-title">Fuel / Running Cost Logs</span></div>
            <table className="erp-tbl">
              <thead><tr><th>Date</th><th>Equipment</th><th>Fuel</th><th>Qty (L)</th><th>Rate</th><th>Total</th><th>Project</th><th>Operator</th><th>Actions</th></tr></thead>
              <tbody>
                {fuelLogs.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No fuel logs yet</td></tr> :
                fuelLogs.map(f => (
                  <tr key={f.id}>
                    <td>{fmtDate(f.date)}</td>
                    <td style={{ fontWeight: 500 }}>{f.equipment?.name}</td>
                    <td>{f.fuelType}</td>
                    <td>{f.quantity}</td>
                    <td>{fmt(f.costPerUnit)}</td>
                    <td style={{ fontWeight: 600, color: '#ef4444' }}>{fmt(f.totalCost)}</td>
                    <td>{f.project?.name || '—'}</td>
                    <td>{f.operatorName || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button 
                          className="ra-btn" 
                          title="Edit fuel log"
                          onClick={() => {
                            setEditFuel({
                              id: f.id,
                              equipmentId: f.equipmentId,
                              projectId: f.projectId || '',
                              fuelType: f.fuelType,
                              quantity: f.quantity,
                              costPerUnit: f.costPerUnit,
                              operatorName: f.operatorName || '',
                              date: f.date ? new Date(f.date).toISOString().split('T')[0] : '',
                              notes: f.notes || ''
                            });
                            setShowEditFuelModal(true);
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button 
                          className="ra-btn-danger" 
                          title="Delete fuel log"
                          onClick={() => setFuelToDelete(f)}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── FUEL CONTAINER TAB ─── */}
      {activeTab === 'fuel_container' && (
        <div className="labour-content">
          <div className="erp-card" style={{ overflowX: 'auto' }}>
            <div className="card-header">
              <span className="card-title">Bulk Fuel Purchases (Fuel Container Log)</span>
            </div>
            <table className="erp-tbl">
              <thead>
                <tr>
                  <th>Purchase Date</th>
                  <th>Vendor / Station Name</th>
                  <th>Allocated Project</th>
                  <th>Quantity (L)</th>
                  <th>Rate (₹/L)</th>
                  <th>Total Cost</th>
                  <th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {fuelPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No bulk fuel container purchases recorded yet. Click <strong>"Purchase Fuel"</strong> to add.
                    </td>
                  </tr>
                ) : (
                  fuelPurchases.map(p => {
                    const vendorName = p.metadata?.vendorName || '—';
                    const projectName = p.metadata?.projectName || 'Central Yard';
                    const qty = p.metadata?.quantity || 0;
                    const rate = p.metadata?.rate || 0;
                    return (
                      <tr key={p.id}>
                        <td>{fmtDate(p.date)}</td>
                        <td style={{ fontWeight: 500 }}>{vendorName}</td>
                        <td>{projectName}</td>
                        <td>{qty} Liters</td>
                        <td>{fmt(rate)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{fmt(p.amount)}</td>
                        <td>
                          {p.status === 'PENDING' ? (
                            <span className="badge" style={{ background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11 }}>⏳ Awaiting Payment</span>
                          ) : (
                            <span className="badge" style={{ background: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11 }}>✅ Paid & Posted</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── DEPRECIATION TAB ─── */}
      {activeTab === 'depreciation' && (
        <div className="labour-content">
          <div className="att-summary-row">
            <div className="att-kpi"><div className="att-kpi-val">{fmt(depReport.summary?.totalAssetValue)}</div><div className="att-kpi-lbl">Total Asset Value</div></div>
            <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#10b981' }}>{fmt(depReport.summary?.totalBookValue)}</div><div className="att-kpi-lbl">Current Book Value</div></div>
            <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#ef4444' }}>{fmt(depReport.summary?.totalDepreciation)}</div><div className="att-kpi-lbl">Total Depreciation</div></div>
          </div>
          <div className="erp-card" style={{ overflowX: 'auto' }}>
            <div className="card-header"><span className="card-title">Asset Depreciation Report</span></div>
            <table className="erp-tbl">
              <thead><tr><th>Equipment</th><th>Type</th><th>Purchase Cost</th><th>Method</th><th>Life (Yrs)</th><th>Months Used</th><th>Monthly Dep.</th><th>Total Dep.</th><th>Book Value</th><th>Dep %</th></tr></thead>
              <tbody>
                {depReport.assets?.length === 0 ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No owned equipment with purchase cost recorded</td></tr> :
                depReport.assets?.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td>{a.type}</td>
                    <td>{fmt(a.purchaseCost)}</td>
                    <td><span style={{ fontSize: 11, background: 'var(--surface-secondary)', padding: '2px 6px', borderRadius: 4 }}>{a.method}</span></td>
                    <td>{a.lifeYears}</td>
                    <td>{a.monthsUsed}</td>
                    <td style={{ color: '#f59e0b' }}>{fmt(a.monthlyDepreciation)}</td>
                    <td style={{ color: '#ef4444' }}>{fmt(a.totalDepreciation)}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{fmt(a.currentBookValue)}</td>
                    <td>
                      <div className="progressBar" style={{ height: 6, borderRadius: 3, width: 60 }}>
                        <div className="progressFill" style={{ width: `${Math.min(a.depreciationPct, 100)}%`, background: a.depreciationPct > 80 ? '#ef4444' : '#f59e0b' }} />
                      </div>
                      <span className="text-xs text-muted">{a.depreciationPct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ADD EQUIPMENT MODAL ─── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><span className="modal-title">Add Equipment</span><span className="modal-close" onClick={() => setShowAddModal(false)}>×</span></div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="fld"><label className="fld-lbl">Equipment Name *</label><input className="fld-inp" required value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="e.g. JCB 3DX" /></div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Type *</label><select className="fld-sel" value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value }))}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="fld"><label className="fld-lbl">Serial Number</label><input className="fld-inp" value={newItem.serialNumber} onChange={e => setNewItem(p => ({ ...p, serialNumber: e.target.value }))} /></div>
                </div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Ownership *</label><select className="fld-sel" value={newItem.ownership} onChange={e => setNewItem(p => ({ ...p, ownership: e.target.value }))}><option value="OWNED">Owned</option><option value="RENTED">Rented</option></select></div>
                  {newItem.ownership === 'OWNED' ? (
                    <div className="fld"><label className="fld-lbl">Purchase Cost (₹)</label><input className="fld-inp" type="number" value={newItem.purchaseCost} onChange={e => setNewItem(p => ({ ...p, purchaseCost: e.target.value }))} placeholder="Buying cost" /></div>
                  ) : (
                    <div className="fld"><label className="fld-lbl">Daily Rental Rate (₹)</label><input className="fld-inp" type="number" value={newItem.dailyRentalRate} onChange={e => setNewItem(p => ({ ...p, dailyRentalRate: e.target.value }))} /></div>
                  )}
                </div>
                {newItem.ownership === 'OWNED' && (
                  <div className="form-2col">
                    <div className="fld"><label className="fld-lbl">Purchase Date</label><input className="fld-inp" type="date" value={newItem.purchaseDate} onChange={e => setNewItem(p => ({ ...p, purchaseDate: e.target.value }))} /></div>
                    <div className="fld"><label className="fld-lbl">Asset Life (Years)</label><input className="fld-inp" type="number" value={newItem.assetLifeYears} onChange={e => setNewItem(p => ({ ...p, assetLifeYears: e.target.value }))} /></div>
                  </div>
                )}
                {newItem.ownership === 'OWNED' && (
                  <div className="fld"><label className="fld-lbl">Depreciation Method</label><select className="fld-sel" value={newItem.depreciationMethod} onChange={e => setNewItem(p => ({ ...p, depreciationMethod: e.target.value }))}><option value="SLM">Straight Line (SLM)</option><option value="WDV">Written Down Value (WDV - 15%)</option></select></div>
                )}
                {newItem.ownership === 'RENTED' && (
                  <div className="fld"><label className="fld-lbl">Hourly Rate (₹, optional)</label><input className="fld-inp" type="number" value={newItem.hourlyRate} onChange={e => setNewItem(p => ({ ...p, hourlyRate: e.target.value }))} /></div>
                )}
                <div className="fld"><label className="fld-lbl">Current Project</label><select className="fld-sel" value={newItem.projectId} onChange={e => setNewItem(p => ({ ...p, projectId: e.target.value }))}><option value="">Central Yard</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-gp" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-pp" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DEPLOY MODAL ─── */}
      {showDeployModal && selectedEquipment && (
        <div className="modal-overlay" onClick={() => setShowDeployModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">
                {selectedEquipment.projectId ? 'Transfer' : 'Deploy'}: {selectedEquipment.name}
              </span>
              <span className="modal-close" onClick={() => setShowDeployModal(false)}>×</span>
            </div>
            <form onSubmit={handleDeploy}>
              <div className="modal-body">
                <div className="fld">
                  <label className="fld-lbl">
                    {selectedEquipment.projectId ? 'Transfer to Project *' : 'Assign to Project *'}
                  </label>
                  <select className="fld-sel" required value={deployForm.projectId} onChange={e => setDeployForm(p => ({ ...p, projectId: e.target.value }))}>
                    <option value="">Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Start Date *</label><input className="fld-inp" type="date" required value={deployForm.startDate} onChange={e => setDeployForm(p => ({ ...p, startDate: e.target.value }))} /></div>
                  <div className="fld"><label className="fld-lbl">Daily Rate (₹)</label><input className="fld-inp" type="number" value={deployForm.dailyRate} onChange={e => setDeployForm(p => ({ ...p, dailyRate: e.target.value }))} placeholder={`Default: ${selectedEquipment.dailyRentalRate || 0}`} /></div>
                </div>
                <div className="fld"><label className="fld-lbl">Notes</label><input className="fld-inp" value={deployForm.notes} onChange={e => setDeployForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-gp" onClick={() => setShowDeployModal(false)}>Cancel</button>
                <button type="submit" className="btn-pp" disabled={submitting}>
                  {submitting ? 'Saving...' : (selectedEquipment.projectId ? 'Confirm Transfer' : 'Deploy to Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT EQUIPMENT MODAL ─── */}
      {showEditModal && editItem && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><span className="modal-title">Edit Equipment</span><span className="modal-close" onClick={() => setShowEditModal(false)}>×</span></div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="fld"><label className="fld-lbl">Equipment Name *</label><input className="fld-inp" required value={editItem.name} onChange={e => setEditItem(p => ({ ...p, name: e.target.value }))} placeholder="e.g. JCB 3DX" /></div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Type *</label><select className="fld-sel" value={editItem.type} onChange={e => setEditItem(p => ({ ...p, type: e.target.value }))}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="fld"><label className="fld-lbl">Status *</label><select className="fld-sel" value={editItem.status} onChange={e => setEditItem(p => ({ ...p, status: e.target.value }))}><option value="OPERATIONAL">Operational</option><option value="MAINTENANCE">Maintenance</option><option value="IDLE">Idle</option><option value="REPAIR">Repair</option></select></div>
                </div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Serial Number</label><input className="fld-inp" value={editItem.serialNumber || ''} onChange={e => setEditItem(p => ({ ...p, serialNumber: e.target.value }))} /></div>
                  <div className="fld"><label className="fld-lbl">Current Project</label><select className="fld-sel" value={editItem.projectId || ''} onChange={e => setEditItem(p => ({ ...p, projectId: e.target.value }))}><option value="">Central Yard</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Ownership *</label><select className="fld-sel" value={editItem.ownership} onChange={e => setEditItem(p => ({ ...p, ownership: e.target.value }))}><option value="OWNED">Owned</option><option value="RENTED">Rented</option></select></div>
                  {editItem.ownership === 'OWNED' ? (
                    <div className="fld"><label className="fld-lbl">Purchase Cost (₹)</label><input className="fld-inp" type="number" value={editItem.purchaseCost || ''} onChange={e => setEditItem(p => ({ ...p, purchaseCost: e.target.value }))} placeholder="Buying cost" /></div>
                  ) : (
                    <div className="fld"><label className="fld-lbl">Daily Rental Rate (₹)</label><input className="fld-inp" type="number" value={editItem.dailyRentalRate || ''} onChange={e => setEditItem(p => ({ ...p, dailyRentalRate: e.target.value }))} /></div>
                  )}
                </div>
                {editItem.ownership === 'OWNED' && (
                  <div className="form-2col">
                    <div className="fld"><label className="fld-lbl">Purchase Date</label><input className="fld-inp" type="date" value={editItem.purchaseDate || ''} onChange={e => setEditItem(p => ({ ...p, purchaseDate: e.target.value }))} /></div>
                    <div className="fld"><label className="fld-lbl">Asset Life (Years)</label><input className="fld-inp" type="number" value={editItem.assetLifeYears || ''} onChange={e => setEditItem(p => ({ ...p, assetLifeYears: e.target.value }))} /></div>
                  </div>
                )}
                {editItem.ownership === 'OWNED' && (
                  <div className="fld"><label className="fld-lbl">Depreciation Method</label><select className="fld-sel" value={editItem.depreciationMethod || 'SLM'} onChange={e => setEditItem(p => ({ ...p, depreciationMethod: e.target.value }))}><option value="SLM">Straight Line (SLM)</option><option value="WDV">Written Down Value (WDV - 15%)</option></select></div>
                )}
                {editItem.ownership === 'RENTED' && (
                  <div className="fld"><label className="fld-lbl">Hourly Rate (₹, optional)</label><input className="fld-inp" type="number" value={editItem.hourlyRate || ''} onChange={e => setEditItem(p => ({ ...p, hourlyRate: e.target.value }))} /></div>
                )}
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-gp" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-pp" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Equipment Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Equipment Asset"
        message={`Are you sure you want to permanently delete the equipment "${itemToDelete?.name}" (${itemToDelete?.serialNumber || 'No Serial Number'})? This action cannot be undone.`}
        confirmText="Delete Asset"
        disabled={isDeleting}
      />

      {/* ─── EDIT DEPLOYMENT MODAL ─── */}
      {showEditDepModal && editDep && (
        <div className="modal-overlay" onClick={() => setShowEditDepModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><span className="modal-title">Edit Deployment Record</span><span className="modal-close" onClick={() => setShowEditDepModal(false)}>×</span></div>
            <form onSubmit={handleEditDep}>
              <div className="modal-body">
                <div className="fld">
                  <label className="fld-lbl">Project *</label>
                  <select className="fld-sel" required value={editDep.projectId} onChange={e => setEditDep(p => ({ ...p, projectId: e.target.value }))}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Start Date *</label><input className="fld-inp" type="date" required value={editDep.startDate} onChange={e => setEditDep(p => ({ ...p, startDate: e.target.value }))} /></div>
                  <div className="fld"><label className="fld-lbl">End Date</label><input className="fld-inp" type="date" value={editDep.endDate} onChange={e => setEditDep(p => ({ ...p, endDate: e.target.value }))} /></div>
                </div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Daily Rate (₹)</label><input className="fld-inp" type="number" value={editDep.dailyRate} onChange={e => setEditDep(p => ({ ...p, dailyRate: e.target.value }))} /></div>
                  <div className="fld"><label className="fld-lbl">Hours Per Day</label><input className="fld-inp" type="number" value={editDep.hoursPerDay} onChange={e => setEditDep(p => ({ ...p, hoursPerDay: e.target.value }))} /></div>
                </div>
                <div className="form-2col">
                  <div className="fld">
                    <label className="fld-lbl">Status *</label>
                    <select className="fld-sel" required value={editDep.status} onChange={e => setEditDep(p => ({ ...p, status: e.target.value }))}>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div className="fld"><label className="fld-lbl">Notes</label><input className="fld-inp" value={editDep.notes} onChange={e => setEditDep(p => ({ ...p, notes: e.target.value }))} /></div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-gp" onClick={() => setShowEditDepModal(false)}>Cancel</button>
                <button type="submit" className="btn-pp" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Deployment Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!depToDelete}
        onClose={() => setDepToDelete(null)}
        onConfirm={handleDeleteDep}
        title="Delete Deployment Record"
        message={`Are you sure you want to permanently delete the deployment history record of this equipment? This action cannot be undone.`}
        confirmText="Delete Record"
        disabled={isDeletingDep}
      />
      {showFuelModal && selectedEquipment && (
        <div className="modal-overlay" onClick={() => setShowFuelModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><span className="modal-title">Fuel Log: {selectedEquipment.name}</span><span className="modal-close" onClick={() => setShowFuelModal(false)}>×</span></div>
            <form onSubmit={handleFuelLog}>
              <div className="modal-body">
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Fuel Type</label><select className="fld-sel" value={fuelForm.fuelType} onChange={e => setFuelForm(p => ({ ...p, fuelType: e.target.value }))}><option value="DIESEL">Diesel</option><option value="PETROL">Petrol</option><option value="ELECTRIC">Electric</option></select></div>
                  <div className="fld"><label className="fld-lbl">Project</label><select className="fld-sel" value={fuelForm.projectId} onChange={e => setFuelForm(p => ({ ...p, projectId: e.target.value }))}><option value="">—</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Quantity (Litres) *</label><input className="fld-inp" type="number" step="0.1" required value={fuelForm.quantity} onChange={e => setFuelForm(p => ({ ...p, quantity: e.target.value }))} /></div>
                  <div className="fld"><label className="fld-lbl">Cost per Litre (₹) *</label><input className="fld-inp" type="number" step="0.1" required value={fuelForm.costPerUnit} onChange={e => setFuelForm(p => ({ ...p, costPerUnit: e.target.value }))} /></div>
                </div>
                {fuelForm.quantity && fuelForm.costPerUnit && <div style={{ padding: '8px 12px', background: 'var(--surface-secondary)', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>Total: {fmt(parseFloat(fuelForm.quantity) * parseFloat(fuelForm.costPerUnit))}</div>}
                <div className="fld"><label className="fld-lbl">Operator Name</label><input className="fld-inp" value={fuelForm.operatorName} onChange={e => setFuelForm(p => ({ ...p, operatorName: e.target.value }))} /></div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-gp" onClick={() => setShowFuelModal(false)}>Cancel</button>
                <button type="submit" className="btn-pp" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Fuel Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─── SLIDE-OUT ACTIONS DRAWER ─── */}
      <div className={`drawer-overlay ${showDrawer && selectedEquipment ? 'active' : ''}`} onClick={() => setShowDrawer(false)}>
        <div className="drawer-container" onClick={e => e.stopPropagation()}>
          <div className="drawer-header">
            <span className="drawer-title">Equipment details & Actions</span>
            <span className="drawer-close" onClick={() => setShowDrawer(false)}>×</span>
          </div>
          {selectedEquipment && (
            <div className="drawer-body">
              {/* Asset Information Section */}
              <div className="drawer-section">
                <span className="drawer-section-title">Asset Information</span>
                <div className="drawer-detail-grid">
                  <div className="drawer-detail-item"><span className="drawer-detail-lbl">Name</span><span className="drawer-detail-val">{selectedEquipment.name}</span></div>
                  <div className="drawer-detail-item"><span className="drawer-detail-lbl">Type</span><span className="drawer-detail-val">{selectedEquipment.type}</span></div>
                  <div className="drawer-detail-item"><span className="drawer-detail-lbl">Chassis / Serial</span><span className="drawer-detail-val">{selectedEquipment.serialNumber || '—'}</span></div>
                  <div className="drawer-detail-item"><span className="drawer-detail-lbl">Ownership</span><span className="drawer-detail-val">{selectedEquipment.ownership}</span></div>
                  <div className="drawer-detail-item"><span className="drawer-detail-lbl">Current Site</span><span className="drawer-detail-val">{selectedEquipment.project?.name || 'Central Yard'}</span></div>
                  <div className="drawer-detail-item"><span className="drawer-detail-lbl">Status</span><span className="drawer-detail-val">{selectedEquipment.status}</span></div>
                </div>
              </div>

              {/* Financial & Depreciation Details (If OWNED) */}
              {selectedEquipment.ownership === 'OWNED' && (
                <div className="drawer-section">
                  <span className="drawer-section-title">Depreciation & Purchase Info</span>
                  <div className="drawer-detail-grid">
                    <div className="drawer-detail-item"><span className="drawer-detail-lbl">Purchase Cost</span><span className="drawer-detail-val">{selectedEquipment.purchaseCost ? fmt(selectedEquipment.purchaseCost) : '—'}</span></div>
                    <div className="drawer-detail-item"><span className="drawer-detail-lbl">Purchase Date</span><span className="drawer-detail-val">{fmtDate(selectedEquipment.purchaseDate)}</span></div>
                    <div className="drawer-detail-item"><span className="drawer-detail-lbl">Asset Life</span><span className="drawer-detail-val">{selectedEquipment.assetLifeYears ? `${selectedEquipment.assetLifeYears} Years` : '—'}</span></div>
                    <div className="drawer-detail-item"><span className="drawer-detail-lbl">Method</span><span className="drawer-detail-val">{selectedEquipment.depreciationMethod || 'SLM'}</span></div>
                  </div>
                </div>
              )}

              {/* Rental Information (If RENTED) */}
              {selectedEquipment.ownership === 'RENTED' && (
                <div className="drawer-section">
                  <span className="drawer-section-title">Rental Terms</span>
                  <div className="drawer-detail-grid">
                    <div className="drawer-detail-item"><span className="drawer-detail-lbl">Daily Rent</span><span className="drawer-detail-val">{selectedEquipment.dailyRentalRate ? fmt(selectedEquipment.dailyRentalRate) : '—'}</span></div>
                    <div className="drawer-detail-item"><span className="drawer-detail-lbl">Hourly Rate</span><span className="drawer-detail-val">{selectedEquipment.hourlyRate ? fmt(selectedEquipment.hourlyRate) : '—'}</span></div>
                  </div>
                </div>
              )}

              {/* Operational Actions Section */}
              <div className="drawer-section">
                <span className="drawer-section-title">Operational Actions</span>
                <div className="drawer-actions-stack">
                  <button 
                    className="drawer-btn drawer-btn-primary"
                    onClick={() => {
                      setDeployForm({ 
                        projectId: '', 
                        startDate: new Date().toISOString().split('T')[0], 
                        dailyRate: selectedEquipment.dailyRentalRate || '', 
                        notes: '' 
                      }); 
                      setShowDeployModal(true);
                    }}
                  >
                    <Truck size={16} />
                    <span>{selectedEquipment.projectId ? 'Transfer to another site' : 'Deploy to project'}</span>
                  </button>

                  <button 
                    className="drawer-btn"
                    onClick={() => {
                      setFuelForm({ 
                        fuelType: 'DIESEL', 
                        quantity: '', 
                        costPerUnit: '', 
                        operatorName: '', 
                        projectId: selectedEquipment.projectId || '', 
                        notes: '' 
                      }); 
                      setShowFuelModal(true);
                    }}
                  >
                    <Fuel size={16} />
                    <span>Record Fuel Log</span>
                  </button>

                  {selectedEquipment.projectId && (
                    <button 
                      className="drawer-btn drawer-btn-danger"
                      onClick={async () => {
                        if (window.confirm(`Return ${selectedEquipment.name} to Central Yard?`)) {
                          try {
                            await equipmentService.update(selectedEquipment.id, { projectId: null, status: 'IDLE' });
                            toast.success(`${selectedEquipment.name} returned to Central Yard successfully`);
                            setShowDrawer(false);
                            loadData();
                          } catch (e) { toast.error('Failed to return equipment to Central Yard'); }
                        }
                      }}
                    >
                      <Home size={16} />
                      <span>Return to Central Yard</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Administrative Actions Section */}
              <div className="drawer-section">
                <span className="drawer-section-title">Administrative Actions</span>
                <div className="drawer-actions-stack">
                  <button 
                    className="drawer-btn"
                    onClick={() => {
                      setEditItem({
                        id: selectedEquipment.id,
                        name: selectedEquipment.name,
                        type: selectedEquipment.type,
                        status: selectedEquipment.status || 'OPERATIONAL',
                        serialNumber: selectedEquipment.serialNumber || '',
                        ownership: selectedEquipment.ownership,
                        purchaseCost: selectedEquipment.purchaseCost || '',
                        purchaseDate: selectedEquipment.purchaseDate ? new Date(selectedEquipment.purchaseDate).toISOString().split('T')[0] : '',
                        assetLifeYears: selectedEquipment.assetLifeYears || '',
                        depreciationMethod: selectedEquipment.depreciationMethod || 'SLM',
                        dailyRentalRate: selectedEquipment.dailyRentalRate || '',
                        hourlyRate: selectedEquipment.hourlyRate || '',
                        projectId: selectedEquipment.projectId || ''
                      });
                      setShowEditModal(true);
                    }}
                  >
                    <Edit2 size={16} />
                    <span>Edit Equipment Details</span>
                  </button>

                  <button 
                    className="drawer-btn drawer-btn-danger"
                    onClick={() => {
                      setItemToDelete(selectedEquipment);
                    }}
                  >
                    <Trash2 size={16} />
                    <span>Permanently Delete Asset</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── EDIT FUEL LOG MODAL ─── */}
      {showEditFuelModal && editFuel && (
        <div className="modal-overlay" onClick={() => setShowEditFuelModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><span className="modal-title">Edit Fuel Log</span><span className="modal-close" onClick={() => setShowEditFuelModal(false)}>×</span></div>
            <form onSubmit={handleEditFuel}>
              <div className="modal-body">
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Fuel Type</label><select className="fld-sel" value={editFuel.fuelType} onChange={e => setEditFuel(p => ({ ...p, fuelType: e.target.value }))}><option value="DIESEL">Diesel</option><option value="PETROL">Petrol</option><option value="ELECTRIC">Electric</option></select></div>
                  <div className="fld"><label className="fld-lbl">Project</label><select className="fld-sel" value={editFuel.projectId} onChange={e => setEditFuel(p => ({ ...p, projectId: e.target.value }))}><option value="">—</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Quantity (Litres) *</label><input className="fld-inp" type="number" step="0.1" required value={editFuel.quantity} onChange={e => setEditFuel(p => ({ ...p, quantity: e.target.value }))} /></div>
                  <div className="fld"><label className="fld-lbl">Cost per Litre (₹) *</label><input className="fld-inp" type="number" step="0.1" required value={editFuel.costPerUnit} onChange={e => setEditFuel(p => ({ ...p, costPerUnit: e.target.value }))} /></div>
                </div>
                {editFuel.quantity && editFuel.costPerUnit && <div style={{ padding: '8px 12px', background: 'var(--surface-secondary)', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>Total: {fmt(parseFloat(editFuel.quantity) * parseFloat(editFuel.costPerUnit))}</div>}
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Operator Name</label><input className="fld-inp" value={editFuel.operatorName} onChange={e => setEditFuel(p => ({ ...p, operatorName: e.target.value }))} /></div>
                  <div className="fld"><label className="fld-lbl">Date</label><input className="fld-inp" type="date" value={editFuel.date} onChange={e => setEditFuel(p => ({ ...p, date: e.target.value }))} /></div>
                </div>
                <div className="fld"><label className="fld-lbl">Notes</label><input className="fld-inp" value={editFuel.notes} onChange={e => setEditFuel(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-gp" onClick={() => setShowEditFuelModal(false)}>Cancel</button>
                <button type="submit" className="btn-pp" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Fuel Log Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!fuelToDelete}
        onClose={() => setFuelToDelete(null)}
        onConfirm={handleDeleteFuel}
        title="Delete Fuel Log Record"
        message={`Are you sure you want to permanently delete this fuel log of ${fuelToDelete?.quantity}L ${fuelToDelete?.fuelType} (Total Cost: ${fmt(fuelToDelete?.totalCost)})? This will also reverse the corresponding expense ledger transaction.`}
        confirmText="Delete Log"
        disabled={isDeletingFuel}
      />

      {/* ─── PURCHASE BULK FUEL MODAL ─── */}
      {showBuyFuelModal && (
        <div className="modal-overlay" onClick={() => setShowBuyFuelModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-head">
              <span className="modal-title">⛽ Purchase Bulk Fuel</span>
              <span className="modal-close" onClick={() => setShowBuyFuelModal(false)}>×</span>
            </div>
            <form onSubmit={handleBuyFuelSubmit}>
              <div className="modal-body">
                <div className="fld">
                  <label className="fld-lbl">Purchase Date *</label>
                  <input 
                    className="fld-inp" 
                    type="date" 
                    required 
                    value={buyFuelForm.date} 
                    onChange={e => setBuyFuelForm(p => ({ ...p, date: e.target.value }))} 
                  />
                </div>
                <div className="fld">
                  <label className="fld-lbl">Vendor / Station Name *</label>
                  <input 
                    className="fld-inp" 
                    placeholder="e.g. Shell Petrol Pump, HP, Indian Oil" 
                    required 
                    value={buyFuelForm.vendorName} 
                    onChange={e => setBuyFuelForm(p => ({ ...p, vendorName: e.target.value }))} 
                  />
                </div>
                <div className="fld">
                  <label className="fld-lbl">Allocated Project (Optional)</label>
                  <select 
                    className="fld-sel" 
                    value={buyFuelForm.projectId} 
                    onChange={e => setBuyFuelForm(p => ({ ...p, projectId: e.target.value }))}
                  >
                    <option value="">Central Yard (Default)</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-2col">
                  <div className="fld">
                    <label className="fld-lbl">Quantity (Liters) *</label>
                    <input 
                      className="fld-inp" 
                      type="number" 
                      step="0.01" 
                      required 
                      placeholder="e.g. 500" 
                      value={buyFuelForm.quantity} 
                      onChange={e => setBuyFuelForm(p => ({ ...p, quantity: e.target.value }))} 
                    />
                  </div>
                  <div className="fld">
                    <label className="fld-lbl">Rate per Liter (₹/L) *</label>
                    <input 
                      className="fld-inp" 
                      type="number" 
                      step="0.01" 
                      required 
                      placeholder="e.g. 96.5" 
                      value={buyFuelForm.rate} 
                      onChange={e => setBuyFuelForm(p => ({ ...p, rate: e.target.value }))} 
                    />
                  </div>
                </div>

                {buyFuelForm.quantity && buyFuelForm.rate && (
                  <div style={{ padding: '10px 14px', background: 'var(--surface-secondary)', borderRadius: 8, fontWeight: 700, fontSize: 15, color: 'var(--accent-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                    <span>Estimated Total Cost:</span>
                    <span>{fmt(parseFloat(buyFuelForm.quantity) * parseFloat(buyFuelForm.rate))}</span>
                  </div>
                )}

                <div className="fld" style={{ marginTop: 12 }}>
                  <label className="fld-lbl">Remarks / Notes</label>
                  <textarea 
                    className="fld-inp" 
                    placeholder="Any specific delivery instructions or invoice notes..." 
                    rows={2}
                    value={buyFuelForm.notes} 
                    onChange={e => setBuyFuelForm(p => ({ ...p, notes: e.target.value }))} 
                    style={{ resize: 'vertical', fontFamily: 'inherit', padding: '8px' }}
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-gp" onClick={() => setShowBuyFuelModal(false)}>Cancel</button>
                <button type="submit" className="btn-pp" disabled={submitting}>
                  {submitting ? 'Creating Bill...' : '⛽ Log & Generate Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
