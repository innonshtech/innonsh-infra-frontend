import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { 
  Library, Plus, FileJson, Copy, 
  Trash2, Edit, ChevronRight, Info,
  Layout, Building2, HardHat
} from 'lucide-react';

export default function WBSTemplatesPage() {
  const [templates, setTemplates] = useState([
    { 
      id: 'template-1', 
      name: 'High-Rise Residential', 
      description: 'Standard 14-story residential flow with foundation, core, and finishing phases.',
      icon: Building2,
      steps: 12,
      milestones: 4
    },
    { 
      id: 'template-2', 
      name: 'Commercial Core & Shell', 
      description: 'Optimized for office buildings focusing on main structure and utilities.',
      icon: Layout,
      steps: 8,
      milestones: 6
    },
    { 
      id: 'template-3', 
      name: 'Villa / Raw House', 
      description: 'Simple 3-stage flow for individual houses or villas.',
      icon: HardHat,
      steps: 15,
      milestones: 3
    }
  ]);

  return (
    <PageWrapper
      title="WBS Process Gallery"
      subtitle="Define and manage your standard construction flows"
      actions={
        <button className="btn btn-primary"><Plus size={16} /> Create Template</button>
      }
    >
      <div className="grid grid-3 gap-xl">
        {templates.map(tmp => (
          <div key={tmp.id} className="card-flat hover-scale active-glow">
            <div className="flex justify-between items-start mb-lg">
              <div className="p-md radius-md bg-tertiary" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <tmp.icon size={24} />
              </div>
              <div className="flex gap-xs">
                <button className="btn btn-icon btn-ghost btn-xs"><Edit size={12} /></button>
                <button className="btn btn-icon btn-ghost btn-xs text-danger"><Trash2 size={12} /></button>
              </div>
            </div>
            
            <h3 className="mb-xs">{tmp.name}</h3>
            <p className="text-sm text-secondary mb-xl" style={{ height: '40px', overflow: 'hidden' }}>
              {tmp.description}
            </p>

            <div className="flex gap-md mt-lg border-t border-secondary pt-lg">
              <div className="flex flex-col">
                <span className="text-xs text-muted mb-xs uppercase letter-spacing-1">Total Jobs</span>
                <span className="font-bold text-lg">{tmp.steps}</span>
              </div>
              <div className="flex flex-col ml-auto">
                <span className="text-xs text-muted mb-xs uppercase letter-spacing-1">Milestones</span>
                <span className="font-bold text-lg text-accent" style={{ color: '#ef4444' }}>{tmp.milestones}</span>
              </div>
            </div>

            <button className="btn btn-secondary w-full mt-xl">
              <ChevronRight size={14} /> Preview Flow structure
            </button>
          </div>
        ))}

        <div className="card-flat border-dashed border-2 flex flex-col items-center justify-center p-2xl cursor-pointer hover:bg-tertiary">
          <Library size={32} className="text-muted mb-md" />
          <h4 className="text-muted">Import from External Source</h4>
          <span className="text-xs text-secondary mt-xs">Support .json or Procore exports</span>
        </div>
      </div>

      <div className="mt-2xl p-xl radius-lg border-accent-glow flex items-center gap-xl" style={{ border: '1px dashed rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.05)' }}>
        <div className="p-md radius-full bg-accent text-white" style={{ background: '#3b82f6' }}>
          <Info size={24} />
        </div>
        <div>
          <h4 className="mb-xs">How Templates Work</h4>
          <p className="text-sm text-secondary">
            Templates allow you to standardize your construction stages across different regions. 
            Applying a template to a new project automatically generates the WBS Tree, saving hours of data entry.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
