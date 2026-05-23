import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { apiGet, apiPost, apiDelete } from '../../utils/request';

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const data = await apiGet(API_ENDPOINTS.VENDORS.ALL);
      setVendors(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await apiPost(API_ENDPOINTS.VENDORS.CREATE, { name: name.trim() });
      toast.success('Vendor ditambahkan');
      setName('');
      fetchVendors();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Nonaktifkan vendor?')) return;
    try {
      await apiDelete(API_ENDPOINTS.VENDORS.DELETE(id));
      toast.success('Vendor dinonaktifkan');
      fetchVendors();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Helmet><title>Daftar Vendor - Admin</title></Helmet>
      <AdminLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Daftar Vendor</h1>
          <p className="text-gray-600">Kelola nama vendor untuk filter kalender & penugasan pesanan.</p>
        </div>

        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama vendor baru"
            className="flex-1 border rounded-lg px-3 py-2"
            required
          />
          <button type="submit" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg">
            <Plus size={18} /> Tambah Vendor
          </button>
        </form>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center">Memuat...</td></tr>
              ) : vendors.filter((v) => v.is_active).map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-4 py-3">{v.name}</td>
                  <td className="px-4 py-3 text-green-600">Aktif</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleDelete(v.id)} className="text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminVendors;
