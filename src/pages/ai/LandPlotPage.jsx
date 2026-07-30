import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService, projectService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { 
  Map as MapIcon, MapPin, Upload, Sparkles, Scale, Info, ChevronRight, AlertTriangle, 
  Coins, MessageSquare, Loader2, Sliders, LayoutDashboard, ShieldCheck, Plus
} from 'lucide-react';
import { uploadFile } from '../../config/supabase';
import { convertValue, AREA_UNITS, WIDTH_UNITS } from '../../utils/unitConverter';
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
  const [areaUnit, setAreaUnit] = useState('sqft');
  const [roadWidth, setRoadWidth] = useState('');
  const [roadWidthUnit, setRoadWidthUnit] = useState('feet');
  const [displayAreaUnit, setDisplayAreaUnit] = useState('sqft');
  const [askingPrice, setAskingPrice] = useState('');
  const [zoning, setZoning] = useState('Residential');
  const [soilReport, setSoilReport] = useState(null);
  const [titleDeeds, setTitleDeeds] = useState([]);
  const [uploadingSoil, setUploadingSoil] = useState(false);
  const [uploadingTitleDeeds, setUploadingTitleDeeds] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [projectName, setProjectName] = useState('');
  const [owners, setOwners] = useState([{ name: '', share: '', mobile: '' }]);
  const [chatPrompt, setChatPrompt] = useState('');
  const [editingPlotId, setEditingPlotId] = useState(null);

  // Dropdown reference selection
  const [projectId, setProjectId] = useState('');
  const [projectsList, setProjectsList] = useState([]);

  useEffect(() => {
    fetchPlots();
  }, []);

  // Smooth scroll to top when selected plot changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedPlot]);

  const handleAddOwner = () => {
    setOwners(prev => [...prev, { name: '', share: '', mobile: '' }]);
  };

  const handleOwnerChange = (index, field, value) => {
    setOwners(prev => prev.map((o, idx) => idx === index ? { ...o, [field]: value } : o));
  };

  const handleRemoveOwner = (index) => {
    setOwners(prev => prev.filter((_, idx) => idx !== index));
  };

  const fetchPlots = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getLandPlots();
      setPlots(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedPlot(data.data[0]);
      }
      // Load projects lookup
      const { data: projRes } = await projectService.getAll();
      setProjectsList(projRes.data || []);
    } catch (err) {
      toast.error('Failed to load land plots or project lookups');
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
      toast.error(`Failed to upload soil report: ${err.message || 'Unknown error'}`);
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
      toast.error(`Failed to upload title documents: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadingTitleDeeds(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!chatPrompt && (!name || (!address && !village) || !area || !roadWidth || !askingPrice)) {
      toast.warning('Please fill in all plot details or describe them in the AI prompt chatbox below');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name || undefined,
        address: address || (village ? `${village}, Hinjewadi, Pune, Maharashtra` : undefined),
        village: village || undefined,
        surveyNumber: surveyNumber || undefined,
        googleMapLink: googleMapLink || undefined,
        area: area ? Number(convertValue(area, areaUnit, 'sqft', AREA_UNITS)) : undefined,
        unit: areaUnit || 'sqft',
        roadWidth: roadWidth ? Number(convertValue(roadWidth, roadWidthUnit, 'feet', WIDTH_UNITS)) : undefined,
        askingPrice: askingPrice ? Number(askingPrice) : undefined,
        zoning: zoning || undefined,
        soilReport: soilReport ? { url: soilReport.url, mimeType: 'application/pdf', name: soilReport.name } : undefined,
        titleDeeds: titleDeeds.length > 0 ? titleDeeds.map(f => ({ url: f.url, name: f.name })) : undefined,
        additionalNotes: additionalNotes || undefined,
        projectName: projectName || undefined,
        projectId: projectId || undefined,
        owners: owners.filter(o => o.name.trim() !== '').map(o => ({
          name: o.name,
          share: Number(o.share || 0),
          mobile: o.mobile
        })),
        chatPrompt: chatPrompt || undefined
      };

      let resultPlot;
      if (editingPlotId) {
        toast.info('Updating plot details and running Gemini re-analysis...');
        const { data } = await aiService.updateLandPlot(editingPlotId, payload);
        resultPlot = data.data;
        toast.success('Land plot specifications updated and re-analyzed successfully!');
        setPlots(plots.map(p => p.id === editingPlotId ? resultPlot : p));
      } else {
        toast.info('Sending plot details to Gemini AI for analysis...');
        const { data } = await aiService.analyzeLandPlot(payload);
        resultPlot = data.data;
        toast.success('Land plot analyzed and registered successfully!');
        setPlots([resultPlot, ...plots]);
      }
      
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
      setProjectName('');
      setProjectId('');
      setOwners([{ name: '', share: '', mobile: '' }]);
      setChatPrompt('');
      setEditingPlotId(null);

      // Refresh list and switch tab
      setSelectedPlot(resultPlot);
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gemini analysis failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const parseAnalysisData = (plot) => {
    const data = {
      appreciationClass: 'Moderate',
      developmentPotential: 'Medium',
      appreciationText: '',
      legalRisk: 'Medium',
      engineeringRisk: 'Medium',
      recommendation: 'Needs Review',
      riskText: ''
    };

    if (!plot) return data;

    if (plot.aiAppreciation) {
      const lines = plot.aiAppreciation.split('\n');
      lines.forEach(line => {
        const clean = line.trim();
        if (!clean) return;
        
        if (clean.toLowerCase().includes('appreciation:')) {
          data.appreciationClass = clean.split(':')[1]?.replace(/[*-]/g, '').trim() || 'Moderate';
        } else if (clean.toLowerCase().includes('development potential:')) {
          data.developmentPotential = clean.split(':')[1]?.replace(/[*-]/g, '').trim() || 'Medium';
        } else {
          data.appreciationText += (data.appreciationText ? '\n' : '') + line;
        }
      });
    }

    if (plot.aiRiskAnalysis) {
      const lines = plot.aiRiskAnalysis.split('\n');
      lines.forEach(line => {
        const clean = line.trim();
        if (!clean) return;

        if (clean.toLowerCase().includes('legal risk:')) {
          data.legalRisk = clean.split(':')[1]?.replace(/[*-]/g, '').trim() || 'Medium';
        } else if (clean.toLowerCase().includes('engineering risk:')) {
          data.engineeringRisk = clean.split(':')[1]?.replace(/[*-]/g, '').trim() || 'Medium';
        } else if (clean.toLowerCase().includes('investment recommendation:')) {
          data.recommendation = clean.split(':')[1]?.replace(/[*-]/g, '').trim() || 'Needs Review';
        } else {
          data.riskText += (data.riskText ? '\n' : '') + line;
        }
      });
    }

    // Clean up summaries if empty
    if (!data.appreciationText.trim()) {
      data.appreciationText = 'No further appreciation logs provided.';
    }
    if (!data.riskText.trim()) {
      data.riskText = 'No further geotechnical or legal warning logs provided.';
    }

    return data;
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
              {editingPlotId ? `✏️ Edit Plot Details: ${name || 'Plot'}` : 'Configure Plot Specifications & Deeds'}
            </div>
            
            <form onSubmit={handleSubmit} className="mt-4">
              
              {/* Row 1: Core details */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  Plot Location & Zoning
                </span>
                <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">Link Project (Optional)</label>
                    <select
                      className="ai-select"
                      value={projectId}
                      onChange={(e) => {
                        setProjectId(e.target.value);
                        const selected = projectsList.find(p => p.id === e.target.value);
                        if (selected) setProjectName(selected.name);
                      }}
                    >
                      <option value="">-- Select Project --</option>
                      {projectsList.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Project Name / Reference</label>
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="e.g. Green Valley Residency"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Plot Name / Identifier</label>
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="e.g. Plot A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-2 gap-md mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
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

              {/* Land Owner details section */}
              <div className="premium-section-card mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                    Land Owner Details
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOwner}
                    className="btn btn-secondary btn-sm flex items-center gap-1 text-xs"
                    style={{ padding: '6px 12px', borderRadius: '8px', background: '#e2e8f0', color: '#334155', border: 'none', cursor: 'pointer' }}
                  >
                    <Plus size={14} /> Add Owner
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {owners.map((owner, idx) => (
                    <div key={idx} className="grid grid-3 gap-md items-end bg-slate-50 p-3 rounded-lg border border-slate-100 relative" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px' }}>
                      <div className="ai-form-group">
                        <label className="ai-label text-[10px]">Owner Name</label>
                        <input
                          type="text"
                          className="ai-input bg-white"
                          placeholder="e.g. Rajesh Patil"
                          value={owner.name}
                          onChange={(e) => handleOwnerChange(idx, 'name', e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label text-[10px]">Ownership Share (%)</label>
                        <input
                          type="number"
                          className="ai-input bg-white"
                          placeholder="e.g. 60"
                          value={owner.share}
                          onChange={(e) => handleOwnerChange(idx, 'share', e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label text-[10px]">Mobile Number</label>
                        <input
                          type="text"
                          className="ai-input bg-white"
                          placeholder="e.g. 9876543210"
                          value={owner.mobile}
                          onChange={(e) => handleOwnerChange(idx, 'mobile', e.target.value)}
                        />
                      </div>
                      {owners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOwner(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold mb-3 text-sm p-1.5"
                          title="Remove Owner"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
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
                    <label className="ai-label">Plot Area</label>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      height: '42px',
                      overflow: 'hidden'
                    }}>
                      <input
                        type="number"
                        style={{ 
                          flex: 1, 
                          border: 'none', 
                          outline: 'none', 
                          padding: '0 12px', 
                          height: '100%',
                          fontSize: '14px',
                          background: 'transparent'
                        }}
                        placeholder="e.g. 5"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                      />
                      <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />
                      <select
                        style={{ 
                          width: '110px', 
                          border: 'none', 
                          outline: 'none', 
                          height: '100%',
                          padding: '0 8px', 
                          background: 'transparent',
                          fontSize: '13px',
                          color: '#475569',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                        value={areaUnit}
                        onChange={(e) => {
                          const oldUnit = areaUnit;
                          const newUnit = e.target.value;
                          setAreaUnit(newUnit);
                          if (area) {
                            setArea(convertValue(area, oldUnit, newUnit, AREA_UNITS));
                          }
                        }}
                      >
                        {Object.entries(AREA_UNITS).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Front Road Width</label>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '8px', 
                      backgroundColor: 'white',
                      height: '42px',
                      overflow: 'hidden'
                    }}>
                      <input
                        type="number"
                        style={{ 
                          flex: 1, 
                          border: 'none', 
                          outline: 'none', 
                          padding: '0 12px', 
                          height: '100%',
                          fontSize: '14px',
                          background: 'transparent'
                        }}
                        placeholder="e.g. 60"
                        value={roadWidth}
                        onChange={(e) => setRoadWidth(e.target.value)}
                      />
                      <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />
                      <select
                        style={{ 
                          width: '110px', 
                          border: 'none', 
                          outline: 'none', 
                          height: '100%',
                          padding: '0 8px', 
                          background: 'transparent',
                          fontSize: '13px',
                          color: '#475569',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                        value={roadWidthUnit}
                        onChange={(e) => {
                          const oldUnit = roadWidthUnit;
                          const newUnit = e.target.value;
                          setRoadWidthUnit(newUnit);
                          if (roadWidth) {
                            setRoadWidth(convertValue(roadWidth, oldUnit, newUnit, WIDTH_UNITS));
                          }
                        }}
                      >
                        {Object.entries(WIDTH_UNITS).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    </div>
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

              {/* AI Natural Language Chatbox Analyzer */}
              <div style={{ marginTop: '24px', borderTop: '1.5px dashed #cbd5e1', paddingTop: '20px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#059669', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  <Sparkles size={14} /> AI natural language prompt analyzer (Optional chatbox)
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    placeholder="🔥 Don't want to fill in all the form fields? Just write your details here in plain text! (e.g. 'I want to analyze Skyline Plot B in Hinjewadi. The area is 12000 sqft, road width is 40ft, and asking price is ₹4.5 Crore. The zoning is Residential.') and click Analyze below. The AI will extract all details automatically!"
                    rows="3"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    style={{ 
                      width: '100%', 
                      borderRadius: '12px', 
                      border: '1.5px solid #a7f3d0', 
                      padding: '12px 14px',
                      fontSize: '12px',
                      outline: 'none',
                      fontFamily: 'inherit',
                      background: '#ecfdf5',
                      color: '#065f46',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ position: 'absolute', right: '12px', bottom: '10px', fontSize: '9px', color: '#047857', fontWeight: 'bold' }}>
                    Conversational Mode ⚡
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                {editingPlotId && (
                  <button
                    type="button"
                    onClick={() => {
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
                      setProjectName('');
                      setProjectId('');
                      setOwners([{ name: '', share: '', mobile: '' }]);
                      setChatPrompt('');
                      setEditingPlotId(null);
                      setActiveTab('history');
                    }}
                    className="btn btn-secondary btn-lg"
                    style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '14px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569' }}
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg flex justify-center items-center gap-2"
                  style={{ flex: 2, padding: '14px', borderRadius: '12px', fontSize: '14px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="spinner" /> Analyzing Land with Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> {editingPlotId ? 'Save & Re-Analyze Plot' : 'Analyze & Save Plot'}
                    </>
                  )}
                </button>
              </div>
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

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlotId(selectedPlot.id);
                          setName(selectedPlot.name || '');
                          setProjectName(selectedPlot.projectName || '');
                          setProjectId('');
                          setVillage(selectedPlot.village || '');
                          setSurveyNumber(selectedPlot.surveyNumber || '');
                          setGoogleMapLink(selectedPlot.googleMapLink || '');
                          setArea(selectedPlot.area ? selectedPlot.area.toString() : '');
                          setAreaUnit('sqft');
                          setRoadWidth(selectedPlot.roadWidth ? selectedPlot.roadWidth.toString() : '');
                          setRoadWidthUnit('feet');
                          setAskingPrice(selectedPlot.askingPrice ? selectedPlot.askingPrice.toString() : '');
                          setZoning(selectedPlot.zoning || 'Residential');
                          setOwners(selectedPlot.owners && selectedPlot.owners.length > 0 ? selectedPlot.owners.map(o => ({
                            name: o.name || '',
                            share: o.share ? o.share.toString() : '',
                            mobile: o.mobile || ''
                          })) : [{ name: '', share: '', mobile: '' }]);
                          setAdditionalNotes(selectedPlot.additionalNotes || '');
                          setActiveTab('create');
                        }}
                        className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                        style={{ fontSize: '11px', padding: '8px 14px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                        title="Edit plot details & run AI re-analysis"
                      >
                        ✏️ Edit Specifications
                      </button>

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
                  </div>
                  
                  {/* Scrollable Content Body */}
                  <div style={{ marginTop: '20px' }}>
                    
                    {/* Hero indicators (gauge + recommendation + risk badges) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                      
                      {/* circular gauge */}
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '70px', height: '70px', flexShrink: 0 }}>
                          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <circle cx="35" cy="35" r="28" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                            <circle
                              cx="35"
                              cy="35"
                              r="28"
                              stroke={selectedPlot.aiScore >= 8 ? '#10b981' : selectedPlot.aiScore >= 5 ? '#f59e0b' : '#ef4444'}
                              strokeWidth="6"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 28}
                              strokeDashoffset={2 * Math.PI * 28 * (1 - (selectedPlot.aiScore || 0) / 10)}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                            />
                          </svg>
                          <span style={{ position: 'absolute', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>
                            {selectedPlot.aiScore ? selectedPlot.aiScore.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>AI Land Score</span>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                            {selectedPlot.aiScore >= 8 ? 'High Potential' : selectedPlot.aiScore >= 5 ? 'Moderate Grade' : 'High Risk Land'}
                          </span>
                        </div>
                      </div>

                      {/* investment recommendation */}
                      {(() => {
                        const parsed = parseAnalysisData(selectedPlot);
                        const recColors = {
                          'Strong Buy': { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
                          'Buy': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
                          'Fair Deal': { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
                          'Needs Review': { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
                          'Avoid': { bg: '#fff5f5', text: '#c53030', border: '#fed7d7' }
                        };
                        const color = recColors[parsed.recommendation.trim()] || recColors[parsed.recommendation] || recColors['Needs Review'];
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: `1px solid ${color.border || '#e2e8f0'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div>
                              <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em', display: 'block' }}>Investment Grade</span>
                              <span 
                                style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold', marginTop: '6px', backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}` }}
                              >
                                {parsed.recommendation}
                              </span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', display: 'block', marginTop: '8px' }}>Recommended Acquisition Path</span>
                          </div>
                        );
                      })()}

                      {/* risk level metrics */}
                      {(() => {
                        const parsed = parseAnalysisData(selectedPlot);
                        const getRiskColor = (level) => {
                          const lvl = level?.toLowerCase().trim();
                          if (lvl === 'low') return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
                          if (lvl === 'medium' || lvl === 'moderate') return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
                          return { bg: '#fff5f5', text: '#c53030', border: '#fed7d7' };
                        };
                        const legalCol = getRiskColor(parsed.legalRisk);
                        const engCol = getRiskColor(parsed.engineeringRisk);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div>
                              <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Risk Summary Profile</span>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${legalCol.border}`, backgroundColor: legalCol.bg, color: legalCol.text }}>
                                  Legal: {parsed.legalRisk}
                                </span>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${engCol.border}`, backgroundColor: engCol.bg, color: engCol.text }}>
                                  Eng: {parsed.engineeringRisk}
                                </span>
                              </div>
                            </div>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', display: 'block', marginTop: '8px' }}>Geotechnical & Title Levels</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Price Slider Comparison */}
                    {selectedPlot.aiSuggestedPrice && (
                      (() => {
                        const negotiationBuffer = (((selectedPlot.askingPrice - selectedPlot.aiSuggestedPrice) / selectedPlot.askingPrice) * 100);
                        return (
                          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: '#1e293b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Coins size={15} className="text-emerald-500" />
                                Valuation Comparison Buffer
                              </h4>
                              {negotiationBuffer > 0 ? (
                                <span style={{ fontSize: '10px', backgroundColor: '#fffbeb', color: '#b45309', padding: '3px 10px', borderRadius: '9999px', fontWeight: 'bold', border: '1px solid #fde68a' }}>
                                  {negotiationBuffer.toFixed(1)}% Negotiation Cushion
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', backgroundColor: '#ecfdf5', color: '#047857', padding: '3px 10px', borderRadius: '9999px', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>
                                  Fair Value
                                </span>
                              )}
                            </div>
                            
                            <div style={{ position: 'relative', paddingTop: '20px', paddingBottom: '8px' }}>
                              {/* Track line */}
                              <div style={{ position: 'relative', height: '8px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '9999px' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: '#a7f3d0', borderRadius: '9999px', width: '70%' }} />
                                {/* Marker for AI Suggested */}
                                <div style={{ position: 'absolute', top: '50%', left: '70%', transform: 'translate(-50%, -50%)', backgroundColor: '#10b981', border: '2.5px solid #ffffff', borderRadius: '50%', width: '16px', height: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} title="AI Suggested Value" />
                                {/* Marker for Asking Price */}
                                <div style={{ position: 'absolute', top: '50%', left: '90%', transform: 'translate(-50%, -50%)', backgroundColor: '#94a3b8', border: '2.5px solid #ffffff', borderRadius: '50%', width: '16px', height: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} title="Asking Price" />
                              </div>
                              
                              {/* Labels */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '12px', fontWeight: '600' }}>
                                <span>Negotiation lower boundary</span>
                                <span style={{ color: '#059669', fontWeight: 'bold' }}>AI Value: INR {selectedPlot.aiSuggestedPrice.toLocaleString()}</span>
                                <span style={{ color: '#475569', fontWeight: 'bold' }}>Asking: INR {selectedPlot.askingPrice.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {/* Report Text Summaries Card Grid */}
                    {(() => {
                      const parsed = parseAnalysisData(selectedPlot);
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                          
                          {/* Appreciation Card */}
                          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <Sparkles size={14} className="text-emerald-500" />
                              Appreciation Forecast & Zoning
                            </h3>
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                                {formatMarkdown(parsed.appreciationText)}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '9px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Appreciation: {parsed.appreciationClass}</span>
                                <span style={{ fontSize: '9px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Potential: {parsed.developmentPotential}</span>
                              </div>
                            </div>
                          </div>

                          {/* Risk & Geotechnical Card */}
                          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <AlertTriangle size={14} className="text-rose-500" />
                              Geotechnical & Legal Warnings
                            </h3>
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                                {formatMarkdown(parsed.riskText)}
                              </div>
                              
                              {/* Document checklist status */}
                              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Legality Scanner Checklist</span>
                                {selectedPlot.documentsLegality && selectedPlot.documentsLegality.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {selectedPlot.documentsLegality.map((doc, idx) => {
                                      const statusColors = {
                                        'Clear': { text: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                                        'Dispute Found': { text: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
                                        'Warning Flagged': { text: '#d97706', bg: '#fffbeb', border: '#fcd34d' }
                                      };
                                      const col = statusColors[doc.status] || { text: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
                                      return (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={doc.name}>
                                              📄 {doc.name}
                                            </span>
                                            <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', backgroundColor: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                                              {doc.status}
                                            </span>
                                          </div>
                                          {doc.remarks && (
                                            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                              {doc.remarks}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                                      <ShieldCheck size={14} className={selectedPlot.hasSoilReport ? "text-emerald-500" : "text-slate-300"} />
                                      <span style={{ fontWeight: selectedPlot.hasSoilReport ? 'bold' : '500', color: selectedPlot.hasSoilReport ? '#334155' : '#94a3b8' }}>Soil Test Report</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                                      <ShieldCheck size={14} className={selectedPlot.hasTitleDeeds ? "text-emerald-500" : "text-slate-300"} />
                                      <span style={{ fontWeight: selectedPlot.hasTitleDeeds ? 'bold' : '500', color: selectedPlot.hasTitleDeeds ? '#334155' : '#94a3b8' }}>Registry Title Deeds</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })()}

                    {/* Upgraded Analytics Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                      
                      {/* Sentiment Dial */}
                      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '16px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>AI Market Sentiment</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: selectedPlot.appreciationSentiment === 'Bullish' ? '#d1fae5' : (selectedPlot.appreciationSentiment === 'Bearish' ? '#fee2e2' : '#fef3c7'),
                            color: selectedPlot.appreciationSentiment === 'Bullish' ? '#065f46' : (selectedPlot.appreciationSentiment === 'Bearish' ? '#991b1b' : '#92400e'),
                            fontWeight: 'bold',
                            fontSize: '18px'
                          }}>
                            📈
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>{selectedPlot.appreciationSentiment || 'Stable'}</h4>
                            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b' }}>Forecasts strong growth potential over next 36 months.</p>
                          </div>
                        </div>
                      </div>

                      {/* Connectivity Radar */}
                      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '16px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Infrastructure Connectivity Radar</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#334155' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                            <span>🚇 Metro Station:</span>
                            <strong>{selectedPlot.connectivityMetrics?.metroDistanceKm || 2.5} km</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                            <span>🛣️ National Highway:</span>
                            <strong>{selectedPlot.connectivityMetrics?.highwayDistanceKm || 1.2} km</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>✈️ International Airport:</span>
                            <strong>{selectedPlot.connectivityMetrics?.airportDistanceKm || 18.5} km</strong>
                          </div>
                        </div>
                      </div>

                      {/* Registry Cost Vetting */}
                      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '16px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Estimated Acquisition Registry Fees</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#334155' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                            <span>Stamp Duty (6%):</span>
                            <strong>₹{(selectedPlot.acquisitionCost?.stampDuty || selectedPlot.askingPrice * 0.06).toLocaleString()}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                            <span>Registration Tax (1%):</span>
                            <strong>₹{(selectedPlot.acquisitionCost?.registrationTax || selectedPlot.askingPrice * 0.01).toLocaleString()}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Legal & Vetting Charges:</span>
                            <strong>₹{(selectedPlot.acquisitionCost?.legalVetting || 25000).toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* View Unit Toggle Pill Selector */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 16px', borderRadius: '12px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>🔧 View Metrics Unit:</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {Object.entries(AREA_UNITS).map(([key, val]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setDisplayAreaUnit(key)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: displayAreaUnit === key ? '#059669' : 'transparent',
                              color: displayAreaUnit === key ? '#ffffff' : '#64748b',
                              transition: 'all 0.2s'
                            }}
                          >
                            {val.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Plot Metadata */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                      <div><strong>Zoning:</strong> {selectedPlot.zoning}</div>
                      <div><strong>Survey Number:</strong> {selectedPlot.surveyNumber || 'N/A'}</div>
                      <div><strong>Village:</strong> {selectedPlot.village || 'N/A'}</div>
                      <div><strong>Road Width:</strong> {selectedPlot.roadWidth || 'N/A'} feet</div>
                      <div><strong>Plot Size:</strong> {(() => {
                        const converted = convertValue(selectedPlot.area || 0, 'sqft', displayAreaUnit, AREA_UNITS);
                        const num = parseFloat(converted);
                        return `${isNaN(num) ? 0 : num.toLocaleString()} ${AREA_UNITS[displayAreaUnit]?.label}`;
                      })()}</div>
                      {selectedPlot.googleMapLink && (
                        <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
                          <strong>GIS Location:</strong>{' '}
                          <a href={selectedPlot.googleMapLink} target="_blank" rel="noreferrer" style={{ color: '#059669', fontWeight: 'bold', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
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
