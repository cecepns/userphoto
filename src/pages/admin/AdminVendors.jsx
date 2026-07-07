import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/request';
 
const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
 
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
      setShowAddModal(false);
      fetchVendors();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleOpenEdit = (vendor) => {
    setEditingVendor(vendor);
    setEditName(vendor.name);
    setEditIsActive(vendor.is_active !== false && vendor.is_active !== 0);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await apiPut(API_ENDPOINTS.VENDORS.UPDATE(editingVendor.id), {
        name: editName.trim(),
        is_active: editIsActive,
      });
      toast.success('Vendor diperbarui');
      setShowEditModal(false);
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
        <div className="mb-6 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Daftar Vendor</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            <Plus size={18} /> Tambah Vendor
          </button>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Tambah Vendor</h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Vendor *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama vendor baru"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && editingVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Edit Vendor</h2>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Vendor *</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nama vendor"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="editIsActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Vendor Aktif
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center">Memuat...</td></tr>
              ) : vendors.map((v) => {
                const isActive = v.is_active !== false && v.is_active !== 0;
                return (
                  <tr key={v.id} className="border-t">
                    <td className="px-4 py-3">{v.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-3">
                        <button type="button" onClick={() => handleOpenEdit(v)} className="text-primary-600 hover:text-primary-900">
                          <Edit size={18} />
                        </button>
                        {isActive && (
                          <button type="button" onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminVendors;
