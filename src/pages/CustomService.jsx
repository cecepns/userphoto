import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import { formatRupiah } from "../utils/formatters";

const API_BASE = "https://api-inventory.isavralabel.com/wedding-app";
function itemImageUrl(filename) {
  if (!filename || filename.startsWith("http")) return filename || "";
  return `${API_BASE}/uploads-weddingsapp/${filename}`;
}

const CustomService = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    wedding_date: "",
    services: [],
    additional_requests: "",
    booking_amount: 300000, // Default minimum booking amount
  });

  const [serviceOptions, setServiceOptions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [customServiceContent, setCustomServiceContent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Get category from URL query parameter
  // useEffect(() => {
  //   const searchParams = new URLSearchParams(location.search);
  //   const categoryFromUrl = searchParams.get('category');
  //   console.log(categoryFromUrl);
  //   if (categoryFromUrl) {
  //     setSelectedCategory(decodeURIComponent(categoryFromUrl));
  //   }
  // }, [location.search]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const categoryFromUrl = searchParams.get("category");

    setTimeout(() => {
      fetchServiceOptions(categoryFromUrl);
    }, 200);


    fetchPaymentMethods();
    fetchCustomServiceContent();
    fetchCategories();
  }, [location.search]);

  // Fetch service options when category changes
  useEffect(() => {
    fetchServiceOptions(selectedCategory);
  }, [selectedCategory]);

  // Scroll to top when switching between tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [showForm]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        "https://api-inventory.isavralabel.com/wedding-app/api/items/categories"
      );
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchServiceOptions = async (category = "") => {
    try {
      const url = category
        ? `https://api-inventory.isavralabel.com/wedding-app/api/items?category=${encodeURIComponent(
            category
          )}`
        : "https://api-inventory.isavralabel.com/wedding-app/api/items";
      const response = await fetch(url);
      const data = await response.json();
      setServiceOptions(data);
    } catch (error) {
      console.error("Error fetching service options:", error);
      toast.error("Gagal memuat daftar layanan");
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(
        "https://api-inventory.isavralabel.com/wedding-app/api/payment-methods"
      );
      const data = await response.json();
      setPaymentMethods(data);
      if (data.length > 0) {
        setSelectedPaymentMethod(data[0]);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const fetchCustomServiceContent = async () => {
    try {
      const response = await fetch(
        "https://api-inventory.isavralabel.com/wedding-app/api/content-sections/custom_service_section"
      );
      if (response.ok) {
        const data = await response.json();
        setCustomServiceContent(data);
      }
    } catch (error) {
      console.error("Error fetching custom service content:", error);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleServiceToggle = (service) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service.id)
        ? prev.services.filter((s) => s !== service.id)
        : [...prev.services, service.id],
    }));
  };

  const calculateTotalPrice = () => {
    if (!Array.isArray(formData.services) || !Array.isArray(serviceOptions))
      return 0;
    return formData.services.reduce((total, serviceId) => {
      const service = serviceOptions.find((s) => s.id === serviceId);
      let price = service ? service.price : 0;
      if (typeof price === "string") price = parseFloat(price);
      return total + (isNaN(price) ? 0 : price);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        "https://api-inventory.isavralabel.com/wedding-app/api/custom-requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            services: formData.services
              .map((serviceId) => {
                const service = serviceOptions.find((s) => s.id === serviceId);
                return service ? service.name : serviceId;
              })
              .join(", "),
          }),
        }
      );

      if (response.ok) {
        await response.json();
        setShowPaymentInstructions(true);
        toast.success(
          "Permintaan layanan kustom berhasil dikirim! Silakan pilih metode pembayaran."
        );
      } else {
        toast.error("Error mengirim permintaan. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error mengirim permintaan. Silakan coba lagi.");
    }
  };

  const handleContinueToForm = () => {
    if (formData.services.length === 0) {
      toast.error("Silakan pilih minimal satu layanan terlebih dahulu");
      return;
    }
    setShowForm(true);
    // Scroll to top when switching to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToServices = () => {
    setShowForm(false);
    // Scroll to top when switching back to services
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToForm = () => {
    setShowPaymentInstructions(false);
    // Scroll to top when going back to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePaymentComplete = () => {
    toast.success(
      "Terima kasih! Pembayaran booking Anda akan dikonfirmasi dalam 1x24 jam."
    );
    navigate("/");
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = "6289646829459";
    const message = `Halo! Saya sudah melakukan pemesanan layanan kustom dengan total Rp ${calculateTotalPrice().toLocaleString(
      "id-ID"
    )}. Mohon konfirmasi pembayaran saya.`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");
  };

  const openImageLightbox = (service) => {
    const images = Array.isArray(service.images) ? service.images : [];
    if (images.length === 0) return;
    const urls = images.map((f) => itemImageUrl(f));
    setLightboxImages(urls);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const goPrev = () =>
    setLightboxIndex((i) => (i <= 0 ? lightboxImages.length - 1 : i - 1));
  const goNext = () =>
    setLightboxIndex((i) =>
      i >= lightboxImages.length - 1 ? 0 : i + 1
    );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) =>
          i <= 0 ? lightboxImages.length - 1 : i - 1
        );
      if (e.key === "ArrowRight")
        setLightboxIndex((i) =>
          i >= lightboxImages.length - 1 ? 0 : i + 1
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, closeLightbox, lightboxImages.length]);

  // Payment Instructions Component
  const PaymentInstructionsModal = () => {
    if (!showPaymentInstructions) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
          <div className="p-4 sm:p-6">
            <div className="text-center mb-6">
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
                          selectedPaymentMethod?.id === method.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-300 hover:border-primary-300"
                        }`}
                        onClick={() => setSelectedPaymentMethod(method)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-800">
                              {method.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {method.type}
                            </p>
                          </div>
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex items-center justify-center">
                            {selectedPaymentMethod?.id === method.id && (
                              <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Method Details */}
                {selectedPaymentMethod && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">
                      Detail Pembayaran - {selectedPaymentMethod.name}
                    </h4>

                    <div className="space-y-3">
                      {selectedPaymentMethod.account_number && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">
                            Nomor Rekening:
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-white px-3 py-2 rounded border text-sm font-mono">
                              {selectedPaymentMethod.account_number}
                            </code>
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  selectedPaymentMethod.account_number
                                )
                              }
                              className="text-primary-600 hover:text-primary-700 text-sm"
                            >
                              Salin
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedPaymentMethod.details && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">
                            Instruksi:
                          </span>
                          <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                            {selectedPaymentMethod.details}
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
                      <span className="text-gray-600">
                        Total Harga Layanan:
                      </span>
                      <span className="font-medium text-gray-700">
                        {formatRupiah(calculateTotalPrice())}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex flex-wrap justify-between items-center">
                        <span className="font-medium text-gray-800">
                          Total Pembayaran Booking:
                        </span>
                        <span className="text-2xl font-bold text-primary-600">
                          {formatRupiah(formData.booking_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Konfirmasi Pembayaran Button */}
                <button
                  onClick={handleWhatsAppContact}
                  className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                  Konfirmasi Pembayaran
                </button>

                {/* Status Menunggu Konfirmasi */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-yellow-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-semibold text-yellow-800">
                        Status: Menunggu Konfirmasi
                      </h5>
                      {/* <p className="text-sm text-yellow-700">Pembayaran Anda akan dikonfirmasi dalam 1x24 jam</p> */}
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h5 className="font-semibold text-yellow-800 mb-2">
                    Penting!
                  </h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>
                      • Transfer {formatRupiah(formData.booking_amount)} untuk
                      booking (uang muka)
                    </li>
                    <li>• Simpan bukti transfer untuk konfirmasi</li>
                    <li>• Pembayaran akan dikonfirmasi dalam 1x24 jam</li>
                    <li>• Hubungi kami jika ada pertanyaan</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <p className="text-xs text-yellow-600">
                      <strong>Catatan:</strong> Total harga layanan adalah{" "}
                      {formatRupiah(calculateTotalPrice())}. Pembayaran{" "}
                      {formatRupiah(formData.booking_amount)} adalah uang muka
                      untuk booking. Sisa pembayaran dapat diselesaikan sesuai
                      kesepakatan.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <svg
                    className="w-12 h-12 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 mb-4">
                  Belum ada metode pembayaran yang tersedia
                </p>
                <p className="text-sm text-gray-500">
                  Silakan hubungi admin untuk informasi pembayaran
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t">
              <button
                onClick={handleBackToForm}
                className="w-full px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Kembali
              </button>

              {paymentMethods.length > 0 && (
                <button
                  onClick={handlePaymentComplete}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Layanan Kustom - Chekusphoto</title>
        <meta
          name="description"
          content="Buat layanan pernikahan kustom sesuai kebutuhan Anda. Pilih layanan yang Anda inginkan dan kami akan menyesuaikan dengan budget dan preferensi Anda."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        {/* Header */}
        {/* <div className="mb-12 bg-gray-900 text-white pt-32 pb-24">
          <div className="container-custom text-left">
            <h1 className="text-3xl max-w-3xl px-4 mx-auto sm: text-3xl lg:text-5xl font-bold mb-6">
              {customServiceContent ? customServiceContent.title : ""}
            </h1>
            {customServiceContent?.subtitle && (
              <h2 className="text-xl max-w-3xl px-4 mx-auto sm:text-2xl font-semibold mb-4">
                {customServiceContent.subtitle}
              </h2>
            )}
            <p className="text-lg sm:text-xl max-w-3xl mx-auto px-4">
              {customServiceContent ? customServiceContent.description : ""}
            </p>
          </div>
        </div> */}
        <div className="container-custom px-4 pt-32">
          {!showForm ? (
            /* Service Selection Page */
            <div className="max-w-6xl mx-auto">
              {/* Service Selection Header */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                    Pilih Layanan
                  </h2>
                  <button
                    onClick={() => {
                      if (formData.services.length === serviceOptions.length) {
                        setFormData((prev) => ({ ...prev, services: [] }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          services: serviceOptions.map((service) => service.id),
                        }));
                      }
                    }}
                    className={`w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.services.length === serviceOptions.length &&
                      serviceOptions.length > 0
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-primary-600 text-white hover:bg-primary-700"
                    }`}
                  >
                    {formData.services.length === serviceOptions.length &&
                    serviceOptions.length > 0
                      ? "Hapus Semua"
                      : "Pilih Semua"}
                  </button>
                </div>

                {/* Category Filter */}
                {/* {categories.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Filter berdasarkan kategori:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCategoryChange("")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedCategory === ""
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Semua Kategori
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => handleCategoryChange(category)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedCategory === category
                              ? "bg-primary-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )} */}

                {/* Selected Services Summary */}
                {formData.services.length > 0 && (
                  <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-gray-700">
                        <span className="font-medium">
                          {formData.services.length}
                        </span>{" "}
                        layanan dipilih
                      </span>
                      <span className="text-lg font-bold text-primary-600">
                        Total: {formatRupiah(calculateTotalPrice())}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Service List */}
              <div className="grid gap-4 mb-5">
                {serviceOptions.map((service) => {
                  const images = Array.isArray(service.images)
                    ? service.images
                    : [];
                  const thumb = images[0];
                  const hasImages = images.length > 0;
                  return (
                    <div
                      key={service.id}
                      className={`rounded-2xl overflow-hidden border-2 shadow-lg transition-all duration-300 hover:shadow-xl ${
                        formData.services.includes(service.id)
                          ? "border-primary-500 ring-2 ring-primary-200"
                          : "border-gray-200 hover:border-primary-300"
                      }`}
                    >
                      <div className="flex flex-col bg-gradient-to-r from-primary-600 to-secondary-600">
                        {/* Content: title, description, price, button - always on top */}
                        <div className="flex-1 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-xl font-semibold text-white">
                                {service.name}
                              </h3>
                              {service.category && (
                                <span className="px-3 py-1 text-xs bg-white/20 text-white rounded-full">
                                  {service.category}
                                </span>
                              )}
                            </div>
                            <p className="text-white/90 text-sm sm:text-base mb-0">
                              {service.description}
                            </p>
                          </div>
                          <div className="flex flex-col sm:items-end gap-3">
                            <div className="text-2xl font-bold text-white">
                              {formatRupiah(service.price)}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleServiceToggle(service)}
                              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                formData.services.includes(service.id)
                                  ? "bg-white text-primary-600 hover:bg-white/90 shadow"
                                  : "bg-white/20 text-white hover:bg-white/30 border border-white/40"
                              }`}
                            >
                              {formData.services.includes(service.id)
                                ? "✓ Dipilih"
                                : "Pilih"}
                            </button>
                          </div>
                        </div>
                        {/* Image - only below content when images exist, no placeholder */}
                        {hasImages && (
                          <div
                            className="relative w-full mx-auto md:w-64 rounded overflow-hidden h-48 sm:h-56 bg-primary-700/50 cursor-pointer group"
                            onClick={() => openImageLightbox(service)}
                            role="button"
                            onKeyDown={(e) =>
                              (e.key === "Enter" || e.key === " ") &&
                              openImageLightbox(service)
                            }
                            tabIndex={0}
                          >
                            <img
                              src={itemImageUrl(thumb)}
                              alt={service.name}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            {images.length > 1 && (
                              <span className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-medium flex items-center gap-1">
                                <ImageIcon size={12} />
                                {images.length}
                              </span>
                            )}
                            <span className="absolute bottom-2 left-2 md:bottom-auto md:left-auto md:inset-0 md:flex md:items-center md:justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity md:bg-black/30">
                              <span className="px-3 py-1.5 rounded-lg bg-white/90 text-primary-700 text-sm font-medium">
                                Lihat galeri
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Image Lightbox */}
              {lightboxOpen && lightboxImages.length > 0 && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
                  onClick={closeLightbox}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Galeri gambar"
                >
                  <button
                    type="button"
                    onClick={closeLightbox}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Tutup"
                  >
                    <X size={28} />
                  </button>
                  <div
                    className="relative max-w-5xl max-h-[90vh] w-full mx-4 flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={lightboxImages[lightboxIndex]}
                      alt=""
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                    />
                    {lightboxImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            goPrev();
                          }}
                          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                          aria-label="Sebelumnya"
                        >
                          <ChevronLeft size={32} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            goNext();
                          }}
                          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                          aria-label="Selanjutnya"
                        >
                          <ChevronRight size={32} />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {lightboxImages.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex(i);
                              }}
                              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                i === lightboxIndex
                                  ? "bg-white scale-125"
                                  : "bg-white/50 hover:bg-white/70"
                              }`}
                              aria-label={`Gambar ${i + 1}`}
                            />
                          ))}
                        </div>
                        <span className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 text-white text-sm">
                          {lightboxIndex + 1} / {lightboxImages.length}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Floating Continue Button */}
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
                <button
                  onClick={handleContinueToForm}
                  disabled={formData.services.length === 0}
                  className={`px-4 md:px-8 py-3 md:py-4 rounded-lg text-lg font-medium transition-all duration-300 shadow-lg ${
                    formData.services.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-md"
                      : "btn-primary text-white hover:bg-green-700 hover:shadow-xl transform hover:scale-105"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Lanjutkan</span>
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded-lg text-sm">
                      {formData.services.length} dipilih
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Form Page */
            <div className="max-w-4xl mx-auto">
              {/* Form Header */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={handleBackToServices}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    ← Kembali ke Pilihan Layanan
                  </button>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                  Informasi Pribadi
                </h2>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <span className="text-gray-700">
                      <span className="font-medium">
                        {formData.services.length}
                      </span>{" "}
                      layanan dipilih
                    </span>
                    <span className="text-lg font-bold text-primary-600">
                      Total: {formatRupiah(calculateTotalPrice())}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Personal Information */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Lengkap
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nomor Telepon
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Pernikahan
                      </label>
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

                  {/* Booking Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jumlah Booking (Minimal Rp 300.000)
                    </label>
                    <input
                      type="number"
                      name="booking_amount"
                      value={formData.booking_amount}
                      onChange={handleInputChange}
                      min="300000"
                      step="100000"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Minimal booking Rp 300.000. Anda dapat menyesuaikan jumlah
                      sesuai kebutuhan.
                    </p>
                  </div>

                  {/* Additional Requests */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permintaan Tambahan
                    </label>
                    <textarea
                      name="additional_requests"
                      value={formData.additional_requests}
                      onChange={handleInputChange}
                      rows={6}
                      placeholder="Ceritakan tentang pernikahan impian Anda, persyaratan khusus, atau permintaan spesifik..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    ></textarea>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-end">
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="w-full sm:w-auto px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      Kembali ke Beranda
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto btn-primary"
                    >
                      Kirim Permintaan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Instructions Modal */}
      <PaymentInstructionsModal />
    </>
  );
};

export default CustomService;
