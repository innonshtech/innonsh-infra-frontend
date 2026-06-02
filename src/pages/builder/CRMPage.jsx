import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { projectService } from '../../services/api';
import { 
  Plus, Search, Users, Phone, Mail, 
  MapPin, Calendar, Clock, MoreVertical,
  Filter, ArrowRight, CheckCircle2, MessageSquare
} from 'lucide-react';
import './Builder.css';

const COLUMNS = [
  { id: 'NEW', title: 'New Leads', color: 'var(--accent-primary)' },
  { id: 'CONTACTED', title: 'Contacted', color: 'var(--accent-blue)' },
  { id: 'VISIT', title: 'Site Visit', color: 'var(--accent-amber)' },
  { id: 'NEGOTIATION', title: 'Negotiation', color: 'var(--accent-purple)' },
  { id: 'WON', title: 'Closed Won', color: 'var(--accent-secondary)' },
];

export default function CRMPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await projectService.builderGetLeads('');
      setLeads(res.data?.data || []);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const getLeadsByStatus = (status) => leads.filter(l => l.status === status);

  return (
    <PageWrapper
      title="Lead Management (CRM)"
      subtitle="Manage your sales pipeline and customer relationships"
      actions={
        <button className="btn btn-primary"><Plus size={16} /> Add Lead</button>
      }
    >
      <div className="builder-toolbar">
        <div className="flex gap-md">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input className="form-input" placeholder="Search leads by name or phone..." />
          </div>
          <button className="btn btn-ghost"><Filter size={16} /> Filters</button>
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map(column => (
            <div key={column.id} className="kanban-column">
              <div className="kanban-column-header">
                <div className="kanban-column-title" style={{ color: column.color }}>
                  {column.title} <span className="text-muted ml-xs">({getLeadsByStatus(column.id).length})</span>
                </div>
                <button className="btn btn-icon btn-ghost btn-xs"><Plus size={14} /></button>
              </div>

              <div className="kanban-cards-list flex flex-col gap-md">
                {getLeadsByStatus(column.id).map(lead => (
                  <div key={lead.id} className="kanban-card">
                    <div className="flex justify-between items-start mb-sm">
                      <div className="font-bold text-sm">{lead.name}</div>
                      <button className="btn btn-icon btn-ghost btn-xs"><MoreVertical size={12} /></button>
                    </div>
                    <div className="flex flex-col gap-xs">
                      <div className="flex items-center gap-xs text-xs text-muted">
                        <Phone size={10} /> {lead.phone || 'No phone'}
                      </div>
                      <div className="flex items-center gap-xs text-xs text-muted">
                        <Mail size={10} /> {lead.email || 'No email'}
                      </div>
                    </div>
                    <div className="mt-md pt-sm border-t border-secondary flex justify-between items-center">
                      <span className="text-[10px] text-muted">{new Date(lead.createdAt).toLocaleDateString()}</span>
                      <div className="flex gap-xs">
                        <button className="btn btn-icon btn-ghost btn-xs text-accent"><MessageSquare size={12} /></button>
                        <button className="btn btn-icon btn-ghost btn-xs text-success"><ArrowRight size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {getLeadsByStatus(column.id).length === 0 && (
                  <div className="text-center py-xl text-xs text-muted italic">No leads in this stage</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
