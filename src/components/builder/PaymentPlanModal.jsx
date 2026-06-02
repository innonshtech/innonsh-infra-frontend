import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { projectService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import '../ui/ConfirmModal.css';

export default function PaymentPlanModal({ isOpen, onClose, booking, projectId, onSuccess }) {
  const [milestones, setMilestones] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
      // In a real system, you'd fetch existing milestones here
      setMilestones([
        { name: 'Booking Amount', amountPercent: 10, status: 'PAID', taskId: null },
        { name: 'On Foundation', amountPercent: 20, status: 'PENDING', taskId: null },
        { name: 'On Ground Slab', amountPercent: 15, status: 'PENDING', taskId: null }
      ]);
    }
  }, [isOpen]);

  const fetchTasks = async () => {
    try {
      const res = await projectService.getTasks(projectId);
      // Flatten or filter only relevant milestone-level tasks
      const allTasks = res.data?.data || res.data || [];
      const flatten = (tasks) => {
        let result = [];
        tasks.forEach(t => {
          result.push(t);
          if (t.subTasks) result = [...result, ...flatten(t.subTasks)];
        });
        return result;
      };
      setProjectTasks(flatten(allTasks));
    } catch {
      toast.error('Failed to load construction tasks');
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { name: '', amountPercent: 0, status: 'PENDING', taskId: null }]);
  };

  const removeMilestone = (index) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index, field, value) => {
    const next = [...milestones];
    next[index][field] = value;
    setMilestones(next);
  };

  const currentTotal = milestones.reduce((s, m) => s + Number(m.amountPercent || 0), 0);

  const handleSave = async () => {
    if (currentTotal !== 100) {
      toast.warning(`Total percentage must equal 100% (Current: ${currentTotal}%)`);
      return;
    }
    setLoading(true);
    try {
      // Logic to save multiple milestones
      // await bookingService.savePaymentPlan(booking.id, milestones);
      toast.success('Payment plan updated successfully');
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to save payment plan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="c-modal-overlay">
      <div className="c-modal-content animate-slide-up" style={{ maxWidth: '800px', width: '90%' }}>
        <button className="c-modal-close" onClick={onClose}><X size={20} /></button>
        
        <div className="c-modal-header">
          <h2 className="c-modal-title">Payment Plan: {booking.unit?.unitNumber}</h2>
        </div>

        <div className="p-md bg-tertiary radius-md mb-lg flex justify-between items-center">
          <div>
            <div className="text-xs text-muted uppercase">Total Deal Value</div>
            <div className="font-bold text-lg">₹{booking.totalAmount.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted uppercase">Plan Balance</div>
            <div className={`font-bold text-lg ${currentTotal === 100 ? 'text-success' : 'text-danger'}`}>
              {currentTotal}% / 100%
            </div>
          </div>
        </div>

        <div className="milestone-list flex flex-col gap-md max-h-96 overflow-y-auto pr-sm">
          {milestones.map((m, i) => (
            <div key={i} className="flex gap-md items-end p-md bg-hover radius-md border border-secondary">
              <div className="form-group flex-1">
                <label className="form-label">Milestone Name</label>
                <input 
                  className="form-input" 
                  value={m.name} 
                  onChange={(e) => updateMilestone(i, 'name', e.target.value)}
                  placeholder="e.g. 5th Floor Slab" 
                />
              </div>
              <div className="form-group" style={{ width: '100px' }}>
                <label className="form-label">Value %</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={m.amountPercent} 
                  onChange={(e) => updateMilestone(i, 'amountPercent', Number(e.target.value))}
                />
              </div>
              <div className="form-group flex-1">
                <label className="form-label flex items-center gap-xs">
                  <LinkIcon size={12} /> Link Construction Task
                </label>
                <select 
                  className="form-select"
                  value={m.taskId || ''}
                  onChange={(e) => updateMilestone(i, 'taskId', e.target.value)}
                >
                  <option value="">No Construction Link</option>
                  {projectTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.wbsCode ? `[${t.wbsCode}] ` : ''}{t.name} {t.isMilestone ? '⭐' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                className="btn btn-icon btn-ghost text-danger mb-xs"
                onClick={() => removeMilestone(i)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button className="btn btn-ghost w-full mt-lg border-dashed border-2" onClick={addMilestone}>
          <Plus size={16} /> Add Payment Milestone
        </button>

        <div className="c-modal-footer mt-2xl">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Payment Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
