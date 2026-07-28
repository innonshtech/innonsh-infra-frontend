import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { 
  Map as MapIcon, MapPin, Upload, Sparkles, Scale, Info, ChevronRight, AlertTriangle, 
  Coins, MessageSquare, Loader2, Sliders, LayoutDashboard, ShieldCheck, Plus
} from 'lucide-react';
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
    
    // Replace **text** with <strong>text</strong>
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

export default function LandPlotPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [chatStarting, setChatStarting] = useState(false);

  // Active Tab state
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'history'

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [surveyNumber, setSurveyNumber] = useState('');
  const [googleMapLink, setGoogleMapLink] = useState('');
  const [area, setArea] = useState('');
  const [roadWidth, setRoadWidth] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [zoning, setZoning] = useState('Residential');
  const [soilReport, setSoilReport] = useState(null);
  const [titleDeeds, setTitleDeeds] = useState([]);
  const [uploadingSoil, setUploadingSoil] = useState(false);
  const [uploadingTitleDeeds, setUploadingTitleDeeds] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    fetchPlots();
  }, []);

  // Smooth scroll to top when selected plot changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedPlot]);

  const fetchPlots = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getLandPlots();
      setPlots(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedPlot(data.data[0]);
      }
    } catch (err) {
      toast.error('Failed to load land plots');
    } finally {
      setLoading(false);
    }
  };

  const handleSoilUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSoil(true);
    try {
      toast.info(`Uploading ${file.name} to cloud storage...`);
      const url = await uploadFile(file, 'innonsh-assets');
      setSoilReport({ name: file.name, url });
      toast.success('Soil report uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload soil report.');
    } finally {
      setUploadingSoil(false);
    }
  };

  const handleTitleDeedsUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingTitleDeeds(true);
    try {
      toast.info(`Uploading ${files.length} document(s) to cloud storage...`);
      const uploaded = [];
      for (const file of files) {
        const url = await uploadFile(file, 'innonsh-assets');
        uploaded.push({ name: file.name, url });
      }
      setTitleDeeds(prev => [...prev, ...uploaded]);
      toast.success('Title documents uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload some title documents.');
    } finally {
      setUploadingTitleDeeds(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || (!address && !village) || !area || !roadWidth || !askingPrice) {
      toast.warning('Please fill in all plot details');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        address: address || `${village}, Hinjewadi, Pune, Maharashtra`,
        village,
        surveyNumber,
        googleMapLink,
        area: Number(area),
        roadWidth: Number(roadWidth),
        askingPrice: Number(askingPrice),
        zoning,
        soilReport: soilReport ? { url: soilReport.url, mimeType: 'application/pdf' } : undefined,
        titleDeeds: titleDeeds.length > 0 ? titleDeeds.map(f => ({ url: f.url, name: f.name })) : undefined,
        additionalNotes: additionalNotes || undefined,
      };

      toast.info('Sending plot details to Gemini AI for analysis...');
      const { data } = await aiService.analyzeLandPlot(payload);
      toast.success('Land plot analyzed and registered successfully!');
      
      // Reset form
      setName('');
      setAddress('');
      setVillage('');
      setSurveyNumber('');
      setGoogleMapLink('');
      setArea('');
      setRoadWidth('');
      setAskingPrice('');
      setZoning('Residential');
      setSoilReport(null);
      setTitleDeeds([]);
      setAdditionalNotes('');

      // Refresh list and switch tab
      const updatedPlots = [data.data, ...plots];
      setPlots(updatedPlots);
      setSelectedPlot(data.data);
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gemini analysis failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!selectedPlot) return;
    setChatStarting(true);
    try {
      const prompt = `Here is the Land Plot details:
- **Plot Name**: ${selectedPlot.name}
- **Village**: ${selectedPlot.village || 'Hinjewadi'}
- **Survey Number**: ${selectedPlot.surveyNumber || '45/2'}
- **Zoning**: ${selectedPlot.zoning}
- **Area**: ${selectedPlot.area} sq. ft.
- **Asking Price**: INR ${selectedPlot.askingPrice}
- **AI Score**: ${selectedPlot.aiScore}/10
- **AI Suggested Price**: INR ${selectedPlot.aiSuggestedPrice || 'N/A'}

AI Appreciation Prediction:
${selectedPlot.aiAppreciation || 'N/A'}

AI Geotechnical & Risk Analysis:
${selectedPlot.aiRiskAnalysis || 'N/A'}

Please advise me on the negotiation strategy, construction feasibility, or next steps for this acquisition.`;

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

  return (
    <div className="ai-page-container" style={{ background: '#fafbfc', minHeight: '100vh', padding: '24px' }}>
      
      {/* CSS Overrides directly inside tag to guarantee premium style loader (Green Theme) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .premium-tab-bar {
          display: flex;
          gap: 8px;
          background: rgba(226, 232, 240, 0.4);
          padding: 5px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          width: fit-content;
          margin-bottom: 28px;
          backdrop-filter: blur(8px);
        }
        .premium-tab-btn {
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: none;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .premium-tab-btn.active {
          background: #ffffff;
          color: #059669;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .premium-section-card {
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01), 0 1px 2px rgba(0, 0, 0, 0.005);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .premium-section-card:hover {
          box-shadow: 0 8px 30px rgba(5, 150, 105, 0.02);
        }
        .premium-section-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.05em;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 10px;
        }
      `}} />

      {/* Header */}
      <div className="ai-header" style={{ marginBottom: '32px' }}>
        <h1 className="ai-title" style={{ fontSize: '28px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MapIcon className="text-emerald-600" size={36} />
          AI Land Bank Management
        </h1>
        <p className="ai-subtitle" style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', maxWidth: '800px' }}>
          Input plot parameters and upload geotechnical/legal files. Gemini parses document attachments and estimates Land Scores & Risks.
        </p>
      </div>

      {/* Tabs Menu Navigation Bar */}
      <div className="premium-tab-bar">
        <button
          onClick={() => setActiveTab('create')}
          className={`premium-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
        >
          <Plus size={15} />
          Register New Plot
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`premium-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
          <LayoutDashboard size={15} />
          Land Inventory ({plots.length})
        </button>
      </div>

      <div className="flex flex-col gap-6 w-full">
        
        {/* TAB 1: REGISTER NEW LAND PLOT */}
        {activeTab === 'create' && (
          <div className="premium-section-card w-full" style={{ padding: '30px' }}>
            <div className="premium-section-title">
              <Sliders size={15} className="text-emerald-500" />
              Configure Plot Specifications & Deeds
            </div>
            
            <form onSubmit={handleSubmit} className="mt-4">
              
              {/* Row 1: General Info */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  Plot Classification
                </span>
                <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">Plot Name / Identifier</label>
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="e.g. Green Valley"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Zoning Classification</label>
                    <select
                      className="ai-select"
                      value={zoning}
                      onChange={(e) => setZoning(e.target.value)}
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Agricultural">Agricultural</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Mixed-use">Mixed-use</option>
                    </select>
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Village / Locality</label>
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="e.g. Hinjewadi"
                      value={village}
                      onChange={(e) => {
                        setVillage(e.target.value);
                        setAddress(`${e.target.value}, Pune, Maharashtra`);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Land Size details */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  Coordinates & Layout Area
                </span>
                <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">Survey Number</label>
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="e.g. 45/2"
                      value={surveyNumber}
                      onChange={(e) => setSurveyNumber(e.target.value)}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Plot Area (Sq. Ft.)</label>
                    <input
                      type="number"
                      className="ai-input"
                      placeholder="e.g. 217800"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Front Road Width (Ft.)</label>
                    <input
                      type="number"
                      className="ai-input"
                      placeholder="e.g. 60"
                      value={roadWidth}
                      onChange={(e) => setRoadWidth(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Pricing & Google link */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  Pricing & GIS Coordinates
                </span>
                <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">Asking Price (INR)</label>
                    <input
                      type="number"
                      className="ai-input"
                      placeholder="e.g. 80000000"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Google Maps Link (GIS)</label>
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="e.g. https://maps.google.com/?q=18.59,73.73"
                      value={googleMapLink}
                      onChange={(e) => setGoogleMapLink(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Geotechnical Legal Documents uploads */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  Attachment Files for AI Geotechnical Parsing
                </span>
                <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">Geotechnical Soil Report</label>
                    <label className={`ai-upload-zone ${soilReport ? 'ai-uploaded-file' : ''}`} style={{ borderColor: soilReport ? '#10b981' : '#cbd5e1' }}>
                      <Upload size={20} className="ai-upload-icon" style={{ color: soilReport ? '#10b981' : '#64748b' }} />
                      <span className="ai-upload-text">
                        {uploadingSoil ? 'Uploading to Supabase...' : (soilReport ? soilReport.name : 'Upload Soil PDF/Txt')}
                      </span>
                      <span className="ai-upload-hint">Gemini analyzes load-bearing capacity</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={handleSoilUpload}
                        disabled={uploadingSoil}
                      />
                    </label>
                  </div>

                  <div className="ai-form-group">
                    <label className="ai-label">Land Title Documents (Encumbrance Deeds)</label>
                    <label className={`ai-upload-zone ${titleDeeds.length > 0 ? 'ai-uploaded-file' : ''}`} style={{ borderColor: titleDeeds.length > 0 ? '#10b981' : '#cbd5e1' }}>
                      <Upload size={20} className="ai-upload-icon" style={{ color: titleDeeds.length > 0 ? '#10b981' : '#64748b' }} />
                      <span className="ai-upload-text">
                        {uploadingTitleDeeds ? 'Uploading to Supabase...' : (titleDeeds.length > 0 ? `${titleDeeds.length} File(s) Selected` : 'Upload Title PDFs/Txt')}
                      </span>
                      <span className="ai-upload-hint">Upload multiple legal history documents</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleTitleDeedsUpload}
                        disabled={uploadingTitleDeeds}
                      />
                    </label>
                    
                    {/* Selected files list with remove buttons */}
                    {titleDeeds.length > 0 && (
                      <div className="flex flex-col gap-1 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-[120px] overflow-y-auto w-full">
                        {titleDeeds.map((file, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-100">
                            <span className="truncate max-w-[240px] font-medium">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setTitleDeeds(prev => prev.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Notes Text Area */}
              <div className="premium-section-card mt-4" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Additional Context / Custom AI Prompts
                </span>
                <div className="ai-form-group mt-2">
                  <label className="ai-label" style={{ fontSize: '11px', color: '#475569', fontWeight: '500' }}>Custom Instruction Prompt</label>
                  <textarea
                    rows={3}
                    className="ai-textarea"
                    placeholder="Enter any additional parameters (e.g. Owner Rajesh Patil 60%, Suresh Patil 40%, Metro is 2.5 km away, IT hub growth highlights)..."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    style={{ 
                      width: '100%', 
                      borderRadius: '8px', 
                      border: '1px solid #cbd5e1', 
                      padding: '10px',
                      fontSize: '12px',
                      outline: 'none',
                      fontFamily: 'inherit',
                      background: '#ffffff'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full flex justify-center items-center gap-2 mt-4"
                style={{ padding: '14px', borderRadius: '12px', fontSize: '14px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner" /> Analyzing Land with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Analyze & Save Plot
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: LAND INVENTORY & ANALYSIS HISTORY */}
        {activeTab === 'history' && (
          <>
            {/* Middle: Your Land Inventory Table */}
            <div className="premium-section-card w-full">
              <div className="premium-section-title">
                <LayoutDashboard size={15} className="text-emerald-500" />
                Your Land Inventory
              </div>
              <div className="ai-card-body p-0" style={{ marginTop: '1rem' }}>
                {loading ? (
                  <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
                ) : plots.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No registered land plots found. Please add one in "Register New Plot".</div>
                ) : (
                  <div className="ai-table-container">
                    <table className="ai-table" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px' }}>Plot Name</th>
                          <th style={{ padding: '12px 16px' }}>Survey No</th>
                          <th style={{ padding: '12px 16px' }}>Village / Locality</th>
                          <th style={{ padding: '12px 16px' }}>Area (Sqft)</th>
                          <th style={{ padding: '12px 16px' }}>Zoning</th>
                          <th style={{ padding: '12px 16px', borderRadius: '0 8px 8px 0' }}>AI Score</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {plots.map((plot) => (
                          <tr
                            key={plot.id}
                            className={`transition-all hover:bg-slate-50/75 ${selectedPlot?.id === plot.id ? 'bg-emerald-50/10 border-l-4 border-emerald-500 font-medium' : ''}`}
                            onClick={() => setSelectedPlot(plot)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{ padding: '16px' }}>{plot.name}</td>
                            <td style={{ padding: '16px' }}>{plot.surveyNumber || 'N/A'}</td>
                            <td style={{ padding: '16px' }}>{plot.village || 'N/A'}</td>
                            <td style={{ padding: '16px' }}>{plot.area.toLocaleString()}</td>
                            <td style={{ padding: '16px' }}>{plot.zoning}</td>
                            <td style={{ padding: '16px' }}>
                              {plot.aiScore ? (
                                <span className={`ai-badge ${plot.aiScore >= 8 ? 'ai-badge-success' : plot.aiScore >= 5 ? 'ai-badge-warning' : 'ai-badge-danger'}`}>
                                  {plot.aiScore.toFixed(1)}/10
                                </span>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                            <td style={{ padding: '16px' }}><ChevronRight size={16} className="text-slate-400" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: AI Analysis Report (Workspace Details) */}
            {submitting ? (
              <div className="premium-section-card w-full flex flex-col items-center justify-center min-h-[300px]" style={{ padding: '30px' }}>
                <div className="ai-loading-container" style={{ padding: '2rem 0', textAlign: 'center' }}>
                  <div className="spinner spinner-lg spinner-primary mx-auto" />
                  <p className="ai-thinking-text mt-3" style={{ fontSize: '13px', color: '#64748b' }}>
                    🤖 Gemini AI is processing Soil reports and evaluating appreciation trends...
                  </p>
                </div>
              </div>
            ) : selectedPlot ? (
              <div className="premium-section-card w-full" style={{ padding: '30px' }}>
                <div className="ai-card-body">
                  
                  {/* Header details inside Workspace Panel */}
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                      <div className="ai-score-circle" style={{ background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)', width: '42px', height: '42px', fontSize: '13px' }}>
                        {selectedPlot.aiScore ? selectedPlot.aiScore.toFixed(1) : 'N/A'}
                      </div>
                      <div className="ai-score-details">
                        <span className="ai-score-label" style={{ display: 'block', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>
                          AI Land Score
                        </span>
                        <span className="ai-score-status font-bold text-sm text-slate-800 mt-0.5" style={{ fontSize: '14px' }}>
                          {selectedPlot.aiScore >= 8 ? 'High Potential Investment' : selectedPlot.aiScore >= 5 ? 'Moderate Risk / Standard Plot' : 'Low Potential or Risky'}
                        </span>
                      </div>
                    </div>

                    {/* Chat Integration Button */}
                    <button
                      onClick={handleStartChat}
                      disabled={chatStarting}
                      className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                      style={{ fontSize: '11px', padding: '8px 14px', borderRadius: '8px', background: '#059669', color: '#ffffff', border: 'none' }}
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
                  <div>
                    
                    {/* Suggested Price Valuation highlights */}
                    {selectedPlot.aiSuggestedPrice && (
                      <div className="ai-highlight-box mb-6 p-4 rounded-xl border border-emerald-100 bg-emerald-50/20" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <Coins className="text-emerald-600 shrink-0" size={24} style={{ marginTop: '2px' }} />
                        <div>
                          <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wider mb-1">AI Valuation Recommendation</h4>
                          <span className="text-sm font-bold text-slate-800">
                            Suggested Purchase Price: INR {selectedPlot.aiSuggestedPrice.toLocaleString()}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">
                            Asking Price was INR {selectedPlot.askingPrice.toLocaleString()} (Difference: {(((selectedPlot.askingPrice - selectedPlot.aiSuggestedPrice)/selectedPlot.askingPrice)*100).toFixed(1)}% negotiable).
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Reports Grid */}
                    <div className="grid grid-2 gap-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                      
                      {/* Appreciation */}
                      <div className="ai-report-section" style={{ border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                        <h3 className="ai-report-section-title" style={{ padding: '12px 16px', background: '#f8fafc', fontSize: '11px' }}>
                          <Sparkles size={16} className="text-emerald-500" />
                          Appreciation Prediction
                        </h3>
                        <div className="ai-report-section-content p-4">
                          {selectedPlot.aiAppreciation ? formatMarkdown(selectedPlot.aiAppreciation) : 'No appreciation assessment available.'}
                        </div>
                      </div>

                      {/* Risks */}
                      <div className="ai-report-section" style={{ border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                        <h3 className="ai-report-section-title" style={{ padding: '12px 16px', background: '#f8fafc', fontSize: '11px' }}>
                          <AlertTriangle size={16} className="text-rose-500" />
                          Risk & Geotechnical Warnings
                        </h3>
                        <div className="ai-report-section-content p-4">
                          {selectedPlot.aiRiskAnalysis ? formatMarkdown(selectedPlot.aiRiskAnalysis) : 'No risk logs calculated.'}
                        </div>
                      </div>

                    </div>

                    {/* Detailed Plot Metadata */}
                    <div className="border-t border-slate-200 pt-5 mt-6 grid grid-cols-2 gap-y-3 gap-x-6 text-xs text-slate-600 bg-slate-50/50 p-4 rounded-xl">
                      <div><strong>Zoning:</strong> {selectedPlot.zoning}</div>
                      <div><strong>Survey Number:</strong> {selectedPlot.surveyNumber || 'N/A'}</div>
                      <div><strong>Village:</strong> {selectedPlot.village || 'N/A'}</div>
                      <div><strong>Road Width:</strong> {selectedPlot.roadWidth || 'N/A'} feet</div>
                      <div><strong>Plot Size:</strong> {selectedPlot.area?.toLocaleString()} sqft</div>
                      {selectedPlot.googleMapLink && (
                        <div className="col-span-2 mt-1">
                          <strong>GIS Location:</strong>{' '}
                          <a href={selectedPlot.googleMapLink} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-semibold">
                            View on Google Maps 🌐
                          </a>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="premium-section-card w-full flex flex-col items-center justify-center text-center p-8 min-h-[180px]">
                <Info size={48} className="text-slate-300 mb-2" />
                <h3 className="font-semibold text-slate-700">No Plot Selected</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-[280px]">Select a plot from your Land Inventory or add a new one to view the AI analysis.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
