import { useState, useEffect } from 'react';
import { aiService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { FileText, Search, Filter, Download, ExternalLink, Calendar, User, LayoutGrid, Info, Trash2 } from 'lucide-react';
import './AiModules.css';

export default function DocumentVaultPage() {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedPlotFilter, setSelectedPlotFilter] = useState('ALL');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await aiService.getDocumentCatalog();
      setDocuments(data.data || []);
    } catch (err) {
      toast.error('Failed to retrieve centralized document catalog');
    } finally {
      setLoading(false);
    }
  };

  // Get unique non-empty referenceId values from documents (e.g. plot names)
  const uniquePlots = Array.from(
    new Set(
      documents
        .map((d) => d.referenceId)
        .filter((ref) => ref && ref !== 'manual' && ref !== 'CREATE_NEW' && ref.trim() !== '')
    )
  );

  const getModuleBadgeClass = (moduleName) => {
    switch (moduleName?.toUpperCase()) {
      case 'LAND':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'JV':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'FEASIBILITY':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'APPROVAL':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  // Filter and search
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.uploadedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.referenceId?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesModule = selectedModule === 'ALL' || doc.module?.toUpperCase() === selectedModule;
    const matchesPlot = selectedPlotFilter === 'ALL' || doc.referenceId === selectedPlotFilter;
    
    return matchesSearch && matchesModule && matchesPlot;
  });

  const handleDownload = (doc) => {
    if (!doc.fileUrl) {
      toast.warning('No file path or download link associated with this document.');
      return;
    }
    // For demo/mocked uploads, we mock the file download. Otherwise, it triggers the direct URL.
    if (doc.fileUrl.startsWith('uploaded_')) {
      toast.info(`Downloading Mocked File: ${doc.title} (${doc.fileUrl})`);
      const blob = new Blob([`Mock contents for ${doc.title}`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Are you sure you want to permanently delete the document "${doc.title}" from the vault?`)) {
      return;
    }
    try {
      await aiService.deleteDocument(doc.id);
      toast.success('Document deleted successfully from database');
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to delete document');
      console.error(err);
    }
  };

  return (
    <div className="ai-page-container">
      {/* Header */}
      <div className="ai-header">
        <h1 className="ai-title">
          <FileText className="text-primary" size={32} />
          Global Document Vault
        </h1>
        <p className="ai-subtitle">
          A centralized, searchable catalogue indexing every document uploaded or generated across your Land Acquisition, Joint Ventures, Feasibility Studies, and NOC Approval workflows.
        </p>
      </div>

      {/* Control Panel: Search & Filter (Horizontal grid at the top) */}
      <div className="ai-card w-full mb-md">
        <div className="ai-card-body" style={{ padding: '1.25rem' }}>
          <div className="grid grid-2 gap-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'center' }}>
            {/* Search */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-slate-400" size={18} style={{ pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search documents by name, type, uploader..."
                className="ai-input"
                style={{ paddingLeft: '2.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', gridColumn: 'span 2' }}>
              {/* Module Filter Buttons */}
              <div className="flex items-center gap-sm" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Filter className="text-slate-400" size={16} />
                <div className="flex gap-xs" style={{ display: 'flex', gap: '4px' }}>
                  {['ALL', 'LAND', 'JV', 'FEASIBILITY', 'APPROVAL'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedModule(m)}
                      className={`btn btn-sm ${selectedModule === m ? 'btn-primary' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      style={{ fontSize: '11px', padding: '6px 12px' }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plot Filter Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Filter by Plot:</span>
                <select
                  value={selectedPlotFilter}
                  onChange={(e) => setSelectedPlotFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                    outline: 'none',
                    minWidth: '180px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">All Plots / References</option>
                  {uniquePlots.map((plot) => (
                    <option key={plot} value={plot}>
                      📍 {plot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content (Full Width) */}
      <div className="ai-card w-full">
        <div className="ai-card-body p-0" style={{ marginTop: '0rem' }}>
          {loading ? (
            <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Info size={40} className="text-slate-300" />
              <h3 className="font-semibold text-slate-600">No Documents Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                {documents.length === 0 
                  ? "Upload documents in Land Bank, JV Manager, Feasibility, or Approvals to see them indexed here."
                  : "No documents matching your search filter."}
              </p>
            </div>
          ) : (
            <div className="ai-table-container">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Module</th>
                    <th>Reference ID</th>
                    <th>File Format</th>
                    <th>Uploaded By</th>
                    <th>Upload Date</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td>
                        <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText className="text-slate-400" size={16} />
                          <span className="font-medium text-slate-800">{doc.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${getModuleBadgeClass(doc.module)}`}>
                          {doc.module}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 'bold' }}>
                          {doc.referenceId && doc.referenceId.length > 20 && !doc.referenceId.includes(' ')
                            ? `${doc.referenceId.substring(0, 8)}...`
                            : doc.referenceId || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                          {doc.documentType || 'PDF'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-slate-600 text-xs" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <User size={12} className="text-slate-400" />
                          {doc.uploadedBy || 'system'}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-slate-500 text-xs" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', border: 'none' }}>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="btn btn-ghost btn-icon text-primary cursor-pointer"
                          title="Download/Open document file"
                          style={{ padding: '4px' }}
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="btn btn-ghost btn-icon text-danger cursor-pointer"
                          title="Delete document permanently"
                          style={{ padding: '4px', color: '#dc2626' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
