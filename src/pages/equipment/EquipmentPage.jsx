import React, { useState, useEffect } from 'react';
import { equipmentService, projectService } from '../../services/api';
import { Truck, Fuel, Settings, Trash2, MapPin, History, ArrowRightLeft, Home } from 'lucide-react';
import './Equipment.css';

const TYPES = ['Excavator', 'Crane', 'Generator', 'Truck', 'Mixer', 'Compressor', 'Drill', 'JCB', 'Other'];

export default function EquipmentPage() {
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

  const [newItem, setNewItem] = useState({ name: '', type: 'Excavator', serialNumber: '', ownership: 'OWNED', projectId: '', dailyRentalRate: '', hourlyRate: '', purchaseCost: '', assetLifeYears: '10', depreciationMethod: 'SLM', purchaseDate: '' });
  const [deployForm, setDeployForm] = useState({ projectId: '', startDate: '', dailyRate: '', notes: '' });
  const [fuelForm, setFuelForm] = useState({ fuelType: 'DIESEL', quantity: '', costPerUnit: '', operatorName: '', projectId: '', notes: '' });

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
  const loadDepreciation = async () => {
    try { const { data } = await equipmentService.getDepreciation(); setDepReport(data.data || { assets: [], summary: {} }); } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, [filterType, filterStatus]);
  useEffect(() => {
    if (activeTab === 'deployments') loadDeployments();
    if (activeTab === 'fuel') loadFuelLogs();
    if (activeTab === 'depreciation') loadDepreciation();
  }, [activeTab]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
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
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    try {
      await equipmentService.deployToProject(selectedEquipment.id, {
        ...deployForm, dailyRate: parseFloat(deployForm.dailyRate) || selectedEquipment.dailyRentalRate || 0
      });
      setShowDeployModal(false); loadData(); loadDeployments();
      alert('Equipment deployed to project!');
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleEndDeployment = async (depId) => {
    if (!confirm('End this deployment? Cost will be calculated and recorded as expense.')) return;
    try {
      const { data } = await equipmentService.endDeployment(depId);
      alert(`Deployment ended. Total cost: ₹${data.data?.totalCost?.toLocaleString('en-IN') || 0}`);
      loadDeployments(); loadData();
    } catch (e) { alert('Failed to end deployment'); }
  };

  const handleFuelLog = async (e) => {
    e.preventDefault();
    try {
      await equipmentService.addFuelLog(selectedEquipment.id, {
        ...fuelForm, quantity: parseFloat(fuelForm.quantity), costPerUnit: parseFloat(fuelForm.costPerUnit),
        projectId: fuelForm.projectId || undefined
      });
      setShowFuelModal(false); loadFuelLogs();
      alert('Fuel log added & expense recorded!');
    } catch (e) { alert('Failed'); }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  const tabs = [
    { id: 'register', label: 'Equipment Register' },
    { id: 'deployments', label: 'Deployments' },
    { id: 'fuel', label: 'Fuel Logs' },
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
          <div className="erp-card">
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
                      <div className="row-actions" style={{ display: 'flex', gap: 6, opacity: 1 }}>
                        <button 
                          className="ra-btn-primary" 
                          title={item.projectId ? "Transfer to another site" : "Deploy to project"}
                          onClick={() => { 
                            setSelectedEquipment(item); 
                            setDeployForm({ 
                              projectId: '', 
                              startDate: new Date().toISOString().split('T')[0], 
                              dailyRate: item.dailyRentalRate || '', 
                              notes: '' 
                            }); 
                            setShowDeployModal(true); 
                          }}
                        >
                          {item.projectId ? <ArrowRightLeft size={12} /> : <Truck size={12} />}
                          <span>{item.projectId ? 'Transfer' : 'Deploy'}</span>
                        </button>
                        
                        <button 
                          className="ra-btn" 
                          title="Record Fuel/Cost"
                          onClick={() => { 
                            setSelectedEquipment(item); 
                            setFuelForm({ 
                              fuelType: 'DIESEL', 
                              quantity: '', 
                              costPerUnit: '', 
                              operatorName: '', 
                              projectId: item.projectId || '', 
                              notes: '' 
                            }); 
                            setShowFuelModal(true); 
                          }}
                        >
                          <Fuel size={12} />
                          <span>Fuel</span>
                        </button>

                        {item.projectId && (
                          <button 
                            className="ra-btn-danger" 
                            title="Return to Central Yard"
                            onClick={async () => {
                              if (window.confirm(`Return ${item.name} to Central Yard?`)) {
                                try {
                                  await equipmentService.update(item.id, { projectId: null, status: 'IDLE' });
                                  loadData();
                                } catch (e) { alert('Failed to return'); }
                              }
                            }}
                          >
                            <Home size={12} />
                            <span>Return</span>
                          </button>
                        )}
                      </div>
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
          <div className="erp-card">
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
                    <td>{d.status === 'ACTIVE' && <button className="ra-btn" style={{ color: '#ef4444' }} onClick={() => handleEndDeployment(d.id)}>End</button>}</td>
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
          <div className="erp-card">
            <div className="card-header"><span className="card-title">Fuel / Running Cost Logs</span></div>
            <table className="erp-tbl">
              <thead><tr><th>Date</th><th>Equipment</th><th>Fuel</th><th>Qty (L)</th><th>Rate</th><th>Total</th><th>Project</th><th>Operator</th></tr></thead>
              <tbody>
                {fuelLogs.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No fuel logs yet</td></tr> :
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
                  </tr>
                ))}
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
          <div className="erp-card">
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
              <div className="modal-foot"><button type="button" className="btn-gp" onClick={() => setShowAddModal(false)}>Cancel</button><button type="submit" className="btn-pp">Add Equipment</button></div>
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
                <button type="submit" className="btn-pp">
                  {selectedEquipment.projectId ? 'Confirm Transfer' : 'Deploy to Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── FUEL LOG MODAL ─── */}
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
              <div className="modal-foot"><button type="button" className="btn-gp" onClick={() => setShowFuelModal(false)}>Cancel</button><button type="submit" className="btn-pp">Save Fuel Log</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
