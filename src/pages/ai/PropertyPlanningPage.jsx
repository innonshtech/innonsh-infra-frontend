import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { 
  LayoutDashboard, Plus, Sparkles, Info, ChevronRight, MessageSquare, Loader2, Download, 
  Building, DollarSign, Ruler, Compass, Layers, CheckSquare, AlertTriangle, ShieldCheck, 
  HelpCircle, RefreshCw, ZoomIn, ZoomOut, RotateCw
} from 'lucide-react';
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

  // SVG viewport transforms
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

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
  const [requestedFloors, setRequestedFloors] = useState('8');
  
  // Advanced Inputs
  const [facing, setFacing] = useState('East');
  const [parkingType, setParkingType] = useState('Basement');
  const [gardenRequired, setGardenRequired] = useState(true);
  const [swimmingPool, setSwimmingPool] = useState(true);
  const [commercialShops, setCommercialShops] = useState(false);
  const [flatMix, setFlatMix] = useState('2BHK + 3BHK');
  const [liftCount, setLiftCount] = useState('2');
  const [staircaseCount, setStaircaseCount] = useState('2');
  
  // Strict math parameters
  const [landCost, setLandCost] = useState('');
  const [expectedSalesRate, setExpectedSalesRate] = useState('');
  const [flatsPerFloor, setFlatsPerFloor] = useState('4');

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
        parentPlanId: calculatedParentId,
        
        facing,
        parkingType,
        gardenRequired,
        swimmingPool,
        commercialShops,
        flatMix,
        liftCount: Number(liftCount),
        staircaseCount: Number(staircaseCount),
        landCost: landCost ? Number(landCost) : undefined,
        expectedSalesRate: expectedSalesRate ? Number(expectedSalesRate) : undefined,
        flatsPerFloor: flatsPerFloor ? Number(flatsPerFloor) : undefined
      };

      toast.info(`Generating option ${calculatedVersion} with strict zoning formulas...`);
      const { data } = await aiService.generatePropertyPlan(payload);
      toast.success(`Plan Option ${calculatedVersion} compiled and saved successfully!`);

      // Reset form
      setProjectName('');
      setPlotSize('');
      setRoadWidth('');
      setFsi('');
      setBudget('');
      setLandCost('');
      setExpectedSalesRate('');
      setFlatsPerFloor('4');
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
- **FSI**: ${selectedPlan.fsi}
- **Budget**: INR ${selectedPlan.budget.toLocaleString()}
- **Target Customer**: ${selectedPlan.targetCustomer}
- **Facing**: ${selectedPlan.facing || 'East'} | Parking: ${selectedPlan.parkingType || 'Basement'}
- **Zoning Setbacks**: Front: ${selectedPlan.frontSetback || 6}m, Rear: ${selectedPlan.rearSetback || 3}m, Sides: ${selectedPlan.sideSetbacks || 3}m
- **Requested Floors**: ${selectedPlan.requestedFloors || 1}

AI Calculated Metrics:
- **Optimal Floors**: ${selectedPlan.floors || 1}
- **Flats Per Floor**: ${selectedPlan.flatsPerFloor || 2}
- **Total Units**: ${selectedPlan.totalUnits || 0} Flats
- **Built-Up Area**: ${selectedPlan.builtUpArea?.toLocaleString() || 'N/A'} sq. ft.
- **Expected Profit**: ${selectedPlan.expectedProfit ? `INR ${selectedPlan.expectedProfit.toLocaleString()}` : 'Not Provided'}

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

  // Parsing JSON lists safely
  const getParsedList = (jsonStr) => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return jsonStr.split(/[,\n]/).map(t => t.replace(/^[-*•\s]+/, '').trim()).filter(Boolean);
    }
  };

  const currentRisks = selectedPlan ? getParsedList(selectedPlan.riskList) : [];
  const currentRecommendations = selectedPlan ? getParsedList(selectedPlan.recommendations) : [];

  const siblingVersions = selectedPlan 
    ? plans.filter(p => p.projectName === selectedPlan.projectName)
    : [];

  return (
    <div className="ai-page-container">
      {/* Header */}
      <div className="ai-header">
        <h1 className="ai-title">
          <Building className="text-primary" size={32} />
          AI Property Planner
        </h1>
        <p className="ai-subtitle">
          Input your plot parameters, facing rules, setbacks, and target mixes. Gemini AI acts as your senior structural planner, detailing construction cost formulas, risk reports, and AutoCAD-ready coordinate blueprints.
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
              {/* Row 1: General Details */}
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
                  <label className="ai-label">Facing Direction</label>
                  <select className="ai-select" value={facing} onChange={(e) => setFacing(e.target.value)}>
                    <option value="East">East Facing</option>
                    <option value="West">West Facing</option>
                    <option value="North">North Facing</option>
                    <option value="South">South Facing</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Land & Regulations */}
              <div className="grid grid-4 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Plot Size (Sq. Ft.)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 12000"
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
                  <label className="ai-label">Permitted FSI</label>
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
                  <label className="ai-label">Budget Limit (INR)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 120000000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3: Building Structure & Setbacks */}
              <div className="grid grid-4 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Requested Floors</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 8"
                    value={requestedFloors}
                    onChange={(e) => setRequestedFloors(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Front Setback (m)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 6"
                    value={frontSetback}
                    onChange={(e) => setFrontSetback(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Rear Setback (m)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 3"
                    value={rearSetback}
                    onChange={(e) => setRearSetback(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Sides Setbacks (m)</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 3"
                    value={sideSetbacks}
                    onChange={(e) => setSideSetbacks(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 4: AI Preferences & Lift Counts */}
              <div className="grid grid-4 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">Flat Configuration Mix</label>
                  <select className="ai-select" value={flatMix} onChange={(e) => setFlatMix(e.target.value)}>
                    <option value="2BHK + 3BHK">2 BHK + 3 BHK Mix</option>
                    <option value="1BHK + 2BHK">1 BHK + 2 BHK Compact</option>
                    <option value="3BHK + 4BHK">Spacious 3 BHK & 4 BHK</option>
                    <option value="Studio Units">Studio Apartments</option>
                  </select>
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Parking Layout Type</label>
                  <select className="ai-select" value={parkingType} onChange={(e) => setParkingType(e.target.value)}>
                    <option value="Basement">Basement Level Parking</option>
                    <option value="Stilt">Stilt / Ground Covered</option>
                    <option value="Open Ground">Open Surface Parking</option>
                  </select>
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Lifts Count</label>
                  <input
                    type="number"
                    className="ai-input"
                    value={liftCount}
                    onChange={(e) => setLiftCount(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Staircases Count</label>
                  <input
                    type="number"
                    className="ai-input"
                    value={staircaseCount}
                    onChange={(e) => setStaircaseCount(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 5: Feasibility Math Parameters (Strict Pricing Inputs) */}
              <div className="grid grid-3 gap-md mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="ai-form-group">
                  <label className="ai-label">
                    Land Purchase Cost (INR) <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="Leave empty if not applicable"
                    value={landCost}
                    onChange={(e) => setLandCost(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">
                    Expected Sales Rate (₹/Sq. Ft.) <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 6500 (Needed for revenue/profit calculation)"
                    value={expectedSalesRate}
                    onChange={(e) => setExpectedSalesRate(e.target.value)}
                  />
                </div>
                <div className="ai-form-group">
                  <label className="ai-label">Flats Per Floor</label>
                  <input
                    type="number"
                    className="ai-input"
                    placeholder="e.g. 4 (Forces symmetrical floor layout)"
                    value={flatsPerFloor}
                    onChange={(e) => setFlatsPerFloor(e.target.value)}
                  />
                </div>
              </div>

              {/* Checkboxes Row */}
              <div className="flex gap-lg mb-md flex-wrap" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '12px' }}>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-primary border-slate-300"
                    checked={gardenRequired}
                    onChange={(e) => setGardenRequired(e.target.checked)}
                  />
                  Garden Zone Required
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-primary border-slate-300"
                    checked={swimmingPool}
                    onChange={(e) => setSwimmingPool(e.target.checked)}
                  />
                  Swimming Pool Area
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-primary border-slate-300"
                    checked={commercialShops}
                    onChange={(e) => setCommercialShops(e.target.checked)}
                  />
                  Commercial Shops Ground
                </label>
              </div>

              {selectedPlan && (
                <div className="flex items-center gap-2 mb-md" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                  <input
                    type="checkbox"
                    id="isRevision"
                    className="w-4 h-4 rounded text-primary border-slate-300"
                    checked={isRevision}
                    onChange={(e) => setIsRevision(e.target.checked)}
                  />
                  <label htmlFor="isRevision" className="text-xs text-slate-600 font-semibold select-none cursor-pointer">
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
                    <div className="spinner" /> AI is resolving municipal setbacks and calculating financial KPIs...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Generate AI Plan
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
                      <th>Profit (Expected)</th>
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
                        <td>
                          <span className="text-emerald-700 font-semibold">
                            {p.expectedProfit ? `₹${(p.expectedProfit / 10000000).toFixed(2)} Cr` : '₹0.00 Cr'}
                          </span>
                        </td>
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

        {/* Bottom: AI Planning Workspace Panel */}
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
              {/* Header inside Panel */}
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                  <div className="ai-score-circle" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' }}>
                    {selectedPlan.version}
                  </div>
                  <div className="ai-score-details">
                    <span className="ai-score-label">{selectedPlan.projectName} ({selectedPlan.version})</span>
                    <span className="ai-score-status" style={{ fontSize: '11px', color: '#64748b' }}>
                      Status: <strong>{selectedPlan.status}</strong> | Created On: {new Date(selectedPlan.createdAt).toLocaleDateString()}
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
                    Export DXF
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

              {/* 💸 Financial KPIs Section (Revenue, Cost, ROI, etc.) */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">💰 Project Feasibility Financial KPIs</h3>
                <div className="grid grid-5 gap-md" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Estimated Revenue</span>
                    <h4 className="text-xl font-bold text-emerald-800 mt-1">
                      {selectedPlan.estimatedRevenue && selectedPlan.estimatedRevenue > 0
                        ? `₹${(selectedPlan.estimatedRevenue / 10000000).toFixed(2)} Cr`
                        : 'Not Provided'}
                    </h4>
                    <p className="text-[9px] text-emerald-600/70 mt-1">
                      {selectedPlan.expectedSalesRate && selectedPlan.expectedSalesRate > 0
                        ? `Formula: ${selectedPlan.saleableArea?.toLocaleString() || 0} sqft × ₹${selectedPlan.expectedSalesRate}/sqft`
                        : 'Needs Expected Sales Rate input'}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Estimated Construction Cost</span>
                    <h4 className="text-xl font-bold text-slate-800 mt-1">
                      ₹{(selectedPlan.estimatedCost ? selectedPlan.estimatedCost / 10000000 : 0).toFixed(2)} Cr
                    </h4>
                    <p className="text-[9px] text-slate-400 mt-1">
                      Formula: {selectedPlan.builtUpArea?.toLocaleString() || 0} sqft × ₹{selectedPlan.costPerSqft || 2500}/sqft
                    </p>
                  </div>
                  <div className="bg-indigo-50/30 border border-indigo-100 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Expected Profit</span>
                    <h4 className="text-xl font-bold text-indigo-800 mt-1">
                      {selectedPlan.expectedProfit && selectedPlan.expectedProfit > 0
                        ? `₹${(selectedPlan.expectedProfit / 10000000).toFixed(2)} Cr`
                        : 'Not Provided'}
                    </h4>
                    <p className="text-[9px] text-indigo-500/70 mt-1">
                      {selectedPlan.expectedSalesRate && selectedPlan.expectedSalesRate > 0
                        ? `Formula: Revenue - (Cost + Land Cost)`
                        : 'Needs Expected Sales Rate input'}
                    </p>
                  </div>
                  <div className="bg-blue-50/30 border border-blue-100 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Expected ROI</span>
                    <h4 className="text-xl font-bold text-blue-800 mt-1">
                      {selectedPlan.roi && selectedPlan.roi > 0
                        ? `${selectedPlan.roi.toFixed(1)}%`
                        : 'Not Provided'}
                    </h4>
                    <p className="text-[9px] text-blue-500/70 mt-1">
                      {selectedPlan.expectedSalesRate && selectedPlan.expectedSalesRate > 0
                        ? 'Formula: (Profit / Total Cost) × 100'
                        : 'Needs Expected Sales Rate'}
                    </p>
                  </div>
                  <div className="bg-amber-50/30 border border-amber-100 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Land Cost</span>
                    <h4 className="text-xl font-bold text-amber-800 mt-1">
                      {selectedPlan.landCost && selectedPlan.landCost > 0
                        ? `₹${(selectedPlan.landCost / 10000000).toFixed(2)} Cr`
                        : 'Not Provided'}
                    </h4>
                    <p className="text-[9px] text-amber-500/70 mt-1">
                      {selectedPlan.landCost && selectedPlan.landCost > 0
                        ? 'As provided by builder'
                        : 'Needs Land Purchase Cost input'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 🎯 Score Cards & Floor comparison details */}
              <div className="grid grid-2 gap-lg mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                {/* Left: AI Floor Recommendation reasoning */}
                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Layers size={14} className="text-primary" />
                    AI Floors Decision Reason
                  </h4>
                  <div className="grid grid-3 gap-sm mb-3">
                    <div className="bg-white p-2 rounded border border-slate-100 text-center">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Requested</span>
                      <strong className="block text-slate-700">{selectedPlan.requestedFloors || 1} Floors</strong>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-100 text-center">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Recommended</span>
                      <strong className="block text-indigo-600 font-bold">{selectedPlan.floors || 1} Floors</strong>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-100 text-center">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Confidence</span>
                      <strong className="block text-emerald-600 font-bold">{selectedPlan.confidenceScore || 90}%</strong>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded border border-slate-100">
                    {selectedPlan.decisionReason}
                  </p>
                </div>

                {/* Right: Buildability Score matrix */}
                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-primary" />
                    Buildability Score: {selectedPlan.overallScore || 90}/100
                  </h4>
                  
                  <div className="flex flex-col gap-2 mt-2">
                    {[
                      { label: 'Planning & Regulations', score: selectedPlan.planningScore || 90 },
                      { label: 'Profitability', score: selectedPlan.profitScore || 90 },
                      { label: 'Parking Efficiency', score: selectedPlan.parkingScore || 90 },
                      { label: 'Natural Ventilation', score: selectedPlan.ventilationScore || 90 },
                      { label: 'Market Fit', score: selectedPlan.marketFitScore || 90 }
                    ].map((s, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                          <span>{s.label}</span>
                          <span className="font-bold text-slate-700">{s.score}/100</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${s.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scrollable Content Body with Side-by-Side split */}
              <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '12px', marginRight: '-6px' }}>
                <div className="grid grid-2 gap-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                  
                  {/* Left Column: Recommendations & Risks */}
                  <div className="flex flex-col gap-md">
                    {/* Suggestions Checklists */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        AI Compliance Suggestions & Recommendations
                      </h3>
                      <div className="ai-report-section-content bg-emerald-50/10 p-3 rounded-lg border border-emerald-100/30">
                        {currentRecommendations.length === 0 ? (
                          <p className="text-xs text-slate-500">No suggestions compiled.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {currentRecommendations.map((r, i) => (
                              <div key={i} className="flex items-start gap-2" style={{ display: 'flex', gap: '8px' }}>
                                <span className="text-emerald-500 font-bold text-xs" style={{ minWidth: '16px' }}>✓</span>
                                <span className="text-slate-600 text-xs leading-relaxed">{r}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Risks Analysis */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <AlertTriangle size={16} className="text-amber-500" />
                        Risk Matrix Assessment
                      </h3>
                      <div className="ai-report-section-content bg-amber-50/10 p-3 rounded-lg border border-amber-100/30">
                        <div className="flex items-center gap-2 mb-2" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className="text-[10px] font-bold uppercase tracking-wide">Risk Assessment Rating:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedPlan.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                            selectedPlan.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {selectedPlan.riskLevel || 'LOW'}
                          </span>
                        </div>
                        {currentRisks.length === 0 ? (
                          <p className="text-xs text-slate-500">No significant risks detected.</p>
                        ) : (
                          <div className="flex flex-col gap-2 mt-2">
                            {currentRisks.map((r, i) => (
                              <div key={i} className="flex items-start gap-2" style={{ display: 'flex', gap: '8px' }}>
                                <span className="text-rose-500 font-bold text-xs" style={{ minWidth: '16px' }}>⚠</span>
                                <span className="text-slate-600 text-xs leading-relaxed">{r}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unit Mix config */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <Compass size={16} className="text-indigo-500" />
                        Symmetrical Unit Mix Configurations
                      </h3>
                      <div className="ai-report-section-content">
                        {selectedPlan.unitMix ? formatMarkdown(selectedPlan.unitMix) : 'No configurations generated.'}
                      </div>
                    </div>

                    {/* Parking Layout */}
                    <div className="ai-report-section">
                      <h3 className="ai-report-section-title">
                        <Ruler size={16} className="text-slate-500" />
                        Parking Space guidelines & Calculations
                      </h3>
                      <div className="ai-report-section-content">
                        {selectedPlan.parkingLayout ? formatMarkdown(selectedPlan.parkingLayout) : 'No parking plans computed.'}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual 2D Layout Plan Map with Zoom and Rotation Controls */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex justify-between items-center w-full" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
                        🤖 Interactive 2D Plot Blueprint Map (Auto-Generated)
                      </h4>
                      {/* Controls Toolbar */}
                      <div className="flex gap-1" style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => setZoom(prev => Math.min(prev + 0.2, 2))} 
                          className="btn btn-ghost p-1" 
                          title="Zoom In"
                          style={{ padding: '4px' }}
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button 
                          onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.6))} 
                          className="btn btn-ghost p-1" 
                          title="Zoom Out"
                          style={{ padding: '4px' }}
                        >
                          <ZoomOut size={14} />
                        </button>
                        <button 
                          onClick={() => setRotation(prev => (prev + 90) % 360)} 
                          className="btn btn-ghost p-1" 
                          title="Rotate"
                          style={{ padding: '4px' }}
                        >
                          <RotateCw size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {selectedPlan.svgFloorPlan ? (
                      <div 
                        className="w-full shadow-inner border border-slate-100 rounded-lg p-2 bg-slate-50 flex items-center justify-center overflow-hidden"
                        style={{ maxWidth: '380px', aspectRatio: '1/1' }}
                      >
                        <div 
                          style={{ 
                            transform: `scale(${zoom}) rotate(${rotation}deg)`, 
                            transition: 'transform 0.2s ease-in-out',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          dangerouslySetInnerHTML={{ __html: selectedPlan.svgFloorPlan }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-full flex items-center justify-center bg-slate-100 rounded-lg text-slate-400"
                        style={{ maxWidth: '380px', aspectRatio: '1/1' }}
                      >
                        No layout geometry available.
                      </div>
                    )}
                    <p className="text-center text-[10px] text-slate-400 max-w-[280px]">
                      Use the toolbar above to rotate and scale the drawing. Dashed outlines denote Pune setback offsets.
                    </p>

                    {/* Detailed Specifications Column */}
                    <div className="w-full flex flex-col gap-2 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">📐 Building Design Details</h4>
                      <div className="grid grid-2 gap-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Plot Facing</span>
                          <strong className="text-xs text-slate-700">{selectedPlan.facing || 'East'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Parking Type</span>
                          <strong className="text-xs text-slate-700">{selectedPlan.parkingType || 'Basement'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Core Flat Mix</span>
                          <strong className="text-xs text-slate-700">{selectedPlan.flatMix || '2BHK + 3BHK'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Lifts & Staircases</span>
                          <strong className="text-xs text-slate-700">{selectedPlan.liftCount || 2} Lifts / {selectedPlan.staircaseCount || 2} Staircases</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* 🔀 Alternative Version Comparison Matrix */}
              {siblingVersions.length > 1 && (
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🔀 Design Schemes Comparison Matrix (Alternative Options)</h3>
                  <div className="ai-table-container">
                    <table className="ai-table">
                      <thead>
                        <tr>
                          <th>Version Option</th>
                          <th>Floors</th>
                          <th>Total Units</th>
                          <th>Expected Profit</th>
                          <th>ROI</th>
                          <th>Built-Up Area</th>
                          <th>FSI Utilized</th>
                          <th>Overall Rating</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {siblingVersions.map((sv) => (
                          <tr key={sv.id} className={sv.id === selectedPlan.id ? 'bg-indigo-50/20 font-semibold' : ''}>
                            <td>{sv.version} ({sv.status})</td>
                            <td>{sv.floors || 1} Floors</td>
                            <td>{sv.totalUnits || 0} Flats</td>
                            <td>
                              <span className="text-emerald-700">
                                {sv.expectedProfit ? `₹${(sv.expectedProfit / 10000000).toFixed(2)} Cr` : '₹0.00 Cr'}
                              </span>
                            </td>
                            <td>{sv.roi ? `${sv.roi.toFixed(1)}%` : '0%'}</td>
                            <td>{(sv.builtUpArea || 0).toLocaleString()} sqft</td>
                            <td>{sv.fsiUsed || 0} / {sv.fsi}</td>
                            <td>
                              <strong className="text-indigo-600">{sv.overallScore || 90}/100</strong>
                            </td>
                            <td>
                              <button 
                                onClick={() => setSelectedPlan(sv)}
                                className="btn btn-ghost btn-sm text-primary"
                                style={{ fontSize: '10px', padding: '2px 8px' }}
                              >
                                View Option
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
