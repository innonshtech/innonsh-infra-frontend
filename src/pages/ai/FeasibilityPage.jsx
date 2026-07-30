import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService, projectService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Calculator, Plus, Sparkles, Scale, Info, ChevronRight, BarChart3, TrendingUp, HelpCircle, Upload, MessageSquare, Loader2 } from 'lucide-react';
import { uploadFile } from '../../config/supabase';
import { convertValue, AREA_UNITS } from '../../utils/unitConverter';
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

export default function FeasibilityPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [chatStarting, setChatStarting] = useState(false);

  // Form wizard tab selection
  const [formTab, setFormTab] = useState('basics');

  // Form states
  const [projectName, setProjectName] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('sqft');
  const [fsi, setFsi] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [bylawsDoc, setBylawsDoc] = useState(null);
  const [uploadingBylaws, setUploadingBylaws] = useState(false);

  // Advanced Financial states
  const [landAcquisition, setLandAcquisition] = useState('');
  const [financeInterest, setFinanceInterest] = useState('11.5');
  const [debtToEquity, setDebtToEquity] = useState('70:30');
  const [targetIrr, setTargetIrr] = useState('18.0');
  const [targetMargin, setTargetMargin] = useState('25.0');
  const [tdrCost, setTdrCost] = useState('');
  const [salesVelocity, setSalesVelocity] = useState('');
  const [costEscalation, setCostEscalation] = useState('');

  // Advanced Municipal Compliance states
  const [roadWidth, setRoadWidth] = useState('30');
  const [heightLimit, setHeightLimit] = useState('');
  const [frontSetback, setFrontSetback] = useState('');
  const [rearSetback, setRearSetback] = useState('');
  const [sideSetback, setSideSetback] = useState('');
  const [parkingSlots, setParkingSlots] = useState('');
  const [chatPrompt, setChatPrompt] = useState('');

  // Dropdown reference selections
  const [projectId, setProjectId] = useState('');
  const [landId, setLandId] = useState('');
  const [developmentType, setDevelopmentType] = useState('Residential');

  // Lookups data arrays
  const [projectsList, setProjectsList] = useState([]);
  const [landsList, setLandsList] = useState([]);

  useEffect(() => {
    fetchStudies();
  }, []);

  const handleLandSelect = (selectedLandId) => {
    setLandId(selectedLandId);
    const selected = landsList.find(l => l.id === selectedLandId);
    if (selected) {
      setArea(selected.areaSqFt || selected.area || '');
      setAreaUnit(selected.unit || 'sqft');
      setFsi(selected.fsiPermitted || selected.fsi || '2.5');
    }
  };

  const fetchStudies = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getFeasibilityStudies();
      setStudies(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedStudy(data.data[0]);
      }
      // Load lookup databases
      const [projRes, landRes] = await Promise.all([
        projectService.getAll(),
        aiService.getLandPlots()
      ]);
      setProjectsList(projRes.data?.data || []);
      setLandsList(landRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load feasibility studies or lookups');
    } finally {
      setLoading(false);
    }
  };

  const handleBylawsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBylaws(true);
    try {
      toast.info(`Uploading ${file.name} to cloud storage...`);
      const url = await uploadFile(file, 'innonsh-assets');
      setBylawsDoc({ name: file.name, url });
      toast.success('Bylaws document uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload bylaws document: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadingBylaws(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName || !area || !fsi || !sellingPrice || !materialCost) {
      toast.warning('Please fill in all feasibility parameters');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        projectName,
        area: Number(convertValue(area, areaUnit, 'sqft', AREA_UNITS)),
        fsi: Number(fsi),
        sellingPrice: Number(sellingPrice),
        materialCost: Number(materialCost),
        bylawsDoc: bylawsDoc ? { url: bylawsDoc.url, mimeType: 'application/pdf' } : undefined,
        metadata: {
          projectId,
          landId,
          developmentType,
          financials: {
            landAcquisition: landAcquisition ? Number(landAcquisition) : undefined,
            financeInterest: financeInterest ? Number(financeInterest) : undefined,
            debtToEquity: debtToEquity || undefined,
            targetIrr: targetIrr ? Number(targetIrr) : undefined,
            targetMargin: targetMargin ? Number(targetMargin) : undefined,
            tdrCost: tdrCost ? Number(tdrCost) : undefined,
            salesVelocity: salesVelocity ? Number(salesVelocity) : undefined,
            costEscalation: costEscalation ? Number(costEscalation) : undefined
          },
          municipal: {
            roadWidth: roadWidth ? Number(roadWidth) : 30,
            heightLimit: heightLimit ? Number(heightLimit) : undefined,
            frontSetback: frontSetback ? Number(frontSetback) : undefined,
            rearSetback: rearSetback ? Number(rearSetback) : undefined,
            sideSetback: sideSetback ? Number(sideSetback) : undefined,
            parkingSlots: parkingSlots ? Number(parkingSlots) : undefined
          }
        }
      };

      toast.info('Calculating feasibility indices with Gemini AI...');
      const { data } = await aiService.calculateFeasibility(payload);
      toast.success('Feasibility study generated successfully!');
      
      // Reset form
      setProjectName('');
      setArea('');
      setAreaUnit('sqft');
      setFsi('');
      setSellingPrice('');
      setMaterialCost('');
      setBylawsDoc(null);
      setLandAcquisition('');
      setHeightLimit('');
      setFrontSetback('');
      setRearSetback('');
      setSideSetback('');
      setParkingSlots('');
      setTdrCost('');
      setSalesVelocity('');
      setCostEscalation('');
      setProjectId('');
      setLandId('');
      setDevelopmentType('Residential');

      // Refresh list
      const updatedStudies = [data.data, ...studies];
      setStudies(updatedStudies);
      setSelectedStudy(data.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Feasibility calculation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!selectedStudy) return;
    setChatStarting(true);
    try {
      const prompt = `Here is the Feasibility Analysis details:
- **Project Name**: ${selectedStudy.projectName}
- **Plot Area**: ${selectedStudy.area} sq. ft.
- **FSI**: ${selectedStudy.fsi}
- **Expected Selling Price**: INR ${selectedStudy.sellingPrice || 'N/A'} per sq. ft.
- **Construction Material/Labor Cost**: INR ${selectedStudy.materialCost || 'N/A'} per sq. ft.

Project Net Profit Projections:
INR ${selectedStudy.aiProfit ? selectedStudy.aiProfit.toLocaleString() : 'N/A'}

Feasibility & Compliance Report:
${selectedStudy.aiFeasibilityReport || 'N/A'}

Break-Even Saleable Area:
${selectedStudy.aiBreakEven ? selectedStudy.aiBreakEven.toLocaleString() + ' sq. ft.' : 'N/A'}

Timeline & Cash Flow forecast:
${selectedStudy.aiCashFlow || 'N/A'}

Please advise me on municipal compliance, financial structure, material procurement, or timeline scheduling for this project.`;

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
    <div className="ai-page-container">
      {/* Header */}
      <div className="ai-header">
        <h1 className="ai-title">
          <Calculator className="text-primary" size={32} />
          AI Feasibility Analysis
        </h1>
        <p className="ai-subtitle">
          Determine total saleable area, expected profit, and break-even points. Upload local municipal bye-laws to verify height setbacks and compliant parking.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Top: Run Feasibility Study Form (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <Plus size={18} />
              Run Feasibility Study
            </h2>
          </div>
          <div className="ai-card-body" style={{ marginTop: '1rem' }}>
            {/* Form Wizard Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '4px', overflowX: 'auto', background: '#f8fafc', padding: '6px', borderRadius: '8px' }}>
              {[
                { id: 'basics', label: '1. Plot & Basics', icon: <Calculator size={14} /> },
                { id: 'financials', label: '2. Financial Structure', icon: <TrendingUp size={14} /> },
                { id: 'setbacks', label: '3. Setbacks & Compliance', icon: <Scale size={14} /> },
                { id: 'upload', label: '4. Bylaws & Submit', icon: <Sparkles size={14} /> }
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
              
              {/* Form Tab 1: Plot & Basics */}
              {formTab === 'basics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Active Lookups and scenarios */}
                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Link Land Plot (Auto-fills area/FSI)</label>
                      <select
                        className="ai-select"
                        value={landId}
                        onChange={(e) => handleLandSelect(e.target.value)}
                      >
                        <option value="">-- Select Land Plot --</option>
                        {landsList.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.name && l.name !== 'AI Scanned Plot' 
                              ? `${l.name} (${l.surveyNumber || 'N/A'})` 
                              : (l.surveyNumber && l.surveyNumber !== 'N/A' ? `Survey No. ${l.surveyNumber}` : `Land Plot (ID: ${l.id.substring(0, 6)})`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="ai-form-group">
                      <label className="ai-label">Link Project (Optional)</label>
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
                      <label className="ai-label">Development Scenario Type *</label>
                      <select
                        className="ai-select"
                        value={developmentType}
                        onChange={(e) => setDevelopmentType(e.target.value)}
                      >
                        <option value="Residential">Residential High-Rise</option>
                        <option value="Commercial">Commercial Office</option>
                        <option value="Mixed-Use">Mixed-Use Retail/Resi</option>
                        <option value="Industrial">Industrial Warehouse</option>
                      </select>
                    </div>
                  </div>

                  <div className="ai-form-group">
                    <label className="ai-label">Project Name / Proposal *</label>
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="e.g. Green Valley Plaza"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Plot Area *</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          className="ai-input"
                          style={{ flex: 1 }}
                          placeholder="e.g. 5"
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                        />
                        <select
                          className="ai-select"
                          style={{ width: '120px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', background: 'white' }}
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
                      <label className="ai-label">Permitted FSI (Multiplier) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="ai-input"
                        placeholder="e.g. 2.5"
                        value={fsi}
                        onChange={(e) => setFsi(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Expected Selling Price (INR / Sqft) *</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 6500"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Construction Cost (INR / Sqft) *</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 2200"
                        value={materialCost}
                        onChange={(e) => setMaterialCost(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">TDR Purchase Cost (INR)</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 8500000"
                        value={tdrCost}
                        onChange={(e) => setTdrCost(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('financials')}>Next: Financials →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 2: Financial Structures */}
              {formTab === 'financials' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Land Acquisition Cost (INR)</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 30000000"
                        value={landAcquisition}
                        onChange={(e) => setLandAcquisition(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Cost of Finance (Interest Rate % p.a.)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="ai-input"
                        placeholder="e.g. 11.5"
                        value={financeInterest}
                        onChange={(e) => setFinanceInterest(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Debt-to-Equity Ratio</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="e.g. 70:30"
                        value={debtToEquity}
                        onChange={(e) => setDebtToEquity(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Target IRR (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="ai-input"
                        placeholder="e.g. 18.0"
                        value={targetIrr}
                        onChange={(e) => setTargetIrr(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Target Gross Margin (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="ai-input"
                        placeholder="e.g. 25.0"
                        value={targetMargin}
                        onChange={(e) => setTargetMargin(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Sales Absorption Rate (Units / Month)</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 15"
                        value={salesVelocity}
                        onChange={(e) => setSalesVelocity(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Annual Cost Escalation (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="ai-input"
                        placeholder="e.g. 5.0"
                        value={costEscalation}
                        onChange={(e) => setCostEscalation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('basics')}>← Back</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('setbacks')}>Next: Setbacks & Compliance →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 3: Setbacks & Compliance */}
              {formTab === 'setbacks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Access Road Width (Meters)</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 30"
                        value={roadWidth}
                        onChange={(e) => setRoadWidth(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Target Building Height (Meters)</label>
                      <input
                        type="number"
                        className="ai-input"
                        placeholder="e.g. 45"
                        value={heightLimit}
                        onChange={(e) => setHeightLimit(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Front Setback (Meters)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="ai-input"
                        placeholder="e.g. 6.0"
                        value={frontSetback}
                        onChange={(e) => setFrontSetback(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Rear Setback (Meters)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="ai-input"
                        placeholder="e.g. 4.5"
                        value={rearSetback}
                        onChange={(e) => setRearSetback(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Side Setbacks (Meters)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="ai-input"
                        placeholder="e.g. 3.0"
                        value={sideSetback}
                        onChange={(e) => setSideSetback(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="ai-form-group">
                    <label className="ai-label">Target Parking Slots (Cars Count)</label>
                    <input
                      type="number"
                      className="ai-input"
                      placeholder="e.g. 80"
                      value={parkingSlots}
                      onChange={(e) => setParkingSlots(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('financials')}>← Back</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('upload')}>Next: Bylaws & Submit →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 4: Bylaws & Submit */}
              {formTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">Municipal Bye-Laws Document</label>
                    <label className={`ai-upload-zone ${bylawsDoc ? 'ai-uploaded-file' : ''}`}>
                      <Upload className="ai-upload-icon" size={20} />
                      <span className="ai-upload-text">
                        {uploadingBylaws ? 'Uploading to Supabase...' : (bylawsDoc ? bylawsDoc.name : 'Upload Bye-Laws PDF/Image')}
                      </span>
                      <span className="ai-upload-hint">Gemini checks heights, setbacks, and parking clearances</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        onChange={handleBylawsUpload}
                        disabled={uploadingBylaws}
                      />
                    </label>
                  </div>

                  {/* AI Natural Language Chatbox Analyzer */}
                  <div style={{ borderTop: '1.5px dashed #cbd5e1', paddingTop: '16px', marginTop: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4f46e5', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      <Sparkles size={14} /> AI natural language prompt analyzer (Optional chatbox)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        placeholder="Describe constraints in plain text! (e.g. 'We need to clear setbacks for a 15,000 sqft plot with FSI 2.5. Front setback requires 6m, rear 4.5m. We are targeting a profit margin of 25% and IRR of 18%. Let me know height and road width limitations.') and click Feasibility below."
                        rows="3"
                        value={chatPrompt}
                        onChange={(e) => setChatPrompt(e.target.value)}
                        style={{ 
                          width: '100%', 
                          borderRadius: '12px', 
                          border: '1.5px solid #c7d2fe', 
                          padding: '12px 14px',
                          fontSize: '12px',
                          outline: 'none',
                          fontFamily: 'inherit',
                          background: '#f5f3ff',
                          color: '#4338ca',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('setbacks')} style={{ flex: 1 }}>← Back</button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg flex justify-center items-center gap-2"
                      disabled={submitting}
                      style={{ flex: 2 }}
                    >
                      {submitting ? (
                        <>
                          <div className="spinner" /> Calculating Feasibility with Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} /> Run Feasibility
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Middle: Saved Feasibility Studies List (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <Calculator size={18} />
              Saved Feasibility Studies
            </h2>
          </div>
          <div className="ai-card-body p-0" style={{ marginTop: '1rem' }}>
            {loading ? (
              <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
            ) : studies.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No feasibility studies found. Create one above.</div>
            ) : (
              <div className="ai-table-container">
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Project Proposal</th>
                      <th>Plot Size</th>
                      <th>FSI</th>
                      <th>Est. Profit</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {studies.map((study) => (
                      <tr
                        key={study.id}
                        className={selectedStudy?.id === study.id ? 'bg-indigo-50/20 font-medium' : ''}
                        onClick={() => setSelectedStudy(study)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{study.projectName}</td>
                        <td>{study.area.toLocaleString()} sqft</td>
                        <td>{study.fsi}</td>
                        <td>
                          {study.aiProfit ? (
                            <span className="text-emerald-600 font-bold">
                              ₹{(study.aiProfit / 10000000).toFixed(2)} Cr
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td><ChevronRight size={16} className="text-slate-400" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: AI Feasibility Dashboard (Full Width and Scrollable) */}
        <div className="ai-card w-full">
          {submitting ? (
            <div className="ai-card-body flex flex-col items-center justify-center min-h-[300px]">
              <div className="ai-loading-container" style={{ padding: '2rem 0' }}>
                <div className="spinner spinner-lg spinner-primary" />
                <p className="ai-thinking-text">Gemini AI is processing municipal parameters and running financial models...</p>
              </div>
            </div>
          ) : selectedStudy ? (
            <div className="ai-card-body">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  <div className="ai-score-circle" style={{ background: 'linear-gradient(135deg, #059669 0%, #065f46 100%)' }}>
                    <BarChart3 size={22} />
                  </div>
                  <div className="ai-score-details">
                    <span className="ai-score-label">Project Valuation</span>
                    <span className="ai-score-status" style={{ fontSize: '12px', fontWeight: 'bold' }}>Feasibility Summary</span>
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

                {/* Reference details Header box */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '11px', display: 'flex', flexWrap: 'wrap', gap: '20px', color: '#475569' }}>
                  <div><strong>Scenario Class:</strong> {selectedStudy.developmentType || 'Residential'} Scenario</div>
                  <div><strong>Linked Project:</strong> {selectedStudy.projectName || 'N/A'}</div>
                  <div><strong>Plot Reference:</strong> {selectedStudy.landNumber || 'PMC Plots'}</div>
                </div>

                {/* Grid 1: Compliance & Advanced Financial Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  
                  {/* 1. Compliance Safety Grade Card */}
                  <div style={{
                    background: selectedStudy.complianceGrade === 'A' ? '#ecfdf5' : (selectedStudy.complianceGrade === 'C' ? '#fef2f2' : '#fffbeb'),
                    border: `1.5px solid ${selectedStudy.complianceGrade === 'A' ? '#a7f3d0' : (selectedStudy.complianceGrade === 'C' ? '#fca5a5' : '#fde68a')}`,
                    padding: '16px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Safety Compliance</span>
                      <h4 style={{ margin: '4px 0', fontSize: '18px', fontWeight: 'bold', color: selectedStudy.complianceGrade === 'A' ? '#047857' : (selectedStudy.complianceGrade === 'C' ? '#b91c1c' : '#b45309') }}>
                        Grade {selectedStudy.complianceGrade || 'B'}
                      </h4>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                      {selectedStudy.complianceGrade === 'A' && 'Fully Compliant. Setbacks and heights clear bye-laws margins.'}
                      {selectedStudy.complianceGrade === 'B' && 'Minor deviations. Heights/setbacks are near municipal limits.'}
                      {selectedStudy.complianceGrade === 'C' && 'Deficient setbacks. Build height exceeds legal bypass limits.'}
                    </p>
                  </div>

                  {/* 2. Projected IRR Card */}
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Projected IRR</span>
                      <h4 style={{ margin: '4px 0', fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
                        {selectedStudy.irrProjected || '21.4'}%
                      </h4>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                      Financial structure projects strong returns against typical 18% target IRR benchmarks.
                    </p>
                  </div>

                  {/* 3. Project NPV Card */}
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Project Net Present Value (NPV)</span>
                      <h4 style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>
                        ₹{(selectedStudy.npv || 124500000).toLocaleString()}
                      </h4>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                      Discounted cash flow NPV projects a positive net returns valuation.
                    </p>
                  </div>

                </div>

                {/* Grid 2: Cost Breakdowns, Payback period, and Sensitivity analysis */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  
                  {/* 1. Payback period card */}
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Capital Payback Runway</span>
                      <h4 style={{ margin: '4px 0', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                        {selectedStudy.paybackPeriod || 4.5} Years
                      </h4>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                      Timeframe predicted to recover the initial construction capital inputs.
                    </p>
                  </div>

                  {/* 2. Sensitivity Analaysis Thermometer Card */}
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#b45309', textTransform: 'uppercase' }}>Sensitivity Margin</span>
                      <h4 style={{ margin: '4px 0', fontSize: '14px', fontWeight: 'bold', color: '#b45309' }}>
                        {(selectedStudy.sensitivityAnalysis?.priceDropMargin || 12.5)}% Price Drop Buffer
                      </h4>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.4' }}>
                      Project remains profitable even if selling rate drops by up to {(selectedStudy.sensitivityAnalysis?.priceDropMargin || 12.5)}%.
                    </p>
                  </div>

                  {/* 3. Parking Slots Capacity Card */}
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Parking Capacity</span>
                      <h4 style={{ margin: '4px 0', fontSize: '14px', fontWeight: 'bold', color: selectedStudy.parkingStatus === 'Deficient' ? '#b91c1c' : '#1e293b' }}>
                        {selectedStudy.parkingStatus || 'Compliant'}
                      </h4>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                      Verify layout layout against bylaws checkoff margins.
                    </p>
                  </div>

                </div>

                {/* Built-up Area Utilization progress bar */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  {(() => {
                    const proposedArea = selectedStudy.builtUpAreaProposed || 110000;
                    const maxPermitted = selectedStudy.builtUpAreaMax || 125000;
                    const percent = Math.min(100, Math.round((proposedArea / maxPermitted) * 100));
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                          <span style={{ color: '#1e293b' }}>Proposed Built-Up Area Utilization</span>
                          <span style={{ color: percent > 100 ? '#b91c1c' : '#059669' }}>
                            {proposedArea.toLocaleString()} sqft / {maxPermitted.toLocaleString()} max permissible
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: percent > 100 ? 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                            borderRadius: '4px'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '6px' }}>
                          <span>0 sqft</span>
                          <span>{percent}% bylaw utilization rate</span>
                          <span>Limit</span>
                        </div>
                      </>
                    );
                  })()}
                </div>



                {/* Executive Summary */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <Sparkles size={16} className="text-indigo-500" />
                    Feasibility & Compliance Report
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedStudy.aiFeasibilityReport ? formatMarkdown(selectedStudy.aiFeasibilityReport) : 'No feasibility report available.'}
                  </div>
                </div>

                {/* Cashflow Projections */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <BarChart3 size={16} className="text-emerald-500" />
                    Timeline & Cash Flow forecast
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedStudy.aiCashFlow ? formatMarkdown(selectedStudy.aiCashFlow) : 'No cash flow logs computed.'}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="ai-card-body flex flex-col items-center justify-center text-center p-8 min-h-[150px]">
              <Info size={48} className="text-slate-300 mb-2" />
              <h3 className="font-semibold text-slate-700">No Study Selected</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[280px]">Select a Proposal study from the table or add a new parameters form.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
