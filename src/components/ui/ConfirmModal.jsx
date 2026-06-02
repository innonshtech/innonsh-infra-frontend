import './ConfirmModal.css';
import { AlertCircle, LogOut, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm' }) {
  if (!isOpen) return null;

  return (
    <div className="c-modal-overlay" onClick={onClose}>
      <div className="c-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="c-modal-close" onClick={onClose} title="Wait, go back">
          <X size={18} />
        </button>
        <div className="c-modal-header">
          <div className="c-modal-icon warning">
            <AlertCircle size={24} />
          </div>
          <h3 className="c-modal-title">{title}</h3>
        </div>
        <div className="c-modal-body">
          <p>{message}</p>
        </div>
        <div className="c-modal-footer">
          <button className="c-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
