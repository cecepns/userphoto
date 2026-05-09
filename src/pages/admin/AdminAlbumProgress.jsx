import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AsyncSelect from 'react-select/async';
import { Edit, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { formatDate } from '../../utils/formatters';

const API_BASE = 'https://api-inventory.isavralabel.com/wedding-app';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'selesai', label: 'Selesai' },
];

const formatStatusLabel = (s) =>
  STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

/** @param {{ id: unknown, source: string, name?: string }} order */
function buildSelectedOption(order) {
  const isCustom = order.source === 'custom_request';
  const prefix = isCustom ? 'C' : '';
  const tag = isCustom ? 'Custom' : 'Pesan biasa';
  return {
    value: isCustom ? `custom:${order.id}` : `order:${order.id}`,
    label: `#${prefix}${order.id} — ${order.name || '-'} (${tag})`,
    order,
  };
}

const AdminAlbumProgress = () => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedOrderOpt, setSelectedOrderOpt] = useState(null);
  const [form, setForm] = useState({
    status: 'pending',
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
      const response = await fetch(`${API_BASE}/api/album-progress?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Gagal memuat data');
      setItems(data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total ?? 0,
        totalPages: data.pagination?.totalPages ?? 1,
      }));
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, q]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const loadOrderOptions = async (inputValue) => {
    const response = await fetch(
      `${API_BASE}/api/orders/search?q=${encodeURIComponent(inputValue || '')}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      }
    );
    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => {
      const isCustom = row.order_source === 'custom_request';
      const datePart = row.wedding_date ? formatDate(row.wedding_date) : '-';
      const svc = row.service_name || (isCustom ? 'Layanan custom' : '-');
      const prefix = isCustom ? 'C' : '';
      const tag = isCustom ? 'Custom' : 'Pesan biasa';
      return {
        value: isCustom ? `custom:${row.id}` : `order:${row.id}`,
        label: `#${prefix}${row.id} — ${row.name || '-'} — ${svc} (${tag}) (${datePart})`,
        order: {
          id: row.id,
          source: isCustom ? 'custom_request' : 'order',
          name: row.name,
        },
      };
    });
  };

  const openCreate = async () => {
    setEditingId(null);
    setForm({ status: 'pending', estimated_completion: '', album_link: '' });
    setSelectedOrderOpt(null);
    setShowModal(true);
    await loadOrderOptions('');
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      status: row.status || 'pending',
      estimated_completion: row.estimated_completion
        ? String(row.estimated_completion).slice(0, 10)
        : '',
      album_link: row.album_link || '',
    });
    const opt = buildSelectedOption({
      id: row.order_id,
      source: row.order_source,
      name: row.client_name,
    });
    setSelectedOrderOpt(opt);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingId && !selectedOrderOpt?.order) {
      toast.error('Pilih pesanan terlebih dahulu');
      return;
    }
    const token = localStorage.getItem('admin_token');
    try {
      if (editingId) {
        const response = await fetch(`${API_BASE}/api/album-progress/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: form.status,
            estimated_completion: form.estimated_completion || null,
            album_link: form.album_link || null,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'Gagal menyimpan');
        toast.success('Progress album diperbarui');
      } else {
        const { source, id } = selectedOrderOpt.order;
        const response = await fetch(`${API_BASE}/api/album-progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            order_source: source,
            order_id: id,
            status: form.status,
            estimated_completion: form.estimated_completion || null,
            album_link: form.album_link || null,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'Gagal menyimpan');
        toast.success(data?.message || 'Progress album dibuat');
      }
      setShowModal(false);
      fetchList();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus progress album ini?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/album-progress/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Gagal menghapus');
      toast.success('Dihapus');
      fetchList();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus');
    }
  };

  return (
    <>
      <Helmet>
        <title>Progress Album - Dashboard Admin Chekusphoto</title>
      </Helmet>
      <Toaster position="top-right" />
      <AdminLayout>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Progress Album</h1>
            <p className="text-gray-600 text-sm">
              Hubungkan ke pesanan (biasa / custom request), status produksi album, dan link album untuk klien.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Tambah
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Cari</label>
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="ID, nama, HP, email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Pesanan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Klien</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Estimasi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Link</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      Memuat…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      Belum ada data progress album
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => {
                    const tag = row.order_source === 'custom_request' ? 'C' : '';
                    const typeLabel =
                      row.order_source === 'custom_request' ? 'Custom' : 'Biasa';
                    return (
                      <tr
                        key={row.id}
                        className={idx % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}
                      >
                        <td className="px-4 py-3 text-sm">
                          <span className="font-semibold text-gray-900">
                            #{tag}
                            {row.order_id}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">{typeLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          <div className="font-medium">{row.client_name || '-'}</div>
                          <div className="text-xs text-gray-500">{row.client_phone}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                              row.status === 'selesai'
                                ? 'bg-green-100 text-green-800'
                                : row.status === 'diproses'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {formatStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {row.estimated_completion
                            ? formatDate(row.estimated_completion)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-[220px] truncate">
                          {row.album_link ? (
                            <a
                              href={row.album_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline"
                            >
                              Buka link
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row.id)}
                              className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                  }
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.min(p.totalPages, p.page + 1),
                    }))
                  }
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  {editingId ? 'Edit progress album' : 'Tambah progress album'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pesanan {editingId ? '' : '*'}
                  </label>
                  {editingId ? (
                    <p className="text-sm text-gray-800 py-2">
                      {selectedOrderOpt?.label || '-'}
                    </p>
                  ) : (
                    <AsyncSelect
                      cacheOptions
                      defaultOptions
                      loadOptions={loadOrderOptions}
                      value={selectedOrderOpt}
                      onChange={setSelectedOrderOpt}
                      placeholder="Ketik untuk cari (nama, HP, ID, email)…"
                      classNamePrefix="rs"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: 42,
                          borderRadius: 8,
                          borderColor: '#d1d5db',
                        }),
                      }}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status album *
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    required
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimasi selesai (opsional)
                  </label>
                  <input
                    type="date"
                    value={form.estimated_completion}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, estimated_completion: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link album (opsional)
                  </label>
                  <input
                    type="text"
                    value={form.album_link}
                    onChange={(e) => setForm((f) => ({ ...f, album_link: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="https://…"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn-primary px-4 py-2">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminAlbumProgress;
