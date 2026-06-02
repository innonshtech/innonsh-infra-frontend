import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useToast } from '../../contexts/ToastContext';
import { inventoryService, projectService } from '../../services/api';
import {
  Plus, Package, Warehouse, ArrowUpRight, ArrowDownRight,
  Trash2, Edit2, Search
} from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function InventoryPage() {
  const [tab, setTab] = useState('items');
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showWarehouseCreate, setShowWarehouseCreate] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [showPredefined, setShowPredefined] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfig, setDeleteConfig] = useState({ show: false, itemId: null });
  const toast = useToast();

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (tab === 'items') {
        const res = await inventoryService.getItems();
        setItems(res.data?.data || res.data || []);
      } else if (tab === 'warehouses') {
        const res = await inventoryService.getWarehouses();
        setWarehouses(res.data?.data || res.data || []);
      } else if (tab === 'history') {
        const res = await inventoryService.getMovements();
        setMovements(res.data?.data || res.data || []);
      } else {
        const res = await inventoryService.getStock();
        setStock(res.data?.data || res.data || []);
      }
    } catch { toast.error('Failed to load inventory data'); }
    finally { setLoading(false); }
  };

  const handleDeleteItem = async (id) => {
    setDeleteConfig({ show: true, itemId: id });
  };

  const confirmDelete = async () => {
    try { 
      await inventoryService.deleteItem(deleteConfig.itemId); 
      toast.success('Item deleted'); 
      setDeleteConfig({ show: false, itemId: null });
      loadData(); 
    }
    catch { toast.error('Cannot delete — item may have stock entries'); }
  };

  const filtered = tab === 'items'
    ? items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    : tab === 'warehouses'
    ? warehouses.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()))
    : tab === 'history'
    ? movements.filter(m => !search || m.inventoryItem?.name?.toLowerCase().includes(search.toLowerCase()) || m.reference?.toLowerCase().includes(search.toLowerCase()) || m.project?.name?.toLowerCase().includes(search.toLowerCase()))
    : stock;

  return (
    <PageWrapper
      title="Inventory Management"
      subtitle="Track materials, warehouses & stock movements"
      actions={
        <div className="flex gap-md">
          {tab === 'items' && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowPredefined(true)}>
                <Package size={16} style={{ marginRight: '6px' }} /> Material Templates
              </button>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> Add Item
              </button>
            </>
          )}
          {tab === 'warehouses' && <button className="btn btn-primary" onClick={() => setShowWarehouseCreate(true)}><Plus size={16} /> Add Warehouse</button>}
          {tab === 'stock' && <button className="btn btn-primary" onClick={() => setShowMovement(true)}><Plus size={16} /> Stock Movement</button>}
        </div>
      }
    >
      <div className="labour-tab-bar" style={{ background: 'transparent', padding: 0 }}>
        <button className={`labour-tab ${tab === 'items' ? 'act' : ''}`} onClick={() => setTab('items')}>Materials</button>
        <button className={`labour-tab ${tab === 'warehouses' ? 'act' : ''}`} onClick={() => setTab('warehouses')}>Warehouses</button>
        <button className={`labour-tab ${tab === 'stock' ? 'act' : ''}`} onClick={() => setTab('stock')}>Stock Levels</button>
        <button className={`labour-tab ${tab === 'history' ? 'act' : ''}`} onClick={() => setTab('history')}>Stock History</button>
        <div style={{ flex: 1 }} />
        {tab !== 'stock' && (
          <div className="search-input-wrapper" style={{ height: 30, marginRight: 10 }}>
            <Search size={14} />
            <input className="form-input" style={{ height: 30, fontSize: 11 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
      </div>

      <div style={{ height: 16 }} />

      {loading ? (
        <div className="page-loader"><div className="spinner spinner-lg"></div></div>
      ) : tab === 'items' ? (
        <div className="erp-card">
          <table className="erp-tbl">
            <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Unit</th><th>Min Stock</th><th style={{ width: 80 }}></th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td className="prim-cell">{item.name}</td>
                  <td><span className="status-pill p-in">{item.sku || '—'}</span></td>
                  <td>{item.category || '—'}</td>
                  <td>{item.unit}</td>
                  <td>{item.minStock}</td>
                  <td>
                    <div className="flex gap-xs">
                      <button className="ra-btn text-accent" onClick={() => { setEditingItem(item); setShowEdit(true); }}>
                        <Edit2 size={12} />
                      </button>
                      <button className="ra-btn text-danger" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>No items found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : tab === 'warehouses' ? (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Location</th><th>Created</th></tr></thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{w.name}</td>
                  <td>{w.location || '—'}</td>
                  <td className="text-sm">{new Date(w.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={3} className="text-center text-muted" style={{ padding: 'var(--space-2xl)' }}>No warehouses. Add one to begin tracking stock.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : tab === 'history' ? (
        <div className="erp-card" style={{ overflowX: 'auto' }}>
          <table className="erp-tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Material</th>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Destination Project</th>
                <th>Reference / Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td className="text-sm">{new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    {m.type === 'IN' ? (
                      <span className="status-pill p-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ArrowUpRight size={12} /> Stock IN</span>
                    ) : (
                      <span className="status-pill p-dn" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ArrowDownRight size={12} /> Stock OUT</span>
                    )}
                  </td>
                  <td className="prim-cell">{m.inventoryItem?.name || '—'}</td>
                  <td>{m.warehouse?.name || '—'}</td>
                  <td style={{ fontWeight: 600, color: m.type === 'IN' ? 'var(--accent-primary)' : '#ef4444' }}>
                    {m.type === 'IN' ? '+' : ''}{m.quantity} {m.inventoryItem?.unit}
                  </td>
                  <td>{m.project?.name || <span className="text-muted">—</span>}</td>
                  <td>{m.reference || m.notes || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>No stock movements recorded yet</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="erp-card">
          <table className="erp-tbl">
            <thead><tr><th>Material</th><th>Warehouse</th><th>Quantity</th><th>Status</th></tr></thead>
            <tbody>
              {stock.map(s => (
                <tr key={s.id}>
                  <td className="prim-cell">{s.inventoryItem?.name || '—'}</td>
                  <td>{s.warehouse?.name || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{s.quantity} {s.inventoryItem?.unit}</td>
                  <td>
                    {s.quantity <= (s.inventoryItem?.minStock || 0)
                      ? <span className="status-pill p-dn">Low Stock</span>
                      : <span className="status-pill p-ok">In Stock</span>
                    }
                  </td>
                </tr>
              ))}
              {stock.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32 }}>No stock records yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateItemModal onClose={() => setShowCreate(false)} onCreated={loadData} />}
      {showEdit && <EditItemModal item={editingItem} onClose={() => { setShowEdit(false); setEditingItem(null); }} onUpdated={loadData} />}
      {showWarehouseCreate && <CreateWarehouseModal onClose={() => setShowWarehouseCreate(false)} onCreated={loadData} />}
      {showMovement && <StockMovementModal onClose={() => setShowMovement(false)} onDone={loadData} />}
      {showPredefined && <PredefinedListModal onClose={() => setShowPredefined(false)} />}

      <ConfirmModal
        isOpen={deleteConfig.show}
        title="Delete Material"
        message="Are you sure you want to delete this material? This action cannot be undone if the item has no history."
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfig({ show: false, itemId: null })}
        type="danger"
      />
    </PageWrapper>
  );
}

function EditItemModal({ item, onClose, onUpdated }) {
  const [form, setForm] = useState({ 
    name: item?.name || '', 
    sku: item?.sku || '', 
    category: item?.category || '', 
    unit: item?.unit || 'NOS', 
    minStock: item?.minStock || 0 
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.warning('Name is required'); return; }
    try {
      setSubmitting(true);
      await inventoryService.updateItem(item.id, { ...form, minStock: Number(form.minStock) });
      toast.success('Item updated');
      onUpdated(); 
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Edit Material</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g., Cement" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">Unit</label>
                <select className="form-select" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                  <option>NOS</option><option>KG</option><option>MT</option><option>BAG</option><option>SQM</option><option>CUM</option><option>RMT</option><option>LTR</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Min Stock Alert</label><input className="form-input" type="number" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Updating...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateItemModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', sku: '', category: '', unit: 'NOS', minStock: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const predefinedList = getPredefinedMaterials();

  const handleSelectTemplate = (tpl) => {
    setForm({
      name: tpl.name,
      sku: tpl.sku || `SKU-${tpl.name.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      category: tpl.category,
      unit: tpl.unit,
      minStock: form.minStock
    });
    setSearchQuery(tpl.name);
    setShowDropdown(false);
  };

  const filteredTemplates = predefinedList.filter(tpl =>
    tpl.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalName = isCustom ? form.name : searchQuery;
    if (!finalName) { toast.warning('Name is required'); return; }
    try {
      setSubmitting(true);
      await inventoryService.createItem({ ...form, name: finalName, minStock: Number(form.minStock) });
      toast.success('Item created');
      onCreated(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ overflow: 'visible' }}>
        <div className="modal-header"><h3>Add Material</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', overflow: 'visible' }}>
            
            <div className="form-group" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label">Material Name *</label>
                <button type="button" className="btn btn-link btn-xs" onClick={() => { setIsCustom(!isCustom); setSearchQuery(''); setForm({...form, name: ''}); }} style={{ fontSize: '11px', padding: 0 }}>
                  {isCustom ? '← Use Templates List' : '+ Type Custom Name'}
                </button>
              </div>
              
              {isCustom ? (
                <input className="form-input" placeholder="Type custom material name..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
              ) : (
                <>
                  <input className="form-input" placeholder="Search standard templates list..." 
                    value={searchQuery} 
                    onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    autoFocus
                  />
                  {showDropdown && filteredTemplates.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-md)', maxHeight: '180px', overflowY: 'auto', zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
                      {filteredTemplates.map(tpl => (
                        <div key={tpl.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between' }}
                          onMouseDown={() => handleSelectTemplate(tpl)}>
                          <span style={{ fontWeight: 500 }}>{tpl.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{tpl.unit} · {tpl.category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g., Cement" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">Unit</label>
                <select className="form-select" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                  <option>NOS</option><option>KG</option><option>MT</option><option>BAG</option><option>SQM</option><option>CUM</option><option>RMT</option><option>LTR</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Min Stock Alert</label><input className="form-input" type="number" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add Item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateWarehouseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', location: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.warning('Name is required'); return; }
    try { setSubmitting(true); await inventoryService.createWarehouse(form); toast.success('Warehouse added'); onCreated(); onClose(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Add Warehouse</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></div>
            <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add Warehouse'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockMovementModal({ onClose, onDone }) {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ inventoryItemId: '', warehouseId: '', quantity: '', type: 'IN', reference: '', notes: '', projectId: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    inventoryService.getItems().then(r => setItems(r.data?.data || r.data || [])).catch(() => {});
    inventoryService.getWarehouses().then(r => setWarehouses(r.data?.data || r.data || [])).catch(() => {});
    projectService.getAll().then(r => setProjects(r.data?.data || r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.inventoryItemId || !form.warehouseId || !form.quantity) { toast.warning('All fields required'); return; }
    if (form.type === 'OUT' && !form.projectId) { toast.warning('Destination project is required for stock issue'); return; }
    try {
      setSubmitting(true);
      // Backend expects negative quantity for OUT, positive for IN
      const movementQty = form.type === 'OUT' ? -Math.abs(Number(form.quantity)) : Math.abs(Number(form.quantity));
      await inventoryService.processMovement({ 
        ...form, 
        quantity: movementQty,
        projectId: form.type === 'OUT' ? form.projectId : undefined
      });
      toast.success(`Stock ${form.type === 'IN' ? 'received' : 'issued'} successfully`);
      onDone(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Stock Movement</h3><button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group"><label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="IN">Stock IN (Receive)</option><option value="OUT">Stock OUT (Issue)</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Quantity *</label><input className="form-input" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
            </div>
            <div className="form-group"><label className="form-label">Material *</label>
              <select className="form-select" value={form.inventoryItemId} onChange={e => setForm({...form, inventoryItemId: e.target.value})}>
                <option value="">Select material...</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Warehouse *</label>
              <select className="form-select" value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})}>
                <option value="">Select warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            {form.type === 'OUT' && (
              <div className="form-group">
                <label className="form-label">Destination Project *</label>
                <select className="form-select" value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})}>
                  <option value="">Select destination project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group"><label className="form-label">Reference / Notes</label><input className="form-input" value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} placeholder="PO number, challan etc." /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Processing...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Predefined Templates System ──────────────────────────────────────────
const DEFAULT_PREDEFINED_MATERIALS = [
  { id: '1', name: 'Portland Pozzolana Cement (PPC)', category: 'Cement', unit: 'BAG' },
  { id: '2', name: 'OPC 53 Grade Cement', category: 'Cement', unit: 'BAG' },
  { id: '3', name: 'TMT Steel Rebars (12mm)', category: 'Steel', unit: 'MT' },
  { id: '4', name: 'TMT Steel Rebars (10mm)', category: 'Steel', unit: 'MT' },
  { id: '5', name: 'Binding Wire', category: 'Steel', unit: 'KG' },
  { id: '6', name: 'Manufactured Sand (M-Sand)', category: 'Aggregate', unit: 'CUM' },
  { id: '7', name: 'Crushed Stone Aggregate (20mm)', category: 'Aggregate', unit: 'CUM' },
  { id: '8', name: 'AAC Blocks (600x200x200mm)', category: 'Masonry', unit: 'NOS' },
  { id: '9', name: 'Red Clay Bricks', category: 'Masonry', unit: 'NOS' },
  { id: '10', name: 'PVC Plumbing Pipe (1 inch)', category: 'Plumbing', unit: 'RMT' },
  { id: '11', name: 'FR Copper Wire (2.5 sq mm)', category: 'Electrical', unit: 'NOS' }
];

export const getPredefinedMaterials = () => {
  const stored = localStorage.getItem('erp_predefined_materials');
  if (stored) return JSON.parse(stored);
  localStorage.setItem('erp_predefined_materials', JSON.stringify(DEFAULT_PREDEFINED_MATERIALS));
  return DEFAULT_PREDEFINED_MATERIALS;
};

function PredefinedListModal({ onClose }) {
  const [list, setList] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', unit: 'NOS' });
  const [editingId, setEditingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    setList(getPredefinedMaterials());
  }, []);

  const saveToStorage = (newList) => {
    localStorage.setItem('erp_predefined_materials', JSON.stringify(newList));
    setList(newList);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) { toast.warning('Template name is required'); return; }

    if (editingId) {
      const updated = list.map(item => item.id === editingId ? { ...item, ...form } : item);
      saveToStorage(updated);
      toast.success('Template updated successfully');
      setEditingId(null);
    } else {
      const newItem = {
        id: Date.now().toString(),
        name: form.name,
        category: form.category || 'General',
        unit: form.unit
      };
      saveToStorage([...list, newItem]);
      toast.success('New template added successfully');
    }
    setForm({ name: '', category: '', unit: 'NOS' });
    setShowAddForm(false);
  };

  const handleEditClick = (item) => {
    setForm({ name: item.name, category: item.category, unit: item.unit });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = (id) => {
    const updated = list.filter(item => item.id !== id);
    saveToStorage(updated);
    toast.success('Template removed');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        <div className="modal-header">
          <h3>Material Templates List</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            These templates serve as shortcuts when creating materials in your Inventory Catalog. You can add, edit, or remove standard materials from this pre-defined list.
          </p>

          {showAddForm ? (
            <form onSubmit={handleSubmit} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
                {editingId ? 'Edit Material Template' : 'Add New Material Template'}
              </h4>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Template Name *</label>
                <input className="form-input" placeholder="e.g., Cement OPC 53 Grade" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="form-input" placeholder="e.g., Cement" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Standard Unit</label>
                  <select className="form-select" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                    <option>NOS</option><option>KG</option><option>MT</option><option>BAG</option><option>SQM</option><option>CUM</option><option>RMT</option><option>LTR</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-sm">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowAddForm(false); setEditingId(null); setForm({ name: '', category: '', unit: 'NOS' }); }}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">{editingId ? 'Save Changes' : 'Add Template'}</button>
              </div>
            </form>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(true)} style={{ alignSelf: 'flex-start' }}>
              + Add New Material Template
            </button>
          )}

          <div style={{ border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table className="erp-tbl" style={{ margin: 0, fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th style={{ width: '80px' }}></th>
                </tr>
              </thead>
              <tbody>
                {list.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.unit}</td>
                    <td>
                      <div className="flex gap-xs justify-end">
                        <button className="btn btn-icon btn-ghost btn-xs text-accent" onClick={() => handleEditClick(item)}>
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-icon btn-ghost btn-xs text-danger" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No templates in your list.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
