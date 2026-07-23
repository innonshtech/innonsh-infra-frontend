import React, { useState } from 'react';
import { Camera, Upload, Loader } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { supabase, uploadFile } from '../../config/supabase';
import { projectService } from '../../services/api';

export default function CompletionProofViewModal({ taskId, taskName, notes, imageUrl, onClose, onRefresh }) {
  const [currentImage, setCurrentImage] = useState(imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      if (toast?.warning) toast.warning('Photo must be under 5MB');
      return;
    }

    setUploading(true);
    let photoUrl = '';

    if (supabase) {
      if (toast?.info) toast.info('Uploading photo to cloud storage...');
      try {
        photoUrl = await uploadFile(file);
        if (toast?.success) toast.success('Photo uploaded to cloud!');
      } catch (err) {
        console.error('Supabase upload error:', err);
        if (toast?.warning) toast.warning('Cloud upload failed. Using local preview.');
        photoUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.readAsDataURL(file);
        });
      }
    } else {
      photoUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.readAsDataURL(file);
      });
    }

    setCurrentImage(photoUrl);

    if (taskId) {
      try {
        await projectService.updateTask(taskId, {
          completionImageUrl: photoUrl,
          imageUrl: photoUrl
        });
        if (toast?.success) toast.success('Task proof photo saved successfully!');
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to update task with photo:', err);
        if (toast?.error) toast.error('Failed to save photo to task');
      }
    }
    setUploading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Completion Details: {taskName}</h3>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body flex flex-col gap-lg">
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                📸 Completion Proof Photo
              </span>
              {currentImage && (
                <label className="btn btn-link btn-xs" style={{ cursor: 'pointer', fontSize: 11, padding: 0 }}>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={uploading} />
                  🔄 Change Photo
                </label>
              )}
            </label>

            {currentImage ? (
              <div 
                style={{ 
                  borderRadius: 8, 
                  overflow: 'hidden', 
                  border: '1px solid var(--border-primary)',
                  maxHeight: '260px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-tertiary)',
                  marginTop: 6
                }}
              >
                <img 
                  src={currentImage} 
                  alt="Task completion proof" 
                  style={{ width: '100%', maxHeight: '260px', objectFit: 'contain' }} 
                />
              </div>
            ) : (
              <div 
                style={{ 
                  border: '2px dashed var(--border-secondary)', borderRadius: 8, padding: 20, 
                  textAlign: 'center', cursor: 'pointer', position: 'relative', marginTop: 6,
                  background: 'var(--bg-tertiary)'
                }}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  disabled={uploading}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                />
                {uploading ? (
                  <div style={{ color: 'var(--accent-primary)', fontSize: 13, fontWeight: 500 }}>
                    <Loader className="animate-spin" size={24} style={{ marginBottom: 6, display: 'inline-block' }} /><br/>
                    Uploading photo to cloud...
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    <Upload size={24} style={{ marginBottom: 6, display: 'inline-block' }} /><br/>
                    <strong style={{ color: 'var(--text-primary)' }}>No photo attached yet</strong><br/>
                    Click or drag photo here to upload proof
                  </div>
                )}
              </div>
            )}
          </div>

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
          <button type="button" className="btn btn-primary" onClick={onClose} disabled={uploading}>Close</button>
        </div>
      </div>
    </div>
  );
}
