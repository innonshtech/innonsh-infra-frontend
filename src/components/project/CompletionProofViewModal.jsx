import React from 'react';
import { Camera } from 'lucide-react';

export default function CompletionProofViewModal({ taskName, notes, imageUrl, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Completion Details: {taskName}</h3>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body flex flex-col gap-lg">
          {imageUrl && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                📸 Proof Photo
              </label>
              <div 
                style={{ 
                  borderRadius: 8, 
                  overflow: 'hidden', 
                  border: '1px solid var(--border-primary)',
                  maxHeight: '260px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-tertiary)'
                }}
              >
                <img 
                  src={imageUrl} 
                  alt="Task completion proof" 
                  style={{ width: '100%', maxHeight: '260px', objectFit: 'contain' }} 
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              📝 Completion Notes & Remarks
            </label>
            <div 
              style={{ 
                background: 'var(--bg-tertiary)', 
                border: '1px solid var(--border-primary)', 
                borderRadius: 8, 
                padding: '12px 16px',
                fontSize: '13px',
                lineHeight: '1.5',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap'
              }}
            >
              {notes || 'No notes provided.'}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
