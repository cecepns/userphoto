import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Edit, Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { API_BASE, imageUrl } from '../../utils/imageUrl';

const AdminContent = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    section_name: '',
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    button_text: '',
    button_url: '',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/wedding-app/api/content-sections?is_active=false', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await response.json();
      setSections(data);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Gagal memuat data konten');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingSection 
        ? `https://api-inventory.isavralabel.com/wedding-app/api/content-sections/${editingSection.id}`
        : 'https://api-inventory.isavralabel.com/wedding-app/api/content-sections';
      
      const method = editingSection ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingSection ? 'Konten berhasil diperbarui' : 'Konten berhasil dibuat');
        setShowModal(false);
        setEditingSection(null);
        resetForm();
        fetchSections();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error saving section:', error);
      toast.error('Gagal menyimpan konten');
    }
  };

  const handleEdit = (section) => {
    setEditingSection(section);
    setFormData({
      section_name: section.section_name,
      title: section.title || '',
      subtitle: section.subtitle || '',
      description: section.description || '',
      image_url: section.image_url || '',
      button_text: section.button_text || '',
      button_url: section.button_url || '',
      is_active: section.is_active,
      sort_order: section.sort_order || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus konten ini?')) return;

    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/wedding-app/api/content-sections/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        toast.success('Konten berhasil dihapus');
        fetchSections();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('Gagal menghapus konten');
    }
  };

  const resetForm = () => {
    setFormData({
      section_name: '',
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      button_text: '',
      button_url: '',
      is_active: true,
      sort_order: 0
    });
  };

  const openCreateModal = () => {
    setEditingSection(null);
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSection(null);
    resetForm();
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/image\/(jpeg|png|gif|webp)/.test(file.type)) {
      toast.error('Hanya file gambar (JPEG, PNG, GIF, WebP) yang diizinkan.');
      return;
    }

    const form = new FormData();
    form.append('file', file);

    try {
      setUploadingImage(true);
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: form,
      });

      const data = await response.json();
      if (!response.ok || !data?.filename) {
        toast.error(data?.message || 'Upload gambar gagal');
        return;
      }

      setFormData((prev) => ({ ...prev, image_url: data.filename }));
      toast.success('Gambar berhasil diupload');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Upload gambar gagal');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Kelola Konten - Dashboard Admin</title>
      </Helmet>

      <AdminLayout>
        {/** section khusus untuk branding global */}
        {/** title: nama app, subtitle: nama perusahaan, button_text: inisial, image_url: logo */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Kelola Konten</h1>
              <p className="text-gray-600">Kelola konten dinamis untuk website Anda. Edit section <strong>site_identity</strong> untuk ubah nama aplikasi, nama perusahaan, inisial logo, dan logo utama (isi di field URL Gambar).</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/admin/service-cards"
                className="px-4 py-2 text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-2"
              >
                <Edit size={16} />
                Kelola Service Cards
              </a>
              <button
                onClick={openCreateModal}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                Tambah Konten Baru
              </button>
            </div>
          </div>
        </div>

        {/* Content Sections Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Nama Section</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Judul</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-20">Urutan</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sections.map((section, idx) => (
                  <tr
                    key={section.id}
                    className={`transition-colors duration-150 hover:bg-[#2f4274]/[0.04] ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{section.section_name}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm text-gray-900 truncate" title={section.title}>{section.title}</div>
                      {section.subtitle && (
                        <div className="text-xs text-gray-500 truncate" title={section.subtitle}>{section.subtitle}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        section.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {section.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {section.sort_order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(section)}
                          className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(section.id)}
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingSection ? 'Edit Konten' : 'Tambah Konten Baru'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {(() => {
                  const isSiteIdentity = formData.section_name === 'site_identity';
                  return (
                    <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Section *
                    </label>
                    <input
                      type="text"
                      value={formData.section_name}
                      onChange={(e) => setFormData({...formData, section_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="hero_section"
                      required
                      disabled={!!editingSection}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nama unik untuk section (contoh: hero_section)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Aktif</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Judul Utama
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Hari"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sub Judul
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Pernikahan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Deskripsi section..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Gambar
                  </label>
                    {formData.image_url && (
                      <img
                        src={imageUrl(formData.image_url)}
                        alt="Preview"
                        className="h-24 w-auto rounded-lg border border-gray-200 object-cover mb-3"
                        onError={(ev) => {
                          ev.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-[#2f4274] text-white rounded-lg cursor-pointer hover:bg-[#2a3b68] text-sm font-medium">
                      <Upload size={16} />
                      {uploadingImage ? 'Mengupload...' : 'Upload Gambar'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleUploadImage}
                        disabled={uploadingImage}
                      />
                    </label>
                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mt-2"
                      placeholder={isSiteIdentity ? 'Logo akan diisi dari hasil upload' : 'URL gambar atau filename upload'}
                      readOnly={isSiteIdentity}
                    />
                    {isSiteIdentity && (
                      <p className="text-xs text-gray-500 mt-1">
                        Untuk logo brand, gunakan tombol upload (tanpa input link manual).
                      </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teks Tombol
                    </label>
                    <input
                      type="text"
                      value={formData.button_text}
                      onChange={(e) => setFormData({...formData, button_text: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Konsultasi Gratis"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Tombol
                    </label>
                    <input
                      type="text"
                      value={formData.button_url}
                      onChange={(e) => setFormData({...formData, button_url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="/contact"
                    />
                  </div>
                </div>
                    </>
                  );
                })()}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urutan
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingSection ? 'Perbarui' : 'Buat'} Konten
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

export default AdminContent; 