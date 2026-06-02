import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { projectService } from '../../services/api';
import { 
  Plus, Search, Calendar, User, Home, 
  CreditCard, CheckCircle, Clock, XCircle,
  FileText, Download, MoreVertical, ExternalLink,
  Table as TableIcon
} from 'lucide-react';
import PaymentPlanModal from '../../components/builder/PaymentPlanModal';
import './Builder.css';

export default function BookingsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchBookings();
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

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await projectService.builderGetBookings(selectedProjectId);
      setBookings(res.data?.data || []);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Sales & Bookings"
      subtitle="Track unit sales and payment collections"
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
          <button className="btn btn-primary"><Plus size={16} /> New Booking</button>
        </div>
      }
    >
      {selectedBooking && (
        <PaymentPlanModal 
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          booking={selectedBooking}
          projectId={selectedProjectId}
          onSuccess={fetchBookings}
        />
      )}

      <div className="builder-toolbar">
        <div className="flex gap-md">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input className="form-input" placeholder="Search customer or unit..." />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : (
        <div className="table-container card-flat" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking Info</th>
                <th>Customer</th>
                <th>Unit</th>
                <th>Deal Value</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking.id}>
                  <td>
                    <div className="font-semibold">#{booking.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted">{new Date(booking.bookingDate).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <div className="font-medium">{booking.customer?.name}</div>
                    <div className="text-xs text-muted">{booking.customer?.phone}</div>
                  </td>
                  <td>
                    <div className="badge badge-gray">{booking.unit?.unitNumber}</div>
                    <div className="text-xs text-muted mt-1">{booking.unit?.bhk}</div>
                  </td>
                  <td className="font-bold">₹{booking.totalAmount.toLocaleString()}</td>
                  <td>
                    <div className="text-sm">₹{booking.paidAmount.toLocaleString()}</div>
                    <div className="text-xs text-muted">{Math.round((booking.paidAmount / booking.totalAmount) * 100)}% collected</div>
                  </td>
                  <td>
                    <span className={`status-pill ${
                      booking.status === 'CONFIRMED' ? 'badge-green' : 
                      booking.status === 'CANCELLED' ? 'badge-red' : 'badge-amber'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-xs">
                      <button 
                        className="btn btn-icon btn-ghost btn-sm" 
                        title="Payment Plan"
                        onClick={() => { setSelectedBooking(booking); setShowPlanModal(true); }}
                      >
                        <TableIcon size={14} />
                      </button>
                      <button className="btn btn-icon btn-ghost btn-sm" title="Agreement"><FileText size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-2xl">
                    <CheckCircle size={48} className="mb-md opacity-20" />
                    <p>No bookings found for this project.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageWrapper>
  );
}
