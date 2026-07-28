import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Calculator, Plus, Sparkles, Scale, Info, ChevronRight, BarChart3, TrendingUp, HelpCircle, Upload, MessageSquare, Loader2 } from 'lucide-react';
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

export default function FeasibilityPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [chatStarting, setChatStarting] = useState(false);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [area, setArea] = useState('');
  const [fsi, setFsi] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [bylawsDoc, setBylawsDoc] = useState(null);
  const [uploadingBylaws, setUploadingBylaws] = useState(false);

  useEffect(() => {
    fetchStudies();
  }, []);

  const fetchStudies = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getFeasibilityStudies();
      setStudies(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedStudy(data.data[0]);
      }
    } catch (err) {
      toast.error('Failed to load feasibility studies');
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
      toast.error('Failed to upload bylaws document.');
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
        area: Number(area),
        fsi: Number(fsi),
        sellingPrice: Number(sellingPrice),
        materialCost: Number(materialCost),
        bylawsDoc: bylawsDoc ? { url: bylawsDoc.url, mimeType: 'application/pdf' } : undefined,
      };

      toast.info('Calculating feasibility indices with Gemini AI...');
      const { data } = await aiService.calculateFeasibility(payload);
      toast.success('Feasibility study generated successfully!');
      
      // Reset form
      setProjectName('');
      setArea('');
      setFsi('');
      setSellingPrice('');
      setMaterialCost('');
      setBylawsDoc(null);

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
            <form onSubmit={handleSubmit}>
              <div className="ai-form-group mb-3">
                <label className="ai-label">Project Name / Proposal</label>
                <input
                  type="text"
                  className="ai-input"
                  placeholder="e.g. Green Valley Plaza"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              {/* Area and FSI grid */}
              <div className="grid grid-2 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Plot Area (Sq. Ft.)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 15000"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Permitted FSI (Multiplier)</label>
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

              {/* Prices grid */}
              <div className="grid grid-2 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Expected Selling Price (INR / Sqft)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 6500"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Construction Cost (INR / Sqft)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 2200"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="ai-form-group mb-4">
                <label className="ai-label">Municipal Bye-Laws document</label>
                <label className={`ai-upload-zone ${bylawsDoc ? 'ai-uploaded-file' : ''}`}>
                  <Upload className="ai-upload-icon" size={20} />
                  <span className="ai-upload-text">
                    {uploadingBylaws ? 'Uploading to Supabase...' : (bylawsDoc ? bylawsDoc.name : 'Upload Bye-Laws PDF/Image')}
                  </span>
                  <span className="ai-upload-hint">Gemini checks heights, margins, and setbacks</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={handleBylawsUpload}
                    disabled={uploadingBylaws}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full flex justify-center items-center gap-2"
                disabled={submitting}
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
                <p className="ai-thinking-text">🤖 Gemini AI is processing municipal parameters and running financial models...</p>
              </div>
            </div>
          ) : selectedStudy ? (
            <div className="ai-card-body">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  <div className="ai-score-circle" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}>
                    📊
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
              <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '12px', marginRight: '-6px' }}>

                {/* Profit metrics */}
                {selectedStudy.aiProfit && (
                  <div className="ai-highlight-box mb-4">
                    <TrendingUp className="ai-highlight-icon" size={20} />
                    <div>
                      <h4 className="font-semibold text-xs text-indigo-900 uppercase tracking-wider mb-0.5">Project Net Profit Projections</h4>
                      <span className="text-lg font-bold text-slate-800">
                        ₹{selectedStudy.aiProfit.toLocaleString()}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Based on built area of {(selectedStudy.area * selectedStudy.fsi).toLocaleString()} sqft.
                      </p>
                    </div>
                  </div>
                )}

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

                {/* Break-even */}
                {selectedStudy.aiBreakEven && (
                  <div className="ai-report-section">
                    <h3 className="ai-report-section-title">
                      <Scale size={16} className="text-slate-500" />
                      Break-Even Saleable Area
                    </h3>
                    <div className="ai-report-section-content">
                      Must build and sell at least <strong>{selectedStudy.aiBreakEven.toLocaleString()} sqft</strong> to cover project acquisition, material, and labor costs.
                    </div>
                  </div>
                )}

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
