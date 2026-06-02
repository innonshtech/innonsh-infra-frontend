import React, { useState, useEffect, useCallback, useRef } from 'react';
import { labourService, projectService } from '../../services/api';
import './Labour.css';
import * as XLSX from 'xlsx';
import { generatePayrollPDF } from '../../utils/payrollPdf';

const ROLES = ['Mason', 'Electrician', 'Helper', 'Carpenter', 'Plumber', 'Painter', 'Welder', 'Supervisor'];

export default function LabourPage() {
  const [activeTab, setActiveTab] = useState('workers');
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Add Worker Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorker, setNewWorker] = useState({ firstName: '', lastName: '', phone: '', role: 'Mason', dailyWage: '', projectId: '' });

  // Attendance
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attProject, setAttProject] = useState('');
  const [attRecords, setAttRecords] = useState([]);
  const [attSummary, setAttSummary] = useState({ present: 0, absent: 0, halfDay: 0, totalWage: 0 });
  const [attDirty, setAttDirty] = useState(false);

  // Payroll
  const [payPeriod, setPayPeriod] = useState('week');
  const [payData, setPayData] = useState({ totalPayroll: 0, totalWorkers: 0, breakdown: [] });

  // Excel Upload
  const [uploadProject, setUploadProject] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const fileRef = useRef(null);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProject) params.projectId = filterProject;
      if (filterRole) params.role = filterRole;
      const { data } = await labourService.getWorkers(params);
      setWorkers(data.data || []);
    } catch (e) { 
      console.error(e);
      // toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterRole]);

  const loadStats = async () => {
    try {
      const { data } = await labourService.getWorkerStats();
      setStats(data.data || { total: 0, active: 0, inactive: 0 });
    } catch (e) { console.error(e); }
  };

  const loadProjects = async () => {
    try {
      const { data } = await projectService.getAll();
      setProjects(data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([loadStats(), loadProjects()]);
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]); // filterProject and filterRole are already in loadWorkers dependencies

  // Attendance helpers
  const loadAttendance = async () => {
    try {
      const params = { date: attDate };
      if (attProject) params.projectId = attProject;
      const [recRes, sumRes] = await Promise.all([
        labourService.getAttendance(params),
        labourService.getAttendanceSummary(params)
      ]);
      const existing = recRes.data.data || [];

      // Merge with all workers for the selected project
      const wParams = attProject ? { projectId: attProject } : {};
      const { data: wData } = await labourService.getWorkers(wParams);
      const allWorkers = wData.data || [];
      const existingMap = {};
      existing.forEach(r => { existingMap[r.workerId] = r; });

      const merged = allWorkers.filter(w => w.status === 'ACTIVE').map(w => {
        const ex = existingMap[w.id];
        return {
          workerId: w.id,
          firstName: w.firstName,
          lastName: w.lastName,
          role: w.role,
          dailyWage: w.dailyWage,
          projectId: w.projectId,
          status: ex ? ex.status : 'PRESENT',
          wageAmount: ex ? ex.wageAmount : w.dailyWage
        };
      });
      setAttRecords(merged);
      setAttSummary(sumRes.data.data || { present: 0, absent: 0, halfDay: 0, totalWage: 0 });
      setAttDirty(false);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (activeTab === 'attendance') loadAttendance();
  }, [activeTab, attDate, attProject]);

  const toggleAttStatus = (idx, newStatus) => {
    setAttRecords(prev => {
      const next = [...prev];
      const w = next[idx];
      w.status = newStatus;
      if (newStatus === 'PRESENT') w.wageAmount = w.dailyWage;
      else if (newStatus === 'HALF_DAY') w.wageAmount = w.dailyWage / 2;
      else w.wageAmount = 0;
      return next;
    });
    setAttDirty(true);
  };

  const markAllPresent = () => {
    setAttRecords(prev => prev.map(w => ({ ...w, status: 'PRESENT', wageAmount: w.dailyWage })));
    setAttDirty(true);
  };

  const saveAttendance = async () => {
    try {
      const records = attRecords.map(r => ({
        workerId: r.workerId,
        projectId: r.projectId || undefined,
        date: attDate,
        status: r.status,
        wageAmount: r.wageAmount
      }));
      await labourService.saveAttendance(records);
      setAttDirty(false);
      loadAttendance();
    } catch (e) { console.error(e); }
  };

  // Payroll helpers
  const loadPayroll = async () => {
    try {
      const now = new Date();
      let startDate, endDate;
      if (payPeriod === 'week') {
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        startDate = start.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      }
      const { data } = await labourService.getPayroll({ startDate, endDate });
      setPayData(data.data || { totalPayroll: 0, totalWorkers: 0, breakdown: [] });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (activeTab === 'wages') loadPayroll();
  }, [activeTab, payPeriod]);

  // Add worker handler
  const handleAddWorker = async (e) => {
    e.preventDefault();
    try {
      await labourService.createWorker({
        ...newWorker,
        dailyWage: parseFloat(newWorker.dailyWage),
        projectId: newWorker.projectId || undefined
      });
      setShowAddModal(false);
      setNewWorker({ firstName: '', lastName: '', phone: '', role: 'Mason', dailyWage: '', projectId: '' });
      loadWorkers();
      loadStats();
    } catch (e) { console.error(e); }
  };

  const getInitials = (f, l) => `${(f || '')[0] || ''}${(l || '')[0] || ''}`.toUpperCase();
  const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const tabs = [
    { id: 'workers', label: 'Workers' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'upload', label: 'Excel Upload' },
    { id: 'wages', label: 'Wages & Payroll' }
  ];

  // Excel upload handlers
  const downloadTemplate = async () => {
    if (!uploadProject) return alert('Select a project first');
    try {
      const { data } = await labourService.getAttendanceTemplate(uploadProject);
      const rows = data.data || [];
      if (rows.length === 0) return alert('No active workers in this project');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `attendance_template_${uploadDate}.xlsx`);
    } catch (e) { alert('Failed to download template'); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        setUploadPreview({ fileName: file.name, rows, count: rows.length });
        setUploadResult(null);
      } catch { alert('Invalid Excel file'); }
    };
    reader.readAsBinaryString(file);
  };

  const confirmUpload = async () => {
    if (!uploadProject || !uploadDate || !uploadPreview) return;
    try {
      const { data } = await labourService.uploadAttendance({
        projectId: uploadProject, date: uploadDate,
        records: uploadPreview.rows, fileName: uploadPreview.fileName
      });
      setUploadResult(data.data);
      setUploadPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) { alert(e.response?.data?.message || 'Upload failed'); }
  };

  const loadUploadHistory = async () => {
    try { const { data } = await labourService.getUploadHistory(); setUploadHistory(data.data || []); } catch (e) { console.error(e); }
  };

  useEffect(() => { if (activeTab === 'upload') loadUploadHistory(); }, [activeTab]);

  return (
    <div className="labour-page">
      {/* Tab Bar */}
      <div className="labour-tab-bar">
        {tabs.map(t => (
          <button key={t.id} className={`labour-tab ${activeTab === t.id ? 'act' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        {activeTab === 'workers' && (
          <button className="btn-pp" onClick={() => setShowAddModal(true)}>+ Add worker</button>
        )}
        {activeTab === 'attendance' && (
          <>
            <button className="btn-bp" onClick={markAllPresent}>Mark all present</button>
            <button className="btn-pp" onClick={saveAttendance} disabled={!attDirty}>Save attendance</button>
          </>
        )}
        {activeTab === 'wages' && (
          <>
            <button 
              className="btn-gp" 
              onClick={() => generatePayrollPDF(payData, payPeriod === 'week' ? 'Weekly' : 'Monthly')}
              disabled={!payData.breakdown || payData.breakdown.length === 0}
            >
              Download PDF
            </button>
            <button className="btn-pp">Process payroll</button>
          </>
        )}
      </div>

      {/* WORKERS TAB */}
      {activeTab === 'workers' && (
        <div className="labour-content">
          <div className="labour-page-title">Workers</div>
          <div className="labour-page-sub">{stats.total} registered · {stats.active} active today</div>
          <div className="labour-filter-bar">
            <select className="labour-filter-sel" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="labour-filter-sel" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="">All roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="erp-card">
            <table className="erp-tbl">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Name</th>
                  <th style={{ width: '14%' }}>Role</th>
                  <th style={{ width: '22%' }}>Project</th>
                  <th style={{ width: '14%' }}>Daily wage</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '10%' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading...</td></tr>
                ) : workers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No workers found. Add your first worker.</td></tr>
                ) : workers.map(w => (
                  <tr key={w.id}>
                    <td className="prim-cell">
                      <div className="worker-avatar">{getInitials(w.firstName, w.lastName)}</div>
                      <span>{w.firstName} {w.lastName}</span>
                    </td>
                    <td>{w.role}</td>
                    <td>{w.project?.name || '—'}</td>
                    <td>{formatCurrency(w.dailyWage)}</td>
                    <td><span className={`status-pill ${w.status === 'ACTIVE' ? 'p-ok' : 'p-nt'}`}>{w.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span></td>
                    <td><div className="row-actions"><button className="ra-btn">View</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="card-footer">
              <span>Showing {workers.length} of {stats.total} workers</span>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="labour-content">
          <div className="att-controls">
            <div className="att-field">
              <span className="att-label">Date</span>
              <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="att-input" />
            </div>
            <div className="att-field">
              <span className="att-label">Site</span>
              <select value={attProject} onChange={e => setAttProject(e.target.value)} className="att-select">
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="att-summary-row">
            <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#059669' }}>{attRecords.filter(r => r.status === 'PRESENT').length}</div><div className="att-kpi-lbl">Present</div></div>
            <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#DC2626' }}>{attRecords.filter(r => r.status === 'ABSENT').length}</div><div className="att-kpi-lbl">Absent</div></div>
            <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#D97706' }}>{attRecords.filter(r => r.status === 'HALF_DAY').length}</div><div className="att-kpi-lbl">Half day</div></div>
          </div>
          <div className="erp-card">
            <div className="card-header">
              <span className="card-title">Workers ({attRecords.length} total)</span>
              <span className="card-action" onClick={markAllPresent}>Mark all present</span>
            </div>
            {attRecords.map((r, i) => (
              <div className="att-row" key={r.workerId}>
                <div className="att-name-col">
                  <div className="worker-avatar">{getInitials(r.firstName, r.lastName)}</div>
                  <div>
                    <div className="att-worker-name">{r.firstName} {r.lastName}</div>
                    <div className="att-worker-role">{r.role}</div>
                  </div>
                </div>
                <div className="toggle-group">
                  <button className={`tog ${r.status === 'PRESENT' ? 'P' : ''}`} onClick={() => toggleAttStatus(i, 'PRESENT')}>P</button>
                  <button className={`tog ${r.status === 'ABSENT' ? 'A' : ''}`} onClick={() => toggleAttStatus(i, 'ABSENT')}>A</button>
                  <button className={`tog ${r.status === 'HALF_DAY' ? 'H' : ''}`} onClick={() => toggleAttStatus(i, 'HALF_DAY')}>H</button>
                </div>
                <div className="att-wage">{formatCurrency(r.wageAmount)}</div>
              </div>
            ))}
            {attRecords.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No active workers found. Add workers first.</div>
            )}
          </div>
        </div>
      )}

      {/* WAGES TAB */}
      {activeTab === 'wages' && (
        <div className="labour-content">
          <div className="wage-period-tabs">
            <button className={`w-tab ${payPeriod === 'week' ? 'act' : ''}`} onClick={() => setPayPeriod('week')}>This week</button>
            <button className={`w-tab ${payPeriod === 'month' ? 'act' : ''}`} onClick={() => setPayPeriod('month')}>This month</button>
          </div>
          <div className="wage-summary-card">
            <div>
              <div className="ws-label">Total payroll</div>
              <div className="ws-value">{formatCurrency(payData.totalPayroll)}</div>
              <div className="ws-sub">{payData.totalWorkers} workers</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <div className="ws-status-pill">Unpaid</div>
              {payData.totalPayroll > 0 && (
                <button
                  className="btn-pp"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={async () => {
                    try {
                      const now = new Date();
                      let startDate, endDate;
                      if (payPeriod === 'week') {
                        const dayOfWeek = now.getDay();
                        const start = new Date(now);
                        start.setDate(now.getDate() - dayOfWeek);
                        startDate = start.toISOString().split('T')[0];
                        endDate = now.toISOString().split('T')[0];
                      } else {
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                        endDate = now.toISOString().split('T')[0];
                      }
                      await labourService.finalizePayroll({ startDate, endDate });
                      alert('Payroll finalized! Expense recorded in Finance.');
                    } catch (err) {
                      alert(err.response?.data?.message || 'Failed to finalize');
                    }
                  }}
                >
                  Finalize & Record Expense
                </button>
              )}
            </div>
          </div>
          <div className="erp-card">
            <div className="card-header">
              <span className="card-title">Worker breakdown</span>
            </div>
            <table className="erp-tbl">
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Worker</th>
                  <th style={{ width: '16%' }}>Role</th>
                  <th style={{ width: '14%' }}>Days worked</th>
                  <th style={{ width: '14%' }}>Rate/day</th>
                  <th style={{ width: '14%' }}>Net payable</th>
                </tr>
              </thead>
              <tbody>
                {payData.breakdown.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No payroll data for this period.</td></tr>
                ) : payData.breakdown.map(b => (
                  <tr key={b.worker.id}>
                    <td className="prim-cell">
                      <div className="worker-avatar">{getInitials(b.worker.firstName, b.worker.lastName)}</div>
                      <span>{b.worker.firstName} {b.worker.lastName}</span>
                    </td>
                    <td>{b.worker.role}</td>
                    <td style={{ textAlign: 'center' }}>{b.daysWorked}</td>
                    <td>{formatCurrency(b.worker.dailyWage)}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatCurrency(b.totalWage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="card-footer">
              <span>Showing {payData.breakdown.length} workers</span>
            </div>
          </div>
        </div>
      )}

      {/* ADD WORKER MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Add worker</span>
              <span className="modal-close" onClick={() => setShowAddModal(false)}>×</span>
            </div>
            <form onSubmit={handleAddWorker}>
              <div className="modal-body">
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">First name *</label><input className="fld-inp" required value={newWorker.firstName} onChange={e => setNewWorker(p => ({ ...p, firstName: e.target.value }))} /></div>
                  <div className="fld"><label className="fld-lbl">Last name *</label><input className="fld-inp" required value={newWorker.lastName} onChange={e => setNewWorker(p => ({ ...p, lastName: e.target.value }))} /></div>
                </div>
                <div className="fld"><label className="fld-lbl">Phone</label><input className="fld-inp" value={newWorker.phone} onChange={e => setNewWorker(p => ({ ...p, phone: e.target.value }))} /></div>
                <div className="form-2col">
                  <div className="fld"><label className="fld-lbl">Role *</label>
                    <select className="fld-sel" value={newWorker.role} onChange={e => setNewWorker(p => ({ ...p, role: e.target.value }))}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="fld"><label className="fld-lbl">Daily wage *</label><input className="fld-inp" type="number" required value={newWorker.dailyWage} onChange={e => setNewWorker(p => ({ ...p, dailyWage: e.target.value }))} /></div>
                </div>
                <div className="fld"><label className="fld-lbl">Assign to project</label>
                  <select className="fld-sel" value={newWorker.projectId} onChange={e => setNewWorker(p => ({ ...p, projectId: e.target.value }))}>
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-gp" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-pp">Add worker</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL UPLOAD TAB */}
      {activeTab === 'upload' && (
        <div className="labour-content">
          <div className="labour-page-title">Excel Attendance Upload</div>
          <div className="labour-page-sub">Upload attendance from supervisor's Excel sheet</div>

          <div className="erp-card" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 16 }}>
              <div className="fld">
                <label className="fld-lbl">Project *</label>
                <select className="fld-sel" value={uploadProject} onChange={e => setUploadProject(e.target.value)}>
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="fld">
                <label className="fld-lbl">Attendance Date *</label>
                <input className="fld-inp" type="date" value={uploadDate} onChange={e => setUploadDate(e.target.value)} />
              </div>
              <button className="btn-bp" onClick={downloadTemplate} disabled={!uploadProject}>⬇ Download Template</button>
            </div>

            <div style={{ border: '2px dashed var(--border-secondary)', borderRadius: 8, padding: 24, textAlign: 'center', marginBottom: 16 }}>
              <input type="file" accept=".xlsx,.xls,.csv" ref={fileRef} onChange={handleFileUpload} style={{ marginBottom: 8 }} />
              <div className="text-xs text-muted">Upload .xlsx / .xls / .csv file with columns: Worker Name, Worker ID, Status</div>
            </div>

            {/* Preview */}
            {uploadPreview && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>Preview: {uploadPreview.fileName} ({uploadPreview.count} rows)</h4>
                  <button className="btn-pp" onClick={confirmUpload}>✓ Confirm & Upload</button>
                </div>
                <table className="erp-tbl" style={{ fontSize: 12 }}>
                  <thead><tr>{Object.keys(uploadPreview.rows[0] || {}).map(k => <th key={k}>{k}</th>)}</tr></thead>
                  <tbody>
                    {uploadPreview.rows.slice(0, 10).map((row, i) => (
                      <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>
                    ))}
                    {uploadPreview.count > 10 && <tr><td colSpan={99} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>...and {uploadPreview.count - 10} more rows</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* Result */}
            {uploadResult && (
              <div style={{ padding: 16, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px', color: '#065f46' }}>✓ Upload Processed</h4>
                <div style={{ display: 'flex', gap: 24 }}>
                  <span><strong>{uploadResult.matched}</strong> workers matched</span>
                  <span><strong>{uploadResult.unmatched}</strong> unmatched</span>
                  <span>Total wage: <strong>{formatCurrency(uploadResult.totalWage)}</strong></span>
                </div>
                {uploadResult.unmatchedDetails?.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#b91c1c' }}>
                    Unmatched: {uploadResult.unmatchedDetails.map(u => u.name).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upload History */}
          <div className="erp-card" style={{ marginTop: 'var(--space-md)' }}>
            <div className="card-header"><span className="card-title">Upload History</span></div>
            <table className="erp-tbl">
              <thead><tr><th>Date</th><th>File</th><th>Project</th><th>Workers</th><th>Total Wage</th><th>Uploaded</th></tr></thead>
              <tbody>
                {uploadHistory.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No uploads yet</td></tr> :
                uploadHistory.map(u => (
                  <tr key={u.id}>
                    <td>{new Date(u.date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontSize: 12 }}>{u.fileName}</td>
                    <td>{u.project?.name || '—'}</td>
                    <td>{u.workersMatched}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(u.totalWage)}</td>
                    <td className="text-xs text-muted">{new Date(u.createdAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
