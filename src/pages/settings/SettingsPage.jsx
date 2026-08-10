import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { userService, organizationService } from '../../services/api';
import { supabase, uploadFile } from '../../config/supabase';
import { 
  Settings, Users, Building, Mail, Plus, Edit2, Shield, Trash2,
  MapPin, FileText, Globe, Sliders, Award, Briefcase, FileCode, HardHat
} from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';

const PERMISSION_GROUPS = [
  { module: 'Dashboard', key: 'dashboard', perms: [
    { id: 'dashboard.view', label: 'View Access' },
  ]},
  { module: 'AI Board', key: 'aiBoard', perms: [
    { id: 'aiBoard.view', label: 'View Access' },
  ]},
  { module: 'Organization & Settings', key: 'settings', perms: [
    { id: 'organization.view', label: 'View' },
    { id: 'organization.manage', label: 'Create / Edit / Delete' },
  ]},
  { module: 'Staff & Roles', key: 'users', perms: [
    { id: 'users.view', label: 'View' },
    { id: 'users.create', label: 'Invite' },
    { id: 'users.update', label: 'Edit / Roles' },
    { id: 'users.delete', label: 'Delete' },
  ]},
  { module: 'Reports & Analytics', key: 'reports', perms: [
    { id: 'reports.view', label: 'View Access' },
  ]},
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
  { module: 'Contracts', key: 'contracts', erp: 'CONTRACTOR', perms: [
    { id: 'contracts.view', label: 'View' },
    { id: 'contracts.manage', label: 'Create / Edit / Delete' },
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
  { module: 'Labour & Attendance', key: 'labour', erp: 'CONTRACTOR', perms: [
    { id: 'labour.manage', label: 'Full Access' },
  ]},
  { module: 'Equipment & Maintenance', key: 'equipment', erp: 'CONTRACTOR', perms: [
    { id: 'equipment.manage', label: 'Full Access' },
  ]},
  // Builder ERP Modules
  { module: 'Units Management', key: 'units', erp: 'BUILDER', perms: [
    { id: 'units.view', label: 'View' },
    { id: 'units.manage', label: 'Create / Edit / Delete' },
  ]},
  { module: 'Bookings', key: 'bookings', erp: 'BUILDER', perms: [
    { id: 'bookings.view', label: 'View' },
    { id: 'bookings.manage', label: 'Create / Edit / Delete' },
  ]},
  { module: 'Billing', key: 'billing', erp: 'BUILDER', perms: [
    { id: 'billing.view', label: 'View' },
    { id: 'billing.manage', label: 'Create / Edit / Delete' },
  ]},
  { module: 'CRM / Brokers', key: 'crm', erp: 'BUILDER', perms: [
    { id: 'crm.view', label: 'View' },
    { id: 'crm.manage', label: 'Create / Edit / Delete' },
  ]},
  { module: 'Lease Management', key: 'lease', erp: 'BUILDER', perms: [
    { id: 'lease.view', label: 'View' },
    { id: 'lease.manage', label: 'Create / Edit / Delete' },
  ]},
  { module: 'Legal & Compliance', key: 'legal', erp: 'BUILDER', perms: [
    { id: 'legal.view', label: 'View' },
    { id: 'legal.manage', label: 'Create / Edit / Delete' },
  ]},
];

const ALL_PERM_IDS = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.id));

const PREDEFINED_ROLES = [
  { name: 'Owner', perms: ['*'] },
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
  ]}
];

const getRoleFromPermissions = (permissions = [], designations = []) => {
  if (permissions.includes('*')) return 'Owner';
  if (!permissions || permissions.length === 0) return 'Member';
  const sortedUserPerms = [...permissions].sort().join(',');
  const matchedDes = designations.find(d => [...(d.permissions || [])].sort().join(',') === sortedUserPerms);
  return matchedDes ? matchedDes.name : 'Custom';
};

// Permission Checklist Component
function PermissionGrid({ permissions, onToggle, onToggleGroup }) {
  const { erpType } = useAuth();
  const isOwner = permissions.includes('*');
  
  // Filter permission groups based on company ERP type (Contractor vs. Builder)
  const activeGroups = PERMISSION_GROUPS.filter(g => !g.erp || g.erp === erpType);
  const activePermIds = activeGroups.flatMap(g => g.perms.map(p => p.id));

  const allCheckedGlobal = isOwner || activePermIds.every(id => permissions.includes(id));
  const someCheckedGlobal = !isOwner && activePermIds.some(id => permissions.includes(id));
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px',
        background: allCheckedGlobal ? 'var(--accent-primary)' : 'var(--bg-secondary)',
        color: allCheckedGlobal ? '#fff' : 'inherit',
        border: '1px solid var(--border-secondary)',
        borderRadius: 'var(--radius-md)',
        cursor: isOwner ? 'not-allowed' : 'pointer',
        opacity: isOwner ? 0.8 : 1,
        fontWeight: 700, fontSize: '13px',
        transition: 'all 0.2s ease'
      }}>
        <input
          type="checkbox"
          checked={allCheckedGlobal}
          disabled={isOwner}
          ref={el => { if (el) el.indeterminate = someCheckedGlobal && !allCheckedGlobal; }}
          onChange={() => onToggleGroup(activePermIds, !allCheckedGlobal)}
        />
        Full Access — All Modules (Owner)
      </label>
      {activeGroups.map(group => {
        const groupPermIds = group.perms.map(p => p.id);
        const allChecked = isOwner || groupPermIds.every(id => permissions.includes(id));
        const someChecked = !isOwner && groupPermIds.some(id => permissions.includes(id));
        return (
          <div key={group.key} style={{ 
            border: '1px solid var(--border-secondary)', 
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            opacity: isOwner ? 0.8 : 1
          }}>
            <label style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '8px 12px', 
              background: 'var(--bg-secondary)', 
              cursor: isOwner ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '13px',
              borderBottom: '1px solid var(--border-secondary)'
            }}>
              <input 
                type="checkbox" 
                checked={allChecked}
                disabled={isOwner}
                ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={() => onToggleGroup(groupPermIds, !allChecked)}
              />
              {group.module}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0', padding: '6px 12px' }}>
              {group.perms.map(p => (
                <label key={p.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  cursor: isOwner ? 'not-allowed' : 'pointer', padding: '4px 12px 4px 0',
                  fontSize: '12px', color: 'var(--text-secondary)',
                  minWidth: '110px'
                }}>
                  <input 
                    type="checkbox" 
                    checked={isOwner || permissions.includes(p.id)}
                    disabled={isOwner}
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

export default function SettingsPage() {
  const { user, updateCompany } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState(tabParam || 'profile');
  const toast = useToast();

  const canAccessTab = (tabKey) => {
    if (!user) return false;
    const role = user.role?.toUpperCase();
    const permissions = new Set(user.permissions || []);
    
    if (role === 'OWNER' || permissions.has('*')) return true;
    
    if (tabKey === 'team') {
      return permissions.has('users.view');
    }
    
    return permissions.has('organization.view') || permissions.has('organization.manage');
  };

  const availableTabs = [
    { key: 'profile', label: 'Company Profile', icon: Building },
    { key: 'branches', label: 'Branches / Offices', icon: MapPin },
    { key: 'departments', label: 'Departments', icon: Briefcase },
    { key: 'designations', label: 'Designations', icon: Award },
    { key: 'documents', label: 'Company Documents', icon: FileText },
    { key: 'settings', label: 'General Settings', icon: Sliders },
    { key: 'team', label: 'Team & Security', icon: Users },
  ].filter(t => canAccessTab(t.key));

  useEffect(() => {
    if (tabParam) {
      setTab(tabParam);
    } else if (availableTabs.length > 0 && !availableTabs.some(t => t.key === tab)) {
      setTab(availableTabs[0].key);
    }
  }, [tabParam, availableTabs, tab]);

  // State Management
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [isSavingDepartment, setIsSavingDepartment] = useState(false);
  const [isSavingDesignation, setIsSavingDesignation] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: '', logo: '', code: '', gstNumber: '', panNumber: '', regNumber: '',
    ownerName: '', email: '', phone: '', website: '', address: '', city: '',
    state: '', country: '', pincode: ''
  });
  const [settings, setSettings] = useState({
    currency: 'INR', timeZone: 'IST', financialYear: '2026-2027',
    dateFormat: 'DD/MM/YYYY', numberFormat: 'INR'
  });

  // Branches
  const [branches, setBranches] = useState([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({
    name: '', code: '', address: '', city: '', state: '', phone: '', email: '', managerName: ''
  });
  const [branchToDelete, setBranchToDelete] = useState(null);

  // Departments & Designations
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [newDepName, setNewDepName] = useState('');
  const [newDesName, setNewDesName] = useState('');

  // Documents
  const [documents, setDocuments] = useState([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '', type: 'GST_CERTIFICATE', url: 'https://example.com/docs/dummy_certificate.pdf', expiryDate: ''
  });
  const [docToDelete, setDocToDelete] = useState(null);

  // Team
  const [users, setUsers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // Fetch Company Data based on active tab
  useEffect(() => {
    if (tab === 'profile' || tab === 'settings') {
      loadProfile();
    } else if (tab === 'branches') {
      loadBranches();
    } else if (tab === 'departments') {
      loadDepartments();
    } else if (tab === 'designations') {
      loadDesignations();
    } else if (tab === 'documents') {
      loadDocuments();
    } else if (tab === 'team') {
      loadTeam();
      loadDesignations();
    }
  }, [tab]);

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await organizationService.getProfile();
      const data = res.data?.data || res.data;
      if (data) {
        setProfile({
          name: data.name || '',
          logo: data.logo || '',
          code: data.code || '',
          gstNumber: data.gstNumber || '',
          panNumber: data.panNumber || '',
          regNumber: data.regNumber || '',
          ownerName: data.ownerName || '',
          email: data.email || '',
          phone: data.phone || '',
          website: data.website || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          pincode: data.pincode || ''
        });
        if (data.settings) {
          setSettings({
            currency: data.settings.currency || 'INR',
            timeZone: data.settings.timeZone || 'IST',
            financialYear: data.settings.financialYear || '2026-2027',
            dateFormat: data.settings.dateFormat || 'DD/MM/YYYY',
            numberFormat: data.settings.numberFormat || 'INR'
          });
        }
      }
    } catch {
      toast.error('Failed to load company profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Logo image must be under 2MB');
      return;
    }
    
    if (supabase) {
      const uploadToast = toast.info('Uploading logo to cloud storage...');
      try {
        const publicUrl = await uploadFile(file);
        setProfile(prev => ({ ...prev, logo: publicUrl }));
        toast.dismiss(uploadToast);
        toast.success('Logo uploaded to cloud successfully! Remember to click "Save Profile Details" to save it!');
      } catch (err) {
        console.error('Supabase upload error:', err);
        toast.dismiss(uploadToast);
        toast.warning('Cloud upload failed. Falling back to local preview.');
        const reader = new FileReader();
        reader.onload = (evt) => {
          setProfile(prev => ({ ...prev, logo: evt.target.result }));
          toast.success('Logo loaded from PC. Remember to click "Save Profile Details" to save it!');
        };
        reader.readAsDataURL(file);
      }
    } else {
      toast.warning('Cloud storage not configured. Falling back to local Base64 storage.');
      const reader = new FileReader();
      reader.onload = (evt) => {
        setProfile(prev => ({ ...prev, logo: evt.target.result }));
        toast.success('Logo loaded from PC. Remember to click "Save Profile Details" to save it!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    try {
      const res = await organizationService.updateProfile(profile);
      toast.success('Company profile updated successfully');
      
      const updatedData = res.data?.data || res.data;
      if (updatedData) {
        updateCompany(updatedData);
      }
      
      loadProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update company profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      await organizationService.updateSettings(settings);
      toast.success('Company settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Branches Handlers
  const loadBranches = async () => {
    try {
      const res = await organizationService.getBranches();
      setBranches(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load branches');
    }
  };

  const handleOpenBranchModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchForm({
        name: branch.name || '',
        code: branch.code || '',
        address: branch.address || '',
        city: branch.city || '',
        state: branch.state || '',
        phone: branch.phone || '',
        email: branch.email || '',
        managerName: branch.managerName || ''
      });
    } else {
      setEditingBranch(null);
      setBranchForm({ name: '', code: '', address: '', city: '', state: '', phone: '', email: '', managerName: '' });
    }
    setShowBranchModal(true);
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (isSavingBranch) return;
    setIsSavingBranch(true);
    try {
      if (editingBranch) {
        await organizationService.updateBranch(editingBranch.id, branchForm);
        toast.success('Branch updated successfully');
      } else {
        await organizationService.createBranch(branchForm);
        toast.success('Branch created successfully');
      }
      setShowBranchModal(false);
      loadBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save branch');
    } finally {
      setIsSavingBranch(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    try {
      await organizationService.deleteBranch(branchToDelete.id);
      toast.success('Branch deleted successfully');
      loadBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete branch');
    } finally {
      setBranchToDelete(null);
    }
  };

  // Departments Handlers
  const loadDepartments = async () => {
    try {
      const res = await organizationService.getDepartments();
      setDepartments(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load departments');
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDepName.trim() || isSavingDepartment) return;
    setIsSavingDepartment(true);
    try {
      await organizationService.createDepartment({ name: newDepName });
      toast.success('Department created');
      setNewDepName('');
      loadDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create department');
    } finally {
      setIsSavingDepartment(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    try {
      await organizationService.deleteDepartment(id);
      toast.success('Department removed');
      loadDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete department');
    }
  };

  // Designations Handlers
  const loadDesignations = async () => {
    try {
      const res = await organizationService.getDesignations();
      setDesignations(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load designations');
    }
  };

  const [newDesPerms, setNewDesPerms] = useState([]);
  const [editingDes, setEditingDes] = useState(null);

  const handleAddDesignation = async (e) => {
    e.preventDefault();
    if (!newDesName.trim() || isSavingDesignation) return;
    setIsSavingDesignation(true);
    try {
      if (editingDes) {
        await organizationService.updateDesignation(editingDes.id, { name: newDesName, permissions: newDesPerms });
        toast.success('Designation updated');
      } else {
        await organizationService.createDesignation({ name: newDesName, permissions: newDesPerms });
        toast.success('Designation created');
      }
      setNewDesName('');
      setNewDesPerms([]);
      setEditingDes(null);
      loadDesignations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save designation');
    } finally {
      setIsSavingDesignation(false);
    }
  };

  const handleStartEditDes = (d) => {
    setEditingDes(d);
    setNewDesName(d.name);
    setNewDesPerms(d.permissions || []);
  };

  const handleCancelEditDes = () => {
    setEditingDes(null);
    setNewDesName('');
    setNewDesPerms([]);
  };

  const handleDeleteDesignation = async (id) => {
    try {
      await organizationService.deleteDesignation(id);
      toast.success('Designation removed');
      if (editingDes?.id === id) handleCancelEditDes();
      loadDesignations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete designation');
    }
  };

  // Documents Handlers
  const loadDocuments = async () => {
    try {
      const res = await organizationService.getDocuments();
      setDocuments(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load company documents');
    }
  };

  const handleSaveDoc = async (e) => {
    e.preventDefault();
    if (isSavingDoc) return;
    setIsSavingDoc(true);
    try {
      await organizationService.createDocument(docForm);
      toast.success('Document uploaded successfully');
      setShowDocModal(false);
      loadDocuments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      await organizationService.deleteDocument(docToDelete.id);
      toast.success('Document removed');
      loadDocuments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete document');
    } finally {
      setDocToDelete(null);
    }
  };

  // Team Handlers
  const loadTeam = async () => {
    try {
      setTeamLoading(true);
      const res = await userService.getAll();
      setUsers(res.data?.data || res.data || []);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setTeamLoading(false);
    }
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete || isDeletingMember) return;
    setIsDeletingMember(true);
    try {
      await userService.delete(memberToDelete.id);
      toast.success('Team member removed');
      loadTeam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setIsDeletingMember(false);
      setMemberToDelete(null);
    }
  };


  return (
    <PageWrapper
      title="Organization Settings"
      subtitle="Manage your profile, branches, departments, designations, vault documents and general preferences"
      actions={
        tab === 'team' ? (
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <Plus size={16} /> Invite Member
          </button>
        ) : tab === 'branches' ? (
          <button className="btn btn-primary" onClick={() => handleOpenBranchModal()}>
            <Plus size={16} /> Register Branch
          </button>
        ) : tab === 'documents' ? (
          <button className="btn btn-primary" onClick={() => setShowDocModal(true)}>
            <Plus size={16} /> Upload Document
          </button>
        ) : null
      }
    >
      {/* Horizontal Tabs Row */}
      <div className="projects-filters" style={{ marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '6px' }}>
        {availableTabs.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <t.icon size={13} style={{ marginRight: 6 }} /> {t.label}
          </button>
        ))}
      </div>

      {profileLoading && (tab === 'profile' || tab === 'settings') ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : (
        <>
          {/* TAB 1: COMPANY PROFILE */}
          {tab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="settings-layout-profile">
              {/* Logo Column */}
              <div className="card-flat" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)', alignSelf: 'start' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  fontSize: '32px', fontWeight: 'bold', border: '4px solid var(--border-secondary)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {profile.logo ? (
                    <img src={profile.logo} alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <HardHat size={48} style={{ color: 'white' }} />
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 4px 0' }}>{profile.name || 'Your Company'}</h4>
                  <p className="text-xs text-muted" style={{ margin: 0 }}>Contractor ERP Enterprise</p>
                </div>
                <div style={{ position: 'relative', width: '100%', textAlign: 'center' }}>
                  <button type="button" className="btn btn-secondary btn-sm w-full" style={{ position: 'relative' }}>
                    📁 Choose Local File
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                      onChange={handleLogoUpload} 
                    />
                  </button>
                </div>
                <div className="text-xs text-muted" style={{ textAlign: 'center', width: '100%', borderBottom: '1px dashed var(--border-primary)', paddingBottom: '8px' }}>
                  Or enter image URL below:
                </div>
                <input 
                  type="text" 
                  className="form-input text-xs" 
                  placeholder="Enter logo image URL..." 
                  value={profile.logo} 
                  onChange={e => setProfile({ ...profile, logo: e.target.value })} 
                />
              </div>

              {/* Form Data */}
              <div className="card-flat" style={{ padding: 'var(--space-xl)' }}>
                <div className="settings-grid-inputs">
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input className="form-input" required placeholder="e.g. Innonsh Construction Ltd" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Code / Initials</label>
                    <input className="form-input" placeholder="e.g. ICC" value={profile.code} onChange={e => setProfile({ ...profile, code: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner Name</label>
                    <input className="form-input" placeholder="e.g. Vaibhav Thorat" value={profile.ownerName} onChange={e => setProfile({ ...profile, ownerName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registration Number</label>
                    <input className="form-input" placeholder="e.g. REG-12345678-MH" value={profile.regNumber} onChange={e => setProfile({ ...profile, regNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN / Tax Number</label>
                    <input className="form-input" placeholder="e.g. 27AAAAA0000A1Z5" value={profile.gstNumber} onChange={e => setProfile({ ...profile, gstNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN Number</label>
                    <input className="form-input" placeholder="e.g. ABCDE1234F" value={profile.panNumber} onChange={e => setProfile({ ...profile, panNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <input className="form-input" type="email" placeholder="e.g. info@innonsh.com" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input className="form-input" placeholder="e.g. +91 98765 43210" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
                  </div>
                  <div className="form-group settings-span-mobile-2" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Website URL</label>
                    <input className="form-input" placeholder="https://example.com" value={profile.website} onChange={e => setProfile({ ...profile, website: e.target.value })} />
                  </div>
                  <div className="form-group settings-span-mobile-2" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Street Address</label>
                    <textarea className="form-input" rows={2} placeholder="e.g. Office No. 104, Block-A, Prime Business Hub" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" placeholder="e.g. Pune" value={profile.city} onChange={e => setProfile({ ...profile, city: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-input" placeholder="e.g. Maharashtra" value={profile.state} onChange={e => setProfile({ ...profile, state: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-input" placeholder="e.g. India" value={profile.country} onChange={e => setProfile({ ...profile, country: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input className="form-input" placeholder="e.g. 411001" value={profile.pincode} onChange={e => setProfile({ ...profile, pincode: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
                    {isSavingProfile ? 'Saving...' : 'Save Profile Details'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: BRANCHES */}
          {tab === 'branches' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Branch Name</th>
                    <th>Code</th>
                    <th>Manager</th>
                    <th>Contact Phone/Email</th>
                    <th>City / State</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{b.name}</td>
                      <td><span className="badge badge-purple">{b.code}</span></td>
                      <td>{b.managerName || '—'}</td>
                      <td>
                        <div style={{ fontSize: '12px' }}>{b.phone}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.email}</div>
                      </td>
                      <td>{b.city}, {b.state}</td>
                      <td>
                        <div className="flex gap-xs">
                          <button className="btn btn-icon btn-ghost text-primary" onClick={() => handleOpenBranchModal(b)} title="Edit Branch"><Edit2 size={14}/></button>
                          <button className="btn btn-icon btn-ghost text-danger" onClick={() => setBranchToDelete(b)} title="Delete Branch"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {branches.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>
                        No branches registered. Click "Register Branch" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: DEPARTMENTS */}
          {tab === 'departments' && (
            <div className="settings-layout-branches">
              <div className="card-flat" style={{ padding: 'var(--space-lg)', alignSelf: 'start' }}>
                <h3>Add Department</h3>
                <form onSubmit={handleAddDepartment}>
                  <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                    <label className="form-label">Department Name *</label>
                    <input 
                      className="form-input" 
                      placeholder="e.g. Civil" 
                      value={newDepName} 
                      onChange={e => setNewDepName(e.target.value)} 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={isSavingDepartment}>{isSavingDepartment ? 'Creating...' : 'Create Department'}</button>
                </form>
              </div>

              <div className="card-flat" style={{ padding: 'var(--space-lg)' }}>
                <h3>Active Departments</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                  {departments.map(d => (
                    <div key={d.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{d.name}</span>
                      <button 
                        onClick={() => handleDeleteDepartment(d.id)} 
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-danger)', cursor: 'pointer' }}
                        title="Delete Department"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {departments.length === 0 && <div className="text-muted" style={{ gridColumn: 'span 3', padding: 'var(--space-md)' }}>No departments active.</div>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DESIGNATIONS */}
          {tab === 'designations' && (
            <div className="settings-layout-departments">
              <div className="card-flat" style={{ padding: 'var(--space-lg)', alignSelf: 'start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <h3 style={{ margin: 0 }}>{editingDes ? 'Edit Designation' : 'Add Designation'}</h3>
                  {editingDes && (
                    <button type="button" className="btn btn-secondary btn-xs" onClick={handleCancelEditDes}>
                      Cancel Edit
                    </button>
                  )}
                </div>
                <form onSubmit={handleAddDesignation}>
                  <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                    <label className="form-label">Designation Name *</label>
                    <input 
                      className="form-input" 
                      placeholder="e.g. Site Supervisor, Billing Engineer" 
                      value={newDesName} 
                      onChange={e => setNewDesName(e.target.value)} 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                    <label className="form-label" style={{ marginBottom: 'var(--space-xs)' }}>Allowed Module Permissions</label>
                    <p className="text-xs text-muted" style={{ margin: '0 0 10px 0' }}>Select which modules users with this designation can access.</p>
                    <PermissionGrid 
                      permissions={newDesPerms}
                      onToggle={id => setNewDesPerms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])}
                      onToggleGroup={(groupIds, selectAll) => {
                        setNewDesPerms(prev => {
                          const withoutGroup = prev.filter(p => !groupIds.includes(p));
                          return selectAll ? [...withoutGroup, ...groupIds] : withoutGroup;
                        });
                      }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full" disabled={isSavingDesignation}>
                    {isSavingDesignation ? 'Saving...' : editingDes ? 'Update Designation' : 'Create Designation'}
                  </button>
                </form>
              </div>

              <div className="card-flat" style={{ padding: 'var(--space-lg)' }}>
                <h3>Registered Organization Roles / Designations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                  {designations.map(d => (
                    <div key={d.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{d.name}</span>
                          <span className="badge badge-purple text-xs">{(d.permissions || []).length} perms</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {(d.permissions || []).length === 0 ? (
                            <span className="text-xs text-muted">No module permissions assigned</span>
                          ) : (d.permissions || []).map(p => (
                            <span key={p} className="badge badge-blue text-xs">{p}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button 
                          type="button"
                          onClick={() => handleStartEditDes(d)} 
                          className="btn btn-icon btn-ghost text-primary"
                          title="Edit Designation & Permissions"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteDesignation(d.id)} 
                          className="btn btn-icon btn-ghost text-danger"
                          title="Delete Designation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {designations.length === 0 && <div className="text-muted" style={{ padding: 'var(--space-md)' }}>No custom designations added yet.</div>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS VAULT */}
          {tab === 'documents' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Type</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        <div className="flex items-center gap-xs">
                          <FileCode size={16} className="text-primary" />
                          <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{d.name}</a>
                        </div>
                      </td>
                      <td><span className="badge badge-purple">{d.type.replace('_', ' ')}</span></td>
                      <td>{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '—'}</td>
                      <td>
                        {d.expiryDate && new Date(d.expiryDate) < new Date() ? (
                          <span className="badge badge-red">Expired</span>
                        ) : (
                          <span className="badge badge-green">Active</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-icon btn-ghost text-danger" onClick={() => setDocToDelete(d)} title="Delete Document"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>
                        No certificates uploaded. Click "Upload Document" to secure a copy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {tab === 'settings' && (
            <div className="card-flat" style={{ maxWidth: 650, padding: 'var(--space-xl)' }}>
              <h3>Global Preferences</h3>
              <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', marginTop: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Base Currency Symbol</label>
                  <select className="form-input" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Default Time Zone</label>
                  <select className="form-input" value={settings.timeZone} onChange={e => setSettings({...settings, timeZone: e.target.value})}>
                    <option value="IST">IST - India Standard Time (GMT+5:30)</option>
                    <option value="UTC">UTC - Coordinated Universal Time (GMT+0)</option>
                    <option value="EST">EST - Eastern Standard Time (GMT-5)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Current Financial Year</label>
                  <input className="form-input" placeholder="e.g. 2026-2027" value={settings.financialYear} onChange={e => setSettings({...settings, financialYear: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">System Date Format</label>
                  <select className="form-input" value={settings.dateFormat} onChange={e => setSettings({...settings, dateFormat: e.target.value})}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 25/06/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 06/25/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-06-25)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Number Formatting Style</label>
                  <select className="form-input" value={settings.numberFormat} onChange={e => setSettings({...settings, numberFormat: e.target.value})}>
                    <option value="INR">Indian (Lakhs/Crores - e.g. 10,00,000.00)</option>
                    <option value="INT">International (Millions/Billions - e.g. 1,000,000.00)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                   <button type="submit" className="btn btn-primary" disabled={isSavingSettings}>{isSavingSettings ? 'Saving...' : 'Save Settings'}</button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 7: TEAM MEMBERS */}
          {tab === 'team' && (
            teamLoading ? <div className="page-loader"><div className="spinner spinner-lg"></div></div> : (
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                        <td><div className="flex items-center gap-xs"><Mail size={13} style={{ color: 'var(--text-muted)' }} />{u.email}</div></td>
                        <td><span className="badge badge-purple">{u.role?.name || getRoleFromPermissions(u.permissions, designations)}</span></td>
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
          )}
        </>
      )}

      {/* BRANCH ADD/EDIT OVERLAY MODAL */}
      {showBranchModal && (
        <div className="modal-overlay" onClick={() => setShowBranchModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>{editingBranch ? 'Edit Branch' : 'Register New Branch'}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowBranchModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveBranch}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div className="settings-grid-member">
                  <div className="form-group"><label className="form-label">Branch Name *</label><input className="form-input" required value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Branch Code *</label><input className="form-input" required placeholder="e.g. BY-01" value={branchForm.code} onChange={e => setBranchForm({...branchForm, code: e.target.value})} /></div>
                </div>
                <div className="settings-grid-member">
                  <div className="form-group"><label className="form-label">Contact Phone *</label><input className="form-input" required value={branchForm.phone} onChange={e => setBranchForm({...branchForm, phone: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Contact Email *</label><input className="form-input" required type="email" value={branchForm.email} onChange={e => setBranchForm({...branchForm, email: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Branch Manager Name</label><input className="form-input" placeholder="e.g. Sunil Kamble" value={branchForm.managerName} onChange={e => setBranchForm({...branchForm, managerName: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Street Address *</label><input className="form-input" required value={branchForm.address} onChange={e => setBranchForm({...branchForm, address: e.target.value})} /></div>
                <div className="settings-grid-member">
                  <div className="form-group"><label className="form-label">City *</label><input className="form-input" required value={branchForm.city} onChange={e => setBranchForm({...branchForm, city: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">State *</label><input className="form-input" required value={branchForm.state} onChange={e => setBranchForm({...branchForm, state: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBranchModal(false)}>Cancel</button>
                 <button type="submit" className="btn btn-primary" disabled={isSavingBranch}>{isSavingBranch ? 'Saving...' : (editingBranch ? 'Update Branch' : 'Register Branch')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT UPLOAD OVERLAY MODAL */}
      {showDocModal && (
        <div className="modal-overlay" onClick={() => setShowDocModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Upload Company Document</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowDocModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveDoc}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div className="form-group">
                  <label className="form-label">Document Title / Name *</label>
                  <input className="form-input" required placeholder="e.g. GST registration certificate" value={docForm.name} onChange={e => setDocForm({...docForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Document Category / Type</label>
                  <select className="form-input" value={docForm.type} onChange={e => setDocForm({...docForm, type: e.target.value})}>
                    <option value="GST_CERTIFICATE">GST Certificate</option>
                    <option value="PAN_CARD">PAN Card</option>
                    <option value="REGISTRATION_CERTIFICATE">Registration Certificate</option>
                    <option value="LABOUR_LICENSE">Labour License</option>
                    <option value="MSME_CERTIFICATE">MSME Certificate</option>
                    <option value="ISO_CERTIFICATE">ISO Certificate</option>
                    <option value="INSURANCE">Insurance Document</option>
                    <option value="OTHER">Other Documents</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date (optional)</label>
                  <input className="form-input" type="date" value={docForm.expiryDate} onChange={e => setDocForm({...docForm, expiryDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Document Attachment URL *</label>
                  <input className="form-input" required value={docForm.url} onChange={e => setDocForm({...docForm, url: e.target.value})} />
                  <p className="text-xs text-muted mt-xs">Provide a secure URL linking to this document.</p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDocModal(false)}>Cancel</button>
                 <button type="submit" className="btn btn-primary" disabled={isSavingDoc}>{isSavingDoc ? 'Saving...' : 'Save Document'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM MEMBER ACTIONS MODALS */}
      {showInvite && <InviteMemberModal designations={designations} onClose={() => setShowInvite(false)} onCreated={loadTeam} />}
      {editMember && <EditMemberModal designations={designations} member={editMember} onClose={() => setEditMember(null)} onUpdated={loadTeam} />}
      
      <ConfirmModal 
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={confirmDeleteMember}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${memberToDelete?.firstName} ${memberToDelete?.lastName} from the company? They will lose access to the platform.`}
        confirmText="Remove Member"
        disabled={isDeletingMember}
      />

      <ConfirmModal 
        isOpen={!!branchToDelete}
        onClose={() => setBranchToDelete(null)}
        onConfirm={handleDeleteBranch}
        title="Delete Branch / Office"
        message={`Are you sure you want to permanently delete the branch "${branchToDelete?.name}" (${branchToDelete?.code})? This action cannot be undone.`}
        confirmText="Delete Branch"
      />

      <ConfirmModal 
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDeleteDoc}
        title="Delete Vault Document"
        message={`Are you sure you want to permanently remove "${docToDelete?.name}" from your secure documents vault?`}
        confirmText="Delete Document"
      />
    </PageWrapper>
  );
}

function InviteMemberModal({ designations = [], onClose, onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: '', permissions: [] });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleRoleChange = (e) => {
    const selectedRoleName = e.target.value;
    if (selectedRoleName === 'Owner') {
      setForm(prev => ({ ...prev, role: 'Owner', permissions: ['*'] }));
      return;
    }
    const desObj = designations.find(d => d.name.toLowerCase() === selectedRoleName.toLowerCase());
    setForm(prev => ({
      ...prev,
      role: selectedRoleName,
      permissions: desObj ? (desObj.permissions || []) : prev.permissions
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
            <div className="settings-grid-invite">
              <div className="form-group"><label className="form-label">First Name *</label><input className="form-input" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} autoFocus /></div>
              <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
            </div>
            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
            
            <div className="form-group" style={{ paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-secondary)' }}>
              <label className="form-label">Role Template / Designation</label>
              <select className="form-input" value={form.role} onChange={handleRoleChange}>
                <option value="" disabled>Select a designation from your organization...</option>
                <option value="Owner">Owner (Full Access)</option>
                {designations.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
                <option value="Custom">Custom Permissions</option>
              </select>
              <p className="text-xs text-muted mt-xs">Select your company designation to auto-fill permissions, or customize below.</p>
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

function EditMemberModal({ designations = [], member, onClose, onUpdated }) {
  const [form, setForm] = useState({ role: 'Custom', permissions: member.permissions || [] });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!member.permissions || member.permissions.length === 0) {
      setForm({ role: 'Custom', permissions: [] });
      return;
    }
    const matchedRoleName = getRoleFromPermissions(member.permissions, designations);
    setForm({ role: matchedRoleName, permissions: member.permissions || [] });
  }, [member, designations]);

  const handleRoleChange = (e) => {
    const selectedRoleName = e.target.value;
    if (selectedRoleName === 'Owner') {
      setForm(prev => ({ ...prev, role: 'Owner', permissions: ['*'] }));
      return;
    }
    const desObj = designations.find(d => d.name.toLowerCase() === selectedRoleName.toLowerCase());
    setForm(prev => ({
      ...prev,
      role: selectedRoleName,
      permissions: desObj ? (desObj.permissions || []) : prev.permissions
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
            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 var(--space-sm) 0', fontSize: '14px' }}>Role Template / Designation</h4>
              <select className="form-select" value={form.role} onChange={handleRoleChange}>
                <option value="" disabled>Select a designation from your organization...</option>
                <option value="Owner">Owner (Full Access)</option>
                {designations.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
                <option value="Custom">Custom Permissions</option>
              </select>
            </div>
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
