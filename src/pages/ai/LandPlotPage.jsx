import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Map as MapIcon, MapPin, Upload, Sparkles, Scale, Info, ChevronRight, AlertTriangle, Coins, MessageSquare, Loader2 } from 'lucide-react';
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
  const [titleDeed, setTitleDeed] = useState(null);

  useEffect(() => {
    fetchPlots();
  }, []);

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

  const handleFileConvert = (e, setFile) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFile({
        name: file.name,
        base64: reader.result,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
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
        soilReport: soilReport ? { base64: soilReport.base64, mimeType: soilReport.mimeType } : undefined,
        titleDeed: titleDeed ? { base64: titleDeed.base64, mimeType: titleDeed.mimeType } : undefined,
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
      setTitleDeed(null);

      // Refresh list
      const updatedPlots = [data.data, ...plots];
      setPlots(updatedPlots);
      setSelectedPlot(data.data);
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
    <div className="ai-page-container">
      {/* Header */}
      <div className="ai-header">
        <h1 className="ai-title">
          <MapIcon className="text-primary" size={32} />
          AI Land Bank Management
        </h1>
        <p className="ai-subtitle">
          Input plot parameters and upload geotechnical/legal files. Gemini parses document attachments and estimates Land Scores & Risks.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Top: New Plot Form (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <MapPin size={18} />
              Register New Land Plot
            </h2>
          </div>
          <div className="ai-card-body" style={{ marginTop: '1rem' }}>
            <form onSubmit={handleSubmit}>
              {/* Form Grid Rows - 3 columns */}
              <div className="grid grid-3 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
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

              <div className="grid grid-3 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
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

              <div className="grid grid-2 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
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

              {/* Upload Section - 2 columns */}
              <div className="grid grid-2 gap-md mb-lg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Geotechnical Soil Report</label>
                  <label className={`ai-upload-zone ${soilReport ? 'ai-uploaded-file' : ''}`}>
                    <Upload size={20} className="ai-upload-icon" />
                    <span className="ai-upload-text">
                      {soilReport ? soilReport.name : 'Upload Soil PDF/Txt'}
                    </span>
                    <span className="ai-upload-hint">Gemini analyzes load-bearing capacity</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileConvert(e, setSoilReport)}
                    />
                  </label>
                </div>

                <div className="ai-form-group">
                  <label className="ai-label">Land Title / Encumbrance Deed</label>
                  <label className={`ai-upload-zone ${titleDeed ? 'ai-uploaded-file' : ''}`}>
                    <Upload size={20} className="ai-upload-icon" />
                    <span className="ai-upload-text">
                      {titleDeed ? titleDeed.name : 'Upload Title PDF/Txt'}
                    </span>
                    <span className="ai-upload-hint">Gemini checks for mortgage/legal disputes</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileConvert(e, setTitleDeed)}
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full flex justify-center items-center gap-2"
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
        </div>

        {/* Middle: Your Land Inventory (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <MapIcon size={18} />
              Your Land Inventory
            </h2>
          </div>
          <div className="ai-card-body p-0" style={{ marginTop: '1rem' }}>
            {loading ? (
              <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
            ) : plots.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No registered land plots found. Please add one above.</div>
            ) : (
              <div className="ai-table-container">
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Plot Name</th>
                      <th>Survey No</th>
                      <th>Village / Locality</th>
                      <th>Area (Sqft)</th>
                      <th>AI Score</th>
                      <th style={{ width: '30px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {plots.map((plot) => (
                      <tr
                        key={plot.id}
                        className={selectedPlot?.id === plot.id ? 'bg-indigo-50/20 font-medium' : ''}
                        onClick={() => setSelectedPlot(plot)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{plot.name}</td>
                        <td>{plot.surveyNumber || 'N/A'}</td>
                        <td>{plot.village || 'N/A'}</td>
                        <td>{plot.area.toLocaleString()}</td>
                        <td>
                          {plot.aiScore ? (
                            <span className={`ai-badge ${plot.aiScore >= 8 ? 'ai-badge-success' : plot.aiScore >= 5 ? 'ai-badge-warning' : 'ai-badge-danger'}`}>
                              {plot.aiScore}/10
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

        {/* Bottom: AI Analysis Report (Full Width with Fixed Scrollable Content) */}
        <div className="ai-card w-full">
          {submitting ? (
            <div className="ai-card-body flex flex-col items-center justify-center min-h-[300px]">
              <div className="ai-loading-container" style={{ padding: '2rem 0' }}>
                <div className="spinner spinner-lg spinner-primary" />
                <p className="ai-thinking-text">🤖 Gemini AI is processing Soil reports and evaluating appreciation trends...</p>
              </div>
            </div>
          ) : selectedPlot ? (
            <div className="ai-card-body">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  <div className="ai-score-circle">
                    {selectedPlot.aiScore ? selectedPlot.aiScore.toFixed(1) : 'N/A'}
                  </div>
                  <div className="ai-score-details">
                    <span className="ai-score-label" style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>AI Land Score</span>
                    <span className="ai-score-status" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      {selectedPlot.aiScore >= 8 ? 'High Potential Investment' : selectedPlot.aiScore >= 5 ? 'Moderate Risk / Standard Plot' : 'Low Potential or Risky'}
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
                
                {/* Suggested Price */}
                {selectedPlot.aiSuggestedPrice && (
                  <div className="ai-highlight-box mb-4">
                    <Coins className="ai-highlight-icon" size={20} />
                    <div>
                      <h4 className="font-semibold text-xs text-indigo-900 uppercase tracking-wider mb-0.5">AI Valuation Recommendation</h4>
                      <span className="text-sm font-bold text-slate-800">
                        Suggested Purchase Price: INR {selectedPlot.aiSuggestedPrice.toLocaleString()}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Asking Price was INR {selectedPlot.askingPrice.toLocaleString()} (Difference: {(((selectedPlot.askingPrice - selectedPlot.aiSuggestedPrice)/selectedPlot.askingPrice)*100).toFixed(1)}% negotiable).
                      </p>
                    </div>
                  </div>
                )}

                {/* Appreciation */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <Sparkles size={16} className="text-indigo-500" />
                    Appreciation Prediction
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedPlot.aiAppreciation ? formatMarkdown(selectedPlot.aiAppreciation) : 'No appreciation assessment available.'}
                  </div>
                </div>

                {/* Risks */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Risk & Geotechnical Warnings
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedPlot.aiRiskAnalysis ? formatMarkdown(selectedPlot.aiRiskAnalysis) : 'No risk logs calculated.'}
                  </div>
                </div>

                {/* Detailed Plot Metadata */}
                <div className="border-t border-slate-200 pt-4 mt-6 grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-500">
                  <div><strong>Zoning:</strong> {selectedPlot.zoning}</div>
                  <div><strong>Survey Number:</strong> {selectedPlot.surveyNumber || 'N/A'}</div>
                  <div><strong>Village:</strong> {selectedPlot.village || 'N/A'}</div>
                  {selectedPlot.googleMapLink && (
                    <div className="col-span-2">
                      <strong>GIS Location:</strong>{' '}
                      <a href={selectedPlot.googleMapLink} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                        View on Google Maps 🌐
                      </a>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="ai-card-body flex flex-col items-center justify-center text-center p-8 min-h-[150px]">
              <Info size={48} className="text-slate-300 mb-2" />
              <h3 className="font-semibold text-slate-700">No Plot Selected</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[280px]">Select a plot from your Land Inventory or add a new one to view the AI analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
