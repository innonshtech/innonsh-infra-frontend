import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Handshake, Plus, Sparkles, Scale, Info, ChevronRight, AlertTriangle, TrendingUp, DollarSign, Upload, MessageSquare, Loader2 } from 'lucide-react';
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

export default function JVAgreementPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedJv, setSelectedJv] = useState(null);
  const [chatStarting, setChatStarting] = useState(false);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [landOwnerName, setLandOwnerName] = useState('');
  const [builderName, setBuilderName] = useState('');
  const [investorName, setInvestorName] = useState('');
  const [landValue, setLandValue] = useState('');
  const [constructionCost, setConstructionCost] = useState('');
  const [investorFunds, setInvestorFunds] = useState('');
  const [landOwnerTerms, setLandOwnerTerms] = useState('');
  const [builderTerms, setBuilderTerms] = useState('');
  const [investorTerms, setInvestorTerms] = useState('');
  const [termSheet, setTermSheet] = useState(null);

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getJVAgreements();
      setAgreements(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedJv(data.data[0]);
      }
    } catch (err) {
      toast.error('Failed to load JV agreements');
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
    if (!projectName || !landOwnerName || !builderName || !landValue || !constructionCost) {
      toast.warning('Please fill in core JV parameters (Project, Land Owner, Builder, Costs)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        projectName,
        landOwnerName,
        builderName,
        investorName: investorName || 'N/A (No Investor)',
        landValue: Number(landValue),
        constructionCost: Number(constructionCost),
        investorFunds: Number(investorFunds || 0),
        landOwnerTerms: landOwnerTerms || 'Standard Area/Profit Share',
        builderTerms: builderTerms || 'Standard Development Terms',
        investorTerms: investorTerms || 'No special investor terms',
        termSheet: termSheet ? { base64: termSheet.base64, mimeType: termSheet.mimeType } : undefined,
      };

      toast.info('Analyzing JV proposals with Gemini AI...');
      const { data } = await aiService.analyzeJVAgreement(payload);
      toast.success('JV Agreement analysis processed successfully!');
      
      // Reset form
      setProjectName('');
      setLandOwnerName('');
      setBuilderName('');
      setInvestorName('');
      setLandValue('');
      setConstructionCost('');
      setInvestorFunds('');
      setLandOwnerTerms('');
      setBuilderTerms('');
      setInvestorTerms('');
      setTermSheet(null);

      // Refresh list
      const updatedJvs = [data.data, ...agreements];
      setAgreements(updatedJvs);
      setSelectedJv(data.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gemini JV evaluation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!selectedJv) return;
    setChatStarting(true);
    try {
      const prompt = `Here is the Joint Venture (JV) Agreement details:
- **Project Name**: ${selectedJv.projectName}
- **Land Owner Name**: ${selectedJv.landOwnerName} (Land Value: INR ${selectedJv.landValue})
- **Builder/Developer Name**: ${selectedJv.builderName} (Est. Construction Cost: INR ${selectedJv.constructionCost})
- **Investor**: ${selectedJv.investorName || 'N/A'} (Investor Funds: INR ${selectedJv.investorFunds || 0})

Recommended JV Model:
${selectedJv.aiRecommendedModel || 'N/A'}

ROI Projections:
${selectedJv.aiRoiPrediction || 'N/A'}

Contractual Risks & Mitigations:
${selectedJv.aiRiskAnalysis || 'N/A'}

Please advise me on the negotiation strategy, contract drafting clauses, or profit-sharing optimization for this JV.`;

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
          <Handshake className="text-primary" size={32} />
          AI JV (Joint Venture) Management
        </h1>
        <p className="ai-subtitle">
          Assess partner shares and investment terms. Gemini recommends optimal JV structures (Revenue vs Area Share) and lists contractual risks.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Top: Calculate New JV Deal Form (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <Plus size={18} />
              Calculate New JV Deal
            </h2>
          </div>
          <div className="ai-card-body" style={{ marginTop: '1rem' }}>
            <form onSubmit={handleSubmit}>
              <div className="ai-form-group mb-3">
                <label className="ai-label">JV Project Name</label>
                <input
                  type="text"
                  className="ai-input"
                  placeholder="e.g. Riverside Residences JV"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              {/* Owner and Builder grid */}
              <div className="grid grid-2 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Land Owner Name</label>
                  <input
                    type="text"
                    className="ai-input"
                    placeholder="e.g. Mr. Ramesh Patil"
                    value={landOwnerName}
                    onChange={(e) => setLandOwnerName(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Land Value Contribution (INR)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 30000000"
                    value={landValue}
                    onChange={(e) => setLandValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-2 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Builder/Developer Name</label>
                  <input
                    type="text"
                    className="ai-input"
                    placeholder="e.g. Innonsh Builders"
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Est. Construction Cost (INR)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 50000000"
                    value={constructionCost}
                    onChange={(e) => setConstructionCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-2 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Third-party Investor Name (Optional)</label>
                  <input
                    type="text"
                    className="ai-input"
                    placeholder="e.g. Mumbai Realty Fund"
                    value={investorName}
                    onChange={(e) => setInvestorName(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Investor Funds (INR - Optional)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 20000000"
                    value={investorFunds}
                    onChange={(e) => setInvestorFunds(e.target.value)}
                  />
                </div>
              </div>

              {/* Partner Demands - 3 columns */}
              <div className="grid grid-3 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Land Owner Demands & Terms</label>
                  <textarea
                    rows={2}
                    className="ai-textarea"
                    placeholder="e.g. Demands 45% built-up area and INR 10 Lakhs upfront refundable deposit"
                    value={landOwnerTerms}
                    onChange={(e) => setLandOwnerTerms(e.target.value)}
                  />
                </div>

                <div className="ai-form-group">
                  <label className="ai-label">Builder Terms & Fees</label>
                  <textarea
                    rows={2}
                    className="ai-textarea"
                    placeholder="e.g. Demands 15% project coordination fee, takes remaining area share"
                    value={builderTerms}
                    onChange={(e) => setBuilderTerms(e.target.value)}
                  />
                </div>

                <div className="ai-form-group">
                  <label className="ai-label">Investor ROI Terms (If applicable)</label>
                  <textarea
                    rows={2}
                    className="ai-textarea"
                    placeholder="e.g. Requires 18% preferred return on equity before profit splits"
                    value={investorTerms}
                    onChange={(e) => setInvestorTerms(e.target.value)}
                  />
                </div>
              </div>

              {/* MOU upload */}
              <div className="ai-form-group mb-4">
                <label className="ai-label">Draft MOU / Term Sheet Document</label>
                <label className={`ai-upload-zone ${termSheet ? 'ai-uploaded-file' : ''}`}>
                  <Upload className="ai-upload-icon" size={20} />
                  <span className="ai-upload-text">
                    {termSheet ? termSheet.name : 'Upload Term Sheet PDF/Txt'}
                  </span>
                  <span className="ai-upload-hint">Gemini checks clauses and preferred exits</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileConvert(e, setTermSheet)}
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
                    <div className="spinner" /> Evaluating JV structure with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Run JV Analysis
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Middle: JV Agreements List (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <Handshake size={18} />
              Calculated JV Agreements
            </h2>
          </div>
          <div className="ai-card-body p-0" style={{ marginTop: '1rem' }}>
            {loading ? (
              <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
            ) : agreements.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No JV agreements found. Calculate one above.</div>
            ) : (
              <div className="ai-table-container">
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Landowner</th>
                      <th>Builder</th>
                      <th>Investor</th>
                      <th>Land Value</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreements.map((jv) => (
                      <tr
                        key={jv.id}
                        className={selectedJv?.id === jv.id ? 'bg-indigo-50/20 font-medium' : ''}
                        onClick={() => setSelectedJv(jv)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{jv.projectName}</td>
                        <td>{jv.landOwnerName}</td>
                        <td>{jv.builderName}</td>
                        <td>{jv.investorName || 'N/A'}</td>
                        <td>₹{(jv.landValue / 100000).toFixed(1)} Lakhs</td>
                        <td><ChevronRight size={16} className="text-slate-400" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: AI Recommendation Panel (Full Width and Scrollable) */}
        <div className="ai-card w-full">
          {submitting ? (
            <div className="ai-card-body flex flex-col items-center justify-center min-h-[300px]">
              <div className="ai-loading-container" style={{ padding: '2rem 0' }}>
                <div className="spinner spinner-lg spinner-primary" />
                <p className="ai-thinking-text">🤖 Gemini AI is verifying cost parameters and calculating profit shares...</p>
              </div>
            </div>
          ) : selectedJv ? (
            <div className="ai-card-body">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  <div className="ai-score-circle" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    JV
                  </div>
                  <div className="ai-score-details">
                    <span className="ai-score-label">AI Recommender</span>
                    <span className="ai-score-status" style={{ fontSize: '12px', fontWeight: 'bold' }}>Optimal Share Structure Recommendations</span>
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

                {/* Recommended model */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <Sparkles size={16} className="text-emerald-500" />
                    Recommended JV Model
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedJv.aiRecommendedModel ? formatMarkdown(selectedJv.aiRecommendedModel) : 'No structure analysis generated.'}
                  </div>
                </div>

                {/* ROI Projections */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <TrendingUp size={16} className="text-indigo-500" />
                    ROI Predictions
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedJv.aiRoiPrediction ? formatMarkdown(selectedJv.aiRoiPrediction) : 'No financial projections computed.'}
                  </div>
                </div>

                {/* Risk Breakdown */}
                <div className="ai-report-section">
                  <h3 className="ai-report-section-title">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Contractual Risks & Mitigations
                  </h3>
                  <div className="ai-report-section-content">
                    {selectedJv.aiRiskAnalysis ? formatMarkdown(selectedJv.aiRiskAnalysis) : 'No risk analysis available.'}
                  </div>
                </div>

                {/* Share Summary */}
                <div className="border-t border-slate-200 pt-4 mt-6 flex flex-col gap-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span><strong>Land Value Contribution:</strong> ₹{selectedJv.landValue.toLocaleString()}</span>
                    <span><strong>Est. Construction Cost:</strong> ₹{selectedJv.constructionCost.toLocaleString()}</span>
                  </div>
                  {selectedJv.investorFunds > 0 && (
                    <div className="flex justify-between font-medium text-slate-600">
                      <span><strong>Investor Partner:</strong> {selectedJv.investorName}</span>
                      <span><strong>Investor Funds:</strong> ₹{selectedJv.investorFunds.toLocaleString()}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="ai-card-body flex flex-col items-center justify-center text-center p-8 min-h-[150px]">
              <Info size={48} className="text-slate-300 mb-2" />
              <h3 className="font-semibold text-slate-700">No JV Selected</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[280px]">Select a JV Deal or input a new one to view Gemini recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
