import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';

const AdminPayments = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/wedding-app/api/payment-methods');
      const data = await response.json();
      setPaymentMethods(data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handleSubmit = async (methodData) => {
    try {
      const url = editingMethod 
        ? `https://api-inventory.isavralabel.com/wedding-app/api/payment-methods/${editingMethod.id}`
        : 'https://api-inventory.isavralabel.com/wedding-app/api/payment-methods';
      
      const method = editingMethod ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(methodData),
      });

      if (response.ok) {
        fetchPaymentMethods();
        setShowModal(false);
        setEditingMethod(null);
        toast.success('Metode pembayaran berhasil disimpan!');
      } else {
        toast.error('Error menyimpan metode pembayaran');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menyimpan metode pembayaran');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus metode pembayaran ini?</span>
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
      const response = await fetch(`https://api-inventory.isavralabel.com/wedding-app/api/payment-methods/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchPaymentMethods();
        toast.success('Metode pembayaran berhasil dihapus!');
      } else {
        toast.error('Error menghapus metode pembayaran');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus metode pembayaran');
    }
  };

  const getMethodIcon = (type) => {
    switch (type) {
      case 'bank':
        return '🏦';
      case 'qris':
        return '📱';
      case 'ewallet':
        return '💳';
      default:
        return '💰';
    }
  };

  return (
    <>
      <Helmet>
        <title>Metode Pembayaran - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className=" text-3xl font-bold text-gray-800 mb-2">Metode Pembayaran</h1>
              <p className="text-gray-600">Kelola opsi pembayaran untuk transaksi pelanggan.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
            >
              Tambah Metode Pembayaran
            </button>
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paymentMethods.map((method) => (
            <div key={method.id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{getMethodIcon(method.type)}</div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">{method.name}</h3>
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
                      {method.type}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingMethod(method);
                      setShowModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              {method.account_number && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600">Nomor Rekening:</p>
                  <p className="font-mono text-gray-800">{method.account_number}</p>
                </div>
              )}

              {method.details && (
                <div>
                  <p className="text-sm text-gray-600">Detail:</p>
                  <p className="text-gray-800">{method.details}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {paymentMethods.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">💳</div>
            <h3 className=" text-2xl text-gray-600 mb-4">Belum Ada Metode Pembayaran</h3>
            <p className="text-gray-500 mb-6">Tambahkan metode pembayaran pertama Anda untuk mulai menerima pembayaran.</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
            >
              Tambah Metode Pembayaran
            </button>
          </div>
        )}

        {/* Payment Method Modal */}
        {showModal && (
          <PaymentMethodModal
            method={editingMethod}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowModal(false);
              setEditingMethod(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
};

const PaymentMethodModal = ({ method, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    type: method?.type || 'bank',
    name: method?.name || '',
    account_number: method?.account_number || '',
    details: method?.details || ''
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

        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <h3 className=" text-2xl font-bold text-gray-900 mb-6">
              {method ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Pembayaran</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="bank">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                  <option value="ewallet">E-Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.type === 'bank' ? 'Nama Bank' : 
                   formData.type === 'qris' ? 'Penyedia QRIS' : 'Nama E-Wallet'}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder={formData.type === 'bank' ? 'e.g., Bank Central Asia' : 
                             formData.type === 'qris' ? 'e.g., QRIS Payment' : 'e.g., GoPay'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {formData.type !== 'qris' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.type === 'bank' ? 'Nomor Rekening' : 'Nomor Telepon'}
                  </label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleInputChange}
                    placeholder={formData.type === 'bank' ? '1234567890' : '081234567890'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detail Tambahan
                </label>
                <textarea
                  name="details"
                  value={formData.details}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder={formData.type === 'bank' ? 'Nama rekening: WeddingBliss Indonesia' : 
                             formData.type === 'qris' ? 'Instruksi untuk pembayaran QRIS' : 
                             'Instruksi tambahan'}
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
                  {method ? 'Perbarui Metode' : 'Tambah Metode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;