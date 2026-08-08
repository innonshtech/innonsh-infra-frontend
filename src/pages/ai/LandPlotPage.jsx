import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [chatStarting, setChatStarting] = useState(false);

  // Active Tab state
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'history'

  // Main Module selection state
  const [activeMainModule, setActiveMainModule] = useState('audit'); // 'inventory' or 'audit'

  // Audit module states
  const [auditDocs, setAuditDocs] = useState([]);
  const [auditing, setAuditing] = useState(false);
  const [auditStage, setAuditStage] = useState(0);
  const [auditResult, setAuditResult] = useState(null);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [auditActiveTab, setAuditActiveTab] = useState('upload'); // 'upload' or 'results'
  const [customDocFields, setCustomDocFields] = useState([]); // [{id, label, file, url, uploading}]
  const [catalogDocs, setCatalogDocs] = useState([]); // Unified document vault list for linking/filter
  const [viewingPlotDetail, setViewingPlotDetail] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const handleAuditDocUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDocType(type);
    try {
      toast.info(`Uploading ${file.name} to cloud storage...`);
      const url = await uploadFile(file, 'innonsh-assets');
      setAuditDocs(prev => [...prev, { name: file.name, url, type }]);
      toast.success(`${type} uploaded successfully!`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload document: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadingDocType(null);
    }
  };

  const syncDocsToDatabase = async (docs) => {
    if (!selectedPlot?.id) return;
    const soilFile = docs.find(d => d.type === 'Soil Report');
    const deedFiles = docs.filter(d => ['Sale Deed', 'Index II', 'Title Search Report', 'Property Card'].includes(d.type));
    try {
      const { data } = await aiService.updateLandPlot(selectedPlot.id, {
        soilReport: soilFile ? { url: soilFile.url, name: soilFile.name } : undefined,
        titleDeeds: deedFiles.map(d => ({ url: d.url, name: d.name }))
      });
      setPlots(prev => prev.map(p => p.id === selectedPlot.id ? data.data : p));
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync document changes to database');
    }
  };

  const handleRemoveAuditDoc = async (index) => {
    const updated = auditDocs.filter((_, idx) => idx !== index);
    setAuditDocs(updated);
    if (selectedPlot?.id) {
      await syncDocsToDatabase(updated);
    }
  };

  const handleRunAudit = async () => {
    if (auditDocs.length === 0) {
      toast.warning('Please upload at least one document to start the AI analysis');
      return;
    }

    setAuditing(true);
    setAuditResult(null);
    setAuditStage(1);

    const stages = [
      'Reading files & extracting text content via OCR...',
      'Mapping layout details, dates, and authority seals...',
      'Cross-checking owner names, area metrics, and survey coordinates...',
      'Verifying stamp registration details & signatures presence...',
      'Scanning Encumbrance Certificate for loans and court litigations...',
      'Running Geotechnical soil parameters translation & checks...',
      'Evaluating document expiration dates and alteration anomalies...',
      'Generating complete due diligence summary and investment recommendations...'
    ];

    let currentStage = 1;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        currentStage++;
        setAuditStage(currentStage);
      }
    }, 2800);

    let targetPlotId = selectedPlot?.id;

    try {
      if (selectedPlotId === 'CREATE_NEW' && newPlotName.trim()) {
        toast.info(`Creating and registering new plot "${newPlotName}"...`);
        const { data: newPlotData } = await aiService.analyzeLandPlot({
          name: newPlotName,
          address: `${newPlotName}, Pune, Maharashtra`,
          zoning: 'Residential'
        });
        const createdPlot = newPlotData.data;
        
        setPlots(prev => [createdPlot, ...prev]);
        setSelectedPlot(createdPlot);
        setSelectedPlotId(createdPlot.id);
        setNewPlotName('');
        targetPlotId = createdPlot.id;
      }

      const payload = {
        landId: targetPlotId || undefined,
        documents: auditDocs.map(d => ({ name: d.name, url: d.url, type: d.type }))
      };

      const { data } = await aiService.auditLandDocuments(payload);
      
      if (targetPlotId) {
        const soilFile = auditDocs.find(d => d.type === 'Soil Report');
        const deedFiles = auditDocs.filter(d => ['Sale Deed', 'Index II', 'Title Search Report', 'Property Card'].includes(d.type));
        
        const { data: updatedPlotData } = await aiService.updateLandPlot(targetPlotId, {
          soilReport: soilFile ? { url: soilFile.url, name: soilFile.name } : undefined,
          titleDeeds: deedFiles.map(d => ({ url: d.url, name: d.name }))
        });
        
        const freshPlot = { ...updatedPlotData.data, auditReport: data.data || data };
        setPlots(prev => prev.map(p => p.id === targetPlotId ? freshPlot : p));
        setSelectedPlot(freshPlot);
      }

      clearInterval(interval);
      setAuditResult(data.data || data);
      setAuditActiveTab('results');
      toast.success('AI Document Audit completed successfully!');

      // ── Auto-save all docs to Document Vault ──
      const plotLabel = newPlotName?.trim() || selectedPlot?.name || 'Unknown Plot';
      try {
        const vaultSaves = auditDocs.map(doc =>
          aiService.saveToVault({
            title: doc.name,
            module: 'LAND',
            referenceId: plotLabel,
            documentType: doc.type || 'PDF',
            fileUrl: doc.url,
            uploadedBy: 'user'
          }).catch(() => null) // Silently skip if one fails
        );
        await Promise.all(vaultSaves);
        toast.info(`📂 ${auditDocs.length} documents saved to Document Vault (Plot: ${plotLabel})`);
      } catch (vaultErr) {
        console.warn('Vault save partial failure:', vaultErr);
      }
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      toast.error('Failed to run AI document audit: ' + (err.message || 'Unknown error'));
    } finally {
      setAuditing(false);
      setAuditStage(0);
    }
  };

  const handleTransitionToLandBank = () => {
    if (!auditResult) return;

    // Gap 1: Warn before registering a High-Risk plot
    if (auditResult.overallRisk === 'High') {
      const confirmed = window.confirm(
        '⚠️ HIGH RISK WARNING!\n\nIs plot par AI Document Audit ne HIGH RISK flags detect kiye hain (jaise Court Case, Fraud, ya Encumbrance). Kya aap phir bhi is plot ko Land Bank me register karna chahte hain?\n\n[OK = Register Anyway]  [Cancel = Wapas Jao]'
      );
      if (!confirmed) return;
    }

    const summary = auditResult.extractedSummary || {};
    setName(selectedPlot ? `Plot - ${selectedPlot.name}` : `Plot - Survey ${summary.surveyNumber || 'New'}`);
    setSurveyNumber(summary.surveyNumber || '');
    
    const areaStr = summary.area || '';
    const match = areaStr.match(/^([\d\.]+)\s*(.*)$/);
    if (match) {
      setArea(match[1]);
      const unitRaw = match[2].toLowerCase();
      if (unitRaw.includes('acre')) setAreaUnit('acre');
      else if (unitRaw.includes('guntha')) setAreaUnit('guntha');
      else if (unitRaw.includes('hectare')) setAreaUnit('hectare');
      else setAreaUnit('sqft');
    } else {
      setArea('');
      setAreaUnit('sqft');
    }
    
    setZoning(summary.landType || 'Residential');
    if (summary.owner) {
      setOwners([{ name: summary.owner, share: '100', mobile: '9999999999' }]);
    }
    
    // Auto-map documents from auditDocs state
    const soilFile = auditDocs.find(d => d.type === 'Soil Report');
    if (soilFile) {
      setSoilReport({ name: soilFile.name, url: soilFile.url });
    } else {
      setSoilReport(null);
    }
    const deedFiles = auditDocs.filter(d => ['Sale Deed', 'Index II', 'Title Search Report', 'Property Card'].includes(d.type));
    if (deedFiles.length > 0) {
      setTitleDeeds(deedFiles.map(d => ({ name: d.name, url: d.url })));
    } else {
      setTitleDeeds([]);
    }

    setAdditionalNotes(`AI Verification Summary: Legally safe due diligence checks passed. Extracted soil capacity: ${summary.soil || 'Standard'}.`);
    
    navigate('/ai/land?step=5');
    setActiveTab('create');
    
    toast.success('Extracted document parameters loaded into the Land Bank registration form! Please review and save.');
  };


  const autoCategorizeFile = (filename) => {
    const fn = filename.toLowerCase();
    if (fn.includes('7_12') || fn.includes('7-12') || fn.includes('satbara')) return '7/12 Extract';
    if (fn.includes('sale') || fn.includes('deed') || fn.includes('purchase')) return 'Sale Deed';
    if (fn.includes('property') || fn.includes('card')) return 'Property Card';
    if (fn.includes('soil') || fn.includes('geotech') || fn.includes('bearing')) return 'Soil Report';
    if (fn.includes('encumbrance') || fn.includes('ec')) return 'Encumbrance Certificate';
    if (fn.includes('index')) return 'Index II';
    if (fn.includes('title') || fn.includes('search') || fn.includes('opinion')) return 'Title Search Report';
    if (fn.includes('court') || fn.includes('case') || fn.includes('stay') || fn.includes('litigation')) return 'Court Case Documents';
    if (fn.includes('na') || fn.includes('conversion') || fn.includes('order')) return 'NA Order';
    if (fn.includes('survey') || fn.includes('map') || fn.includes('boundary')) return 'Survey Map';
    return 'Other';
  };

  const handleBatchUpload = async (filesList) => {
    const files = Array.from(filesList);
    if (files.length === 0) return;
    
    toast.info(`Uploading ${files.length} document(s) in batch...`);
    
    let uploadedCount = 0;
    const newDocs = [];
    for (const file of files) {
      try {
        const url = await uploadFile(file, 'innonsh-assets');
        const detectedType = autoCategorizeFile(file.name);
        newDocs.push({
          name: file.name,
          url,
          type: detectedType,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        });
        uploadedCount++;
      } catch (err) {
        console.error(err);
        toast.error(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
    
    if (newDocs.length > 0) {
      const updated = [...auditDocs, ...newDocs];
      setAuditDocs(updated);
      toast.success(`Successfully uploaded and categorized ${uploadedCount} files!`);
      if (selectedPlot?.id) {
        await syncDocsToDatabase(updated);
      }
    }
  };

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
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [newPlotName, setNewPlotName] = useState('');

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

  useEffect(() => {
    if (selectedPlot) {
      setSelectedPlotId(selectedPlot.id);
      setAuditResult(selectedPlot.auditReport || null); // Restores stored legal audit report!
      const existing = [];
      if (selectedPlot.soilReport) {
        existing.push({ name: selectedPlot.soilReport.name, url: selectedPlot.soilReport.url, type: 'Soil Report', size: 'N/A' });
      }
      if (selectedPlot.titleDeeds && selectedPlot.titleDeeds.length > 0) {
        selectedPlot.titleDeeds.forEach(d => {
          const nameLower = d.name.toLowerCase();
          let type = 'Sale Deed';
          if (nameLower.includes('7_12') || nameLower.includes('satbara')) type = '7/12 Extract';
          else if (nameLower.includes('property')) type = 'Property Card';
          else if (nameLower.includes('encumbrance') || nameLower.includes('ec')) type = 'Encumbrance Certificate';
          else if (nameLower.includes('index')) type = 'Index II';
          else if (nameLower.includes('title') || nameLower.includes('search')) type = 'Title Search Report';
          else if (nameLower.includes('court') || nameLower.includes('stay') || nameLower.includes('litigation')) type = 'Court Case Documents';
          else if (nameLower.includes('na') || nameLower.includes('conversion')) type = 'NA Order';
          else if (nameLower.includes('survey') || nameLower.includes('map')) type = 'Survey Map';
          
          existing.push({ name: d.name, url: d.url, type, size: 'N/A' });
        });
      }

      // Merge matching documents from central Vault
      const matchingVaultDocs = catalogDocs.filter(d => 
        d.module === 'LAND' && 
        (d.referenceId === selectedPlot.id || d.referenceId === selectedPlot.name)
      );
      matchingVaultDocs.forEach(d => {
        if (!existing.some(x => x.url === d.fileUrl)) {
          const nameLower = d.title.toLowerCase();
          let type = d.documentType || 'Sale Deed';
          if (nameLower.includes('7_12') || nameLower.includes('satbara')) type = '7/12 Extract';
          else if (nameLower.includes('property')) type = 'Property Card';
          else if (nameLower.includes('encumbrance') || nameLower.includes('ec')) type = 'Encumbrance Certificate';
          else if (nameLower.includes('index')) type = 'Index II';
          else if (nameLower.includes('title') || nameLower.includes('search')) type = 'Title Search Report';
          else if (nameLower.includes('court') || nameLower.includes('stay') || nameLower.includes('litigation')) type = 'Court Case Documents';
          else if (nameLower.includes('na') || nameLower.includes('conversion')) type = 'NA Order';
          else if (nameLower.includes('survey') || nameLower.includes('map')) type = 'Survey Map';
          else if (d.title.includes('Soil')) type = 'Soil Report';
          
          existing.push({ name: d.title, url: d.fileUrl, type, size: 'N/A' });
        }
      });

      setAuditDocs(existing);
    } else {
      setSelectedPlotId('');
      setAuditDocs([]);
    }
  }, [selectedPlot?.id, catalogDocs]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const step = params.get('step');
    if (step === '4') {
      setActiveMainModule('audit');
    } else if (step === '5') {
      setActiveMainModule('inventory');
    }
  }, [location.search]);

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

      // Load document vault catalog
      const { data: docRes } = await aiService.getDocumentCatalog();
      setCatalogDocs(docRes.data || []);
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
      setViewingPlotDetail(true);
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
        .premium-segment-control {
          display: inline-flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 10px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }
        .premium-segment-btn {
          border: none;
          background: transparent;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-segment-btn:hover {
          color: #0f172a;
        }
        .premium-segment-btn.active {
          background: #ffffff;
          color: #059669;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        
        /* Batch Dropzone */
        .batch-dropzone {
          border: 2.5px dashed #059669;
          background: rgba(5, 150, 105, 0.015);
          border-radius: 16px;
          padding: 32px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s ease-in-out;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .batch-dropzone:hover {
          background: rgba(5, 150, 105, 0.04);
          border-color: #047857;
          transform: translateY(-2px);
        }
        
        /* Expandable Folders / Accordion */
        .folder-accordion {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .folder-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #f8fafc;
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }
        .folder-header:hover {
          background: #f1f5f9;
        }
        .folder-title-box {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 13.5px;
          color: #1e293b;
        }
        .folder-content {
          padding: 18px 20px;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        /* Registry Table List */
        .registry-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        .registry-th {
          background: #f8fafc;
          padding: 10px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          border-bottom: 1.5px solid #e2e8f0;
        }
        .registry-td {
          padding: 12px 16px;
          font-size: 12.5px;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
        }

        /* ── MOBILE RESPONSIVE: LandPlotPage ── */
        @media (max-width: 768px) {
          /* Page container - reduce padding on mobile */
          .ai-page-container {
            padding: 12px !important;
          }

          /* Header title - smaller on mobile */
          .ai-title {
            font-size: 20px !important;
            gap: 8px !important;
          }
          .ai-subtitle {
            font-size: 12px !important;
          }

          /* Segmented controls - full width & wrap on mobile */
          .premium-segment-control {
            display: flex !important;
            flex-wrap: wrap !important;
            width: 100% !important;
          }
          .premium-segment-btn {
            flex: 1 !important;
            justify-content: center !important;
            padding: 8px 10px !important;
            font-size: 11px !important;
          }

          /* Tab bar - full width & wrap */
          .premium-tab-bar {
            width: 100% !important;
            flex-wrap: wrap !important;
          }
          .premium-tab-btn {
            flex: 1 !important;
            justify-content: center !important;
            padding: 8px 10px !important;
            font-size: 12px !important;
          }

          /* Section cards - reduce padding on mobile */
          .premium-section-card {
            padding: 16px !important;
            border-radius: 12px !important;
            margin-bottom: 16px !important;
          }

          /* Registry table - force horizontal scroll on small screens */
          .registry-table {
            min-width: 480px;
          }

          /* Batch dropzone - reduce padding */
          .batch-dropzone {
            padding: 20px 14px !important;
          }

          /* Folder content grid - single column on mobile */
          .folder-content {
            grid-template-columns: 1fr !important;
          }

          /* Plot selector + name input row: stack vertically */
          .plot-selector-row {
            flex-direction: column !important;
          }
        }

        @media (max-width: 480px) {
          .ai-title {
            font-size: 17px !important;
          }
          .premium-section-card {
            padding: 12px !important;
          }
          .registry-th, .registry-td {
            padding: 8px 10px !important;
            font-size: 11px !important;
          }
          .premium-tab-btn, .premium-segment-btn {
            font-size: 10.5px !important;
            padding: 7px 8px !important;
            gap: 4px !important;
          }
        }
      `}} />

      {/* Dynamic Header */}
      <div className="ai-header" style={{ marginBottom: '24px' }}>
        {activeMainModule === 'audit' ? (
          <>
            <h1 className="ai-title" style={{ fontSize: '28px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck className="text-emerald-600" size={32} />
              Step 4: AI Document Analysis
            </h1>
            <p className="ai-subtitle" style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', maxWidth: '800px' }}>
              Upload ownership documents, legal deeds, and geotechnical reports to check for safety, stays, or encumbrances.
            </p>
          </>
        ) : (
          <>
            <h1 className="ai-title" style={{ fontSize: '28px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MapIcon className="text-emerald-600" size={32} />
              Step 5: AI Land Intelligence & Land Bank
            </h1>
            <p className="ai-subtitle" style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', maxWidth: '800px' }}>
              Assess commercial viability, check GIS connectivity, view growth projections, and calculate land score parameters.
            </p>
          </>
        )}
      </div>

      {activeMainModule === 'inventory' ? (
        <>
          {/* Elegant Segmented Switch Control */}
          <div className="premium-segment-control">
            <button
              type="button"
              onClick={() => { setActiveTab('create'); setViewingPlotDetail(false); }}
              className={`premium-segment-btn ${activeTab === 'create' ? 'active' : ''}`}
            >
              <Plus size={14} />
              Register New Plot
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('history'); setViewingPlotDetail(false); }}
              className={`premium-segment-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <LayoutDashboard size={14} />
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
                    <label className="ai-label">Plot Name / Identifier</label>
                    <input
                      type="text"
                      className="ai-input"
                      placeholder="e.g. Plot A"
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
            {!viewingPlotDetail ? (
              /* Middle: Your Land Inventory Table */
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
                          <th style={{ padding: '12px 16px' }}>Plot Name</th>
                          <th style={{ padding: '12px 16px' }}>Survey No</th>
                          <th style={{ padding: '12px 16px' }}>Village / Locality</th>
                          <th style={{ padding: '12px 16px' }}>Area (Sqft)</th>
                          <th style={{ padding: '12px 16px' }}>Zoning</th>
                          <th style={{ padding: '12px 16px' }}>Legal Status</th>
                          <th style={{ padding: '12px 16px', borderRadius: '0 8px 8px 0' }}>AI Score</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {plots.map((plot) => (
                          <tr
                            key={plot.id}
                            className={`transition-all hover:bg-slate-50/75 ${selectedPlot?.id === plot.id ? 'bg-emerald-50/10 border-l-4 border-emerald-500 font-medium' : ''}`}
                            onClick={() => {
                              setSelectedPlot(plot);
                              setViewingPlotDetail(true);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{ padding: '16px' }}>{plot.name}</td>
                            <td style={{ padding: '16px' }}>{plot.surveyNumber || 'N/A'}</td>
                            <td style={{ padding: '16px' }}>{plot.village || 'N/A'}</td>
                            <td style={{ padding: '16px' }}>{plot.area.toLocaleString()}</td>
                            <td style={{ padding: '16px' }}>{plot.zoning}</td>
                            <td style={{ padding: '16px' }}>
                              {plot.auditReport ? (() => {
                                const risk = plot.auditReport.overallRisk;
                                const cfg = risk === 'Low'
                                  ? { bg: '#ecfdf5', color: '#059669', icon: '✅', label: 'Legal: Clear' }
                                  : risk === 'Medium'
                                  ? { bg: '#fffbeb', color: '#d97706', icon: '⚠️', label: 'Legal: Review' }
                                  : risk === 'High'
                                  ? { bg: '#fef2f2', color: '#dc2626', icon: '🚨', label: 'Legal: High Risk' }
                                  : { bg: '#f1f5f9', color: '#64748b', icon: '📋', label: 'Audit Done' };
                                return (
                                  <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: '20px', fontSize: '10.5px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                    {cfg.icon} {cfg.label}
                                  </span>
                                );
                              })() : (
                                <span style={{ background: '#f8fafc', color: '#94a3b8', padding: '3px 10px', borderRadius: '20px', fontSize: '10.5px', fontWeight: '600', border: '1px solid #e2e8f0' }}>
                                  ⬜ Not Audited
                                </span>
                              )}
                            </td>
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
            ) : (
              <>
                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => setViewingPlotDetail(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1.5px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    marginBottom: '16px',
                    transition: 'all 0.2s',
                    width: 'fit-content'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.borderColor = '#94a3b8'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; }}
                >
                  ← Back to Land Inventory
                </button>

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
              <div className="premium-section-card w-full" style={{ padding: '30px', background: '#ffffff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
                <div className="ai-card-body">
                  
                  {/* Gap 6: AI Acquisition Verdict — Combined Decision Panel */}
                  {(() => {
                    const legalRisk = selectedPlot.auditReport?.overallRisk;
                    const legalScore = selectedPlot.auditReport?.overallRiskScore;
                    const commercialScore = selectedPlot.aiScore || 0;
                    const hasAudit = !!selectedPlot.auditReport;

                    let verdict, verdictColor, verdictBg, verdictIcon;
                    if (!hasAudit) {
                      verdict = 'Awaiting Legal Audit';
                      verdictColor = '#64748b'; verdictBg = 'linear-gradient(135deg,#f8fafc,#f1f5f9)'; verdictIcon = '📋';
                    } else if (legalRisk === 'High') {
                      verdict = 'Avoid — High Legal Risk';
                      verdictColor = '#dc2626'; verdictBg = 'linear-gradient(135deg,#fef2f2,#fee2e2)'; verdictIcon = '🚨';
                    } else if (legalRisk === 'Medium' || commercialScore < 5) {
                      verdict = 'Needs Review';
                      verdictColor = '#d97706'; verdictBg = 'linear-gradient(135deg,#fffbeb,#fef3c7)'; verdictIcon = '⚠️';
                    } else if (commercialScore >= 8) {
                      verdict = 'Strong Buy';
                      verdictColor = '#059669'; verdictBg = 'linear-gradient(135deg,#ecfdf5,#d1fae5)'; verdictIcon = '✅';
                    } else if (commercialScore >= 6) {
                      verdict = 'Buy';
                      verdictColor = '#10b981'; verdictBg = 'linear-gradient(135deg,#f0fdf4,#dcfce7)'; verdictIcon = '✅';
                    } else {
                      verdict = 'Fair Deal — Review Pricing';
                      verdictColor = '#0284c7'; verdictBg = 'linear-gradient(135deg,#eff6ff,#dbeafe)'; verdictIcon = 'ℹ️';
                    }

                    return (
                      <div style={{ background: verdictBg, borderRadius: '14px', padding: '16px 22px', marginBottom: '22px', border: `1.5px solid ${verdictColor}22`, display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '28px', lineHeight: 1 }}>{verdictIcon}</div>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: verdictColor, marginBottom: '2px' }}>AI Acquisition Verdict</div>
                          <div style={{ fontSize: '17px', fontWeight: '900', color: verdictColor }}>{verdict}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legal Status</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: legalRisk === 'High' ? '#dc2626' : legalRisk === 'Medium' ? '#d97706' : legalRisk === 'Low' ? '#059669' : '#94a3b8', marginTop: '2px' }}>
                              {hasAudit ? `${legalRisk} Risk (${legalScore ? `${Math.round(100 - legalScore)}%` : '—'} Safe)` : 'Not Audited'}
                            </div>
                          </div>
                          <div style={{ width: '1px', background: '#e2e8f0', alignSelf: 'stretch' }} />
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Commercial Score</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: commercialScore >= 8 ? '#059669' : commercialScore >= 5 ? '#d97706' : '#dc2626', marginTop: '2px' }}>
                              {commercialScore > 0 ? `${commercialScore.toFixed(1)} / 10` : 'Not Analyzed'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Redesigned Premium Header details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* circular gauge */}
                      {(() => {
                        const score = selectedPlot.aiScore || 0;
                        const scoreColor = score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
                        const scoreBg = score >= 8 ? '#ecfdf5' : score >= 5 ? '#fffbeb' : '#fef2f2';
                        const scoreText = score >= 8 ? 'High Grade' : score >= 5 ? 'Moderate' : 'Risky Land';
                        const circumference = 2 * Math.PI * 22;
                        const dashOffset = circumference - (score / 10) * circumference;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                              <svg width="56" height="56" viewBox="0 0 56 56">
                                <circle cx="28" cy="28" r="22" fill="none" stroke="#f1f5f9" strokeWidth="4.5" />
                                <circle cx="28" cy="28" r="22" fill="none" stroke={scoreColor} strokeWidth="4.5"
                                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                                  strokeLinecap="round" transform="rotate(-90 28 28)"
                                  style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                              </svg>
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: '900', color: scoreColor }}>
                                {score > 0 ? score.toFixed(1) : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.06em', display: 'block' }}>AI Land Score</span>
                              <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e293b' }}>{scoreText}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Navigation Bridge / Edit specs / Start chat */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Step 4 Bridge */}
                      <button
                        type="button"
                        onClick={() => {
                          setAuditActiveTab('results');
                          navigate('/ai/land?step=4');
                        }}
                        style={{ fontSize: '11.5px', padding: '8px 16px', borderRadius: '10px', background: '#f8fafc', color: '#059669', border: '1.5px solid #059669', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                        title="Jump back to Step 4 to upload or delete documents"
                      >
                        ⚖️ View Document Audit Report
                      </button>

                      {/* Gap 4: Recalculate AI Score */}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={async () => {
                          if (!selectedPlot) return;
                          setSubmitting(true);
                          try {
                            const { data: updated } = await aiService.analyzeLandPlot({
                              name: selectedPlot.name,
                              address: selectedPlot.address,
                              area: selectedPlot.area,
                              askingPrice: selectedPlot.askingPrice,
                              zoning: selectedPlot.zoning,
                              roadWidth: selectedPlot.roadWidth,
                              additionalNotes: selectedPlot.additionalNotes
                            });
                            const freshPlot = { ...updated.data, auditReport: selectedPlot.auditReport };
                            setPlots(prev => prev.map(p => p.id === selectedPlot.id ? freshPlot : p));
                            setSelectedPlot(freshPlot);
                            toast.success('AI Commercial Score recalculated successfully!');
                          } catch (err) {
                            toast.error('Failed to recalculate score: ' + (err.message || 'Unknown error'));
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        style={{ fontSize: '11.5px', padding: '8px 16px', borderRadius: '10px', background: '#f8fafc', color: '#7c3aed', border: '1.5px solid #7c3aed', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                        title="Recalculate AI commercial score using latest legal audit data"
                      >
                        {submitting ? '⏳ Recalculating...' : '🔄 Recalculate AI Score'}
                      </button>

                      {/* Edit Specifications */}
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
                        style={{ fontSize: '11.5px', padding: '8px 16px', borderRadius: '10px', background: '#ffffff', color: '#475569', border: '1.5px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        ✏️ Edit Specifications
                      </button>

                      {/* Conversational discussion */}
                      <button
                        onClick={handleStartChat}
                        disabled={chatStarting}
                        style={{ fontSize: '11.5px', padding: '8px 16px', borderRadius: '10px', background: '#059669', color: '#ffffff', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(5,150,105,0.2)' }}
                      >
                        {chatStarting ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
                        Start Chat
                      </button>
                    </div>
                  </div>

                  {/* Redesigned Premium Body */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Valuation Slider Card */}
                    {selectedPlot.aiSuggestedPrice && (
                      (() => {
                        const negotiationBuffer = (((selectedPlot.askingPrice - selectedPlot.aiSuggestedPrice) / selectedPlot.askingPrice) * 100);
                        const isOverpriced = negotiationBuffer > 0;
                        return (
                          <div style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                              <h4 style={{ margin: 0, fontWeight: '800', fontSize: '12.5px', color: '#1e293b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.04em' }}>
                                <Coins size={15} className="text-emerald-500" />
                                Valuation Cushion & Pricing Vetting
                              </h4>
                              <span style={{
                                fontSize: '10.5px', fontWeight: 'bold', padding: '3px 12px', borderRadius: '20px',
                                background: isOverpriced ? '#fffbeb' : '#ecfdf5',
                                color: isOverpriced ? '#d97706' : '#059669',
                                border: `1px solid ${isOverpriced ? '#fde68a' : '#a7f3d0'}`
                              }}>
                                {isOverpriced ? `${negotiationBuffer.toFixed(1)}% Negotiation Cushion` : 'Fairly Valued'}
                              </span>
                            </div>

                            {/* Dual Gauge Track */}
                            <div style={{ padding: '8px 0 12px' }}>
                              <div style={{ position: 'relative', height: '10px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'visible' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: '#a7f3d0', borderRadius: '9999px', width: '70%' }} />
                                {/* Marker for AI Suggested */}
                                <div style={{ position: 'absolute', top: '50%', left: '70%', transform: 'translate(-50%, -50%)', backgroundColor: '#10b981', border: '3px solid #ffffff', borderRadius: '50%', width: '18px', height: '18px', boxShadow: '0 3px 6px rgba(0,0,0,0.15)', cursor: 'pointer' }} title={`AI Value: INR ${selectedPlot.aiSuggestedPrice.toLocaleString()}`} />
                                {/* Marker for Asking Price */}
                                <div style={{ position: 'absolute', top: '50%', left: '90%', transform: 'translate(-50%, -50%)', backgroundColor: '#94a3b8', border: '3px solid #ffffff', borderRadius: '50%', width: '18px', height: '18px', boxShadow: '0 3px 6px rgba(0,0,0,0.15)', cursor: 'pointer' }} title={`Asking: INR ${selectedPlot.askingPrice.toLocaleString()}`} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '14px', fontWeight: '600' }}>
                                <span>Negotiation lower boundary</span>
                                <span style={{ color: '#059669', fontWeight: 'bold' }}>AI Value: INR {selectedPlot.aiSuggestedPrice.toLocaleString()}</span>
                                <span style={{ color: '#475569', fontWeight: 'bold' }}>Asking: INR {selectedPlot.askingPrice.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {/* 2-Column Appreciation and Risk summary */}
                    {(() => {
                      const parsed = parseAnalysisData(selectedPlot);
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                          
                          {/* Forecast Card */}
                          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <span style={{ fontSize: '15px' }}>📈</span>
                              <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Appreciation & Zoning Forecast</span>
                            </div>
                            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'space-between' }}>
                              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.7' }}>
                                {formatMarkdown(parsed.appreciationText)}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '3px 10px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>Appreciation: {parsed.appreciationClass}</span>
                                <span style={{ fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #bfdbfe' }}>Potential: {parsed.developmentPotential}</span>
                              </div>
                            </div>
                          </div>

                          {/* Geotechnical Card */}
                          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <span style={{ fontSize: '15px' }}>⚠️</span>
                              <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Geotechnical & Legal Profile</span>
                            </div>
                            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'space-between' }}>
                              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.7' }}>
                                {formatMarkdown(parsed.riskText)}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '10px', background: '#fffbeb', color: '#d97706', padding: '3px 10px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #fde68a' }}>Legal Risk: {parsed.legalRisk}</span>
                                <span style={{ fontSize: '10px', background: '#fef2f2', color: '#dc2626', padding: '3px 10px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #fca5a5' }}>Eng Risk: {parsed.engineeringRisk}</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })()}

                    {/* 3-Column Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      
                      {/* Sentiment */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: selectedPlot.appreciationSentiment === 'Bullish' ? '#ecfdf5' : '#fffbeb', color: selectedPlot.appreciationSentiment === 'Bullish' ? '#059669' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                          📈
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Market Sentiment</span>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{selectedPlot.appreciationSentiment || 'Stable'}</span>
                        </div>
                      </div>

                      {/* Connectivity */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Connectivity Radar</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#475569' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>🚇 Metro Station:</span>
                            <strong>{selectedPlot.connectivityMetrics?.metroDistanceKm || 2.5} km</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>🛣️ Highway:</span>
                            <strong>{selectedPlot.connectivityMetrics?.highwayDistanceKm || 1.2} km</strong>
                          </div>
                        </div>
                      </div>

                      {/* Stamp Duty */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Estimated Registry Fees</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#475569' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Stamp Duty (6%):</span>
                            <strong>₹{(selectedPlot.acquisitionCost?.stampDuty || selectedPlot.askingPrice * 0.06).toLocaleString()}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Registration (1%):</span>
                            <strong>₹{(selectedPlot.acquisitionCost?.registrationTax || selectedPlot.askingPrice * 0.01).toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Unit Toggle and specifications */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#1e293b' }}>📐 Specification Details</span>
                        <div style={{ display: 'flex', gap: '4px', background: '#fff', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          {Object.entries(AREA_UNITS).map(([key, val]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setDisplayAreaUnit(key)}
                              style={{
                                padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                backgroundColor: displayAreaUnit === key ? '#059669' : 'transparent',
                                color: displayAreaUnit === key ? '#ffffff' : '#64748b'
                              }}
                            >
                              {val.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px 24px', fontSize: '12px', color: '#475569' }}>
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

                    {/* Linked Audited Documents Section from Document Vault (Real time filter by plot name) */}
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#1e293b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#ecfdf5', padding: '4px 10px', borderRadius: '8px', color: '#059669' }}>📁</span>
                        Linked Audited Documents in Vault
                      </div>
                      {(() => {
                        const matchingVaultDocs = catalogDocs.filter(d =>
                          d.module === 'LAND' &&
                          (d.referenceId === selectedPlot.id || d.referenceId === selectedPlot.name)
                        );
                        const hasLegacyDocs = selectedPlot.soilReport || (selectedPlot.titleDeeds && selectedPlot.titleDeeds.length > 0);
                        
                        if (matchingVaultDocs.length === 0 && !hasLegacyDocs) {
                          return (
                            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              Is plot ke liye vault me koi document nahi mila. Step 4 audit me manually plot name likhkar documents upload karein.
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Vault matching docs */}
                            {matchingVaultDocs.map((doc, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontSize: '12px', color: '#334155', fontWeight: '600' }}>📄 {doc.title}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '9.5px', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{doc.documentType}</span>
                                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', textDecoration: 'none', background: '#fff', border: '1px solid #059669', padding: '4px 10px', borderRadius: '6px' }}>
                                    View File
                                  </a>
                                </div>
                              </div>
                            ))}

                            {/* Legacy embedded docs if any */}
                            {selectedPlot.soilReport && !matchingVaultDocs.some(d => d.fileUrl === selectedPlot.soilReport.url) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontSize: '12px', color: '#334155', fontWeight: '600' }}>📄 {selectedPlot.soilReport.name || 'Soil Report'}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '9.5px', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>Soil Report</span>
                                  <a href={selectedPlot.soilReport.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', textDecoration: 'none', background: '#fff', border: '1px solid #059669', padding: '4px 10px', borderRadius: '6px' }}>
                                    View File
                                  </a>
                                </div>
                              </div>
                            )}
                            {selectedPlot.titleDeeds && selectedPlot.titleDeeds.map((deed, idx) => (
                              !matchingVaultDocs.some(d => d.fileUrl === deed.url) && (
                                <div key={`deed-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '12px', color: '#334155', fontWeight: '600' }}>📄 {deed.name || `Title Deed ${idx + 1}`}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '9.5px', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>Title Deed</span>
                                    <a href={deed.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', textDecoration: 'none', background: '#fff', border: '1px solid #059669', padding: '4px 10px', borderRadius: '6px' }}>
                                      View File
                                    </a>
                                  </div>
                                </div>
                              )
                            ))}
                          </div>
                        );
                      })()}
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
          </>
        )}
      </div>
      </>
      ) : (
        <div className="flex flex-col gap-6 w-full">
          {/* Single Card with One Tab Bar */}
          <div className="premium-section-card w-full" style={{ padding: '30px' }}>

            {/* ── Tab Bar ── */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setAuditActiveTab('upload')}
                style={{
                  padding: '10px 22px', fontSize: '13px', fontWeight: 'bold', border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  borderBottom: auditActiveTab === 'upload' ? '2.5px solid #059669' : '2.5px solid transparent',
                  color: auditActiveTab === 'upload' ? '#059669' : '#64748b',
                  marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Upload size={14} /> Upload Documents
              </button>
              <button
                type="button"
                onClick={() => setAuditActiveTab('results')}
                style={{
                  padding: '10px 22px', fontSize: '13px', fontWeight: 'bold', border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  borderBottom: auditActiveTab === 'results' ? '2.5px solid #059669' : '2.5px solid transparent',
                  color: auditActiveTab === 'results' ? '#059669' : '#64748b',
                  marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Sparkles size={14} /> Analysis Results
                {auditResult && (
                  <span style={{ background: '#059669', color: '#fff', borderRadius: '10px', fontSize: '10px', padding: '1px 7px', fontWeight: 'bold' }}>✓</span>
                )}
                {auditDocs.length > 0 && !auditResult && (
                  <span style={{ background: '#e2e8f0', color: '#475569', borderRadius: '10px', fontSize: '10px', padding: '1px 7px', fontWeight: 'bold' }}>{auditDocs.length}</span>
                )}
              </button>
            </div>

            {/* ── Upload Tab Content ── */}
            {auditActiveTab === 'upload' && (
              <>
                <p className="text-slate-500 text-xs mb-6 max-w-[800px]">
                  Drag &amp; drop up to 30 files at once (PDFs, JPGs, PNGs). Filenames are auto-matched to legal categories (7/12 Satbara, Sale Deed, Soil Report, EC, etc.) so you can process them all in a single batch.
                </p>

                {/* Plot Selector & Name Input Row */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap', maxWidth: '800px' }}>
                  {/* Select Existing Plot Dropdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '280px', flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Select Registered Plot to Manage Docs
                    </label>
                    <select
                      value={selectedPlot?.id || 'CREATE_NEW'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLoadingDocs(true);
                        setTimeout(() => {
                          if (val === 'CREATE_NEW') {
                            setSelectedPlot(null);
                            setSelectedPlotId('CREATE_NEW');
                            setNewPlotName('');
                            setAuditDocs([]);
                            setAuditResult(null);
                          } else {
                            const plot = plots.find(p => p.id === val);
                            setSelectedPlot(plot || null);
                            setSelectedPlotId(val);
                            setNewPlotName('');
                            if (plot) {
                              setAuditResult(plot.auditReport || null);
                              const existing = [];
                              if (plot.soilReport) {
                                existing.push({ name: plot.soilReport.name, url: plot.soilReport.url, type: 'Soil Report', size: 'N/A' });
                              }
                              if (plot.titleDeeds && plot.titleDeeds.length > 0) {
                                plot.titleDeeds.forEach(d => {
                                  const nameLower = d.name.toLowerCase();
                                  let type = 'Sale Deed';
                                  if (nameLower.includes('7_12') || nameLower.includes('satbara')) type = '7/12 Extract';
                                  else if (nameLower.includes('property')) type = 'Property Card';
                                  else if (nameLower.includes('encumbrance') || nameLower.includes('ec')) type = 'Encumbrance Certificate';
                                  else if (nameLower.includes('index')) type = 'Index II';
                                  else if (nameLower.includes('title') || nameLower.includes('search')) type = 'Title Search Report';
                                  else if (nameLower.includes('court') || nameLower.includes('stay') || nameLower.includes('litigation')) type = 'Court Case Documents';
                                  else if (nameLower.includes('na') || nameLower.includes('conversion')) type = 'NA Order';
                                  else if (nameLower.includes('survey') || nameLower.includes('map')) type = 'Survey Map';
                                  
                                  existing.push({ name: d.name, url: d.url, type, size: 'N/A' });
                                });
                              }
                              const matchingVaultDocs = catalogDocs.filter(d => 
                                d.module === 'LAND' && 
                                (d.referenceId === plot.id || d.referenceId === plot.name)
                              );
                              matchingVaultDocs.forEach(d => {
                                if (!existing.some(x => x.url === d.fileUrl)) {
                                  const nameLower = d.title.toLowerCase();
                                  let type = d.documentType || 'Sale Deed';
                                  if (nameLower.includes('7_12') || nameLower.includes('satbara')) type = '7/12 Extract';
                                  else if (nameLower.includes('property')) type = 'Property Card';
                                  else if (nameLower.includes('encumbrance') || nameLower.includes('ec')) type = 'Encumbrance Certificate';
                                  else if (nameLower.includes('index')) type = 'Index II';
                                  else if (nameLower.includes('title') || nameLower.includes('search')) type = 'Title Search Report';
                                  else if (nameLower.includes('court') || nameLower.includes('stay') || nameLower.includes('litigation')) type = 'Court Case Documents';
                                  else if (nameLower.includes('na') || nameLower.includes('conversion')) type = 'NA Order';
                                  else if (nameLower.includes('survey') || nameLower.includes('map')) type = 'Survey Map';
                                  else if (d.title.includes('Soil')) type = 'Soil Report';
                                  
                                  existing.push({ name: d.title, url: d.fileUrl, type, size: 'N/A' });
                                }
                              });
                              setAuditDocs(existing);
                            }
                          }
                          setLoadingDocs(false);
                        }, 400);
                      }}
                      style={{
                        padding: '10px 14px', borderRadius: '10px',
                        border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#1e293b',
                        background: '#ffffff', outline: 'none', fontWeight: '500', cursor: 'pointer'
                      }}
                    >
                      <option value="CREATE_NEW">➕ Create & Register New Plot</option>
                      {plots.map(p => (
                        <option key={p.id} value={p.id}>🏡 {p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Plot Name Input (Disabled if using existing plot) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '280px', flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Plot Name (For New Registration)
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      placeholder={selectedPlot ? "Using registered plot details" : "e.g. Hinjewadi Plot B"}
                      disabled={!!selectedPlot}
                      value={selectedPlot ? selectedPlot.name : newPlotName}
                      onChange={(e) => {
                        setNewPlotName(e.target.value);
                        setSelectedPlotId('CREATE_NEW');
                        setSelectedPlot(null);
                      }}
                      style={{
                        padding: '10px 14px', borderRadius: '10px',
                        border: '1.5px solid #cbd5e1', fontSize: '13px', color: selectedPlot ? '#94a3b8' : '#1e293b',
                        background: selectedPlot ? '#f1f5f9' : '#ffffff', outline: 'none', fontWeight: '500'
                      }}
                    />
                  </div>
                </div>

                {/* Batch Dropzone */}
                <div
                  className={`batch-dropzone ${dragActive ? 'batch-dropzone-dragover' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleBatchUpload(e.dataTransfer.files); }}
                  style={{
                    border: dragActive ? '2.5px dashed #059669' : '2.5px dashed #cbd5e1',
                    background: dragActive ? 'rgba(5, 150, 105, 0.04)' : 'rgba(248, 250, 252, 0.6)',
                  }}
                >
                  <Upload size={32} className={dragActive ? 'text-emerald-600' : 'text-slate-400'} />
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>
                      Drag &amp; drop all land documents here
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                      Supports PDF, PNG, JPG up to 30 files. Filenames are automatically matched to categories.
                    </span>
                  </div>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                    padding: '8px 20px', borderRadius: '8px', border: '1.5px solid #059669',
                    color: '#059669', fontSize: '12px', fontWeight: 'bold', background: '#fff'
                  }}>
                    <Upload size={13} /> Browse Files
                    <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
                      onChange={(e) => handleBatchUpload(e.target.files)} />
                  </label>
                </div>

                {/* Category Folder Accordions */}
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'title', label: 'Title & Ownership Documents', icon: '📁', types: ['7/12 Extract', 'Sale Deed', 'Property Card', 'Index II'] },
                    { id: 'legal', label: 'Legal & Litigation Reports', icon: '⚖️', types: ['Encumbrance Certificate', 'Title Search Report', 'Court Case Documents'] },
                    { id: 'revenue', label: 'Revenue & Conversion Orders', icon: '🏛️', types: ['NA Order'] },
                    { id: 'technical', label: 'Engineering & Technical Sheets', icon: '📐', types: ['Soil Report', 'Survey Map'] },
                  ].map((folder) => {
                    const folderFiles = auditDocs.filter(d => folder.types.includes(d.type));
                    return (
                      <details key={folder.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }} open={folderFiles.length > 0}>
                        <summary style={{
                          padding: '10px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12.5px',
                          color: '#334155', display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', userSelect: 'none'
                        }}>
                          <span>{folder.icon}</span>
                          <span style={{ flex: 1 }}>{folder.label}</span>
                          <span style={{
                            background: folderFiles.length > 0 ? '#059669' : '#e2e8f0',
                            color: folderFiles.length > 0 ? '#fff' : '#94a3b8',
                            borderRadius: '10px', fontSize: '10px', padding: '1px 7px', fontWeight: 'bold'
                          }}>{folderFiles.length}</span>
                        </summary>
                        <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {folder.types.map((docType) => {
                            const typeFiles = auditDocs.filter(d => d.type === docType);
                            return (
                              <div key={docType} style={{ background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155' }}>{docType}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {typeFiles.length > 0 && <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>✓ {typeFiles.length}</span>}
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: '1px dashed #059669', padding: '3px 10px', borderRadius: '6px', fontSize: '10.5px', color: '#059669', fontWeight: 'bold', background: 'transparent' }}>
                                    + Upload
                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
                                      onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        try {
                                          toast.info(`Uploading ${file.name}...`);
                                          const url = await uploadFile(file, 'innonsh-assets');
                                          const newDoc = { name: file.name, url, type: docType, size: (file.size / (1024 * 1024)).toFixed(2) + ' MB' };
                                          const updated = [...auditDocs, newDoc];
                                          setAuditDocs(updated);
                                          if (selectedPlot?.id) { await syncDocsToDatabase(updated); }
                                          toast.success(`${docType} uploaded!`);
                                        } catch (err) { toast.error(`Upload failed: ${err.message}`); }
                                      }} />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>

                {/* ── Other / Additional Documents ── */}
                <div style={{ marginTop: '16px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#334155' }}>📎 Other / Additional Documents</span>
                      <span style={{ display: 'block', fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                        Koi bhi alag document — naam manually likhein aur file upload karein. Yeh bhi AI analyse karega.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomDocFields(prev => [...prev, { id: Date.now(), label: '', file: null, url: null, uploading: false }])}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #059669', color: '#059669', fontWeight: 'bold', fontSize: '11.5px', background: '#fff', cursor: 'pointer' }}
                    >
                      + Add Document
                    </button>
                  </div>

                  {customDocFields.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '12px 0', color: '#cbd5e1', fontSize: '12px', fontStyle: 'italic' }}>
                      "+ Add Document" click karein naya document field add karne ke liye.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {customDocFields.map((field, idx) => (
                      <div key={field.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
                        <input
                          type="text"
                          autoComplete="off"
                          spellCheck="false"
                          placeholder="Document naam likhein (e.g. Forest Clearance, Layout Plan)"
                          value={field.label}
                          onChange={(e) => setCustomDocFields(prev => prev.map((f, i) => i === idx ? { ...f, label: e.target.value } : f))}
                          style={{ flex: 1, padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '12px', color: '#1e293b', outline: 'none', background: '#f8fafc' }}
                        />
                        {field.url ? (
                          <a href={field.url} target="_blank" rel="noreferrer"
                            style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #059669', padding: '5px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                            📄 {field.file}
                          </a>
                        ) : (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '11.5px', color: '#475569', fontWeight: 'bold', cursor: 'pointer', background: '#f8fafc', whiteSpace: 'nowrap' }}>
                            {field.uploading ? '⏳ Uploading...' : '📁 Choose File'}
                            <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
                              disabled={field.uploading}
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setCustomDocFields(prev => prev.map((f, i) => i === idx ? { ...f, uploading: true } : f));
                                try {
                                  const docLabel = customDocFields[idx].label.trim() || `Custom Document ${idx + 1}`;
                                  const url = await uploadFile(file, 'innonsh-assets');
                                  const newDoc = { name: file.name, url, type: docLabel, size: (file.size / (1024 * 1024)).toFixed(2) + ' MB' };
                                  const updated = [...auditDocs, newDoc];
                                  setAuditDocs(updated);
                                  setCustomDocFields(prev => prev.map((f, i) => i === idx ? { ...f, url, file: file.name, uploading: false } : f));
                                  if (selectedPlot?.id) { await syncDocsToDatabase(updated); }
                                  toast.success(`"${docLabel}" uploaded!`);
                                } catch (err) {
                                  setCustomDocFields(prev => prev.map((f, i) => i === idx ? { ...f, uploading: false } : f));
                                  toast.error(`Upload failed: ${err.message}`);
                                }
                              }} />
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => setCustomDocFields(prev => prev.filter((_, i) => i !== idx))}
                          style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', lineHeight: 1, padding: '0 4px' }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Uploaded File Registry Table */}
                {loadingDocs ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '24px', marginBottom: '24px' }}>
                    <Loader2 className="animate-spin text-emerald-600 mb-2" size={24} />
                    <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '500' }}>Loading plot documents from Vault...</span>
                  </div>
                ) : auditDocs.length > 0 ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginTop: '24px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>
                      Uploaded Files Registry ({auditDocs.length})
                    </span>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="registry-table">
                        <thead>
                          <tr>
                            <th className="registry-th">Filename</th>
                            <th className="registry-th" style={{ width: '100px' }}>Size</th>
                            <th className="registry-th" style={{ width: '220px' }}>Assigned Category</th>
                            <th className="registry-th" style={{ width: '60px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditDocs.map((doc, index) => (
                            <tr key={index}>
                              <td className="registry-td" style={{ fontWeight: '500' }}>
                                <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: '#059669', textDecoration: 'none' }}
                                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                                  📄 {doc.name}
                                </a>
                              </td>
                              <td className="registry-td">{doc.size || 'N/A'}</td>
                              <td className="registry-td">
                                <select
                                  value={['7/12 Extract','Sale Deed','Property Card','Soil Report','Encumbrance Certificate','Index II','Title Search Report','Court Case Documents','NA Order','Survey Map'].includes(doc.type) ? doc.type : 'Other'}
                                  onChange={async (e) => {
                                    const newType = e.target.value;
                                    const updated = auditDocs.map((d, idx) => idx === index ? { ...d, type: newType, customType: newType === 'Other' ? '' : undefined } : d);
                                    setAuditDocs(updated);
                                    if (selectedPlot?.id) { await syncDocsToDatabase(updated); }
                                  }}
                                  style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', color: '#334155', background: '#ffffff', cursor: 'pointer' }}
                                >
                                  <option value="7/12 Extract">7/12 Extract</option>
                                  <option value="Sale Deed">Sale Deed</option>
                                  <option value="Property Card">Property Card</option>
                                  <option value="Soil Report">Soil Report</option>
                                  <option value="Encumbrance Certificate">Encumbrance Certificate</option>
                                  <option value="Index II">Index II</option>
                                  <option value="Title Search Report">Title Search Report</option>
                                  <option value="Court Case Documents">Court Case Documents</option>
                                  <option value="NA Order">NA Order</option>
                                  <option value="Survey Map">Survey Map</option>
                                  <option value="Other">Other Support Document</option>
                                </select>
                                {(!['7/12 Extract','Sale Deed','Property Card','Soil Report','Encumbrance Certificate','Index II','Title Search Report','Court Case Documents','NA Order','Survey Map'].includes(doc.type) || doc.type === 'Other') && (
                                  <input
                                    type="text"
                                    placeholder="e.g. Forest Clearance, Coastal Zone NOC"
                                    value={doc.customType || (doc.type === 'Other' ? '' : doc.type)}
                                    onChange={async (e) => {
                                      const val = e.target.value;
                                      const updated = auditDocs.map((d, idx) => idx === index ? { ...d, type: val || 'Other', customType: val } : d);
                                      setAuditDocs(updated);
                                      if (selectedPlot?.id) { await syncDocsToDatabase(updated); }
                                    }}
                                    style={{ marginTop: '6px', width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #059669', fontSize: '11px', color: '#334155', background: '#ffffff' }}
                                  />
                                )}
                              </td>
                              <td className="registry-td" style={{ textAlign: 'center' }}>
                                <button type="button" onClick={() => handleRemoveAuditDoc(index)}
                                  style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : selectedPlot ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', marginTop: '24px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Is plot ke liye vault me koi document nahi mila. Nayi file upload karke link karein.</span>
                  </div>
                ) : null}

                {/* Run Analysis Button */}
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button" onClick={handleRunAudit}
                    disabled={auditing || auditDocs.length === 0}
                    className="btn btn-primary btn-lg flex items-center justify-center gap-2"
                    style={{ minWidth: '220px', borderRadius: '12px', padding: '12px 24px', fontWeight: 'bold' }}
                  >
                    {auditing ? (
                      <><Loader2 className="animate-spin" size={18} /> Processing...</>
                    ) : (
                      <><Sparkles size={18} /> Run AI Analysis &amp; Audit</>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* ── Results Tab Content ── */}
            {auditActiveTab === 'results' && (
              <>
                {/* Uploaded Files Summary */}
                {auditDocs.length > 0 && (
                  <div style={{ marginBottom: '20px', background: '#f8fafc', borderRadius: '10px', padding: '14px 18px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                      📂 Analysed Documents ({auditDocs.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {auditDocs.map((doc, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', border: '1px solid #e2e8f0' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: '500' }}>
                            📄 {doc.name}
                          </span>
                          <span style={{ fontSize: '10px', color: '#059669', background: '#ecfdf5', borderRadius: '8px', padding: '1px 8px', fontWeight: 'bold' }}>
                            {doc.type}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setAuditActiveTab('upload')}
                        style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', background: 'transparent', border: '1px solid #059669', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>
                        + Add / Remove Documents
                      </button>
                    </div>
                  </div>
                )}

                {/* Auditing Loader */}
                {auditing && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px 0', textAlign: 'center' }}>
                    <div className="spinner spinner-lg spinner-primary mx-auto animate-spin" />
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginTop: '12px' }}>AI Due Diligence Audit In Progress</h3>
                    <p style={{ fontSize: '12.5px', color: '#059669', fontWeight: 'bold', animation: 'pulse 2s infinite', maxWidth: '480px' }}>
                      🤖 {
                        auditStage === 1 ? 'Reading files & extracting text content via OCR...' :
                        auditStage === 2 ? 'Mapping layout details, dates, and authority seals...' :
                        auditStage === 3 ? 'Cross-checking owner names, area metrics, and survey coordinates...' :
                        auditStage === 4 ? 'Verifying stamp registration details & signatures presence...' :
                        auditStage === 5 ? 'Scanning Encumbrance Certificate for loans and court litigations...' :
                        auditStage === 6 ? 'Running Geotechnical soil parameters translation & checks...' :
                        auditStage === 7 ? 'Evaluating document expiration dates and alteration anomalies...' :
                        'Generating complete due diligence summary and investment recommendations...'
                      }
                    </p>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>Please wait, scanning documents. This process takes approximately 10-25 seconds depending on file sizes.</span>
                  </div>
                )}

                {/* No analysis yet */}
                {!auditing && !auditResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 0', textAlign: 'center' }}>
                    <Sparkles size={40} className="text-slate-300" />
                    <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Analysis nahi hui abhi tak.</p>
                    <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Upload Documents tab me documents add karo aur "Run AI Analysis" click karo.</p>
                    <button type="button" onClick={() => setAuditActiveTab('upload')}
                      style={{ marginTop: '8px', padding: '8px 20px', borderRadius: '8px', border: '1.5px solid #059669', color: '#059669', fontWeight: 'bold', fontSize: '12px', background: 'transparent', cursor: 'pointer' }}>
                      ← Upload Documents
                    </button>
                  </div>
                )}

                {/* Audit Results Dashboard */}
                {auditResult && !auditing && (() => {
                  const riskColor = auditResult.overallRisk === 'Low' ? '#10b981' : auditResult.overallRisk === 'Medium' ? '#f59e0b' : '#ef4444';
                  const riskBg   = auditResult.overallRisk === 'Low' ? 'linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)' : auditResult.overallRisk === 'Medium' ? 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)' : 'linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%)';
                  const riskIcon = auditResult.overallRisk === 'Low' ? '✅' : auditResult.overallRisk === 'Medium' ? '⚠️' : '🚨';
                  const riskLabel = auditResult.overallRisk === 'Low' ? 'Safe to Proceed' : auditResult.overallRisk === 'Medium' ? 'Medium Risk — Review Required' : 'High Risk — Do Not Proceed';
                  const score = auditResult.overallRiskScore || 0;
                  const circumference = 2 * Math.PI * 42;
                  const dashOffset = circumference - (score / 100) * circumference;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                      {/* ── Hero Risk Banner ── */}
                      <div style={{ background: riskBg, border: `2px solid ${riskColor}`, borderRadius: '20px', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px', position: 'relative', overflow: 'hidden' }}>
                        {/* Decorative circle */}
                        <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: riskColor, opacity: 0.06 }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          {/* SVG Score Ring */}
                          <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                            <svg width="100" height="100" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                              <circle cx="50" cy="50" r="42" fill="none" stroke={riskColor} strokeWidth="8"
                                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                                strokeLinecap="round" transform="rotate(-90 50 50)"
                                style={{ transition: 'stroke-dashoffset 1s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '22px', fontWeight: '900', color: riskColor, lineHeight: 1 }}>{score}</span>
                              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>/ 100</span>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>AI Due Diligence Result</div>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', marginBottom: '6px' }}>{riskIcon} {riskLabel}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>
                              AI scanned <strong>{auditResult.documentsCount || auditDocs.length}</strong> documents &nbsp;•&nbsp; Plot: <strong>{newPlotName || selectedPlot?.name || 'N/A'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="button" onClick={handleRunAudit}
                            style={{ background: '#ffffff', color: '#334155', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '12px 20px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            🔄 Re-Run Analysis
                          </button>
                          
                          <button type="button" onClick={handleTransitionToLandBank}
                            style={{ background: riskColor, color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 22px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 6px 20px ${riskColor}55`, whiteSpace: 'nowrap' }}>
                            <Sparkles size={16} /> Add to Land Bank →
                          </button>
                        </div>
                      </div>

                      {/* ── 11 AI Check Cards ── */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                        {[
                          { key: 'ownerVerification',     label: 'Owner Name Verification',     icon: '👤' },
                          { key: 'surveyVerification',    label: 'Survey Number Verification',    icon: '📍' },
                          { key: 'areaVerification',      label: 'Area Size Verification',      icon: '📐' },
                          { key: 'signatureVerification', label: 'Document Signature Check',    icon: '✏️' },
                          { key: 'stampVerification',     label: 'Stamp Duty & Seal Verification', icon: '🏢' },
                          { key: 'encumbranceCheck',      label: 'Legal Encumbrance Check',     icon: '🔒' },
                          { key: 'courtCaseDetection',    label: 'Pending Court Litigation',     icon: '⚖️' },
                          { key: 'duplicateOwnership',    label: 'Chain Duplicate Ownership',   icon: '📄' },
                          { key: 'expiredDocuments',      label: 'Document Expiry Check',      icon: '📅' },
                          { key: 'missingDocuments',      label: 'Missing Document Check',      icon: '❌' },
                          { key: 'fraudDetection',        label: 'Document Alteration/Fraud Check', icon: '🔍' }
                        ].map((item) => {
                          const d = auditResult[item.key] || { status: 'warning', badge: 'Pending', details: 'Not yet analysed.' };
                          const isOk  = d.status === 'success' || d.status === 'ok';
                          const isDanger = d.status === 'danger' || d.status === 'error';
                          const cardColor = isOk ? '#10b981' : isDanger ? '#ef4444' : '#f59e0b';
                          const cardBg   = isOk ? '#f0fdf4' : isDanger ? '#fef2f2' : '#fffbeb';
                          return (
                            <div key={item.key} style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${cardColor}`, borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '12.5px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <span style={{ fontSize: '17px' }}>{item.icon}</span>{item.label}
                                </span>
                                <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '10.5px', fontWeight: 'bold', background: cardBg, color: cardColor, whiteSpace: 'nowrap' }}>
                                  {d.badge || (isOk ? 'VERIFIED' : isDanger ? 'ALERT' : 'REVIEW')}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.65' }}>{d.details}</p>
                              {item.key === 'missingDocuments' && d.missingList && d.missingList.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                  {d.missingList.map((mItem, mIdx) => (
                                    <span key={mIdx} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                                      {mItem}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* ── Extracted Land Info ── */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 24px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#f0fdf4', padding: '4px 10px', borderRadius: '8px', color: '#059669' }}>📊</span>
                          Extracted Land Information
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
                          {[
                            { label: 'Owner Name',    val: auditResult.extractedSummary?.owner,     danger: false },
                            { label: 'Survey No.',    val: auditResult.extractedSummary?.surveyNumber, danger: false },
                            { label: 'Total Area',    val: auditResult.extractedSummary?.area,       danger: false },
                            { label: 'Land Type',     val: auditResult.extractedSummary?.landType,   danger: false },
                            { label: 'Mortgage',      val: auditResult.extractedSummary?.mortgage || 'No',   danger: auditResult.extractedSummary?.mortgage === 'Yes' },
                            { label: 'Court Case',    val: auditResult.extractedSummary?.courtCase || 'No',  danger: auditResult.extractedSummary?.courtCase === 'Yes' },
                          ].map((item, i) => (
                            <div key={i} style={{ background: item.danger ? '#fef2f2' : '#f8fafc', border: `1px solid ${item.danger ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '10px', padding: '12px 14px' }}>
                              <div style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>{item.label}</div>
                              <div style={{ fontSize: '13.5px', fontWeight: '700', color: item.danger ? '#dc2626' : '#1e293b' }}>{item.val || '—'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── Soil Report Summary ── */}
                      {auditResult.extractedSummary?.soil && (
                        <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '20px 24px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#065f46', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🪨 Soil & Geotechnical Summary
                          </div>
                          <p style={{ fontSize: '12.5px', color: '#1e293b', lineHeight: '1.75', margin: 0 }}>{auditResult.extractedSummary.soil}</p>
                        </div>
                      )}

                      {/* ── AI Recommendations ── */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 24px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#fffbeb', padding: '4px 10px', borderRadius: '8px', color: '#d97706' }}>💡</span>
                          AI Recommendations & Action Steps
                        </div>
                        {auditResult.recommendations?.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {auditResult.recommendations.map((rec, i) => (
                              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
                                <span style={{ background: '#059669', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                                <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: '1.65' }}>{rec}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px', fontSize: '12.5px', color: '#166534', fontWeight: '500' }}>
                            ✅ All checks passed. No action required — documents are clean and verified.
                          </div>
                        )}
                      </div>

                      {/* ── Analysed Documents List ── */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            📂 Analysed Documents ({auditDocs.length})
                          </div>
                          <button type="button" onClick={() => setAuditActiveTab('upload')}
                            style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', background: '#fff', border: '1px solid #059669', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>
                            + Add / Remove
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {auditDocs.map((doc, i) => (
                            <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', textDecoration: 'none', fontSize: '11.5px', color: '#334155', fontWeight: '500', transition: 'border-color 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = '#059669'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                              📄 {doc.name}
                              <span style={{ fontSize: '9.5px', color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: '5px', fontWeight: 'bold' }}>{doc.type}</span>
                            </a>
                          ))}
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

