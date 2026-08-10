import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { projectService } from '../../services/api';
import {
  Plus, Search, LayoutGrid, List, MoreVertical,
  MapPin, Calendar, IndianRupee, Users, Eye, Edit2, Trash2, Loader, FolderKanban
} from 'lucide-react';
import './Projects.css';
import ConfirmModal from '../../components/ui/ConfirmModal';

const statusConfig = {
  PLANNED: { badge: 'p-in', label: 'Planned' },
  IN_PROGRESS: { badge: 'p-ok', label: 'In Progress' },
  COMPLETED: { badge: 'p-nt', label: 'Completed' },
  ON_HOLD: { badge: 'p-wn', label: 'On Hold' },
};

const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function ProjectListPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { erpType } = useAuth();
  const navigate = useNavigate();
  const [deleteConfig, setDeleteConfig] = useState({ show: false, projectId: null });
  const toast = useToast();

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const svc = erpType === 'BUILDER' ? projectService.builderGetAll : projectService.getAll;
      const res = await svc();
      const data = res.data?.data || res.data || [];
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load projects: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeleteConfig({ show: true, projectId: id });
  };

  const confirmDelete = async () => {
    try {
      const svc = erpType === 'BUILDER' ? projectService.builderDelete : projectService.delete;
      await svc(deleteConfig.projectId);
      toast.success('Project deleted');
      setDeleteConfig({ show: false, projectId: null });
      fetchProjects();
    } catch { toast.error('Failed to delete project'); }
  };

  const filteredProjects = projects.filter((p) => {
    if (filter !== 'ALL' && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCounts = {
    ALL: projects.length,
    PLANNED: projects.filter((p) => p.status === 'PLANNED').length,
    IN_PROGRESS: projects.filter((p) => p.status === 'IN_PROGRESS').length,
    COMPLETED: projects.filter((p) => p.status === 'COMPLETED').length,
    ON_HOLD: projects.filter((p) => p.status === 'ON_HOLD').length,
  };

  const getProgress = (p) => {
    if (p.progressUpdates?.length) return p.progressUpdates[0].percentage;
    if (p.status === 'COMPLETED') return 100;
    return 0;
  };

  return (
    <PageWrapper
      title="Projects"
      subtitle="Manage all construction and development projects"
      actions={
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> New Project
        </button>
      }
    >
      {/* Filters & Search */}
      <div className="projects-toolbar">
        <div className="projects-filters">
          {Object.entries(statusCounts).map(([key, count]) => (
            <button
              key={key}
              className={`tab ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {key === 'ALL' ? 'All' : key.replace('_', ' ')} ({count})
            </button>
          ))}
        </div>
        <div className="projects-toolbar-right">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              className="form-input"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="view-toggle">
            <button className={`btn btn-icon btn-ghost ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>
              <LayoutGrid size={16} />
            </button>
            <button className={`btn btn-icon btn-ghost ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : view === 'grid' ? (
        <div className="projects-grid">
          {filteredProjects.map((project, i) => (
            <div
              className="project-card card"
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="project-card-header">
                <span className={`badge ${statusConfig[project.status]?.badge || 'badge-gray'}`}>
                  {statusConfig[project.status]?.label || project.status}
                </span>
                <button className="btn btn-icon btn-ghost" onClick={(e) => handleDelete(project.id, e)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="project-card-title">{project.name}</h3>
              <p className="project-card-desc">{project.description || 'No description'}</p>

              <div className="project-card-meta">
                <div className="project-meta-item">
                  <IndianRupee size={14} />
                  <span>{formatCurrency(project.budget)}</span>
                </div>
                <div className="project-meta-item">
                  <Users size={14} />
                  <span>{project._count?.members || 0} members</span>
                </div>
                <div className="project-meta-item">
                  <Calendar size={14} />
                  <span>{new Date(project.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="project-card-progress">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Progress</span>
                  <span className="text-sm font-semibold">{getProgress(project)}%</span>
                </div>
                <div className="progress-bar" style={{ maxWidth: '100%' }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${getProgress(project)}%`,
                      background: getProgress(project) === 100 ? '#10b981' : getProgress(project) > 50 ? '#3b82f6' : '#f59e0b',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Progress</th>
                <th>Members</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} onClick={() => navigate(`/projects/${project.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{project.name}</div>
                      <div className="text-sm text-muted">{project.description || '—'}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${statusConfig[project.status]?.badge || 'badge-gray'}`}>
                      {statusConfig[project.status]?.label || project.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{formatCurrency(project.budget)}</td>
                  <td>
                    <div className="progress-bar-wrapper">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${getProgress(project)}%`, background: '#3b82f6' }} />
                      </div>
                      <span className="progress-text">{getProgress(project)}%</span>
                    </div>
                  </td>
                  <td>{project._count?.members || 0}</td>
                  <td className="text-sm">{new Date(project.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div className="flex gap-xs" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={(e) => handleDelete(project.id, e)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filteredProjects.length === 0 && (
        <div className="empty-state">
          <FolderKanban size={48} />
          <h3>No projects found</h3>
          <p>Create your first project to get started.</p>
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreated={fetchProjects} erpType={erpType} />
      )}

      <ConfirmModal
        isOpen={deleteConfig.show}
        title="Delete Project"
        message="Are you sure you want to delete this project? All associated data will be permanently removed."
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfig({ show: false, projectId: null })}
        type="danger"
      />
    </PageWrapper>
  );
}

function CreateProjectModal({ onClose, onCreated, erpType }) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    projectType: 'RESIDENTIAL',
    status: 'PLANNED',
    priority: 'MEDIUM',
    budget: '',
    area: '',
    description: '',
    clientName: '',
    clientContactPerson: '',
    clientPhone: '',
    clientEmail: '',
    contractNumber: '',
    workOrderNumber: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    googleMapsUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.warning('Project name is required'); return; }
    try {
      setSubmitting(true);
      const payload = {
        name: form.name,
        code: form.code || undefined,
        projectType: form.projectType || undefined,
        status: form.status,
        priority: form.priority || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        area: form.area ? Number(form.area) : undefined,
        description: form.description || undefined,
        clientName: form.clientName || undefined,
        clientContactPerson: form.clientContactPerson || undefined,
        clientPhone: form.clientPhone || undefined,
        clientEmail: form.clientEmail || undefined,
        contractNumber: form.contractNumber || undefined,
        workOrderNumber: form.workOrderNumber || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        pincode: form.pincode || undefined,
        googleMapsUrl: form.googleMapsUrl || undefined,
      };
      const svc = erpType === 'BUILDER' ? projectService.builderCreate : projectService.create;
      await svc(payload);
      toast.success('Project created successfully!');
      onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed to create project: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '90%' }}>
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' }}>
            
            {/* 1. Basic Information */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>1. Basic Information</h4>
              <div className="contracts-grid-2col">
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Project Name *</label>
                  <input type="text" required className="form-input" placeholder="e.g., Skyline Towers Phase 3" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Project Code</label>
                  <input type="text" className="form-input" placeholder="e.g., PROJ-001" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Project Type</label>
                  <select className="form-input" value={form.projectType} onChange={e => setForm({...form, projectType: e.target.value})}>
                    <option value="RESIDENTIAL">Residential</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="INDUSTRIAL">Industrial</option>
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Project Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Project Priority</label>
                  <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Budget (₹)</label>
                  <input type="number" className="form-input" placeholder="e.g., 5000000" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Total Area (sq. ft.)</label>
                  <input type="number" className="form-input" placeholder="e.g., 25000" value={form.area} onChange={e => setForm({...form, area: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Description</label>
                  <textarea className="form-input" rows="3" placeholder="Brief description of the project..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
              </div>
            </div>

            {/* 2. Client Information */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>2. Client Information</h4>
              <div className="contracts-grid-2col">
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Client Name</label>
                  <input type="text" className="form-input" placeholder="e.g., Rahul Sharma" value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Contact Person</label>
                  <input type="text" className="form-input" placeholder="e.g., Manager / Coordinator" value={form.clientContactPerson} onChange={e => setForm({...form, clientContactPerson: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Mobile Number</label>
                  <input type="text" className="form-input" placeholder="e.g., +91 98765 43210" value={form.clientPhone} onChange={e => setForm({...form, clientPhone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Email</label>
                  <input type="email" className="form-input" placeholder="client@example.com" value={form.clientEmail} onChange={e => setForm({...form, clientEmail: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Contract Number</label>
                  <input type="text" className="form-input" placeholder="e.g., CON-2026-089" value={form.contractNumber} onChange={e => setForm({...form, contractNumber: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Work Order Number</label>
                  <input type="text" className="form-input" placeholder="e.g., WO-7762-A" value={form.workOrderNumber} onChange={e => setForm({...form, workOrderNumber: e.target.value})} />
                </div>
              </div>
            </div>

            {/* 3. Location Details */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>3. Location Details</h4>
              <div className="contracts-grid-2col">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Site Address</label>
                  <textarea className="form-input" rows="2" placeholder="Enter physical site address..." value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>City</label>
                  <input type="text" className="form-input" placeholder="e.g., Mumbai" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>State</label>
                  <input type="text" className="form-input" placeholder="e.g., Maharashtra" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Country</label>
                  <input type="text" className="form-input" value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Pincode</label>
                  <input type="text" className="form-input" placeholder="e.g., 400001" value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Google Maps Location Link / Address</label>
                  <input type="text" className="form-input" placeholder="e.g., https://maps.google.com/?q=..." value={form.googleMapsUrl} onChange={e => setForm({...form, googleMapsUrl: e.target.value})} />
                </div>
              </div>
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <><Loader size={14} className="spin" style={{ marginRight: 6 }} /> Creating...</> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
