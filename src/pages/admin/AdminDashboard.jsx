import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminLayout from '../../components/AdminLayout';
import { formatRupiah } from '../../utils/formatters';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { apiGet } from '../../utils/request';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    orders: 0,
    services: 0,
    customRequests: 0,
    revenue: 0,
  });
  const [packageSales, setPackageSales] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchPackageSales();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await apiGet(API_ENDPOINTS.AUTH.STATS);
      setStats(data);
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

  const maxCount = Math.max(...packageSales.map((p) => Number(p.order_count) || 0), 1);

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Chekusphoto</title>
      </Helmet>

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Ringkasan bisnis dan paket terlaris.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-primary-500">
            <p className="text-gray-600 text-sm">Total Pesanan</p>
            <p className="text-3xl font-bold text-gray-800">{stats.orders}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-secondary-500">
            <p className="text-gray-600 text-sm">Layanan Aktif</p>
            <p className="text-3xl font-bold text-gray-800">{stats.services}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm">Permintaan Kustom</p>
            <p className="text-3xl font-bold text-gray-800">{stats.customRequests}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <p className="text-gray-600 text-sm">Total Pendapatan</p>
            <p className="text-3xl font-bold text-gray-800">{formatRupiah(stats.revenue)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Grafik Paket Terlaris</h2>
          {packageSales.length === 0 ? (
            <p className="text-gray-500 text-sm">Belum ada data penjualan paket.</p>
          ) : (
            <div className="space-y-4">
              {packageSales.map((pkg) => {
                const count = Number(pkg.order_count) || 0;
                const width = `${Math.round((count / maxCount) * 100)}%`;
                return (
                  <div key={pkg.package_name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate pr-4">{pkg.package_name}</span>
                      <span className="text-gray-500 shrink-0">{count} pesanan · {formatRupiah(pkg.total_revenue)}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Aksi Cepat</h2>
            <div className="space-y-3">
              <a href="/admin/orders" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-primary-50">
                <span className="text-gray-700">Lihat Pesanan</span>
                <span className="text-gray-400">→</span>
              </a>
              <a href="/admin/finance" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-primary-50">
                <span className="text-gray-700">Catatan Keuangan</span>
                <span className="text-gray-400">→</span>
              </a>
              <a href="/admin/order-progress" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-primary-50">
                <span className="text-gray-700">Progress Pesanan</span>
                <span className="text-gray-400">→</span>
              </a>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Menu Baru</h2>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Referensi client (Instagram, TikTok, FB) saat checkout</li>
              <li>• Stempel LUNAS pada invoice jika sudah lunas</li>
              <li>• Kalender vendor & detail acara (PDF)</li>
              <li>• Database freelance inhouse</li>
            </ul>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminDashboard;
