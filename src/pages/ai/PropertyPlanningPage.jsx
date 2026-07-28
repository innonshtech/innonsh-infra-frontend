import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { 
  LayoutDashboard, Plus, Sparkles, Info, ChevronRight, MessageSquare, Loader2, Download, 
  Building, DollarSign, Ruler, Compass, Layers, CheckSquare, AlertTriangle, ShieldCheck, 
  Send, Bot, User, Coins, Sliders, AlertCircle, Scale, Percent
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

  // Active Tab state
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'history'

  // Embedded Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);
  const messagesEndRef = useRef(null);

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
  const [customInstructions, setCustomInstructions] = useState('');

  const [isRevision, setIsRevision] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  // Clear chat session details and scroll to top when the selected plan changes
  useEffect(() => {
    setChatMessages([]);
    setChatSessionId(null);
    setChatInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedPlan]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getPropertyPlans();
      const list = data.data || [];
      setPlans(list);
      if (list.length > 0) {
        setSelectedPlan(list[0]);
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
        flatsPerFloor: flatsPerFloor ? Number(flatsPerFloor) : undefined,
        customInstructions: customInstructions || undefined
      };

      toast.info(`Generating option ${calculatedVersion} with strict zoning formulas...`);
      const { data } = await aiService.generatePropertyPlan(payload);
      toast.success(`Plan Option ${calculatedVersion} compiled successfully!`);

      // Reset form
      setProjectName('');
      setPlotSize('');
      setRoadWidth('');
      setFsi('');
      setBudget('');
      setLandCost('');
      setExpectedSalesRate('');
      setFlatsPerFloor('4');
      setCustomInstructions('');
      setIsRevision(false);

      // Add to list and switch active tab to history to view results
      const updatedPlans = [data.data, ...plans];
      setPlans(updatedPlans);
      setSelectedPlan(data.data);
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'AI Property Planning failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChatMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim() || chatLoading) return;

    if (!textToSend) setChatInput('');

    // Append user message locally
    const userMsg = {
      role: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await aiService.chat({
        sessionId: chatSessionId,
        message: { role: 'user', text }
      });
      const responseData = res.data?.data || res.data;
      if (responseData) {
        setChatMessages(responseData.messages || []);
        if (!chatSessionId) {
          setChatSessionId(responseData.sessionId);
        }
      }
    } catch (err) {
      toast.error('Failed to get response from AI.');
      // Remove last user message
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!selectedPlan) return;
    
    // Check if we already initialized
    if (chatMessages.length > 0) return;

    const showRevenueAndProfit = selectedPlan.expectedSalesRate && selectedPlan.expectedSalesRate > 0;
    const showLandCost = selectedPlan.landCost && selectedPlan.landCost > 0;

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
- **FSI Utilized**: ${selectedPlan.fsiUsed || 'N/A'}
- **Ground Coverage**: ${selectedPlan.coverage || 'N/A'}%
${showRevenueAndProfit ? `- **Expected Profit**: INR ${selectedPlan.expectedProfit?.toLocaleString() || 'N/A'}\n- **Expected ROI**: ${selectedPlan.roi?.toFixed(1) || 0}%` : ''}
${showLandCost ? `- **Land Cost**: INR ${selectedPlan.landCost?.toLocaleString() || 'N/A'}` : ''}
- **Buildability Overall Score**: ${selectedPlan.overallScore || 90}/100

Optimal Unit Mix:
${selectedPlan.unitMix || 'N/A'}

Parking Layout:
${selectedPlan.parkingLayout || 'N/A'}

Please advise me on the architectural design revisions, spatial configurations, or construction scheduling for this layout.`;

    handleSendChatMessage(prompt);
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

  // Filter financial KPIs to display conditionally
  const showRevenueAndProfit = selectedPlan?.expectedSalesRate && selectedPlan.expectedSalesRate > 0;
  const showLandCost = selectedPlan?.landCost && selectedPlan.landCost > 0;

  const kpis = [];
  if (selectedPlan) {
    if (showRevenueAndProfit) {
      kpis.push({
        label: 'Estimated Revenue',
        value: `₹${(selectedPlan.estimatedRevenue / 10000000).toFixed(2)} Cr`,
        detail: `Formula: ${selectedPlan.saleableArea?.toLocaleString() || 0} sqft × ₹${selectedPlan.expectedSalesRate}/sqft`,
        borderClass: 'border-emerald-100',
        bgClass: 'bg-emerald-50/20 text-emerald-800'
      });
    }
    
    kpis.push({
      label: 'Estimated Construction Cost',
      value: `₹${(selectedPlan.estimatedCost / 10000000).toFixed(2)} Cr`,
      detail: `Formula: ${selectedPlan.builtUpArea?.toLocaleString() || 0} sqft × ₹${selectedPlan.costPerSqft || 2500}/sqft`,
      borderClass: 'border-slate-200',
      bgClass: 'bg-slate-50 text-slate-800'
    });

    if (showRevenueAndProfit) {
      kpis.push({
        label: 'Expected Profit',
        value: `₹${(selectedPlan.expectedProfit / 10000000).toFixed(2)} Cr`,
        detail: 'Formula: Revenue - (Cost + Land Cost)',
        borderClass: 'border-emerald-100',
        bgClass: 'bg-emerald-50/20 text-emerald-800'
      });
      kpis.push({
        label: 'Expected ROI',
        value: `${(selectedPlan.roi || 0).toFixed(1)}%`,
        detail: 'Formula: (Profit / Total Cost) × 100',
        borderClass: 'border-emerald-100',
        bgClass: 'bg-emerald-50/20 text-emerald-800'
      });
    }

    if (showLandCost) {
      kpis.push({
        label: 'Land Cost',
        value: `₹${(selectedPlan.landCost / 10000000).toFixed(2)} Cr`,
        detail: 'As provided by builder',
        borderClass: 'border-amber-100',
        bgClass: 'bg-amber-50/20 text-amber-800'
      });
    }
  }

  // Format chat messages
  const formatChatMessageText = (text) => {
    if (!text) return '';
    
    // Hide the initial bulky system prompt block to keep the UI clean
    if (text.startsWith('Here is the AI Property Planning details:')) {
      return (
        <div className="text-slate-500 italic text-[11px] flex items-center gap-1.5 p-1 bg-slate-50/50 rounded border border-slate-100">
          <Info size={13} />
          Shared V1 Parameters & Feasibility Specifications.
        </div>
      );
    }

    return text.split('\n').map((line, idx) => {
      let cleanLine = line.trim();
      if (!cleanLine) return <div key={idx} className="h-1" />;
      
      const isBullet = cleanLine.startsWith('-') || cleanLine.startsWith('*');
      if (isBullet) {
        cleanLine = cleanLine.substring(1).trim();
      }

      const parts = cleanLine.split('**');
      const formattedParts = parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="font-bold text-slate-800">{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-3 list-disc text-slate-700 my-0.5 leading-relaxed text-xs">
            {formattedParts}
          </li>
        );
      }

      return (
        <p key={idx} className="text-slate-700 mb-1 leading-relaxed text-xs">
          {formattedParts}
        </p>
      );
    });
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
        .premium-kpi-grid {
          display: grid;
          gap: 16px;
          transition: all 0.3s;
        }
        .premium-kpi-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .premium-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(5, 150, 105, 0.04);
        }
        .premium-workspace-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 28px;
        }
        @media (max-width: 1024px) {
          .premium-workspace-grid {
            grid-template-columns: 1fr;
          }
        }
      `}} />

      {/* Header */}
      <div className="ai-header" style={{ marginBottom: '32px' }}>
        <h1 className="ai-title" style={{ fontSize: '28px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building className="text-emerald-600" size={36} />
          AI Property Planner
        </h1>
        <p className="ai-subtitle" style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', maxWidth: '800px' }}>
          Fill in your plot size, zoning guidelines, setbacks, and flat mixes. Gemini AI runs local building codes calculation to generate cost estimations and symmetrical CAD-ready coordinate structures.
        </p>
      </div>

      {/* Tabs Menu Navigation Bar */}
      <div className="premium-tab-bar">
        <button
          onClick={() => setActiveTab('create')}
          className={`premium-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
        >
          <Plus size={15} />
          Create New Plan
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`premium-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
          <LayoutDashboard size={15} />
          Saved Plans History ({plans.length})
        </button>
      </div>

      <div className="flex flex-col gap-6 w-full">
        
        {/* TAB 1: CREATE NEW PLAN */}
        {activeTab === 'create' && (
          <div className="premium-section-card w-full" style={{ padding: '30px' }}>
            <div className="premium-section-title">
              <Sliders size={15} className="text-emerald-500" />
              Configure Layout & Zoning Inputs
            </div>
            
            <form onSubmit={handleSubmit} className="mt-4">
              
              {/* Section 1: General Info */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  General Project Details
                </span>
                <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">Project Name</label>
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="e.g. Green Valley Residency"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Target Customer Segment</label>
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
              </div>

              {/* Section 2: Municipal Boundaries & Limits */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  Land Boundaries & Permitted Limits
                </span>
                <div className="grid grid-4 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
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
                    <label className="ai-label">Target Budget (INR)</label>
                    <input
                      type="number"
                      className="ai-input"
                      placeholder="e.g. 90000000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Heights & Setbacks */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  Zoning Margins & Height Requests
                </span>
                <div className="grid grid-4 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">Requested Floors (Target)</label>
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
              </div>

              {/* Section 4: Configuration & Flats Mix */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  Symmetrical Configuration Settings
                </span>
                <div className="grid grid-4 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">Flats Per Floor</label>
                    <input
                      type="number"
                      className="ai-input"
                      placeholder="e.g. 4"
                      value={flatsPerFloor}
                      onChange={(e) => setFlatsPerFloor(e.target.value)}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Preferred Unit Mix</label>
                    <select className="ai-select" value={flatMix} onChange={(e) => setFlatMix(e.target.value)}>
                      <option value="2BHK + 3BHK">2 BHK + 3 BHK Mix</option>
                      <option value="1BHK + 2BHK">1 BHK + 2 BHK Compact</option>
                      <option value="3BHK + 4BHK">Spacious 3 BHK & 4 BHK</option>
                      <option value="Studio Units">Studio Apartments</option>
                    </select>
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Lifts count</label>
                    <input
                      type="number"
                      className="ai-input"
                      value={liftCount}
                      onChange={(e) => setLiftCount(e.target.value)}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Staircases count</label>
                    <input
                      type="number"
                      className="ai-input"
                      value={staircaseCount}
                      onChange={(e) => setStaircaseCount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Real Estate Pricing & Valuation */}
              <div className="premium-section-card">
                <span className="premium-section-title" style={{ fontSize: '10px', color: '#64748b' }}>
                  Project Pricing & Valuations
                </span>
                <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div className="ai-form-group">
                    <label className="ai-label">
                      Land Purchase Cost (INR) <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      className="ai-input"
                      placeholder="Leave empty to hide"
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
                      placeholder="e.g. 6000 (Required for profit/ROI cards)"
                      value={expectedSalesRate}
                      onChange={(e) => setExpectedSalesRate(e.target.value)}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label className="ai-label">Parking Layout Type</label>
                    <select className="ai-select" value={parkingType} onChange={(e) => setParkingType(e.target.value)}>
                      <option value="Basement">Basement Level Parking</option>
                      <option value="Stilt">Stilt / Ground Covered</option>
                      <option value="Open Ground">Open Surface Parking</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Checkboxes Row */}
              <div className="flex gap-lg flex-wrap" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px', marginBottom: '24px' }}>
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

              {/* Custom AI Instructions optional prompt box */}
              <div className="ai-form-group mb-md" style={{ marginTop: '24px' }}>
                <label className="ai-label flex items-center gap-1.5" style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#059669', fontWeight: '700' }}>
                  <Sparkles size={14} />
                  Custom AI Instructions & Layout Guidelines <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  className="ai-input w-full"
                  style={{ minHeight: '90px', fontFamily: 'inherit', resize: 'vertical', fontSize: '12px', border: '1px dashed #a7f3d0', background: '#fafbff' }}
                  placeholder="e.g. Maximize room sizes, keep structural parking strictly under 25%, prioritize green buffer strips on rear setbacks..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                />
              </div>

              {selectedPlan && (
                <div className="flex items-center gap-2 mb-md" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '20px' }}>
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
                className="btn btn-primary btn-lg w-full flex justify-center items-center gap-2 mt-4"
                style={{ padding: '14px', borderRadius: '12px', fontSize: '14px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
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
        )}

        {/* TAB 2: SAVED PLANS HISTORY */}
        {activeTab === 'history' && (
          <>
            {/* Sibling Plans Table list */}
            <div className="premium-section-card w-full">
              <div className="premium-section-title">
                <LayoutDashboard size={15} className="text-emerald-500" />
                Calculated Real Estate Plans & Design Options
              </div>
              <div className="ai-card-body p-0" style={{ marginTop: '1rem' }}>
                {loading ? (
                  <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
                ) : plans.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No planning schemes compiled. Go to "Create New Plan" to get started.</div>
                ) : (
                  <div className="ai-table-container">
                    <table className="ai-table" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px' }}>Project Proposal</th>
                          <th style={{ padding: '12px 16px' }}>Version</th>
                          <th style={{ padding: '12px 16px' }}>Plot Area</th>
                          <th style={{ padding: '12px 16px' }}>FSI Utilized</th>
                          <th style={{ padding: '12px 16px' }}>Total Floors</th>
                          <th style={{ padding: '12px 16px' }}>Total Units</th>
                          <th style={{ padding: '12px 16px', borderRadius: '0 8px 8px 0' }}>Status</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {plans.map((p) => (
                          <tr
                            key={p.id}
                            className={`transition-all hover:bg-slate-50/75 ${selectedPlan?.id === p.id ? 'bg-emerald-50/10 border-l-4 border-emerald-500 font-medium' : ''}`}
                            onClick={() => setSelectedPlan(p)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{ padding: '16px' }}>{p.projectName}</td>
                            <td style={{ padding: '16px' }}>
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                                {p.version}
                              </span>
                            </td>
                            <td style={{ padding: '16px' }}>{p.plotSize.toLocaleString()} sqft</td>
                            <td style={{ padding: '16px' }}>{p.fsiUsed || 'N/A'} / {p.fsi}</td>
                            <td style={{ padding: '16px' }}>{p.floors || 1}</td>
                            <td style={{ padding: '16px' }}><strong>{p.totalUnits || 0} units</strong></td>
                            <td style={{ padding: '16px' }}>
                              <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                {p.status}
                              </span>
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

            {/* Selected Plan Details Workspace (KPIs, Reports, Live Chat) */}
            {selectedPlan ? (
              <>
                <div className="premium-section-card w-full" style={{ padding: '30px' }}>
                  
                  {/* Header inside Workspace Panel */}
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div className="ai-score-container mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
                      <div className="ai-score-circle" style={{ background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)', width: '40px', height: '40px', fontSize: '13px' }}>
                        {selectedPlan.version}
                      </div>
                      <div className="ai-score-details">
                        <span className="ai-score-label" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                          {selectedPlan.projectName} ({selectedPlan.version})
                        </span>
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
                        style={{ fontSize: '11px', padding: '8px 14px', borderRadius: '8px', background: '#059669' }}
                        title="Export vector DXF drawing layer to AutoCAD"
                      >
                        <Download size={14} />
                        Export DXF
                      </button>
                    </div>
                  </div>

                  {/* 💸 Financial KPIs Section (Conditionally rendered cards) */}
                  {kpis.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">💰 Project Feasibility Financial KPIs</h3>
                      <div className="premium-kpi-grid" style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(180px, 1fr))` }}>
                        {kpis.map((kpi, idx) => (
                          <div key={idx} className={`premium-kpi-card ${kpi.borderClass} ${kpi.bgClass}`}>
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 block">{kpi.label}</span>
                            <h4 className="text-2xl font-bold mt-2" style={{ letterSpacing: '-0.02em' }}>{kpi.value}</h4>
                            <p className="text-[9px] opacity-75 mt-1.5 leading-relaxed">{kpi.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 🎯 Score Cards & Floor comparison details */}
                  <div className="grid grid-2 gap-lg mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    {/* Left: AI Floor Recommendation reasoning */}
                    <div className="bg-slate-50/30 border border-slate-200/60 p-5 rounded-2xl">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Layers size={15} className="text-emerald-600" />
                        AI Floors Decision Reason
                      </h4>
                      <div className="grid grid-3 gap-sm mb-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block">Requested</span>
                          <strong className="block text-slate-700 text-sm mt-0.5">{selectedPlan.requestedFloors || 1} Floors</strong>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block">Recommended</span>
                          <strong className="block text-emerald-600 font-bold text-sm mt-0.5">{selectedPlan.floors || 1} Floors</strong>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block">Confidence</span>
                          <strong className="block text-emerald-600 font-bold text-sm mt-0.5">{selectedPlan.confidenceScore || 90}%</strong>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-100/80 shadow-sm">
                        {selectedPlan.decisionReason}
                      </p>
                    </div>

                    {/* Right: Buildability Score matrix */}
                    <div className="bg-slate-50/30 border border-slate-200/60 p-5 rounded-2xl">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <CheckSquare size={15} className="text-emerald-600" />
                        Buildability Score: {selectedPlan.overallScore || 90}/100
                      </h4>
                      
                      <div className="flex flex-col gap-3">
                        {[
                          { label: 'Planning & Regulations', score: selectedPlan.planningScore || 90 },
                          { label: 'Profitability', score: selectedPlan.profitScore || 90 },
                          { label: 'Parking Efficiency', score: selectedPlan.parkingScore || 90 },
                          { label: 'Natural Ventilation', score: selectedPlan.ventilationScore || 90 },
                          { label: 'Market Fit', score: selectedPlan.marketFitScore || 90 }
                        ].map((s, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                              <span>{s.label}</span>
                              <span className="font-bold text-slate-800">{s.score}/100</span>
                            </div>
                            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${s.score}%`, borderRadius: '9999px' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Spatial Reports Lists with Embedded Live Chat on Right */}
                  <div className="premium-workspace-grid">
                    
                    {/* Left Column: Spatial Metrics Reports */}
                    <div className="flex flex-col gap-md" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '12px' }}>
                      {/* Suggestions Checklists */}
                      <div className="ai-report-section" style={{ border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                        <h3 className="ai-report-section-title" style={{ padding: '12px 16px', background: '#f8fafc', fontSize: '11px' }}>
                          <ShieldCheck size={16} className="text-emerald-500" />
                          AI Compliance Suggestions & Recommendations
                        </h3>
                        <div className="ai-report-section-content bg-emerald-50/5 p-4 rounded-b-xl">
                          {currentRecommendations.length === 0 ? (
                            <p className="text-xs text-slate-500">No suggestions compiled.</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {currentRecommendations.map((r, i) => (
                                <div key={i} className="flex items-start gap-2.5" style={{ display: 'flex', gap: '10px' }}>
                                  <span className="text-emerald-500 font-bold text-xs" style={{ minWidth: '16px' }}>✓</span>
                                  <span className="text-slate-600 text-xs leading-relaxed">{r}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Risks Analysis */}
                      <div className="ai-report-section" style={{ border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                        <h3 className="ai-report-section-title" style={{ padding: '12px 16px', background: '#f8fafc', fontSize: '11px' }}>
                          <AlertTriangle size={16} className="text-rose-500" />
                          Risk Matrix Assessment
                        </h3>
                        <div className="ai-report-section-content bg-rose-50/5 p-4 rounded-b-xl">
                          <div className="flex items-center gap-2 mb-3" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Risk Assessment Rating:</span>
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
                            <div className="flex flex-col gap-2.5 mt-2">
                              {currentRisks.map((r, i) => (
                                <div key={i} className="flex items-start gap-2.5" style={{ display: 'flex', gap: '10px' }}>
                                  <span className="text-rose-500 font-bold text-xs" style={{ minWidth: '16px' }}>⚠</span>
                                  <span className="text-slate-600 text-xs leading-relaxed">{r}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cost Estimates */}
                      <div className="ai-report-section" style={{ border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                        <h3 className="ai-report-section-title" style={{ padding: '12px 16px', background: '#f8fafc', fontSize: '11px' }}>
                          <DollarSign size={16} className="text-slate-600" />
                          Itemized Cost Estimates
                        </h3>
                        <div className="ai-report-section-content p-4">
                          {selectedPlan.costEstimates ? formatMarkdown(selectedPlan.costEstimates) : 'No cost details computed.'}
                        </div>
                      </div>

                      {/* Unit Mix config */}
                      <div className="ai-report-section" style={{ border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                        <h3 className="ai-report-section-title" style={{ padding: '12px 16px', background: '#f8fafc', fontSize: '11px' }}>
                          <Compass size={16} className="text-emerald-500" />
                          Symmetrical Unit Mix Configurations
                        </h3>
                        <div className="ai-report-section-content p-4">
                          {selectedPlan.unitMix ? formatMarkdown(selectedPlan.unitMix) : 'No configurations generated.'}
                        </div>
                      </div>

                      {/* Parking Layout */}
                      <div className="ai-report-section" style={{ border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                        <h3 className="ai-report-section-title" style={{ padding: '12px 16px', background: '#f8fafc', fontSize: '11px' }}>
                          <Ruler size={16} className="text-slate-500" />
                          Parking Space Guidelines & Calculations
                        </h3>
                        <div className="ai-report-section-content p-4">
                          {selectedPlan.parkingLayout ? formatMarkdown(selectedPlan.parkingLayout) : 'No parking plans computed.'}
                        </div>
                      </div>

                      {/* Detailed Specifications Box */}
                      <div className="w-full flex flex-col gap-2 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                        <h4 className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                          <Scale size={14} className="text-emerald-500" />
                          📐 Building Design Details
                        </h4>
                        <div className="grid grid-2 gap-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
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
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Flats Per Floor</span>
                            <strong className="text-xs text-slate-700">{selectedPlan.flatsPerFloor || 2} Flats per floor</strong>
                          </div>
                          {selectedPlan.customInstructions && (
                            <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '6px' }}>
                              <span className="text-[10px] text-slate-400 block font-semibold">Builder Guidelines Input</span>
                              <p className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-100 mt-1">
                                "{selectedPlan.customInstructions}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Embedded Chat Refinement Workspace (Matching AI Board Layout) */}
                    <div className="flex flex-col border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                      
                      {/* Chat Header */}
                      <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200 flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MessageSquare className="text-emerald-600" size={16} />
                          <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">
                            AI Plan Refinement Chat
                          </span>
                        </div>
                        
                        {chatMessages.length === 0 ? (
                          <button
                            onClick={handleStartChat}
                            className="btn btn-primary btn-xs flex items-center gap-1 shadow-sm"
                            style={{ fontSize: '10px', padding: '5px 10px', background: '#059669', borderRadius: '6px' }}
                          >
                            <Sparkles size={11} /> Initialize Chat
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Synchronized</span>
                          </div>
                        )}
                      </div>

                      {/* Chat Messages Log */}
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-slate-50/30" style={{ flexGrow: 1, overflowY: 'auto' }}>
                        {chatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 gap-2" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Bot size={38} className="text-slate-300" />
                            <h5 className="font-semibold text-xs text-slate-600">No Active Discussion</h5>
                            <p className="text-[11px] text-slate-400 max-w-[240px] mt-1 leading-relaxed">
                              Click "Initialize Chat" to share your plan parameters with Gemini and start interactive layout refinements.
                            </p>
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div 
                              key={i} 
                              className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
                              style={{ display: 'flex', gap: '10px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                            >
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${
                                msg.role === 'user' ? 'bg-emerald-600' : 'bg-slate-700'
                              }`} style={{ width: '28px', height: '28px', flexShrink: 0 }}>
                                {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                              </div>
                              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-950 rounded-tr-none' 
                                  : 'bg-white border-slate-100 text-slate-800 rounded-tl-none'
                              }`} style={{ border: '1px solid rgba(226, 232, 240, 0.7)' }}>
                                {formatChatMessageText(msg.text)}
                              </div>
                            </div>
                          ))
                        )}

                        {chatLoading && (
                          <div className="flex gap-2.5 self-start" style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0" style={{ width: '28px', height: '28px', flexShrink: 0 }}>
                              <Bot size={13} />
                            </div>
                            <div className="p-3 bg-white border border-slate-100 rounded-xl rounded-tl-none shadow-sm flex items-center gap-1.5" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <Loader2 size={13} className="animate-spin text-emerald-600" />
                              <span className="text-[11px] text-slate-400 italic">Gemini is processing layout math...</span>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Chat Input Bar */}
                      {chatMessages.length > 0 && (
                        <div className="p-3 border-t border-slate-200 bg-white">
                          <form onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }} className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Ask Gemini revisions (e.g. Can we fit one more floor?)..."
                              className="ai-input flex-grow"
                              style={{ flexGrow: 1, borderRadius: '8px', border: '1px solid #cbd5e1' }}
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              disabled={chatLoading}
                            />
                            <button
                              type="submit"
                              className="btn btn-primary p-2 flex items-center justify-center cursor-pointer"
                              style={{ padding: '8px 14px', background: '#059669', borderRadius: '8px' }}
                              disabled={chatLoading || !chatInput.trim()}
                            >
                              <Send size={14} />
                            </button>
                          </form>
                        </div>
                      )}

                    </div>

                  </div>
                </div>

                {/* 🔀 Alternative Version Comparison Matrix */}
                {siblingVersions.length > 1 && (
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">🔀 Design Schemes Comparison Matrix (Alternative Options)</h3>
                    <div className="ai-table-container">
                      <table className="ai-table">
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px' }}>Version Option</th>
                            <th style={{ padding: '12px 16px' }}>Floors</th>
                            <th style={{ padding: '12px 16px' }}>Total Units</th>
                            <th style={{ padding: '12px 16px' }}>Expected Profit</th>
                            <th style={{ padding: '12px 16px' }}>ROI</th>
                            <th style={{ padding: '12px 16px' }}>Built-Up Area</th>
                            <th style={{ padding: '12px 16px' }}>FSI Utilized</th>
                            <th style={{ padding: '12px 16px' }}>Overall Rating</th>
                            <th style={{ padding: '12px 16px', borderRadius: '0 8px 8px 0', width: '100px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {siblingVersions.map((sv) => (
                            <tr key={sv.id} className={sv.id === selectedPlan.id ? 'bg-emerald-50/10 font-semibold' : ''}>
                              <td style={{ padding: '16px' }}>{sv.version} ({sv.status})</td>
                              <td style={{ padding: '16px' }}>{sv.floors || 1} Floors</td>
                              <td style={{ padding: '16px' }}>{sv.totalUnits || 0} Flats</td>
                              <td style={{ padding: '16px' }}>
                                <span className="text-emerald-700 font-semibold">
                                  {sv.expectedProfit && sv.expectedProfit > 0 
                                    ? `₹${(sv.expectedProfit / 10000000).toFixed(2)} Cr` 
                                    : 'Not Calculated'}
                                </span>
                              </td>
                              <td style={{ padding: '16px' }}>
                                {sv.roi && sv.roi > 0 
                                  ? `${sv.roi.toFixed(1)}%` 
                                  : 'Not Calculated'}
                              </td>
                              <td style={{ padding: '16px' }}>{(sv.builtUpArea || 0).toLocaleString()} sqft</td>
                              <td style={{ padding: '16px' }}>{sv.fsiUsed || 0} / {sv.fsi}</td>
                              <td style={{ padding: '16px' }}>
                                <strong className="text-emerald-600">{sv.overallScore || 90}/100</strong>
                              </td>
                              <td style={{ padding: '16px' }}>
                                <button 
                                  onClick={() => setSelectedPlan(sv)}
                                  className="btn btn-ghost btn-sm text-emerald-600"
                                  style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#ffffff' }}
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
              </>
            ) : (
              <div className="ai-card-body flex flex-col items-center justify-center text-center p-8 min-h-[150px]">
                <Info size={48} className="text-slate-300 mb-2" />
                <h3 className="font-semibold text-slate-700">No Property Scheme Selected</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-[280px]">Select a project from the table above or specify parameters to compile a layout.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
