import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import { formatRupiah } from '../utils/formatters';

const CustomServiceModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    wedding_date: '',
    guest_count: '',
    budget: '',
    services: [],
    additional_requests: ''
  });

  const [serviceOptions, setServiceOptions] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchServiceOptions();
    }
  }, [isOpen]);

  const fetchServiceOptions = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/wedding-app/api/items');
      const data = await response.json();
      setServiceOptions(data);
    } catch (error) {
      console.error('Error fetching service options:', error);
      toast.error('Gagal memuat daftar layanan');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleServiceToggle = (service) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service.id)
        ? prev.services.filter(s => s !== service.id)
        : [...prev.services, service.id]
    }));
  };

  const calculateTotalPrice = () => {
    if (!Array.isArray(formData.services) || !Array.isArray(serviceOptions)) return 0;
    return formData.services.reduce((total, serviceId) => {
      const service = serviceOptions.find(s => s.id === serviceId);
      let price = service ? service.price : 0;
      if (typeof price === 'string') price = parseFloat(price);
      return total + (isNaN(price) ? 0 : price);
    }, 0);
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/wedding-app/api/custom-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          services: formData.services.map(serviceId => {
            const service = serviceOptions.find(s => s.id === serviceId);
            return service ? service.name : serviceId;
          }).join(', ')
        }),
      });

      if (response.ok) {
        toast.success('Permintaan layanan kustom berhasil dikirim! Kami akan menghubungi Anda segera.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          wedding_date: '',
          guest_count: '',
          budget: '',
          services: [],
          additional_requests: ''
        });
        onClose();
      } else {
        toast.error('Error mengirim permintaan. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error mengirim permintaan. Silakan coba lagi.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className=" text-2xl font-bold text-gray-900">
                Permintaan Layanan Pernikahan Kustom
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Telepon</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Pernikahan</label>
                  <input
                    type="date"
                    name="wedding_date"
                    value={formData.wedding_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Tamu</label>
                  <input
                    type="number"
                    name="guest_count"
                    value={formData.guest_count}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rentang Budget</label>
                  <select
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Pilih rentang budget</option>
                    <option value="10-25">Rp 10.000.000 - Rp 25.000.000</option>
                    <option value="25-50">Rp 25.000.000 - Rp 50.000.000</option>
                    <option value="50-100">Rp 50.000.000 - Rp 100.000.000</option>
                    <option value="100+">Rp 100.000.000+</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Layanan yang Diperlukan</label>
                  {formData.services.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{formData.services.length}</span> layanan dipilih • 
                      Total: <span className="font-bold text-primary-600">{formatRupiah(calculateTotalPrice())}</span>
                    </div>
                  )}
                </div>
                {formData.services.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-semibold text-gray-900">Total Pembayaran Booking</span>
                      <span className="text-xl font-bold text-primary-600">{formatRupiah(calculateTotalPrice())}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.open('https://wa.me/6289646829459?text=Halo, saya ingin konfirmasi pembayaran untuk booking layanan kustom. Total pembayaran: ' + formatRupiah(calculateTotalPrice()), '_blank')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                      <span>Konfirmasi Pembayaran</span>
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {serviceOptions.map((service) => (
                    <label key={service.id} className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service.id)}
                        onChange={() => handleServiceToggle(service)}
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{service.name}</span>
                            {service.description && (
                              <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                            )}
                            {service.category && (
                              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mt-1">
                                {service.category}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-primary-600 ml-2">
                            {formatRupiah(service.price)}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permintaan Tambahan</label>
                <textarea
                  name="additional_requests"
                  value={formData.additional_requests}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Ceritakan tentang pernikahan impian Anda, persyaratan khusus, atau permintaan spesifik..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Kirim Permintaan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

CustomServiceModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CustomServiceModal;