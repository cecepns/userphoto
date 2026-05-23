import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Eye, Trash2, ChevronLeft, ChevronRight, X, Phone, MessageSquare } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { formatDate } from '../../utils/formatters';

const AdminContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [pagination.page]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://api.kingcreativestudio.my.id/chekusphoto/api/contact-messages?page=${pagination.page}&limit=${pagination.limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await response.json();
      
      // Handle both old format (array) and new format (object with pagination)
      if (Array.isArray(data)) {
        // Old format - no pagination
        setMessages(data);
        setPagination(prev => ({
          ...prev,
          total: data.length,
          totalPages: 1
        }));
      } else {
        // New format - with pagination
        setMessages(data.messages || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1
        }));
      }
    } catch (error) {
      console.error('Error fetching contact messages:', error);
      setMessages([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 1
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
      return;
    }

    try {
      const response = await fetch(`https://api.kingcreativestudio.my.id/chekusphoto/api/contact-messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        toast.success('Pesan berhasil dihapus');
        fetchMessages();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Gagal menghapus pesan');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Gagal menghapus pesan');
    }
  };

  const handleViewDetail = (message) => {
    setSelectedMessage(message);
    setShowDetailModal(true);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatPhone = (phone) => {
    if (!phone) return '-';
    return phone.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
  };

  const formatInstagram = (instagram) => {
    if (!instagram) return '-';
    return instagram.startsWith('@') ? instagram : `@${instagram}`;
  };

  return (
    <>
      <Helmet>
        <title>Pesan Kontak - Admin Chekusphoto</title>
      </Helmet>

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Pesan Kontak</h1>
          <p className="text-gray-600">Kelola pesan kontak dari pengunjung website</p>
        </div>

        {/* Messages Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Pengirim</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Kontak</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Tanggal Konsultasi</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Tanggal Kirim</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="w-10 h-10 border-2 border-[#2f4274]/30 border-t-[#2f4274] rounded-full animate-spin" />
                        <span className="text-sm font-medium">Memuat pesan...</span>
                      </div>
                    </td>
                  </tr>
                ) : messages.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <MessageSquare size={32} className="text-gray-300" />
                        <span className="text-sm font-medium">Belum ada pesan kontak</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  messages.map((message, idx) => (
                    <tr
                      key={message.id}
                      className={`transition-colors duration-150 hover:bg-[#2f4274]/[0.04] ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{message.name}</div>
                        <div className="text-xs text-gray-500">{message.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 space-y-1">
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                            {formatPhone(message.phone)}
                          </div>
                          {message.instagram && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                              {formatInstagram(message.instagram)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {message.consultation_date ? formatDate(message.consultation_date) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(message.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetail(message)}
                            className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20 transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl border border-gray-100 px-6 py-4 shadow-sm border-t border-gray-100">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-800">
                  {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>
                <span className="mx-1">dari</span>
                <span className="font-medium text-gray-800">{pagination.total}</span>
                <span className="ml-1">pesan</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedMessage && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Detail Pesan Kontak</h3>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                      <p className="text-sm text-gray-900">{selectedMessage.name}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-sm text-gray-900">{selectedMessage.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                      <p className="text-sm text-gray-900">{formatPhone(selectedMessage.phone)}</p>
                    </div>

                    {selectedMessage.address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                        <p className="text-sm text-gray-900">{selectedMessage.address}</p>
                      </div>
                    )}

                    {selectedMessage.instagram && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                        <p className="text-sm text-gray-900">{formatInstagram(selectedMessage.instagram)}</p>
                      </div>
                    )}

                    {selectedMessage.consultation_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Konsultasi</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedMessage.consultation_date)}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kirim</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedMessage.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Toaster position="top-right" />
      </AdminLayout>
    </>
  );
};

export default AdminContactMessages; 