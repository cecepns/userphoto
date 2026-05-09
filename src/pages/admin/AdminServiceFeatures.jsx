import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import AdminLayout from "../../components/AdminLayout";
import { Edit, Trash2 } from "lucide-react";

const AdminServiceFeatures = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "",
    sort_order: 0,
  });

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        "https://api-inventory.isavralabel.com/wedding-app/api/service-features",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFeatures(data);
      } else {
        toast.error("Gagal memuat data fitur layanan");
      }
    } catch (error) {
      console.error("Error fetching features:", error);
      toast.error("Error memuat data fitur layanan");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("adminToken");
      const url = editingFeature
        ? `https://api-inventory.isavralabel.com/wedding-app/api/service-features/${editingFeature.id}`
        : "https://api-inventory.isavralabel.com/wedding-app/api/service-features";

      const method = editingFeature ? "PUT" : "POST";
      const body = editingFeature ? { ...formData, is_active: true } : formData;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(
          editingFeature
            ? "Fitur layanan berhasil diperbarui"
            : "Fitur layanan berhasil ditambahkan"
        );
        setShowModal(false);
        setEditingFeature(null);
        setFormData({ title: "", description: "", icon: "", sort_order: 0 });
        fetchFeatures();
      } else {
        toast.error("Gagal menyimpan fitur layanan");
      }
    } catch (error) {
      console.error("Error saving feature:", error);
      toast.error("Error menyimpan fitur layanan");
    }
  };

  const handleEdit = (feature) => {
    setEditingFeature(feature);
    setFormData({
      title: feature.title,
      description: feature.description || "",
      icon: feature.icon || "",
      sort_order: feature.sort_order || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm("Apakah Anda yakin ingin menghapus fitur layanan ini?")
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `https://api-inventory.isavralabel.com/wedding-app/api/service-features/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Fitur layanan berhasil dihapus");
        fetchFeatures();
      } else {
        toast.error("Gagal menghapus fitur layanan");
      }
    } catch (error) {
      console.error("Error deleting feature:", error);
      toast.error("Error menghapus fitur layanan");
    }
  };

  const handleAddNew = () => {
    setEditingFeature(null);
    setFormData({ title: "", description: "", icon: "", sort_order: 0 });
    setShowModal(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Kelola Fitur Layanan - Admin Dashboard</title>
      </Helmet>

      <AdminLayout>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Kelola Fitur Layanan
            </h1>
            <button
              onClick={handleAddNew}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Tambah Fitur Baru
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-16">Urutan</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-16">Icon</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Judul</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Deskripsi</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {features.map((feature, idx) => (
                    <tr
                      key={feature.id}
                      className={`transition-colors duration-150 hover:bg-[#2f4274]/[0.04] ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {feature.sort_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-2xl">{feature.icon}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {feature.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        {feature.description ? (
                          <span className="truncate block" title={feature.description}>
                            {feature.description}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          feature.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {feature.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(feature)}
                            className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20 transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(feature.id)}
                            className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={() => setShowModal(false)}
              ></div>

              <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                <div className="px-6 py-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingFeature
                        ? "Edit Fitur Layanan"
                        : "Tambah Fitur Layanan"}
                    </h3>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Judul Fitur
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deskripsi (Opsional)
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon (Emoji)
                      </label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) =>
                          setFormData({ ...formData, icon: e.target.value })
                        }
                        placeholder="📋"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Urutan
                      </label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sort_order: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        {editingFeature ? "Update" : "Simpan"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminServiceFeatures;
