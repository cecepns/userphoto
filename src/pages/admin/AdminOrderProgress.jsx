import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AsyncSelect from 'react-select/async';
import { Edit, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { formatDate } from '../../utils/formatters';
import { API_ENDPOINTS, API_BASE } from '../../utils/endpoints';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/request';
import {
  PHOTO_STATUS_OPTIONS,
  VIDEO_STATUS_OPTIONS,
  formatPhotoStatus,
  formatVideoStatus,
} from '../../constants/orderProgress';

const AdminOrderProgress = () => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedOrderOpt, setSelectedOrderOpt] = useState(null);
  const [form, setForm] = useState({
    photo_status: 'photo_progress',
    video_status: 'video_progress',
    photo_link: '',
    video_link: '',
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (q.trim()) params.set('q', q.trim());
      const data = await apiGet(`${API_ENDPOINTS.ORDER_PROGRESS.LIST}?${params}`);
      setItems(data.items || []);
      setPagination((p) => ({
        ...p,
        total: data.pagination?.total ?? 0,
        totalPages: data.pagination?.totalPages ?? 1,
      }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, q]);

  useEffect(() => {
    const t = setTimeout(() => fetchList(), 300);
    return () => clearTimeout(t);
  }, [fetchList]);

  const loadOrderOptions = async (inputValue) => {
    const data = await apiGet(`${API_BASE}/api/orders/search?q=${encodeURIComponent(inputValue || '')}`);
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => {
      const isCustom = row.order_source === 'custom_request';
      const prefix = isCustom ? 'C' : '';
      return {
        value: isCustom ? `custom:${row.id}` : `order:${row.id}`,
        label: `#${prefix}${row.id} — ${row.name || '-'} (${formatDate(row.wedding_date)})`,
        order: { id: row.id, source: isCustom ? 'custom_request' : 'order', name: row.name },
      };
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      photo_status: 'photo_progress',
      video_status: 'video_progress',
      photo_link: '',
      video_link: '',
    });
    setSelectedOrderOpt(null);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      photo_status: row.photo_status,
      video_status: row.video_status,
      photo_link: row.photo_link || '',
      video_link: row.video_link || '',
    });
    const isCustom = row.order_source === 'custom_request';
    setSelectedOrderOpt({
      value: isCustom ? `custom:${row.order_id}` : `order:${row.order_id}`,
      label: `#${isCustom ? 'C' : ''}${row.order_id} — ${row.client_name}`,
      order: { id: row.order_id, source: row.order_source, name: row.client_name },
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiPut(API_ENDPOINTS.ORDER_PROGRESS.UPDATE(editingId), form);
        toast.success('Progress diperbarui');
      } else {
        if (!selectedOrderOpt?.order) {
          toast.error('Pilih pesanan');
          return;
        }
        await apiPost(API_ENDPOINTS.ORDER_PROGRESS.CREATE, {
          order_source: selectedOrderOpt.order.source,
          order_id: selectedOrderOpt.order.id,
          ...form,
        });
        toast.success('Progress dibuat');
      }
      setShowModal(false);
      fetchList();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus progress ini?')) return;
    try {
      await apiDelete(API_ENDPOINTS.ORDER_PROGRESS.DELETE(id));
      toast.success('Dihapus');
      fetchList();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Helmet><title>Progress Pesanan - Admin</title></Helmet>
      <AdminLayout>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Progress Pesanan</h1>
            <p className="text-gray-600">Status progres foto & video per pesanan.</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg">
            <Plus size={18} /> Tambah Progress
          </button>
        </div>

        <input
          type="search"
          placeholder="Cari nama client..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="mb-4 border rounded-lg px-3 py-2 w-full max-w-sm"
        />

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Foto</th>
                <th className="px-4 py-3 text-left">Video</th>
                <th className="px-4 py-3 text-left">Link</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center">Memuat...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Belum ada data</td></tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">{row.client_name}</td>
                    <td className="px-4 py-3">{formatPhotoStatus(row.photo_status)}</td>
                    <td className="px-4 py-3">{formatVideoStatus(row.video_status)}</td>
                    <td className="px-4 py-3 text-xs">
                      {row.photo_link && <a href={row.photo_link} target="_blank" rel="noreferrer" className="text-primary-600 block">Foto</a>}
                      {row.video_link && <a href={row.video_link} target="_blank" rel="noreferrer" className="text-primary-600 block">Video</a>}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button type="button" onClick={() => openEdit(row)} className="text-primary-600"><Edit size={18} /></button>
                      <button type="button" onClick={() => handleDelete(row.id)} className="text-red-600"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit' : 'Tambah'} Progress</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingId && (
                  <div>
                    <label className="text-sm font-medium">Pesanan</label>
                    <AsyncSelect
                      cacheOptions
                      defaultOptions
                      loadOptions={loadOrderOptions}
                      value={selectedOrderOpt}
                      onChange={setSelectedOrderOpt}
                      placeholder="Cari pesanan..."
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Progres Foto</label>
                  <select
                    value={form.photo_status}
                    onChange={(e) => setForm({ ...form, photo_status: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  >
                    {PHOTO_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Progres Video</label>
                  <select
                    value={form.video_status}
                    onChange={(e) => setForm({ ...form, video_status: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  >
                    {VIDEO_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Link Foto</label>
                  <input
                    type="url"
                    value={form.photo_link}
                    onChange={(e) => setForm({ ...form, photo_link: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Link Video</label>
                  <input
                    type="url"
                    value={form.video_link}
                    onChange={(e) => setForm({ ...form, video_link: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminOrderProgress;
