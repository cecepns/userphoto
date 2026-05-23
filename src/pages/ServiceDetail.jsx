import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import AOS from 'aos';
import 'aos/dist/aos.css';
import PaymentInstructions from '../components/PaymentInstructions';
import { imageUrl } from '../utils/imageUrl';

// Helper function to format price in Indonesian Rupiah format
const formatPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return 'Rp 0';
  return `Rp ${numPrice.toLocaleString('id-ID')}`;
};

/** Minimal uang muka booking (harus selaras dengan backend jika ada validasi). */
const MIN_BOOKING_AMOUNT = 300000;

// Helper function to calculate total price
const calculateTotalPrice = (items, basePrice = 0) => {
  // Convert basePrice to number if it's a string
  const numBasePrice = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice;
  
  const itemsTotal = items.reduce((total, item) => {
    const price = item.final_price || item.item_price || item.price;
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return total + (isNaN(numPrice) ? 0 : numPrice);
  }, 0);
  
  // Fix floating point precision by rounding to nearest integer
  return Math.round(numBasePrice + itemsTotal);
};

const ServiceDetail = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [items, setItems] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [orderData, setOrderData] = useState(null);
  const [buttonContent, setButtonContent] = useState(null);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      easing: "ease-in-out",
      once: true,
      mirror: false,
    });
    fetchServiceData();
    fetchButtonContent();
  }, [id]);

  const fetchServiceData = async () => {
    try {
      // Fetch service details
      const serviceResponse = await fetch(`https://api.kingcreativestudio.my.id/chekusphoto/api/services/${id}`);
      const serviceData = await serviceResponse.json();
      setService(serviceData);

      // Fetch service items
      const itemsResponse = await fetch(`https://api.kingcreativestudio.my.id/chekusphoto/api/services/${id}/items`);
      const itemsData = await itemsResponse.json();
      setItems(itemsData);

      // Fetch service features
      const featuresResponse = await fetch(`https://api.kingcreativestudio.my.id/chekusphoto/api/service-features`);
      const featuresData = await featuresResponse.json();
      setFeatures(featuresData);
      // Don't auto-select items - start with empty selection
    } catch (error) {
      console.error('Error fetching service data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchButtonContent = async () => {
    try {
      const response = await fetch('https://api.kingcreativestudio.my.id/chekusphoto/api/content-sections/button_item_detail');
      if (response.ok) {
        const data = await response.json();
        setButtonContent(data);
      }
    } catch (error) {
      console.error('Error fetching button content:', error);
    }
  };

  const handleItemToggle = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      // If all items are selected, deselect all
      setSelectedItems([]);
    } else {
      // Select all items
      setSelectedItems([...items]);
    }
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat detail layanan...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl text-gray-800 mb-4">Layanan Tidak Ditemukan</h1>
          <p className="text-gray-600 mb-8">Layanan yang Anda cari tidak ada.</p>
          <Link to="/services" className="btn-primary">
            Kembali ke Layanan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{service.name} - Chekusphoto</title>
        <meta name="description" content={service.description} />
      </Helmet>

      <div className="pt-20 overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center bg-gray-900 text-white overflow-hidden px-4 sm:px-6 lg:px-8">
          {/* <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div> */}
          
          <div className="max-w-7xl mx-auto w-full relative z-10">
            {/* Breadcrumb */}
            <nav className="mb-8 mt-10" data-aos="fade-down">
              <ol className="flex items-center space-x-2 text-sm text-gray-600">
                <li><Link to="/" className="text-white">Beranda</Link></li>
                <li>•</li>
                <li><Link to="/services" className="text-white">Layanan</Link></li>
                <li>•</li>
                <li className="text-white">{service.name}</li>
              </ol>
            </nav>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div data-aos="fade-right">
                {/* <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                  {service.name}
                </h1> */}
                <div className="flex flex-col gap-5" data-aos="fade-up" data-aos-delay="200">
                  <p className="text-2xl md:text-4xl text-white font-bold leading-relaxed">
                    {formatPrice(service.base_price)}
                  </p>
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="btn-primary text-lg px-8 py-4 max-w-fit"
                  >
                    {buttonContent ? buttonContent.button_text : 'Pesan Layanan Ini'}
                  </button>
                </div>
              </div>

              <div className="relative" data-aos="fade-left" data-aos-delay="300">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-200 to-secondary-200 rounded-full blur-3xl opacity-30 animate-float"></div>
                <img
                  src={
                    service.image
                      ? imageUrl(service.image)
                      : `https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800`
                  }
                  alt={service.name}
                  className="relative z-10 w-full h-64 sm:h-80 lg:h-96 object-cover rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Service Details */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <div className="mb-12" data-aos="fade-up">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
                    Detail Layanan
                  </h2>
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-line">
                      {service.description}
                    </p>
                    {/* <p className="text-gray-700 leading-relaxed">
                      Kami berkomitmen untuk memberikan layanan terbaik dengan standar kualitas tinggi. 
                      Setiap detail akan ditangani dengan profesionalisme dan perhatian khusus untuk 
                      memastikan hari pernikahan Anda berjalan sempurna.
                    </p> */}
                  </div>
                </div>

                {/* Service Items */}
                {items.length > 0 && (
                  <div data-aos="fade-up">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                        Tambahan Item
                      </h3>
                      <button
                        onClick={handleSelectAll}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors mt-2 sm:mt-0 ${
                          selectedItems.length === items.length && items.length > 0
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        {selectedItems.length === items.length && items.length > 0 ? 'Hapus Semua' : 'Pilih Semua'}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="border border-gray-200 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg p-4 sm:p-6 hover:border-primary-300 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                            <div className="flex-1">
                              <h4 className="text-lg sm:text-xl font-semibold text-white mb-2">
                                {item.name}
                              </h4>
                              <p className="text-gray-600 mb-4 text-white">
                                {item.description}
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <div className="text-xl sm:text-2xl font-bold text-white mb-2">
                                {formatPrice(item.final_price || item.item_price || item.price)}
                              </div>
                              <button
                                onClick={() => handleItemToggle(item)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  selectedItems.find(i => i.id === item.id)
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {selectedItems.find(i => i.id === item.id) ? 'Dipilih' : 'Pilih'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Booking Button below service items */}
                    {/* <div className="mt-8 text-center" data-aos="fade-up" data-aos-delay="400">
                      <button
                        onClick={() => setShowBookingModal(true)}
                        className="btn-primary text-lg px-8 py-4"
                      >
                        Pesan Layanan Ini
                      </button>
                    </div> */}
                  </div>
                )}
              </div>

              {/* Floating Booking Button */}
              <div className="fixed bottom-6 left-6 z-40">
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
                  data-aos="fade-up"
                  data-aos-delay="500"
                >
                  {buttonContent ? buttonContent.button_text : 'Pesan Layanan Ini'}
                </button>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-8">
                  {/* Pricing Card */}
                  <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-4 sm:p-6 shadow-lg mb-6" data-aos="fade-left">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
                      Harga Layanan
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Harga Dasar:</span>
                        <span className="text-xl sm:text-2xl font-bold text-primary-600">
                          {formatPrice(service.base_price)}
                        </span>
                      </div>
                      
                      <div className="border-t pt-4">
                        {selectedItems.length > 0 && (
                          <>
                            <div className="text-sm text-gray-600 mb-2">Item Tambahan:</div>
                            {selectedItems.map((item, index) => (
                              <div key={item.id} className="flex justify-between items-center text-sm mb-1">
                                <span className="text-gray-700">{index + 1}. {item.name}</span>
                                <span className="font-medium">{formatPrice(item.final_price || item.item_price || item.price)}</span>
                              </div>
                            ))}
                          </>
                        )}
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between items-center text-sm mb-2">
                            <span>Total Harga Layanan:</span>
                            <span className="font-medium text-gray-700">
                              {formatPrice(calculateTotalPrice(selectedItems, service.base_price))}
                            </span>
                          </div>
                          <div className="flex flex-col font-bold text-lg">
                            <span>Total Pembayaran Booking:</span>
                            <span className="text-lg sm:text-xl text-primary-600">
                              {formatPrice(MIN_BOOKING_AMOUNT)}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              Minimal {formatPrice(MIN_BOOKING_AMOUNT)}, bisa lebih
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg" data-aos="fade-left" data-aos-delay="200">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                      Keunggulan Layanan
                    </h3>
                    <div className="space-y-3">
                      {features.map((feature) => (
                        <div key={feature.id} className="flex items-center">
                          <div className="w-2 h-2 bg-primary-600 rounded-full mr-3"></div>
                          <span className="text-gray-700">{feature.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/20 to-secondary-900/20"></div>
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="text-center" data-aos="fade-up">
              <h2 className="text-3xl sm: text-3xl lg:text-5xl font-bold mb-6">
                Siap Memesan {service.name}?
              </h2>
              <p className="text-lg sm:text-xl text-gray-300 mb-8">
                Jangan ragu untuk menghubungi kami. Tim kami siap membantu Anda 
                merencanakan hari pernikahan yang sempurna.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center" data-aos="fade-up" data-aos-delay="300">
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105"
                >
                  {buttonContent ? buttonContent.button_text : 'Pesan Sekarang'}
                </button>
                <Link
                  to="/contact"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300"
                >
                  Hubungi Kami
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Booking Modal */}
        {showBookingModal && (
          <BookingModal
            service={service}
            selectedItems={selectedItems}
            onClose={() => setShowBookingModal(false)}
            onOrderSuccess={(data) => {
              setOrderData(data);
              setShowPaymentInstructions(true);
              setShowBookingModal(false);
            }}
          />
        )}

        {/* Payment Instructions Modal */}
        {showPaymentInstructions && orderData && (
          <PaymentInstructionsModal
            orderData={orderData}
            onClose={() => {
              setShowPaymentInstructions(false);
              setOrderData(null);
            }}
          />
        )}
      </div>
    </>
  );
};

const PaymentInstructionsModal = ({ orderData, onClose }) => {

  // const downloadInvoice = () => {
  //   // Create PDF document
  //   const doc = new jsPDF();
    
  //   // ===== PAGE 1 =====
  //   // Company header
  //   doc.setFontSize(16);
  //   doc.setFont('helvetica', 'bold');
  //   doc.text('Chekusphoto', 20, 20);
    
  //   // Company details
  //   doc.setFontSize(10);
  //   doc.setFont('helvetica', 'normal');
  //   doc.text('Jl. Raya panongan Kec. Panongan Kab. Tangerang Provinsi Banten', 20, 30);
  //   doc.text('Telephone: 089646829459', 20, 37);
  //   doc.text('Email: edo19priyatno@gmail.com', 20, 44);
  //   doc.text('Website: https://sites.google.com/view/userwedding/beranda', 20, 51);
    
  //   // Invoice details (right side)
  //   doc.setFontSize(12);
  //   doc.setFont('helvetica', 'bold');
  //   doc.text('INVOICE', 150, 20);
    
  //   doc.setFontSize(10);
  //   doc.setFont('helvetica', 'normal');
  //   doc.text(`No. Invoice: ${orderData.id || 'N/A'}`, 150, 30);
  //   doc.text(`Tanggal Invoice: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 150, 37);
  //   doc.text(`Jatuh Tempo: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 150, 44);
    
  //   // Bill To section
  //   doc.setFontSize(12);
  //   doc.setFont('helvetica', 'bold');
  //   doc.text('Dibayar Kepada:', 20, 70);
    
  //   doc.setFontSize(10);
  //   doc.setFont('helvetica', 'normal');
  //   doc.text(orderData.name, 20, 77);
  //   doc.text(orderData.email, 20, 84);
  //   doc.text(orderData.phone, 20, 91);
  //   doc.text(orderData.address, 20, 98);
  //   doc.text(`Tanggal Pernikahan: ${orderData.wedding_date}`, 20, 105);
    
  //   // Service table header
  //   const startY = 120;
  //   doc.setFillColor(52, 152, 219); // Blue background
  //   doc.rect(20, startY, 170, 8, 'F');
    
  //   doc.setFontSize(10);
  //   doc.setFont('helvetica', 'bold');
  //   doc.setTextColor(255, 255, 255); // White text
  //   doc.text('No.', 25, startY + 6);
  //   doc.text('Deskripsi', 40, startY + 6);
  //   doc.text('Jml', 140, startY + 6);
  //   doc.text('Harga', 170, startY + 6);
    
  //   // Reset text color
  //   doc.setTextColor(0, 0, 0);
    
  //   // Service items
  //   let currentY = startY + 15;
  //   let itemNumber = 1;
    
  //   // Main service item (base price)
  //   doc.setFontSize(10);
  //   doc.setFont('helvetica', 'normal');
  //   doc.text(itemNumber.toString(), 25, currentY);
  //   doc.text(orderData.service_name, 40, currentY);
  //   doc.text('1', 140, currentY);
  //   doc.text(formatPrice(orderData.base_price || 0), 170, currentY);
    
  //   // Selected items as sub-items
  //   if (orderData.selected_items && orderData.selected_items.length > 0) {
  //     currentY += 8;
  //     orderData.selected_items.forEach((item) => {
  //       doc.setFontSize(8);
  //       doc.text(`  ${item.name}`, 40, currentY);
  //       doc.text('1', 140, currentY);
  //       doc.text(formatPrice(item.final_price || item.item_price || item.price), 170, currentY);
  //       currentY += 5;
  //     });
  //   }
    
  //   // Add total service row
  //   currentY += 8;
  //   doc.setFontSize(10);
  //   doc.setFont('helvetica', 'bold');
  //   doc.text('', 25, currentY); // Empty serial number
  //   doc.text('Total Harga Layanan:', 40, currentY);
  //   doc.text('', 140, currentY); // Empty quantity
  //   doc.text(formatPrice(calculateTotalPrice(orderData.selected_items, orderData.base_price || 0)), 170, currentY);
    
  //   // Add payment details
  //   doc.setFontSize(14);
  //   doc.setFont('helvetica', 'bold');
  //   doc.text('Detail Pembayaran:', 20, currentY + 20);
    
  //   doc.setFontSize(10);
  //   doc.setFont('helvetica', 'normal');
  //   doc.text(`Total Harga Layanan: ${formatPrice(calculateTotalPrice(orderData.selected_items, orderData.base_price || 0))}`, 20, currentY + 30);
  //   doc.text(`Metode Pembayaran: ${selectedPaymentMethod?.name || 'Transfer Bank'}`, 20, currentY + 37);
  //   doc.text(`Biaya Booking: ${formatPrice(MIN_BOOKING_AMOUNT)}`, 20, currentY + 44);
  //   doc.text(`Total Pembayaran Diperlukan: ${formatPrice(MIN_BOOKING_AMOUNT)}`, 20, currentY + 51);
    
  //   // Add bank account information
  //   doc.setFontSize(12);
  //   doc.setFont('helvetica', 'bold');
  //   doc.text('Rekening Tujuan:', 20, currentY + 65);
    
  //   doc.setFontSize(10);
  //   doc.setFont('helvetica', 'normal');
  //   doc.text(`Nomor Rekening: ${selectedPaymentMethod?.account_number || 'N/A'}`, 20, currentY + 75);
  //   doc.text(`Atas Nama: ${selectedPaymentMethod?.details || 'N/A'}`, 20, currentY + 82);
      
  //   doc.text('Terima kasih telah memilih layanan kami!', 105, 280, { align: 'center' });

  //   // Save the PDF
  //   doc.save(`invoice-${orderData.id || 'order'}-${new Date().toISOString().split('T')[0]}.pdf`);
  // };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Instruksi Pembayaran
              </h3>
              {/* <button
                onClick={downloadInvoice}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Invoice
              </button> */}
            </div>
            

            <PaymentInstructions
              totalAmount={orderData.total_amount}
              bookingAmount={orderData.booking_amount}
              onComplete={onClose}
              onBack={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const BookingModal = ({ service, selectedItems, onClose, onOrderSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    wedding_date: '',
    bride_name: '',
    groom_name: '',
    reference_source: '',
    booking_amount: MIN_BOOKING_AMOUNT,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotalPrice(selectedItems, service.base_price);
      const orderData = {
        ...formData,
        service_id: service.id,
        service_name: service.name,
        base_price: service.base_price,
        selected_items: selectedItems,
        total_amount: totalAmount,
        booking_amount: parseFloat(formData.booking_amount)
      };
      
      const response = await fetch('https://api.kingcreativestudio.my.id/chekusphoto/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Pesanan berhasil dikirim! Silakan lanjutkan dengan pembayaran.');
        onOrderSuccess({ ...orderData, id: result.id });
      } else {
        toast.error('Error mengirim pesanan. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error mengirim pesanan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Pesan {service.name}
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
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-gray-800">Informasi Pelanggan</h4>
                  
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telepon</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    ></textarea>
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

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pasangan (Wanita)</label>
                      <input
                        type="text"
                        name="bride_name"
                        value={formData.bride_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pasangan (Pria)</label>
                      <input
                        type="text"
                        name="groom_name"
                        value={formData.groom_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dari mana Anda tahu tentang kami?</label>
                    <select
                      name="reference_source"
                      value={formData.reference_source}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Pilih referensi</option>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="facebook">Facebook</option>
                      <option value="google">Google / Pencarian</option>
                      <option value="teman">Teman / Kerabat</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jumlah Booking (Minimal {formatPrice(MIN_BOOKING_AMOUNT)})
                    </label>
                    <input
                      type="number"
                      name="booking_amount"
                      value={formData.booking_amount}
                      onChange={handleInputChange}
                      min={MIN_BOOKING_AMOUNT}
                      step="50000"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimal booking {formatPrice(MIN_BOOKING_AMOUNT)}, bisa lebih sesuai kebutuhan
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catatan Tambahan</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Berikan detail tambahan tentang kebutuhan Anda..."
                    ></textarea>
                  </div>


                </div>

                {/* Order Summary */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-gray-800">Ringkasan Pesanan</h4>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-800 mb-3">{service.name}</h5>
                    <p className="text-gray-600 mb-4 whitespace-pre-line">{service.description}</p>
                    
                    {selectedItems.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <h6 className="font-medium text-gray-700">Item Tambahan:</h6>
                        {selectedItems.map((item, index) => (
                          <div key={item.id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{index + 1}. {item.name}</span>
                            <span className="font-medium">{formatPrice(item.final_price || item.item_price || item.price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span>Total Harga Layanan:</span>
                        <span className="font-medium text-gray-700">
                          {formatPrice(calculateTotalPrice(selectedItems, service.base_price))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>Total Pembayaran Booking:</span>
                        <span className="text-primary-600">
                          {formatPrice(MIN_BOOKING_AMOUNT)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Minimal {formatPrice(MIN_BOOKING_AMOUNT)}, bisa lebih sesuai kebutuhan
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h6 className="font-semibold text-blue-800 mb-2">Informasi Penting</h6>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Pembayaran dilakukan setelah konfirmasi</li>
                      <li>• Konsultasi gratis sebelum pemesanan</li>
                      <li>• Garansi kepuasan 100%</li>
                      <li>• Tim support 24/7</li>
                      <li>• Transfer minimal {formatPrice(MIN_BOOKING_AMOUNT)} untuk booking</li>
                    </ul>
                  </div>

                  {/* Transfer Requirement Notice */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h6 className="font-semibold text-red-800 mb-2">⚠️ Persyaratan Booking</h6>
                    <p className="text-sm text-red-700 mb-2">
                      Untuk melakukan booking, Anda harus melakukan transfer{' '}
                      <strong>minimal {formatPrice(MIN_BOOKING_AMOUNT)}</strong> terlebih dahulu.
                      Pembayaran akan dikonfirmasi dalam 1x24 jam setelah transfer dilakukan.
                    </p>
                    <p className="text-xs text-red-600">
                      <strong>Catatan:</strong> Total harga layanan adalah {formatPrice(calculateTotalPrice(selectedItems, service.base_price))}.
                      {selectedItems.length > 0 ? 'Paket lengkap dengan semua item terpilih.' : ''}{' '}
                      Pembayaran minimal {formatPrice(MIN_BOOKING_AMOUNT)} adalah uang muka untuk booking. Sisa pembayaran dapat diselesaikan sesuai kesepakatan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim Pesanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// PropTypes for components
PaymentInstructionsModal.propTypes = {
  orderData: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

BookingModal.propTypes = {
  service: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    base_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  selectedItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  onOrderSuccess: PropTypes.func.isRequired,
};

export default ServiceDetail; 