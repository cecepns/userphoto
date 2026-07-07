import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import PackageSalesChart from '../../components/admin/PackageSalesChart';
import VendorJobsChart from '../../components/admin/VendorJobsChart';
import ReferenceChart from '../../components/admin/ReferenceChart';
import { formatRupiah, formatDate } from '../../utils/formatters';
import { API_ENDPOINTS, API_BASE } from '../../utils/endpoints';
import { apiGet } from '../../utils/request';
import { X, TrendingUp, Users, Star, DollarSign } from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Modal pembungkus generik
const StatModal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
          <X size={22} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1">{children}</div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({ orders: 0, services: 0, customRequests: 0, revenue: 0 });
  const [packageSales, setPackageSales] = useState([]);
  const [vendorJobs, setVendorJobs] = useState([]);
  const [referenceStats, setReferenceStats] = useState([]);
  const [activeModal, setActiveModal] = useState(null); // 'orders' | 'services' | 'custom' | 'revenue'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());


  // Data untuk masing-masing modal
  const [allOrders, setAllOrders] = useState([]);
  const [activeServices, setActiveServices] = useState([]);
  const [customClients, setCustomClients] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalTotalPages, setModalTotalPages] = useState(1);
  const [modalTotal, setModalTotal] = useState(0);
  const modalLimit = 10;

  useEffect(() => {
    fetchStats();
    fetchPackageSales();
    fetchVendorJobs();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await apiGet(API_ENDPOINTS.AUTH.STATS);
      setStats(data);
      if (data.references) {
        setReferenceStats(data.references);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPackageSales = async () => {
    try {
      const data = await apiGet(API_ENDPOINTS.ADMIN.PACKAGE_SALES);
      setPackageSales(data.data || []);
    } catch (error) {
      console.error('Error fetching package sales:', error);
    }
  };

  const fetchVendorJobs = async () => {
    try {
      const data = await apiGet('/api/admin/vendor-jobs');
      setVendorJobs(data.data || []);
    } catch (error) {
      console.error('Error fetching vendor jobs stats:', error);
    }
  };

  // Fetch data untuk modal Total Pesanan
  const fetchAllOrders = useCallback(async (page) => {
    setModalLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const ordersRes = await fetch(`${API_BASE}/api/orders?page=${page}&limit=${modalLimit}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await ordersRes.json();
      const items = (data.orders || data || []).map(o => ({ ...o, type: 'order' }));
      setAllOrders(items);
      if (data.pagination) {
        setModalTotalPages(data.pagination.totalPages);
        setModalTotal(data.pagination.total);
      } else {
        setModalTotalPages(1);
        setModalTotal(items.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Fetch data untuk modal Layanan Aktif (belum terlaksana)
  const fetchActiveServices = useCallback(async (page) => {
    setModalLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/admin/active-services?page=${page}&limit=${modalLimit}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setActiveServices(data.items || []);
      if (data.pagination) {
        setModalTotalPages(data.pagination.totalPages);
        setModalTotal(data.pagination.total);
      } else {
        setModalTotalPages(1);
        setModalTotal((data.items || []).length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Fetch data untuk modal Permintaan Kustom
  const fetchCustomClients = useCallback(async (page) => {
    setModalLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/custom-requests?page=${page}&limit=${modalLimit}&status=pending`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const items = data.requests || data || [];
      setCustomClients(items);
      if (data.pagination) {
        setModalTotalPages(data.pagination.totalPages);
        setModalTotal(data.pagination.total);
      } else {
        setModalTotalPages(1);
        setModalTotal(items.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Fetch data untuk modal Total Pendapatan
  const fetchRevenueData = useCallback(async (targetYear) => {
    setModalLoading(true);
    try {
      const summaryData = await apiGet(`${API_ENDPOINTS.ADMIN.FINANCE_SUMMARY}?period=yearly&year=${targetYear}`);
      setRevenueData(summaryData.data);
      // Fetch monthly breakdowns
      const months = await Promise.all(
        Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
          apiGet(`${API_ENDPOINTS.ADMIN.FINANCE_SUMMARY}?period=monthly&year=${targetYear}&month=${m}`)
            .then(d => ({ month: MONTH_NAMES[m - 1], value: d.data?.netIncome || 0 }))
            .catch(() => ({ month: MONTH_NAMES[m - 1], value: 0 }))
        )
      );
      setMonthlyRevenue(months);
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const handleOpenModal = (modal) => {
    setActiveModal(modal);
    setModalPage(1);
    if (modal === 'orders') fetchAllOrders(1);
    if (modal === 'services') fetchActiveServices(1);
    if (modal === 'custom') fetchCustomClients(1);
    if (modal === 'revenue') fetchRevenueData(selectedYear);
  };

  const handleModalPageChange = (newPage) => {
    setModalPage(newPage);
    if (activeModal === 'orders') fetchAllOrders(newPage);
    if (activeModal === 'services') fetchActiveServices(newPage);
    if (activeModal === 'custom') fetchCustomClients(newPage);
  };

  const STAT_CARDS = [
    {
      id: 'orders',
      label: 'Total Pesanan',
      value: stats.orders,
      color: 'border-primary-500',
      bg: 'hover:bg-primary-50',
      icon: <Users size={22} className="text-primary-500" />,
      hint: 'Klik untuk lihat semua jadwal',
    },
    {
      id: 'services',
      label: 'Layanan Aktif',
      value: activeServices.length || stats.services,
      color: 'border-secondary-500',
      bg: 'hover:bg-secondary-50',
      icon: <Star size={22} className="text-secondary-500" />,
      hint: 'Klik untuk lihat client belum terlaksana',
    },
    {
      id: 'custom',
      label: 'Permintaan Kustom',
      value: stats.customRequests,
      color: 'border-green-500',
      bg: 'hover:bg-green-50',
      icon: <TrendingUp size={22} className="text-green-500" />,
      hint: 'Klik untuk lihat daftar client kustom',
    },
    {
      id: 'revenue',
      label: 'Pendapatan Bersih',
      value: formatRupiah(stats.revenue),
      color: 'border-purple-500',
      bg: 'hover:bg-purple-50',
      icon: <DollarSign size={22} className="text-purple-500" />,
      hint: 'Klik untuk lihat pendapatan bersih & grafik',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Chekusphoto</title>
      </Helmet>

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Ringkasan bisnis. Klik kartu untuk melihat detail.</p>
        </div>

        {/* Stat Cards — Interaktif */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {STAT_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => handleOpenModal(card.id)}
              className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${card.color} ${card.bg} text-left transition-all duration-150 hover:shadow-xl hover:-translate-y-0.5 group`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">{card.label}</p>
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-400 mt-2 group-hover:text-primary-500 transition-colors">{card.hint} →</p>
            </button>
          ))}
        </div>

      </AdminLayout>


      {/* ====== MODAL: Total Pesanan ====== */}
      {activeModal === 'orders' && (
        <StatModal title="Semua Jadwal Pesanan" onClose={() => setActiveModal(null)}>
          {modalLoading ? (
            <p className="text-center text-gray-500 py-8">Memuat...</p>
          ) : allOrders.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Tidak ada pesanan aktif.</p>
          ) : (
            <>
              <div className="space-y-2">
                {allOrders.map((order, idx) => (
                  <div key={`${order.type}-${order.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <span className="text-xs font-bold text-gray-400 w-6">{((modalPage - 1) * modalLimit) + idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{order.name}</p>
                      <p className="text-xs text-gray-500">{order.service_name || '-'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-primary-600">{formatDate(order.wedding_date)}</p>
                      <div className="flex gap-1 justify-end mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'confirmed' ? 'bg-indigo-100 text-indigo-700' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                          }`}>
                          {order.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {modalTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-xs text-gray-500">
                    Halaman {modalPage} / {modalTotalPages} ({modalTotal} item)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={modalPage <= 1}
                      onClick={() => handleModalPageChange(modalPage - 1)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={modalPage >= modalTotalPages}
                      onClick={() => handleModalPageChange(modalPage + 1)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </StatModal>
      )}

      {/* ====== MODAL: Layanan Aktif ====== */}
      {activeModal === 'services' && (
        <StatModal title="Client Belum Terlaksana" onClose={() => setActiveModal(null)}>
          {modalLoading ? (
            <p className="text-center text-gray-500 py-8">Memuat...</p>
          ) : activeServices.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Semua layanan sudah terlaksana.</p>
          ) : (
            <>
              <div className="space-y-2">
                {activeServices.map((order, idx) => (
                  <div key={`${order.type}-${order.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <span className="text-xs font-bold text-gray-400 w-6">{((modalPage - 1) * modalLimit) + idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{order.name}</p>
                      <p className="text-xs text-gray-500">{order.service_name || '-'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-green-600">{formatDate(order.wedding_date)}</p>
                      <div className="flex gap-1 justify-end mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${order.status === 'confirmed' ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {order.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {modalTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-xs text-gray-500">
                    Halaman {modalPage} / {modalTotalPages} ({modalTotal} item)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={modalPage <= 1}
                      onClick={() => handleModalPageChange(modalPage - 1)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={modalPage >= modalTotalPages}
                      onClick={() => handleModalPageChange(modalPage + 1)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </StatModal>
      )}

      {/* ====== MODAL: Permintaan Kustom ====== */}
      {activeModal === 'custom' && (
        <StatModal title="Client Paket Topping / Custom" onClose={() => setActiveModal(null)}>
          {modalLoading ? (
            <p className="text-center text-gray-500 py-8">Memuat...</p>
          ) : customClients.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Tidak ada permintaan kustom aktif.</p>
          ) : (
            <>
              <div className="space-y-2">
                {customClients.map((req) => (
                  <div key={req.id} className="p-3 rounded-lg border border-amber-100 bg-amber-50 flex items-start gap-3">
                    <span className="mt-0.5 text-amber-500">
                      <Star size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{req.name}</p>
                      <p className="text-xs text-gray-500 truncate">{req.services || '-'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(req.wedding_date)}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-200 text-amber-800 font-medium flex-shrink-0">Custom</span>
                  </div>
                ))}
              </div>
              {modalTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-xs text-gray-500">
                    Halaman {modalPage} / {modalTotalPages} ({modalTotal} item)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={modalPage <= 1}
                      onClick={() => handleModalPageChange(modalPage - 1)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={modalPage >= modalTotalPages}
                      onClick={() => handleModalPageChange(modalPage + 1)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </StatModal>
      )}

      {/* ====== MODAL: Total Pendapatan ====== */}
      {activeModal === 'revenue' && (
        <StatModal title="Laporan Pendapatan" onClose={() => setActiveModal(null)}>
          {modalLoading ? (
            <p className="text-center text-gray-500 py-8">Memuat...</p>
          ) : (
            <div className="space-y-6">
              {revenueData && (
                <div className="bg-purple-600 text-white rounded-2xl p-6 shadow-md border-b-4 border-purple-800 flex flex-col items-center justify-center">
                  <p className="text-sm text-purple-100 font-semibold uppercase tracking-wider mb-1">Pendapatan Bersih ({selectedYear})</p>
                  <p className="text-3xl font-extrabold">{formatRupiah(revenueData.netIncome)}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-gray-800">Grafik Pendapatan Bersih Bulanan</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const prevYear = selectedYear - 1;
                        setSelectedYear(prevYear);
                        fetchRevenueData(prevYear);
                      }}
                      className="px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-bold"
                    >
                      &larr;
                    </button>
                    <span className="text-sm font-bold text-gray-700">{selectedYear}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextYear = selectedYear + 1;
                        setSelectedYear(nextYear);
                        fetchRevenueData(nextYear);
                      }}
                      className="px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-bold"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatRupiah(v)} />
                    <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>


              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Paket Terlaris</h3>
                {packageSales.length === 0 ? (
                  <p className="text-gray-400 text-sm">Belum ada data.</p>
                ) : (
                  <PackageSalesChart data={packageSales} />
                )}
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="font-semibold text-gray-800 mb-3">Vendor Teraktif </h3>
                {vendorJobs.length === 0 ? (
                  <p className="text-gray-400 text-sm">Belum ada data.</p>
                ) : (
                  <VendorJobsChart data={vendorJobs} />
                )}
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="font-semibold text-gray-800 mb-3">Referensi</h3>
                {referenceStats.length === 0 ? (
                  <p className="text-gray-400 text-sm">Belum ada data.</p>
                ) : (
                  <ReferenceChart data={referenceStats} />
                )}
              </div>
            </div>
          )}
        </StatModal>
      )}
    </>
  );
};

export default AdminDashboard;
