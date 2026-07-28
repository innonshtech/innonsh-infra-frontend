import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { FileCheck, Plus, Sparkles, Scale, Info, AlertTriangle, Calendar, ClipboardList, Upload, MessageSquare, Loader2 } from 'lucide-react';
import { uploadFile } from '../../config/supabase';
import './AiModules.css';

function formatMarkdown(text) {
  if (!text) return '';
  return text.split('\n').map((line, idx) => {
    let cleanLine = line.trim();
    if (!cleanLine) return <div key={idx} className="h-2" />;
    
    const isBullet = cleanLine.startsWith('-') || cleanLine.startsWith('*');
    if (isBullet) {
      cleanLine = cleanLine.substring(1).trim();
    }
    
    const parts = cleanLine.split('**');
    const formattedParts = parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-slate-800 font-bold">{part}</strong>;
      }
      return part;
    });

    if (isBullet) {
      return (
        <li key={idx} className="ml-4 list-disc text-slate-600 my-1 leading-relaxed text-xs">
          {formattedParts}
        </li>
      );
    }

    return (
      <p key={idx} className="text-slate-600 mb-2 leading-relaxed text-xs">
        {formattedParts}
      </p>
    );
  });
}

const columns = [
  { id: 'APPLIED', label: 'Applied / In Progress' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'QUERY_RAISED', label: 'Query Raised' },
  { id: 'APPROVED', label: 'Approved' }
];

export default function ApprovalPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [chatStarting, setChatStarting] = useState(false);

  // Form states
  const [authorityName, setAuthorityName] = useState('Municipal Corporation');
  const [status, setStatus] = useState('APPLIED');
  const [submissionDate, setSubmissionDate] = useState('');
  const [objectionLetter, setObjectionLetter] = useState(null);
  const [uploadingObjection, setUploadingObjection] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getApprovalTasks();
      setTasks(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedTask(data.data[0]);
      }
    } catch (err) {
      toast.error('Failed to load approval tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleObjectionUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingObjection(true);
    try {
      toast.info(`Uploading ${file.name} to cloud storage...`);
      const url = await uploadFile(file, 'innonsh-assets');
      setObjectionLetter({ name: file.name, url });
      toast.success('Objection document uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload objection document.');
    } finally {
      setUploadingObjection(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authorityName || !status || !submissionDate) {
      toast.warning('Please fill in Authority name, status, and submission date');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        authorityName,
        status,
        submissionDate,
        objectionLetter: objectionLetter ? { url: objectionLetter.url, mimeType: 'application/pdf' } : undefined,
      };

      toast.info('Analyzing approval timelines and checklists with Gemini AI...');
      const { data } = await aiService.predictApprovalDelay(payload);
      toast.success('Approval task and AI analysis added successfully!');
      
      // Reset form
      setAuthorityName('Municipal Corporation');
      setStatus('APPLIED');
      setSubmissionDate('');
      setObjectionLetter(null);

      // Refresh list
      const updatedTasks = [data.data, ...tasks];
      setTasks(updatedTasks);
      setSelectedTask(data.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gemini approval analysis failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!selectedTask) return;
    setChatStarting(true);
    try {
      const prompt = `Here is the NOC Regulatory Approval details:
- **Authority / Agency Name**: ${selectedTask.authorityName}
- **Current Status**: ${selectedTask.status}
- **Submission Date**: ${new Date(selectedTask.submissionDate).toLocaleDateString()}

Estimated Approval Delay Forecast:
${selectedTask.aiPrediction || 'N/A'}

Objection & Missing Documents Checklist:
${selectedTask.aiMissingDocuments || 'N/A'}

Immediate Action Steps:
${selectedTask.aiNextSteps || 'N/A'}

Please advise me on the legal compliance strategy, document drafting checklist, or how to expedite this approval process.`;

      toast.info('Initializing custom AI Board chat session...');
      const res = await aiService.chat({ message: { text: prompt } });
      const newSessionId = res.data?.data?.sessionId || res.data?.sessionId;
      
      if (newSessionId) {
        toast.success('Chat discussion ready! Redirecting to AI Board...');
        navigate('/ai-board', { state: { openSessionId: newSessionId } });
      } else {
        toast.error('Could not initialize chat session.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to start chat discussion.');
    } finally {
      setChatStarting(false);
    }
  };

  // Group tasks by their status column
  const getTasksByStatus = (statusId) => {
    return tasks.filter(task => task.status === statusId);
  };

  return (
    <div className="ai-page-container">
      {/* Header */}
      <div className="ai-header">
        <h1 className="ai-title">
          <FileCheck className="text-primary" size={32} />
          AI Approval & Compliance Tracker
        </h1>
        <p className="ai-subtitle">
          Manage regulatory approvals (RERA, Fire NOC, Water, Environment). Upload government objection letters, and let Gemini extract missing documents and predict delay days.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Top: Add New Approval Application Form (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <Plus size={18} />
              Add New Approval Application
            </h2>
          </div>
          <div className="ai-card-body" style={{ marginTop: '1rem' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Authority / Agency</label>
                  <select
                    className="ai-select"
                    value={authorityName}
                    onChange={(e) => setAuthorityName(e.target.value)}
                  >
                    <option value="Municipal Corporation">Municipal Corporation</option>
                    <option value="RERA Board">RERA Board</option>
                    <option value="State Environment Committee">State Environment Committee</option>
                    <option value="Fire Department NOC">Fire Department NOC</option>
                    <option value="Water and Sewerage Board">Water and Sewerage Board</option>
                    <option value="Airport NOC Authority">Airport NOC Authority</option>
                    <option value="Pollution Control Board">Pollution Control Board</option>
                  </select>
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Current Status</label>
                  <select
                    className="ai-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="APPLIED">Applied / In Progress</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="QUERY_RAISED">Query Raised</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Submission Date</label>
                  <input
                    type="date"
                    className="ai-input"
                    value={submissionDate}
                    onChange={(e) => setSubmissionDate(e.target.value)}
                  />
                </div>
                
                {/* File Upload (Objection letter) */}
                <div className="ai-form-group">
                  <label className="ai-label">Objection Letter / Query Slip (If Query Raised)</label>
                  <label className={`ai-upload-zone ${objectionLetter ? 'ai-uploaded-file' : ''}`} style={{ padding: '0.85rem' }}>
                    <Upload className="ai-upload-icon" size={16} />
                    <span className="ai-upload-text" style={{ fontSize: '0.75rem' }}>
                      {uploadingObjection ? 'Uploading to Supabase...' : (objectionLetter ? objectionLetter.name : 'Upload Query Document')}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                      style={{ display: 'none' }}
                      onChange={handleObjectionUpload}
                      disabled={uploadingObjection}
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full flex justify-center items-center gap-2 mt-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner" /> Predicting delays with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Add Application & Run Delay Predictor
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Middle: Kanban Board (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <ClipboardList size={18} />
              Compliance Stages
            </h2>
          </div>
          <div className="ai-card-body p-3" style={{ marginTop: '1rem' }}>
            {loading ? (
              <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
            ) : (
              <div className="ai-kanban-board">
                {columns.map((col) => {
                  const colTasks = getTasksByStatus(col.id);
                  return (
                    <div key={col.id} className="ai-kanban-col">
                      <div className="ai-kanban-col-header">
                        <span>{col.label}</span>
                        <span className="ai-kanban-count">{colTasks.length}</span>
                      </div>
                      <div className="ai-kanban-cards">
                        {colTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`ai-kanban-card ${selectedTask?.id === task.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/10' : ''}`}
                            onClick={() => setSelectedTask(task)}
                          >
                            <div className="ai-kanban-card-title">{task.authorityName}</div>
                            <div className="ai-kanban-card-date">
                              Sub: {new Date(task.submissionDate).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: AI Bottleneck report (Full Width and Scrollable) */}
        <div className="ai-card w-full">
          {submitting ? (
            <div className="ai-card-body flex flex-col items-center justify-center min-h-[300px]">
              <div className="ai-loading-container" style={{ padding: '2rem 0' }}>
                <div className="spinner spinner-lg spinner-primary" />
                <p className="ai-thinking-text">🤖 Gemini AI is reviewing objection details and calculating delay hazards...</p>
              </div>
            </div>
          ) : selectedTask ? (
            <div className="ai-card-body">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  <div className="ai-score-circle" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>
                    NOC
                  </div>
                  <div className="ai-score-details">
                    <span className="ai-score-label">{selectedTask.authorityName}</span>
                    <span className="ai-score-status" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      Status: <span className="capitalize">{selectedTask.status.toLowerCase().replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>

                {/* Chat Integration Button! */}
                <button
                  onClick={handleStartChat}
                  disabled={chatStarting}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                  style={{ fontSize: '11px', padding: '6px 12px', height: 'fit-content' }}
                  title="Open in AI Board to ask follow-up questions"
                >
                  {chatStarting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <MessageSquare size={14} />
                  )}
                  Start Chat Discussion
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '12px', marginRight: '-6px' }}>

                {/* Delay prediction */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <Sparkles size={16} className="text-pink-500" />
                    Estimated Approval Delay
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedTask.aiPrediction ? formatMarkdown(selectedTask.aiPrediction) : 'No delay forecast available.'}
                  </div>
                </div>

                {/* Missing docs */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Objection & Missing Documents checklist
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedTask.aiMissingDocuments ? formatMarkdown(selectedTask.aiMissingDocuments) : 'No documents identified as missing.'}
                  </div>
                </div>

                {/* Next steps */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <Scale size={16} className="text-slate-500" />
                    Immediate Action Steps
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedTask.aiNextSteps ? formatMarkdown(selectedTask.aiNextSteps) : 'No action list generated.'}
                  </div>
                </div>

                {/* Info footer */}
                <div className="border-t border-slate-200 pt-4 mt-6 text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={14} />
                  <span>Submitted on: {new Date(selectedTask.submissionDate).toLocaleDateString()}</span>
                </div>

              </div>
            </div>
          ) : (
            <div className="ai-card-body flex flex-col items-center justify-center text-center p-8 min-h-[150px]">
              <Info size={48} className="text-slate-300 mb-2" />
              <h3 className="font-semibold text-slate-700">No NOC Selected</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[280px]">Select a task card from the Kanban board to inspect the compliance reports.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
