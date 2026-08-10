import React, { useState, useEffect, useCallback, useRef } from 'react';
import { labourService, projectService } from '../../services/api';
import './Labour.css';
import * as XLSX from 'xlsx';
import { generatePayrollPDF } from '../../utils/payrollPdf';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/ui/ConfirmModal';

const ROLES = ['Mason', 'Electrician', 'Helper', 'Carpenter', 'Plumber', 'Painter', 'Welder', 'Supervisor'];

// ─── Error Boundary to Catch Drawer Render Crashes ─────────────────────────
class DrawerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Drawer Render Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="drawer-overlay" onClick={this.props.onClose}>
          <div className="drawer-content" onClick={e => e.stopPropagation()} style={{ padding: '24px', justifyContent: 'center', alignItems: 'center' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '12px', fontSize: '16px' }}>Worker Profile Error</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', textAlign: 'center' }}>
              {this.state.error?.message || 'An error occurred while displaying worker details.'}
            </p>
            <button className="btn-gp" onClick={this.props.onClose}>
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LabourPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('workers');
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  // Add Worker Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [newWorker, setNewWorker] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    role: 'Mason',
    dailyWage: '',
    projectId: '',
    status: 'ACTIVE',
    gender: 'Male',
    dob: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: 'Spouse',
    skillGrade: 'SKILLED',
    overtimeRate: '',
    contractorName: '',
    aadhaarNumber: '',
    panNumber: '',
    idDocUrl: '',
    photoUrl: '',
    paymentMode: 'CASH',
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    upiId: ''
  });
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalStep, setEditModalStep] = useState(1);
  const [editWorker, setEditWorker] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Attendance
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attProject, setAttProject] = useState('');
  const [attRecords, setAttRecords] = useState([]);
  const [attSummary, setAttSummary] = useState({ present: 0, absent: 0, halfDay: 0, totalWage: 0 });
  const [savingAtt, setSavingAtt] = useState(false);
  const [attDirty, setAttDirty] = useState(false);

  // Payroll
  const [payPeriod, setPayPeriod] = useState('week');
  const [payData, setPayData] = useState({ totalPayroll: 0, totalWorkers: 0, breakdown: [] });
  const [finalizing, setFinalizing] = useState(false);

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
      const res = await labourService.getWorkers(params);
      const raw = res?.data?.data || res?.data || [];
      setWorkers(Array.isArray(raw) ? raw : []);
    } catch (e) { 
      console.error('Failed to load workers:', e);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterRole]);

  const loadStats = async () => {
    try {
      const res = await labourService.getWorkerStats();
      const raw = res?.data?.data || res?.data || { total: 0, active: 0, inactive: 0 };
      setStats(raw);
    } catch (e) { 
      console.error('Failed to load worker stats:', e);
      setStats({ total: 0, active: 0, inactive: 0 });
    }
  };

  const loadProjects = async () => {
    try {
      const res = await projectService.getAll();
      const raw = res?.data?.data || res?.data || [];
      setProjects(Array.isArray(raw) ? raw : []);
    } catch (e) { 
      console.error('Failed to load projects:', e);
      setProjects([]);
    }
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

  // Attendance Redesign States & Hooks
  const [attSubTab, setAttSubTab] = useState('entry'); // entry, register, approval, corrections
  const [isLocked, setIsLocked] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [registerMonth, setRegisterMonth] = useState(new Date().getMonth() + 1);
  const [registerYear, setRegisterYear] = useState(new Date().getFullYear());
  const [registerProject, setRegisterProject] = useState('');
  const [registerRecords, setRegisterRecords] = useState([]);
  
  // Correction Modal states
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionData, setCorrectionData] = useState({
    attendanceId: '',
    workerId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    wageAmount: '',
    overtimeHrs: '0',
    notes: '',
    reason: ''
  });
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const loadAttendance = async () => {
    try {
      const params = { date: attDate };
      if (attProject) params.projectId = attProject;
      const [recRes, sumRes] = await Promise.all([
        labourService.getAttendance(params),
        labourService.getAttendanceSummary(params)
      ]);
      const existing = recRes.data.data || [];

      // Check if locked: if ANY record is APPROVED
      const locked = existing.length > 0 && existing.some(r => r.approvalStatus === 'APPROVED');
      setIsLocked(locked);

      // Merge with all workers for the selected project
      const wParams = attProject ? { projectId: attProject } : {};
      const { data: wData } = await labourService.getWorkers(wParams);
      const allWorkers = wData.data || [];
      const existingMap = {};
      existing.forEach(r => { existingMap[r.workerId] = r; });

      const merged = allWorkers.filter(w => w.status === 'ACTIVE').map(w => {
        const ex = existingMap[w.id];
        return {
          id: ex ? ex.id : null,
          workerId: w.id,
          firstName: w.firstName,
          lastName: w.lastName,
          role: w.role,
          dailyWage: w.dailyWage,
          overtimeRate: w.overtimeRate || 0,
          projectId: w.projectId,
          status: ex ? ex.status : 'PRESENT',
          wageAmount: ex ? ex.wageAmount : w.dailyWage,
          overtimeHrs: ex ? ex.overtimeHrs : 0,
          notes: ex ? ex.notes : ''
        };
      });
      setAttRecords(merged);
      setAttSummary(sumRes.data.data || { present: 0, absent: 0, halfDay: 0, leave: 0, totalWage: 0 });
      setAttDirty(false);
    } catch (e) { console.error(e); }
  };

  const loadPendingApprovals = async () => {
    try {
      const { data } = await labourService.getPendingApprovals();
      setPendingApprovals(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data } = await labourService.getAuditLogs();
      setAuditLogs(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadRegisterMatrix = async () => {
    try {
      const params = { month: registerMonth, year: registerYear };
      if (registerProject) params.projectId = registerProject;
      const { data } = await labourService.getRegisterMatrix(params);
      setRegisterRecords(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCorrectionFetchRecord = async (workerId, date) => {
    if (!workerId || !date) return;
    try {
      const params = { date };
      const { data } = await labourService.getAttendance(params);
      const records = data.data || [];
      const match = records.find(r => r.workerId === workerId);
      if (match) {
        setCorrectionData(p => ({
          ...p,
          attendanceId: match.id,
          status: match.status,
          wageAmount: match.wageAmount,
          overtimeHrs: match.overtimeHrs || 0,
          notes: match.notes || ''
        }));
      } else {
        toast.info('No attendance logged for this worker on the selected date.');
        setCorrectionData(p => ({
          ...p,
          attendanceId: '',
          status: 'PRESENT',
          wageAmount: '',
          overtimeHrs: '0',
          notes: ''
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadPendingApprovals();
      if (attSubTab === 'entry') loadAttendance();
      else if (attSubTab === 'register') loadRegisterMatrix();
      else if (attSubTab === 'approval') loadPendingApprovals();
      else if (attSubTab === 'corrections') loadAuditLogs();
    }
  }, [activeTab, attSubTab, attDate, attProject, registerMonth, registerYear, registerProject]);

  const toggleAttStatus = (idx, newStatus) => {
    if (isLocked) return;
    setAttRecords(prev => {
      const next = [...prev];
      const w = next[idx];
      w.status = newStatus;
      const otHrs = parseFloat(w.overtimeHrs) || 0;
      const otRate = parseFloat(w.overtimeRate) || 0;
      
      let baseWage = 0;
      if (newStatus === 'PRESENT') baseWage = w.dailyWage;
      else if (newStatus === 'HALF_DAY') baseWage = w.dailyWage / 2;
      
      w.wageAmount = baseWage + (otHrs * otRate);
      return next;
    });
    setAttDirty(true);
  };

  const handleOvertimeChange = (idx, val) => {
    if (isLocked) return;
    setAttRecords(prev => {
      const next = [...prev];
      const w = next[idx];
      w.overtimeHrs = val;
      
      const otHrs = parseFloat(val) || 0;
      const otRate = parseFloat(w.overtimeRate) || 0;
      
      let baseWage = 0;
      if (w.status === 'PRESENT') baseWage = w.dailyWage;
      else if (w.status === 'HALF_DAY') baseWage = w.dailyWage / 2;
      
      w.wageAmount = baseWage + (otHrs * otRate);
      return next;
    });
    setAttDirty(true);
  };

  const handleNotesChange = (idx, val) => {
    if (isLocked) return;
    setAttRecords(prev => {
      const next = [...prev];
      const w = next[idx];
      w.notes = val;
      return next;
    });
    setAttDirty(true);
  };

  const markAllPresent = () => {
    if (isLocked) return;
    setAttRecords(prev => prev.map(w => {
      const otHrs = parseFloat(w.overtimeHrs) || 0;
      const otRate = parseFloat(w.overtimeRate) || 0;
      return {
        ...w,
        status: 'PRESENT',
        wageAmount: w.dailyWage + (otHrs * otRate)
      };
    }));
    setAttDirty(true);
  };

  const saveAttendance = async () => {
    if (savingAtt || isLocked) return;
    try {
      setSavingAtt(true);
      const records = attRecords.map(r => ({
        workerId: r.workerId,
        projectId: r.projectId || undefined,
        date: attDate,
        status: r.status,
        wageAmount: r.wageAmount,
        overtimeHrs: parseFloat(r.overtimeHrs) || 0,
        notes: r.notes || ''
      }));
      await labourService.saveAttendance(records);
      toast.success('Attendance saved successfully');
      setAttDirty(false);
      loadAttendance();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSavingAtt(false);
    }
  };

  const handleLockDailyAttendance = async () => {
    if (isLocked || savingAtt) return;
    if (!attRecords || attRecords.length === 0) {
      toast.warning('No attendance records found to lock for this date.');
      return;
    }
    try {
      setSavingAtt(true);
      
      // Always save current state before locking to ensure db records exist
      const records = attRecords.map(r => ({
        workerId: r.workerId,
        projectId: r.projectId || undefined,
        date: attDate,
        status: r.status,
        wageAmount: r.wageAmount,
        overtimeHrs: parseFloat(r.overtimeHrs) || 0,
        notes: r.notes || ''
      }));
      await labourService.saveAttendance(records);
      
      await labourService.approveAttendance({ date: attDate, projectId: attProject || null });
      toast.success(`Attendance for ${attDate} has been LOCKED successfully!`);
      setIsLocked(true);
      setAttDirty(false);
      loadAttendance();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to lock attendance');
    } finally {
      setSavingAtt(false);
    }
  };

  const handleApproveDaily = async (date, projectId) => {
    try {
      await labourService.approveAttendance({ date, projectId });
      toast.success(`Ledger approved successfully`);
      loadPendingApprovals();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to approve ledger');
    }
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (submittingCorrection) return;
    if (!correctionData.attendanceId || !correctionData.reason) {
      toast.warning('A valid attendance record and correction reason are required');
      return;
    }
    try {
      setSubmittingCorrection(true);
      await labourService.submitCorrection({
        attendanceId: correctionData.attendanceId,
        newStatus: correctionData.status,
        newWage: parseFloat(correctionData.wageAmount) || 0,
        newOvertimeHrs: parseFloat(correctionData.overtimeHrs) || 0,
        newNotes: correctionData.notes || '',
        reason: correctionData.reason
      });
      toast.success('Correction applied and logged successfully');
      setShowCorrectionModal(false);
      setCorrectionData({
        attendanceId: '', workerId: '', date: new Date().toISOString().split('T')[0],
        status: 'PRESENT', wageAmount: '', overtimeHrs: '0', notes: '', reason: ''
      });
      loadAuditLogs();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to submit correction');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // Monthly Register calculations (Vertical timesheet format: Dates down, Workers across)
  const getDaysInMonth = (m, y) => new Date(y, m, 0).getDate();
  const numDaysInRegisterMonth = getDaysInMonth(registerMonth, registerYear);
  const registerDaysArray = Array.from({ length: numDaysInRegisterMonth }, (_, idx) => idx + 1);

  const getMatrixData = () => {
    const activeWorkers = workers.filter(w => w.status === 'ACTIVE');
    
    // Build vertical date rows
    const daysRows = registerDaysArray.map(day => {
      const dateObj = new Date(registerYear, registerMonth - 1, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dateString = `${String(day).padStart(2, '0')} ${dateObj.toLocaleDateString('en-US', { month: 'short' })} (${dayName})`;
      
      const workerStatuses = {};
      activeWorkers.forEach(w => {
        workerStatuses[w.id] = '-';
      });

      return {
        day,
        dateString,
        isWeekend,
        workerStatuses
      };
    });

    // Compute workers summary
    const workerSummaries = {};
    activeWorkers.forEach(w => {
      workerSummaries[w.id] = {
        totalPresent: 0,
        totalWage: 0
      };
    });

    // Populate actual records
    registerRecords.forEach(rec => {
      const recDate = new Date(rec.date);
      const day = recDate.getUTCDate();
      const wId = rec.workerId;
      
      const row = daysRows.find(r => r.day === day);
      if (row && row.workerStatuses[wId] !== undefined) {
        row.workerStatuses[wId] = rec.status;
      }

      if (workerSummaries[wId]) {
        if (rec.status === 'PRESENT') workerSummaries[wId].totalPresent += 1;
        else if (rec.status === 'HALF_DAY') workerSummaries[wId].totalPresent += 0.5;
        workerSummaries[wId].totalWage += rec.wageAmount;
      }
    });

    return { activeWorkers, daysRows, workerSummaries };
  };

  const { activeWorkers: matrixWorkers, daysRows: matrixDaysRows, workerSummaries } = getMatrixData();

  const handleExportRegisterExcel = () => {
    if (matrixDaysRows.length === 0) {
      toast.warning('No register data to export');
      return;
    }
    
    const headers = ['Date / Day', ...matrixWorkers.map(w => `${w.firstName} ${w.lastName} (${w.role})`)];
    const rows = matrixDaysRows.map(row => {
      const workerStatusData = {};
      matrixWorkers.forEach(w => {
        const s = row.workerStatuses[w.id];
        workerStatusData[`${w.firstName} ${w.lastName} (${w.role})`] = s === 'PRESENT' ? 'P' : s === 'HALF_DAY' ? 'H' : s === 'ABSENT' ? 'A' : s === 'LEAVE' ? 'L' : '-';
      });
      return {
        'Date / Day': row.dateString,
        ...workerStatusData
      };
    });

    // Add summary rows at the end of excel sheets
    const totalsRow = { 'Date / Day': 'Total Present Days' };
    matrixWorkers.forEach(w => {
      totalsRow[`${w.firstName} ${w.lastName} (${w.role})`] = workerSummaries[w.id].totalPresent;
    });
    rows.push(totalsRow);

    const payRow = { 'Date / Day': 'Total Monthly Pay' };
    matrixWorkers.forEach(w => {
      payRow[`${w.firstName} ${w.lastName} (${w.role})`] = formatCurrency(workerSummaries[w.id].totalWage);
    });
    rows.push(payRow);

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Register');
    XLSX.writeFile(wb, `attendance_register_vertical_${registerYear}_${registerMonth}.xlsx`);
  };

  const [dailyDate, setDailyDate] = useState(attDate || new Date().toISOString().split('T')[0]);

  // Payroll helpers
  const loadPayroll = async () => {
    try {
      const now = new Date();
      let startDate, endDate;
      if (payPeriod === 'day') {
        startDate = dailyDate;
        endDate = dailyDate;
      } else if (payPeriod === 'week') {
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
  }, [activeTab, payPeriod, dailyDate]);

  const handleEditWorker = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!editWorker.firstName || !editWorker.lastName || !editWorker.dailyWage) {
      toast.warning('First name, Last name, and Daily wage are required');
      return;
    }
    try {
      setSaving(true);
      await labourService.updateWorker(editWorker.id, {
        firstName: editWorker.firstName,
        lastName: editWorker.lastName,
        phone: editWorker.phone || undefined,
        role: editWorker.role,
        dailyWage: parseFloat(editWorker.dailyWage) || 0,
        projectId: editWorker.projectId || null,
        status: editWorker.status,
        gender: editWorker.gender,
        dob: editWorker.dob ? new Date(editWorker.dob).toISOString() : null,
        emergencyName: editWorker.emergencyName,
        emergencyPhone: editWorker.emergencyPhone,
        emergencyRelation: editWorker.emergencyRelation,
        skillGrade: editWorker.skillGrade,
        overtimeRate: parseFloat(editWorker.overtimeRate) || 0,
        contractorName: editWorker.contractorName,
        aadhaarNumber: editWorker.aadhaarNumber,
        panNumber: editWorker.panNumber,
        idDocUrl: editWorker.idDocUrl,
        photoUrl: editWorker.photoUrl,
        paymentMode: editWorker.paymentMode,
        bankName: editWorker.bankName,
        bankAccountNo: editWorker.bankAccountNo,
        bankIfsc: editWorker.bankIfsc,
        upiId: editWorker.upiId
      });
      setShowEditModal(false);
      toast.success('Worker details updated successfully');
      loadWorkers();
      loadStats();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to update worker');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorker = async () => {
    if (!workerToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await labourService.deleteWorker(workerToDelete.id);
      setWorkerToDelete(null);
      setShowEditModal(false);
      toast.success('Worker deleted successfully');
      loadWorkers();
      loadStats();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to delete worker');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add worker handler
  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!newWorker.firstName || !newWorker.lastName || !newWorker.dailyWage) {
      toast.warning('First name, Last name, and Daily wage are required');
      return;
    }
    try {
      setSaving(true);
      await labourService.createWorker({
        ...newWorker,
        dailyWage: parseFloat(newWorker.dailyWage) || 0,
        overtimeRate: parseFloat(newWorker.overtimeRate) || 0,
        projectId: newWorker.projectId || undefined,
        dob: newWorker.dob ? new Date(newWorker.dob).toISOString() : undefined
      });
      setShowAddModal(false);
      setNewWorker({
        firstName: '', lastName: '', phone: '', role: 'Mason', dailyWage: '', projectId: '',
        status: 'ACTIVE', gender: 'Male', dob: '', emergencyName: '', emergencyPhone: '', emergencyRelation: 'Spouse',
        skillGrade: 'SKILLED', overtimeRate: '', contractorName: '', aadhaarNumber: '', panNumber: '',
        idDocUrl: '', photoUrl: '', paymentMode: 'CASH', bankName: '', bankAccountNo: '', bankIfsc: '', upiId: ''
      });
      setModalStep(1);
      loadWorkers();
      loadStats();
      toast.success('Worker registered successfully');
    } catch (e) { 
      console.error(e); 
      toast.error(e.response?.data?.message || 'Failed to add worker');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (f, l) => `${(f || '')[0] || ''}${(l || '')[0] || ''}`.toUpperCase();
  const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const tabs = [
    { id: 'workers', label: 'Labour Master' },
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

  const filteredWorkers = Array.isArray(workers)
    ? workers.filter(w => w && (!filterGrade || w.skillGrade === filterGrade))
    : [];

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
        {activeTab === 'attendance' && attSubTab === 'entry' && !isLocked && (
          <button className="btn-bp" onClick={markAllPresent} disabled={savingAtt}>Mark all present</button>
        )}
        {activeTab === 'wages' && (
          <button 
            className="btn-gp" 
            onClick={() => generatePayrollPDF(payData, payPeriod === 'week' ? 'Weekly' : 'Monthly')}
            disabled={!payData.breakdown || payData.breakdown.length === 0}
          >
            Download PDF
          </button>
        )}
      </div>

      {/* WORKERS TAB */}
      {activeTab === 'workers' && (
        <div className="labour-content">
          <div className="labour-page-title">Labour Master</div>
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
            <select className="labour-filter-sel" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
              <option value="">All grades</option>
              <option value="SKILLED">Skilled</option>
              <option value="SEMI_SKILLED">Semi-Skilled</option>
              <option value="UNSKILLED">Unskilled</option>
            </select>
          </div>
          <div className="erp-card">
            <table className="erp-tbl">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Name</th>
                  <th style={{ width: '13%' }}>Role</th>
                  <th style={{ width: '12%' }}>Grade</th>
                  <th style={{ width: '22%' }}>Project</th>
                  <th style={{ width: '13%' }}>Daily wage</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading...</td></tr>
                ) : filteredWorkers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No workers found. Add your first worker.</td></tr>
                ) : filteredWorkers.map(w => (
                  <tr key={w.id} className="clickable-row" onClick={() => setSelectedWorker(w)}>
                    <td className="prim-cell">
                      <div className="worker-avatar">
                        {w.photoUrl ? (
                          <img src={w.photoUrl} alt="avatar" className="avatar-img-small" />
                        ) : (
                          getInitials(w.firstName, w.lastName)
                        )}
                      </div>
                      <span>{w.firstName} {w.lastName}</span>
                    </td>
                    <td>{typeof w.role === 'object' ? (w.role?.name || 'Worker') : (w.role || 'Worker')}</td>
                    <td>
                      <span className={`grade-pill ${typeof w.skillGrade === 'string' ? w.skillGrade.toLowerCase() : 'skilled'}`}>
                        {typeof w.skillGrade === 'string' ? (w.skillGrade === 'SEMI_SKILLED' ? 'Semi-Skilled' : w.skillGrade === 'UNSKILLED' ? 'Unskilled' : 'Skilled') : 'Skilled'}
                      </span>
                    </td>
                    <td>{typeof w.project === 'object' ? (w.project?.name || '—') : (w.project || '—')}</td>
                    <td>{formatCurrency(w.dailyWage)}</td>
                    <td><span className={`status-pill ${w.status === 'ACTIVE' ? 'p-ok' : 'p-nt'}`}>{w.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="row-actions" onClick={e => e.stopPropagation()}>
                        <button 
                          type="button"
                          className="ra-btn"
                          style={{ marginRight: 6, cursor: 'pointer' }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedWorker(w);
                          }}
                        >
                          View
                        </button>
                        <button 
                          type="button"
                          className="ra-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditWorker({
                              id: w.id,
                              firstName: w.firstName || '',
                              lastName: w.lastName || '',
                              phone: w.phone || '',
                              role: w.role || 'Mason',
                              dailyWage: w.dailyWage || '',
                              projectId: w.projectId || '',
                              status: w.status || 'ACTIVE',
                              gender: w.gender || 'Male',
                              dob: w.dob ? new Date(w.dob).toISOString().split('T')[0] : '',
                              emergencyName: w.emergencyName || '',
                              emergencyPhone: w.emergencyPhone || '',
                              emergencyRelation: w.emergencyRelation || 'Spouse',
                              skillGrade: w.skillGrade || 'SKILLED',
                              overtimeRate: w.overtimeRate || '',
                              contractorName: w.contractorName || '',
                              aadhaarNumber: w.aadhaarNumber || '',
                              panNumber: w.panNumber || '',
                              idDocUrl: w.idDocUrl || '',
                              photoUrl: w.photoUrl || '',
                              paymentMode: w.paymentMode || 'CASH',
                              bankName: w.bankName || '',
                              bankAccountNo: w.bankAccountNo || '',
                              bankIfsc: w.bankIfsc || '',
                              upiId: w.upiId || ''
                            });
                            setEditModalStep(1);
                            setShowEditModal(true);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="card-footer">
              <span>Showing {filteredWorkers.length} of {stats.total} workers</span>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="labour-content">
          {/* Sub Tab Navigation */}
          <div className="attendance-sub-tabs">
            <button type="button" className={`att-sub-tab ${attSubTab === 'entry' ? 'act' : ''}`} onClick={() => setAttSubTab('entry')}>Daily Entry</button>
            <button type="button" className={`att-sub-tab ${attSubTab === 'register' ? 'act' : ''}`} onClick={() => setAttSubTab('register')}>Monthly Register</button>
            <button type="button" className={`att-sub-tab ${attSubTab === 'corrections' ? 'act' : ''}`} onClick={() => setAttSubTab('corrections')}>Audit Corrections</button>
          </div>

          {/* 1. DAILY ENTRY */}
          {attSubTab === 'entry' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="att-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="att-field">
                    <span className="att-label">Date</span>
                    <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="att-input" />
                  </div>
                  <div className="att-field">
                    <span className="att-label">Site / Project</span>
                    <select value={attProject} onChange={e => setAttProject(e.target.value)} className="att-select">
                      <option value="">All projects</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn-pp" 
                    style={{ height: 32, padding: '0 14px', fontSize: 12 }} 
                    onClick={saveAttendance} 
                    disabled={isLocked || savingAtt}
                  >
                    {savingAtt ? 'Saving...' : '💾 Save Attendance'}
                  </button>
                  <button 
                    type="button" 
                    className="btn" 
                    style={{ 
                      height: 32, 
                      padding: '0 14px', 
                      fontSize: 12, 
                      fontWeight: 600,
                      background: isLocked ? '#059669' : '#dc2626', 
                      color: '#fff', 
                      border: 'none',
                      cursor: isLocked ? 'not-allowed' : 'pointer'
                    }} 
                    onClick={handleLockDailyAttendance} 
                    disabled={isLocked || savingAtt}
                  >
                    {isLocked ? '🔒 Ledger Locked' : '🔒 Lock Attendance'}
                  </button>
                </div>
              </div>

              {isLocked && (
                <div className="attendance-locked-banner">
                  <span>🔒 Approved & Locked. Changes can only be requested in the <strong>Audit Corrections</strong> tab.</span>
                </div>
              )}

              <div className="att-summary-row">
                <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#059669' }}>{attRecords.filter(r => r.status === 'PRESENT').length}</div><div className="att-kpi-lbl">Present</div></div>
                <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#DC2626' }}>{attRecords.filter(r => r.status === 'ABSENT').length}</div><div className="att-kpi-lbl">Absent</div></div>
                <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#D97706' }}>{attRecords.filter(r => r.status === 'HALF_DAY').length}</div><div className="att-kpi-lbl">Half day</div></div>
                <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#2563EB' }}>{attRecords.filter(r => r.status === 'LEAVE').length}</div><div className="att-kpi-lbl">Leave</div></div>
              </div>

              <div className="erp-card">
                <div className="card-header" style={{ borderBottom: 'none' }}>
                  <span className="card-title">Workers ({attRecords.length} total)</span>
                  {!isLocked && (
                    <span className="card-action" onClick={markAllPresent}>Mark all present</span>
                  )}
                </div>
                
                <table className="erp-tbl attendance-entry-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Worker</th>
                      <th style={{ width: '12%' }}>Role</th>
                      <th style={{ width: '20%' }}>Attendance Status</th>
                      <th style={{ width: '12%' }}>OT Hours</th>
                      <th style={{ width: '12%' }}>Daily Pay</th>
                      <th style={{ width: '22%' }}>Remarks / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attRecords.map((r, i) => (
                      <tr key={r.workerId}>
                        <td className="prim-cell">
                          <div className="worker-avatar">{getInitials(r.firstName, r.lastName)}</div>
                          <span>{r.firstName} {r.lastName}</span>
                        </td>
                        <td>{r.role}</td>
                        <td>
                          <div className="toggle-group select-status-group">
                            <button type="button" disabled={isLocked} className={`tog status-p ${r.status === 'PRESENT' ? 'act' : ''}`} onClick={() => toggleAttStatus(i, 'PRESENT')}>P</button>
                            <button type="button" disabled={isLocked} className={`tog status-a ${r.status === 'ABSENT' ? 'act' : ''}`} onClick={() => toggleAttStatus(i, 'ABSENT')}>A</button>
                            <button type="button" disabled={isLocked} className={`tog status-h ${r.status === 'HALF_DAY' ? 'act' : ''}`} onClick={() => toggleAttStatus(i, 'HALF_DAY')}>H</button>
                            <button type="button" disabled={isLocked} className={`tog status-l ${r.status === 'LEAVE' ? 'act' : ''}`} onClick={() => toggleAttStatus(i, 'LEAVE')}>L</button>
                          </div>
                        </td>
                        <td>
                          <input 
                            type="number" 
                            disabled={isLocked} 
                            className="fld-inp ot-hrs-input" 
                            style={{ height: 26, width: 60, padding: '0 4px', fontSize: 11, textAlign: 'center' }} 
                            min="0" 
                            max="24"
                            value={r.overtimeHrs} 
                            onChange={e => handleOvertimeChange(i, e.target.value)} 
                          />
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatCurrency(r.wageAmount)}</td>
                        <td>
                          <input 
                            type="text" 
                            disabled={isLocked} 
                            className="fld-inp notes-text-input" 
                            style={{ height: 26, fontSize: 11, padding: '0 8px' }} 
                            placeholder="Add remark..." 
                            value={r.notes || ''} 
                            onChange={e => handleNotesChange(i, e.target.value)} 
                          />
                        </td>
                      </tr>
                    ))}
                    {attRecords.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No active workers found. Add workers first.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. MONTHLY REGISTER GRID */}
          {attSubTab === 'register' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="att-controls att-controls-grid">
                <div className="att-field">
                  <span className="att-label">Month</span>
                  <select value={registerMonth} onChange={e => setRegisterMonth(parseInt(e.target.value))} className="att-select">
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                      <option key={idx} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="att-field">
                  <span className="att-label">Year</span>
                  <select value={registerYear} onChange={e => setRegisterYear(parseInt(e.target.value))} className="att-select">
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
                <div className="att-field">
                  <span className="att-label">Site / Project</span>
                  <select value={registerProject} onChange={e => setRegisterProject(e.target.value)} className="att-select">
                    <option value="">All projects</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <button type="button" className="btn-bp" style={{ height: 30 }} onClick={handleExportRegisterExcel} disabled={registerRecords.length === 0}>
                  ⬇ Export Excel
                </button>
              </div>

              {/* Register KPI Summary Banner */}
              <div className="att-summary-row" style={{ marginTop: 4 }}>
                <div className="att-kpi"><div className="att-kpi-val" style={{ color: 'var(--text-primary)' }}>{matrixWorkers.length}</div><div className="att-kpi-lbl">Active Crew</div></div>
                <div className="att-kpi"><div className="att-kpi-val" style={{ color: 'var(--accent-primary)' }}>{matrixWorkers.reduce((sum, w) => sum + (workerSummaries[w.id]?.totalPresent || 0), 0)}</div><div className="att-kpi-lbl">Total Man-Days</div></div>
                <div className="att-kpi"><div className="att-kpi-val" style={{ color: '#059669' }}>{formatCurrency(matrixWorkers.reduce((sum, w) => sum + (workerSummaries[w.id]?.totalWage || 0), 0))}</div><div className="att-kpi-lbl">Estimated Month Pay</div></div>
              </div>

              <div className="erp-card register-matrix-card">
                <div className="register-matrix-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid var(--border-primary)', flexWrap: 'wrap', gap: 10 }}>
                  <span className="card-title" style={{ fontSize: 13, fontWeight: 600 }}>Monthly Timecard (Vertical Calendar)</span>
                  <div className="matrix-legend" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-secondary)' }}><span className="matrix-status-dot p" style={{ width: 14, height: 14, fontSize: 7 }}>P</span> Present</div>
                    <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-secondary)' }}><span className="matrix-status-dot h" style={{ width: 14, height: 14, fontSize: 7 }}>H</span> Half-day</div>
                    <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-secondary)' }}><span className="matrix-status-dot a" style={{ width: 14, height: 14, fontSize: 7 }}>A</span> Absent</div>
                    <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-secondary)' }}><span className="matrix-status-dot l" style={{ width: 14, height: 14, fontSize: 7 }}>L</span> Leave</div>
                    <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-secondary)' }}><span className="matrix-status-dot empty" style={{ width: 14, height: 14, fontSize: 7, border: '0.5px solid var(--border-primary)' }}>-</span> Not Logged</div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table className="erp-tbl register-matrix-tbl">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 160, position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 3 }}>Date / Day</th>
                        {matrixWorkers.map(w => (
                          <th key={w.id} style={{ minWidth: 120, textAlign: 'center', padding: '10px 4px' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{w.firstName} {w.lastName}</div>
                            <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 500, marginTop: 2 }}>{w.role}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixDaysRows.length === 0 ? (
                        <tr><td colSpan={matrixWorkers.length + 1} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No data available.</td></tr>
                      ) : matrixDaysRows.map(row => (
                        <tr key={row.day}>
                          <td style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2, fontWeight: 600 }} className={`prim-cell ${row.isWeekend ? 'weekend' : ''}`}>
                            {row.dateString}
                          </td>
                          {matrixWorkers.map(w => {
                            const status = row.workerStatuses[w.id];
                            let letter = '-';
                            let klass = 'empty';
                            if (status === 'PRESENT') { letter = 'P'; klass = 'p'; }
                            else if (status === 'ABSENT') { letter = 'A'; klass = 'a'; }
                            else if (status === 'HALF_DAY') { letter = 'H'; klass = 'h'; }
                            else if (status === 'LEAVE') { letter = 'L'; klass = 'l'; }

                            return (
                              <td key={w.id} className={`day-cell ${row.isWeekend ? 'weekend' : ''}`} style={{ textAlign: 'center', padding: '4px 0' }}>
                                <span className={`matrix-status-dot ${klass}`}>{letter}</span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2, borderTop: '1.5px solid var(--border-primary)' }}>Total Present Days</td>
                        {matrixWorkers.map(w => (
                          <td key={w.id} style={{ textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 700, borderTop: '1.5px solid var(--border-primary)' }}>
                            {workerSummaries[w.id]?.totalPresent || 0}
                          </td>
                        ))}
                      </tr>
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2 }}>Total Monthly Pay</td>
                        {matrixWorkers.map(w => (
                          <td key={w.id} style={{ textAlign: 'center', color: '#059669', fontWeight: 700 }}>
                            {formatCurrency(workerSummaries[w.id]?.totalWage || 0)}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}



          {/* 4. AUDIT CORRECTIONS */}
          {attSubTab === 'corrections' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="labour-page-title" style={{ fontSize: 13, margin: 0 }}>Attendance Correction Logs</span>
                <button type="button" className="btn-pp" onClick={() => {
                  setCorrectionData({
                    attendanceId: '', workerId: '', date: new Date().toISOString().split('T')[0],
                    status: 'PRESENT', wageAmount: '', overtimeHrs: '0', notes: '', reason: ''
                  });
                  setShowCorrectionModal(true);
                }}>
                  + Log Correction
                </button>
              </div>

              <div className="erp-card">
                <table className="erp-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>Date of Work</th>
                      <th style={{ width: '20%' }}>Worker</th>
                      <th style={{ width: '15%' }}>Correction</th>
                      <th style={{ width: '15%' }}>Wage Change</th>
                      <th style={{ width: '25%' }}>Reason</th>
                      <th style={{ width: '10%' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No corrections recorded yet.</td></tr>
                    ) : auditLogs.map(log => (
                      <tr key={log.id}>
                        <td>{new Date(log.date).toLocaleDateString('en-IN')}</td>
                        <td style={{ fontWeight: 500 }}>{log.workerName}</td>
                        <td>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: 6 }}>{log.previousStatus}</span>
                          <span style={{ color: '#059669', fontWeight: 600 }}>→ {log.newStatus}</span>
                        </td>
                        <td>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: 6 }}>{formatCurrency(log.previousWage)}</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>→ {formatCurrency(log.newWage)}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{log.reason}"</div>
                        </td>
                        <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WAGES TAB */}
      {activeTab === 'wages' && (
        <div className="labour-content">
          <div className="wage-period-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className={`w-tab ${payPeriod === 'day' ? 'act' : ''}`} onClick={() => setPayPeriod('day')}>Daily / Custom Date</button>
              <button className={`w-tab ${payPeriod === 'week' ? 'act' : ''}`} onClick={() => setPayPeriod('week')}>This week</button>
              <button className={`w-tab ${payPeriod === 'month' ? 'act' : ''}`} onClick={() => setPayPeriod('month')}>This month</button>
            </div>

            {payPeriod === 'day' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Date:</span>
                <input 
                  type="date" 
                  value={dailyDate} 
                  onChange={e => setDailyDate(e.target.value)} 
                  className="att-input" 
                  style={{ height: 32 }}
                />
              </div>
            )}
          </div>
          <div className="wage-summary-card">
            <div>
              <div className="ws-label">Total Payroll ({payPeriod.toUpperCase()})</div>
              <div className="ws-value">{formatCurrency(payData.totalPayroll)}</div>
              <div className="ws-sub">{payData.totalWorkers} workers logged</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <div className="ws-status-pill">Calculated</div>
              {payData.totalPayroll > 0 && (
                <button
                  className="btn-pp"
                  style={{ fontSize: 12, padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
                  disabled={finalizing}
                  onClick={async () => {
                    try {
                      setFinalizing(true);
                      const now = new Date();
                      let startDate, endDate;
                      if (payPeriod === 'day') {
                        startDate = dailyDate;
                        endDate = dailyDate;
                      } else if (payPeriod === 'week') {
                        const dayOfWeek = now.getDay();
                        const start = new Date(now);
                        start.setDate(now.getDate() - dayOfWeek);
                        startDate = start.toISOString().split('T')[0];
                        endDate = now.toISOString().split('T')[0];
                      } else {
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                        endDate = now.toISOString().split('T')[0];
                      }

                      await labourService.runPayrollBatch({ 
                        startDate, 
                        endDate, 
                        remarks: `Labour Payroll (${payPeriod.toUpperCase()}: ${startDate}${startDate !== endDate ? ' to ' + endDate : ''})`
                      });
                      toast.success('Payroll batch submitted to Finance for approval!');
                      loadPayroll();
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to submit payroll batch');
                    } finally {
                      setFinalizing(false);
                    }
                  }}
                >
                  {finalizing ? 'Submitting...' : '🚀 Run Payroll & Submit to Finance'}
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

      {/* WORKER DETAIL PROFILE MODAL */}
      {selectedWorker && (
        <div className="modal-overlay" onClick={() => setSelectedWorker(null)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650, width: '90%' }}>
            <div className="modal-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="modal-title" style={{ fontSize: 16, fontWeight: 700 }}>Worker Profile</span>
                <span className="badge badge-purple" style={{ fontSize: 10 }}>ID: {String(selectedWorker.id || '').substring(0, 8)}...</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" className="btn-pp" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => {
                  setEditWorker({
                    id: selectedWorker.id,
                    firstName: selectedWorker.firstName || '',
                    lastName: selectedWorker.lastName || '',
                    phone: selectedWorker.phone || '',
                    role: typeof selectedWorker.role === 'object' ? (selectedWorker.role?.name || 'Mason') : (selectedWorker.role || 'Mason'),
                    dailyWage: selectedWorker.dailyWage || '',
                    projectId: selectedWorker.projectId || '',
                    status: selectedWorker.status || 'ACTIVE',
                    gender: selectedWorker.gender || 'Male',
                    dob: selectedWorker.dob ? new Date(selectedWorker.dob).toISOString().split('T')[0] : '',
                    emergencyName: selectedWorker.emergencyName || '',
                    emergencyPhone: selectedWorker.emergencyPhone || '',
                    emergencyRelation: selectedWorker.emergencyRelation || 'Spouse',
                    skillGrade: typeof selectedWorker.skillGrade === 'string' ? selectedWorker.skillGrade : 'SKILLED',
                    overtimeRate: selectedWorker.overtimeRate || '',
                    contractorName: selectedWorker.contractorName || '',
                    aadhaarNumber: selectedWorker.aadhaarNumber || '',
                    panNumber: selectedWorker.panNumber || '',
                    idDocUrl: selectedWorker.idDocUrl || '',
                    photoUrl: selectedWorker.photoUrl || '',
                    paymentMode: selectedWorker.paymentMode || 'CASH',
                    bankName: selectedWorker.bankName || '',
                    bankAccountNo: selectedWorker.bankAccountNo || '',
                    bankIfsc: selectedWorker.bankIfsc || '',
                    upiId: selectedWorker.upiId || ''
                  });
                  setEditModalStep(1);
                  setShowEditModal(true);
                  setSelectedWorker(null);
                }}>Edit Profile</button>
                <span className="modal-close" style={{ cursor: 'pointer', fontSize: 20 }} onClick={() => setSelectedWorker(null)}>×</span>
              </div>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '20px' }}>
              {/* Profile Card Header */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16, background: 'var(--bg-tertiary)', borderRadius: 10, marginBottom: 20 }}>
                <div className="worker-avatar" style={{ width: 54, height: 54, fontSize: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700 }}>
                  {selectedWorker.photoUrl ? (
                    <img src={selectedWorker.photoUrl} alt="avatar" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(selectedWorker.firstName, selectedWorker.lastName)
                  )}
                </div>
                <div>
                  <h2 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700 }}>{selectedWorker.firstName || ''} {selectedWorker.lastName || ''}</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="role-badge" style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                      {typeof selectedWorker.role === 'object' ? (selectedWorker.role?.name || 'Worker') : (selectedWorker.role || 'Worker')}
                    </span>
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>
                      {typeof selectedWorker.skillGrade === 'string' ? selectedWorker.skillGrade.replace('_', ' ') : 'SKILLED'}
                    </span>
                    <span className={`status-pill ${selectedWorker.status === 'ACTIVE' ? 'p-ok' : 'p-nt'}`}>
                      {selectedWorker.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal & Contact Details */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.5px' }}>Personal & Contact Details</h4>
                <div className="form-2col" style={{ gap: 12 }}>
                  <div className="fld"><span className="fld-lbl">Phone Number</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{selectedWorker.phone || '—'}</div></div>
                  <div className="fld"><span className="fld-lbl">Gender</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{selectedWorker.gender || '—'}</div></div>
                  <div className="fld"><span className="fld-lbl">Date of Birth</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{selectedWorker.dob ? new Date(selectedWorker.dob).toLocaleDateString('en-IN') : '—'}</div></div>
                  <div className="fld"><span className="fld-lbl">Join Date</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{selectedWorker.joinDate ? new Date(selectedWorker.joinDate).toLocaleDateString('en-IN') : '—'}</div></div>
                </div>
              </div>

              {/* Employment & Wages */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.5px' }}>Employment & Wages</h4>
                <div className="form-2col" style={{ gap: 12 }}>
                  <div className="fld"><span className="fld-lbl">Daily Wage</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8, fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(selectedWorker.dailyWage)} / day</div></div>
                  <div className="fld"><span className="fld-lbl">Overtime Rate</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{formatCurrency(selectedWorker.overtimeRate)} / hour</div></div>
                  <div className="fld"><span className="fld-lbl">Current Project</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{typeof selectedWorker.project === 'object' ? (selectedWorker.project?.name || 'No Project Assigned') : (selectedWorker.project || 'No Project Assigned')}</div></div>
                  <div className="fld"><span className="fld-lbl">Contractor / Agency</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{selectedWorker.contractorName || 'Direct / In-house'}</div></div>
                </div>
              </div>

              {/* KYC & Payment */}
              <div>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.5px' }}>KYC & Payment Info</h4>
                <div className="form-2col" style={{ gap: 12 }}>
                  <div className="fld"><span className="fld-lbl">Aadhaar Card</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{selectedWorker.aadhaarNumber || '—'}</div></div>
                  <div className="fld"><span className="fld-lbl">PAN Card</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{selectedWorker.panNumber || '—'}</div></div>
                  <div className="fld"><span className="fld-lbl">Payment Mode</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{selectedWorker.paymentMode || 'CASH'}</div></div>
                  <div className="fld"><span className="fld-lbl">Emergency Contact</span><div className="fld-inp" style={{ background: 'var(--bg-tertiary)', padding: 8 }}>{selectedWorker.emergencyName ? `${selectedWorker.emergencyName} (${selectedWorker.emergencyRelation || 'Contact'}) - ${selectedWorker.emergencyPhone || ''}` : '—'}</div></div>
                </div>
              </div>
            </div>

            <div className="modal-foot" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-gp" onClick={() => setSelectedWorker(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD WORKER MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="erp-modal modal-step-wizard" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Add Worker</span>
              <span className="modal-close" onClick={() => setShowAddModal(false)}>×</span>
            </div>
            
            <div className="modal-steps-header">
              <button type="button" className={`step-tab ${modalStep === 1 ? 'active' : ''}`} onClick={() => setModalStep(1)}>1. Personal</button>
              <button type="button" className={`step-tab ${modalStep === 2 ? 'active' : ''}`} onClick={() => setModalStep(2)}>2. Trade & Wages</button>
              <button type="button" className={`step-tab ${modalStep === 3 ? 'active' : ''}`} onClick={() => setModalStep(3)}>3. KYC & Bank</button>
            </div>

            <form onSubmit={handleAddWorker}>
              <div className="modal-body">
                {modalStep === 1 && (
                  <div className="step-content animate-fade-in">
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">First name *</label><input className="fld-inp" required value={newWorker.firstName} onChange={e => setNewWorker(p => ({ ...p, firstName: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Last name *</label><input className="fld-inp" required value={newWorker.lastName} onChange={e => setNewWorker(p => ({ ...p, lastName: e.target.value }))} /></div>
                    </div>
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Phone</label><input className="fld-inp" value={newWorker.phone} onChange={e => setNewWorker(p => ({ ...p, phone: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Gender</label>
                        <select className="fld-sel" value={newWorker.gender} onChange={e => setNewWorker(p => ({ ...p, gender: e.target.value }))}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="fld"><label className="fld-lbl">Date of Birth</label><input className="fld-inp" type="date" value={newWorker.dob} onChange={e => setNewWorker(p => ({ ...p, dob: e.target.value }))} /></div>
                    
                    <div className="section-divider">Emergency Contact</div>
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Contact Name</label><input className="fld-inp" value={newWorker.emergencyName} onChange={e => setNewWorker(p => ({ ...p, emergencyName: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Relation</label>
                        <select className="fld-sel" value={newWorker.emergencyRelation} onChange={e => setNewWorker(p => ({ ...p, emergencyRelation: e.target.value }))}>
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Child">Child</option>
                          <option value="Friend">Friend</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="fld"><label className="fld-lbl">Emergency Phone</label><input className="fld-inp" value={newWorker.emergencyPhone} onChange={e => setNewWorker(p => ({ ...p, emergencyPhone: e.target.value }))} /></div>
                  </div>
                )}

                {modalStep === 2 && (
                  <div className="step-content animate-fade-in">
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Role / Trade *</label>
                        <select className="fld-sel" value={newWorker.role} onChange={e => setNewWorker(p => ({ ...p, role: e.target.value }))}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="fld"><label className="fld-lbl">Skill Grade *</label>
                        <select className="fld-sel" value={newWorker.skillGrade} onChange={e => setNewWorker(p => ({ ...p, skillGrade: e.target.value }))}>
                          <option value="SKILLED">Skilled</option>
                          <option value="SEMI_SKILLED">Semi-Skilled</option>
                          <option value="UNSKILLED">Unskilled</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Daily wage (₹) *</label><input className="fld-inp" type="number" required value={newWorker.dailyWage} onChange={e => setNewWorker(p => ({ ...p, dailyWage: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Overtime hourly rate (₹)</label><input className="fld-inp" type="number" value={newWorker.overtimeRate} onChange={e => setNewWorker(p => ({ ...p, overtimeRate: e.target.value }))} /></div>
                    </div>
                    <div className="fld"><label className="fld-lbl">Assign to project</label>
                      <select className="fld-sel" value={newWorker.projectId} onChange={e => setNewWorker(p => ({ ...p, projectId: e.target.value }))}>
                        <option value="">No project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="fld"><label className="fld-lbl">Contractor / Agency Name</label>
                      <input className="fld-inp" placeholder="e.g. Apex Labour Agency (Leave empty if Direct)" value={newWorker.contractorName} onChange={e => setNewWorker(p => ({ ...p, contractorName: e.target.value }))} />
                    </div>
                  </div>
                )}

                {modalStep === 3 && (
                  <div className="step-content animate-fade-in">
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Aadhaar Number (12 digit)</label><input className="fld-inp" maxLength={12} placeholder="e.g. 123456789012" value={newWorker.aadhaarNumber} onChange={e => setNewWorker(p => ({ ...p, aadhaarNumber: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">PAN Number (10 character)</label><input className="fld-inp" maxLength={10} placeholder="e.g. ABCDE1234F" style={{ textTransform: 'uppercase' }} value={newWorker.panNumber} onChange={e => setNewWorker(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))} /></div>
                    </div>
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Photo URL</label><input className="fld-inp" placeholder="https://example.com/photo.jpg" value={newWorker.photoUrl} onChange={e => setNewWorker(p => ({ ...p, photoUrl: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Aadhaar scan URL</label><input className="fld-inp" placeholder="https://example.com/aadhaar.pdf" value={newWorker.idDocUrl} onChange={e => setNewWorker(p => ({ ...p, idDocUrl: e.target.value }))} /></div>
                    </div>
                    
                    <div className="section-divider">Payment Settings</div>
                    <div className="fld"><label className="fld-lbl">Payment Mode *</label>
                      <select className="fld-sel" value={newWorker.paymentMode} onChange={e => setNewWorker(p => ({ ...p, paymentMode: e.target.value }))}>
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </div>

                    {newWorker.paymentMode === 'BANK' && (
                      <div className="bank-details-form animate-fade-in">
                        <div className="fld"><label className="fld-lbl">Bank Name</label><input className="fld-inp" value={newWorker.bankName} onChange={e => setNewWorker(p => ({ ...p, bankName: e.target.value }))} /></div>
                        <div className="form-2col">
                          <div className="fld"><label className="fld-lbl">Account Number</label><input className="fld-inp" value={newWorker.bankAccountNo} onChange={e => setNewWorker(p => ({ ...p, bankAccountNo: e.target.value }))} /></div>
                          <div className="fld"><label className="fld-lbl">IFSC Code</label><input className="fld-inp" placeholder="IFSC Code" style={{ textTransform: 'uppercase' }} value={newWorker.bankIfsc} onChange={e => setNewWorker(p => ({ ...p, bankIfsc: e.target.value.toUpperCase() }))} /></div>
                        </div>
                      </div>
                    )}

                    {newWorker.paymentMode === 'UPI' && (
                      <div className="fld animate-fade-in"><label className="fld-lbl">UPI ID (VPA)</label><input className="fld-inp" placeholder="e.g. mobile@ybl" value={newWorker.upiId} onChange={e => setNewWorker(p => ({ ...p, upiId: e.target.value }))} /></div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="modal-foot">
                {modalStep > 1 ? (
                  <button type="button" className="btn-gp" onClick={() => setModalStep(p => p - 1)}>Back</button>
                ) : (
                  <button type="button" className="btn-gp" onClick={() => setShowAddModal(false)}>Cancel</button>
                )}
                <div style={{ flex: 1 }} />
                {modalStep < 3 ? (
                  <button type="button" className="btn-pp" onClick={() => setModalStep(p => p + 1)}>Next</button>
                ) : (
                  <button type="submit" className="btn-pp" disabled={saving}>
                    {saving ? 'Saving...' : 'Register Worker'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WORKER MODAL */}
      {showEditModal && editWorker && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="erp-modal modal-step-wizard" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Edit Worker details</span>
              <span className="modal-close" onClick={() => setShowEditModal(false)}>×</span>
            </div>
            
            <div className="modal-steps-header">
              <button type="button" className={`step-tab ${editModalStep === 1 ? 'active' : ''}`} onClick={() => setEditModalStep(1)}>1. Personal</button>
              <button type="button" className={`step-tab ${editModalStep === 2 ? 'active' : ''}`} onClick={() => setEditModalStep(2)}>2. Trade & Wages</button>
              <button type="button" className={`step-tab ${editModalStep === 3 ? 'active' : ''}`} onClick={() => setEditModalStep(3)}>3. KYC & Bank</button>
            </div>

            <form onSubmit={handleEditWorker}>
              <div className="modal-body">
                {editModalStep === 1 && (
                  <div className="step-content animate-fade-in">
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">First name *</label><input className="fld-inp" required value={editWorker.firstName} onChange={e => setEditWorker(p => ({ ...p, firstName: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Last name *</label><input className="fld-inp" required value={editWorker.lastName} onChange={e => setEditWorker(p => ({ ...p, lastName: e.target.value }))} /></div>
                    </div>
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Phone</label><input className="fld-inp" value={editWorker.phone} onChange={e => setEditWorker(p => ({ ...p, phone: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Gender</label>
                        <select className="fld-sel" value={editWorker.gender} onChange={e => setEditWorker(p => ({ ...p, gender: e.target.value }))}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Date of Birth</label><input className="fld-inp" type="date" value={editWorker.dob} onChange={e => setEditWorker(p => ({ ...p, dob: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Status *</label>
                        <select className="fld-sel" value={editWorker.status} onChange={e => setEditWorker(p => ({ ...p, status: e.target.value }))}>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="section-divider">Emergency Contact</div>
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Contact Name</label><input className="fld-inp" value={editWorker.emergencyName} onChange={e => setEditWorker(p => ({ ...p, emergencyName: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Relation</label>
                        <select className="fld-sel" value={editWorker.emergencyRelation} onChange={e => setEditWorker(p => ({ ...p, emergencyRelation: e.target.value }))}>
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Child">Child</option>
                          <option value="Friend">Friend</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="fld"><label className="fld-lbl">Emergency Phone</label><input className="fld-inp" value={editWorker.emergencyPhone} onChange={e => setEditWorker(p => ({ ...p, emergencyPhone: e.target.value }))} /></div>
                  </div>
                )}

                {editModalStep === 2 && (
                  <div className="step-content animate-fade-in">
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Role / Trade *</label>
                        <select className="fld-sel" value={editWorker.role} onChange={e => setEditWorker(p => ({ ...p, role: e.target.value }))}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="fld"><label className="fld-lbl">Skill Grade *</label>
                        <select className="fld-sel" value={editWorker.skillGrade} onChange={e => setEditWorker(p => ({ ...p, skillGrade: e.target.value }))}>
                          <option value="SKILLED">Skilled</option>
                          <option value="SEMI_SKILLED">Semi-Skilled</option>
                          <option value="UNSKILLED">Unskilled</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Daily wage (₹) *</label><input className="fld-inp" type="number" required value={editWorker.dailyWage} onChange={e => setEditWorker(p => ({ ...p, dailyWage: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Overtime hourly rate (₹)</label><input className="fld-inp" type="number" value={editWorker.overtimeRate} onChange={e => setEditWorker(p => ({ ...p, overtimeRate: e.target.value }))} /></div>
                    </div>
                    <div className="fld"><label className="fld-lbl">Assign to project</label>
                      <select className="fld-sel" value={editWorker.projectId} onChange={e => setEditWorker(p => ({ ...p, projectId: e.target.value }))}>
                        <option value="">No project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="fld"><label className="fld-lbl">Contractor / Agency Name</label>
                      <input className="fld-inp" placeholder="e.g. Apex Labour Agency (Leave empty if Direct)" value={editWorker.contractorName} onChange={e => setEditWorker(p => ({ ...p, contractorName: e.target.value }))} />
                    </div>
                  </div>
                )}

                {editModalStep === 3 && (
                  <div className="step-content animate-fade-in">
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Aadhaar Number (12 digit)</label><input className="fld-inp" maxLength={12} placeholder="e.g. 123456789012" value={editWorker.aadhaarNumber} onChange={e => setEditWorker(p => ({ ...p, aadhaarNumber: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">PAN Number (10 character)</label><input className="fld-inp" maxLength={10} placeholder="e.g. ABCDE1234F" style={{ textTransform: 'uppercase' }} value={editWorker.panNumber} onChange={e => setEditWorker(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))} /></div>
                    </div>
                    <div className="form-2col">
                      <div className="fld"><label className="fld-lbl">Photo URL</label><input className="fld-inp" placeholder="https://example.com/photo.jpg" value={editWorker.photoUrl} onChange={e => setEditWorker(p => ({ ...p, photoUrl: e.target.value }))} /></div>
                      <div className="fld"><label className="fld-lbl">Aadhaar scan URL</label><input className="fld-inp" placeholder="https://example.com/aadhaar.pdf" value={editWorker.idDocUrl} onChange={e => setEditWorker(p => ({ ...p, idDocUrl: e.target.value }))} /></div>
                    </div>
                    
                    <div className="section-divider">Payment Settings</div>
                    <div className="fld"><label className="fld-lbl">Payment Mode *</label>
                      <select className="fld-sel" value={editWorker.paymentMode} onChange={e => setEditWorker(p => ({ ...p, paymentMode: e.target.value }))}>
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </div>

                    {editWorker.paymentMode === 'BANK' && (
                      <div className="bank-details-form animate-fade-in">
                        <div className="fld"><label className="fld-lbl">Bank Name</label><input className="fld-inp" value={editWorker.bankName} onChange={e => setEditWorker(p => ({ ...p, bankName: e.target.value }))} /></div>
                        <div className="form-2col">
                          <div className="fld"><label className="fld-lbl">Account Number</label><input className="fld-inp" value={editWorker.bankAccountNo} onChange={e => setEditWorker(p => ({ ...p, bankAccountNo: e.target.value }))} /></div>
                          <div className="fld"><label className="fld-lbl">IFSC Code</label><input className="fld-inp" placeholder="IFSC Code" style={{ textTransform: 'uppercase' }} value={editWorker.bankIfsc} onChange={e => setEditWorker(p => ({ ...p, bankIfsc: e.target.value.toUpperCase() }))} /></div>
                        </div>
                      </div>
                    )}

                    {editWorker.paymentMode === 'UPI' && (
                      <div className="fld animate-fade-in"><label className="fld-lbl">UPI ID (VPA)</label><input className="fld-inp" placeholder="e.g. mobile@ybl" value={editWorker.upiId} onChange={e => setEditWorker(p => ({ ...p, upiId: e.target.value }))} /></div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="modal-foot">
                {editModalStep > 1 ? (
                  <button type="button" className="btn-gp" onClick={() => setEditModalStep(p => p - 1)}>Back</button>
                ) : (
                  <button 
                    type="button" 
                    className="btn-gp" 
                    style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#DC2626', padding: '0 12px', height: 30 }}
                    onClick={() => setWorkerToDelete(editWorker)}
                  >
                    Delete Worker
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {editModalStep < 3 ? (
                  <button type="button" className="btn-pp" onClick={() => setEditModalStep(p => p + 1)}>Next</button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn-gp" onClick={() => setShowEditModal(false)}>Cancel</button>
                    <button type="submit" className="btn-pp" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Worker Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!workerToDelete}
        onClose={() => setWorkerToDelete(null)}
        onConfirm={handleDeleteWorker}
        title="Delete Worker profile"
        message={`Are you sure you want to permanently delete the profile of "${workerToDelete?.firstName} ${workerToDelete?.lastName}"? This action cannot be undone.`}
        confirmText="Delete Worker"
        disabled={isDeleting}
      />

      {/* EXCEL UPLOAD TAB */}
      {activeTab === 'upload' && (
        <div className="labour-content">
          <div className="labour-page-title">Excel Attendance Upload</div>
          <div className="labour-page-sub">Upload attendance from supervisor's Excel sheet</div>

          <div className="erp-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="labour-upload-grid">
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
      {/* CORRECTION MODAL */}
      {showCorrectionModal && (
        <div className="modal-overlay" onClick={() => setShowCorrectionModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <span className="modal-title">Log Attendance Correction</span>
              <span className="modal-close" onClick={() => setShowCorrectionModal(false)}>×</span>
            </div>
            <form onSubmit={handleCorrectionSubmit}>
              <div className="modal-body">
                <div className="form-2col">
                  <div className="fld">
                    <label className="fld-lbl">Correction Date *</label>
                    <input 
                      type="date" 
                      className="fld-inp" 
                      required 
                      value={correctionData.date} 
                      onChange={e => {
                        const val = e.target.value;
                        setCorrectionData(p => ({ ...p, date: val }));
                        handleCorrectionFetchRecord(correctionData.workerId, val);
                      }} 
                    />
                  </div>
                  <div className="fld">
                    <label className="fld-lbl">Worker *</label>
                    <select 
                      className="fld-sel" 
                      required 
                      value={correctionData.workerId} 
                      onChange={e => {
                        const val = e.target.value;
                        setCorrectionData(p => ({ ...p, workerId: val }));
                        handleCorrectionFetchRecord(val, correctionData.date);
                      }}
                    >
                      <option value="">Select worker</option>
                      {workers.map(w => <option key={w.id} value={w.id}>{w.firstName} {w.lastName} ({w.role})</option>)}
                    </select>
                  </div>
                </div>

                {!correctionData.attendanceId ? (
                  <div style={{ padding: '12px 16px', background: '#FEF3C7', color: '#D97706', border: '0.5px solid #FCD34D', borderRadius: 6, fontSize: 11, margin: '8px 0 12px 0' }}>
                    ⚠️ First select a Date and a Worker with an existing logged attendance record.
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <div style={{ padding: '10px 12px', background: '#ECFDF5', color: '#065F46', borderRadius: 6, fontSize: 11, margin: '8px 0 12px 0' }}>
                      ✓ Existing attendance record found. Update details below.
                    </div>
                    
                    <div className="form-2col">
                      <div className="fld">
                        <label className="fld-lbl">New Status *</label>
                        <select 
                          className="fld-sel" 
                          required 
                          value={correctionData.status} 
                          onChange={e => {
                            const val = e.target.value;
                            setCorrectionData(p => {
                              const w = workers.find(x => x.id === p.workerId);
                              let baseWage = 0;
                              if (val === 'PRESENT') baseWage = w?.dailyWage || 0;
                              else if (val === 'HALF_DAY') baseWage = (w?.dailyWage || 0) / 2;
                              const otHrs = parseFloat(p.overtimeHrs) || 0;
                              const otRate = w?.overtimeRate || 0;
                              return { ...p, status: val, wageAmount: baseWage + (otHrs * otRate) };
                            });
                          }}
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="HALF_DAY">Half-day</option>
                          <option value="LEAVE">Leave</option>
                        </select>
                      </div>
                      <div className="fld">
                        <label className="fld-lbl">New Daily Pay (₹) *</label>
                        <input 
                          type="number" 
                          className="fld-inp" 
                          required 
                          value={correctionData.wageAmount} 
                          onChange={e => setCorrectionData(p => ({ ...p, wageAmount: e.target.value }))} 
                        />
                      </div>
                    </div>

                    <div className="form-2col">
                      <div className="fld">
                        <label className="fld-lbl">Overtime Hours</label>
                        <input 
                          type="number" 
                          className="fld-inp" 
                          min="0"
                          max="24"
                          value={correctionData.overtimeHrs} 
                          onChange={e => {
                            const val = e.target.value;
                            setCorrectionData(p => {
                              const w = workers.find(x => x.id === p.workerId);
                              let baseWage = 0;
                              if (p.status === 'PRESENT') baseWage = w?.dailyWage || 0;
                              else if (p.status === 'HALF_DAY') baseWage = (w?.dailyWage || 0) / 2;
                              const otHrs = parseFloat(val) || 0;
                              const otRate = w?.overtimeRate || 0;
                              return { ...p, overtimeHrs: val, wageAmount: baseWage + (otHrs * otRate) };
                            });
                          }} 
                        />
                      </div>
                      <div className="fld">
                        <label className="fld-lbl">Correction Remarks</label>
                        <input 
                          type="text" 
                          className="fld-inp" 
                          placeholder="Internal shift note..." 
                          value={correctionData.notes} 
                          onChange={e => setCorrectionData(p => ({ ...p, notes: e.target.value }))} 
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="fld" style={{ marginTop: 8 }}>
                  <label className="fld-lbl">Reason for Correction *</label>
                  <textarea 
                    className="fld-inp" 
                    style={{ height: 60, padding: 8, resize: 'none' }}
                    required 
                    placeholder="Provide the reason for this manual correction..."
                    value={correctionData.reason} 
                    onChange={e => setCorrectionData(p => ({ ...p, reason: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-gp" onClick={() => setShowCorrectionModal(false)}>Cancel</button>
                <button type="submit" className="btn-pp" disabled={submittingCorrection || !correctionData.attendanceId}>
                  {submittingCorrection ? 'Logging...' : 'Apply Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
