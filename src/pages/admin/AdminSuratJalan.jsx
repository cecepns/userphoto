import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  FileText,
  Search,
  Calendar,
  List,
  Upload,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Select from "react-select";
import AdminLayout from "../../components/AdminLayout";
import { formatDate, toLocalDate, toDateOnlyString } from "../../utils/formatters";
import jsPDF from "jspdf";
import QRCode from "qrcode";

const API_BASE = "https://api.kingcreativestudio.my.id/user-photo";
function imageUrl(value) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${API_BASE}/uploads-weddingsapp/${value}`;
}

/** Pratinjau QR di modal detail (link sama dengan yang di-PDF) */
// eslint-disable-next-line react/prop-types -- local helper; `url` = maps link
const GoogleMapsVendorQr = ({ url }) => {
  const [dataUrl, setDataUrl] = useState(null);
  useEffect(() => {
    const u = (url || "").trim();
    if (!u) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(u, { width: 200, margin: 1, errorCorrectionLevel: "M" })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (!(url || "").trim()) return null;
  return (
    <div className="mt-1">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR Google Maps"
          className="w-36 h-36 border border-gray-200 rounded-lg bg-white p-1"
        />
      ) : (
        <p className="text-xs text-gray-500">Memuat QR…</p>
      )}
    </div>
  );
};

const AdminSuratJalan = () => {
  const [suratJalanList, setSuratJalanList] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const fileInputRef = useRef(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderOptions, setOrderOptions] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [viewMode, setViewMode] = useState("calendar");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSuratJalan, setCalendarSuratJalan] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [formData, setFormData] = useState({
    order_id: "",
    custom_request_id: "",
    client_name: "",
    client_phone: "",
    client_address: "",
    wedding_date: "",
    package_name: "",
    plaminan_image: "",
    pintu_masuk_image: "",
    dekorasi_image: "",
    warna_kain: "",
    ukuran_tenda: "",
    piring: "",
    nama_pasangan: "",
    vendor_name: "Chekusphoto",
    maps_link: "",
    notes: "",
  });

  useEffect(() => {
    fetchSuratJalan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, searchQuery, viewMode]);

  useEffect(() => {
    loadOrderOptions();
  }, []);

  useEffect(() => {
    if (viewMode === "calendar") {
      fetchCalendarSuratJalan(calendarMonth);
    }
  }, [viewMode, calendarMonth]);

  const fetchSuratJalan = async () => {
    setLoading(true);
    try {
      const limit = pagination.limit;
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(limit),
      });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const response = await fetch(
        `${API_BASE}/api/surat-jalan?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      const data = await response.json();

      setSuratJalanList(data.suratJalan || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 1,
      }));
    } catch (error) {
      console.error("Error fetching surat jalan:", error);
      toast.error("Error memuat data surat jalan");
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarSuratJalan = async (monthDate) => {
    setCalendarLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/surat-jalan?page=1&limit=500`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      const data = await response.json();
      const all = data.suratJalan || [];
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const filtered = all.filter((item) => {
        const rawDate = item.wedding_date;
        if (!rawDate) return false;
        const d = toLocalDate(rawDate);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === year && d.getMonth() === month;
      });
      setCalendarSuratJalan(filtered);
      setSelectedDate(null);
    } catch (error) {
      console.error("Error fetching calendar surat jalan:", error);
      setCalendarSuratJalan([]);
      setSelectedDate(null);
    } finally {
      setCalendarLoading(false);
    }
  };

  const changeCalendarMonth = (direction) => {
    setCalendarMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startWeekday = firstDayOfMonth.getDay();

    const days = [];
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const suratJalanByDate = calendarSuratJalan.reduce((acc, item) => {
    const rawDate = item.wedding_date;
    if (!rawDate) return acc;
    const dateObj = toLocalDate(rawDate);
    if (isNaN(dateObj.getTime())) return acc;
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const totalUniqueCalendarClients = new Set(
    calendarSuratJalan
      .map((item) =>
        (item.client_phone || "")
          .toString()
          .replace(/\D/g, "")
          .trim()
      )
      .filter(Boolean)
  ).size;

  const uploadTargetRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    const field = uploadTargetRef.current;
    if (!file || !field) return;
    if (!/image\/(jpeg|png|gif|webp)/.test(file.type)) {
      toast.error("Hanya file gambar (JPEG, PNG, GIF, WebP) yang diizinkan.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: fd,
      });
      const data = await response.json();
      if (data.filename) {
        setFormData((prev) => ({ ...prev, [field]: data.filename }));
        toast.success("Gambar berhasil diunggah.");
      } else {
        toast.error(data.message || "Upload gagal");
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload gagal");
    }
    uploadTargetRef.current = null;
    e.target.value = "";
  };

  const triggerFileUpload = (field) => {
    uploadTargetRef.current = field;
    fileInputRef.current?.click();
  };

  const loadOrderOptions = async (inputValue = "") => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/orders/search?q=${encodeURIComponent(inputValue)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      const data = await response.json();
      const rows = Array.isArray(data) ? data : [];

      const options = rows.map((row) => {
        const isCustom = row.order_source === "custom_request";
        const datePart = row.wedding_date
          ? formatDate(row.wedding_date)
          : "Tanggal tidak tersedia";
        const svc = row.service_name || (isCustom ? "Layanan custom" : "-");
        const prefix = isCustom ? "C" : "";
        const tag = isCustom ? "Custom" : "Pesan biasa";
        return {
          value: isCustom ? `custom:${row.id}` : `order:${row.id}`,
          label: `#${prefix}${row.id} — ${row.name || "-"} — ${svc} (${tag}) (${datePart})`,
          order: {
            id: row.id,
            source: isCustom ? "custom_request" : "order",
            name: row.name,
            phone: row.phone,
            address: row.address || "",
            wedding_date: row.wedding_date,
            service_name: svc,
          },
        };
      });
      
      setOrderOptions(options);
      return options;
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Error memuat data pesanan");
      return [];
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSearchOrders = (inputValue, meta) => {
    if (meta?.action && meta.action !== "input-change") return;
    if (!inputValue || inputValue.length < 2) {
      loadOrderOptions("");
      return;
    }
    loadOrderOptions(inputValue);
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleOpenModal = async (item = null) => {
    // Selalu refresh opsi pesanan saat modal dibuka,
    // supaya data terbaru tetap bisa dipilih saat edit.
    await loadOrderOptions();

    if (item) {
      setEditingItem(item);
      if (item.custom_request_id) {
        const selectedOption = {
          value: `custom:${item.custom_request_id}`,
          label: `#C${item.custom_request_id} — ${item.client_name} — ${item.package_name} (Custom)`,
          order: {
            id: item.custom_request_id,
            source: "custom_request",
            name: item.client_name,
            phone: item.client_phone,
            address: item.client_address,
            wedding_date: toDateOnlyString(item.wedding_date) || item.wedding_date,
            service_name: item.package_name,
          },
        };
        setSelectedOrder(selectedOption);
      } else if (item.order_id) {
        const selectedOption = {
          value: `order:${item.order_id}`,
          label: `#${item.order_id} — ${item.client_name} — ${item.package_name}`,
          order: {
            id: item.order_id,
            source: "order",
            name: item.client_name,
            phone: item.client_phone,
            address: item.client_address,
            wedding_date: toDateOnlyString(item.wedding_date) || item.wedding_date,
            service_name: item.package_name,
          },
        };
        setSelectedOrder(selectedOption);
      } else {
        setSelectedOrder(null);
      }
      
      setFormData({
        order_id: item.order_id || "",
        custom_request_id: item.custom_request_id || "",
        client_name: item.client_name || "",
        client_phone: item.client_phone || "",
        client_address: item.client_address || "",
        wedding_date: toDateOnlyString(item.wedding_date) || "",
        package_name: item.package_name || "",
        plaminan_image: item.plaminan_image || "",
        pintu_masuk_image: item.pintu_masuk_image || "",
        dekorasi_image: item.dekorasi_image || "",
        warna_kain: item.warna_kain || "",
        ukuran_tenda: item.ukuran_tenda || "",
        piring: item.piring || "",
        nama_pasangan: item.nama_pasangan || "",
        vendor_name: item.vendor_name || "Chekusphoto",
        maps_link: item.maps_link || "",
        notes: item.notes || "",
      });
    } else {
      setEditingItem(null);
      setSelectedOrder(null);
      setFormData({
        order_id: "",
        custom_request_id: "",
        client_name: "",
        client_phone: "",
        client_address: "",
        wedding_date: "",
        package_name: "",
        plaminan_image: "",
        pintu_masuk_image: "",
        dekorasi_image: "",
        warna_kain: "",
        ukuran_tenda: "",
        piring: "",
        nama_pasangan: "",
        vendor_name: "Chekusphoto",
        maps_link: "",
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleOrderSelect = (selectedOption) => {
    if (!selectedOption) {
      setSelectedOrder(null);
      setFormData(prev => ({
        ...prev,
        order_id: "",
        custom_request_id: "",
        client_name: "",
        client_phone: "",
        client_address: "",
        wedding_date: "",
        package_name: "",
      }));
      return;
    }

    const order = selectedOption.order;
    const isCustom = order.source === "custom_request";
    setSelectedOrder(selectedOption);
    setFormData(prev => ({
      ...prev,
      order_id: isCustom ? "" : String(order.id),
      custom_request_id: isCustom ? String(order.id) : "",
      client_name: order.name || "",
      client_phone: order.phone || "",
      client_address: order.address || "",
      wedding_date: toDateOnlyString(order.wedding_date) || "",
      package_name: order.service_name || "",
    }));
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasOrder = formData.order_id !== "" && formData.order_id != null;
    const hasCustom = formData.custom_request_id !== "" && formData.custom_request_id != null;
    if (!hasOrder && !hasCustom) {
      toast.error("Silakan pilih pesanan terlebih dahulu");
      return;
    }

    try {
      const url = editingItem
        ? `${API_BASE}/api/surat-jalan/${editingItem.id}`
        : `${API_BASE}/api/surat-jalan`;

      const payload = {
        ...formData,
        order_id: hasOrder ? Number(formData.order_id) : null,
        custom_request_id: hasCustom ? Number(formData.custom_request_id) : null,
        wedding_date: toDateOnlyString(formData.wedding_date) || formData.wedding_date || "",
        maps_link: (formData.maps_link || "").trim() || null,
      };
      const response = await fetch(url, {
        method: editingItem ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          `Surat jalan berhasil ${editingItem ? "diperbarui" : "ditambahkan"}!`
        );
        handleCloseModal();
        fetchSuratJalan();
        if (viewMode === "calendar") {
          fetchCalendarSuratJalan(calendarMonth);
        }
      } else {
        toast.error("Error menyimpan surat jalan");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error menyimpan surat jalan");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span>Apakah Anda yakin ingin menghapus surat jalan ini?</span>
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
        ),
        {
          duration: Infinity,
          position: "top-center",
        }
      );
    });

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/surat-jalan/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Surat jalan berhasil dihapus!");
        fetchSuratJalan();
        if (viewMode === "calendar") {
          fetchCalendarSuratJalan(calendarMonth);
        }
      } else {
        toast.error("Error menghapus surat jalan");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error menghapus surat jalan");
    }
  };

  const handleViewDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const loadImageAsDataURL = (url, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      let timeoutId;
      let resolved = false;
      
      const tryLoadImage = (useCORS = true) => {
        const img = new Image();
        
        if (useCORS) {
          img.crossOrigin = "anonymous";
        }
        
        img.onload = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeoutId);
          
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            try {
              const dataURL = canvas.toDataURL('image/jpeg', 0.85);
              resolve({ dataURL, width: img.width, height: img.height });
            } catch (canvasError) {
              console.error('Canvas conversion error:', canvasError);
              // If CORS fails, try without CORS
              if (useCORS) {
                tryLoadImage(false);
              } else {
                reject(canvasError);
              }
            }
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          if (resolved) return;
          console.error('Image load error:', error, 'URL:', url);
          // If CORS fails, try without CORS
          if (useCORS) {
            tryLoadImage(false);
          } else {
            resolved = true;
            clearTimeout(timeoutId);
            reject(new Error('Failed to load image: ' + url));
          }
        };
        
        img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
      };
      
      // Set timeout
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Image load timeout: ' + url));
        }
      }, timeout);
      
      // Start loading with CORS
      tryLoadImage(true);
    });
  };

  const generatePDF = async (item) => {
    const loadingToast = toast.loading("Memuat gambar dan membuat PDF...");
    
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SURAT JALAN", 105, 20, { align: "center" });

      // Vendor name
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(item.vendor_name || "Chekusphoto", 20, 35);

      // Nomor surat jalan
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`No: SJ/${String(item.id).padStart(4, "0")}/${new Date().getFullYear()}`, 20, 42);
      doc.text(`Tanggal: ${formatDate(new Date())}`, 20, 48);

      // Client Information
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Data Client:", 20, 60);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nama: ${item.client_name}`, 20, 68);
      doc.text(`No. Telepon: ${item.client_phone || "-"}`, 20, 74);

      const mapsUrl = item.maps_link && String(item.maps_link).trim();
      const hasMapsQr = Boolean(mapsUrl);
      const leftColumnWidth = hasMapsQr ? 130 : 170;
      const addressLines = item.client_address
        ? doc.splitTextToSize(`Alamat: ${item.client_address}`, leftColumnWidth)
        : [];

      if (addressLines.length > 0) {
        doc.text(addressLines, 20, 80);
      }

      const yPos = addressLines.length > 0 ? 86 + addressLines.length * 5 : 86;

      doc.text(`Tanggal Acara: ${item.wedding_date ? formatDate(item.wedding_date) : "-"}`, 20, yPos);

      if (hasMapsQr) {
        try {
          toast.loading("Membuat QR peta...", { id: loadingToast });
          const qrDataUrl = await QRCode.toDataURL(mapsUrl, {
            width: 200,
            margin: 1,
            errorCorrectionLevel: "M",
          });
          const qrX = 150;
          const qrTitleY = 60;
          const qrSizeMm = 38;
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(["Lokasi Acara", "(Scan QR)"], qrX, qrTitleY, { align: "center" });
          const qrTopY = qrTitleY + 6;
          doc.addImage(qrDataUrl, "PNG", qrX - qrSizeMm / 2, qrTopY, qrSizeMm, qrSizeMm);
        } catch (qrErr) {
          console.error("QR Maps error:", qrErr);
        }
      }

      // Alur konten kiri tidak terdorong oleh tinggi QR kanan.
      let yAfterTanggal = yPos + 8;
      if (yAfterTanggal > 250) {
        doc.addPage();
        yAfterTanggal = 20;
      }

      // Package Information
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Paket yang Diambil:", 20, yAfterTanggal + 4);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(item.package_name || "-", 20, yAfterTanggal + 12);

      // Detail Dekorasi
      let currentY = yAfterTanggal + 24;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detail Dekorasi:", 20, currentY);

      doc.setFontSize(10);
      currentY += 8;

      // Load images
      const imageWidth = 55;
      const maxImageHeight = 45;

      // Plaminan
      doc.setFont("helvetica", "bold");
      doc.text("1. Plaminan:", 20, currentY);
      currentY += 6;
      
      if (item.plaminan_image) {
        try {
          toast.loading("Memuat gambar Plaminan...", { id: loadingToast });
          const url = imageUrl(item.plaminan_image);
          const { dataURL, width, height } = await loadImageAsDataURL(url, 15000);
          const aspectRatio = width / height;
          const imgHeight = Math.min(maxImageHeight, imageWidth / aspectRatio);
          
          // Check if we need a new page
          if (currentY + imgHeight > 270) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.addImage(dataURL, 'JPEG', 20, currentY, imageWidth, imgHeight);
          currentY += imgHeight + 8;
          
          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error("Error loading plaminan image:", error.message, "URL:", item.plaminan_image);
          doc.setFont("helvetica", "normal");
          doc.text("   Gagal memuat gambar", 20, currentY);
          doc.setFontSize(8);
          doc.text(`   (${error.message})`, 20, currentY + 4);
          doc.setFontSize(10);
          currentY += 10;
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.text("   Belum ada gambar", 20, currentY);
        currentY += 6;
      }

      // Pintu Masuk
      currentY += 4;
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text("2. Pintu Masuk:", 20, currentY);
      currentY += 6;
      
      if (item.pintu_masuk_image) {
        try {
          toast.loading("Memuat gambar Pintu Masuk...", { id: loadingToast });
          const url = imageUrl(item.pintu_masuk_image);
          const { dataURL, width, height } = await loadImageAsDataURL(url, 15000);
          const aspectRatio = width / height;
          const imgHeight = Math.min(maxImageHeight, imageWidth / aspectRatio);
          
          if (currentY + imgHeight > 270) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.addImage(dataURL, 'JPEG', 20, currentY, imageWidth, imgHeight);
          currentY += imgHeight + 8;
          
          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error("Error loading pintu masuk image:", error.message, "URL:", item.pintu_masuk_image);
          doc.setFont("helvetica", "normal");
          doc.text("   Gagal memuat gambar", 20, currentY);
          doc.setFontSize(8);
          doc.text(`   (${error.message})`, 20, currentY + 4);
          doc.setFontSize(10);
          currentY += 10;
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.text("   Belum ada gambar", 20, currentY);
        currentY += 6;
      }

      // Dekorasi
      currentY += 4;
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text("3. Dekorasi:", 20, currentY);
      currentY += 6;
      
      if (item.dekorasi_image) {
        try {
          toast.loading("Memuat gambar Dekorasi...", { id: loadingToast });
          const url = imageUrl(item.dekorasi_image);
          const { dataURL, width, height } = await loadImageAsDataURL(url, 15000);
          const aspectRatio = width / height;
          const imgHeight = Math.min(maxImageHeight, imageWidth / aspectRatio);
          
          if (currentY + imgHeight > 270) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.addImage(dataURL, 'JPEG', 20, currentY, imageWidth, imgHeight);
          currentY += imgHeight + 8;
        } catch (error) {
          console.error("Error loading dekorasi image:", error.message, "URL:", item.dekorasi_image);
          doc.setFont("helvetica", "normal");
          doc.text("   Gagal memuat gambar", 20, currentY);
          doc.setFontSize(8);
          doc.text(`   (${error.message})`, 20, currentY + 4);
          doc.setFontSize(10);
          currentY += 10;
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.text("   Belum ada gambar", 20, currentY);
        currentY += 6;
      }

      // Catatan
      currentY += 6;
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Catatan:", 20, currentY);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      currentY += 8;
      
      if (item.warna_kain) {
        doc.text(`Warna Kain: ${item.warna_kain}`, 20, currentY);
        currentY += 6;
      }
      
      if (item.ukuran_tenda) {
        doc.text(`Ukuran Tenda: ${item.ukuran_tenda}`, 20, currentY);
        currentY += 6;
      }

      if (item.piring) {
        doc.text(`Piring: ${item.piring}`, 20, currentY);
        currentY += 6;
      }

      if (item.nama_pasangan) {
        doc.text(`Nama Pasangan: ${item.nama_pasangan}`, 20, currentY);
        currentY += 6;
      }

      if (item.notes) {
        currentY += 2;
        const notesLines = doc.splitTextToSize(`Catatan Lain: ${item.notes}`, 170);
        doc.text(notesLines, 20, currentY);
        currentY += notesLines.length * 6;
      }

      // Signature section
      currentY += 15;
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Left signature
      doc.text("Pengirim,", 30, currentY);
      doc.text("_________________", 25, currentY + 20);
      doc.text("(                        )", 25, currentY + 26);

      // Right signature
      doc.text("Penerima,", 140, currentY);
      doc.text("_________________", 135, currentY + 20);
      doc.text("(                        )", 135, currentY + 26);

      // Save PDF
      toast.loading("Membuat PDF...", { id: loadingToast });
      
      const fileName = `surat-jalan-${item.id}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF berhasil dibuat!", { id: loadingToast });
    } catch (error) {
      toast.error("Gagal membuat PDF. Periksa console untuk detail.", { id: loadingToast });
      console.error("PDF generation error:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      <Helmet>
        <title>Surat Jalan - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Surat Jalan</h1>
          <p className="text-gray-600">Kelola surat jalan untuk pengiriman dekorasi.</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            Tambah Surat Jalan
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama client..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${viewMode === "calendar" ? "bg-[#2f4274] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <Calendar size={16} />
              Kalender
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${viewMode === "table" ? "bg-[#2f4274] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <List size={16} />
              Tabel
            </button>
          </div>
        </div>

        {/* Calendar View - same style as AdminOrders */}
        {viewMode === "calendar" && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Kalender Surat Jalan
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeCalendarMonth(-1)}
                      className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                      title="Bulan sebelumnya"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-medium text-gray-700">
                      {calendarMonth.toLocaleDateString("id-ID", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      onClick={() => changeCalendarMonth(1)}
                      className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                      title="Bulan berikutnya"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Total client: {totalUniqueCalendarClients}
                </p>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-7 bg-gray-50 text-xs font-semibold text-gray-600">
                    {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                      (day) => (
                        <div
                          key={day}
                          className="px-2 py-2 text-center uppercase tracking-wide"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-7 text-sm">
                    {calendarLoading ? (
                      <div className="col-span-7 flex items-center justify-center py-8">
                        <span className="text-gray-500 text-sm">
                          Memuat data surat jalan untuk bulan ini...
                        </span>
                      </div>
                    ) : (
                      getCalendarDays().map((date, index) => {
                        if (!date) {
                          return (
                            <div
                              key={`empty-${index}`}
                              className="h-14 border border-gray-100 bg-gray-50"
                            />
                          );
                        }

                        const y = date.getFullYear();
                        const m = date.getMonth() + 1;
                        const d = date.getDate();
                        const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

                        const itemsForDay = suratJalanByDate[key] || [];
                        const hasItems = itemsForDay.length > 0;
                        const isSelected = selectedDate === key;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedDate(key)}
                            className={`h-14 border border-gray-100 flex flex-col items-center justify-center relative transition ${
                              hasItems
                                ? "bg-red-200 hover:bg-red-100"
                                : "bg-blue-50 hover:bg-blue-100"
                            } ${isSelected ? "ring-2 ring-[#2f4274] z-10" : ""}`}
                          >
                            <span
                              className={`text-sm font-medium ${
                                hasItems ? "text-red-700" : "text-blue-700"
                              }`}
                            >
                              {d}
                            </span>
                            {hasItems && (
                              <span className="bg-[#2f4274] rounded md:py-1 px-2 mt-1 text-[7px] md:text-xs font-semibold text-white">
                                {itemsForDay.length} Client
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected date: list surat jalan for that day */}
            {selectedDate && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg">
                  <span className="text-sm text-blue-800">
                    Surat jalan untuk tanggal{" "}
                    {new Date(selectedDate).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Hapus filter
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(suratJalanByDate[selectedDate] || []).map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-gray-50/50"
                    >
                      <div className="text-base font-semibold text-gray-900 mb-1">{item.client_name}</div>
                      <div className="text-xs text-gray-500 mb-2">
                        SJ/{String(item.id).padStart(4, "0")}/{new Date(item.created_at).getFullYear()} · {item.package_name}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleViewDetail(item)}
                          className="p-1.5 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20"
                          title="Detail"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 rounded-lg text-green-600 bg-green-50 hover:bg-green-100"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => generatePDF(item)}
                          className="p-1.5 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100"
                          title="PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {viewMode === "table" && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Tanggal Acara</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Nama Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">No. Surat</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Paket</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Vendor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="w-10 h-10 border-2 border-[#2f4274]/30 border-t-[#2f4274] rounded-full animate-spin" />
                        <span className="text-sm font-medium">Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : suratJalanList.length > 0 ? (
                  suratJalanList.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`transition-colors duration-150 hover:bg-[#2f4274]/[0.04] ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {item.wedding_date ? formatDate(item.wedding_date) : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{item.client_name}</div>
                        <div className="text-xs text-gray-500">{item.client_phone || "-"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          SJ/{String(item.id).padStart(4, "0")}/{new Date(item.created_at).getFullYear()}
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(item.created_at)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.package_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.vendor_name || "Chekusphoto"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleViewDetail(item)} className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20" title="Detail"><Eye size={16} /></button>
                          <button onClick={() => handleOpenModal(item)} className="p-2 rounded-lg text-green-600 bg-green-50 hover:bg-green-100" title="Edit"><Edit size={16} /></button>
                          <button onClick={() => generatePDF(item)} className="p-2 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100" title="PDF"><Download size={16} /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100" title="Hapus"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <FileText size={32} className="text-gray-300" />
                        <span className="text-sm font-medium">Belum ada surat jalan</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - only in table view */}
          {viewMode === "table" && pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl border border-gray-100 px-6 py-4 shadow-sm mt-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-800">
                  {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>
                <span className="mx-1">dari</span>
                <span className="font-medium text-gray-800">{pagination.total}</span>
                <span className="ml-1">surat jalan</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`min-w-[2.25rem] py-2 px-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      page === pagination.page ? "bg-[#2f4274] text-white shadow-md shadow-[#2f4274]/25" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingItem ? "Edit" : "Tambah"} Surat Jalan
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Order Selection */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Pilih Pesanan
                    </h3>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pesanan <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={selectedOrder}
                      onChange={handleOrderSelect}
                      onInputChange={handleSearchOrders}
                      options={orderOptions}
                      isLoading={isLoadingOrders}
                      isClearable
                      filterOption={() => true}
                      placeholder="Ketik untuk mencari pesanan..."
                      noOptionsMessage={() => "Tidak ada pesanan ditemukan"}
                      loadingMessage={() => "Memuat data..."}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
                          boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
                          '&:hover': {
                            borderColor: '#9ca3af'
                          },
                          borderRadius: '0.5rem',
                          padding: '0.125rem',
                          backgroundColor: 'white'
                        }),
                        menu: (base) => ({
                          ...base,
                          borderRadius: '0.5rem',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          zIndex: 50
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected 
                            ? '#3b82f6' 
                            : state.isFocused 
                            ? '#dbeafe' 
                            : 'white',
                          color: state.isSelected ? 'white' : '#1f2937',
                          cursor: 'pointer',
                          '&:active': {
                            backgroundColor: '#2563eb'
                          }
                        })
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Saat edit, pesanan tetap bisa diganti jika data pesanan lama sudah dihapus.
                    </p>
                  </div>

                  {/* Client Information - Display Only */}
                  {selectedOrder && (
                    <>
                      <div className="md:col-span-2 mt-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                          Data Client (dari pesanan)
                        </h3>
                      </div>

                      <div className="md:col-span-2">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-medium text-gray-500">Nama Client</span>
                              <p className="text-sm text-gray-900 mt-1">{formData.client_name || "-"}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">No. Telepon</span>
                              <p className="text-sm text-gray-900 mt-1">{formData.client_phone || "-"}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500">Alamat</span>
                            <p className="text-sm text-gray-900 mt-1">{formData.client_address || "-"}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-medium text-gray-500">Tanggal Acara</span>
                              <p className="text-sm text-gray-900 mt-1">
                                {(selectedOrder?.order?.wedding_date || formData.wedding_date)
                                  ? formatDate(selectedOrder?.order?.wedding_date || formData.wedding_date)
                                  : "-"}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">Nama Paket</span>
                              <p className="text-sm text-gray-900 mt-1">{formData.package_name || "-"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Gambar Dekorasi - Upload langsung */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Gambar Dekorasi
                    </h3>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {["plaminan_image", "pintu_masuk_image", "dekorasi_image"].map((field) => {
                    const labels = {
                      plaminan_image: "Plaminan",
                      pintu_masuk_image: "Pintu Masuk",
                      dekorasi_image: "Dekorasi",
                    };
                    const src = formData[field] ? imageUrl(formData[field]) : "";
                    return (
                      <div key={field} className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gambar {labels[field]}
                        </label>
                        <div className="flex flex-wrap items-start gap-3">
                          {src ? (
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                              <img
                                src={src}
                                alt={labels[field]}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect fill='%23f3f4f6' width='96' height='96'/%3E%3Ctext fill='%239ca3af' font-size='10' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ETidak ada%3C/text%3E%3C/svg%3E";
                                }}
                              />
                            </div>
                          ) : null}
                          <div className="flex flex-col gap-2 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => triggerFileUpload(field)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2f4274]/10 text-[#2f4274] hover:bg-[#2f4274]/20 text-sm font-medium"
                            >
                              <Upload size={16} />
                              Upload Gambar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Notes */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Catatan
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warna Kain
                    </label>
                    <input
                      type="text"
                      name="warna_kain"
                      value={formData.warna_kain}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ukuran Tenda
                    </label>
                    <input
                      type="text"
                      name="ukuran_tenda"
                      value={formData.ukuran_tenda}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Piring
                    </label>
                    <input
                      type="text"
                      name="piring"
                      value={formData.piring}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama pasangan
                    </label>
                    <input
                      type="text"
                      name="nama_pasangan"
                      value={formData.nama_pasangan}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link Google Maps (QR di surat jalan)
                    </label>
                    <input
                      type="url"
                      name="maps_link"
                      value={formData.maps_link}
                      onChange={handleInputChange}
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tempel link share dari Google Maps. QR tercetak otomatis di PDF untuk tim/vendor.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Vendor
                    </label>
                    <input
                      type="text"
                      name="vendor_name"
                      value={formData.vendor_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan Lain
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingItem ? "Perbarui" : "Tambah"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  Detail Surat Jalan #{selectedItem.id}
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Informasi Client
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">Nama:</span>
                        <p className="text-gray-900">{selectedItem.client_name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Telepon:
                        </span>
                        <p className="text-gray-900">
                          {selectedItem.client_phone || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Alamat:</span>
                        <p className="text-gray-900">
                          {selectedItem.client_address || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Informasi Acara
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">
                          Tanggal Acara:
                        </span>
                        <p className="text-gray-900">
                          {selectedItem.wedding_date
                            ? formatDate(selectedItem.wedding_date)
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Paket:</span>
                        <p className="text-gray-900">{selectedItem.package_name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Vendor:</span>
                        <p className="text-gray-900">
                          {selectedItem.vendor_name || "Chekusphoto"}
                        </p>
                      </div>
                      {selectedItem.maps_link?.trim() ? (
                        <div>
                          <span className="font-medium text-gray-700">Google Maps (QR surat jalan):</span>
                          <a
                            href={selectedItem.maps_link.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 break-all block mt-1"
                          >
                            {selectedItem.maps_link.trim()}
                          </a>
                          <GoogleMapsVendorQr url={selectedItem.maps_link} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Gambar Dekorasi
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="font-medium text-gray-700 block mb-2">Plaminan:</span>
                      {selectedItem.plaminan_image ? (
                        <div className="relative group">
                          <img
                            src={imageUrl(selectedItem.plaminan_image)}
                            alt="Plaminan"
                            className="w-full h-48 object-cover rounded-lg border border-gray-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EGambar tidak dapat dimuat%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <a
                            href={imageUrl(selectedItem.plaminan_image)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
                          >
                            <span className="text-white text-sm font-medium">Lihat Full Size</span>
                          </a>
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400">Belum ada gambar</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 block mb-2">
                        Pintu Masuk:
                      </span>
                      {selectedItem.pintu_masuk_image ? (
                        <div className="relative group">
                          <img
                            src={imageUrl(selectedItem.pintu_masuk_image)}
                            alt="Pintu Masuk"
                            className="w-full h-48 object-cover rounded-lg border border-gray-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EGambar tidak dapat dimuat%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <a
                            href={imageUrl(selectedItem.pintu_masuk_image)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
                          >
                            <span className="text-white text-sm font-medium">Lihat Full Size</span>
                          </a>
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400">Belum ada gambar</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 block mb-2">Dekorasi:</span>
                      {selectedItem.dekorasi_image ? (
                        <div className="relative group">
                          <img
                            src={imageUrl(selectedItem.dekorasi_image)}
                            alt="Dekorasi"
                            className="w-full h-48 object-cover rounded-lg border border-gray-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EGambar tidak dapat dimuat%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <a
                            href={imageUrl(selectedItem.dekorasi_image)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
                          >
                            <span className="text-white text-sm font-medium">Lihat Full Size</span>
                          </a>
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400">Belum ada gambar</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Catatan
                  </h3>
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900">
                      <span className="font-medium">Warna Kain:</span>{" "}
                      {selectedItem.warna_kain || "-"}
                    </p>
                    <p className="text-gray-900">
                      <span className="font-medium">Ukuran Tenda:</span>{" "}
                      {selectedItem.ukuran_tenda || "-"}
                    </p>
                    <p className="text-gray-900">
                      <span className="font-medium">Piring:</span>{" "}
                      {selectedItem.piring || "-"}
                    </p>
                    <p className="text-gray-900">
                      <span className="font-medium">Nama Pasangan:</span>{" "}
                      {selectedItem.nama_pasangan || "-"}
                    </p>
                    {selectedItem.notes && (
                      <p className="text-gray-900 mt-3">
                        <span className="font-medium">Catatan Lain:</span>
                        <br />
                        {selectedItem.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => generatePDF(selectedItem)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <FileText size={18} />
                    Generate PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminSuratJalan;
