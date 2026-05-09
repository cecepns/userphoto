import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2, Image, Star, Eye, EyeOff, Upload } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';

const API_BASE = 'https://api-inventory.isavralabel.com/wedding-app';
function imageUrl(value) {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return `${API_BASE}/uploads-weddingsapp/${value}`;
}

const AdminGallery = () => {
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('images');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Form states
  const [imageForm, setImageForm] = useState({
    title: '',
    description: '',
    image_url: '',
    category_id: '',
    is_featured: false,
    sort_order: 0
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    sort_order: 0
  });

  useEffect(() => {
    fetchImages();
    fetchCategories();
  }, [selectedCategory]);

  const fetchImages = async () => {
    try {
      const url = selectedCategory === 'all' 
        ? `${API_BASE}/api/gallery/images`
        : `${API_BASE}/api/gallery/images?category_id=${selectedCategory}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await response.json();
      setImages(data);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/gallery/categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|png|gif|webp)/.test(file.type)) {
      toast.error('Hanya file gambar (JPEG, PNG, GIF, WebP) yang diizinkan.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData,
      });
      const data = await response.json();
      if (data.filename) {
        setImageForm((prev) => ({ ...prev, image_url: data.filename }));
        toast.success('Gambar berhasil diunggah.');
      } else {
        toast.error(data.message || 'Upload gagal');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload gagal');
    }
    e.target.value = '';
  };

  const handleImageSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingImage 
        ? `${API_BASE}/api/gallery/images/${editingImage.id}`
        : `${API_BASE}/api/gallery/images`;
      
      const method = editingImage ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(imageForm)
      });

      if (response.ok) {
        setShowImageModal(false);
        setEditingImage(null);
        setImageForm({
          title: '',
          description: '',
          image_url: '',
          category_id: '',
          is_featured: false,
          sort_order: 0
        });
        fetchImages();
        toast.success(editingImage ? 'Gambar berhasil diperbarui!' : 'Gambar berhasil ditambahkan!');
      } else {
        toast.error('Error menyimpan gambar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menyimpan gambar');
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingCategory 
        ? `https://api-inventory.isavralabel.com/wedding-app/api/gallery/categories/${editingCategory.id}`
        : 'https://api-inventory.isavralabel.com/wedding-app/api/gallery/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(categoryForm)
      });

      if (response.ok) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCategoryForm({
          name: '',
          description: '',
          sort_order: 0
        });
        fetchCategories();
        toast.success(editingCategory ? 'Kategori berhasil diperbarui!' : 'Kategori berhasil ditambahkan!');
      } else {
        toast.error('Error menyimpan kategori');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menyimpan kategori');
    }
  };

  const handleDeleteImage = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus gambar ini?</span>
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
      const response = await fetch(`${API_BASE}/api/gallery/images/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchImages();
        toast.success('Gambar berhasil dihapus!');
      } else {
        toast.error('Error menghapus gambar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus gambar');
    }
  };

  const handleDeleteCategory = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus kategori ini?</span>
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
      const response = await fetch(`${API_BASE}/api/gallery/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchCategories();
        toast.success('Kategori berhasil dihapus!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Error menghapus kategori');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus kategori');
    }
  };

  const openImageModal = (image = null) => {
    if (image) {
      setEditingImage(image);
      setImageForm({
        title: image.title,
        description: image.description || '',
        image_url: image.image_url,
        category_id: image.category_id || '',
        is_featured: image.is_featured,
        sort_order: image.sort_order || 0
      });
    } else {
      setEditingImage(null);
      setImageForm({
        title: '',
        description: '',
        image_url: '',
        category_id: '',
        is_featured: false,
        sort_order: 0
      });
    }
    setShowImageModal(true);
  };

  const openCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        sort_order: category.sort_order || 0
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        description: '',
        sort_order: 0
      });
    }
    setShowCategoryModal(true);
  };

  return (
    <>
      <Helmet>
        <title>Kelola Galeri - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Kelola Galeri</h1>
          <p className="text-gray-600">Kelola gambar galeri dan kategori untuk website.</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('images')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'images'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Image size={16} />
              Gambar ({images.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'categories'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Star size={16} />
              Kategori ({categories.length})
            </button>
          </div>
        </div>

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            {/* Filter and Add Button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Filter Kategori:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => openImageModal()}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Tambah Gambar
              </button>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image) => (
                <div key={image.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="relative">
                    <img
                      src={imageUrl(image.image_url)}
                      alt={image.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="192"%3E%3Crect fill="%23f3f4f6" width="400" height="192"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EGambar tidak dapat dimuat%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {!!image.is_featured && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        <Star size={12} className="inline mr-1" />
                        Featured
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      {image.is_active ? (
                        <Eye className="text-green-500" size={16} />
                      ) : (
                        <EyeOff className="text-gray-400" size={16} />
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">{image.title}</h3>
                    {image.description && (
                      <p className="text-gray-600 text-sm mb-2">{image.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <span>{image.category_name || 'Tanpa Kategori'}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openImageModal(image)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {images.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-2xl text-gray-600 mb-4">Belum Ada Gambar</h3>
                <p className="text-gray-500">Tambahkan gambar galeri untuk menampilkan portfolio pernikahan Anda.</p>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => openCategoryModal()}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Tambah Kategori
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <div key={category.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">{category.name}</h3>
                      {category.description && (
                        <p className="text-gray-600 text-sm">{category.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {category.is_active ? (
                        <Eye className="text-green-500" size={16} />
                      ) : (
                        <EyeOff className="text-gray-400" size={16} />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>Urutan: {category.sort_order}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openCategoryModal(category)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {categories.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📂</div>
                <h3 className="text-2xl text-gray-600 mb-4">Belum Ada Kategori</h3>
                <p className="text-gray-500">Tambahkan kategori untuk mengorganisir gambar galeri Anda.</p>
              </div>
            )}
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingImage ? 'Edit Gambar' : 'Tambah Gambar Baru'}
              </h2>
              <form onSubmit={handleImageSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Judul</label>
                  <input
                    type="text"
                    value={imageForm.title}
                    onChange={(e) => setImageForm({...imageForm, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                  <textarea
                    value={imageForm.description}
                    onChange={(e) => setImageForm({...imageForm, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gambar</label>
                  {imageForm.image_url && (
                    <div className="mb-2">
                      <img
                        src={imageUrl(imageForm.image_url)}
                        alt="Preview"
                        className="h-24 w-auto rounded-lg border border-gray-200 object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-[#2f4274] text-white rounded-lg cursor-pointer hover:bg-[#2a3b68] text-sm font-medium">
                      <Upload size={16} />
                      Upload dari perangkat
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleUploadFile}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={imageForm.image_url}
                    onChange={(e) => setImageForm({...imageForm, image_url: e.target.value})}
                    placeholder="URL atau pilih upload di atas (filename disimpan)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mt-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    value={imageForm.category_id}
                    onChange={(e) => setImageForm({...imageForm, category_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_featured"
                      checked={imageForm.is_featured}
                      onChange={(e) => setImageForm({...imageForm, is_featured: e.target.checked})}
                      className="mr-2"
                    />
                    <label htmlFor="is_featured" className="text-sm text-gray-700">Featured</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Urutan</label>
                    <input
                      type="number"
                      value={imageForm.sort_order}
                      onChange={(e) => setImageForm({...imageForm, sort_order: parseInt(e.target.value)})}
                      className="w-24 border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingImage ? 'Update' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImageModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h2>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Kategori</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Urutan</label>
                  <input
                    type="number"
                    value={categoryForm.sort_order}
                    onChange={(e) => setCategoryForm({...categoryForm, sort_order: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingCategory ? 'Update' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Batal
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

export default AdminGallery; 