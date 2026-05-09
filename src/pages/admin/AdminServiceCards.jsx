import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Edit, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';

const AdminServiceCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: '',
    image_url: '',
    button_text: '',
    button_url: '',
    card_type: 'service',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/wedding-app/api/service-cards', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await response.json();
      setCards(data);
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast.error('Gagal memuat data cards');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingCard 
        ? `https://api-inventory.isavralabel.com/wedding-app/api/service-cards/${editingCard.id}`
        : 'https://api-inventory.isavralabel.com/wedding-app/api/service-cards';
      
      const method = editingCard ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingCard ? 'Card berhasil diperbarui' : 'Card berhasil dibuat');
        setShowModal(false);
        setEditingCard(null);
        resetForm();
        fetchCards();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error saving card:', error);
      toast.error('Gagal menyimpan card');
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setFormData({
      title: card.title || '',
      description: card.description || '',
      icon: card.icon || '',
      image_url: card.image_url || '',
      button_text: card.button_text || '',
      button_url: card.button_url || '',
      card_type: card.card_type || 'service',
      is_active: card.is_active,
      sort_order: card.sort_order || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus card ini?')) return;

    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/wedding-app/api/service-cards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        toast.success('Card berhasil dihapus');
        fetchCards();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Gagal menghapus card');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      icon: '',
      image_url: '',
      button_text: '',
      button_url: '',
      card_type: 'service',
      is_active: true,
      sort_order: 0
    });
  };

  const openCreateModal = () => {
    setEditingCard(null);
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCard(null);
    resetForm();
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
        <title>Kelola Cards - Admin</title>
      </Helmet>

      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Kelola Cards</h1>
              <p className="text-gray-600">Kelola semua jenis cards (Service dan About)</p>
            </div>
            <button
              onClick={openCreateModal}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Tambah Card</span>
            </button>
          </div>

          {/* Cards Table */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-16">Icon</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Judul</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Tipe</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Deskripsi</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-20">Urutan</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {cards.map((card, idx) => (
                    <tr
                      key={card.id}
                      className={`transition-colors duration-150 hover:bg-[#2f4274]/[0.04] ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-2xl">{card.icon}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{card.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          card.card_type === "service" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                        }`}>
                          {card.card_type === "service" ? "Service" : "About"}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm text-gray-600 truncate" title={card.description}>
                          {card.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          card.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {card.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {card.sort_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(card)}
                            className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20 transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(card.id)}
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
                    {editingCard ? 'Edit Card' : 'Tambah Card Baru'}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Judul *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Wedding Package"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({...formData, icon: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Masukan Icon, Contoh : 💒"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Emoji atau icon untuk card
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipe Card *
                      </label>
                      <select
                        value={formData.card_type}
                        onChange={(e) => setFormData({...formData, card_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      >
                        <option value="service">Service Cards</option>
                        <option value="about">About Cards</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Deskripsi layanan..."
                    />
                  </div>

                  {formData.card_type === 'service' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          URL Gambar
                        </label>
                        <input
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="https://example.com/image.jpg"
                        />
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
                            placeholder="Lihat Paket →"
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
                            placeholder="/services"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value={true}>Aktif</option>
                        <option value={false}>Nonaktif</option>
                      </select>
                    </div>

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
                      {editingCard ? 'Perbarui' : 'Buat'} Card
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminServiceCards; 