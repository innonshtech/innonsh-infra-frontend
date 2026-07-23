import React, { useState } from 'react';
import { Camera, Upload, Loader, Image as ImageIcon, FileText, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { supabase, uploadFile } from '../../config/supabase';

const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function CompletionProofModal({ taskName, initialProgress = 100, initialNotes = '', initialImageUrl = '', onClose, onSubmit }) {
  const [progress, setProgress] = useState(initialProgress);
  const [notes, setNotes] = useState(initialNotes);
  const [newPhotosList, setNewPhotosList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedUrls = [];

    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) continue;
      if (supabase) {
        try {
          const publicUrl = await uploadFile(file);
          uploadedUrls.push(publicUrl);
        } catch (err) {
          console.error('Supabase upload error:', err);
          const compressed = await compressImage(file);
          uploadedUrls.push(compressed);
        }
      } else {
        const compressed = await compressImage(file);
        uploadedUrls.push(compressed);
      }
    }

    if (uploadedUrls.length > 0) {
      setNewPhotosList(prev => [...prev, ...uploadedUrls]);
      if (toast?.success) toast.success(`${uploadedUrls.length} photo(s) attached successfully!`);
    }
    setUploading(false);
  };

  const removeNewPhoto = (index) => {
    setNewPhotosList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const numericProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    try {
      const finalPhotos = newPhotosList.length > 0 
        ? newPhotosList 
        : (initialImageUrl ? [initialImageUrl] : []);
      
      await onSubmit({
        progress: numericProgress,
        status: numericProgress === 100 ? 'COMPLETED' : numericProgress > 0 ? 'IN_PROGRESS' : 'PENDING',
        completionNotes: notes,
        completionImageUrl: finalPhotos[0] || '',
        completionImages: finalPhotos
      });
    } catch (err) {
      toast.error('Failed to submit progress proof');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Update Progress & Proof: {taskName}</h3>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-lg">
            
            {/* Progress Percentage Input */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Progress Percentage (%)</label>
                <span className="badge badge-purple" style={{ fontSize: 12, fontWeight: 700 }}>{progress}% Complete</span>
              </div>
              <div className="flex items-center gap-md">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5"
                  value={progress} 
                  onChange={e => setProgress(Number(e.target.value))} 
                  style={{ flex: 1, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  className="att-input" 
                  style={{ width: 65, textAlign: 'center', height: 34, fontWeight: 600 }}
                  value={progress} 
                  onChange={e => setProgress(Number(e.target.value))} 
                />
              </div>
            </div>

            {/* Multi-Photo Upload Area */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Camera size={14} color="var(--accent-primary)" /> Site Proof Photos (Upload 1 or Multiple)
                </span>
                {newPhotosList.length > 0 && (
                  <span className="badge badge-purple" style={{ fontSize: 10 }}>{newPhotosList.length} Selected</span>
                )}
              </label>

              {/* Upload Dropzone */}
              <div style={{ 
                border: '2px dashed var(--accent-primary)', borderRadius: 8, padding: 16, 
                textAlign: 'center', cursor: 'pointer', position: 'relative',
                background: 'var(--bg-tertiary)'
              }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handlePhotoUpload} 
                  disabled={uploading}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                />
                {uploading ? (
                  <div style={{ color: 'var(--accent-primary)', fontSize: 13, padding: '12px 0' }}>
                    <Loader className="animate-spin" size={24} style={{ marginBottom: 6, display: 'inline-block' }} /><br/>
                    Uploading photo(s)...
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '4px 0' }}>
                    <Upload size={24} style={{ marginBottom: 6, display: 'inline-block', color: 'var(--accent-primary)' }} /><br/>
                    <strong style={{ color: 'var(--text-primary)' }}>Click or Drag to Upload Multiple Photos</strong><br/>
                    <span>Select 1 or more photos for {progress}% stage</span>
                  </div>
                )}
              </div>

              {/* Attached Photos Grid */}
              {newPhotosList.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginTop: 10 }}>
                  {newPhotosList.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-primary)', height: 75 }}>
                      <img src={url} alt={`Proof thumbnail ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => removeNewPhoto(idx)}
                        style={{
                          position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', 
                          color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Previously Uploaded Photo Reference */}
            {initialImageUrl && newPhotosList.length === 0 && (
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ImageIcon size={12} /> Previous Stage Photo (Reference)
                </div>
                <img 
                  src={initialImageUrl} 
                  alt="Previous proof reference" 
                  style={{ maxHeight: 70, borderRadius: 4, objectFit: 'cover' }} 
                />
              </div>
            )}

            {/* Rich Progress Remarks & Site Log Field */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <FileText size={14} color="var(--accent-primary)" /> Progress Remarks & Site Log
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{notes.length} chars</span>
              </div>

              {/* Quick Tag Chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  '✨ Quality Inspected',
                  '🧱 Materials Ready',
                  '🚧 Site Cleared',
                  '✅ Completed per Specs'
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: 14,
                      padding: '3px 10px',
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => {
                      setNotes(prev => prev ? `${prev} | ${chip}` : chip);
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <textarea
                className="form-textarea"
                rows={3}
                style={{
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  border: '1.5px solid var(--border-secondary)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  resize: 'vertical'
                }}
                placeholder={`Type site observations for ${progress}% stage (e.g., 70% rebar mesh tied, shuttering check passed)...`}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting || uploading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
              {submitting ? 'Saving...' : `Save ${progress}% Progress`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
