import React, { useState, useEffect, useMemo } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { projectService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { ClipboardList, CheckCircle2, AlertCircle, Edit2, Check, X, RefreshCw, Camera, Eye } from 'lucide-react';
import CompletionProofModal from '../../components/project/CompletionProofModal';
import CompletionProofViewModal from '../../components/project/CompletionProofViewModal';
import ModalErrorBoundary from '../../components/project/ModalErrorBoundary';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editProgress, setEditProgress] = useState(0);
  const [taskPendingProof, setTaskPendingProof] = useState(null);
  const [viewProofTask, setViewProofTask] = useState(null);
  const toast = useToast();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await projectService.myTasks();
      setTasks(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load your assigned tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStartEdit = (task) => {
    setEditingTaskId(task.id);
    setEditProgress(task.progress);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
  };

  const handleSaveProgress = async (task) => {
    if (editProgress === 100) {
      setTaskPendingProof(task);
      return;
    }

    try {
      let nextStatus = 'IN_PROGRESS';
      if (editProgress === 0) nextStatus = 'PENDING';

      await projectService.updateTask(task.id, {
        progress: editProgress,
        status: nextStatus
      });
      
      toast.success('Task progress updated successfully');
      setEditingTaskId(null);
      fetchTasks();
    } catch (err) {
      toast.error('Failed to update task progress');
    }
  };

  const handleConfirmCompletion = async (proofData) => {
    if (!taskPendingProof) return;
    try {
      const targetProgress = proofData.progress !== undefined ? proofData.progress : 100;
      await projectService.updateTask(taskPendingProof.id, {
        progress: targetProgress,
        status: proofData.status || (targetProgress === 100 ? 'COMPLETED' : targetProgress > 0 ? 'IN_PROGRESS' : 'PENDING'),
        completionNotes: proofData.completionNotes || undefined,
        completionImageUrl: proofData.completionImageUrl || undefined,
        imageUrl: proofData.completionImageUrl || undefined,
        completionImages: proofData.completionImages || undefined
      });
      toast.success(`Task progress updated to ${targetProgress}% with site proof!`);
      setTaskPendingProof(null);
      setEditingTaskId(null);
      fetchTasks();
    } catch (err) {
      console.error('Completion error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save completion proof');
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'PENDING').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    return { total, pending, inProgress, completed };
  }, [tasks]);

  return (
    <PageWrapper
      title="My Assigned Tasks"
      subtitle="Track and update progress of WBS jobs assigned to you"
      actions={
        <button className="btn btn-secondary flex items-center gap-xs" onClick={fetchTasks}>
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {/* Stats Cards */}
      <div className="overview-grid mb-xl" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="card text-center" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="text-xs text-muted font-semibold uppercase tracking-wider">Total Tasks</span>
          <span className="text-3xl font-bold text-slate-800">{stats.total}</span>
        </div>
        <div className="card text-center" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="text-xs text-muted font-semibold uppercase tracking-wider">Pending</span>
          <span className="text-3xl font-bold" style={{ color: '#64748b' }}>{stats.pending}</span>
        </div>
        <div className="card text-center" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="text-xs text-muted font-semibold uppercase tracking-wider">In Progress</span>
          <span className="text-3xl font-bold" style={{ color: '#2563eb' }}>{stats.inProgress}</span>
        </div>
        <div className="card text-center" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span className="text-xs text-muted font-semibold uppercase tracking-wider">Completed</span>
          <span className="text-3xl font-bold" style={{ color: '#10b981' }}>{stats.completed}</span>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex justify-center items-center py-2xl" style={{ minHeight: '200px' }}>
            <div className="spinner"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-2xl text-center" style={{ padding: '60px 24px' }}>
            <ClipboardList size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
            <h3 className="font-bold text-lg mb-xs">No Tasks Assigned</h3>
            <p className="text-muted text-sm">You do not have any active project tasks assigned to you.</p>
          </div>
        ) : (
          <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Project</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>WBS Code</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Task Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Due Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Progress</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600' }}>{task.project?.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{task.wbsCode || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{task.name}</span>
                        {task.description && <span className="text-xs text-muted" style={{ marginTop: '2px' }}>{task.description}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`status-pill ${task.status === 'COMPLETED' ? 'p-nt' : task.status === 'IN_PROGRESS' ? 'p-ok' : 'p-in'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                      {task.endDate ? new Date(task.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: '160px' }}>
                      {editingTaskId === task.id ? (
                        <div className="flex items-center gap-sm">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5" 
                            value={editProgress} 
                            onChange={(e) => setEditProgress(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                          />
                          <span className="text-xs font-bold" style={{ minWidth: '32px', textAlign: 'right' }}>{editProgress}%</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-xs">
                          <div className="flex justify-between text-xs text-muted">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="progressBar" style={{ background: 'var(--bg-tertiary)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div className="progressFill" style={{ width: `${task.progress}%`, height: '100%', background: 'var(--accent-primary)' }} />
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {editingTaskId === task.id ? (
                        <div className="flex justify-center gap-xs">
                          <button 
                            className="btn btn-icon btn-ghost btn-sm text-success" 
                            onClick={() => handleSaveProgress(task)}
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            className="btn btn-icon btn-ghost btn-sm text-danger" 
                            onClick={handleCancelEdit}
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-xs">
                          {(task.completionImageUrl || task.imageUrl || (task.proofHistory && task.proofHistory.length > 0)) && (
                            <button 
                              className="btn btn-icon btn-ghost btn-sm text-purple" 
                              onClick={() => setViewProofTask(task)}
                              title="View Uploaded Site Photo Proofs"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <button 
                            className="btn btn-icon btn-ghost btn-sm text-accent" 
                            onClick={() => setTaskPendingProof(task)}
                            title="Update Progress & Upload Site Proof"
                          >
                            <Camera size={14} />
                          </button>
                          <button 
                            className="btn btn-icon btn-ghost btn-sm" 
                            onClick={() => handleStartEdit(task)}
                            title="Quick Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {taskPendingProof && (
        <CompletionProofModal
          taskName={taskPendingProof.name}
          initialProgress={taskPendingProof.progress || 100}
          initialNotes={taskPendingProof.completionNotes || ''}
          initialImageUrl={taskPendingProof.completionImageUrl || taskPendingProof.imageUrl || ''}
          onClose={() => setTaskPendingProof(null)}
          onSubmit={handleConfirmCompletion}
        />
      )}

      {viewProofTask && (
        <ModalErrorBoundary onClose={() => setViewProofTask(null)}>
          <CompletionProofViewModal
            taskId={viewProofTask.id}
            taskName={viewProofTask.name}
            notes={viewProofTask.completionNotes || viewProofTask.description}
            imageUrl={viewProofTask.completionImageUrl || viewProofTask.imageUrl}
            onClose={() => setViewProofTask(null)}
            onRefresh={fetchTasks}
          />
        </ModalErrorBoundary>
      )}
    </PageWrapper>
  );
}
