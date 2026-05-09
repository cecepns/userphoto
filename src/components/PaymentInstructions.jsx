import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const PaymentInstructions = ({ totalAmount, bookingAmount, onComplete, onBack, onPaymentMethodChange }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/wedding-app/api/payment-methods');
      const data = await response.json();
      setPaymentMethods(data);
      if (data.length > 0) {
        setSelectedMethod(data[0]);
        if (onPaymentMethodChange) {
          onPaymentMethodChange(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '6289646829459';
    const message = `Halo! Saya sudah melakukan pemesanan dengan total Rp ${totalAmount.toLocaleString('id-ID')} dan booking amount Rp ${bookingAmount.toLocaleString('id-ID')}. Mohon konfirmasi pembayaran saya.`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const formatPrice = (price) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat metode pembayaran...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Instruksi Pembayaran
        </h3>
        <p className="text-gray-600">
          Silakan pilih metode pembayaran dan ikuti instruksi di bawah ini
        </p>
      </div>

      {/* Payment Methods */}
      {paymentMethods.length > 0 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid gap-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedMethod?.id === method.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-primary-300'
                  }`}
                  onClick={() => {
                    setSelectedMethod(method);
                    if (onPaymentMethodChange) {
                      onPaymentMethodChange(method);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-800">{method.name}</h4>
                      <p className="text-sm text-gray-600">{method.type}</p>
                    </div>
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex items-center justify-center">
                      {selectedMethod?.id === method.id && (
                        <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Method Details */}
          {selectedMethod && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-4">
                Detail Pembayaran - {selectedMethod.name}
              </h4>
              
              <div className="space-y-3">
                {selectedMethod.account_number && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Nomor Rekening:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-white px-3 py-2 rounded border text-sm font-mono">
                        {selectedMethod.account_number}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedMethod.account_number)}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Salin
                      </button>
                    </div>
                  </div>
                )}
                
                {selectedMethod.details && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Deskripsi:</span>
                    <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                      {selectedMethod.details}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total Amount */}
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total Harga Layanan:</span>
                <span className="font-medium text-gray-700">
                  {formatPrice(totalAmount)}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">Total Pembayaran Booking:</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatPrice(bookingAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Confirmation Button */}
          <div className="space-y-3">
            <button
              onClick={handleWhatsAppContact}
              className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              Konfirmasi Pembayaran
            </button>
            
            {/* Status */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Menunggu konfirmasi</span>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-semibold text-yellow-800 mb-2">Penting!</h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Transfer {formatPrice(bookingAmount)} untuk booking (uang muka)</li>
              <li>• Simpan bukti transfer untuk konfirmasi</li>
              <li>• Pembayaran akan dikonfirmasi dalam 1x24 jam</li>
              <li>• Hubungi kami jika ada pertanyaan</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-yellow-200">
              <p className="text-xs text-yellow-600">
                <strong>Catatan:</strong> Total harga layanan adalah {formatPrice(totalAmount)}. 
                Pembayaran {formatPrice(bookingAmount)} adalah uang muka untuk booking. Sisa pembayaran dapat diselesaikan sesuai kesepakatan.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Belum ada metode pembayaran yang tersedia</p>
          <p className="text-sm text-gray-500">Silakan hubungi admin untuk informasi pembayaran</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Kembali
        </button>
        
        {paymentMethods.length > 0 && (
          <button
            onClick={onComplete}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Selesai
          </button>
        )}
      </div>
    </div>
  );
};

PaymentInstructions.propTypes = {
  totalAmount: PropTypes.number.isRequired,
  bookingAmount: PropTypes.number.isRequired,
  onComplete: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onPaymentMethodChange: PropTypes.func,
};

export default PaymentInstructions; 