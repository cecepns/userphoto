import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Trash2, Save, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { formatRupiah } from '../../utils/formatters';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { apiGet, apiPut } from '../../utils/request';

const AdminFinance = () => {
  const [period, setPeriod] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [accommodationCost, setAccommodationCost] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadSummary = useCallback(async () => {
    const params = new URLSearchParams({ period, year: String(year) });
    if (period === 'monthly') params.set('month', String(month));
    const data = await apiGet(`${API_ENDPOINTS.ADMIN.FINANCE_SUMMARY}?${params}`);
    setSummary(data.data);
  }, [period, year, month]);

  const loadSettings = useCallback(async () => {
    const data = await apiGet(API_ENDPOINTS.ADMIN.FINANCE_SETTINGS);
    setAccommodationCost(Number(data.accommodation_cost || 0));
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const data = await apiGet(`${API_ENDPOINTS.ADMIN.FINANCE_ORDERS}?${params}`);
      setOrders(data.data || []);
      setPagination((p) => ({ ...p, ...data.pagination }));
    } catch (e) {
      toast.error(e.message || 'Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch]);

  useEffect(() => {
    loadSummary().catch((e) => toast.error(e.message));
    loadSettings().catch(() => {});
  }, [loadSummary, loadSettings]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const saveSettings = async () => {
    try {
      await apiPut(API_ENDPOINTS.ADMIN.FINANCE_SETTINGS, {
        accommodation_cost: Number(accommodationCost),
      });
      toast.success('Biaya akomodasi disimpan');
      setShowSettings(false);
      loadSummary();
      loadOrders();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const openEdit = (row) => {
    setEditRow({
      ...row,
      production_items: row.production_items?.length
        ? row.production_items.map((i) => ({ label: i.label, amount: i.amount }))
        : [{ label: '', amount: '' }],
    });
  };

  const saveFinancial = async () => {
    try {
      await apiPut(API_ENDPOINTS.ADMIN.FINANCE_ORDERS, {
        order_source: editRow.order_source,
        order_id: editRow.order_id,
        accommodation_applied: editRow.accommodation_applied,
        notes: editRow.notes,
        production_items: editRow.production_items
          .filter((i) => i.label?.trim())
          .map((i) => ({ label: i.label, amount: Number(i.amount) || 0 })),
      });
      toast.success('Catatan keuangan disimpan');
      setEditRow(null);
      loadOrders();
      loadSummary();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      <Helmet>
        <title>Catatan Keuangan - Admin</title>
      </Helmet>
      <AdminLayout>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Catatan Keuangan</h1>
            <p className="text-gray-600">Pendapatan, biaya produksi, dan pendapatan bersih.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg"
          >
            <Settings size={18} />
            Biaya Akomodasi
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Periode</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border rounded-lg px-3 py-2"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {period === 'monthly' && (
            <div>
              <label className="text-sm text-gray-600 block mb-1">Bulan</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="border rounded-lg px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('id-ID', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {summary && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Uang Masuk</p>
              <p className="text-2xl font-bold">{formatRupiah(summary.grossIncome)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-orange-500">
              <p className="text-sm text-gray-500">Biaya Produksi</p>
              <p className="text-2xl font-bold">{formatRupiah(summary.productionTotal)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-amber-500">
              <p className="text-sm text-gray-500">Akomodasi</p>
              <p className="text-2xl font-bold">{formatRupiah(summary.accommodationTotal)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-primary-500">
              <p className="text-sm text-gray-500">Bersih</p>
              <p className="text-2xl font-bold">{formatRupiah(summary.netIncome)}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <input
              type="search"
              placeholder="Cari client / paket..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="border rounded-lg px-3 py-2 w-full sm:max-w-xs"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Paket</th>
                  <th className="px-4 py-3 text-right">Masuk</th>
                  <th className="px-4 py-3 text-right">Pengeluaran</th>
                  <th className="px-4 py-3 text-right">Bersih</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Memuat...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Tidak ada data</td></tr>
                ) : (
                  orders.map((row) => (
                    <tr key={`${row.order_source}-${row.order_id}`} className="border-t">
                      <td className="px-4 py-3">{row.client_name}</td>
                      <td className="px-4 py-3">{row.package_name || '-'}</td>
                      <td className="px-4 py-3 text-right">{formatRupiah(row.gross_amount)}</td>
                      <td className="px-4 py-3 text-right">
                        {formatRupiah(row.production_total + row.accommodation_cost)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatRupiah(row.net_amount)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-primary-600 hover:underline"
                        >
                          Kelola biaya
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 flex justify-between items-center border-t">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-sm text-gray-600">
              Halaman {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Biaya Akomodasi (per pesanan)</h3>
              <input
                type="number"
                min={0}
                value={accommodationCost}
                onChange={(e) => setAccommodationCost(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowSettings(false)} className="px-4 py-2 border rounded-lg">Batal</button>
                <button type="button" onClick={saveSettings} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Simpan</button>
              </div>
            </div>
          </div>
        )}

        {editRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 my-8">
              <h3 className="text-lg font-semibold mb-2">Biaya Produksi — {editRow.client_name}</h3>
              <p className="text-sm text-gray-500 mb-4">
                Pendapatan: {formatRupiah(editRow.gross_amount)}
              </p>
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={editRow.accommodation_applied}
                  onChange={(e) => setEditRow({ ...editRow, accommodation_applied: e.target.checked })}
                />
                <span className="text-sm">Terapkan biaya akomodasi</span>
              </label>
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium">Rincian pengeluaran</p>
                {editRow.production_items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      placeholder="Contoh: Video"
                      value={item.label}
                      onChange={(e) => {
                        const next = [...editRow.production_items];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setEditRow({ ...editRow, production_items: next });
                      }}
                      className="flex-1 border rounded-lg px-3 py-2"
                    />
                    <input
                      type="number"
                      placeholder="Jumlah"
                      value={item.amount}
                      onChange={(e) => {
                        const next = [...editRow.production_items];
                        next[idx] = { ...next[idx], amount: e.target.value };
                        setEditRow({ ...editRow, production_items: next });
                      }}
                      className="w-32 border rounded-lg px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = editRow.production_items.filter((_, i) => i !== idx);
                        setEditRow({ ...editRow, production_items: next.length ? next : [{ label: '', amount: '' }] });
                      }}
                      className="p-2 text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setEditRow({
                    ...editRow,
                    production_items: [...editRow.production_items, { label: '', amount: '' }],
                  })}
                  className="text-sm text-primary-600 flex items-center gap-1"
                >
                  <Plus size={16} /> Tambah item
                </button>
              </div>
              <textarea
                placeholder="Catatan"
                value={editRow.notes || ''}
                onChange={(e) => setEditRow({ ...editRow, notes: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mb-4"
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setEditRow(null)} className="px-4 py-2 border rounded-lg">Batal</button>
                <button type="button" onClick={saveFinancial} className="px-4 py-2 bg-primary-600 text-white rounded-lg inline-flex items-center gap-2">
                  <Save size={16} /> Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminFinance;
