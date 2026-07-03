import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AsyncSelect from 'react-select/async';
import { Edit, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { formatDate } from '../../utils/formatters';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/request';
import {
  PHOTO_STATUS_OPTIONS,
  VIDEO_STATUS_OPTIONS,
  formatPhotoStatus,
  formatVideoStatus,
} from '../../constants/orderProgress';

// Status yang termasuk kategori "Progres"
const PROGRESS_PHOTO_STATUSES = ['photo_progress', 'editing', 'draft_album', 'printing', 'shipping'];
const PROGRESS_VIDEO_STATUSES = ['video_progress', 'processing', 'revision'];

const FILTER_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'progress', label: 'Progres' },
  { id: 'done', label: 'Selesai' },
];

const AdminOrderProgress = () => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedOrderOpt, setSelectedOrderOpt] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [form, setForm] = useState({
    photo_status: 'photo_progress',
    video_status: 'video_progress',
    photo_link: '',
    video_link: '',
    album_status: 'pending',
    estimated_completion: '',
    album_link: '',
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

  // Filter items berdasarkan tab aktif
  const filteredItems = items.filter((row) => {
    if (activeFilter === 'all') return true;
    const photoInProgress = PROGRESS_PHOTO_STATUSES.includes(row.photo_status);
    const videoInProgress = PROGRESS_VIDEO_STATUSES.includes(row.video_status);
    const photoDone = row.photo_status === 'completed';
    const videoDone = row.video_status === 'completed';
    if (activeFilter === 'progress') {
      return photoInProgress || videoInProgress;
    }
    if (activeFilter === 'done') {
      return photoDone && videoDone;
    }
    return true;
  });

  const loadOrderOptions = async (inputValue) => {
    const data = await apiGet(`${API_ENDPOINTS.ORDERS.SEARCH}?q=${encodeURIComponent(inputValue || '')}`);
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
      album_status: 'pending',
      estimated_completion: '',
      album_link: '',
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
      album_status: row.album_status || 'pending',
      estimated_completion: row.estimated_completion ? String(row.estimated_completion).slice(0, 10) : '',
      album_link: row.album_link || '',
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

  const getStatusBadgeColor = (status, type) => {
    if (status === 'completed') return 'bg-green-100 text-green-800';
    if (type === 'photo' && PROGRESS_PHOTO_STATUSES.includes(status)) return 'bg-blue-100 text-blue-800';
    if (type === 'video' && PROGRESS_VIDEO_STATUSES.includes(status)) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <>
      <Helmet><title>Progress Pesanan - Admin</title></Helmet>
      <AdminLayout>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Progress Pesanan</h1>
            <p className="text-gray-600">Status progres foto &amp; video per pesanan.</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg">
            <Plus size={18} /> Tambah Progress
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {FILTER_TABS.map((tab) => {
            const count = items.filter((row) => {
              if (tab.id === 'all') return true;
              const photoInProg = PROGRESS_PHOTO_STATUSES.includes(row.photo_status);
              const videoInProg = PROGRESS_VIDEO_STATUSES.includes(row.video_status);
              const photoDone = row.photo_status === 'completed';
              const videoDone = row.video_status === 'completed';
              if (tab.id === 'progress') return photoInProg || videoInProg;
              if (tab.id === 'done') return photoDone && videoDone;
              return true;
            }).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeFilter === tab.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
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
                <th className="px-4 py-3 text-left">Status Album</th>
                <th className="px-4 py-3">Aksi</th>

              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center">Memuat...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">

                  {activeFilter === 'progress' ? 'Tidak ada pesanan yang sedang progres' :
                   activeFilter === 'done' ? 'Tidak ada pesanan yang selesai' : 'Belum ada data'}
                </td></tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.client_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(row.photo_status, 'photo')}`}>
                        {formatPhotoStatus(row.photo_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(row.video_status, 'video')}`}>
                        {formatVideoStatus(row.video_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.photo_link && <a href={row.photo_link} target="_blank" rel="noreferrer" className="text-primary-600 block hover:underline">📷 Foto</a>}
                      {row.video_link && <a href={row.video_link} target="_blank" rel="noreferrer" className="text-primary-600 block hover:underline">🎬 Video</a>}
                      {row.album_link && <a href={row.album_link} target="_blank" rel="noreferrer" className="text-primary-600 block hover:underline">📖 Album</a>}
                      {!row.photo_link && !row.video_link && !row.album_link && <span className="text-gray-400">–</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        row.album_status === 'selesai'
                          ? 'bg-green-100 text-green-800'
                          : row.album_status === 'diproses'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {row.album_status === 'selesai' ? 'Selesai' : row.album_status === 'diproses' ? 'Diproses' : 'Pending'}
                      </span>
                      {row.estimated_completion && (
                        <p className="text-[10px] text-gray-500 mt-1">Est: {formatDate(row.estimated_completion)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 flex gap-2 justify-center">
                      <button type="button" onClick={() => openEdit(row)} className="text-primary-600 p-1 rounded hover:bg-primary-50"><Edit size={18} /></button>
                      <button type="button" onClick={() => handleDelete(row.id)} className="text-red-600 p-1 rounded hover:bg-red-50"><Trash2 size={18} /></button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.total > pagination.limit && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Total: {pagination.total} data</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              <span className="px-3 py-1">Hal {pagination.page}/{pagination.totalPages}</span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}

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
                  <label className="text-sm font-medium">Status Album</label>
                  <select
                    value={form.album_status}
                    onChange={(e) => setForm({ ...form, album_status: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="diproses">Diproses</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Estimasi Selesai (Album)</label>
                  <input
                    type="date"
                    value={form.estimated_completion}
                    onChange={(e) => setForm({ ...form, estimated_completion: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Link Foto</label>
                  <input
                    type="url"
                    value={form.photo_link}
                    onChange={(e) => setForm({ ...form, photo_link: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Link Video</label>
                  <input
                    type="url"
                    value={form.video_link}
                    onChange={(e) => setForm({ ...form, video_link: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Link Album</label>
                  <input
                    type="url"
                    value={form.album_link}
                    onChange={(e) => setForm({ ...form, album_link: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder="https://..."
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
