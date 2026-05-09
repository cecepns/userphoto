import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2, Package, Upload, X, Image as ImageIcon } from 'lucide-react';
import PropTypes from 'prop-types';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { formatRupiah } from '../../utils/formatters';

const API_BASE = 'https://api-inventory.isavralabel.com/wedding-app';
function itemImageUrl(filename) {
  if (!filename || filename.startsWith('http')) return filename || '';
  return `${API_BASE}/uploads-weddingsapp/${filename}`;
}

const AdminItems = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/items`);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/items/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleItemSubmit = async (itemData) => {
    try {
      const url = itemData.id
        ? `${API_BASE}/api/items/${itemData.id}`
        : `${API_BASE}/api/items`;
      
      const method = itemData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        fetchItems();
        setShowItemModal(false);
        toast.success('Item berhasil disimpan!');
      } else {
        const errorData = await response.json();
        toast.error(`Error menyimpan item: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menyimpan item');
    }
  };

  const handleDeleteItem = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus item ini?</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Ya
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
            >
              Tidak
            </button>
          </div>
        </div>
      ), {
        duration: Infinity,
        position: 'top-center',
      });
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE}/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchItems();
        toast.success('Item berhasil dihapus!');
      } else {
        const errorData = await response.json();
        toast.error(`Error menghapus item: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus item');
    }
  };

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  return (
    <>
      <Helmet>
        <title>Kelola Item - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Kelola Item</h1>
              <p className="text-gray-600">Buat dan kelola item-item yang dapat digunakan dalam layanan pernikahan.</p>
            </div>
            <button
              onClick={() => setShowItemModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Tambah Item Baru
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter Kategori:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-16">Gambar</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Nama Item</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Kategori</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Harga</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Package size={32} className="text-gray-300" />
                        <span className="text-sm font-medium">Tidak ada item yang ditemukan</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const images = Array.isArray(item.images) ? item.images : [];
                    const thumb = images[0];
                    return (
                    <tr
                      key={item.id}
                      className={`transition-colors duration-150 hover:bg-[#2f4274]/[0.04] ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {thumb ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                            <img src={itemImageUrl(thumb)} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-[#2f4274]">{formatRupiah(item.price)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          item.is_active !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {item.is_active !== false ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setSelectedItem(item); setShowItemModal(true); }}
                            className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20 transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ); })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Item Modal */}
        {showItemModal && (
          <ItemModal
            item={selectedItem}
            onSubmit={handleItemSubmit}
            onClose={() => {
              setShowItemModal(false);
              setSelectedItem(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
};

const ItemModal = ({ item, onSubmit, onClose }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    category: item?.category || '',
    is_active: item?.is_active !== false,
    images: Array.isArray(item?.images) ? [...item.images] : []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: item?.id,
      price: parseFloat(formData.price),
      images: formData.images
    });
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} bukan gambar. Hanya JPEG, PNG, GIF, WebP.`);
          continue;
        }
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        const res = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
          body: formDataUpload
        });
        const data = await res.json();
        if (data.filename) {
          setFormData((prev) => ({ ...prev, images: [...prev.images, data.filename] }));
        } else {
          toast.error(data.message || 'Upload gagal');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload gagal');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {item ? 'Edit Item' : 'Tambah Item Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Item</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Harga (Rp)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="Contoh: Decoration, Photography, Catering"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gambar</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-3">
                  {formData.images.map((filename, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                        <img src={itemImageUrl(filename)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 hover:opacity-100 shadow"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-primary-600 transition-colors shrink-0"
                  >
                    <Upload size={20} />
                    <span className="text-xs">{uploading ? '...' : 'Tambah'}</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">JPEG, PNG, GIF, WebP. Maks 10MB per file.</p>
              </div>

              {item && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Item Aktif</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {item ? 'Perbarui Item' : 'Buat Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

ItemModal.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.number,
    category: PropTypes.string,
    is_active: PropTypes.bool,
    images: PropTypes.arrayOf(PropTypes.string)
  }),
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default AdminItems; 