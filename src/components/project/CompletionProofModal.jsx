import React, { useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function CompletionProofModal({ taskName, onClose, onSubmit }) {
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('Photo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotoPreview(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        completionNotes: notes,
        completionImageUrl: photoPreview || ''
      });
    } catch (err) {
      toast.error('Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3>Submit Proof: {taskName}</h3>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-lg">
            <p className="text-sm text-muted">
              Please provide proof of completion to mark this task as 100% completed.
            </p>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={14} /> Upload Proof Photo (Optional)
              </label>
              <div style={{ 
                border: '2px dashed var(--border-secondary)', borderRadius: 8, padding: 16, 
                textAlign: 'center', cursor: 'pointer', position: 'relative',
                background: photoPreview ? 'transparent' : 'var(--bg-tertiary)'
              }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                />
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Completion proof preview" 
                    style={{ maxHeight: 160, borderRadius: 6, objectFit: 'cover', width: '100%' }} 
                  />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    <Upload size={24} style={{ marginBottom: 6, display: 'inline-block' }} /><br/>
                    Click or drag photo here to upload proof
                  </div>
                )}
              </div>
              {photoPreview && (
                <button 
                  type="button" 
                  className="btn btn-ghost btn-xs text-danger" 
                  style={{ marginTop: 4 }}
                  onClick={() => setPhotoPreview(null)}
                >
                  Remove photo
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Completion Remarks / Notes *</label>
              <textarea 
                className="form-input" 
                rows={3} 
                placeholder="Describe the final outcome (e.g. casting complete, site cleared)..."
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Complete Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
