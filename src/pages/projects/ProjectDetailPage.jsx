import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, HasPermission } from '../../contexts/AuthContext';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { projectService, userService, labourService } from '../../services/api';
import { 
  FolderKanban, Users, ListTree, PieChart as PieChartIcon, 
  Plus, ChevronDown, ChevronRight, Edit2, Trash2, 
  Calendar, CheckCircle2, AlertCircle, Clock, MoreVertical,
  Activity, BarChart3, Wallet, Upload, Camera, UserCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Cell, PieChart, Pie 
} from 'recharts';
import ConfirmModal from '../../components/ui/ConfirmModal';
import './ProjectDetail.css';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { erpType, hasPermission } = useAuth();
  const isBuilder = erpType === 'BUILDER';
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjectDetail();
  }, [id]);

  const fetchProjectDetail = async () => {
    try {
      setLoading(true);
      const [pRes, tRes] = await Promise.all([
        isBuilder ? projectService.builderGetById(id) : (projectService.getById?.(id) || projectService.getAll().then(r => ({ data: { data: r.data?.data?.find(p => p.id === id) } }))),
        isBuilder ? projectService.builderGetTasks(id) : projectService.getTasks(id)
      ]);
      setProject(pRes.data?.data || pRes.data);
      setTasks(tRes.data?.data || tRes.data || []);
    } catch (err) {
      toast.error('Failed to load project details');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner spinner-lg"></div></div>;
  if (!project) return <div className="empty-state"><h3>Project not found</h3></div>;

  return (
    <PageWrapper
      title={project.name}
      subtitle={project.description || 'Project Control Center'}
      actions={
        <div className="flex gap-md">
          <button className="btn btn-secondary" onClick={() => navigate('/projects')}>Back</button>
          <HasPermission required="tasks.manage">
            <button className="btn btn-primary" onClick={() => { setSelectedParentId(null); setShowTaskModal(true); }}><Plus size={16} /> {t('add_task')}</button>
          </HasPermission>
        </div>
      }
    >
      <div className="labour-tab-bar" style={{ background: 'transparent' }}>
        <button className={`labour-tab ${activeTab === 'overview' ? 'act' : ''}`} onClick={() => setActiveTab('overview')}>{t('overview')}</button>
        <button className={`labour-tab ${activeTab === 'wbs' ? 'act' : ''}`} onClick={() => setActiveTab('wbs')}>{t('wbs_jobs')}</button>
        <button className={`labour-tab ${activeTab === 'team' ? 'act' : ''}`} onClick={() => setActiveTab('team')}>{t('team')}</button>
        <button className={`labour-tab ${activeTab === 'finance' ? 'act' : ''}`} onClick={() => setActiveTab('finance')}>{t('financials')}</button>
      </div>

      <div className="hub-content">
        {activeTab === 'overview' && <ProjectOverview project={project} tasks={tasks} />}
        {activeTab === 'wbs' && (
          <ProjectWBS 
            projectId={id} 
            isBuilder={isBuilder} 
            initialTasks={tasks} 
            onRefresh={fetchProjectDetail} 
            onAddTask={(pid) => { setSelectedParentId(pid); setShowTaskModal(true); }}
            onUpdateProgress={(task) => { setSelectedTask(task); setShowProgressModal(true); }}
            onEditTask={(task) => { setSelectedTask(task); setShowEditModal(true); }}
            hasPermission={hasPermission}
          />
        )}
        {activeTab === 'team' && <ProjectTeam project={project} onInvite={() => setShowMemberModal(true)} onRemoveMember={setMemberToRemove} />}
        {activeTab === 'finance' && <ProjectFinance project={project} />}
      </div>

      <ConfirmModal 
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={async () => {
          if (!memberToRemove) return;
          try {
            await projectService.removeMember(id, memberToRemove.userId);
            toast.success("Member removed from project");
            fetchProjectDetail();
          } catch (error) {
            toast.error("Failed to remove member");
          } finally {
            setMemberToRemove(null);
          }
        }}
        title="Remove Member"
        message={`Are you sure you want to remove this member from the project? They will no longer have access to it.`}
        confirmText="Remove"
      />

      {showProgressModal && selectedTask && (
        <ProgressUpdateModal 
          task={selectedTask} 
          onClose={() => { setShowProgressModal(false); setSelectedTask(null); }} 
          onRefresh={fetchProjectDetail} 
        />
      )}

      {showEditModal && selectedTask && (
        <EditTaskModal 
          task={selectedTask}
          isBuilder={isBuilder}
          onClose={() => { setShowEditModal(false); setSelectedTask(null); }} 
          onRefresh={fetchProjectDetail} 
        />
      )}

      {showTaskModal && (
        <TaskModal 
          projectId={id} 
          isBuilder={isBuilder} 
          parentId={selectedParentId} 
          allTasks={tasks}
          onClose={() => { setShowTaskModal(false); setSelectedParentId(null); }} 
          onRefresh={fetchProjectDetail} 
        />
      )}

      {showMemberModal && (
        <MemberModal 
          projectId={id} 
          onClose={() => setShowMemberModal(false)} 
          onRefresh={fetchProjectDetail} 
        />
      )}
    </PageWrapper>
  );
}

/* ─── Overview Tab ───────────────────────────────────────────────────────── */
function ProjectOverview({ project, tasks }) {
  // Calculate weighted progress from root tasks
  const calculatedProgress = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    const rootTasks = tasks.filter(t => !t.parentId);
    if (rootTasks.length === 0) return 0;
    const totalWeightedProgress = rootTasks.reduce((acc, t) => {
      return acc + ((t.progress || 0) * ((t.weightage || 0) / 100));
    }, 0);
    return Math.round(totalWeightedProgress);
  }, [tasks]);

  const latestProgress = project.progressUpdates?.[0]?.percentage || calculatedProgress;
  
  const statsData = [
    { name: 'Completed', value: tasks.filter(t => t.status === 'COMPLETED').length, color: '#10b981' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: '#3b82f6' },
    { name: 'Pending', value: tasks.filter(t => t.status === 'PENDING').length, color: '#64748b' },
  ].filter(d => d.value > 0);

  // Live stats from project data
  const workerCount = project.workers?.length || 0;
  const equipmentCount = project.equipment?.length || 0;
  const pendingPRs = project.procurementRequests?.filter(r => r.status === 'PENDING').length || 0;
  const totalInvoiced = project.invoices?.reduce((s, inv) => s + (inv.totalAmount || 0), 0) || 0;
  const totalProcurement = project.procurementRequests?.reduce((s, pr) => s + (pr.purchaseOrders?.reduce((pos, po) => pos + (po.totalAmount || 0), 0) || 0), 0) || 0;

  return (
    <div className="overview-grid">
      <div className="flex flex-col gap-xl">
        <div className="card progress-card">
          <h3 className="card-title" style={{ alignSelf: 'flex-start' }}>Project Progress</h3>
          <div className="gauge-container">
            <svg viewBox="0 0 100 50" width="100%" height="100%">
              <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="var(--bg-tertiary)" strokeWidth="6" strokeLinecap="round" />
              <path 
                d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="var(--accent-primary)" 
                strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(latestProgress / 100) * 125.6}, 125.6`}
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
              <text x="50" y="40" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-primary)">{latestProgress}%</text>
            </svg>
          </div>
          <p className="text-sm text-muted">Real-time average completion across {tasks.length} tasks</p>
        </div>

        {/* Quick Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="card-flat p-md text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>{workerCount}</div>
            <div className="text-xs text-muted">Workers</div>
          </div>
          <div className="card-flat p-md text-center">
            <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{equipmentCount}</div>
            <div className="text-xs text-muted">Equipment</div>
          </div>
          <div className="card-flat p-md text-center">
            <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{pendingPRs}</div>
            <div className="text-xs text-muted">Pending PRs</div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Recent Activity</h3>
          <div className="flex flex-col gap-md" style={{ marginTop: 'var(--space-md)' }}>
            {project.progressUpdates?.map((u) => (
              <div key={u.id} className="flex gap-md items-start p-sm border-b border-secondary">
                <div className="badge badge-blue mt-xs">{u.percentage}%</div>
                <div>
                  <p className="text-sm">{u.statusUpdate || 'Progress update recorded'}</p>
                  <span className="text-xs text-muted">{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {(!project.progressUpdates || project.progressUpdates.length === 0) && <p className="text-muted text-center py-md">No recent activity</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-xl">
        <div className="card">
          <h3 className="card-title">Financial Health</h3>
          <div className="financial-summary mt-md">
            <div className="summary-item info">
              <span className="text-muted text-sm">Allocated Budget</span>
              <span className="font-bold">₹{Number(project.budget || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item warning">
              <span className="text-muted text-sm">Total Invoiced</span>
              <span className="font-bold">₹{totalInvoiced.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-item success">
              <span className="text-muted text-sm">Procurement Cost</span>
              <span className="font-bold">₹{totalProcurement.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Task Distribution</h3>
          <div style={{ height: 200, width: '100%', marginTop: 'var(--space-md)' }}>
            {statsData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statsData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}>
                    {statsData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted text-center py-xl">No tasks defined yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── WBS Tab ────────────────────────────────────────────────────────────── */
function ProjectWBS({ projectId, isBuilder, initialTasks, onRefresh, onAddTask, onUpdateProgress, onEditTask, hasPermission }) {
  const [expanded, setExpanded] = useState({});
  const [taskToDelete, setTaskToDelete] = useState(null);
  const { t } = useTranslation();

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const toast = useToast();

  const handleDeleteTask = async (task) => {
    setTaskToDelete(task);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      if (isBuilder) await projectService.builderDeleteTask(taskToDelete.id);
      else await projectService.deleteTask(taskToDelete.id);
      toast.success('Task removed');
      setTaskToDelete(null);
      onRefresh();
    } catch { toast.error('Failed to remove task'); }
  };

  const renderTask = (task, depth = 0) => {
    const hasChildren = task.subTasks && task.subTasks.length > 0;
    const isExpanded = expanded[task.id];

    const isSubTask = depth > 0;

    return (
      <React.Fragment key={task.id}>
        <tr 
          className={`wbs-row cursor-pointer ${isSubTask ? 'wbs-subtask-row' : 'wbs-parent-row'}`} 
          onClick={() => hasChildren && toggleExpand(task.id)}
          style={isSubTask ? { background: 'var(--bg-secondary, #f8fafc)' } : { fontWeight: 600 }}
        >
          <td className="wbs-cell" style={{ width: '100px' }}>
            {isSubTask ? (
              <span style={{ color: 'var(--text-muted)', paddingLeft: '12px' }}>{task.wbsCode || '—'}</span>
            ) : (
              <span style={{ fontWeight: 700 }}>{task.wbsCode || '—'}</span>
            )}
          </td>
          <td className="wbs-cell">
            <div className="wbs-name-cell" style={{ paddingLeft: isSubTask ? `${depth * 28 + 8}px` : '0px' }}>
              {isSubTask && (
                <span style={{ color: 'var(--text-muted)', marginRight: '6px', fontSize: '12px' }}>└</span>
              )}
              {!isSubTask && (
                <div className="wbs-toggle" style={{ marginRight: '4px' }}>
                  {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div style={{ width: 14 }} />}
                </div>
              )}
              <div className="flex flex-col">
                <span className={isSubTask ? 'text-sm' : 'font-semibold'}>{task.name}</span>
                <span className="text-xs text-muted">
                  {task.startDate ? new Date(task.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'} 
                  {task.endDate ? ` to ${new Date(task.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                </span>
              </div>
              {task.isMilestone && <span className="milestone-tag" title="Payment Milestone"><CheckCircle2 size={12} fill="#ef4444" color="#fff" /></span>}
            </div>
          </td>
          <td className="wbs-cell" style={{ width: '120px' }}>
            <span className={`status-pill ${task.status === 'COMPLETED' ? 'p-nt' : task.status === 'IN_PROGRESS' ? 'p-ok' : 'p-in'}`}>
              {task.status}
            </span>
          </td>
          <td className="wbs-cell" style={{ width: '150px' }}>
            <div className="flex flex-col gap-xs">
              <div className="flex justify-between text-xs text-muted">
                <span className="flex items-center gap-xs">
                  {hasChildren ? <div title="Calculated from subtasks" className="flex items-center gap-xs text-accent"><BarChart3 size={10} /> Auto</div> : 'Progress'}
                </span>
                <span>{task.progress}%</span>
              </div>
              <div className="progressBar"><div className="progressFill" style={{ width: `${task.progress}%` }} /></div>
            </div>
          </td>
          <td className="wbs-cell" style={{ width: '80px' }}>{task.weightage}%</td>
          <td className="wbs-cell" style={{ width: '100px' }}>
            <div className="wbs-controls flex gap-xs" onClick={e => e.stopPropagation()}>
              {!isSubTask && hasPermission('tasks.manage') && <button className="btn btn-icon btn-ghost btn-xs" title="Add Subtask" onClick={() => onAddTask(task.id)}><Plus size={12} /></button>}
              {!hasChildren && hasPermission('tasks.manage') && (
                <button className="btn btn-icon btn-ghost btn-xs" title="Update Progress" onClick={() => onUpdateProgress(task)}><Activity size={12} /></button>
              )}
              {hasPermission('tasks.manage') && (
                <>
                  <button className="btn btn-icon btn-ghost btn-xs" title="Edit Task" onClick={() => onEditTask(task)}><Edit2 size={12} /></button>
                  <button className="btn btn-icon btn-ghost btn-xs text-danger" title="Delete Task" onClick={() => handleDeleteTask(task)}><Trash2 size={12} /></button>
                </>
              )}
            </div>
          </td>
        </tr>
        {isExpanded && task.subTasks.map(sub => renderTask(sub, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="card-flat" style={{ padding: 0 }}>
      <div className="chart-header p-md">
        <h3>{t('wbs_title')}</h3>
      </div>
      <div className="wbs-table-container">
        <table className="wbs-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>{t('wbs_code')}</th>
              <th style={{ minWidth: '300px' }}>{t('task_desc')}</th>
              <th style={{ width: '120px' }}>{t('status')}</th>
              <th style={{ width: '150px' }}>{t('progress')}</th>
              <th style={{ width: '80px' }}>{t('weight')}</th>
              <th style={{ width: '100px' }}></th>
            </tr>
          </thead>
          <tbody>
            {initialTasks.map(task => renderTask(task))}
            {initialTasks.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted py-2xl">{t('no_tasks')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!taskToDelete}
        title="Delete Task"
        message={taskToDelete?.subTasks?.length > 0 
          ? `This task has ${taskToDelete.subTasks.length} sub-tasks. Deleting it will remove ALL of them. Continue?` 
          : `Are you sure you want to delete "${taskToDelete?.name}"?`}
        onConfirm={confirmDeleteTask}
        onClose={() => setTaskToDelete(null)}
        type="danger"
      />
    </div>
  );
}

function TaskModal({ projectId, isBuilder, parentId, allTasks, onClose, onRefresh }) {
  // Auto-increment logic
  const getNextWBSCode = () => {
    if (parentId) {
      const parent = allTasks.find(t => String(t.id) === String(parentId));
      if (!parent) return '01-01';
      const siblingCount = (parent.subTasks || []).length;
      return `${parent.wbsCode}-${String(siblingCount + 1).padStart(2, '0')}`;
    }
    const rootCount = allTasks.filter(t => !t.parentId).length;
    return String(rootCount + 1).padStart(2, '0');
  };

  const [form, setForm] = useState({ 
    name: '', description: '', 
    wbsCode: getNextWBSCode(), 
    weightage: 0, 
    isMilestone: false, milestoneTriggerValue: 100,
    startDate: '', endDate: '', imageUrl: '',
    assignedTo: ''
  });
  const [subTasks, setSubTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const toast = useToast();

  // Load workers/supervisors + management team for this project
  useEffect(() => {
    const loadPeople = async () => {
      try {
        const [workerRes, userRes] = await Promise.all([
          labourService.getWorkers({ projectId: projectId }).catch(() => ({ data: { data: [] } })),
          userService.getAll().catch(() => ({ data: { data: [] } }))
        ]);
        setWorkers(workerRes.data?.data || []);
        setTeamMembers(userRes.data?.data || []);
      } catch { setWorkers([]); setTeamMembers([]); }
    };
    loadPeople();
  }, [projectId]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.warning('Photo must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotoPreview(evt.target.result);
      setForm(f => ({ ...f, imageUrl: evt.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const addSubTaskRow = () => {
    const nextCode = `${form.wbsCode}-${String(subTasks.length + 1).padStart(2, '0')}`;
    setSubTasks([...subTasks, { name: '', wbsCode: nextCode }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.warning('Name is required');
    try {
      setSubmitting(true);
      // Create main task
      const mainRes = await (isBuilder 
        ? projectService.builderCreateTask(projectId, { ...form, parentId }) 
        : projectService.createTask(projectId, { ...form, parentId }));
      
      const newMainId = mainRes.data?.data?.id || mainRes.data?.id;

      // Create subtasks if any
      if (subTasks.length > 0 && newMainId) {
        for (const sub of subTasks) {
          if (sub.name) {
            await (isBuilder 
              ? projectService.builderCreateTask(projectId, { ...sub, parentId: newMainId })
              : projectService.createTask(projectId, { ...sub, parentId: newMainId }));
          }
        }
      }

      toast.success('Tasks added');
      onRefresh();
      onClose();
    } catch { toast.error('Failed to add tasks'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>{parentId ? 'Add Sub-tasks' : 'New Main Task'}</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-lg" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="flex gap-md">
              <div className="form-group" style={{ width: '100px' }}><label className="form-label">Sr. No.</label><input className="form-input" value={form.wbsCode} readOnly style={{ background: 'var(--bg-tertiary)', fontWeight: 700, textAlign: 'center' }} /></div>
              <div className="form-group flex-1"><label className="form-label">{t('task_name')} *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></div>
            </div>

            {/* Dynamic Sub-tasks Section */}
            {!parentId && (
              <div className="bg-tertiary p-md radius-md border border-secondary">
                <div className="flex justify-between items-center mb-md">
                  <span className="text-sm font-bold">Sub-tasks for this work</span>
                  <button type="button" className="btn btn-secondary btn-xs" onClick={addSubTaskRow}><Plus size={12} /> Add Sub-task</button>
                </div>
                <div className="flex flex-col gap-sm">
                  {subTasks.map((sub, idx) => (
                    <div key={idx} className="flex gap-sm items-center">
                      <input className="form-input flex-1" placeholder="Sub-task name (e.g. Pillers)" value={sub.name} onChange={e => {
                        const newSubs = [...subTasks];
                        newSubs[idx].name = e.target.value;
                        setSubTasks(newSubs);
                      }} />
                      <input className="form-input" style={{ width: '80px' }} value={sub.wbsCode} readOnly />
                      <button type="button" className="btn btn-icon btn-ghost btn-xs text-danger" onClick={() => {
                        const newSubs = subTasks.filter((_, i) => i !== idx).map((s, i) => ({ ...s, wbsCode: `${form.wbsCode}-${String(i + 1).padStart(2, '0')}` }));
                        setSubTasks(newSubs);
                      }} title="Remove"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{t('weight')} (%)</label>
              <input type="number" className="form-input" value={form.weightage} onChange={e => setForm({...form, weightage: Number(e.target.value)})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">{t('start_date')}</label><input type="date" className="form-input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">{t('end_date')}</label><input type="date" className="form-input" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} /></div>
            </div>

            {/* Assign Responsible Person */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCheck size={14} /> Assign Responsible Person
              </label>
              <select className="form-input" value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}>
                <option value="">— Not Assigned —</option>
                {teamMembers.length > 0 && (
                  <optgroup label="💼 Management Team">
                    {teamMembers.map(u => (
                      <option key={`user-${u.id}`} value={`user-${u.id}`}>
                        {u.firstName} {u.lastName} ({u.role || 'Manager'})
                      </option>
                    ))}
                  </optgroup>
                )}
                {workers.filter(w => w.status === 'ACTIVE').length > 0 && (
                  <optgroup label="👷 Site Workers">
                    {workers.filter(w => w.status === 'ACTIVE').map(w => (
                      <option key={`worker-${w.id}`} value={`worker-${w.id}`}>
                        {w.firstName} {w.lastName} ({w.role})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {workers.length === 0 && teamMembers.length === 0 && (
                <span style={{ fontSize: 10, color: '#f59e0b', marginTop: 4, display: 'block' }}>No team members or workers found. Invite members or add workers first.</span>
              )}
            </div>

            {/* Site Photo Upload */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={14} /> Site Photo (Optional)
              </label>
              <div style={{ 
                border: '2px dashed var(--border-secondary)', borderRadius: 8, padding: 16, 
                textAlign: 'center', cursor: 'pointer', position: 'relative',
                background: photoPreview ? 'transparent' : 'var(--bg-tertiary)'
              }}>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} 
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ maxHeight: 120, borderRadius: 6, objectFit: 'cover' }} />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    <Upload size={20} style={{ marginBottom: 4 }} /><br/>
                    Click or drag to upload site photo
                  </div>
                )}
              </div>
            </div>

            <div className="form-group"><label className="form-label">{t('description')}</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            
            <div className="flex items-center gap-md p-md bg-tertiary radius-md">
              <input 
                type="checkbox" 
                id="isMilestone"
                checked={form.isMilestone} 
                onChange={e => setForm({...form, isMilestone: e.target.checked})} 
              />
              <label htmlFor="isMilestone" className="form-label mb-0 cursor-pointer">{t('payment_milestone')}</label>
              {form.isMilestone && (
                <div className="flex items-center gap-sm ml-auto">
                  <span className="text-xs text-muted">{t('trigger_at')}</span>
                  <input 
                    type="number" 
                    className="form-input py-xs" 
                    style={{ width: '60px' }} 
                    value={form.milestoneTriggerValue} 
                    onChange={e => setForm({...form, milestoneTriggerValue: Number(e.target.value)})} 
                  />
                  <span className="text-xs text-muted">%</span>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? t('inviting') : t('add_task')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Project Team ────────────────────────────────────────────────────────── */
function ProjectTeam({ project, onInvite, onRemoveMember }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-xl">
      <div className="card">
        <div className="flex justify-between items-center mb-md">
          <h3 className="card-title">Management Team</h3>
          <button className="btn btn-primary btn-sm" onClick={onInvite}><Plus size={14} /> {t('invite_member')}</button>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {project.members?.map(m => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="member-avatar" style={{width: 32, height: 32, fontSize: 12}}>{m.user?.firstName?.[0]}{m.user?.lastName?.[0]}</div>
                      <span className="font-semibold">{m.user?.firstName} {m.user?.lastName}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-purple">{m.role}</span></td>
                  <td><span className="badge badge-green">Active</span></td>
                  <td>
                    <button className="btn btn-icon btn-ghost text-danger" onClick={() => onRemoveMember(m)} title="Remove Member"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
              {(!project.members || project.members.length === 0) && (
                <tr><td colSpan={4} className="text-center text-muted py-xl border-dashed border-2">No team members assigned.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-md">
          <h3 className="card-title">Site Workforce (Labour)</h3>
          <span className="text-xs badge badge-blue">{project.workers?.length || 0} Workers</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Trade/Role</th><th>Daily Wage</th><th>Status</th></tr>
            </thead>
            <tbody>
              {project.workers?.map(w => (
                <tr key={w.id}>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="member-avatar" style={{width: 32, height: 32, fontSize: 12, background: 'var(--bg-tertiary)', color: 'var(--text-primary)'}}>{w.firstName?.[0]}{w.lastName?.[0]}</div>
                      <span className="font-semibold">{w.firstName} {w.lastName}</span>
                    </div>
                  </td>
                  <td>{w.role}</td>
                  <td>₹{w.dailyWage}/day</td>
                  <td><span className={`badge ${w.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>{w.status}</span></td>
                </tr>
              ))}
              {(!project.workers || project.workers.length === 0) && (
                <tr><td colSpan={4} className="text-center text-muted py-xl border-dashed border-2">No workers assigned. Add workers from the Labour module.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-md">
          <h3 className="card-title">Equipment on Site</h3>
          <span className="text-xs badge badge-blue">{project.equipment?.length || 0} Machines</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Equipment Name</th><th>Type</th><th>Ownership</th><th>Status</th></tr>
            </thead>
            <tbody>
              {project.equipment?.map(eq => (
                <tr key={eq.id}>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="member-avatar" style={{width: 32, height: 32, fontSize: 14, background: '#f59e0b20', color: '#f59e0b'}}>⚙</div>
                      <span className="font-semibold">{eq.name}</span>
                    </div>
                  </td>
                  <td>{eq.type}</td>
                  <td><span className="badge badge-purple">{eq.ownership}</span></td>
                  <td><div className={`status-pill text-xs ${eq.status === 'OPERATIONAL' ? 'p-ok' : eq.status === 'MAINTENANCE' ? 'p-in' : 'p-nt'}`}>{eq.status}</div></td>
                </tr>
              ))}
              {(!project.equipment || project.equipment.length === 0) && (
                <tr><td colSpan={4} className="text-center text-muted py-xl border-dashed border-2">No equipment assigned. Add equipment from the Equipment module.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Member Modal ───────────────────────────────────────────────────────── */
function MemberModal({ projectId, onClose, onRefresh }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ userId: '', role: 'Site Engineer' });
  const { t } = useTranslation();
  const toast = useToast();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await userService.getAll();
        setUsers(data.data || []);
      } catch (err) { 
        toast.error(err.response?.data?.message || 'Failed to load users'); 
      }
      finally { setLoading(false); }
    };
    loadUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId) return toast.warning('Please select a user');
    try {
      setSubmitting(true);
      await projectService.addMember(projectId, form);
      toast.success('Member invited successfully');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Invite Team Member</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-lg">
            <div className="form-group">
              <label className="form-label">Select User</label>
              {loading ? (
                <div className="text-sm text-muted">Loading users...</div>
              ) : (
                <select 
                  className="form-input" 
                  value={form.userId} 
                  onChange={e => setForm({...form, userId: e.target.value})}
                  required
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Project Role</label>
              <select 
                className="form-input" 
                value={form.role} 
                onChange={e => setForm({...form, role: e.target.value})}
              >
                <option value="Project Manager">Project Manager</option>
                <option value="Site Engineer">Site Engineer</option>
                <option value="Architect">Architect</option>
                <option value="Quantity Surveyor">Quantity Surveyor</option>
                <option value="Supervisor">Supervisor</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
              {submitting ? t('inviting') : t('invite_member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Progress Update Modal ──────────────────────────────────────────────── */
function ProgressUpdateModal({ task, onClose, onRefresh }) {
  const [form, setForm] = useState({ 
    progress: task.progress || 0, 
    status: task.status || 'PENDING',
    imageUrl: task.imageUrl || '',
    remark: ''
  });
  const [photoPreview, setPhotoPreview] = useState(task.imageUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.warning('Photo must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotoPreview(evt.target.result);
      setForm(f => ({ ...f, imageUrl: evt.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await projectService.updateTask(task.id, form);
      toast.success('Progress updated');
      onRefresh();
      onClose();
    } catch { toast.error('Failed to update progress'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3>Update Progress: {task.name}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-lg">
            <div className="form-group">
              <label className="form-label">Completion (%)</label>
              <div className="flex items-center gap-md">
                <input 
                  type="range" min="0" max="100" className="flex-1"
                  value={form.progress} 
                  onChange={e => setForm({...form, progress: Number(e.target.value)})} 
                />
                <span className="font-bold w-12 text-right">{form.progress}%</span>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Status</label>
              <select 
                className="form-input" 
                value={form.status} 
                onChange={e => setForm({...form, status: e.target.value})}
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Photo Proof Upload */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={14} /> Upload Site Photo (Proof)
              </label>
              <div style={{ 
                border: '2px dashed var(--border-secondary)', borderRadius: 8, padding: 16, 
                textAlign: 'center', cursor: 'pointer', position: 'relative',
                background: photoPreview ? 'transparent' : 'var(--bg-tertiary)'
              }}>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} 
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                {photoPreview ? (
                  <img src={photoPreview} alt="Site proof" style={{ maxHeight: 140, borderRadius: 6, objectFit: 'cover', width: '100%' }} />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    <Upload size={24} style={{ marginBottom: 6 }} /><br/>
                    📸 Click to upload today's site photo as proof
                  </div>
                )}
              </div>
              {photoPreview && (
                <button type="button" className="btn btn-ghost btn-xs text-danger" style={{ marginTop: 4 }}
                  onClick={() => { setPhotoPreview(null); setForm(f => ({...f, imageUrl: ''})); }}>
                  Remove photo
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Daily Remark / Update</label>
              <textarea 
                className="form-input" rows={3} placeholder="Describe work done today..."
                value={form.remark} 
                onChange={e => setForm({...form, remark: e.target.value})} 
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Save Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Edit Task Modal ────────────────────────────────────────────────────── */
function EditTaskModal({ task, isBuilder, onClose, onRefresh }) {
  const [form, setForm] = useState({
    name: task.name || '',
    description: task.description || '',
    wbsCode: task.wbsCode || '',
    weightage: task.weightage || 0,
    startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
    endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
    imageUrl: task.imageUrl || '',
    isMilestone: task.isMilestone || false,
    milestoneTriggerValue: task.milestoneTriggerValue || 100,
  });
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.warning('Name is required');
    try {
      setSubmitting(true);
      if (isBuilder) await projectService.builderUpdateTask(task.id, form);
      else await projectService.updateTask(task.id, form);
      toast.success('Task updated');
      onRefresh();
      onClose();
    } catch { toast.error('Failed to update task'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Edit Task: {task.wbsCode}</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-lg" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="flex gap-md">
              <div className="form-group" style={{ width: '100px' }}><label className="form-label">Sr. No.</label><input className="form-input" value={form.wbsCode} readOnly style={{ background: 'var(--bg-tertiary)', fontWeight: 700, textAlign: 'center' }} /></div>
              <div className="form-group flex-1"><label className="form-label">{t('task_name')} *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('weight')} (%)</label>
              <input type="number" className="form-input" value={form.weightage} onChange={e => setForm({...form, weightage: Number(e.target.value)})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">{t('start_date')}</label><input type="date" className="form-input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">{t('end_date')}</label><input type="date" className="form-input" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} /></div>
            </div>

            <div className="form-group"><label className="form-label">{t('photo_url')}</label><input className="form-input" placeholder="https://..." value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} /></div>
            {form.imageUrl && (
              <div className="radius-md overflow-hidden border border-secondary" style={{ maxHeight: '120px' }}>
                <img src={form.imageUrl} alt="Site photo" style={{ width: '100%', height: '120px', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
              </div>
            )}
            <div className="form-group"><label className="form-label">{t('description')}</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>

            <div className="flex items-center gap-md p-md bg-tertiary radius-md">
              <input type="checkbox" id="editMilestone" checked={form.isMilestone} onChange={e => setForm({...form, isMilestone: e.target.checked})} />
              <label htmlFor="editMilestone" className="form-label mb-0 cursor-pointer">{t('payment_milestone')}</label>
              {form.isMilestone && (
                <div className="flex items-center gap-sm ml-auto">
                  <span className="text-xs text-muted">{t('trigger_at')}</span>
                  <input type="number" className="form-input py-xs" style={{ width: '60px' }} value={form.milestoneTriggerValue} onChange={e => setForm({...form, milestoneTriggerValue: Number(e.target.value)})} />
                  <span className="text-xs text-muted">%</span>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectFinance({ project }) {
  const [fin, setFin] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (project?.id) {
      setLoading(true);
      projectService.getFinancials(project.id)
        .then(res => setFin(res.data?.data || null))
        .catch(() => setFin(null))
        .finally(() => setLoading(false));
    }
  }, [project?.id]);

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  if (loading) return <div className="page-loader"><div className="spinner spinner-lg"></div></div>;

  // Fallback to basic view if API not available
  if (!fin) {
    const invoices = project.invoices || [];
    const totalBudget = project.budget || 0;
    const totalInvoiced = invoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
    return (
      <div className="card-flat p-lg">
        <h3>Budget: {fmt(totalBudget)}</h3>
        <p>Invoiced: {fmt(totalInvoiced)}</p>
      </div>
    );
  }

  const cats = fin.categories || {};
  const totalEquip = (cats.equipmentRental || 0) + (cats.equipmentFuel || 0) + (cats.equipmentMaintenance || 0);
  const budget = fin.budget || 0;

  const expenseCategories = [
    { label: '👷 Labour Wages', value: cats.labour || 0, color: '#3b82f6' },
    { label: '🔧 Equipment Rental', value: cats.equipmentRental || 0, color: '#f59e0b' },
    { label: '⛽ Equipment Fuel', value: cats.equipmentFuel || 0, color: '#ef4444' },
    { label: '🔩 Equipment Maintenance', value: cats.equipmentMaintenance || 0, color: '#8b5cf6' },
    { label: '📦 Material / Vendors', value: cats.material || 0, color: '#10b981' },
    { label: '📋 Sub-Contracts', value: cats.contracts || 0, color: '#ec4899' },
  ].filter(c => c.value > 0);

  return (
    <div className="flex flex-col gap-xl">
      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-lg)' }}>
        <div className="card-flat p-lg">
          <div className="text-xs text-muted uppercase tracking-wider mb-sm">Budget</div>
          <div className="text-xl font-bold">{fmt(budget)}</div>
        </div>
        <div className="card-flat p-lg">
          <div className="text-xs text-muted uppercase tracking-wider mb-sm">Total Expenses</div>
          <div className="text-xl font-bold" style={{ color: '#ef4444' }}>{fmt(fin.totalExpenses)}</div>
        </div>
        <div className="card-flat p-lg">
          <div className="text-xs text-muted uppercase tracking-wider mb-sm">Income Collected</div>
          <div className="text-xl font-bold" style={{ color: '#10b981' }}>{fmt(fin.income?.collected)}</div>
        </div>
        <div className="card-flat p-lg">
          <div className="text-xs text-muted uppercase tracking-wider mb-sm">{fin.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</div>
          <div className="text-xl font-bold" style={{ color: fin.netProfit >= 0 ? '#10b981' : '#ef4444' }}>{fmt(Math.abs(fin.netProfit))}</div>
        </div>
      </div>

      {/* Extra metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)' }}>
        <div className="card-flat p-lg" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div className="text-xs text-muted uppercase mb-sm">Budget Utilization</div>
          <div className="text-lg font-bold" style={{ color: fin.budgetUtilization > 90 ? '#ef4444' : '#f59e0b' }}>{fin.budgetUtilization}%</div>
          <div className="progressBar" style={{ height: 6, borderRadius: 3, marginTop: 8 }}>
            <div className="progressFill" style={{ width: `${Math.min(fin.budgetUtilization, 100)}%`, background: fin.budgetUtilization > 90 ? '#ef4444' : 'var(--accent-primary)' }} />
          </div>
        </div>
        <div className="card-flat p-lg" style={{ borderLeft: '3px solid #3b82f6' }}>
          <div className="text-xs text-muted uppercase mb-sm">Outstanding Receivables</div>
          <div className="text-lg font-bold" style={{ color: '#3b82f6' }}>{fmt(fin.income?.due)}</div>
        </div>
        {fin.costPerSqFt && (
          <div className="card-flat p-lg" style={{ borderLeft: '3px solid #8b5cf6' }}>
            <div className="text-xs text-muted uppercase mb-sm">Cost per Sq.Ft</div>
            <div className="text-lg font-bold" style={{ color: '#8b5cf6' }}>{fmt(fin.costPerSqFt)}</div>
            <div className="text-xs text-muted">Area: {fin.area?.toLocaleString('en-IN')} sq.ft</div>
          </div>
        )}
      </div>

      {/* Category-wise Expense Breakdown */}
      <div className="card-flat" style={{ padding: 0 }}>
        <div className="chart-header p-md" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
          <h3>Expense Breakdown by Category</h3>
        </div>
        <div style={{ padding: 'var(--space-lg)' }}>
          {expenseCategories.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {expenseCategories.map((cat, i) => {
                const pct = fin.totalExpenses > 0 ? (cat.value / fin.totalExpenses) * 100 : 0;
                const budgetPct = budget > 0 ? (cat.value / budget) * 100 : 0;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 100px 60px', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.label}</span>
                    <div className="progressBar" style={{ height: 10, borderRadius: 5 }}>
                      <div className="progressFill" style={{ width: `${Math.min(budgetPct, 100)}%`, background: cat.color, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{fmt(cat.value)}</span>
                    <span className="text-xs text-muted" style={{ textAlign: 'right' }}>{Math.round(pct)}%</span>
                  </div>
                );
              })}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 100px 60px', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border-secondary)', paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Total Expenses</span>
                <div />
                <span style={{ fontSize: 14, fontWeight: 700, textAlign: 'right', color: '#ef4444' }}>{fmt(fin.totalExpenses)}</span>
                <span className="text-xs text-muted" style={{ textAlign: 'right' }}>100%</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>No expenses recorded yet</div>
          )}
        </div>
      </div>

      {/* Burn Rate Chart + Projected Cost */}
      {fin.burnRate && fin.burnRate.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)' }}>
          <div className="card-flat" style={{ padding: 0 }}>
            <div className="chart-header p-md" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
              <h3>Monthly Burn Rate</h3>
            </div>
            <div style={{ padding: 'var(--space-md)', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fin.burnRate} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 100000 ? `${(v/100000).toFixed(0)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                  <Bar dataKey="labour" name="Labour" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="fuel" name="Fuel" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Projected Final Cost */}
          <div className="card-flat p-lg" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
            <div className="text-xs text-muted uppercase tracking-wider">Projected Final Cost</div>
            {(() => {
              const completionPct = project.progress || project.completionPercentage || 0;
              const projected = completionPct > 5 ? Math.round(fin.totalExpenses / (completionPct / 100)) : null;
              const overBudget = projected && budget > 0 ? projected - budget : null;
              return projected ? (
                <>
                  <div className="text-xl font-bold" style={{ color: overBudget > 0 ? '#ef4444' : '#10b981' }}>
                    {fmt(projected)}
                  </div>
                  <div className="text-xs text-muted">Based on {completionPct}% completion</div>
                  {overBudget > 0 && (
                    <div style={{ padding: '6px 10px', background: '#fef2f2', borderRadius: 6, color: '#dc2626', fontSize: 12, fontWeight: 500 }}>
                      ⚠ Over budget by {fmt(overBudget)}
                    </div>
                  )}
                  {overBudget !== null && overBudget <= 0 && (
                    <div style={{ padding: '6px 10px', background: '#ecfdf5', borderRadius: 6, color: '#065f46', fontSize: 12, fontWeight: 500 }}>
                      ✓ Within budget ({fmt(Math.abs(overBudget))} margin)
                    </div>
                  )}
                  <div className="progressBar" style={{ height: 6, borderRadius: 3 }}>
                    <div className="progressFill" style={{ width: `${completionPct}%`, background: '#3b82f6' }} />
                  </div>
                  <div className="text-xs text-muted">{completionPct}% complete</div>
                </>
              ) : (
                <div className="text-sm text-muted">Need at least 5% project completion to project costs</div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Vendor-wise Breakdown */}
      {fin.vendorBreakdown && Object.keys(fin.vendorBreakdown).length > 0 && (
        <div className="card-flat" style={{ padding: 0 }}>
          <div className="chart-header p-md" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
            <h3>Vendor-wise Material Cost</h3>
          </div>
          <table className="wbs-table">
            <thead><tr><th>Vendor</th><th style={{ textAlign: 'right' }}>Amount Paid</th></tr></thead>
            <tbody>
              {Object.entries(fin.vendorBreakdown).map(([vendor, amount], i) => (
                <tr key={i} className="wbs-row">
                  <td className="wbs-cell font-medium">{vendor}</td>
                  <td className="wbs-cell" style={{ textAlign: 'right', color: '#10b981' }}>{fmt(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Equipment Deployments */}
      {fin.equipmentDeployments && fin.equipmentDeployments.length > 0 && (
        <div className="card-flat" style={{ padding: 0 }}>
          <div className="chart-header p-md" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
            <h3>Equipment Deployed</h3>
          </div>
          <table className="wbs-table">
            <thead><tr><th>Equipment</th><th>Type</th><th>Start</th><th>End</th><th>Rate/Day</th><th>Status</th></tr></thead>
            <tbody>
              {fin.equipmentDeployments.map((dep, i) => (
                <tr key={i} className="wbs-row">
                  <td className="wbs-cell font-medium">{dep.equipmentName}</td>
                  <td className="wbs-cell">{dep.equipmentType}</td>
                  <td className="wbs-cell text-xs">{new Date(dep.startDate).toLocaleDateString('en-IN')}</td>
                  <td className="wbs-cell text-xs">{dep.endDate ? new Date(dep.endDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="wbs-cell">{fmt(dep.dailyRate)}</td>
                  <td className="wbs-cell"><span className={`status-pill ${dep.status === 'ACTIVE' ? 'p-ok' : 'p-nt'}`}>{dep.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoices (existing) */}
      <div className="card-flat" style={{ padding: 0 }}>
        <div className="chart-header p-md" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
          <h3>Invoices ({(project.invoices || []).length})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="wbs-table">
            <thead><tr><th>Invoice #</th><th>Client</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {(project.invoices || []).map(inv => (
                <tr key={inv.id} className="wbs-row">
                  <td className="wbs-cell font-medium">{inv.invoiceNumber}</td>
                  <td className="wbs-cell">{inv.clientName}</td>
                  <td className="wbs-cell">{fmt(inv.totalAmount)}</td>
                  <td className="wbs-cell" style={{ color: '#10b981' }}>{fmt(inv.paidAmount)}</td>
                  <td className="wbs-cell" style={{ color: '#ef4444' }}>{fmt(inv.dueAmount)}</td>
                  <td className="wbs-cell"><span className={`status-pill ${inv.status === 'PAID' ? 'p-ok' : inv.status === 'DRAFT' ? 'p-in' : 'p-nt'}`}>{inv.status}</span></td>
                </tr>
              ))}
              {(project.invoices || []).length === 0 && <tr><td colSpan={6} className="wbs-cell text-center text-muted py-xl">No invoices created yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
