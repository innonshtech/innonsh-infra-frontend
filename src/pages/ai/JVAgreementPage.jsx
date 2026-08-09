import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService, projectService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { 
  Building, DollarSign, Sparkles, Scale, Info, ChevronRight, AlertTriangle, 
  Coins, MessageSquare, Loader2, Sliders, LayoutDashboard, ShieldCheck, Upload,
  Handshake, Plus, TrendingUp, History, FolderPlus
} from 'lucide-react';
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

function renderCostHelper(val) {
  if (!val || isNaN(val)) return null;
  const num = Number(val);
  if (num >= 10000000) {
    return <span style={{ fontSize: '9px', color: '#059669', fontWeight: '600', marginTop: '3px', display: 'block' }}>≈ ₹{(num / 10000000).toFixed(2)} Crore</span>;
  }
  if (num >= 100000) {
    return <span style={{ fontSize: '9px', color: '#059669', fontWeight: '600', marginTop: '3px', display: 'block' }}>≈ ₹{(num / 100000).toFixed(2)} Lakh</span>;
  }
  return <span style={{ fontSize: '9px', color: '#64748b', marginTop: '3px', display: 'block' }}>₹{num.toLocaleString('en-IN')}</span>;
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
  const [uploadingTermSheet, setUploadingTermSheet] = useState(false);
  const [chatPrompt, setChatPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Lookups data lists
  const [projectId, setProjectId] = useState('');
  const [landId, setLandId] = useState('');
  const [projectsList, setProjectsList] = useState([]);
  const [landsList, setLandsList] = useState([]);

  const handleLandSelect = (selectedLandId) => {
    setLandId(selectedLandId);
    const selected = landsList.find(l => l.id === selectedLandId);
    if (selected) {
      setLandValue(selected.askingPrice || '');
      setSurveyNumber(selected.surveyNumber || 'SUR-549/2');
      setVillage(selected.village || 'Hinjewadi');
      setDistrict(selected.district || 'Pune');
      setStateName(selected.state || 'Maharashtra');
      const targetUnit = selected.unit || 'sqft';
      setLandAreaUnit(targetUnit);
      setLandArea(selected.area ? selected.area.toString() : '5');
      setZoning(selected.zoning || 'Residential');
      if (selected.owners && selected.owners.length > 0) {
        setLandowners(selected.owners.map(o => ({
          name: o.name || '',
          share: o.share ? o.share.toString() : '100',
          mobile: o.mobile || '',
          email: '', pan: '', aadhaar: '', address: '', bank: ''
        })));
      } else {
        setLandowners([{ name: 'Anil Kapoor', share: '100', mobile: '', email: '', pan: '', aadhaar: '', address: '', bank: '' }]);
      }
    }
  };

  // Main tabs selection
  const [activeMainTab, setActiveMainTab] = useState('calculate'); // 'calculate' or 'history'
  const [formTab, setFormTab] = useState('model');

  // New JV Scenarios custom inputs & ledgers
  const [expectedRevenue, setExpectedRevenue] = useState('');
  const [totalSaleableArea, setTotalSaleableArea] = useState('');
  const [minGuarantee, setMinGuarantee] = useState('');
  const [profitSharePct, setProfitSharePct] = useState('');
  const [actualConstructionCost, setActualConstructionCost] = useState('');
  const [unitsAllocatedList, setUnitsAllocatedList] = useState([]);
  const [aiComparison, setAiComparison] = useState(null);

  // Gap 5: Tower/Floor unit configuration for Area Sharing ledger
  const [numTowers, setNumTowers] = useState('2');
  const [numFloors, setNumFloors] = useState('3');
  const [numUnitsPerFloor, setNumUnitsPerFloor] = useState('4');

  // Gap 8: Terms & Responsibilities capture
  const defaultBuilderResp = ['Construction & Architecture', 'Government Approvals & RERA', 'Contractor & Labour Management', 'Marketing & Sales', 'Project Management', 'Utility Connections'];
  const defaultOwnerResp = ['Land Title Clearance', 'Cooperation for Approvals & NOC', 'No Encumbrance on Land', 'Handover of Possession', 'Payment of Property Tax till Handover'];
  const [builderResponsibilities, setBuilderResponsibilities] = useState(defaultBuilderResp);
  const [ownerResponsibilities, setOwnerResponsibilities] = useState(defaultOwnerResp);
  const [builderRespCustom, setBuilderRespCustom] = useState('');
  const [ownerRespCustom, setOwnerRespCustom] = useState('');

  // Extended Input Form states
  // 1. Basic & Land
  const [jvType, setJvType] = useState('Revenue Share');
  const [jvStatus, setJvStatus] = useState('Active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [surveyNumber, setSurveyNumber] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [landArea, setLandArea] = useState('');
  const [landAreaUnit, setLandAreaUnit] = useState('acres');
  const [zoning, setZoning] = useState('Residential');
  const [fsi, setFsi] = useState('');
  const [reraNumber, setReraNumber] = useState('');

  // 2. Landowner/Partner details
  const [landowners, setLandowners] = useState([
    { name: '', share: '', mobile: '', email: '', pan: '', aadhaar: '', address: '', bank: '' }
  ]);

  // 3. Builder details
  const [builderContact, setBuilderContact] = useState('');
  const [builderMobile, setBuilderMobile] = useState('');
  const [builderEmail, setBuilderEmail] = useState('');
  const [builderExperience, setBuilderExperience] = useState('');
  const [builderCompleted, setBuilderCompleted] = useState('');
  const [builderRating, setBuilderRating] = useState('');
  const [builderCapacity, setBuilderCapacity] = useState('');

  // 4. Investor details
  const [investorRoi, setInvestorRoi] = useState('');
  const [investorType, setInvestorType] = useState('');
  const [investorExit, setInvestorExit] = useState('');

  // 5. Financial details
  const [approvalCost, setApprovalCost] = useState('');
  const [marketingCost, setMarketingCost] = useState('');
  const [miscCost, setMiscCost] = useState('');
  const [escrowBank, setEscrowBank] = useState('');
  const [escrowAccount, setEscrowAccount] = useState('');

  // 6. Revenue sharing allocation details
  const [builderSharePct, setBuilderSharePct] = useState('');
  const [ownerSharePct, setOwnerSharePct] = useState('');
  const [investorSharePct, setInvestorSharePct] = useState('');
  const [distributionType, setDistributionType] = useState('Revenue Share');
  const [paymentFrequency, setPaymentFrequency] = useState('Quarterly');
  const [ownerAllocatedUnits, setOwnerAllocatedUnits] = useState('');
  const [builderAllocatedUnits, setBuilderAllocatedUnits] = useState('');

  // 7. Agreement details
  const [agreementNumber, setAgreementNumber] = useState('');
  const [agreementDate, setAgreementDate] = useState('');
  const [validTill, setValidTill] = useState('');
  const [stampPayer, setStampPayer] = useState('');
  const [stampAmount, setStampAmount] = useState('');
  const [arbitrationSeat, setArbitrationSeat] = useState('');
  const [governingJurisdiction, setGoverningJurisdiction] = useState('');

  // 8. Document check flags
  const [docSaleDeed, setDocSaleDeed] = useState(false);
  const [docSevenTwelve, setDocSevenTwelve] = useState(false);
  const [docEc, setDocEc] = useState(false);
  const [docTitleReport, setDocTitleReport] = useState(false);
  const [docPoa, setDocPoa] = useState(false);
  const [docNoc, setDocNoc] = useState(false);
  const [docTaxReceipt, setDocTaxReceipt] = useState(false);

  useEffect(() => {
    fetchAgreements();
  }, []);

  useEffect(() => {
    if (selectedJv?.metadata?.aiComparison) {
      setAiComparison(selectedJv.metadata.aiComparison);
    } else {
      setAiComparison(null);
    }
  }, [selectedJv?.id]);

  useEffect(() => {
    const mockUnits = [
      'A-101', 'A-102', 'A-103', 'A-104',
      'A-201', 'A-202', 'A-203', 'A-204',
      'A-301', 'A-302', 'A-303', 'A-304',
      'B-101', 'B-102', 'B-103', 'B-104',
      'B-201', 'B-202', 'B-203', 'B-204',
      'B-301', 'B-302', 'B-303', 'B-304'
    ];
    setUnitsAllocatedList(mockUnits.map(unitNo => ({ unitNo, owner: 'Builder' })));
  }, []);

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getJVAgreements();
      setAgreements(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedJv(data.data[0]);
      }
      // Load lookup databases
      const [projRes, landRes] = await Promise.all([
        projectService.getAll(),
        aiService.getLandPlots()
      ]);
      setProjectsList(projRes.data?.data || []);
      setLandsList(landRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load JV agreements or lookups');
    } finally {
      setLoading(false);
    }
  };

  const handleTermSheetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingTermSheet(true);
    try {
      toast.info(`Uploading ${file.name} to cloud storage...`);
      const url = await uploadFile(file, 'innonsh-assets');
      setTermSheet({ name: file.name, url });
      toast.success('Term sheet uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload term sheet: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadingTermSheet(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const firstOwnerName = landowners[0]?.name || '';
    if (!chatPrompt && (!projectName || !firstOwnerName || !builderName || !landValue || !constructionCost)) {
      toast.warning('Please fill in core JV parameters or describe the partnership details in the AI prompt chatbox below');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        projectName: projectName || undefined,
        projectId: projectId || undefined,
        landId: landId || undefined,
        landOwnerName: landowners[0]?.name || landOwnerName || undefined,
        builderName: builderName || undefined,
        investorName: investorName || undefined,
        landValue: landValue ? Number(landValue) : undefined,
        constructionCost: constructionCost ? Number(constructionCost) : undefined,
        investorFunds: investorFunds ? Number(investorFunds) : undefined,
        landOwnerTerms: landOwnerTerms || undefined,
        builderTerms: builderTerms || undefined,
        investorTerms: investorTerms || undefined,
        termSheet: termSheet ? { url: termSheet.url, mimeType: 'application/pdf' } : undefined,
        chatPrompt: chatPrompt || undefined,
        metadata: {
          basicDetails: {
            jvType,
            status: jvStatus,
            startDate,
            endDate,
            description,
            reraNumber
          },
          landDetails: {
            surveyNumber,
            village,
            district,
            state: stateName,
            landArea: landArea ? Number(convertValue(landArea, landAreaUnit, 'sqft', AREA_UNITS)) : undefined,
            landAreaUnit: landAreaUnit || 'sqft',
            zoning,
            fsi: fsi ? Number(fsi) : undefined
          },
          landOwnerDetails: landowners.map(o => ({
            name: o.name,
            mobile: o.mobile || undefined,
            email: o.email || undefined,
            ownershipPercentage: o.share ? Number(o.share) : undefined,
            pan: o.pan || undefined,
            aadhaar: o.aadhaar || undefined,
            address: o.address || undefined,
            bankDetails: o.bank || undefined
          })),
          builderDetails: {
            contactPerson: builderContact || undefined,
            mobile: builderMobile || undefined,
            email: builderEmail || undefined,
            experience: builderExperience ? Number(builderExperience) : undefined,
            completedProjects: builderCompleted ? Number(builderCompleted) : undefined,
            creditRating: builderRating || undefined,
            financialCapacity: builderCapacity ? Number(builderCapacity) : undefined
          },
          investorDetails: {
            expectedRoi: investorRoi ? Number(investorRoi) : undefined,
            investmentType: investorType || undefined,
            exitTimeline: investorExit ? Number(investorExit) : undefined
          },
          financialDetails: {
            approvalCost: approvalCost ? Number(approvalCost) : undefined,
            marketingCost: marketingCost ? Number(marketingCost) : undefined,
            miscellaneousCost: miscCost ? Number(miscCost) : undefined,
            escrowBankName: escrowBank || undefined,
            escrowAccountNumber: escrowAccount || undefined,
            expectedRevenue: expectedRevenue ? Number(expectedRevenue) : undefined,
            totalSaleableArea: totalSaleableArea ? Number(totalSaleableArea) : undefined,
            minGuarantee: minGuarantee ? Number(minGuarantee) : undefined,
            profitSharePct: profitSharePct ? Number(profitSharePct) : undefined,
            actualConstructionCost: actualConstructionCost ? Number(actualConstructionCost) : undefined,
            unitsAllocatedList
          },
          revenueSharingDetails: {
            builderShare: builderSharePct ? Number(builderSharePct) : undefined,
            landOwnerShare: ownerSharePct ? Number(ownerSharePct) : undefined,
            investorShare: investorSharePct ? Number(investorSharePct) : undefined,
            profitDistributionType: distributionType || undefined,
            paymentFrequency: paymentFrequency || undefined,
            ownerAllocatedUnits: ownerAllocatedUnits || undefined,
            builderAllocatedUnits: builderAllocatedUnits || undefined
          },
          agreementDetails: {
            agreementNumber: agreementNumber || undefined,
            agreementDate: agreementDate || undefined,
            validTill: validTill || undefined,
            stampDutyPayer: stampPayer || undefined,
            stampDutyAmount: stampAmount ? Number(stampAmount) : undefined,
            arbitrationSeat: arbitrationSeat || undefined,
            governingJurisdiction: governingJurisdiction || undefined
          },
          legalChecklist: {
            saleDeed: docSaleDeed,
            sevenTwelve: docSevenTwelve,
            ec: docEc,
            titleReport: docTitleReport,
            poa: docPoa,
            noc: docNoc,
            taxReceipt: docTaxReceipt
          },
          responsibilities: {
            builder: builderResponsibilities,
            landOwner: ownerResponsibilities
          }
        }
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
      setChatPrompt('');
      setProjectId('');
      setLandId('');
      setLandAreaUnit('acres');
      setExpectedRevenue('');
      setTotalSaleableArea('');
      setMinGuarantee('');
      setProfitSharePct('');
      setActualConstructionCost('');
      setUnitsAllocatedList([]);

      // Refresh list
      const updatedJvs = [data.data, ...agreements];
      setAgreements(updatedJvs);
      setSelectedJv(data.data);
      if (data.data?.metadata?.aiComparison) {
        setAiComparison(data.data.metadata.aiComparison);
      } else {
        setAiComparison(null);
      }
      setActiveMainTab('history');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gemini JV evaluation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMilestone = async (milestoneId) => {
    if (!selectedJv) return;
    const metadata = selectedJv.metadata || {};
    const milestones = metadata.milestones || [];
    const updatedMilestones = milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: m.status === 'Completed' ? 'Pending' : 'Completed',
          actualDate: m.status === 'Completed' ? null : new Date().toISOString().split('T')[0]
        };
      }
      return m;
    });

    try {
      toast.info('Updating project milestone status...');
      const response = await aiService.updateJVAgreementLifecycle(selectedJv.id, { milestones: updatedMilestones });
      toast.success('Project milestones updated!');
      const updatedJv = { ...selectedJv, metadata: response.data.data.metadata };
      setSelectedJv(updatedJv);
      setAgreements(agreements.map(a => a.id === selectedJv.id ? updatedJv : a));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update milestone tracking.');
    }
  };

  const handleTogglePayment = async (paymentId) => {
    if (!selectedJv) return;
    const metadata = selectedJv.metadata || {};
    const paymentSchedule = metadata.paymentSchedule || [];
    const updatedPayment = paymentSchedule.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          status: p.status === 'Paid' ? 'Pending' : 'Paid',
          paidDate: p.status === 'Paid' ? null : new Date().toISOString().split('T')[0]
        };
      }
      return p;
    });

    try {
      toast.info('Clearing escrow disbursement milestone installment...');
      const response = await aiService.updateJVAgreementLifecycle(selectedJv.id, { paymentSchedule: updatedPayment });
      toast.success('Disbursement waterfall updated!');
      const updatedJv = { ...selectedJv, metadata: response.data.data.metadata };
      setSelectedJv(updatedJv);
      setAgreements(agreements.map(a => a.id === selectedJv.id ? updatedJv : a));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update installment payment status.');
    }
  };

  const handleToggleLegalCheck = async (key) => {
    if (!selectedJv) return;
    const metadata = selectedJv.metadata || {};
    const legalChecklist = metadata.legalChecklist || {};
    const updatedChecklist = {
      ...legalChecklist,
      [key]: !legalChecklist[key]
    };

    try {
      toast.info('Saving audit checklist changes...');
      const response = await aiService.updateJVAgreementLifecycle(selectedJv.id, { legalChecklist: updatedChecklist });
      toast.success('Legal checkoff status updated!');
      const updatedJv = { ...selectedJv, metadata: response.data.data.metadata };
      setSelectedJv(updatedJv);
      setAgreements(agreements.map(a => a.id === selectedJv.id ? updatedJv : a));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update deed checks.');
    }
  };

  const handleLoadAmendment = () => {
    if (!selectedJv) return;
    const metadata = selectedJv.metadata || {};
    
    // Load state
    setProjectName(selectedJv.projectName || '');
    setProjectId(selectedJv.projectId || '');
    setLandId(selectedJv.landId || '');
    setLandOwnerName(selectedJv.landOwnerName || '');
    setBuilderName(selectedJv.builderName || '');
    setInvestorName(selectedJv.investorName || '');
    setLandValue(selectedJv.landValue ? String(selectedJv.landValue) : '');
    setConstructionCost(selectedJv.constructionCost ? String(selectedJv.constructionCost) : '');
    setInvestorFunds(selectedJv.investorFunds ? String(selectedJv.investorFunds) : '');
    setLandOwnerTerms(selectedJv.landOwnerTerms || '');
    setBuilderTerms(selectedJv.builderTerms || '');
    setInvestorTerms(selectedJv.investorTerms || '');
    setTermSheet(selectedJv.termSheet || null);

    setJvType(metadata.basicDetails?.jvType || 'Revenue Share');
    setJvStatus(metadata.basicDetails?.status || 'Active');
    setStartDate(metadata.basicDetails?.startDate || '');
    setEndDate(metadata.basicDetails?.endDate || '');
    setDescription(metadata.basicDetails?.description || '');
    setReraNumber(metadata.basicDetails?.reraNumber || '');

    setSurveyNumber(metadata.landDetails?.surveyNumber || '');
    setVillage(metadata.landDetails?.village || '');
    setDistrict(metadata.landDetails?.district || '');
    setStateName(metadata.landDetails?.state || '');
    setLandArea(metadata.landDetails?.landArea ? String(metadata.landDetails.landArea) : '');
    setLandAreaUnit(metadata.landDetails?.landAreaUnit || 'sqft');
    setZoning(metadata.landDetails?.zoning || 'Residential');
    setFsi(metadata.landDetails?.fsi ? String(metadata.landDetails.fsi) : '');

    if (metadata.landOwnerDetails) {
      setLandowners(metadata.landOwnerDetails.map(o => ({
        name: o.name || '',
        share: o.ownershipPercentage ? String(o.ownershipPercentage) : '100',
        mobile: o.mobile || '',
        email: o.email || '',
        pan: o.pan || '',
        aadhaar: o.aadhaar || '',
        address: o.address || '',
        bank: o.bankDetails || ''
      })));
    }

    setBuilderContact(metadata.builderDetails?.contactPerson || '');
    setBuilderMobile(metadata.builderDetails?.mobile || '');
    setBuilderEmail(metadata.builderDetails?.email || '');
    setBuilderExperience(metadata.builderDetails?.experience ? String(metadata.builderDetails.experience) : '');
    setBuilderCompleted(metadata.builderDetails?.completedProjects ? String(metadata.builderDetails.completedProjects) : '');
    setBuilderRating(metadata.builderDetails?.creditRating || '');
    setBuilderCapacity(metadata.builderDetails?.financialCapacity ? String(metadata.builderDetails.financialCapacity) : '');

    setInvestorRoi(metadata.investorDetails?.expectedRoi ? String(metadata.investorDetails.expectedRoi) : '');
    setInvestorType(metadata.investorDetails?.investmentType || '');
    setInvestorExit(metadata.investorDetails?.exitTimeline ? String(metadata.investorDetails.exitTimeline) : '');

    setApprovalCost(metadata.financialDetails?.approvalCost ? String(metadata.financialDetails.approvalCost) : '');
    setMarketingCost(metadata.financialDetails?.marketingCost ? String(metadata.financialDetails.marketingCost) : '');
    setMiscCost(metadata.financialDetails?.miscellaneousCost ? String(metadata.financialDetails.miscellaneousCost) : '');
    setEscrowBank(metadata.financialDetails?.escrowBankName || '');
    setEscrowAccount(metadata.financialDetails?.escrowAccountNumber || '');
    setExpectedRevenue(metadata.financialDetails?.expectedRevenue ? String(metadata.financialDetails.expectedRevenue) : '');
    setTotalSaleableArea(metadata.financialDetails?.totalSaleableArea ? String(metadata.financialDetails.totalSaleableArea) : '');
    setMinGuarantee(metadata.financialDetails?.minGuarantee ? String(metadata.financialDetails.minGuarantee) : '');
    setProfitSharePct(metadata.financialDetails?.profitSharePct ? String(metadata.financialDetails.profitSharePct) : '');
    setActualConstructionCost(metadata.financialDetails?.actualConstructionCost ? String(metadata.financialDetails.actualConstructionCost) : '');
    setUnitsAllocatedList(metadata.financialDetails?.unitsAllocatedList || []);

    setBuilderSharePct(metadata.revenueSharingDetails?.builderShare ? String(metadata.revenueSharingDetails.builderShare) : '');
    setOwnerSharePct(metadata.revenueSharingDetails?.landOwnerShare ? String(metadata.revenueSharingDetails.landOwnerShare) : '');
    setInvestorSharePct(metadata.revenueSharingDetails?.investorShare ? String(metadata.revenueSharingDetails.investorShare) : '');
    setDistributionType(metadata.revenueSharingDetails?.profitDistributionType || 'Revenue Share');
    setPaymentFrequency(metadata.revenueSharingDetails?.paymentFrequency || 'Quarterly');
    setOwnerAllocatedUnits(metadata.revenueSharingDetails?.ownerAllocatedUnits || '');
    setBuilderAllocatedUnits(metadata.revenueSharingDetails?.builderAllocatedUnits || '');

    if (metadata.responsibilities?.builder) setBuilderResponsibilities(metadata.responsibilities.builder);
    if (metadata.responsibilities?.landOwner) setOwnerResponsibilities(metadata.responsibilities.landOwner);

    setAgreementNumber(metadata.agreementDetails?.agreementNumber || '');
    setAgreementDate(metadata.agreementDetails?.agreementDate || '');
    setValidTill(metadata.agreementDetails?.validTill || '');
    setStampPayer(metadata.agreementDetails?.stampDutyPayer || '');
    setStampAmount(metadata.agreementDetails?.stampDutyAmount ? String(metadata.agreementDetails.stampDutyAmount) : '');
    setArbitrationSeat(metadata.agreementDetails?.arbitrationSeat || '');
    setGoverningJurisdiction(metadata.agreementDetails?.governingJurisdiction || '');

    setDocSaleDeed(metadata.legalChecklist?.saleDeed || false);
    setDocSevenTwelve(metadata.legalChecklist?.sevenTwelve || false);
    setDocEc(metadata.legalChecklist?.ec || false);
    setDocTitleReport(metadata.legalChecklist?.titleReport || false);
    setDocPoa(metadata.legalChecklist?.poa || false);
    setDocNoc(metadata.legalChecklist?.noc || false);
    setDocTaxReceipt(metadata.legalChecklist?.taxReceipt || false);

    // Switch view back to editor calculate tab
    setActiveMainTab('calculate');
    setFormTab('shares'); // Direct them straight to the commercial shares tab!
    toast.success('Loaded agreement parameters into editor! Tweak any values and run AI analysis again.');
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
        {/* Top-Level Navigation Tabs */}
        <div className="premium-tabs-container" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveMainTab('calculate')}
            className={`premium-tab-btn ${activeMainTab === 'calculate' ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeMainTab === 'calculate' ? '#059669' : 'transparent',
              color: activeMainTab === 'calculate' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FolderPlus size={16} />
            Structure New JV Deal
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            className={`premium-tab-btn ${activeMainTab === 'history' ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeMainTab === 'history' ? '#059669' : 'transparent',
              color: activeMainTab === 'history' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <History size={16} />
            JV History & Analytics
          </button>
        </div>

        {activeMainTab === 'calculate' && (
          <div className="ai-card w-full">
          <div className="ai-card-header">
            <h2 className="ai-card-title">
              <Plus size={18} />
              Calculate New JV Deal
            </h2>
          </div>
          <div className="ai-card-body" style={{ marginTop: '1rem' }}>
            {/* Sub-tabs header for create form */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '4px', overflowX: 'auto', background: '#f8fafc', padding: '6px', borderRadius: '8px' }}>
              {[
                { id: 'model', label: '1. Select JV Model', icon: <Sliders size={14} /> },
                { id: 'basic', label: '2. Basic & Land', icon: <Building size={14} /> },
                { id: 'partners', label: '3. Partner Details', icon: <Handshake size={14} /> },
                { id: 'shares', label: '4. Shares & Ledger', icon: <Coins size={14} /> },
                { id: 'legality', label: '5. Escrow & Agreement', icon: <Scale size={14} /> },
                { id: 'advisory', label: '6. AI Analysis & Submit', icon: <Sparkles size={14} /> }
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

              {/* Form Tab 0: Select JV Model */}
              {formTab === 'model' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ textSelf: 'center', textAlign: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Select Your Joint Venture (JV) Partnership Model</h3>
                    <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Choose the business scenario that matches your legal and financial structure.</p>
                  </div>

                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {[
                      {
                        type: 'Revenue Share',
                        title: 'Revenue Sharing JV',
                        desc: 'Landowner provides land, Builder develops the property. Sales revenue is split based on a percentage agreement.',
                        metrics: 'Best When: Strong sales market & high valuation',
                        badge: 'Popular'
                      },
                      {
                        type: 'Area Share',
                        title: 'Area / Built-Up Sharing JV',
                        desc: 'Landowner receives a fixed percentage of physical developed area/units. Ideal for holding property assets.',
                        metrics: 'Best When: Landowner wants property instead of cash',
                        badge: 'Asset-Heavy'
                      },
                      {
                        type: 'Profit Share',
                        title: 'Profit Sharing JV',
                        desc: 'Parties divide the actual project profit after deduction of construction and municipal approval costs.',
                        metrics: 'Best When: Both parties want to share budget risks',
                        badge: 'Balanced Risk'
                      },
                      {
                        type: 'Hybrid',
                        title: 'Hybrid JV (Guarantee + Upside)',
                        desc: 'Landowner gets a fixed minimum guarantee plus a smaller percentage of project profits.',
                        metrics: 'Best When: Landowner wants guaranteed protection',
                        badge: 'Low Downside'
                      }
                    ].map((model) => (
                      <div
                        key={model.type}
                        onClick={() => {
                          setJvType(model.type);
                          setDistributionType(model.type);
                          setFormTab('basic');
                        }}
                        style={{
                          border: jvType === model.type ? '2px solid #059669' : '1px solid #e2e8f0',
                          background: jvType === model.type ? 'rgba(5, 150, 105, 0.02)' : '#ffffff',
                          borderRadius: '12px',
                          padding: '20px',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.25s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                        className="premium-section-card"
                      >
                        {model.badge && (
                          <span style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            background: jvType === model.type ? '#059669' : '#f1f5f9',
                            color: jvType === model.type ? '#ffffff' : '#64748b'
                          }}>
                            {model.badge}
                          </span>
                        )}
                        <h4 style={{ fontSize: '13px', fontWeight: '700', color: jvType === model.type ? '#059669' : '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Handshake size={14} />
                          {model.title}
                        </h4>
                        <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>{model.desc}</p>
                        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '9.5px', fontWeight: '600', color: '#059669' }}>
                          {model.metrics}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormTab('basic')}>Next: Basic & Land Details →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 1: Basic & Land Info */}
              {formTab === 'basic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Lookup selectors */}
                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
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
                      <label className="ai-label">Link Land Plot (Auto-fills location & value)</label>
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
                  </div>

                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">JV Project Name *</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="e.g. Riverside Residences JV"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">RERA Registration Number</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="e.g. PRN99887766"
                        value={reraNumber}
                        onChange={(e) => setReraNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Active JV Model</label>
                      <input
                        type="text"
                        className="ai-input"
                        style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#059669' }}
                        value={jvType}
                        readOnly
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">JV Status</label>
                      <select className="ai-input" value={jvStatus} onChange={(e) => setJvStatus(e.target.value)}>
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Zoning Classification</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="e.g. Residential (Mixed-Use)"
                        value={zoning}
                        onChange={(e) => setZoning(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Start Date</label>
                      <input
                        type="date"
                        className="ai-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Expected End Date</label>
                      <input
                        type="date"
                        className="ai-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">FSI (Floor Space Index)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="ai-input"
                        placeholder="e.g. 2.5"
                        value={fsi}
                        onChange={(e) => setFsi(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Survey Number</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="e.g. SUR-549/2"
                        value={surveyNumber}
                        onChange={(e) => setSurveyNumber(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">Village / Locality</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="e.g. Hinjewadi"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                      />
                    </div>
                    <div className="ai-form-group">
                      <label className="ai-label">District & State</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="District"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                        />
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="State"
                          value={stateName}
                          onChange={(e) => setStateName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    <div className="ai-form-group">
                      <label className="ai-label">Land Area</label>
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
                          value={landArea}
                          onChange={(e) => setLandArea(e.target.value)}
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
                          value={landAreaUnit}
                          onChange={(e) => {
                            const oldUnit = landAreaUnit;
                            const newUnit = e.target.value;
                            setLandAreaUnit(newUnit);
                            if (landArea) {
                              setLandArea(convertValue(landArea, oldUnit, newUnit, AREA_UNITS));
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
                      <label className="ai-label">JV Project Description</label>
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="Brief project outline description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('partners')}>Next: Partner Details →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 2: Partner Details */}
              {formTab === 'partners' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Landowner Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', color: '#1e293b' }}>👤 Land Owner / Partners Particulars</h3>
                      <button
                        type="button"
                        onClick={() => setLandowners(prev => [...prev, { name: '', share: '', mobile: '', email: '', pan: '', aadhaar: '', address: '', bank: '' }])}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '6px', background: '#059669', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                      >
                        ➕ Add Another Partner
                      </button>
                    </div>

                    {landowners.map((owner, index) => (
                      <div key={index} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#fafafa', position: 'relative' }}>
                        {landowners.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLandowners(prev => prev.filter((_, idx) => idx !== index))}
                            style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'transparent', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            ❌ Remove
                          </button>
                        )}
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>PARTNER #{index + 1} SPECIFICATIONS</span>

                        <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '12px', gap: '16px' }}>
                          <div className="ai-form-group">
                            <label className="ai-label">Partner Name *</label>
                            <input
                              type="text"
                              className="ai-input"
                              placeholder="e.g. Anil Kapoor"
                              value={owner.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLandowners(prev => prev.map((o, idx) => idx === index ? { ...o, name: val } : o));
                              }}
                            />
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Mobile & Email</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                className="ai-input"
                                placeholder="Mobile"
                                value={owner.mobile}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLandowners(prev => prev.map((o, idx) => idx === index ? { ...o, mobile: val } : o));
                                }}
                              />
                              <input
                                type="email"
                                className="ai-input"
                                placeholder="Email"
                                value={owner.email}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLandowners(prev => prev.map((o, idx) => idx === index ? { ...o, email: val } : o));
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '12px', gap: '16px' }}>
                          <div className="ai-form-group">
                            <label className="ai-label">PAN Number</label>
                            <input
                              type="text"
                              className="ai-input"
                              placeholder="PAN Code"
                              value={owner.pan}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLandowners(prev => prev.map((o, idx) => idx === index ? { ...o, pan: val } : o));
                              }}
                            />
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Aadhaar Number</label>
                            <input
                              type="text"
                              className="ai-input"
                              placeholder="Aadhaar Card"
                              value={owner.aadhaar}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLandowners(prev => prev.map((o, idx) => idx === index ? { ...o, aadhaar: val } : o));
                              }}
                            />
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Land Title Ownership Share (%)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 100"
                              value={owner.share}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLandowners(prev => prev.map((o, idx) => idx === index ? { ...o, share: val } : o));
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                          <div className="ai-form-group">
                            <label className="ai-label">Registered Address</label>
                            <input
                              type="text"
                              className="ai-input"
                              placeholder="Owner full residential address"
                              value={owner.address}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLandowners(prev => prev.map((o, idx) => idx === index ? { ...o, address: val } : o));
                              }}
                            />
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Disbursement Bank Credentials</label>
                            <input
                              type="text"
                              className="ai-input"
                              placeholder="Bank Name, IFSC & Account Number"
                              value={owner.bank}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLandowners(prev => prev.map((o, idx) => idx === index ? { ...o, bank: val } : o));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Builder Details */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#fafafa' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px 0', textTransform: 'uppercase', color: '#1e293b' }}>🏢 Builder & Developer Particulars</h3>
                    <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '12px' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Builder/Developer Company *</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. Innonsh Builders"
                          value={builderName}
                          onChange={(e) => setBuilderName(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Contact Person & Mobile</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="ai-input"
                            placeholder="Contact Person Name"
                            value={builderContact}
                            onChange={(e) => setBuilderContact(e.target.value)}
                          />
                          <input
                            type="text"
                            className="ai-input"
                            placeholder="Mobile No"
                            value={builderMobile}
                            onChange={(e) => setBuilderMobile(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Contact Email</label>
                        <input
                          type="email"
                          className="ai-input"
                          placeholder="builder@domain.com"
                          value={builderEmail}
                          onChange={(e) => setBuilderEmail(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Experience & Completed Projects</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="number"
                            className="ai-input"
                            placeholder="Exp (Yrs)"
                            value={builderExperience}
                            onChange={(e) => setBuilderExperience(e.target.value)}
                          />
                          <input
                            type="number"
                            className="ai-input"
                            placeholder="Projects"
                            value={builderCompleted}
                            onChange={(e) => setBuilderCompleted(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Credit Rating & Financial Capacity</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="ai-input"
                            placeholder="e.g. A+"
                            value={builderRating}
                            onChange={(e) => setBuilderRating(e.target.value)}
                          />
                          <input
                            type="number"
                            className="ai-input"
                            placeholder="Capacity (INR)"
                            value={builderCapacity}
                            onChange={(e) => setBuilderCapacity(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Third-Party Investor Details */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#fafafa' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px 0', textTransform: 'uppercase', color: '#1e293b' }}>💰 Third-Party Investor Details (Optional)</h3>
                    <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '12px' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Investor Name</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. Apex Venture Capital"
                          value={investorName}
                          onChange={(e) => setInvestorName(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Investor Funds / Equity Size (INR)</label>
                        <input
                          type="number"
                          className="ai-input"
                          placeholder="e.g. 30000000"
                          value={investorFunds}
                          onChange={(e) => setInvestorFunds(e.target.value)}
                        />
                        {renderCostHelper(investorFunds)}
                      </div>
                    </div>

                    <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Expected ROI / IRR (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="ai-input"
                          placeholder="e.g. 18.0"
                          value={investorRoi}
                          onChange={(e) => setInvestorRoi(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Investment Type</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. Equity, Debt, Mezzanine"
                          value={investorType}
                          onChange={(e) => setInvestorType(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Exit Timeline (Months)</label>
                        <input
                          type="number"
                          className="ai-input"
                          placeholder="e.g. 24"
                          value={investorExit}
                          onChange={(e) => setInvestorExit(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('basic')}>← Back</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('shares')}>Next: Shares & Investor →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 3: Shares & Investor */}
              {formTab === 'shares' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Model Heading */}
                  <div style={{ padding: '12px 16px', background: 'rgba(5, 150, 105, 0.05)', borderRadius: '8px', borderLeft: '4px solid #059669', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active JV Partnership Model</span>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: '2px 0 0 0' }}>
                        {jvType === 'Revenue Share' && '📈 Revenue Sharing JV'}
                        {jvType === 'Area Share' && '🏢 Area / Built-up Sharing JV'}
                        {jvType === 'Profit Share' && '⚖️ Profit Sharing JV'}
                        {jvType === 'Hybrid' && '💎 Hybrid JV (Guarantee + Share)'}
                      </h4>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={() => setFormTab('model')}>Change Model</button>
                  </div>

                  {/* ── CORE PROJECT FINANCIALS (Always Visible — Gap Fix 1, 3, 4) ── */}
                  <div style={{ border: '1px solid #dbeafe', padding: '16px', borderRadius: '10px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px' }}>🏗️</span>
                      <h3 style={{ fontSize: '11px', fontWeight: '700', margin: '0', textTransform: 'uppercase', color: '#1e40af', letterSpacing: '0.05em' }}>Core Project Financials</h3>
                      <span style={{ fontSize: '9px', background: '#dbeafe', color: '#1e40af', padding: '1px 7px', borderRadius: '20px', fontWeight: '600' }}>Required for AI Analysis</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">🏷️ Land Value (₹)</label>
                        <input
                          type="number"
                          className="ai-input"
                          placeholder="e.g. 250000000 (25 Cr)"
                          value={landValue}
                          onChange={(e) => setLandValue(e.target.value)}
                        />
                        {landValue && <span style={{ fontSize: '9px', color: '#059669', fontWeight: '600', marginTop: '3px', display: 'block' }}>≈ ₹{(Number(landValue) / 10000000).toFixed(2)} Crore</span>}
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">🔨 Total Construction Cost (₹)</label>
                        <input
                          type="number"
                          className="ai-input"
                          placeholder="e.g. 700000000 (70 Cr)"
                          value={constructionCost}
                          onChange={(e) => setConstructionCost(e.target.value)}
                        />
                        {constructionCost && <span style={{ fontSize: '9px', color: '#059669', fontWeight: '600', marginTop: '3px', display: 'block' }}>≈ ₹{(Number(constructionCost) / 10000000).toFixed(2)} Crore</span>}
                      </div>
                    </div>
                    {landValue && constructionCost && (
                      <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(5,150,105,0.06)', borderRadius: '6px', fontSize: '10.5px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <span>📌 <strong>Total Capital Deployed:</strong> ₹{((Number(landValue) + Number(constructionCost)) / 10000000).toFixed(2)} Cr</span>
                        <span>🏷️ Land = <strong>{((Number(landValue) / (Number(landValue) + Number(constructionCost))) * 100).toFixed(1)}%</strong> of total</span>
                        <span>🔨 Construction = <strong>{((Number(constructionCost) / (Number(landValue) + Number(constructionCost))) * 100).toFixed(1)}%</strong> of total</span>
                      </div>
                    )}
                  </div>


                  {/* ────────────────── MODEL 1: REVENUE SHARING ────────────────── */}
                  {jvType === 'Revenue Share' && (
                    <div style={{ border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>📈 Revenue Split Configuration</h3>
                      <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div className="ai-form-group">
                          <label className="ai-label">Expected Sales Revenue (₹)</label>
                          <input
                            type="number"
                            className="ai-input"
                            placeholder="e.g. 1500000000 (150 Cr)"
                            value={expectedRevenue}
                            onChange={(e) => setExpectedRevenue(e.target.value)}
                          />
                          {renderCostHelper(expectedRevenue)}
                        </div>
                        <div className="ai-form-group">
                          <label className="ai-label">Landowner Split (%)</label>
                          <input
                            type="number"
                            className="ai-input"
                            placeholder="e.g. 35"
                            min="0" max="100"
                            value={ownerSharePct}
                            onChange={(e) => {
                              const v = e.target.value;
                              setOwnerSharePct(v);
                              if (v !== '' && !isNaN(v)) setBuilderSharePct(String(Math.max(0, 100 - Number(v))));
                            }}
                          />
                        </div>
                        <div className="ai-form-group">
                          <label className="ai-label">Builder Split (%)</label>
                          <input
                            type="number"
                            className="ai-input"
                            placeholder="e.g. 65"
                            min="0" max="100"
                            value={builderSharePct}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBuilderSharePct(v);
                              if (v !== '' && !isNaN(v)) setOwnerSharePct(String(Math.max(0, 100 - Number(v))));
                            }}
                          />
                        </div>
                      </div>
                      {/* Split Validation Warning */}
                      {ownerSharePct && builderSharePct && Math.abs((Number(ownerSharePct) + Number(builderSharePct)) - 100) > 0.01 && (
                        <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '10.5px', color: '#b91c1c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⚠️ Splits must add up to 100%. Current total: {(Number(ownerSharePct) + Number(builderSharePct)).toFixed(1)}%
                        </div>
                      )}
                      {ownerSharePct && builderSharePct && Math.abs((Number(ownerSharePct) + Number(builderSharePct)) - 100) <= 0.01 && (
                        <div style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '10px', color: '#15803d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ✅ Splits total 100% — Valid
                        </div>
                      )}

                      {expectedRevenue && ownerSharePct && builderSharePct && (
                        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11.5px', marginTop: '10px' }}>
                          <span style={{ fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>💰 Estimated Sharing Payout:</span>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Landowner Share ({ownerSharePct}%):</span>
                            <strong style={{ color: '#059669' }}>₹{((Number(expectedRevenue) * Number(ownerSharePct)) / 100).toLocaleString('en-IN')}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Builder Share ({builderSharePct}%):</span>
                            <strong style={{ color: '#1e293b' }}>₹{((Number(expectedRevenue) * Number(builderSharePct)) / 100).toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────── MODEL 2: AREA SHARING ────────────────── */}
                  {jvType === 'Area Share' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>🏢 Developed Area Split Configuration</h3>
                        <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                          <div className="ai-form-group">
                            <label className="ai-label">Total Saleable Area (sq.ft.)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 200000"
                              value={totalSaleableArea}
                              onChange={(e) => setTotalSaleableArea(e.target.value)}
                            />
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Landowner Split (%)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 40"
                              min="0" max="100"
                              value={ownerSharePct}
                              onChange={(e) => {
                                const v = e.target.value;
                                setOwnerSharePct(v);
                                if (v !== '' && !isNaN(v)) setBuilderSharePct(String(Math.max(0, 100 - Number(v))));
                              }}
                            />
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Builder Split (%)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 60"
                              min="0" max="100"
                              value={builderSharePct}
                              onChange={(e) => {
                                const v = e.target.value;
                                setBuilderSharePct(v);
                                if (v !== '' && !isNaN(v)) setOwnerSharePct(String(Math.max(0, 100 - Number(v))));
                              }}
                            />
                          </div>
                        </div>
                        {/* Split Validation Warning */}
                        {ownerSharePct && builderSharePct && Math.abs((Number(ownerSharePct) + Number(builderSharePct)) - 100) > 0.01 && (
                          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '10.5px', color: '#b91c1c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⚠️ Splits must add up to 100%. Current total: {(Number(ownerSharePct) + Number(builderSharePct)).toFixed(1)}%
                          </div>
                        )}
                        {ownerSharePct && builderSharePct && Math.abs((Number(ownerSharePct) + Number(builderSharePct)) - 100) <= 0.01 && (
                          <div style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '10px', color: '#15803d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✅ Splits total 100% — Valid
                          </div>
                        )}

                        {totalSaleableArea && ownerSharePct && builderSharePct && (
                          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11.5px', marginTop: '10px' }}>
                            <span style={{ fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>📐 Developed Area Allocation:</span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span>Landowner Area ({ownerSharePct}%):</span>
                              <strong style={{ color: '#059669' }}>{((Number(totalSaleableArea) * Number(ownerSharePct)) / 100).toLocaleString()} sq.ft.</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Builder Area ({builderSharePct}%):</span>
                              <strong style={{ color: '#1e293b' }}>{((Number(totalSaleableArea) * Number(builderSharePct)) / 100).toLocaleString()} sq.ft.</strong>
                            </div>
                          </div>
                        )}
                      </div>

                       {/* GAP 5: Tower / Floor Configuration Panel */}
                       <div style={{ border: '1px solid #e0f2fe', padding: '14px 16px', borderRadius: '10px', background: 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                           <div>
                             <h3 style={{ fontSize: '11px', fontWeight: '700', margin: '0', textTransform: 'uppercase', color: '#0369a1' }}>🏗️ Tower / Floor Unit Configuration</h3>
                             <p style={{ fontSize: '9.5px', color: '#64748b', margin: '2px 0 0 0' }}>Enter your tower/floor layout. Click "Generate Units" to auto-populate the ledger.</p>
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                               const towers = Math.max(1, parseInt(numTowers) || 1);
                               const floors = Math.max(1, parseInt(numFloors) || 1);
                               const perFloor = Math.max(1, parseInt(numUnitsPerFloor) || 1);
                               const generated = [];
                               for (let t = 1; t <= towers; t++) {
                                 for (let f = 1; f <= floors; f++) {
                                   for (let u = 1; u <= perFloor; u++) {
                                     generated.push({ unitNo: `T${t}-F${f}-U${String(u).padStart(2,'0')}`, owner: 'Builder' });
                                   }
                                 }
                               }
                               setUnitsAllocatedList(generated);
                               setOwnerAllocatedUnits('');
                               setBuilderAllocatedUnits('');
                               toast.success(`Generated ${generated.length} units across ${towers} Tower(s), ${floors} Floor(s).`);
                             }}
                             className="btn btn-secondary btn-sm"
                             style={{ padding: '6px 12px', fontSize: '10.5px', background: '#0369a1', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                           >
                             <FolderPlus size={12} />
                             Generate Units
                           </button>
                         </div>
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                           <div className="ai-form-group">
                             <label className="ai-label">No. of Towers</label>
                             <input type="number" className="ai-input" min="1" max="20" placeholder="e.g. 2" value={numTowers} onChange={(e) => setNumTowers(e.target.value)} />
                           </div>
                           <div className="ai-form-group">
                             <label className="ai-label">Floors per Tower</label>
                             <input type="number" className="ai-input" min="1" max="50" placeholder="e.g. 8" value={numFloors} onChange={(e) => setNumFloors(e.target.value)} />
                           </div>
                           <div className="ai-form-group">
                             <label className="ai-label">Units per Floor</label>
                             <input type="number" className="ai-input" min="1" max="20" placeholder="e.g. 4" value={numUnitsPerFloor} onChange={(e) => setNumUnitsPerFloor(e.target.value)} />
                           </div>
                           <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '2px' }}>
                             <div style={{ fontSize: '10px', color: '#475569', background: '#f1f5f9', padding: '8px 10px', borderRadius: '6px' }}>
                               📦 Total Units: <strong style={{ color: '#0369a1' }}>{(parseInt(numTowers)||1) * (parseInt(numFloors)||1) * (parseInt(numUnitsPerFloor)||1)}</strong>
                             </div>
                           </div>
                         </div>
                       </div>

                      {/* Interactive Unit Allocation Ledger */}
                      <div style={{ border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <h3 style={{ fontSize: '11.5px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', color: '#1e293b' }}>📋 Unit Allocation Ledger</h3>
                            <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>Assign specific inventory units to partners. Click a unit to toggle its allocation.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!ownerSharePct) {
                                toast.warning('Please enter Land Owner Allocation % first');
                                return;
                              }
                              const landownerPercentage = Number(ownerSharePct);
                              const totalUnitsCount = unitsAllocatedList.length;
                              const landownerUnitsCount = Math.round((landownerPercentage / 100) * totalUnitsCount);

                              const updated = unitsAllocatedList.map((unit, idx) => ({
                                ...unit,
                                owner: idx < landownerUnitsCount ? 'Landowner' : 'Builder'
                              }));
                              setUnitsAllocatedList(updated);
                              
                              const ownerUnitsText = updated.filter(u => u.owner === 'Landowner').map(u => u.unitNo).join(', ');
                              const builderUnitsText = updated.filter(u => u.owner === 'Builder').map(u => u.unitNo).join(', ');
                              setOwnerAllocatedUnits(ownerUnitsText);
                              setBuilderAllocatedUnits(builderUnitsText);

                              toast.success(`Allocated ${landownerUnitsCount} units to Landowner and ${totalUnitsCount - landownerUnitsCount} units to Builder.`);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 12px', fontSize: '10.5px', background: '#1b5e4f', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', border: 'none' }}
                          >
                            <Sliders size={12} />
                            Auto-Allocate Units ({ownerSharePct || 0}%)
                          </button>
                        </div>

                        {/* Visual Ledger Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))',
                          gap: '8px',
                          background: '#f8fafc',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #f1f5f9',
                          maxHeight: '180px',
                          overflowY: 'auto'
                        }}>
                          {unitsAllocatedList.map((unit, idx) => (
                            <div
                              key={unit.unitNo}
                              onClick={() => {
                                const updated = [...unitsAllocatedList];
                                updated[idx].owner = updated[idx].owner === 'Landowner' ? 'Builder' : 'Landowner';
                                setUnitsAllocatedList(updated);

                                const ownerUnitsText = updated.filter(u => u.owner === 'Landowner').map(u => u.unitNo).join(', ');
                                const builderUnitsText = updated.filter(u => u.owner === 'Builder').map(u => u.unitNo).join(', ');
                                setOwnerAllocatedUnits(ownerUnitsText);
                                setBuilderAllocatedUnits(builderUnitsText);
                              }}
                              style={{
                                padding: '6px 4px',
                                border: '1px solid',
                                borderColor: unit.owner === 'Landowner' ? '#059669' : '#3b82f6',
                                background: unit.owner === 'Landowner' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                                color: unit.owner === 'Landowner' ? '#047857' : '#1d4ed8',
                                borderRadius: '6px',
                                textAlign: 'center',
                                fontSize: '10px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                              }}
                            >
                              <span>{unit.unitNo}</span>
                              <span style={{ fontSize: '7.5px', textTransform: 'uppercase', opacity: 0.8 }}>
                                {unit.owner === 'Landowner' ? 'Owner' : 'Builder'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Hidden Text Fields kept for backend compatibility */}
                        <div style={{ display: 'none' }}>
                          <input type="hidden" value={ownerAllocatedUnits} />
                          <input type="hidden" value={builderAllocatedUnits} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ────────────────── MODEL 3: PROFIT SHARING ────────────────── */}
                  {jvType === 'Profit Share' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>⚖️ Profit Sharing Configuration</h3>
                        <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                          <div className="ai-form-group">
                            <label className="ai-label">Expected Revenue (₹)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 2200000000 (220 Cr)"
                              value={expectedRevenue}
                              onChange={(e) => setExpectedRevenue(e.target.value)}
                            />
                            {renderCostHelper(expectedRevenue)}
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Construction Cost (₹)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 1600000000 (160 Cr)"
                              value={constructionCost}
                              onChange={(e) => setConstructionCost(e.target.value)}
                            />
                            {renderCostHelper(constructionCost)}
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Approval Cost (₹)</label>
                            <input type="number" className="ai-input" placeholder="e.g. 20000000 (2 Cr)" value={approvalCost} onChange={(e) => setApprovalCost(e.target.value)} />
                            {renderCostHelper(approvalCost)}
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Marketing Cost (₹)</label>
                            <input type="number" className="ai-input" placeholder="e.g. 30000000 (3 Cr)" value={marketingCost} onChange={(e) => setMarketingCost(e.target.value)} />
                            {renderCostHelper(marketingCost)}
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Misc / Other Cost (₹)</label>
                            <input type="number" className="ai-input" placeholder="e.g. 10000000 (1 Cr)" value={miscCost} onChange={(e) => setMiscCost(e.target.value)} />
                            {renderCostHelper(miscCost)}
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Net Profit (₹) — Auto</label>
                            <input
                              type="text"
                              className="ai-input"
                              style={{ background: '#f1f5f9', fontWeight: 'bold', color: (() => { const p = Number(expectedRevenue) - Number(constructionCost) - Number(approvalCost||0) - Number(marketingCost||0) - Number(miscCost||0); return p >= 0 ? '#059669' : '#dc2626'; })() }}
                              value={(() => {
                                const netProfit = Number(expectedRevenue||0) - Number(constructionCost||0) - Number(approvalCost||0) - Number(marketingCost||0) - Number(miscCost||0);
                                return expectedRevenue || constructionCost ? `₹${netProfit.toLocaleString('en-IN')}` : '₹0';
                              })()}
                              readOnly
                            />
                            {expectedRevenue && constructionCost && (
                              <span style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                                Rev − (Const + Approvals + Mktg + Misc)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginTop: '4px' }}>
                          <div className="ai-form-group">
                            <label className="ai-label">Landowner Profit Share (%)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 40"
                              min="0" max="100"
                              value={ownerSharePct}
                              onChange={(e) => {
                                const v = e.target.value;
                                setOwnerSharePct(v);
                                if (v !== '' && !isNaN(v)) setBuilderSharePct(String(Math.max(0, 100 - Number(v))));
                              }}
                            />
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Builder Profit Share (%)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 60"
                              min="0" max="100"
                              value={builderSharePct}
                              onChange={(e) => {
                                const v = e.target.value;
                                setBuilderSharePct(v);
                                if (v !== '' && !isNaN(v)) setOwnerSharePct(String(Math.max(0, 100 - Number(v))));
                              }}
                            />
                          </div>
                        </div>
                        {/* Split Validation Warning */}
                        {ownerSharePct && builderSharePct && Math.abs((Number(ownerSharePct) + Number(builderSharePct)) - 100) > 0.01 && (
                          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '10.5px', color: '#b91c1c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⚠️ Splits must add up to 100%. Current total: {(Number(ownerSharePct) + Number(builderSharePct)).toFixed(1)}%
                          </div>
                        )}
                        {ownerSharePct && builderSharePct && Math.abs((Number(ownerSharePct) + Number(builderSharePct)) - 100) <= 0.01 && (
                          <div style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '10px', color: '#15803d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✅ Splits total 100% — Valid
                          </div>
                        )}
                      </div>

                      {/* Cost Overrun Recalculator Panel */}
                      <div style={{ border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <h3 style={{ fontSize: '11.5px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', color: '#1e293b' }}>🔄 Dynamic Cost Overrun Recalculator</h3>
                          <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>Simulate budget increases and see how the net profits redistribute dynamically.</p>
                        </div>

                        <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                          <div className="ai-form-group">
                            <label className="ai-label">Actual Construction Cost (₹)</label>
                            <input
                              type="number"
                              className="ai-input"
                              style={{ borderColor: actualConstructionCost && Number(actualConstructionCost) > Number(constructionCost) ? '#ef4444' : '#059669' }}
                              placeholder="Simulate budget overrun, e.g. 1750000000"
                              value={actualConstructionCost}
                              onChange={(e) => setActualConstructionCost(e.target.value)}
                            />
                            {renderCostHelper(actualConstructionCost)}
                            {actualConstructionCost && Number(actualConstructionCost) > Number(constructionCost) && (
                              <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: '600', marginTop: '4px', display: 'block' }}>
                                ⚠️ Cost overrun detected: +{(((Number(actualConstructionCost) - Number(constructionCost)) / Number(constructionCost)) * 100).toFixed(1)}% above budget
                              </span>
                            )}
                          </div>

                          {expectedRevenue && constructionCost && ownerSharePct && builderSharePct && (
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                              <table style={{ width: '100%', minWidth: '0', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ textAlign: 'left', paddingBottom: '4px', fontSize: '9.5px', color: '#64748b' }}>Party</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '4px', fontSize: '9.5px', color: '#64748b' }}>Est. Share</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '4px', fontSize: '9.5px', color: '#64748b' }}>Actual Share</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const estProfit = Number(expectedRevenue) - Number(constructionCost);
                                    const actCost = actualConstructionCost ? Number(actualConstructionCost) : Number(constructionCost);
                                    const actProfit = Number(expectedRevenue) - actCost;
                                    return (
                                      <>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '6px 0', fontWeight: '600' }}>Landowner ({ownerSharePct}%)</td>
                                          <td style={{ textAlign: 'right', color: '#64748b' }}>₹{((estProfit * Number(ownerSharePct)) / 100).toLocaleString('en-IN')}</td>
                                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>₹{((actProfit * Number(ownerSharePct)) / 100).toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr>
                                          <td style={{ padding: '6px 0', fontWeight: '600' }}>Builder ({builderSharePct}%)</td>
                                          <td style={{ textAlign: 'right', color: '#64748b' }}>₹{((estProfit * Number(builderSharePct)) / 100).toLocaleString('en-IN')}</td>
                                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>₹{((actProfit * Number(builderSharePct)) / 100).toLocaleString('en-IN')}</td>
                                        </tr>
                                      </>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ────────────────── MODEL 4: HYBRID JV ────────────────── */}
                  {jvType === 'Hybrid' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>💎 Hybrid Splits & Guarantee Configuration</h3>
                        <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                          <div className="ai-form-group">
                            <label className="ai-label">Minimum Guarantee to Owner (₹)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 200000000 (20 Cr)"
                              value={minGuarantee}
                              onChange={(e) => setMinGuarantee(e.target.value)}
                            />
                            {renderCostHelper(minGuarantee)}
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Owner Profit Share Upside (%)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 20"
                              min="0" max="100"
                              value={ownerSharePct}
                              onChange={(e) => {
                                const v = e.target.value;
                                setOwnerSharePct(v);
                                if (v !== '' && !isNaN(v)) setBuilderSharePct(String(Math.max(0, 100 - Number(v))));
                              }}
                            />
                          </div>
                          <div className="ai-form-group">
                            <label className="ai-label">Builder Profit Share Split (%)</label>
                            <input
                              type="number"
                              className="ai-input"
                              placeholder="e.g. 80"
                              min="0" max="100"
                              value={builderSharePct}
                              onChange={(e) => {
                                const v = e.target.value;
                                setBuilderSharePct(v);
                                if (v !== '' && !isNaN(v)) setOwnerSharePct(String(Math.max(0, 100 - Number(v))));
                              }}
                            />
                          </div>
                        </div>
                        {/* Split Validation Warning */}
                        {ownerSharePct && builderSharePct && Math.abs((Number(ownerSharePct) + Number(builderSharePct)) - 100) > 0.01 && (
                          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '10.5px', color: '#b91c1c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⚠️ Splits must add up to 100%. Current total: {(Number(ownerSharePct) + Number(builderSharePct)).toFixed(1)}%
                          </div>
                        )}
                        {ownerSharePct && builderSharePct && Math.abs((Number(ownerSharePct) + Number(builderSharePct)) - 100) <= 0.01 && (
                          <div style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '10px', color: '#15803d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✅ Splits total 100% — Valid
                          </div>
                        )}
                      </div>

                       {/* GAP 7: Hybrid Guarantee Threshold Warning */}
                       {minGuarantee && expectedRevenue && constructionCost && (() => {
                         const totalCost = Number(constructionCost) + Number(approvalCost||0) + Number(marketingCost||0) + Number(miscCost||0);
                         const expectedProfit = Number(expectedRevenue) - totalCost;
                         const canCoverGuarantee = expectedProfit >= Number(minGuarantee);
                         return !canCoverGuarantee ? (
                           <div style={{ padding: '10px 14px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', fontSize: '10.5px', color: '#92400e' }}>
                             <div style={{ fontWeight: '700', marginBottom: '4px' }}>⚠️ Guarantee Coverage Risk Detected!</div>
                             <div>Estimated Net Profit: <strong>₹{expectedProfit.toLocaleString('en-IN')}</strong></div>
                             <div>Minimum Guarantee Promised: <strong>₹{Number(minGuarantee).toLocaleString('en-IN')}</strong></div>
                             <div style={{ marginTop: '4px', color: '#b45309' }}>🔴 The project's expected profit (₹{(expectedProfit/10000000).toFixed(2)} Cr) is <strong>LESS</strong> than the guarantee committed to the landowner (₹{(Number(minGuarantee)/10000000).toFixed(2)} Cr). Builder may not be able to honour this guarantee. Renegotiate terms.</div>
                           </div>
                         ) : (
                           <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '10.5px', color: '#15803d', display: 'flex', gap: '8px', alignItems: 'center' }}>
                             ✅ <span>Guarantee Viable — Expected Profit (₹{(expectedProfit/10000000).toFixed(2)} Cr) covers the committed guarantee (₹{(Number(minGuarantee)/10000000).toFixed(2)} Cr).</span>
                           </div>
                         );
                       })()}

                      {/* Performance Simulator Box */}
                      {minGuarantee && ownerSharePct && (
                        <div style={{ border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <h4 style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>🌟 Hybrid Performance Simulator Scenario</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ background: 'rgba(5,150,105,0.02)', border: '1px solid rgba(5,150,105,0.15)', padding: '12px', borderRadius: '8px' }}>
                              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase' }}>Scenario A: High Performance</span>
                              <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 8px 0' }}>Project performs well. Profit reaches ₹80 Crore.</p>
                              <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Landowner Gets:</span>
                                <strong style={{ color: '#059669' }}>₹{(Number(minGuarantee) + (800000000 * Number(ownerSharePct)) / 100).toLocaleString('en-IN')}</strong>
                              </div>
                              <span style={{ fontSize: '8px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>(₹{Number(minGuarantee).toLocaleString('en-IN')} Guarantee + {ownerSharePct}% of Profit)</span>
                            </div>

                            <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.15)', padding: '12px', borderRadius: '8px' }}>
                              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#ef4444', textTransform: 'uppercase' }}>Scenario B: Low Performance</span>
                              <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 8px 0' }}>Project performs poorly. Profit drops to ₹10 Crore.</p>
                              <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Landowner Gets:</span>
                                <strong style={{ color: '#ef4444' }}>₹{(Number(minGuarantee) + (100000000 * Number(ownerSharePct)) / 100).toLocaleString('en-IN')}</strong>
                              </div>
                              <span style={{ fontSize: '8px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>(₹{Number(minGuarantee).toLocaleString('en-IN')} Guarantee + {ownerSharePct}% of Profit)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────── COMMON / OPTIONAL INVESTOR DETAILS ────────────────── */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#fafafa' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 10px 0', textTransform: 'uppercase', color: '#64748b' }}>💰 Disbursement & Investor Settings</h3>
                    <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Disbursement Frequency</label>
                        <select
                          className="ai-select"
                          value={paymentFrequency}
                          onChange={(e) => setPaymentFrequency(e.target.value)}
                        >
                          <option value="Quarterly">Quarterly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Bi-Annually">Bi-Annually</option>
                          <option value="Milestone-linked">Milestone-linked</option>
                        </select>
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Investor Share % (Optional)</label>
                        <input
                          type="number"
                          className="ai-input"
                          placeholder="e.g. 10"
                          value={investorSharePct}
                          onChange={(e) => setInvestorSharePct(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Distribution Type</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. Escrow-first Split"
                          value={distributionType}
                          onChange={(e) => setDistributionType(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ─────────────────── GAP 8: TERMS & RESPONSIBILITIES ─────────────────── */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '15px' }}>📜</span>
                      <div>
                        <h3 style={{ fontSize: '11px', fontWeight: '700', margin: '0', textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.04em' }}>Terms &amp; Responsibilities</h3>
                        <p style={{ fontSize: '9.5px', color: '#64748b', margin: '2px 0 0 0' }}>Click any chip to deselect. Add custom responsibilities using the field below.</p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '8px' }}>
                          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: '20px' }}>🏗️ Builder Responsibilities</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                          {['Construction & Architecture', 'Government Approvals & RERA', 'Contractor & Labour Management', 'Marketing & Sales', 'Project Management', 'Utility Connections'].map(item => {
                            const active = builderResponsibilities.includes(item);
                            return (
                              <span key={item} onClick={() => setBuilderResponsibilities(prev => active ? prev.filter(r => r !== item) : [...prev, item])} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', cursor: 'pointer', userSelect: 'none', fontWeight: '500', transition: 'all 0.15s', background: active ? '#1e40af' : '#f1f5f9', color: active ? '#fff' : '#475569', border: active ? '1px solid #1e40af' : '1px solid #e2e8f0' }}>
                                {active ? '✓ ' : ''}{item}
                              </span>
                            );
                          })}
                          {builderResponsibilities.filter(r => !['Construction & Architecture', 'Government Approvals & RERA', 'Contractor & Labour Management', 'Marketing & Sales', 'Project Management', 'Utility Connections'].includes(r)).map(item => (
                            <span key={item} onClick={() => setBuilderResponsibilities(prev => prev.filter(r => r !== item))} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', cursor: 'pointer', fontWeight: '500', background: '#1e40af', color: '#fff', border: '1px solid #1e40af' }}>✓ {item}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input type="text" className="ai-input" style={{ flex: 1 }} placeholder="Add custom..." value={builderRespCustom} onChange={(e) => setBuilderRespCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && builderRespCustom.trim()) { setBuilderResponsibilities(prev => [...prev, builderRespCustom.trim()]); setBuilderRespCustom(''); }}} />
                          <button type="button" onClick={() => { if (builderRespCustom.trim()) { setBuilderResponsibilities(prev => [...prev, builderRespCustom.trim()]); setBuilderRespCustom(''); }}} style={{ padding: '6px 12px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>+ Add</button>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '8px' }}>
                          <span style={{ background: '#d1fae5', color: '#059669', padding: '2px 10px', borderRadius: '20px' }}>🏷️ Landowner Responsibilities</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                          {['Land Title Clearance', 'Cooperation for Approvals & NOC', 'No Encumbrance on Land', 'Handover of Possession', 'Payment of Property Tax till Handover'].map(item => {
                            const active = ownerResponsibilities.includes(item);
                            return (
                              <span key={item} onClick={() => setOwnerResponsibilities(prev => active ? prev.filter(r => r !== item) : [...prev, item])} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', cursor: 'pointer', userSelect: 'none', fontWeight: '500', transition: 'all 0.15s', background: active ? '#059669' : '#f1f5f9', color: active ? '#fff' : '#475569', border: active ? '1px solid #059669' : '1px solid #e2e8f0' }}>
                                {active ? '✓ ' : ''}{item}
                              </span>
                            );
                          })}
                          {ownerResponsibilities.filter(r => !['Land Title Clearance', 'Cooperation for Approvals & NOC', 'No Encumbrance on Land', 'Handover of Possession', 'Payment of Property Tax till Handover'].includes(r)).map(item => (
                            <span key={item} onClick={() => setOwnerResponsibilities(prev => prev.filter(r => r !== item))} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', cursor: 'pointer', fontWeight: '500', background: '#059669', color: '#fff', border: '1px solid #059669' }}>✓ {item}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input type="text" className="ai-input" style={{ flex: 1 }} placeholder="Add custom..." value={ownerRespCustom} onChange={(e) => setOwnerRespCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ownerRespCustom.trim()) { setOwnerResponsibilities(prev => [...prev, ownerRespCustom.trim()]); setOwnerRespCustom(''); }}} />
                          <button type="button" onClick={() => { if (ownerRespCustom.trim()) { setOwnerResponsibilities(prev => [...prev, ownerRespCustom.trim()]); setOwnerRespCustom(''); }}} style={{ padding: '6px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>+ Add</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('partners')}>← Back</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('legality')}>Next: Escrow & Agreement →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 4: Escrow & Agreement */}
              {formTab === 'legality' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Financials & Escrow */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#fafafa' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px 0', textTransform: 'uppercase', color: '#1e293b' }}>🏛️ Cost Estimations & Escrow Bank</h3>
                    
                    {/* Read-only Commercial Summary from Step 4 */}
                    <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Commercial Summary (Configured in Step 4)</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                        <div>Land Valuation: <strong style={{ color: '#0f766e' }}>₹{landValue ? Number(landValue).toLocaleString('en-IN') : '0'}</strong></div>
                        <div>Est. Construction Cost: <strong style={{ color: '#1e293b' }}>₹{constructionCost ? Number(constructionCost).toLocaleString('en-IN') : '0'}</strong></div>
                      </div>
                    </div>

                    <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '12px' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Government Approvals Cost (INR)</label>
                        <input
                          type="number"
                          className="ai-input"
                          placeholder="e.g. 2000000"
                          value={approvalCost}
                          onChange={(e) => setApprovalCost(e.target.value)}
                        />
                        {renderCostHelper(approvalCost)}
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Marketing Cost (INR)</label>
                        <input
                          type="number"
                          className="ai-input"
                          placeholder="e.g. 3000000"
                          value={marketingCost}
                          onChange={(e) => setMarketingCost(e.target.value)}
                        />
                        {renderCostHelper(marketingCost)}
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Miscellaneous Buffers (INR)</label>
                        <input
                          type="number"
                          className="ai-input"
                          placeholder="e.g. 5000000"
                          value={miscCost}
                          onChange={(e) => setMiscCost(e.target.value)}
                        />
                        {renderCostHelper(miscCost)}
                      </div>
                    </div>

                    <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Escrow Bank Partner</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. HDFC Bank Ltd"
                          value={escrowBank}
                          onChange={(e) => setEscrowBank(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Escrow Account Number</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. 999888777123"
                          value={escrowAccount}
                          onChange={(e) => setEscrowAccount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Agreement Details */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#fafafa' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px 0', textTransform: 'uppercase', color: '#1e293b' }}>⚖️ 9. Agreement Details</h3>
                    <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '12px' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Agreement Number Reference</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. JDA-102938"
                          value={agreementNumber}
                          onChange={(e) => setAgreementNumber(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Agreement Signed Date</label>
                        <input
                          type="date"
                          className="ai-input"
                          value={agreementDate}
                          onChange={(e) => setAgreementDate(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Agreement Valid Till Date</label>
                        <input
                          type="date"
                          className="ai-input"
                          value={validTill}
                          onChange={(e) => setValidTill(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '12px' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Stamp Duty Bearer</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. Builder / Shared equally"
                          value={stampPayer}
                          onChange={(e) => setStampPayer(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Stamp Duty Amount Paid (INR)</label>
                        <input
                          type="number"
                          className="ai-input"
                          placeholder="e.g. 750000"
                          value={stampAmount}
                          onChange={(e) => setStampAmount(e.target.value)}
                        />
                        {renderCostHelper(stampAmount)}
                      </div>
                    </div>

                    <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                      <div className="ai-form-group">
                        <label className="ai-label">Arbitration Seat Location</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. Pune, Maharashtra"
                          value={arbitrationSeat}
                          onChange={(e) => setArbitrationSeat(e.target.value)}
                        />
                      </div>
                      <div className="ai-form-group">
                        <label className="ai-label">Governing Legal Jurisdiction Court</label>
                        <input
                          type="text"
                          className="ai-input"
                          placeholder="e.g. Bombay High Court"
                          value={governingJurisdiction}
                          onChange={(e) => setGoverningJurisdiction(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document checklist flags */}
                  <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#fafafa' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 12px 0', textTransform: 'uppercase', color: '#1e293b' }}>📋 10. Pre-Approved Deeds Checklist</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      {[
                        { label: 'Sale Deed Verification', state: docSaleDeed, setState: setDocSaleDeed },
                        { label: '7/12 Extract Clearance', state: docSevenTwelve, setState: setDocSevenTwelve },
                        { label: 'Encumbrance Cert (EC)', state: docEc, setState: setDocEc },
                        { label: 'Clean Title Report', state: docTitleReport, setState: setDocTitleReport },
                        { label: 'Registered POA', state: docPoa, setState: setDocPoa },
                        { label: 'Municipal NOC Certificate', state: docNoc, setState: setDocNoc },
                        { label: 'Land Tax Receipt Paid', state: docTaxReceipt, setState: setDocTaxReceipt }
                      ].map((item, idx) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={item.state}
                            onChange={(e) => item.setState(e.target.checked)}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('shares')}>← Back</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('advisory')}>Next: AI Prompt & Submit →</button>
                  </div>
                </div>
              )}

              {/* Form Tab 5: AI Prompt & Submit */}
              {formTab === 'advisory' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* GAP 10: JV Summary Preview Card */}
                  <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '15px' }}>🔍</span>
                      <h3 style={{ fontSize: '11px', fontWeight: '700', margin: '0', textTransform: 'uppercase', color: '#334155', letterSpacing: '0.05em' }}>Joint Venture Summary Preview</h3>
                      <span style={{ fontSize: '9px', background: '#e2e8f0', color: '#475569', padding: '1px 7px', borderRadius: '20px', fontWeight: '600', marginLeft: 'auto' }}>Confirm Before Run</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '11px' }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }}>Partners & Project</span>
                        <strong style={{ color: '#1e293b', display: 'block', marginTop: '2px' }}>{projectName || 'Unnamed Project'}</strong>
                        <span style={{ display: 'block', marginTop: '1px', color: '#475569' }}>👤 Owner: {landowners[0]?.name || 'N/A'}</span>
                        <span style={{ display: 'block', color: '#475569' }}>🏢 Builder: {builderName || 'N/A'}</span>
                      </div>

                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }}>JV Structure & Splits</span>
                        <strong style={{ color: '#0f766e', display: 'block', marginTop: '2px' }}>⚡ {jvType}</strong>
                        <span style={{ display: 'block', marginTop: '1px', color: '#475569' }}>🏷️ Owner Share: {ownerSharePct || 0}%</span>
                        <span style={{ display: 'block', color: '#475569' }}>🏗️ Builder Share: {builderSharePct || 0}%</span>
                      </div>

                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }}>Project Valuation</span>
                        <span style={{ display: 'block', marginTop: '2px', color: '#475569' }}>🏷️ Land Value: <strong>₹{(Number(landValue||0)/10000000).toFixed(2)} Cr</strong></span>
                        <span style={{ display: 'block', color: '#475569' }}>🔨 Est. Cost: <strong>₹{(Number(constructionCost||0)/10000000).toFixed(2)} Cr</strong></span>
                        <span style={{ display: 'block', color: '#0f766e', fontWeight: 'bold' }}>💰 Capital: ₹{((Number(landValue||0)+Number(constructionCost||0))/10000000).toFixed(2)} Cr</span>
                      </div>

                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }}>Allocations & Responsibilities</span>
                        {jvType === 'Area Share' ? (
                          <span style={{ display: 'block', marginTop: '2px', color: '#475569' }}>📦 Units: <strong>{unitsAllocatedList.filter(u => u.owner === 'Landowner').length} Owner</strong> / <strong>{unitsAllocatedList.filter(u => u.owner === 'Builder').length} Builder</strong></span>
                        ) : (
                          <span style={{ display: 'block', marginTop: '2px', color: '#475569' }}>💵 Expected Rev: <strong>₹{(Number(expectedRevenue||0)/10000000).toFixed(2)} Cr</strong></span>
                        )}
                        <span style={{ display: 'block', color: '#1e40af', marginTop: '1px' }}>📝 Roles: {builderResponsibilities.length} Builder / {ownerResponsibilities.length} Owner</span>
                      </div>
                    </div>
                  </div>

                  {/* Partner Demands */}
                  <div className="grid grid-3 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
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

                  {/* MOU Upload Zone */}
                  <div className="ai-form-group">
                    <label className="ai-label">Draft MOU / Term Sheet Document</label>
                    <label className={`ai-upload-zone ${termSheet ? 'ai-uploaded-file' : ''}`}>
                      <Upload className="ai-upload-icon" size={20} />
                      <span className="ai-upload-text">
                        {uploadingTermSheet ? 'Uploading to Supabase...' : (termSheet ? termSheet.name : 'Upload Term Sheet PDF/Txt')}
                      </span>
                      <span className="ai-upload-hint">Gemini checks clauses and preferred exits</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={handleTermSheetUpload}
                        disabled={uploadingTermSheet}
                      />
                    </label>
                  </div>

                  {/* AI Natural Language Chatbox Analyzer */}
                  <div style={{ marginTop: '10px', borderTop: '1.5px dashed #cbd5e1', paddingTop: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#059669', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      <Sparkles size={14} /> AI natural language prompt analyzer (Optional chatbox)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        placeholder="🔥 Don't want to fill in all the form fields? Just describe the JV details here in plain text! (e.g. 'JV for Green Valley Residency between builder Skyline Developers and owner Rajesh Patil. Construction ₹80Cr, land ₹15Cr, revenue sharing is builder 60% and owner 40%. Exit clause present, but termination and force majeure missing.') and click Analyze below. The AI will extract all details automatically!"
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
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormTab('legality')} style={{ flex: 1 }}>← Back</button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg flex justify-center items-center gap-2"
                      disabled={submitting}
                      style={{ flex: 2 }}
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
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
        )}

        {activeMainTab === 'history' && (
          <>
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
                    <span className="ai-score-label">JV ID: {selectedJv.id.substring(0, 8).toUpperCase()}</span>
                    <span className="ai-score-status" style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                      {selectedJv.projectName} Lifecycle Manager
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleLoadAmendment}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                    style={{ fontSize: '11px', padding: '6px 12px', height: 'fit-content', background: '#0f766e', color: '#ffffff', border: 'none' }}
                  >
                    <Sliders size={14} />
                    Edit &amp; Re-Analyze
                  </button>
                  <button
                    onClick={handleStartChat}
                    disabled={chatStarting}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                    style={{ fontSize: '11px', padding: '6px 12px', height: 'fit-content' }}
                  >
                    {chatStarting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <MessageSquare size={14} />
                    )}
                    Discuss in Chat
                  </button>
                </div>
              </div>

              {/* Tabs Navigation Header */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'overview', label: 'Overview & Financials' },
                  { id: 'partners', label: 'Partners & Allocation' },
                  { id: 'legality', label: 'Legality Checklist' },
                  { id: 'milestones', label: 'Milestones Tracking' },
                  { id: 'payments', label: 'Payments Waterfall' },
                  { id: 'aiRec', label: 'AI Risk Advisory' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                      color: activeTab === tab.id ? '#059669' : '#64748b',
                      borderBottom: activeTab === tab.id ? '2.5px solid #059669' : 'none',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div style={{ minHeight: '300px' }}>
                
                {/* 1. Overview Tab */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Basic Info & Land Info side by side */}
                    <div className="ai-detail-grid">
                      <div className="ai-detail-card">
                        <h4>
                          <Building size={16} /> 1. Basic Information
                        </h4>
                        <div className="ai-info-list">
                          <div className="ai-info-row">
                            <span className="ai-info-label">JV ID (System)</span>
                            <span className="ai-info-value">{selectedJv.metadata?.basicDetails?.jvId || `JV-${selectedJv.id.substring(0, 8).toUpperCase()}`}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">JV Name</span>
                            <span className="ai-info-value">{selectedJv.metadata?.basicDetails?.jvName || `${selectedJv.projectName} JV`}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Project Name</span>
                            <span className="ai-info-value">{selectedJv.projectName}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Project Code</span>
                            <span className="ai-info-value">{selectedJv.metadata?.basicDetails?.projectCode || 'PRJ-MOU99'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">JV Type</span>
                            <span className="ai-info-value success">{selectedJv.metadata?.basicDetails?.jvType || selectedJv.aiRecommendedModel || 'Revenue Share'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Status</span>
                            <span className="ai-info-value">
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                {selectedJv.metadata?.basicDetails?.status || 'Active'}
                              </span>
                            </span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Start Date</span>
                            <span className="ai-info-value">{selectedJv.metadata?.basicDetails?.startDate || '2026-08-01'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Expected End Date</span>
                            <span className="ai-info-value">{selectedJv.metadata?.basicDetails?.endDate || '2030-08-01'}</span>
                          </div>
                          <div className="ai-info-row" style={{ borderBottom: 'none' }}>
                            <span className="ai-info-label">Description</span>
                            <span className="ai-info-value" style={{ fontSize: '11px', color: '#475569' }}>{selectedJv.metadata?.basicDetails?.description || 'Residential JV deal.'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ai-detail-card">
                        <h4>
                          <Building size={16} /> 2. Land Information
                        </h4>
                        <div className="ai-info-list">
                          <div className="ai-info-row">
                            <span className="ai-info-label">Land Lookup Title</span>
                            <span className="ai-info-value">{selectedJv.metadata?.landDetails?.land || `Plot for ${selectedJv.projectName}`}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Survey Number</span>
                            <span className="ai-info-value">{selectedJv.metadata?.landDetails?.surveyNumber || 'SUR-549/2'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Village / Location</span>
                            <span className="ai-info-value">{selectedJv.metadata?.landDetails?.village || 'Hinjewadi, Pune'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">District</span>
                            <span className="ai-info-value">{selectedJv.metadata?.landDetails?.district || 'Pune'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">State</span>
                            <span className="ai-info-value">{selectedJv.metadata?.landDetails?.state || 'Maharashtra'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Land Area</span>
                            <span className="ai-info-value">{selectedJv.metadata?.landDetails?.landArea || 5} Acres</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Zoning Classification</span>
                            <span className="ai-info-value">{selectedJv.metadata?.landDetails?.zoning || 'Residential'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Land Value contribution</span>
                            <span className="ai-info-value">₹{selectedJv.landValue.toLocaleString()}</span>
                          </div>
                          <div className="ai-info-row" style={{ borderBottom: 'none' }}>
                            <span className="ai-info-label">Approved FSI ratio</span>
                            <span className="ai-info-value" style={{ color: '#4f46e5' }}>{selectedJv.metadata?.landDetails?.fsi || 2.5} FSI</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial details section */}
                    <div className="ai-detail-card">
                      <h4>
                        <DollarSign size={16} /> 6. Financial Details & Escrow Accounts
                      </h4>
                      <div className="ai-detail-grid">
                        <div className="ai-info-list">
                          <div className="ai-info-row">
                            <span className="ai-info-label">Land Value</span>
                            <span className="ai-info-value">₹{selectedJv.landValue.toLocaleString()}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Construction Cost</span>
                            <span className="ai-info-value">₹{selectedJv.constructionCost.toLocaleString()}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Government Approval Cost</span>
                            <span className="ai-info-value">₹{Number(selectedJv.metadata?.financialDetails?.approvalCost || 0).toLocaleString()}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Marketing & Launch Cost</span>
                            <span className="ai-info-value">₹{Number(selectedJv.metadata?.financialDetails?.marketingCost || 0).toLocaleString()}</span>
                          </div>
                          <div className="ai-info-row" style={{ borderBottom: 'none' }}>
                            <span className="ai-info-label">Miscellaneous Buffer Cost</span>
                            <span className="ai-info-value">₹{Number(selectedJv.metadata?.financialDetails?.miscellaneousCost || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="ai-info-list">
                          {(() => {
                            const approval = Number(selectedJv.metadata?.financialDetails?.approvalCost || 0);
                            const marketing = Number(selectedJv.metadata?.financialDetails?.marketingCost || 0);
                            const misc = Number(selectedJv.metadata?.financialDetails?.miscellaneousCost || 0);
                            const totalCost = selectedJv.landValue + selectedJv.constructionCost + approval + marketing + misc;
                            
                            const expectedRev = Number(selectedJv.metadata?.financialDetails?.expectedRevenue) || 
                                                Number(selectedJv.metadata?.financialDetails?.estimatedRevenue) || 0;
                                                
                            const netProfit = expectedRev > 0 ? (expectedRev - totalCost) : 0;
                            const calcRoi = totalCost > 0 && netProfit > 0 ? ((netProfit / totalCost) * 100).toFixed(1) : null;
                            
                            return (
                              <>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Total Project Cost</span>
                                  <span className="ai-info-value danger">₹{totalCost.toLocaleString()}</span>
                                </div>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Expected Sales Revenue</span>
                                  <span className="ai-info-value success">{expectedRev > 0 ? `₹${expectedRev.toLocaleString()}` : 'Not Configured'}</span>
                                </div>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Projected Net Profit</span>
                                  <span className="ai-info-value" style={{ color: '#2563eb', fontWeight: 'bold' }}>
                                    {netProfit > 0 ? `₹${netProfit.toLocaleString()}` : (expectedRev > 0 ? 'Negative / Break-even' : 'Not Calculated')}
                                  </span>
                                </div>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Return on Investment (ROI)</span>
                                  <span className="ai-info-value">{calcRoi ? `${calcRoi}%` : 'Not Calculated'}</span>
                                </div>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Project Break-even</span>
                                  <span className="ai-info-value">{selectedJv.metadata?.financialDetails?.breakEvenPeriod && selectedJv.metadata?.financialDetails?.breakEvenPeriod !== 3.5 ? `${selectedJv.metadata.financialDetails.breakEvenPeriod} Years` : 'Not Configured'}</span>
                                </div>
                                <div className="ai-info-row" style={{ borderBottom: 'none' }}>
                                  <span className="ai-info-label">Escrow Bank Partner</span>
                                  <span className="ai-info-value" style={{ color: '#4b5563' }}>
                                    {selectedJv.metadata?.financialDetails?.escrowBankName && selectedJv.metadata?.financialDetails?.escrowBankName !== 'HDFC Bank Ltd' ? (
                                      `${selectedJv.metadata.financialDetails.escrowBankName} (${selectedJv.metadata?.financialDetails?.escrowAccountNumber || 'No Account'})`
                                    ) : 'Not Setup'}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Partners Tab */}
                {activeTab === 'partners' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="ai-detail-grid">
                      {/* Landowner details */}
                      <div className="ai-detail-card">
                        <h4>👤 3. Land Owner / Partner Details</h4>
                        {(() => {
                          const details = selectedJv.metadata?.landOwnerDetails;
                          const isArray = Array.isArray(details);
                          const partnersList = isArray ? details : [
                            {
                              name: selectedJv.landOwnerName,
                              mobile: details?.mobile,
                              email: details?.email,
                              ownershipPercentage: details?.ownershipPercentage || details?.ownershipShare,
                              pan: details?.pan,
                              aadhaar: details?.aadhaar,
                              address: details?.address,
                              bankDetails: details?.bankDetails
                            }
                          ];

                          return partnersList.map((partner, pIdx) => (
                            <div key={pIdx} style={{ marginBottom: pIdx < partnersList.length - 1 ? '16px' : 0, paddingBottom: pIdx < partnersList.length - 1 ? '16px' : 0, borderBottom: pIdx < partnersList.length - 1 ? '1px dashed #cbd5e1' : 'none' }}>
                              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>PARTNER #{pIdx + 1}: {partner.name || 'N/A'}</span>
                              <div className="ai-info-list">
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Mobile Contact</span>
                                  <span className="ai-info-value">{partner.mobile || 'N/A'}</span>
                                </div>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Contact Email</span>
                                  <span className="ai-info-value">{partner.email || 'N/A'}</span>
                                </div>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Ownership Share</span>
                                  <span className="ai-info-value">{partner.ownershipPercentage || 100}%</span>
                                </div>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">PAN Card Ref</span>
                                  <span className="ai-info-value">{partner.pan || 'N/A'}</span>
                                </div>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Aadhaar Card Ref</span>
                                  <span className="ai-info-value">{partner.aadhaar || 'N/A'}</span>
                                </div>
                                <div className="ai-info-row">
                                  <span className="ai-info-label">Registered Address</span>
                                  <span className="ai-info-value" style={{ fontSize: '11px' }}>{partner.address || 'N/A'}</span>
                                </div>
                                <div className="ai-info-row" style={{ borderBottom: 'none' }}>
                                  <span className="ai-info-label">Disbursement Bank Details</span>
                                  <span className="ai-info-value" style={{ fontSize: '10px' }}>{partner.bankDetails || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Builder details */}
                      <div className="ai-detail-card">
                        <h4>🏢 4. Builder & Developer Details</h4>
                        <div className="ai-info-list">
                          <div className="ai-info-row">
                            <span className="ai-info-label">Developer Company</span>
                            <span className="ai-info-value">{selectedJv.builderName}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Contact Person</span>
                            <span className="ai-info-value">{selectedJv.metadata?.builderDetails?.contactPerson || 'Vikram Shah'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Mobile Contact</span>
                            <span className="ai-info-value">{selectedJv.metadata?.builderDetails?.mobile || '9876543211'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Contact Email</span>
                            <span className="ai-info-value">{selectedJv.metadata?.builderDetails?.email || 'contact@builder.com'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Experience (Real Estate)</span>
                            <span className="ai-info-value">{selectedJv.metadata?.builderDetails?.experience || 18} Years</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Completed Projects</span>
                            <span className="ai-info-value">{selectedJv.metadata?.builderDetails?.completedProjects || 42} Projects</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Credit Rating</span>
                            <span className="ai-info-value" style={{ color: '#2563eb' }}>{selectedJv.metadata?.builderDetails?.creditRating || 'A+ Rating'}</span>
                          </div>
                          <div className="ai-info-row" style={{ borderBottom: 'none' }}>
                            <span className="ai-info-label">Financial Capacity</span>
                            <span className="ai-info-value">₹{(selectedJv.metadata?.builderDetails?.financialCapacity || 900000000).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ai-detail-grid">
                      {/* Investor details & Revenue sharing */}
                      <div className="ai-detail-card">
                        <h4>💰 5. Investor Details (Optional)</h4>
                        <div className="ai-info-list">
                          <div className="ai-info-row">
                            <span className="ai-info-label">Investor Name</span>
                            <span className="ai-info-value">{selectedJv.investorName || 'N/A'}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Investment Amount</span>
                            <span className="ai-info-value">₹{selectedJv.investorFunds.toLocaleString()}</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Expected ROI</span>
                            <span className="ai-info-value">{selectedJv.metadata?.investorDetails?.expectedRoi || 18.0}%</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Investment Type</span>
                            <span className="ai-info-value">{selectedJv.metadata?.investorDetails?.investmentType || 'Equity'}</span>
                          </div>
                          <div className="ai-info-row" style={{ borderBottom: 'none' }}>
                            <span className="ai-info-label">Exit Timeline</span>
                            <span className="ai-info-value">{selectedJv.metadata?.investorDetails?.exitTimeline || 24} Months</span>
                          </div>
                        </div>
                      </div>

                      <div className="ai-detail-card">
                        <h4>📊 7. Revenue Sharing & Allocations</h4>
                        
                        {/* Tri-color profit distribution horizontal bar */}
                        {(() => {
                          const builderShare = Number(selectedJv.metadata?.revenueSharingDetails?.builderShare) || 60;
                          const ownerShare = Number(selectedJv.metadata?.revenueSharingDetails?.landOwnerShare) || 40;
                          const investorShare = Number(selectedJv.metadata?.revenueSharingDetails?.investorShare) || 0;
                          
                          return (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ height: '14px', width: '100%', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                                <div style={{ width: `${builderShare}%`, backgroundColor: '#10b981' }} title={`Builder Share: ${builderShare}%`} />
                                <div style={{ width: `${ownerShare}%`, backgroundColor: '#f59e0b' }} title={`Land Owner Share: ${ownerShare}%`} />
                                {investorShare > 0 && (
                                  <div style={{ width: `${investorShare}%`, backgroundColor: '#6366f1' }} title={`Investor Share: ${investorShare}%`} />
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '12px', fontSize: '9px', fontWeight: 'bold', marginTop: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                  <span>Builder: {builderShare}%</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                                  <span>Landowner: {ownerShare}%</span>
                                </div>
                                {investorShare > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }} />
                                    <span>Investor: {investorShare}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="ai-info-list">
                          <div className="ai-info-row">
                            <span className="ai-info-label">Builder Share Ratio</span>
                            <span className="ai-info-value success">{selectedJv.metadata?.revenueSharingDetails?.builderShare || 60}%</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Land Owner Share Ratio</span>
                            <span className="ai-info-value warning">{selectedJv.metadata?.revenueSharingDetails?.landOwnerShare || 40}%</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Investor Share Ratio</span>
                            <span className="ai-info-value">{selectedJv.metadata?.revenueSharingDetails?.investorShare || 0}%</span>
                          </div>
                          <div className="ai-info-row">
                            <span className="ai-info-label">Profit Distribution Type</span>
                            <span className="ai-info-value">{selectedJv.metadata?.revenueSharingDetails?.profitDistributionType || 'Revenue'}</span>
                          </div>
                          <div className="ai-info-row" style={{ borderBottom: 'none' }}>
                            <span className="ai-info-label">Disbursement Frequency</span>
                            <span className="ai-info-value">{selectedJv.metadata?.revenueSharingDetails?.paymentFrequency || 'Quarterly'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Partner responsibilities */}
                    <div className="ai-detail-card">
                      <h4 style={{ borderBottom: 'none', paddingBottom: 0 }}>🛠️ 8. Partner Responsibilities Matrix</h4>
                      <div className="ai-detail-grid" style={{ marginTop: '12px' }}>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', fontSize: '10px' }}>Builder Responsibilities</span>
                          <ul style={{ paddingLeft: '14px', margin: '6px 0 0 0' }}>
                            {(selectedJv.metadata?.responsibilities?.builder || ["Construction", "Project Management", "Approvals", "Sales"]).map((item, idx) => (
                              <li key={idx} style={{ margin: '2px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>✓ {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 'bold', color: '#d97706', textTransform: 'uppercase', fontSize: '10px' }}>Land Owner Responsibilities</span>
                          <ul style={{ paddingLeft: '14px', margin: '6px 0 0 0' }}>
                            {(selectedJv.metadata?.responsibilities?.landOwner || ["Land Contribution", "Clear Title Deeds", "Coordination"]).map((item, idx) => (
                              <li key={idx} style={{ margin: '2px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>✓ {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase', fontSize: '10px' }}>Investor Responsibilities</span>
                          <ul style={{ paddingLeft: '14px', margin: '6px 0 0 0' }}>
                            {(selectedJv.metadata?.responsibilities?.investor || ["Funding Liquidity", "Audit Monitoring"]).map((item, idx) => (
                              <li key={idx} style={{ margin: '2px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>✓ {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Legality Tab */}
                {activeTab === 'legality' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>📋 10. Legal Checklist</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[
                            { key: 'saleDeed', label: 'Sale Deed Verification' },
                            { key: 'sevenTwelve', label: '7/12 Extract Clearance' },
                            { key: 'ec', label: 'Encumbrance Certificate (EC)' },
                            { key: 'titleReport', label: 'Clean Title Report' },
                            { key: 'poa', label: 'Registered Power of Attorney (POA)' },
                            { key: 'noc', label: 'Municipal NOC Certificate' },
                            { key: 'taxReceipt', label: 'Up-to-date Land Tax Receipt' }
                          ].map(item => {
                            const checklist = selectedJv.metadata?.legalChecklist || {};
                            const checked = checklist[item.key];
                            return (
                              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                <span>{item.label}</span>
                                <button
                                  onClick={() => handleToggleLegalCheck(item.key)}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: checked ? '#dcfce7' : '#fee2e2',
                                    color: checked ? '#15803d' : '#b91c1c'
                                  }}
                                >
                                  {checked ? 'VERIFIED ✓' : 'PENDING ⚠️'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>⚖️ 9. Agreement details</h4>
                        <table style={{ width: '100%', fontSize: '12px' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ color: '#64748b', padding: '6px 0' }}>Agreement Number</td>
                              <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{selectedJv.metadata?.agreementDetails?.agreementNumber || 'JDA-998877'}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ color: '#64748b', padding: '6px 0' }}>Agreement Date</td>
                              <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{selectedJv.metadata?.agreementDetails?.agreementDate || '2026-07-29'}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ color: '#64748b', padding: '6px 0' }}>Valid Till Date</td>
                              <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{selectedJv.metadata?.agreementDetails?.validTill || '2030-07-29'}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ color: '#64748b', padding: '6px 0' }}>Agreement Status</td>
                              <td style={{ fontWeight: 'bold', textAlign: 'right', color: '#16a34a' }}>{selectedJv.metadata?.agreementDetails?.agreementStatus || 'Signed'}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ color: '#64748b', padding: '6px 0' }}>Stamp Duty Bearer</td>
                              <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{selectedJv.metadata?.agreementDetails?.stampDutyPayer || 'Builder'}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ color: '#64748b', padding: '6px 0' }}>Stamp Duty Cost Paid</td>
                              <td style={{ fontWeight: 'bold', textAlign: 'right' }}>₹{(selectedJv.metadata?.agreementDetails?.stampDutyAmount || 750000).toLocaleString()}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ color: '#64748b', padding: '6px 0' }}>Arbitration Seat</td>
                              <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{selectedJv.metadata?.agreementDetails?.arbitrationSeat || 'Pune, India'}</td>
                            </tr>
                            <tr>
                              <td style={{ color: '#64748b', padding: '6px 0' }}>Jurisdiction Seat</td>
                              <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{selectedJv.metadata?.agreementDetails?.governingJurisdiction || 'Bombay High Court'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Uploaded Documents List */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>📁 16. Uploaded Documents Check</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '11px' }}>
                        {[
                          'Draft MoU Document',
                          'Signed JV Agreement',
                          'Power of Attorney (POA)',
                          'Board Resolution',
                          'GST Certificate',
                          'PAN & Aadhaar Identification',
                          'Bank Disbursement Credentials',
                          'Search & Title Report',
                          'Advocate Legal Opinion',
                          'Development Approval Documents'
                        ].map((docName, idx) => (
                          <div key={idx} style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{docName}</span>
                            <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '10px' }}>ACTIVE ✓</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upgraded Dispute Resolution Seat Guidelines Card */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e293b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Scale size={15} className="text-emerald-500" />
                        Dispute Arbitration Escalation Guidelines
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '11px', color: '#475569' }}>
                        <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Level 1: Mutual Negotiation</span>
                          <p style={{ margin: 0, lineHeight: '1.4' }}>Partners must escalate to executive board mediation within <strong>15 days</strong> of initial objection notice. Failing mutual resolution, the dispute escalates to Level 2.</p>
                        </div>
                        <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 'bold', color: '#d97706', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Level 2: Sole Arbitrator Seat</span>
                          <p style={{ margin: 0, lineHeight: '1.4' }}>Arbitration proceedings will be seated in <strong>{selectedJv.metadata?.agreementDetails?.arbitrationSeat || 'Pune, Maharashtra'}</strong> under the Indian Arbitration & Conciliation Act, 1996.</p>
                        </div>
                        <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Level 3: Jurisdiction Court</span>
                          <p style={{ margin: 0, lineHeight: '1.4' }}>Governing authority remains bound to <strong>{selectedJv.metadata?.agreementDetails?.governingJurisdiction || 'Bombay High Court'}</strong>. Cost of arbitrator shared equally.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Milestones Tab */}
                {activeTab === 'milestones' && (
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>📅 14. Milestones</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(selectedJv.metadata?.milestones || []).map((m, idx) => (
                        <div
                          key={m.id || idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#ffffff',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            borderLeft: m.status === 'Completed' ? '4px solid #10b981' : '4px solid #f59e0b',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>{m.name}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                              Responsible Party: <span style={{ fontWeight: 'bold' }}>{m.responsibleParty}</span> | Target Date: {m.plannedDate || 'N/A'}
                            </div>
                            {m.actualDate && (
                              <div style={{ fontSize: '9px', color: '#10b981', marginTop: '1px' }}>
                                Handover Date: {m.actualDate}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleMilestone(m.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              border: 'none',
                              cursor: 'pointer',
                              background: m.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                              color: m.status === 'Completed' ? '#15803d' : '#b45309'
                            }}
                          >
                            {m.status === 'Completed' ? 'COMPLETED ✓' : 'PENDING 🕒'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Payments Tab */}
                {activeTab === 'payments' && (
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>💰 15. Payment Schedule</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                            <th style={{ padding: '8px' }}>Installment</th>
                            <th style={{ padding: '8px' }}>Disbursement Amount</th>
                            <th style={{ padding: '8px' }}>Target Due Date</th>
                            <th style={{ padding: '8px' }}>Paid Date</th>
                            <th style={{ padding: '8px' }}>Status</th>
                            <th style={{ padding: '8px', width: '120px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedJv.metadata?.paymentSchedule || []).map((p, idx) => (
                            <tr key={p.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>Installment #{p.installment}</td>
                              <td style={{ padding: '10px 8px', color: '#059669', fontWeight: 'bold' }}>₹{p.amount.toLocaleString()}</td>
                              <td style={{ padding: '10px 8px' }}>{p.dueDate || 'N/A'}</td>
                              <td style={{ padding: '10px 8px', color: '#10b981' }}>{p.paidDate || '—'}</td>
                              <td style={{ padding: '10px 8px' }}>
                                <span style={{
                                  background: p.status === 'Paid' ? '#dcfce7' : '#fee2e2',
                                  color: p.status === 'Paid' ? '#15803d' : '#b91c1c',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 'bold'
                                }}>
                                  {p.status.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                <button
                                  onClick={() => handleTogglePayment(p.id)}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                  }}
                                >
                                  {p.status === 'Paid' ? 'Mark Unpaid' : 'Mark Paid'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. AI Risk Advisory Tab */}
                {activeTab === 'aiRec' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Score Cards */}
                    <div className="ai-detail-card">
                      <h4 style={{ borderBottom: 'none', paddingBottom: 0 }}>📊 11. AI Analysis & 13. Risk Assessment</h4>
                      <div className="ai-metric-grid" style={{ marginBottom: '20px', marginTop: '12px' }}>
                        {[
                          { label: 'Overall JV Score', val: selectedJv.metadata?.aiAnalysis?.aiJvScore || 88, color: '#059669' },
                          { label: 'Fairness Score', val: selectedJv.metadata?.aiAnalysis?.fairnessScore || 85, color: '#2563eb' },
                          { label: 'Legal Score', val: selectedJv.metadata?.aiAnalysis?.legalScore || 90, color: '#4f46e5' },
                          { label: 'Financial Score', val: selectedJv.metadata?.aiAnalysis?.financialScore || 87, color: '#0891b2' },
                          { label: 'Risk Score (Advisory)', val: selectedJv.metadata?.aiAnalysis?.riskScore || 20, color: '#e11d48' },
                          { label: 'Profitability Score', val: selectedJv.metadata?.aiAnalysis?.profitabilityScore || 92, color: '#16a34a' }
                        ].map((score, index) => (
                          <div key={index} className="ai-metric-card">
                            <div className="ai-metric-label">{score.label}</div>
                            <div className="ai-metric-value" style={{ color: score.color }}>
                              {score.val}<span className="ai-metric-subtext">/100</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Glassmorphic AI JV Comparison Grid */}
                      <div style={{ background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                        <h4 style={{ color: '#0f766e', borderBottom: '1px solid rgba(16, 185, 129, 0.1)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 'bold' }}>
                          <Sparkles size={14} className="text-emerald-600" />
                          AI Joint Venture Scenario Comparison Card
                        </h4>
                        <div className="table-responsive" style={{ marginTop: '12px' }}>
                          <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                              <tr style={{ background: 'rgba(15, 118, 110, 0.05)', borderBottom: '1.5px solid rgba(16, 185, 129, 0.2)' }}>
                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase' }}>JV Model</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase' }}>Risk Level</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase' }}>Capital Req.</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase' }}>Expected Builder ROI</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase' }}>AI Evaluation / Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(aiComparison || [
                                { model: 'Revenue Sharing', risk: 'Medium', capitalRequirement: 'Low', expectedRoi: '28%', reason: 'Reduces builder\'s upfront land acquisition requirement while maintaining high project returns.' },
                                { model: 'Area Sharing', risk: 'Medium', capitalRequirement: 'Low', expectedRoi: '25%', reason: 'Best when landowner wants property instead of cash. Simplifies allocation.' },
                                { model: 'Profit Sharing', risk: 'High', capitalRequirement: 'Medium', expectedRoi: '31%', reason: 'High return potential, but carries budget overrun and cost escalation risks.' },
                                { model: 'Hybrid (Guarantee + Upside)', risk: 'High', capitalRequirement: 'Medium', expectedRoi: '29%', reason: 'Safeguards landowner with minimum guarantee, but builder carries higher downside risk.' }
                              ]).map((item, idx) => {
                                const isRecommended = selectedJv.metadata?.aiRecommendation?.suggestedJvModel === item.model || 
                                                      (idx === 0 && !selectedJv.metadata?.aiRecommendation?.suggestedJvModel);
                                return (
                                  <tr key={idx} style={{ 
                                    borderBottom: '1px solid #f1f5f9',
                                    background: isRecommended ? 'rgba(5, 150, 105, 0.03)' : 'transparent',
                                    fontWeight: isRecommended ? 'bold' : 'normal'
                                  }}>
                                    <td style={{ padding: '10px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Handshake size={12} className={isRecommended ? 'text-emerald-600' : 'text-slate-400'} />
                                      <span>{item.model}</span>
                                      {isRecommended && (
                                        <span style={{ fontSize: '8px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '10px', marginLeft: '4px', fontWeight: 'bold' }}>Recommended</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      <span style={{ 
                                        fontSize: '9px',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        background: item.risk === 'High' ? '#fee2e2' : item.risk === 'Medium' ? '#fef3c7' : '#dcfce7',
                                        color: item.risk === 'High' ? '#b91c1c' : item.risk === 'Medium' ? '#d97706' : '#15803d'
                                      }}>
                                        {item.risk}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>{item.capitalRequirement || item.capital || 'Low'}</td>
                                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>{item.expectedRoi}</td>
                                    <td style={{ padding: '10px', color: '#475569', lineHeight: '1.4' }}>{item.reason}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Risks table */}
                      <div className="ai-info-list">
                        <div className="ai-info-row">
                          <span className="ai-info-label">Legal Risk Grade</span>
                          <span className="ai-info-value success">{selectedJv.metadata?.riskAssessment?.legalRisk || 'Low'}</span>
                        </div>
                        <div className="ai-info-row">
                          <span className="ai-info-label">Financial Risk Grade</span>
                          <span className="ai-info-value warning">{selectedJv.metadata?.riskAssessment?.financialRisk || 'Medium'}</span>
                        </div>
                        <div className="ai-info-row">
                          <span className="ai-info-label">Market Risk Grade</span>
                          <span className="ai-info-value warning">{selectedJv.metadata?.riskAssessment?.marketRisk || 'Medium'}</span>
                        </div>
                        <div className="ai-info-row">
                          <span className="ai-info-label">Execution Risk Grade</span>
                          <span className="ai-info-value success">{selectedJv.metadata?.riskAssessment?.executionRisk || 'Low'}</span>
                        </div>
                        <div className="ai-info-row">
                          <span className="ai-info-label">Partner Risk Grade</span>
                          <span className="ai-info-value success">{selectedJv.metadata?.riskAssessment?.partnerRisk || 'Low'}</span>
                        </div>
                        <div className="ai-info-row">
                          <span className="ai-info-label">Overall Joint Venture Risk Rating</span>
                          <span className="ai-info-value warning" style={{ fontWeight: 'bold' }}>{selectedJv.metadata?.riskAssessment?.overallRisk || 'Medium'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ai-detail-card">
                      <h4>💡 12. AI Recommendation details</h4>
                      <div className="ai-info-list" style={{ marginBottom: '16px' }}>
                        <div className="ai-info-row">
                          <span className="ai-info-label">Recommendation decision</span>
                          <span className="ai-info-value" style={{ color: '#2563eb' }}>{selectedJv.metadata?.aiRecommendation?.recommendation || 'Proceed with Review'}</span>
                        </div>
                        <div className="ai-info-row">
                          <span className="ai-info-label">Suggested JV Model</span>
                          <span className="ai-info-value">{selectedJv.metadata?.aiRecommendation?.suggestedJvModel || 'Revenue Share'}</span>
                        </div>
                        <div className="ai-info-row">
                          <span className="ai-info-label">Negotiation Scope level</span>
                          <span className="ai-info-value warning">{selectedJv.metadata?.aiRecommendation?.negotiationScope || 'Medium'}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                        <strong>Missing Clauses:</strong> {(selectedJv.metadata?.aiRecommendation?.missingClauses || ['Force Majeure clauses', 'Arbitration timelines']).map((clause, index) => (
                          <span key={index} style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', margin: '0 4px', display: 'inline-block', fontWeight: 'bold' }}>{clause}</span>
                        ))}
                      </div>

                      <div style={{ fontSize: '12px', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', lineHeight: '1.5' }}>
                        <strong>Suggested Improvements:</strong> {selectedJv.metadata?.aiRecommendation?.suggestedImprovements || 'Formulate an escalation metrics matrix to address variations in materials pricing.'}
                      </div>
                    </div>

                    {/* Original Markdown Advisory reports */}
                    <div style={{ padding: '8px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
                      <div className="ai-report-section">
                        <h3 className="ai-report-section-title">Recommended Model breakdown</h3>
                        <div className="ai-report-section-content">{selectedJv.aiRecommendedModel ? formatMarkdown(selectedJv.aiRecommendedModel) : 'N/A'}</div>
                      </div>
                      <div className="ai-report-section">
                        <h3 className="ai-report-section-title">ROI Predictions breakdown</h3>
                        <div className="ai-report-section-content">{selectedJv.aiRoiPrediction ? formatMarkdown(selectedJv.aiRoiPrediction) : 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}

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
        </>
        )}
      </div>
    </div>
  );
}
