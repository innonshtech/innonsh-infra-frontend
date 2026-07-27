import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { LayoutDashboard, Plus, Sparkles, Info, ChevronRight, MessageSquare, Loader2, Download, Building, DollarSign, Ruler, Compass, Layers, CheckSquare } from 'lucide-react';
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

export default function PropertyPlanningPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [chatStarting, setChatStarting] = useState(false);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [plotSize, setPlotSize] = useState('');
  const [roadWidth, setRoadWidth] = useState('');
  const [fsi, setFsi] = useState('');
  const [budget, setBudget] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('Mid-Tier Residential');
  
  // Setbacks & Floors input parameters
  const [frontSetback, setFrontSetback] = useState('6');
  const [rearSetback, setRearSetback] = useState('3');
  const [sideSetbacks, setSideSetbacks] = useState('3');
  const [requestedFloors, setRequestedFloors] = useState('1');
  const [isRevision, setIsRevision] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getPropertyPlans();
      setPlans(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedPlan(data.data[0]);
      }
    } catch (err) {
      toast.error('Failed to load historical property plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName || !plotSize || !roadWidth || !fsi || !budget) {
      toast.warning('Please fill in all planning parameters');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate next version number if revision is checked
      let calculatedVersion = 'V1';
      let calculatedParentId = null;
      if (isRevision && selectedPlan) {
        calculatedParentId = selectedPlan.parentPlanId || selectedPlan.id;
        const relatedVersionsCount = plans.filter(
          p => p.parentPlanId === calculatedParentId || p.id === calculatedParentId
        ).length;
        calculatedVersion = `V${relatedVersionsCount + 1}`;
      }

      const payload = {
        projectName,
        plotSize: Number(plotSize),
        roadWidth: Number(roadWidth),
        fsi: Number(fsi),
        budget: Number(budget),
        targetCustomer,
        frontSetback: Number(frontSetback),
        rearSetback: Number(rearSetback),
        sideSetbacks: Number(sideSetbacks),
        requestedFloors: Number(requestedFloors),
        version: calculatedVersion,
        parentPlanId: calculatedParentId
      };

      toast.info(`Generating ${calculatedVersion} layout blueprint with local zoning calculations...`);
      const { data } = await aiService.generatePropertyPlan(payload);
      toast.success(`Plan ${calculatedVersion} compiled and saved successfully!`);

      // Reset form
      setProjectName('');
      setPlotSize('');
      setRoadWidth('');
      setFsi('');
      setBudget('');
      setTargetCustomer('Mid-Tier Residential');
      setFrontSetback('6');
      setRearSetback('3');
      setSideSetbacks('3');
      setRequestedFloors('1');
      setIsRevision(false);

      // Refresh list
      const updatedPlans = [data.data, ...plans];
      setPlans(updatedPlans);
      setSelectedPlan(data.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'AI Property Planning compilation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!selectedPlan) return;
    setChatStarting(true);
    try {
      const prompt = `Here is the AI Property Planning details:
- **Project Name**: ${selectedPlan.projectName} (${selectedPlan.version})
- **Plot Size**: ${selectedPlan.plotSize} sq. ft.
- **Road Width**: ${selectedPlan.roadWidth} meters
- **FSI (Floor Space Index)**: ${selectedPlan.fsi}
- **Budget**: INR ${selectedPlan.budget.toLocaleString()}
- **Target Customer**: ${selectedPlan.targetCustomer}
- **Zoning Setbacks**: Front: ${selectedPlan.frontSetback || 6}m, Rear: ${selectedPlan.rearSetback || 3}m, Sides: ${selectedPlan.sideSetbacks || 3}m
- **Requested Floors**: ${selectedPlan.requestedFloors || 1}

AI Calculated Metrics:
- **Optimal Floors**: ${selectedPlan.floors || 1}
- **Total Units**: ${selectedPlan.totalUnits || 0} Flats
- **Built-Up Area**: ${selectedPlan.builtUpArea?.toLocaleString() || 'N/A'} sq. ft.
- **FSI Utilized**: ${selectedPlan.fsiUsed || 'N/A'}
- **Ground Coverage**: ${selectedPlan.coverage || 'N/A'}%
- **Parking Slots**: ${selectedPlan.parkingSpaces || 0} slots

Optimal Unit Mix:
${selectedPlan.unitMix || 'N/A'}

Parking Layout:
${selectedPlan.parkingLayout || 'N/A'}

Please advise me on the architectural design revisions, spatial configurations, or construction scheduling for this layout.`;

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

  const handleDownloadDxf = () => {
    if (!selectedPlan || !selectedPlan.dxfContent) {
      toast.error('No DXF CAD data available to download.');
      return;
    }
    try {
      const blob = new Blob([selectedPlan.dxfContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedPlan.projectName.toLowerCase().replace(/\s+/g, '_')}_layout_${selectedPlan.version.toLowerCase()}.dxf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('DXF file downloaded! Import it directly in AutoCAD, Revit, or SketchUp.');
    } catch (err) {
      toast.error('Failed to export DXF file.');
    }
  };

  return (
    <div className="ai-page-container">
      {/* Header */}
      <div className="ai-header">
        <h1 className="ai-title">
          <Building className="text-primary" size={32} />
          AI Property Planning & Layouts
        </h1>
        <p className="ai-subtitle">
          Input your plot details, road width, local setbacks, and target floors. Gemini AI computes coverage limits, built-up area, FSI utilization, unit count, and compiles downloadable CAD DXF blueprints.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Top: Input Form (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <Plus size={18} />
              Setup Property Plan & Layout Parameters
            </h2>
          </div>
          <div className="ai-card-body" style={{ marginTop: '1rem' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-3 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Project Name</label>
                  <input
                    type="text"
                    className="ai-input"
                    placeholder="e.g. Sunshine Residency"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Target Customer Profile</label>
                  <select
                    className="ai-select"
                    value={targetCustomer}
                    onChange={(e) => setTargetCustomer(e.target.value)}
                  >
                    <option value="Affordable Housing">Affordable Housing (Compact layouts / Low Cost)</option>
                    <option value="Mid-Tier Residential">Mid-Tier Residential (Comfortable / Standard Amenities)</option>
                    <option value="Premium Luxury">Premium Luxury (Spacious apartments / High-End Clubs)</option>
                    <option value="Commercial Plaza">Commercial Plaza (Retail / Office units)</option>
                    <option value="Mixed-Use Building">Mixed-Use (Retail Ground + Residential Upper)</option>
                  </select>
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Construction Budget (INR)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 150000000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-4 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Plot Size (Sq. Ft.)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 10000"
                    value={plotSize}
                    onChange={(e) => setPlotSize(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Road Width (Meters)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 18"
                    value={roadWidth}
                    onChange={(e) => setRoadWidth(e.target.value)}
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
                <div className="ai-form-group">
                  <label className="ai-label">Requested Target Floors</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 10"
                    value={requestedFloors}
                    onChange={(e) => setRequestedFloors(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-3 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Front Setback (Meters)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 6"
                    value={frontSetback}
                    onChange={(e) => setFrontSetback(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Rear Setback (Meters)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 3"
                    value={rearSetback}
                    onChange={(e) => setRearSetback(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Left/Right Side Setbacks (Meters)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 3"
                    value={sideSetbacks}
                    onChange={(e) => setSideSetbacks(e.target.value)}
                  />
                </div>
              </div>

              {selectedPlan && (
                <div className="flex items-center gap-2 mb-md" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id="isRevision"
                    className="w-4 h-4 rounded text-primary border-slate-300"
                    checked={isRevision}
                    onChange={(e) => setIsRevision(e.target.checked)}
                  />
                  <label htmlFor="isRevision" className="text-xs text-slate-600 font-medium select-none cursor-pointer">
                    Generate this layout as a revision of <strong>{selectedPlan.projectName} ({selectedPlan.version})</strong>
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full flex justify-center items-center gap-2 mt-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner" /> Synthesizing setbacks limits and AutoCAD coordinate layers...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Generate AI Layout
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Middle: Calculated Plans List (Full Width) */}
        <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <LayoutDashboard size={18} />
              Calculated Real Estate Plans & Design Options
            </h2>
          </div>
          <div className="ai-card-body p-0" style={{ marginTop: '1rem' }}>
            {loading ? (
              <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
            ) : plans.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No planning schemes compiled. Submit coordinates above.</div>
            ) : (
              <div className="ai-table-container">
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Project Proposal</th>
                      <th>Version</th>
                      <th>Plot Area</th>
                      <th>FSI Utilized</th>
                      <th>Total Floors</th>
                      <th>Total Units</th>
                      <th>Saleable Area</th>
                      <th>Status</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr
                        key={p.id}
                        className={selectedPlan?.id === p.id ? 'bg-indigo-50/20 font-medium' : ''}
                        onClick={() => setSelectedPlan(p)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{p.projectName}</td>
                        <td>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                            {p.version}
                          </span>
                        </td>
                        <td>{p.plotSize.toLocaleString()} sqft</td>
                        <td>{p.fsiUsed || 'N/A'} / {p.fsi}</td>
                        <td>{p.floors || 1}</td>
                        <td><strong>{p.totalUnits || 0} units</strong></td>
                        <td><strong>{p.saleableArea?.toLocaleString() || 'N/A'} sqft</strong></td>
                        <td>
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            {p.status}
                          </span>
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

        {/* Bottom: AI Planning Workspace Panel (Full Width and Scrollable) */}
        <div className="ai-card w-full">
          {submitting ? (
            <div className="ai-card-body flex flex-col items-center justify-center min-h-[300px]">
              <div className="ai-loading-container" style={{ padding: '2rem 0' }}>
                <div className="spinner spinner-lg spinner-primary" />
                <p className="ai-thinking-text">🤖 Gemini AI is compiling structural envelopes and preparing architectural DXF files...</p>
              </div>
            </div>
          ) : selectedPlan ? (
            <div className="ai-card-body">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  <div className="ai-score-circle" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' }}>
                    {selectedPlan.version}
                  </div>
                  <div className="ai-score-details">
                    <span className="ai-score-label">{selectedPlan.projectName} ({selectedPlan.version})</span>
                    <span className="ai-score-status" style={{ fontSize: '11px', color: '#64748b' }}>
                      Setbacks: Front {selectedPlan.frontSetback || 6}m | Rear {selectedPlan.rearSetback || 3}m | Sides {selectedPlan.sideSetbacks || 3}m
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Download DXF CAD button */}
                  <button
                    onClick={handleDownloadDxf}
                    className="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                    style={{ fontSize: '11px', padding: '6px 12px', height: 'fit-content' }}
                    title="Export vector DXF drawing layer to AutoCAD"
                  >
                    <Download size={14} />
                    Export to AutoCAD (DXF)
                  </button>

                  {/* Chat Integration Button! */}
                  <button
                    onClick={handleStartChat}
                    disabled={chatStarting}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                    style={{ fontSize: '11px', padding: '6px 12px', height: 'fit-content' }}
                    title="Ask AI to refine this drawing version"
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

              {/* Core Metrics Grid */}
              <div className="grid grid-6 gap-md mb-lg border border-slate-100 bg-slate-50/50 p-4 rounded-xl" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="text-center">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Total Floors</span>
                  <strong className="text-lg text-slate-700 font-bold">{selectedPlan.floors || 1} Floors</strong>
                </div>
                <div className="text-center border-l border-slate-100">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Total Units</span>
                  <strong className="text-lg text-slate-700 font-bold">{selectedPlan.totalUnits || 0} Flats</strong>
                </div>
                <div className="text-center border-l border-slate-100">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Parking Slots</span>
                  <strong className="text-lg text-slate-700 font-bold">{selectedPlan.parkingSpaces || 0} Spaces</strong>
                </div>
                <div className="text-center border-l border-slate-100">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Built-Up Area</span>
                  <strong className="text-lg text-slate-700 font-bold">{(selectedPlan.builtUpArea || 0).toLocaleString()} sqft</strong>
                </div>
                <div className="text-center border-l border-slate-100">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">FSI Utilized</span>
                  <strong className="text-lg text-slate-700 font-bold">{selectedPlan.fsiUsed || 0} / {selectedPlan.fsi}</strong>
                </div>
                <div className="text-center border-l border-slate-100">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Ground Coverage</span>
                  <strong className="text-lg text-slate-700 font-bold">{selectedPlan.coverage || 0}%</strong>
                </div>
              </div>

              {/* Scrollable Content Body with Side-by-Side split */}
              <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '12px', marginRight: '-6px' }}>
                <div className="grid grid-2 gap-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                  
                  {/* Left Column: Spatial Metrics Reports */}
                  <div>
                    {/* Unit Mix */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <Compass size={16} className="text-indigo-500" />
                        Optimal Unit Mix & Configuration
                      </h3>
                      <div className="ai-report-section-content">
                        {selectedPlan.unitMix ? formatMarkdown(selectedPlan.unitMix) : 'No configurations generated.'}
                      </div>
                    </div>

                    {/* Parking Layout */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <Ruler size={16} className="text-slate-500" />
                        Parking Distribution & Layout
                      </h3>
                      <div className="ai-report-section-content">
                        {selectedPlan.parkingLayout ? formatMarkdown(selectedPlan.parkingLayout) : 'No parking plans computed.'}
                      </div>
                    </div>

                    {/* Amenities & Club House */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <Building size={16} className="text-emerald-500" />
                        Amenities & Clubhouse Sizing
                      </h3>
                      <div className="ai-report-section-content">
                        <strong>Clubhouse space:</strong>
                        {selectedPlan.clubHouse ? formatMarkdown(selectedPlan.clubHouse) : <p className="text-xs text-slate-500">None</p>}
                        <div className="h-2" />
                        <strong>Landscape & buffer zones:</strong>
                        {selectedPlan.landscape ? formatMarkdown(selectedPlan.landscape) : <p className="text-xs text-slate-500">None</p>}
                      </div>
                    </div>

                    {/* Commercial Splitting */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <LayoutDashboard size={16} className="text-amber-500" />
                        Commercial Floor Allocations
                      </h3>
                      <div className="ai-report-section-content">
                        {selectedPlan.commercialSpace ? formatMarkdown(selectedPlan.commercialSpace) : 'No commercial allocations computed.'}
                      </div>
                    </div>

                    {/* Elevation Concepts */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <Sparkles size={16} className="text-pink-500" />
                        Elevation Concepts & Facade Style
                      </h3>
                      <div className="ai-report-section-content">
                        {selectedPlan.elevationConcept ? formatMarkdown(selectedPlan.elevationConcept) : 'No aesthetic concept brief available.'}
                      </div>
                    </div>

                    {/* Cost Estimates */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <DollarSign size={16} className="text-emerald-600" />
                        Itemized Cost Estimates
                      </h3>
                      <div className="ai-report-section-content">
                        {selectedPlan.costEstimates ? formatMarkdown(selectedPlan.costEstimates) : 'No financial estimates.'}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual 2D Layout Plan Map */}
                  <div className="flex flex-col items-center gap-3">
                    <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider self-start">
                      🤖 Interactive 2D Plot Blueprint Map (Auto-Generated)
                    </h4>
                    
                    {selectedPlan.svgFloorPlan ? (
                      <div 
                        className="w-full shadow-inner border border-slate-100 rounded-lg p-2 bg-slate-50 flex items-center justify-center"
                        style={{ maxWidth: '380px', aspectRatio: '1/1' }}
                        dangerouslySetInnerHTML={{ __html: selectedPlan.svgFloorPlan }}
                      />
                    ) : (
                      <div 
                        className="w-full flex items-center justify-center bg-slate-100 rounded-lg text-slate-400"
                        style={{ maxWidth: '380px', aspectRatio: '1/1' }}
                      >
                        No layout geometry available.
                      </div>
                    )}
                    <p className="text-center text-[10px] text-slate-400 max-w-[280px]">
                      The blueprint above displays relative building margins, block footprints, park zones, and clubhouse outlines based on the plot boundaries.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <div className="ai-card-body flex flex-col items-center justify-center text-center p-8 min-h-[150px]">
              <Info size={48} className="text-slate-300 mb-2" />
              <h3 className="font-semibold text-slate-700">No Property Scheme Selected</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[280px]">Select a project from the table above or specify parameters to compile a layout.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
