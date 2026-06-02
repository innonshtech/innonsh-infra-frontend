import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { projectService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import '../ui/ConfirmModal.css';

export default function UnitModal({ isOpen, onClose, projectId, onSuccess, unit = null }) {
  const [formData, setFormData] = useState(unit || {
    unitNumber: '',
    floorNumber: 0,
    bhk: '2 BHK',
    type: 'Apartment',
    area: '',
    facing: 'East',
    price: '',
    status: 'AVAILABLE'
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.unitNumber || !formData.price) {
      toast.error('Unit Number and Price are required');
      return;
    }

    setLoading(true);
    try {
      if (unit?.id) {
        await projectService.builderUpdate(unit.id, formData);
        toast.success('Unit updated successfully');
      } else {
        await projectService.builderCreateUnit(projectId, {
          ...formData,
          projectId,
          floorNumber: parseInt(formData.floorNumber),
          area: parseFloat(formData.area),
          price: parseFloat(formData.price)
        });
        toast.success('Unit added successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="c-modal-overlay">
      <div className="c-modal-content animate-slide-up" style={{ maxWidth: '600px' }}>
        <button className="c-modal-close" onClick={onClose}><X size={20} /></button>
        
        <div className="c-modal-header">
          <h2 className="c-modal-title">{unit ? 'Edit Unit' : 'Add New Unit'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-lg">
          <div className="grid grid-2 gap-lg">
            <div className="form-group">
              <label className="form-label">Unit Number *</label>
              <input 
                className="form-input" 
                placeholder="e.g. A-101" 
                value={formData.unitNumber}
                onChange={(e) => setFormData({...formData, unitNumber: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Floor Number</label>
              <input 
                type="number"
                className="form-input" 
                value={formData.floorNumber}
                onChange={(e) => setFormData({...formData, floorNumber: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">BHK Type</label>
              <select 
                className="form-select"
                value={formData.bhk}
                onChange={(e) => setFormData({...formData, bhk: e.target.value})}
              >
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4 BHK">4 BHK</option>
                <option value="Studio">Studio</option>
                <option value="Shop">Shop / Commercial</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Unit Type</label>
              <select 
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Penthouse">Penthouse</option>
                <option value="Office">Office</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Area (Sq.Ft) *</label>
              <input 
                type="number"
                className="form-input" 
                placeholder="1250"
                value={formData.area}
                onChange={(e) => setFormData({...formData, area: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Facing</label>
              <select 
                className="form-select"
                value={formData.facing}
                onChange={(e) => setFormData({...formData, facing: e.target.value})}
              >
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="North-East">North-East</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Total Price (₹) *</label>
              <input 
                type="number"
                className="form-input" 
                placeholder="5500000"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="AVAILABLE">Available</option>
                <option value="BLOCKED">Blocked</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>
          </div>

          <div className="c-modal-footer mt-2xl">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner spinner-xs"></div> : <Save size={16} />}
              {unit ? 'Update Unit' : 'Create Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
