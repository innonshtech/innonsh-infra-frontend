import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { userService } from '../../services/api';
import { Settings, Users, Building, Mail, Plus, Edit2, Shield, Trash2 } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';

const PERMISSION_GROUPS = [
  { module: 'Projects & Tasks', key: 'projects', perms: [
    { id: 'projects.view', label: 'View' },
    { id: 'projects.create', label: 'Create' },
    { id: 'projects.update', label: 'Edit' },
    { id: 'projects.delete', label: 'Delete' },
    { id: 'tasks.manage', label: 'Tasks / WBS' },
  ]},
  { module: 'Estimations & BOQ', key: 'estimations', perms: [
    { id: 'estimations.view', label: 'View' },
    { id: 'estimations.create', label: 'Create' },
    { id: 'estimations.update', label: 'Edit / Approve' },
    { id: 'estimations.delete', label: 'Delete' },
  ]},
  { module: 'Finance & Invoices', key: 'finance', perms: [
    { id: 'finance.view', label: 'View' },
    { id: 'finance.manage', label: 'Create / Edit / Delete' },
  ]},
  { module: 'Inventory & Stock', key: 'inventory', perms: [
    { id: 'inventory.view', label: 'View' },
    { id: 'inventory.manage', label: 'Create / Edit / Delete' },
  ]},
  { module: 'Procurement & Vendors', key: 'procurement', perms: [
    { id: 'procurement.view', label: 'View' },
    { id: 'procurement.create', label: 'Create' },
    { id: 'procurement.approve', label: 'Approve' },
  ]},
  { module: 'Labour & Attendance', key: 'labour', perms: [
    { id: 'labour.manage', label: 'Full Access' },
  ]},
  { module: 'Equipment & Maintenance', key: 'equipment', perms: [
    { id: 'equipment.manage', label: 'Full Access' },
  ]},
];

// Flatten for easy lookups
const ALL_PERM_IDS = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.id));

const PREDEFINED_ROLES = [
  { name: 'Project Manager', perms: [...ALL_PERM_IDS] },
  { name: 'Site Supervisor', perms: [
    'projects.view', 'projects.update', 'tasks.manage',
    'estimations.view',
    'inventory.view', 'inventory.manage',
    'procurement.view', 'procurement.create',
    'labour.manage', 'equipment.manage'
  ]},
  { name: 'Quantity Surveyor', perms: [
    'projects.view',
    'estimations.view', 'estimations.create', 'estimations.update',
    'inventory.view',
    'procurement.view'
  ]},
  { name: 'Site Engineer', perms: [
    'projects.view', 'projects.update', 'tasks.manage',
    'estimations.view',
    'inventory.view',
    'labour.manage'
  ]},
  { name: 'Finance Admin', perms: [
    'projects.view',
    'finance.view', 'finance.manage',
    'procurement.view', 'procurement.approve'
  ]},
  { name: 'Store Keeper', perms: [
    'inventory.view', 'inventory.manage',
    'procurement.view'
  ]},
  { name: 'Custom', perms: [] }
];

// Helper: render grouped permission checkboxes
function PermissionGrid({ permissions, onToggle, onToggleGroup }) {
  const allCheckedGlobal = ALL_PERM_IDS.every(id => permissions.includes(id));
  const someCheckedGlobal = ALL_PERM_IDS.some(id => permissions.includes(id));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Master toggle */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px',
        background: allCheckedGlobal ? 'var(--accent-primary)' : 'var(--bg-secondary)',
        color: allCheckedGlobal ? '#fff' : 'inherit',
        border: '1px solid var(--border-secondary)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontWeight: 700, fontSize: '13px',
        transition: 'all 0.2s ease'
      }}>
        <input
          type="checkbox"
          checked={allCheckedGlobal}
          ref={el => { if (el) el.indeterminate = someCheckedGlobal && !allCheckedGlobal; }}
          onChange={() => onToggleGroup(ALL_PERM_IDS, !allCheckedGlobal)}
        />
        Full Access — All Modules
      </label>
      {PERMISSION_GROUPS.map(group => {
        const groupPermIds = group.perms.map(p => p.id);
        const allChecked = groupPermIds.every(id => permissions.includes(id));
        const someChecked = groupPermIds.some(id => permissions.includes(id));
        return (
          <div key={group.key} style={{ 
            border: '1px solid var(--border-secondary)', 
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden'
          }}>
            {/* Module header with "Select All" */}
            <label style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '8px 12px', 
              background: 'var(--bg-secondary)', 
              cursor: 'pointer',
              fontWeight: 600, fontSize: '13px',
              borderBottom: '1px solid var(--border-secondary)'
            }}>
              <input 
                type="checkbox" 
                checked={allChecked}
                ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={() => onToggleGroup(groupPermIds, !allChecked)}
              />
              {group.module}
            </label>
            {/* Sub-permissions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0', padding: '6px 12px' }}>
              {group.perms.map(p => (
                <label key={p.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  cursor: 'pointer', padding: '4px 12px 4px 0',
                  fontSize: '12px', color: 'var(--text-secondary)',
                  minWidth: '110px'
                }}>
                  <input 
                    type="checkbox" 
                    checked={permissions.includes(p.id)}
                    onChange={() => onToggle(p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const getRoleFromPermissions = (permissions = []) => {
  if (permissions.includes('*')) return 'Superadmin';
  if (!permissions || permissions.length === 0) return 'Member';
  
  const sortedUserPerms = [...permissions].sort().join(',');
  const matchedRole = PREDEFINED_ROLES.find(r => [...r.perms].sort().join(',') === sortedUserPerms);
  
  return matchedRole ? matchedRole.name : 'Custom';
};

export default function SettingsPage() {
  const { user, company } = useAuth();
  const [tab, setTab] = useState('team');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const toast = useToast();

  useEffect(() => { if (tab === 'team') loadUsers(); }, [tab]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getAll();
      setUsers(res.data?.data || res.data || []);
    } catch { toast.error('Failed to load team members'); }
    finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      await userService.delete(memberToDelete.id);
      toast.success('Team member removed');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setMemberToDelete(null);
    }
  };

  return (
    <PageWrapper
      title="Settings"
      subtitle="Manage your company profile, team, and preferences"
      actions={
        tab === 'team' && <button className="btn btn-primary" onClick={() => setShowInvite(true)}><Plus size={16} /> Invite Member</button>
      }
    >
      <div className="projects-filters" style={{ marginBottom: 'var(--space-lg)' }}>
        {[
          { key: 'team', label: 'Team Members', icon: Users },
          { key: 'company', label: 'Company Profile', icon: Shield },
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <t.icon size={13} style={{ marginRight: 4 }} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'team' ? (
        loading ? <div className="page-loader"><div className="spinner spinner-lg"></div></div> : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                    <td><div className="flex items-center gap-xs"><Mail size={13} style={{ color: 'var(--text-muted)' }} />{u.email}</div></td>
                    <td><span className="badge badge-purple">{getRoleFromPermissions(u.permissions)}</span></td>
                    <td>{u.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}</td>
                    <td>
                      <div className="flex gap-xs">
                        <button className="btn btn-icon btn-ghost text-primary" onClick={() => setEditMember(u)} title="Edit Permissions"><Edit2 size={14}/></button>
                        <button className="btn btn-icon btn-ghost text-danger" onClick={() => setMemberToDelete(u)} title="Remove Member"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>No team members</td></tr>}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="card-flat" style={{ maxWidth: 600 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-input" value={company?.name || '—'} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">ERP Type</label>
              <input className="form-input" value={company?.erpType || '—'} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <input className="form-input" value={company?.status || '—'} disabled />
            </div>
            <p className="text-sm text-muted">Contact the platform administrator to update company settings.</p>
          </div>
        </div>
      )}

      {showInvite && <InviteMemberModal onClose={() => setShowInvite(false)} onCreated={loadUsers} />}
      {editMember && <EditMemberModal member={editMember} onClose={() => setEditMember(null)} onUpdated={loadUsers} />}
      
      <ConfirmModal 
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${memberToDelete?.firstName} ${memberToDelete?.lastName} from the company? They will lose access to the platform.`}
        confirmText="Remove Member"
      />
    </PageWrapper>
  );
}

function InviteMemberModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: '', permissions: [] });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleRoleChange = (e) => {
    const selectedRoleName = e.target.value;
    const roleObj = PREDEFINED_ROLES.find(r => r.name === selectedRoleName);
    
    setForm(prev => ({
      ...prev,
      role: selectedRoleName,
      permissions: roleObj && selectedRoleName !== 'Custom' ? roleObj.perms : prev.permissions
    }));
  };

  const handleTogglePermission = (id) => {
    setForm(prev => ({
      ...prev,
      role: 'Custom',
      permissions: prev.permissions.includes(id) 
        ? prev.permissions.filter(p => p !== id) 
        : [...prev.permissions, id]
    }));
  };

  const handleToggleGroup = (groupIds, selectAll) => {
    setForm(prev => {
      const withoutGroup = prev.permissions.filter(p => !groupIds.includes(p));
      return {
        ...prev,
        role: 'Custom',
        permissions: selectAll ? [...withoutGroup, ...groupIds] : withoutGroup
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.password) { toast.warning('Name, email and password are required'); return; }
    try {
      setSubmitting(true);
      await userService.create(form);
      toast.success('Team member invited');
      onCreated(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to invite'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header"><h3>Invite Team Member</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">First Name *</label><input className="form-input" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} autoFocus /></div>
              <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
            </div>
            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
            
            <div className="form-group" style={{ paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-secondary)' }}>
              <label className="form-label">Role Template</label>
              <select className="form-input" value={form.role} onChange={handleRoleChange}>
                <option value="" disabled>Select a role template...</option>
                {PREDEFINED_ROLES.map(r => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted mt-xs">Select a role to auto-fill, or customize below.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Module Permissions</label>
              <PermissionGrid 
                permissions={form.permissions} 
                onToggle={handleTogglePermission} 
                onToggleGroup={handleToggleGroup} 
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Inviting...' : 'Invite Member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditMemberModal({ member, onClose, onUpdated }) {
  const [form, setForm] = useState({ role: 'Custom', permissions: member.permissions || [] });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Try to match the current permissions to a predefined role on load
  useEffect(() => {
    if (!member.permissions || member.permissions.length === 0) return;
    
    // Simple matching logic: find role with exact same permissions array (order independent)
    const sortedUserPerms = [...member.permissions].sort().join(',');
    const matchedRole = PREDEFINED_ROLES.find(r => [...r.perms].sort().join(',') === sortedUserPerms);
    
    if (matchedRole && matchedRole.name !== 'Custom') {
      setForm(prev => ({ ...prev, role: matchedRole.name }));
    }
  }, [member]);

  const handleRoleChange = (e) => {
    const selectedRoleName = e.target.value;
    const roleObj = PREDEFINED_ROLES.find(r => r.name === selectedRoleName);
    
    setForm(prev => ({
      ...prev,
      role: selectedRoleName,
      permissions: roleObj && selectedRoleName !== 'Custom' ? roleObj.perms : prev.permissions
    }));
  };

  const handleTogglePermission = (id) => {
    setForm(prev => ({
      ...prev,
      role: 'Custom',
      permissions: prev.permissions.includes(id) 
        ? prev.permissions.filter(p => p !== id) 
        : [...prev.permissions, id]
    }));
  };

  const handleToggleGroup = (groupIds, selectAll) => {
    setForm(prev => {
      const withoutGroup = prev.permissions.filter(p => !groupIds.includes(p));
      return {
        ...prev,
        role: 'Custom',
        permissions: selectAll ? [...withoutGroup, ...groupIds] : withoutGroup
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await userService.updatePermissions(member.id, form.permissions);
      toast.success('Permissions updated');
      onUpdated();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h3>Edit Permissions: {member.firstName} {member.lastName}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            
            {/* Role Template Dropdown */}
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '14px' }}>Role Template</h4>
              <select className="form-select" value={form.role} onChange={handleRoleChange}>
                {PREDEFINED_ROLES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
            </div>

            {/* Grouped Permissions */}
            <div className="form-group mb-0">
              <label className="form-label" style={{ marginBottom: 'var(--space-md)' }}>Module Permissions</label>
              <PermissionGrid 
                permissions={form.permissions} 
                onToggle={handleTogglePermission} 
                onToggleGroup={handleToggleGroup} 
              />
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
