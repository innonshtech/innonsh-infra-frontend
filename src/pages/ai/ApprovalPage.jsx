import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService, projectService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { FileCheck, Plus, Sparkles, Scale, Info, AlertTriangle, Calendar, ClipboardList, Upload, MessageSquare, Loader2, Star, Check, Users, History, FolderPlus } from 'lucide-react';
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

  // Wizard tabs selection
  const [formTab, setFormTab] = useState('basics');
  // Main top tabs selection
  const [activeMainTab, setActiveMainTab] = useState('calculate'); // 'calculate' or 'history'

  // Form states
  const [authorityName, setAuthorityName] = useState('Municipal Corporation');
  const [status, setStatus] = useState('APPLIED');
  const [submissionDate, setSubmissionDate] = useState('');
  const [objectionLetter, setObjectionLetter] = useState(null);
  const [uploadingObjection, setUploadingObjection] = useState(false);

  // Advanced Application References & Timelines
  // Advanced Application References & Timelines
  const [targetSlaDays, setTargetSlaDays] = useState('60');
  const [appRegNumber, setAppRegNumber] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [officerMobile, setOfficerMobile] = useState('');

  // Financial Fees & Cost structures
  const [feesPaid, setFeesPaid] = useState('');
  const [premiumFees, setPremiumFees] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [chatPrompt, setChatPrompt] = useState('');
  const [checkedDocs, setCheckedDocs] = useState({});

  // Feature 1: Approval Type & Category Form states
  const [approvalType, setApprovalType] = useState('Building Plan Approval');
  const [approvalCategory, setApprovalCategory] = useState('Construction');
  const [mandatoryOptional, setMandatoryOptional] = useState('Mandatory');

  // Feature 2: Project, JV, and Land select references
  const [projectId, setProjectId] = useState('');
  const [jvId, setJvId] = useState('');
  const [landId, setLandId] = useState('');

  // Lookups data arrays
  const [projectsList, setProjectsList] = useState([]);
  const [jvsList, setJvsList] = useState([]);
  const [landsList, setLandsList] = useState([]);

  useEffect(() => {
    fetchTasks();
    const fetchLookups = async () => {
      try {
        const [projRes, jvRes, landRes] = await Promise.all([
          projectService.getAll(),
          aiService.getJVAgreements(),
          aiService.getLandPlots()
        ]);
        setProjectsList(projRes.data?.data || []);
        setJvsList(jvRes.data?.data || []);
        setLandsList(landRes.data?.data || []);
      } catch (err) {
        console.error('Failed to load lookup lists:', err);
      }
    };
    fetchLookups();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      setCheckedDocs(selectedTask.checklistState || {});
    }
  }, [selectedTask]);

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
      toast.error(`Failed to upload objection document: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadingObjection(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      toast.info(`Uploading fee receipt ${file.name}...`);
      const url = await uploadFile(file, 'innonsh-assets');
      setReceiptFile({ name: file.name, url });
      toast.success('Fee receipt uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload fee receipt: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadingReceipt(false);
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
        metadata: {
          targetSlaDays: targetSlaDays ? Number(targetSlaDays) : 60,
          appRegNumber,
          officerName,
          officerMobile,
          feesPaid: feesPaid ? Number(feesPaid) : 0,
          premiumFees: premiumFees ? Number(premiumFees) : 0,
          receiptUrl: receiptFile ? receiptFile.url : undefined,
          checklistState: [],
          approvalType,
          approvalCategory,
          mandatoryOptional,
          projectRef: {
            projectId,
            jvId,
            landId
          }
        }
      };

      toast.info('Analyzing approval timelines and checklists with Gemini AI...');
      const { data } = await aiService.predictApprovalDelay(payload);
      toast.success('Approval task and AI analysis added successfully!');
      
      // Reset form
      setAuthorityName('Municipal Corporation');
      setStatus('APPLIED');
      setSubmissionDate('');
      setObjectionLetter(null);
      setTargetSlaDays('60');
      setAppRegNumber('');
      setOfficerName('');
      setOfficerMobile('');
      setFeesPaid('');
      setPremiumFees('');
      setReceiptFile(null);
      setChatPrompt('');
      setApprovalType('Building Plan Approval');
      setApprovalCategory('Construction');
      setMandatoryOptional('Mandatory');
      setProjectId('');
      setJvId('');
      setLandId('');

      // Refresh list
      const updatedTasks = [data.data, ...tasks];
      setTasks(updatedTasks);
      setSelectedTask(data.data);
      setActiveMainTab('history');
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
        {/* Top-Level Navigation Tabs */}
        <div className="premium-tabs-container" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveMainTab('calculate')}
            className={`premium-tab-btn ${activeMainTab === 'calculate' ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeMainTab === 'calculate' ? '#059669' : 'transparent',
              color: activeMainTab === 'calculate' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FolderPlus size={16} />
            Track New Approval
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            className={`premium-tab-btn ${activeMainTab === 'history' ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeMainTab === 'history' ? '#059669' : 'transparent',
              color: activeMainTab === 'history' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <History size={16} />
            Approvals History & Plans
          </button>
        </div>

        {activeMainTab === 'calculate' && (
          <div className="ai-card w-full">
            <div className="ai-card-header">
              <h2 className="ai-card-title">
                <Plus size={18} />
                Add New Approval Application
              </h2>
            </div>
            <div className="ai-card-body" style={{ marginTop: '1rem' }}>
              {/* Form Wizard Navigation */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '4px', overflowX: 'auto', background: '#f8fafc', padding: '6px', borderRadius: '8px' }}>
                {[
                  { id: 'basics', label: '1. Basics & Details', icon: <ClipboardList size={14} /> },
                  { id: 'workflow', label: '2. Workflow & Officers', icon: <Users size={14} /> },
                  { id: 'financials', label: '3. Fees & Uploads', icon: <Scale size={14} /> },
                  { id: 'upload', label: '4. Checklist & Submit', icon: <Upload size={14} /> }
                ].map(tab => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setFormTab(tab.id)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: 'none',
                      background: formTab === tab.id ? '#059669' : 'transparent',
                      color: formTab === tab.id ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

            <form onSubmit={handleSubmit}>
              
              {/* Form Tab 1: Application Basics */}
              {/* Form Tab 1: Basics & Details */}
              {formTab === 'basics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Lookup references */}
                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Link Project</label>
                      <select
                        className="ai-select"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                      >
                        <option value="">-- Select Project --</option>
                        {projectsList.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Link JV Agreement</label>
                      <select
                        className="ai-select"
                        value={jvId}
                        onChange={(e) => setJvId(e.target.value)}
                      >
                        <option value="">-- Select JV Agreement --</option>
                        {jvsList.map(jv => (
                          <option key={jv.id} value={jv.id}>{jv.name || 'Joint Venture Plan'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Link Land Plot</label>
                      <select
                        className="ai-select"
                        value={landId}
                        onChange={(e) => setLandId(e.target.value)}
                      >
                        <option value="">-- Select Land Plot --</option>
                        {landsList.map(l => (
                          <option key={l.id} value={l.id}>{l.surveyNumber || l.title || 'Acquired Land'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Authority / Agency *</label>
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
                      <label className="ai-label">Current Status *</label>
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
                    <div className="ai-form-group">
                      <label className="ai-label">Application Reg. Number</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="e.g. MH-RERA-2026-904"
                        value={appRegNumber}
                        onChange={(e) => setAppRegNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Approval Type *</label>
                      <select
                        className="ai-select"
                        value={approvalType}
                        onChange={(e) => setApprovalType(e.target.value)}
                      >
                        <option value="Building Plan Approval">Building Plan Approval</option>
                        <option value="Fire NOC">Fire NOC</option>
                        <option value="Environmental NOC">Environmental NOC</option>
                        <option value="Water Connection Approval">Water Connection Approval</option>
                        <option value="Airport NOC">Airport NOC</option>
                        <option value="RERA Registration">RERA Registration</option>
                        <option value="Drainage NOC">Drainage NOC</option>
                      </select>
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Approval Category *</label>
                      <select
                        className="ai-select"
                        value={approvalCategory}
                        onChange={(e) => setApprovalCategory(e.target.value)}
                      >
                        <option value="Construction">Construction</option>
                        <option value="Environmental">Environmental</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Aviation">Aviation</option>
                        <option value="Legal & RERA">Legal & RERA</option>
                      </select>
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Mandatory / Optional *</label>
                      <select
                        className="ai-select"
                        value={mandatoryOptional}
                        onChange={(e) => setMandatoryOptional(e.target.value)}
                      >
                        <option value="Mandatory">Mandatory</option>
                        <option value="Optional">Optional</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('workflow')}>Next: Workflow & Officers →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 2: Workflow & Officers */}
              {formTab === 'workflow' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Submission Date *</label>
                      <input
                        type="date"
                        className="ai-input"
                        value={submissionDate}
                        onChange={(e) => setSubmissionDate(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Target SLA Timeline (Days)</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 60"
                        value={targetSlaDays}
                        onChange={(e) => setTargetSlaDays(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Contact Officer Name</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="e.g. Suresh Kadam"
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Officer Mobile No.</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="e.g. +91 98200 88888"
                        value={officerMobile}
                        onChange={(e) => setOfficerMobile(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('basics')}>← Back</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('financials')}>Next: Fees & Uploads →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 3: Fees & Document Uploads */}
              {formTab === 'financials' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Application Fees Paid (INR)</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 450000"
                        value={feesPaid}
                        onChange={(e) => setFeesPaid(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Additional Premium / Fast-track Fees (INR)</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 150000"
                        value={premiumFees}
                        onChange={(e) => setPremiumFees(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    {/* Objection letter */}
                    <div className="ai-form-group">
                      <label className="ai-label">Objection Notice Letter (If Query Raised)</label>
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

                    {/* Fee receipt */}
                    <div className="ai-form-group">
                      <label className="ai-label">Payment Fee Receipt Document</label>
                      <label className={`ai-upload-zone ${receiptFile ? 'ai-uploaded-file' : ''}`} style={{ padding: '0.85rem' }}>
                        <Upload className="ai-upload-icon" size={16} />
                        <span className="ai-upload-text" style={{ fontSize: '0.75rem' }}>
                          {uploadingReceipt ? 'Uploading to Supabase...' : (receiptFile ? receiptFile.name : 'Upload Fee Receipt')}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                          style={{ display: 'none' }}
                          onChange={handleReceiptUpload}
                          disabled={uploadingReceipt}
                        />
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('workflow')}>← Back</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('upload')}>Next: Checklist & Submit →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 4: Checklist & Submit */}
              {formTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* AI Natural Language Chatbox Analyzer */}
                  <div className="ai-form-group">
                    <label className="ai-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} /> Custom Prompt / Additional Instructions (Optional)
                    </label>
                    <textarea
                      placeholder="Describe any additional constraints or instructions in plain text (e.g. 'Review setbacks and fire NOC clearances.')"
                      rows="3"
                      className="ai-input"
                      style={{ resize: 'vertical', minHeight: '100px', padding: '10px 12px' }}
                      value={chatPrompt}
                      onChange={(e) => setChatPrompt(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('financials')} style={{ flex: 1 }}>← Back</button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg flex justify-center items-center gap-2"
                      disabled={submitting}
                      style={{ flex: 2 }}
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
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {activeMainTab === 'history' && (
        <>
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
                <p className="ai-thinking-text">Gemini AI is reviewing objection details and calculating delay hazards...</p>
              </div>
            </div>
          ) : selectedTask ? (
            <div className="ai-card-body">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  <div className="ai-score-circle" style={{ background: 'linear-gradient(135deg, #059669 0%, #065f46 100%)', fontSize: '11px', fontWeight: 'bold' }}>
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
              <div style={{ maxHeight: '580px', overflowY: 'auto', paddingRight: '12px', marginRight: '-6px' }}>

                {/* Grid 1: AI Readiness & Expected Approval Timeline */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  
                  {/* 1. AI Readiness Score Card (⭐ Rating) */}
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>AI Approval Readiness</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                        <h4 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                          {selectedTask.readinessScore || 91}%
                        </h4>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#047857', fontWeight: 'bold' }}>
                          {selectedTask.readinessStatus || 'Ready for Submission'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {(() => {
                          const score = selectedTask.readinessScore || 91;
                          const starsCount = Math.min(5, Math.ceil(score / 20));
                          return [1, 2, 3, 4, 5].map(starNum => (
                            <Star
                              key={starNum}
                              size={16}
                              fill={starNum <= starsCount ? '#eab308' : 'transparent'}
                              stroke="#eab308"
                            />
                          ));
                        })()}
                      </div>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                      Ready to submit. Minimum validation hurdles predicted from query files.
                    </p>
                  </div>

                  {/* 2. Expected Approval Date Projections */}
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Expected Approval Date</span>
                      <h4 style={{ margin: '4px 0', fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
                        {(() => {
                          const subDate = new Date(selectedTask.submissionDate);
                          const estDays = selectedTask.slaTimeline?.expectedDays || 28;
                          const expDate = new Date(subDate.setDate(subDate.getDate() + estDays));
                          return expDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
                        })()}
                      </h4>
                    </div>
                    <div style={{ fontSize: '11px', color: '#334155', marginTop: '6px', lineHeight: '1.4' }}>
                      <div><strong>Sub Date:</strong> {new Date(selectedTask.submissionDate).toLocaleDateString()}</div>
                      <div><strong>Target SLA:</strong> {selectedTask.targetSlaDays || 30} Days</div>
                      <div style={{ color: '#b91c1c', fontWeight: 'bold', marginTop: '2px' }}>
                        <strong>Estimated Delay:</strong> {selectedTask.slaTimeline?.currentDelayDays || 0} Days
                      </div>
                    </div>
                  </div>

                </div>

                {/* Grid 2: Connected Project References & Cost structures */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  
                  {/* Project references */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>🔗 Linked Reference Context</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                      <div><strong>Project:</strong> {selectedTask.projectRef?.projectName || 'N/A'}</div>
                      <div><strong>JV Agreement:</strong> {selectedTask.projectRef?.jvName || 'N/A'}</div>
                      <div><strong>Land Plot:</strong> {selectedTask.projectRef?.landNumber || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Financial costs */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>💳 Application Fees Details</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                      <div><strong>Filing Fees Paid:</strong> ₹{(selectedTask.feesPaid || 0).toLocaleString()}</div>
                      <div><strong>Fast-track SLA Fees:</strong> ₹{(selectedTask.premiumFees || 0).toLocaleString()}</div>
                      <div><strong>Total Investment:</strong> ₹{((selectedTask.feesPaid || 0) + (selectedTask.premiumFees || 0)).toLocaleString()}</div>
                    </div>
                  </div>

                </div>

                {/* 3. Approval Progress Stepper Dashboard */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>📋 Approval Workflow Milestones</h4>
                  {selectedTask.progressSteps && selectedTask.progressSteps.length > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      {selectedTask.progressSteps.map((step, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: step.status === 'COMPLETED' ? '#e6f4ea' : '#f1f5f9',
                            border: `1.5px solid ${step.status === 'COMPLETED' ? '#137333' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: step.status === 'COMPLETED' ? '#137333' : '#64748b',
                            fontSize: '10px'
                          }}>
                            {step.status === 'COMPLETED' ? <Check size={12} /> : index + 1}
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: step.status === 'COMPLETED' ? '#1e293b' : '#64748b' }}>{step.stepName}</div>
                            {step.date && <div style={{ fontSize: '9px', color: '#64748b' }}>{step.date}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>No milestones details logged yet.</div>
                  )}
                </div>

                {/* 4. Missing Documents Metrics and actions checklist */}
                <div className="ai-report-section" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <h3 className="ai-report-section-title" style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', borderBottom: '1px solid #f1f5f9', pb: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} className="text-amber-500" /> Objection Document Compliance Metrics
                  </h3>
                  
                  {/* Metrics Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '14px 0', textAlign: 'center' }}>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                        {selectedTask.missingDocMetrics?.required || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Required</div>
                    </div>
                    <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#047857' }}>
                        {selectedTask.missingDocMetrics?.uploaded || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Uploaded</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#b91c1c' }}>
                        {selectedTask.missingDocMetrics?.missing || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Missing</div>
                    </div>
                  </div>
 
                  {/* List of Pending Documents */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    <h5 style={{ fontSize: '11px', margin: '0 0 4px 0', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Pending submissions checklist:</h5>
                    {selectedTask.missingDocMetrics?.pendingList && selectedTask.missingDocMetrics.pendingList.length > 0 ? (
                      selectedTask.missingDocMetrics.pendingList.map((doc, idx) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: checkedDocs[idx] ? '#94a3b8' : '#334155', textDecoration: checkedDocs[idx] ? 'line-through' : 'none', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!checkedDocs[idx]}
                            onChange={() => setCheckedDocs(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            style={{ accentColor: '#059669', width: '15px', height: '15px', cursor: 'pointer' }}
                          />
                          {doc}
                        </label>
                      ))
                    ) : (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>No pending submissions checklist items required.</div>
                    )}
                  </div>
                </div>

                {/* 5. AI Objection Summary structured cards */}
                <div className="ai-report-section" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <h3 className="ai-report-section-title" style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', borderBottom: '1px solid #f1f5f9', pb: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCheck size={16} className="text-emerald-500" /> Structured Objections Log
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    {selectedTask.objectionQueries && selectedTask.objectionQueries.length > 0 ? (
                      selectedTask.objectionQueries.map((query, idx) => (
                        <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Query {query.queryNum || idx + 1}</span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: query.priority === 'HIGH' ? '#fef2f2' : '#fffbeb',
                              color: query.priority === 'HIGH' ? '#b91c1c' : '#d97706'
                            }}>{query.priority} Priority</span>
                          </div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#1e293b', lineHeight: '1.4' }}>{query.text}</p>
                          {query.suggestedAction && (
                            <div style={{ fontSize: '11px', color: '#475569', background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px' }}>
                              <strong>Suggested Action:</strong> {query.suggestedAction}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>No formal objection queries logged.</div>
                    )}
                  </div>
                </div>

                {/* 6. Resubmission History Timeline Log */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>🗂️ Application Resubmission History</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedTask.resubmissionHistory && selectedTask.resubmissionHistory.length > 0 ? (
                      selectedTask.resubmissionHistory.map((sub, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: idx < selectedTask.resubmissionHistory.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                          <span style={{ fontWeight: 'bold', color: '#334155' }}>Submission {sub.submissionNum}</span>
                          <span style={{ color: '#475569' }}>{sub.date}</span>
                          <span style={{
                            fontWeight: 'bold',
                            color: sub.status === 'Rejected' ? '#b91c1c' : (sub.status === 'Query Raised' ? '#d97706' : '#64748b')
                          }}>{sub.status}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>No resubmission history recorded.</div>
                    )}
                  </div>
                </div>
 
                {/* 7. AI Suggestions Quick Action List */}
                <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#14532d', letterSpacing: '0.05em' }}>⚡ AI Recommendations</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedTask.aiSuggestions && selectedTask.aiSuggestions.length > 0 ? (
                      selectedTask.aiSuggestions.map((sug, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#14532d' }}>
                          <Check size={14} style={{ color: '#16a34a' }} />
                          <span>{sug}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>No suggestions generated.</div>
                    )}
                  </div>
                </div>

                {/* 8. Raw delay prediction */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <Sparkles size={16} className="text-pink-500" />
                    Detailed Bottleneck Analysis
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedTask.aiPrediction ? formatMarkdown(selectedTask.aiPrediction) : 'No detailed prediction text available.'}
                  </div>
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
        </>
      )}
      </div>
    </div>
  );
}
