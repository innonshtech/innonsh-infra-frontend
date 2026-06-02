import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { projectService } from '../../services/api';
import { 
  Plus, Search, Filter, LayoutGrid, List, 
  MapPin, Home, Info, IndianRupee, Layers,
  ChevronDown, MoreVertical, Edit, Trash2
} from 'lucide-react';
import UnitModal from '../../components/builder/UnitModal';
import './Builder.css';

export default function UnitsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('grid'); // grid or list
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchUnits();
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const res = await projectService.builderGetAll();
      const data = res.data?.data || [];
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch {
      toast.error('Failed to load projects');
    }
  };

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await projectService.builderGetUnits(selectedProjectId);
      setUnits(res.data?.data || []);
    } catch {
      toast.error('Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  // Group units by floor
  const unitsByFloor = units.reduce((acc, unit) => {
    const floor = unit.floorNumber || 0;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(unit);
    return acc;
  }, {});

  const sortedFloors = Object.keys(unitsByFloor).sort((a, b) => b - a);

  return (
    <PageWrapper
      title="Inventory Management"
      subtitle="Visual map of units and occupancy"
      actions={
        <div className="flex gap-md">
          <select 
            className="form-select" 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Units
          </button>
        </div>
      }
    >
      <UnitModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        projectId={selectedProjectId}
        onSuccess={fetchUnits}
      />

      <div className="builder-toolbar">
        <div className="flex gap-md">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input className="form-input" placeholder="Search unit number..." />
          </div>
          <div className="status-filters flex gap-sm">
            <span className="status-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Available</span>
            <span className="status-pill" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Booked</span>
            <span className="status-pill" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Sold</span>
          </div>
        </div>
        <div className="view-toggle">
          <button className={`btn btn-icon btn-ghost ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}><LayoutGrid size={16} /></button>
          <button className={`btn btn-icon btn-ghost ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}><List size={16} /></button>
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : (
        <div className="units-container">
          {sortedFloors.map(floor => (
            <div key={floor} className="floor-section">
              <h4 className="floor-title">{floor > 0 ? `${floor}${getOrdinal(floor)} Floor` : 'Ground Floor'}</h4>
              <div className="units-grid">
                {unitsByFloor[floor].map(unit => (
                  <div key={unit.id} className={`unit-card ${unit.status.toLowerCase()}`}>
                    <div className="flex justify-between items-start">
                      <div className="unit-number">{unit.unitNumber}</div>
                      <button className="btn btn-icon btn-ghost btn-xs"><Info size={12} /></button>
                    </div>
                    <div className="unit-type">{unit.bhk || 'N/A'} • {unit.type || 'Flat'}</div>
                    <div className="mt-md font-bold text-sm">₹{(unit.price / 100000).toFixed(1)}L</div>
                    <div className="text-xs text-muted mt-1">{unit.area || 0} Sq.Ft</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {units.length === 0 && (
            <div className="empty-state py-2xl">
              <Layers size={48} className="mb-md text-muted" />
              <h3>No units found</h3>
              <p>Start by adding units to this project.</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
