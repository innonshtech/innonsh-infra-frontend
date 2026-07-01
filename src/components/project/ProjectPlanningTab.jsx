import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { projectService } from '../../services/api';
import { 
  Calendar, Plus, Trash2, Edit2, CheckCircle, Clock, AlertTriangle, 
  FileText, Users, HardHat, Package, FileCode, Clock3
} from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal';

export default function ProjectPlanningTab({ projectId }) {
  const { user } = useAuth();
  const toast = useToast();

  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if current user has edit permissions (Owner, Manager, SUPERADMIN)
  const canEdit = user?.role === 'Owner' || 
                  user?.role === 'SUPERADMIN' || 
                  user?.permissions?.includes('*') || 
                  user?.permissions?.includes('projects.manage');

  // Modal States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  // Edit targets
  const [editingPhase, setEditingPhase] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);

  // Delete confirmations
  const [phaseToDelete, setPhaseToDelete] = useState(null);
  const [selectedResourcePhaseId, setSelectedResourcePhaseId] = useState('ALL');
  const [activeSubTab, setActiveSubTab] = useState('schedule');
  const [submitting, setSubmitting] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState(null);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [riskToDelete, setRiskToDelete] = useState(null);

  // Form States
  const [scheduleForm, setScheduleForm] = useState({
    plannedStartDate: '',
    plannedEndDate: '',
    currentPhase: '',
    delayDays: 0,
  });

  const [phaseForm, setPhaseForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isStarted: false,
    isCompleted: false,
    progress: 0,
    status: 'PENDING',
  });

  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    targetDate: '',
    isCompleted: false,
  });

  const [resourceForm, setResourceForm] = useState({
    category: 'LABOUR',
    name: '',
    quantity: 1,
    unit: 'Count',
    phaseId: '',
  });

  const [riskForm, setRiskForm] = useState({
    name: '',
    priority: 'MEDIUM',
    status: 'OPEN',
  });

  const [planningNotes, setPlanningNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Fetch planning data
  const loadPlanning = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await projectService.getPlanning(projectId);
      const data = res.data?.data || res.data;
      if (data) {
        setPlanning(data);
        setScheduleForm({
          plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate).toISOString().split('T')[0] : '',
          plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate).toISOString().split('T')[0] : '',
          currentPhase: data.currentPhase || '',
          delayDays: data.delayDays || 0,
        });
        setPlanningNotes(data.planningNotes || '');
      }
    } catch (err) {
      toast.error('Failed to load project planning details');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadPlanning(true);
    }
  }, [projectId]);

  // Handle high-level schedule updates
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        plannedStartDate: scheduleForm.plannedStartDate || null,
        plannedEndDate: scheduleForm.plannedEndDate || null,
      };
      await projectService.updatePlanning(projectId, payload);
      toast.success('Schedule updated successfully');
      setShowScheduleModal(false);
      loadPlanning(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Planning Notes Auto-Save / Save
  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await projectService.updatePlanning(projectId, { planningNotes });
      toast.success('Planning notes saved');
    } catch (err) {
      toast.error('Failed to save planning notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // --- Phase Handlers ---
  const handleOpenPhaseModal = (phase = null) => {
    if (phase) {
      setEditingPhase(phase);
      setPhaseForm({
        name: phase.name || '',
        startDate: phase.startDate ? new Date(phase.startDate).toISOString().split('T')[0] : '',
        endDate: phase.endDate ? new Date(phase.endDate).toISOString().split('T')[0] : '',
        isStarted: phase.isStarted || false,
        isCompleted: phase.isCompleted || false,
        progress: phase.progress || 0,
        status: phase.status || 'PENDING',
      });
    } else {
      setEditingPhase(null);
      setPhaseForm({
        name: '',
        startDate: '',
        endDate: '',
        isStarted: false,
        isCompleted: false,
        progress: 0,
        status: 'PENDING',
      });
    }
    setShowPhaseModal(true);
  };

  const handleSavePhase = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...phaseForm,
        startDate: phaseForm.startDate || null,
        endDate: phaseForm.endDate || null,
        progress: parseFloat(phaseForm.progress) || 0,
      };
      if (editingPhase) {
        await projectService.updatePhase(projectId, editingPhase.id, payload);
        toast.success('Phase updated successfully');
      } else {
        await projectService.createPhase(projectId, payload);
        toast.success('Phase added successfully');
      }
      setShowPhaseModal(false);
      loadPlanning(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save phase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePhase = async () => {
    if (!phaseToDelete) return;
    try {
      setSubmitting(true);
      await projectService.deletePhase(projectId, phaseToDelete.id);
      toast.success('Phase deleted successfully');
      loadPlanning(false);
    } catch (err) {
      toast.error('Failed to delete phase');
    } finally {
      setSubmitting(false);
      setPhaseToDelete(null);
    }
  };

  // --- Milestone Handlers ---
  const handleOpenMilestoneModal = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneForm({
        name: milestone.name || '',
        targetDate: milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : '',
        isCompleted: milestone.isCompleted || false,
      });
    } else {
      setEditingMilestone(null);
      setMilestoneForm({
        name: '',
        targetDate: '',
        isCompleted: false,
      });
    }
    setShowMilestoneModal(true);
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingMilestone) {
        await projectService.updateMilestone(projectId, editingMilestone.id, milestoneForm);
        toast.success('Milestone updated');
      } else {
        await projectService.createMilestone(projectId, milestoneForm);
        toast.success('Milestone added');
      }
      setShowMilestoneModal(false);
      loadPlanning(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save milestone');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMilestone = async (milestone) => {
    if (!canEdit) return;
    try {
      await projectService.updateMilestone(projectId, milestone.id, {
        isCompleted: !milestone.isCompleted
      });
      loadPlanning(false);
    } catch (err) {
      toast.error('Failed to toggle milestone state');
    }
  };

  const handleDeleteMilestone = async () => {
    if (!milestoneToDelete) return;
    try {
      setSubmitting(true);
      await projectService.deleteMilestone(projectId, milestoneToDelete.id);
      toast.success('Milestone deleted');
      loadPlanning(false);
    } catch (err) {
      toast.error('Failed to delete milestone');
    } finally {
      setSubmitting(false);
      setMilestoneToDelete(null);
    }
  };

  // --- Resource Handlers ---
  const handleOpenResourceModal = (resource = null) => {
    if (resource) {
      setEditingResource(resource);
      setResourceForm({
        category: resource.category || 'LABOUR',
        name: resource.name || '',
        quantity: resource.quantity || 1,
        unit: resource.unit || 'Count',
        phaseId: resource.phaseId || '',
      });
    } else {
      setEditingResource(null);
      setResourceForm({
        category: 'LABOUR',
        name: '',
        quantity: 1,
        unit: 'Count',
        phaseId: selectedResourcePhaseId === 'ALL' || selectedResourcePhaseId === 'GENERAL' ? '' : selectedResourcePhaseId,
      });
    }
    setShowResourceModal(true);
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...resourceForm,
        quantity: parseFloat(resourceForm.quantity) || 0,
        phaseId: resourceForm.phaseId || null,
      };
      if (editingResource) {
        await projectService.updateResourcePlan(projectId, editingResource.id, payload);
        toast.success('Resource plan updated');
      } else {
        await projectService.createResourcePlan(projectId, payload);
        toast.success('Resource added to plan');
      }
      setShowResourceModal(false);
      loadPlanning(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save resource plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;
    try {
      setSubmitting(true);
      await projectService.deleteResourcePlan(projectId, resourceToDelete.id);
      toast.success('Resource plan item deleted');
      loadPlanning(false);
    } catch (err) {
      toast.error('Failed to delete resource plan item');
    } finally {
      setSubmitting(false);
      setResourceToDelete(null);
    }
  };

  // --- Risk Handlers ---
  const handleOpenRiskModal = (risk = null) => {
    if (risk) {
      setEditingRisk(risk);
      setRiskForm({
        name: risk.name || '',
        priority: risk.priority || 'MEDIUM',
        status: risk.status || 'OPEN',
      });
    } else {
      setEditingRisk(null);
      setRiskForm({
        name: '',
        priority: 'MEDIUM',
        status: 'OPEN',
      });
    }
    setShowRiskModal(true);
  };

  const handleSaveRisk = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingRisk) {
        await projectService.updateRisk(projectId, editingRisk.id, riskForm);
        toast.success('Critical risk updated');
      } else {
        await projectService.createRisk(projectId, riskForm);
        toast.success('Critical risk logged');
      }
      setShowRiskModal(false);
      loadPlanning(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save risk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRiskStatus = async (risk) => {
    if (!canEdit) return;
    try {
      await projectService.updateRisk(projectId, risk.id, {
        status: risk.status === 'OPEN' ? 'CLOSED' : 'OPEN'
      });
      loadPlanning(false);
    } catch (err) {
      toast.error('Failed to update risk status');
    }
  };

  const handleDeleteRisk = async () => {
    if (!riskToDelete) return;
    try {
      setSubmitting(true);
      await projectService.deleteRisk(projectId, riskToDelete.id);
      toast.success('Critical risk deleted');
      loadPlanning(false);
    } catch (err) {
      toast.error('Failed to delete risk');
    } finally {
      setSubmitting(false);
      setRiskToDelete(null);
    }
  };

  // Helper: Calculate total duration in days between planned dates
  const calculateTotalDuration = () => {
    if (!scheduleForm.plannedStartDate || !scheduleForm.plannedEndDate) return '—';
    const start = new Date(scheduleForm.plannedStartDate);
    const end = new Date(scheduleForm.plannedEndDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} Days`;
  };

  // Helper: Get active running phase name
  const getActivePhaseName = () => {
    const runningPhase = planning?.phases?.find(p => p.status === 'RUNNING');
    if (runningPhase) return runningPhase.name;
    const completedPhasesCount = planning?.phases?.filter(p => p.status === 'COMPLETED').length || 0;
    if (completedPhasesCount === planning?.phases?.length && planning?.phases?.length > 0) {
      return 'Completed';
    }
    return 'Not Started';
  };

  // Helper: Get auto delay days based on active running phase or overall project targets
  const getAutoDelayDays = () => {
    const runningPhase = planning?.phases?.find(p => p.status === 'RUNNING');
    const today = new Date();
    today.setHours(0,0,0,0);

    if (runningPhase && runningPhase.endDate) {
      const phaseEnd = new Date(runningPhase.endDate);
      phaseEnd.setHours(0,0,0,0);
      if (today > phaseEnd) {
        const diffTime = today - phaseEnd;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    } else if (planning?.plannedEndDate) {
      const projectEnd = new Date(planning.plannedEndDate);
      projectEnd.setHours(0,0,0,0);
      if (today > projectEnd) {
        const diffTime = today - projectEnd;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
    return 0;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  // Filter resources by phase and then by category
  const getFilteredResources = (category) => {
    let list = planning?.resourcePlans || [];
    if (selectedResourcePhaseId === 'GENERAL') {
      list = list.filter(r => !r.phaseId);
    } else if (selectedResourcePhaseId !== 'ALL') {
      list = list.filter(r => r.phaseId === selectedResourcePhaseId);
    }
    return list.filter(r => r.category === category);
  };

  const labours = getFilteredResources('LABOUR');
  const equipments = getFilteredResources('EQUIPMENT');
  const materials = getFilteredResources('MATERIAL');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', paddingBottom: 'var(--space-2xl)' }}>
      
      {/* ─── NESTED SUB-TAB BAR ─── */}
      <div className="labour-tab-bar" style={{ background: 'transparent', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 0, marginBottom: 'var(--space-md)' }}>
        <button className={`labour-tab ${activeSubTab === 'schedule' ? 'act' : ''}`} style={{ fontSize: '13px', padding: '10px 16px' }} onClick={() => setActiveSubTab('schedule')}>📅 Timeline & Phases</button>
        <button className={`labour-tab ${activeSubTab === 'resources' ? 'act' : ''}`} style={{ fontSize: '13px', padding: '10px 16px' }} onClick={() => setActiveSubTab('resources')}>👥 Resource Planning</button>
        <button className={`labour-tab ${activeSubTab === 'risks' ? 'act' : ''}`} style={{ fontSize: '13px', padding: '10px 16px' }} onClick={() => setActiveSubTab('risks')}>⚠️ Risk Ledger</button>
        <button className={`labour-tab ${activeSubTab === 'notes' ? 'act' : ''}`} style={{ fontSize: '13px', padding: '10px 16px' }} onClick={() => setActiveSubTab('notes')}>📝 Planning Notes</button>
      </div>

      {/* ─── 1. TIMELINE & PHASES SUB-TAB ─── */}
      {activeSubTab === 'schedule' && (
        <>
          {/* Construction Target Schedule Card */}
          <div className="card-flat" style={{ padding: 'var(--space-xl)', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={20} className="text-primary" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Construction Target Schedule</h3>
              </div>
              {canEdit && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowScheduleModal(true)}>
                  <Edit2 size={13} style={{ marginRight: 6 }} /> Configure Target
                </button>
              )}
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: 'var(--space-lg)' 
            }}>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Planned Start</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {planning?.plannedStartDate ? new Date(planning.plannedStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Scheduled'}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Planned End</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {planning?.plannedEndDate ? new Date(planning.plannedEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Scheduled'}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Target Duration</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{calculateTotalDuration()}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Current Planning Phase</div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--accent-primary)' }}>{getActivePhaseName()}</div>
              </div>
              <div style={{ 
                padding: '12px', 
                background: getAutoDelayDays() > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-md)',
                borderLeft: getAutoDelayDays() > 0 ? '3px solid var(--text-danger)' : 'none'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Current Target Delay</div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: getAutoDelayDays() > 0 ? 'var(--text-danger)' : 'inherit' }}>
                  {getAutoDelayDays()} Days
                </div>
              </div>
            </div>
          </div>

          {/* Project Phases & Milestones side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.3fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
            {/* Project Phases */}
            <div className="card-flat" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock3 size={18} className="text-primary" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Project Phases</h3>
                </div>
                {canEdit && (
                  <button className="btn btn-primary btn-sm" onClick={() => handleOpenPhaseModal()}>
                    <Plus size={13} style={{ marginRight: 6 }} /> Add Phase
                  </button>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="wbs-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Phase Name</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Start</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>End</th>
                      <th style={{ width: '23%' }}>Progress</th>
                      <th style={{ width: '10%' }}>Status</th>
                      {canEdit && <th style={{ width: '8%', textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {planning?.phases?.map(phase => (
                      <tr key={phase.id} className="wbs-row">
                        <td className="wbs-cell" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{phase.name}</td>
                        <td className="wbs-cell" style={{ textAlign: 'center' }}>
                          {phase.isStarted ? <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>✔</span> : <span style={{ color: 'var(--text-danger)' }}>✕</span>}
                        </td>
                        <td className="wbs-cell" style={{ textAlign: 'center' }}>
                          {phase.isCompleted ? <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>✔</span> : <span style={{ color: 'var(--text-danger)' }}>✕</span>}
                        </td>
                        <td className="wbs-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flexGrow: 1, height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${phase.progress}%`, height: '100%', background: 'var(--accent-primary)' }}></div>
                            </div>
                            <span style={{ fontSize: '12px', minWidth: '32px', textAlign: 'right' }}>{Math.round(phase.progress)}%</span>
                          </div>
                        </td>
                        <td className="wbs-cell">
                          <span className="badge" style={{ 
                            textTransform: 'capitalize',
                            background: phase.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : phase.status === 'RUNNING' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                            color: phase.status === 'COMPLETED' ? '#10b981' : phase.status === 'RUNNING' ? '#3b82f6' : '#9ca3af',
                            border: `1px solid ${phase.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : phase.status === 'RUNNING' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(156, 163, 175, 0.2)'}`
                          }}>
                            {phase.status.toLowerCase()}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="wbs-cell" style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                              <button className="btn btn-icon btn-ghost text-primary" onClick={() => handleOpenPhaseModal(phase)}><Edit2 size={12}/></button>
                              <button className="btn btn-icon btn-ghost text-danger" onClick={() => setPhaseToDelete(phase)}><Trash2 size={12}/></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!planning?.phases || planning.phases.length === 0) && (
                      <tr>
                        <td colSpan={canEdit ? 6 : 5} className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>
                          No planning phases defined yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Milestones */}
            <div className="card-flat" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={18} className="text-primary" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Key Milestones</h3>
                </div>
                {canEdit && (
                  <button className="btn btn-primary btn-sm" onClick={() => handleOpenMilestoneModal()}>
                    <Plus size={13} style={{ marginRight: 6 }} /> Add
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {planning?.milestones?.map(m => (
                  <div key={m.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid ${m.isCompleted ? 'var(--accent-secondary)' : 'var(--border-secondary)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <input 
                        type="checkbox" 
                        checked={m.isCompleted} 
                        disabled={!canEdit}
                        onChange={() => handleToggleMilestone(m)}
                        style={{ cursor: canEdit ? 'pointer' : 'default' }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ 
                          fontWeight: 600, 
                          fontSize: '13px',
                          textDecoration: m.isCompleted ? 'line-through' : 'none',
                          color: m.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Target: {new Date(m.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-icon btn-ghost text-primary" onClick={() => handleOpenMilestoneModal(m)}><Edit2 size={11}/></button>
                        <button className="btn btn-icon btn-ghost text-danger" onClick={() => setMilestoneToDelete(m)}><Trash2 size={11}/></button>
                      </div>
                    )}
                  </div>
                ))}
                {(!planning?.milestones || planning.milestones.length === 0) && (
                  <div className="text-center text-muted" style={{ padding: 'var(--space-lg)' }}>
                    No milestones added.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── 2. RESOURCE PLANNING SUB-TAB ─── */}
      {activeSubTab === 'resources' && (
        <div className="card-flat" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={18} className="text-primary" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Resource Requirements Forecast</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phase:</span>
                <select
                  className="form-input"
                  style={{ width: '180px', padding: '4px 8px', fontSize: '12px', height: '30px' }}
                  value={selectedResourcePhaseId}
                  onChange={e => setSelectedResourcePhaseId(e.target.value)}
                >
                  <option value="ALL">All Phases & General</option>
                  <option value="GENERAL">General (No Phase)</option>
                  {planning?.phases?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenResourceModal()}>
                <Plus size={13} style={{ marginRight: 6 }} /> Add Resource
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
            {/* Labour Card */}
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px dashed var(--border-primary)', paddingBottom: '8px' }}>
                <HardHat size={16} className="text-primary" />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Labour Required</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {labours.map(lab => (
                  <div key={lab.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{lab.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{lab.quantity} {lab.unit || ''}</span>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button className="btn btn-icon btn-ghost btn-sm text-primary" onClick={() => handleOpenResourceModal(lab)}><Edit2 size={10}/></button>
                          <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => setResourceToDelete(lab)}><Trash2 size={10}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {labours.length === 0 && <div className="text-muted text-xs">No Labour resources planned.</div>}
              </div>
            </div>

            {/* Equipment Card */}
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px dashed var(--border-primary)', paddingBottom: '8px' }}>
                <Package size={16} className="text-primary" />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Equipment Required</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {equipments.map(eq => (
                  <div key={eq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{eq.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{eq.quantity} {eq.unit || 'Units'}</span>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button className="btn btn-icon btn-ghost btn-sm text-primary" onClick={() => handleOpenResourceModal(eq)}><Edit2 size={10}/></button>
                          <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => setResourceToDelete(eq)}><Trash2 size={10}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {equipments.length === 0 && <div className="text-muted text-xs">No Equipment resources planned.</div>}
              </div>
            </div>

            {/* Materials Card */}
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px dashed var(--border-primary)', paddingBottom: '8px' }}>
                <FileCode size={16} className="text-primary" />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Major Materials Target</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {materials.map(mat => (
                  <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{mat.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{mat.quantity} {mat.unit || 'Units'}</span>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button className="btn btn-icon btn-ghost btn-sm text-primary" onClick={() => handleOpenResourceModal(mat)}><Edit2 size={10}/></button>
                          <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => setResourceToDelete(mat)}><Trash2 size={10}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {materials.length === 0 && <div className="text-muted text-xs">No Material plans recorded.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. RISK LEDGER SUB-TAB ─── */}
      {activeSubTab === 'risks' && (
        <div className="card-flat" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} className="text-danger" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Critical Project Risks</h3>
            </div>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenRiskModal()}>
                <Plus size={13} style={{ marginRight: 6 }} /> Log Risk
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="wbs-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Risk Description</th>
                  <th style={{ width: '20%' }}>Priority</th>
                  <th style={{ width: '20%' }}>Status</th>
                  {canEdit && <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {planning?.risks?.map(risk => (
                  <tr key={risk.id} className="wbs-row">
                    <td className="wbs-cell" style={{ fontSize: '13px' }}>{risk.name}</td>
                    <td className="wbs-cell">
                      <span className={`badge ${
                        risk.priority === 'HIGH' ? 'badge-red' : 
                        risk.priority === 'MEDIUM' ? 'badge-purple' : 'badge-purple'
                      }`} style={{ fontSize: '10px' }}>
                        {risk.priority}
                      </span>
                    </td>
                    <td className="wbs-cell">
                      <button 
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          cursor: canEdit ? 'pointer' : 'default',
                          fontSize: '13px',
                          color: risk.status === 'OPEN' ? 'var(--text-danger)' : 'var(--accent-secondary)',
                          fontWeight: 600,
                          textDecoration: 'underline'
                        }}
                        disabled={!canEdit}
                        onClick={() => handleToggleRiskStatus(risk)}
                      >
                        {risk.status}
                      </button>
                    </td>
                    {canEdit && (
                      <td className="wbs-cell" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-icon btn-ghost text-primary" onClick={() => handleOpenRiskModal(risk)}><Edit2 size={12}/></button>
                          <button className="btn btn-icon btn-ghost text-danger" onClick={() => setRiskToDelete(risk)}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {(!planning?.risks || planning.risks.length === 0) && (
                  <tr>
                    <td colSpan={canEdit ? 4 : 3} className="text-center text-muted" style={{ padding: 'var(--space-md)' }}>
                      No risks logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 4. PLANNING NOTES SUB-TAB ─── */}
      {activeSubTab === 'notes' && (
        <div className="card-flat" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', minHeight: '320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-lg)' }}>
            <FileText size={18} className="text-primary" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Planning Commentary / Notes</h3>
          </div>
          <textarea
            className="form-input"
            rows={10}
            placeholder="Write project general planning commentary, weekly goals or special requirements here..."
            value={planningNotes}
            disabled={!canEdit}
            onChange={e => setPlanningNotes(e.target.value)}
            style={{ 
              resize: 'none', 
              flexGrow: 1, 
              marginBottom: '12px',
              fontFamily: 'inherit',
              padding: '12px',
              fontSize: '13px'
            }}
          />
          {canEdit && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ─── */}

      {/* 1. Schedule Configuration Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Configure Target Schedule</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSchedule}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Planned Start Date</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={scheduleForm.plannedStartDate}
                    onChange={e => setScheduleForm({...scheduleForm, plannedStartDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Planned End Date</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={scheduleForm.plannedEndDate}
                    onChange={e => setScheduleForm({...scheduleForm, plannedEndDate: e.target.value})}
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Phase Add/Edit Modal */}
      {showPhaseModal && (
        <div className="modal-overlay" onClick={() => setShowPhaseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>{editingPhase ? 'Edit Phase' : 'Add New Phase'}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowPhaseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePhase}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Phase Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Mobilization" 
                    value={phaseForm.name} 
                    onChange={e => setPhaseForm({...phaseForm, name: e.target.value})} 
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={phaseForm.startDate} 
                      onChange={e => setPhaseForm({...phaseForm, startDate: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={phaseForm.endDate} 
                      onChange={e => setPhaseForm({...phaseForm, endDate: e.target.value})} 
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', padding: '10px 0', borderBottom: '1px dashed var(--border-secondary)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="checkbox" 
                      checked={phaseForm.isStarted} 
                      onChange={e => setPhaseForm({...phaseForm, isStarted: e.target.checked})} 
                    />
                    Is Started
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="checkbox" 
                      checked={phaseForm.isCompleted} 
                      onChange={e => setPhaseForm({...phaseForm, isCompleted: e.target.checked})} 
                    />
                    Is Completed
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Progress Percentage ({phaseForm.progress}%)</label>
                  <input 
                    type="range" 
                    min="0" max="100" step="1"
                    className="form-input" 
                    value={phaseForm.progress} 
                    onChange={e => setPhaseForm({...phaseForm, progress: parseInt(e.target.value)})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-input" 
                    value={phaseForm.status} 
                    onChange={e => setPhaseForm({...phaseForm, status: e.target.value})}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="RUNNING">Running</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setShowPhaseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Phase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Milestone Add/Edit Modal */}
      {showMilestoneModal && (
        <div className="modal-overlay" onClick={() => setShowMilestoneModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>{editingMilestone ? 'Edit Milestone' : 'Add Key Milestone'}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowMilestoneModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveMilestone}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Milestone Title *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Site Handover / Structure Complete" 
                    value={milestoneForm.name} 
                    onChange={e => setMilestoneForm({...milestoneForm, name: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={milestoneForm.targetDate} 
                    onChange={e => setMilestoneForm({...milestoneForm, targetDate: e.target.value})} 
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', marginTop: '6px' }}>
                  <input 
                    type="checkbox" 
                    checked={milestoneForm.isCompleted} 
                    onChange={e => setMilestoneForm({...milestoneForm, isCompleted: e.target.checked})} 
                  />
                  Mark as Completed
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setShowMilestoneModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Resource Add/Edit Modal */}
      {showResourceModal && (
        <div className="modal-overlay" onClick={() => setShowResourceModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>{editingResource ? 'Edit Resource Target' : 'Plan Site Resource'}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowResourceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveResource}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Resource Category *</label>
                  <select 
                    className="form-input"
                    value={resourceForm.category}
                    onChange={e => setResourceForm({...resourceForm, category: e.target.value})}
                  >
                    <option value="LABOUR">Labour Trade</option>
                    <option value="EQUIPMENT">Machinery / Equipment</option>
                    <option value="MATERIAL">Major Material</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Associated Project Phase</label>
                  <select 
                    className="form-input"
                    value={resourceForm.phaseId}
                    onChange={e => setResourceForm({...resourceForm, phaseId: e.target.value})}
                  >
                    <option value="">General Project (No specific phase)</option>
                    {planning?.phases?.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Resource Item Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Mason / Excavator / Cement" 
                    value={resourceForm.name} 
                    onChange={e => setResourceForm({...resourceForm, name: e.target.value})} 
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Required Quantity *</label>
                    <input 
                      type="number" 
                      required 
                      min="0.01" step="any"
                      className="form-input" 
                      value={resourceForm.quantity} 
                      onChange={e => setResourceForm({...resourceForm, quantity: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure (optional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Bags / MT / Count" 
                      value={resourceForm.unit} 
                      onChange={e => setResourceForm({...resourceForm, unit: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setShowResourceModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Risk Add/Edit Modal */}
      {showRiskModal && (
        <div className="modal-overlay" onClick={() => setShowRiskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>{editingRisk ? 'Edit Logged Risk' : 'Log Critical Project Risk'}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowRiskModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRisk}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Risk Description *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Rain forecast / Material delay" 
                    value={riskForm.name} 
                    onChange={e => setRiskForm({...riskForm, name: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select 
                    className="form-input"
                    value={riskForm.priority}
                    onChange={e => setRiskForm({...riskForm, priority: e.target.value})}
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Risk Status</label>
                  <select 
                    className="form-input"
                    value={riskForm.status}
                    onChange={e => setRiskForm({...riskForm, status: e.target.value})}
                  >
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setShowRiskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Log Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Confirm Delete Modals ─── */}
      <ConfirmModal 
        isOpen={!!phaseToDelete}
        onClose={() => setPhaseToDelete(null)}
        onConfirm={handleDeletePhase}
        title="Delete Phase"
        message={`Are you sure you want to delete the phase "${phaseToDelete?.name}"?`}
      />

      <ConfirmModal 
        isOpen={!!milestoneToDelete}
        onClose={() => setMilestoneToDelete(null)}
        onConfirm={handleDeleteMilestone}
        title="Delete Milestone"
        message={`Are you sure you want to delete the milestone "${milestoneToDelete?.name}"?`}
      />

      <ConfirmModal 
        isOpen={!!resourceToDelete}
        onClose={() => setResourceToDelete(null)}
        onConfirm={handleDeleteResource}
        title="Delete Resource Plan Item"
        message={`Are you sure you want to delete "${resourceToDelete?.name}" from your resource forecast?`}
      />

      <ConfirmModal 
        isOpen={!!riskToDelete}
        onClose={() => setRiskToDelete(null)}
        onConfirm={handleDeleteRisk}
        title="Delete Risk Log"
        message={`Are you sure you want to delete the risk log for "${riskToDelete?.name}"?`}
      />

    </div>
  );
}
