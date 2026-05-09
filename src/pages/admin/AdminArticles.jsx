import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2, FileText, Eye } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';

const AdminArticles = () => {
  const [articles, setArticles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/wedding-app/api/articles');
      const data = await response.json();
      setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  const handleSubmit = async (articleData) => {
    try {
      const url = editingArticle 
        ? `https://api-inventory.isavralabel.com/wedding-app/api/articles/${editingArticle.id}`
        : 'https://api-inventory.isavralabel.com/wedding-app/api/articles';
      
      const method = editingArticle ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(articleData),
      });

      if (response.ok) {
        fetchArticles();
        setShowModal(false);
        setEditingArticle(null);
        toast.success('Artikel berhasil disimpan!');
      } else {
        toast.error('Error menyimpan artikel');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menyimpan artikel');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus artikel ini?</span>
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
      const response = await fetch(`https://api-inventory.isavralabel.com/wedding-app/api/articles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchArticles();
        toast.success('Artikel berhasil dihapus!');
      } else {
        toast.error('Error menghapus artikel');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus artikel');
    }
  };

  return (
    <>
      <Helmet>
        <title>Kelola Artikel - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className=" text-3xl font-bold text-gray-800 mb-2">Kelola Artikel</h1>
              <p className="text-gray-600">Buat dan kelola tips pernikahan dan artikel blog.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Tambah Artikel Baru
            </button>
          </div>
        </div>

        {/* Articles List */}
        <div className="grid gap-6">
          {articles.map((article) => (
            <div key={article.id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className=" text-xl font-semibold text-gray-800 mb-2">
                    {article.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <span>{new Date(article.created_at).toLocaleDateString()}</span>
                    <span className="mx-2">•</span>
                    <span className="bg-gray-100 px-2 py-1 rounded-full">
                      {article.category || 'Tanpa Kategori'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {article.excerpt || article.content.substring(0, 200) + '...'}
                  </p>
                </div>
                
                {article.image && (
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-24 h-24 object-cover rounded-lg ml-4"
                  />
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditingArticle(article);
                    setShowModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <Trash2 size={16} />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h3 className=" text-2xl text-gray-600 mb-4">Belum Ada Artikel</h3>
            <p className="text-gray-500 mb-6">Mulai berbagi tips pernikahan dan inspirasi dengan pelanggan Anda.</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Buat Artikel Pertama
            </button>
          </div>
        )}

        {/* Article Modal */}
        {showModal && (
          <ArticleModal
            article={editingArticle}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowModal(false);
              setEditingArticle(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
};

const ArticleModal = ({ article, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    title: article?.title || '',
    content: article?.content || '',
    excerpt: article?.excerpt || '',
    image: article?.image || '',
    category: article?.category || 'Tips Pernikahan'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <h3 className=" text-2xl font-bold text-gray-900 mb-6">
              {article ? 'Edit Artikel' : 'Tambah Artikel Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Judul</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Tips Pernikahan">Tips Pernikahan</option>
                    <option value="Perencanaan">Perencanaan</option>
                    <option value="Trend">Trend</option>
                    <option value="Venue">Venue</option>
                    <option value="Dekorasi">Dekorasi</option>
                    <option value="Fotografi">Fotografi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL Gambar</label>
                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ringkasan</label>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Deskripsi singkat artikel..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Konten</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows={12}
                  placeholder="Tulis konten artikel Anda di sini..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {article ? 'Perbarui Artikel' : 'Buat Artikel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminArticles;