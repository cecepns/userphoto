import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Eye, Trash2, ChevronLeft, ChevronRight, X, Edit, Download, CheckCircle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AdminLayout from "../../components/AdminLayout";
import { formatRupiah, formatDate, formatDateTime } from "../../utils/formatters";
import jsPDF from "jspdf";
import { useSiteIdentity } from "../../hooks/useSiteIdentity";

const API_BASE = "https://api.kingcreativestudio.my.id/chekusphoto/api";
const CLIENT_COLOR_POOL = [
  "bg-green-600 text-white",
  "bg-sky-600 text-white",
  "bg-indigo-600 text-white",
  "bg-amber-700 text-white",
  "bg-purple-700 text-white",
  "bg-orange-600 text-white",
  "bg-emerald-700 text-white",
  "bg-rose-600 text-white",
  "bg-cyan-700 text-white",
  "bg-blue-700 text-white",
];
const CLIENT_ROW_COLOR_POOL = [
  "bg-green-600",
  "bg-sky-600",
  "bg-indigo-600",
  "bg-amber-700",
  "bg-purple-700",
  "bg-orange-600",
  "bg-emerald-700",
  "bg-rose-600",
  "bg-cyan-700",
  "bg-blue-700",
];

const normalizePhone = (value) =>
  (value || "")
    .toString()
    .replace(/\D/g, "")
    .trim();
const toNumber = (value) => {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [customRequests, setCustomRequests] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newBookingAmount, setNewBookingAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBankSelectionModal, setShowBankSelectionModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedBankMethod, setSelectedBankMethod] = useState(null);
  const [pendingInvoiceItem, setPendingInvoiceItem] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tableFilteredOrders, setTableFilteredOrders] = useState(null);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
   const [editableOrderItems, setEditableOrderItems] = useState([]);
  const [savingOrderItems, setSavingOrderItems] = useState(false);
  const [vendorsList, setVendorsList] = useState([]);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("all");
  const [freelancersList, setFreelancersList] = useState([]);
  const [assignedFreelancers, setAssignedFreelancers] = useState([]);
  const [calendarSearch, setCalendarSearch] = useState("");
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const { appName, contact: siteContact } = useSiteIdentity();

  // Financial States
  const [orderFinance, setOrderFinance] = useState(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [finAccommodationCost, setFinAccommodationCost] = useState('');
  const [finProductionItems, setFinProductionItems] = useState([]);


  // Kunci duplikat: email + wedding_date sama = kemungkinan pesanan ganda
  const duplicateKey = (order) =>
    `${(order.email || "").trim().toLowerCase()}|${order.wedding_date || ""}`;

  // Gabung order biasa + custom-request, urutkan created_at desc
  const combinedOrders = useMemo(() => {
    const fromOrders = (orders || []).map((o) => ({ ...o, orderType: "order" }));
    const fromRequests = (customRequests || []).map((r) => ({
      ...r,
      orderType: "custom_request",
      service_name: r.services || "-",
      address: r.additional_requests || "",
      notes: r.additional_requests || r.notes,
    }));
    return [...fromOrders, ...fromRequests].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [orders, customRequests]);

  // Kalender: pesanan (order + custom request) untuk bulan yang dipilih
  const calendarOrders = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    return combinedOrders.filter((order) => {
      const rawDate = order.wedding_date;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return false;

      // Filter by selected vendor
      if (selectedVendorFilter !== "all" && String(order.vendor_id) !== String(selectedVendorFilter)) {
        return false;
      }

      // Filter by search name
      if (calendarSearch.trim() && !order.name.toLowerCase().includes(calendarSearch.toLowerCase())) {
        return false;
      }

      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [combinedOrders, calendarMonth, selectedVendorFilter, calendarSearch]);

  // Set kunci yang punya lebih dari satu pesanan (kemungkinan duplikat)
  const duplicateKeysSet = useMemo(() => {
    const countByKey = {};
    combinedOrders.forEach((o) => {
      const k = duplicateKey(o);
      countByKey[k] = (countByKey[k] || 0) + 1;
    });
    return new Set(Object.keys(countByKey).filter((k) => countByKey[k] > 1));
  }, [combinedOrders]);

  const duplicateOrderRankMap = useMemo(() => {
    const rankMap = {};
    const groupedOrders = {};

    combinedOrders.forEach((order) => {
      const key = duplicateKey(order);
      if (!duplicateKeysSet.has(key)) return;
      if (!groupedOrders[key]) groupedOrders[key] = [];
      groupedOrders[key].push(order);
    });

    Object.values(groupedOrders).forEach((group) => {
      const orderedOldestFirst = [...group].sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        if (aTime !== bTime) return aTime - bTime;
        return Number(a.id) - Number(b.id);
      });

      orderedOldestFirst.forEach((order, index) => {
        rankMap[`${order.orderType}-${order.id}`] = index + 1;
      });
    });

    return rankMap;
  }, [combinedOrders, duplicateKeysSet]);

  const clientColorIndexByPhone = useMemo(() => {
    const map = {};
    let colorIndex = 0;
    combinedOrders.forEach((order) => {
      const phoneKey = normalizePhone(order.phone);
      if (!phoneKey || map[phoneKey]) return;
      map[phoneKey] = colorIndex % CLIENT_COLOR_POOL.length;
      colorIndex += 1;
    });
    return map;
  }, [combinedOrders]);

  const getClientChipColor = (phone) => {
    const phoneKey = normalizePhone(phone);
    if (!phoneKey || clientColorIndexByPhone[phoneKey] == null) {
      return "bg-gray-700 text-white";
    }
    return CLIENT_COLOR_POOL[clientColorIndexByPhone[phoneKey]];
  };

  const getClientRowColor = (phone) => {
    const phoneKey = normalizePhone(phone);
    if (!phoneKey || clientColorIndexByPhone[phoneKey] == null) {
      return "bg-gray-700";
    }
    return CLIENT_ROW_COLOR_POOL[clientColorIndexByPhone[phoneKey]];
  };

  const uniqueCalendarClients = useMemo(() => {
    const phones = new Set();
    calendarOrders.forEach((order) => {
      const phoneKey = normalizePhone(order.phone);
      if (phoneKey) phones.add(phoneKey);
    });
    return phones.size;
  }, [calendarOrders]);

  // Filter untuk tampilkan hanya kemungkinan duplikat (tetap pakai combined untuk konsistensi)
  const filteredCombined = useMemo(
    () =>
      showDuplicatesOnly
        ? combinedOrders.filter((o) => duplicateKeysSet.has(duplicateKey(o)))
        : combinedOrders,
    [combinedOrders, showDuplicatesOnly, duplicateKeysSet]
  );

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    const initFilters = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const headers = { Authorization: `Bearer ${token}` };
        const [vRes, fRes] = await Promise.all([
          fetch(`${API_BASE}/vendors/all`, { headers }),
          fetch(`${API_BASE}/freelancers-inhouse/all`, { headers })
        ]);
        const vData = await vRes.json();
        const fData = await fRes.json();
        setVendorsList(Array.isArray(vData) ? vData : []);
        setFreelancersList(Array.isArray(fData) ? fData : []);
      } catch (e) {
        console.error("Error fetching filters:", e);
      }
    };
    initFilters();
  }, []);

  const fetchAssignedFreelancers = async () => {
    if (!selectedOrder) {
      setAssignedFreelancers([]);
      return;
    }
    try {
      const token = localStorage.getItem("admin_token");
      const d = new Date(selectedOrder.wedding_date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const res = await fetch(`${API_BASE}/freelance-calendar?year=${y}&month=${m}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const list = Array.isArray(data.assignments) ? data.assignments : [];
      const match = list.filter(
        (a) => String(a.order_id) === String(selectedOrder.id) && a.order_source === selectedOrder.orderType
      );
      setAssignedFreelancers(match);
    } catch (e) {
      console.error("Error fetching assigned freelancers:", e);
    }
  };

  useEffect(() => {
    fetchAssignedFreelancers();
  }, [selectedOrder]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`${API_BASE}/payment-methods`);
      const data = await response.json();
      setPaymentMethods(data);
      if (data.length > 0) {
        setSelectedBankMethod(data[0]);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setCalendarLoading(true);
    const token = localStorage.getItem("admin_token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [ordersRes, requestsRes] = await Promise.all([
        fetch(
          `${API_BASE}/orders?page=1&limit=500&status=pending`,
          { headers }
        ),
        fetch(
          `${API_BASE}/custom-requests?page=1&limit=500&status=pending`,
          { headers }
        ),
      ]);
      const ordersData = await ordersRes.json();
      const requestsData = await requestsRes.json();

      const ordersList = Array.isArray(ordersData)
        ? ordersData
        : ordersData.orders || [];
      const requestsList = requestsData.requests || [];

      setOrders(ordersList);
      setCustomRequests(requestsList);
      const total = ordersList.length + requestsList.length;
      setOrdersPagination((prev) => ({
        ...prev,
        total,
        totalPages: Math.max(1, Math.ceil(total / prev.limit)),
      }));
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setCustomRequests([]);
      setOrdersPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
      }));
    } finally {
      setLoading(false);
      setCalendarLoading(false);
    }
  };


  const handleStatusUpdate = async (order, newStatus) => {
    const isCustom = order.orderType === "custom_request";
    const url = isCustom
      ? `${API_BASE}/custom-requests/${order.id}/status`
      : `${API_BASE}/orders/${order.id}/status`;
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        if (isCustom) {
          setCustomRequests((prev) => prev.filter((r) => r.id !== order.id));
        } else {
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        }
        setTableFilteredOrders((prev) =>
          Array.isArray(prev)
            ? prev.filter((o) => !(o.orderType === order.orderType && o.id === order.id))
            : prev
        );
        fetchOrders();
        toast.success("Status pesanan berhasil diperbarui!");
      } else {
        toast.error("Error memperbarui status pesanan");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error memperbarui status pesanan");
    }
  };


  const handleDeleteOrder = async (order) => {
    const confirmed = await new Promise((resolve) => {
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span>Apakah Anda yakin ingin menghapus pesanan ini?</span>
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

    const isCustom = order.orderType === "custom_request";
    const url = isCustom
      ? `${API_BASE}/custom-requests/${order.id}`
      : `${API_BASE}/orders/${order.id}`;
    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
      });

      if (response.ok) {
        if (isCustom) {
          setCustomRequests((prev) => prev.filter((r) => r.id !== order.id));
        } else {
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        }
        setTableFilteredOrders((prev) =>
          Array.isArray(prev)
            ? prev.filter((o) => !(o.orderType === order.orderType && o.id === order.id))
            : prev
        );

        if (selectedOrder && selectedOrder.id === order.id && selectedOrder.orderType === order.orderType) {
          setShowDetailModal(false);
          setSelectedOrder(null);
        }

        fetchOrders();
        toast.success("Pesanan berhasil dihapus!");
      } else {
        toast.error("Error menghapus pesanan");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error menghapus pesanan");
    }
  };

  const fetchOrderFinance = async (order) => {
    if (!order) return;
    setLoadingFinance(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/finance/orders?order_id=${order.id}&order_source=${order.orderType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      let parsedItems = [];
      if (order.orderType === "custom_request") {
        parsedItems = Array.isArray(order.items_details) ? order.items_details : [];
      } else {
        try {
          parsedItems = JSON.parse(order.selected_items || "[]");
        } catch {
          parsedItems = [];
        }
      }

      const isAlbumOrDrone = (name) => {
        const n = String(name || '').toLowerCase();
        return n.includes('album') || n.includes('drone');
      };
      const matchingCheckoutItems = parsedItems.filter(item => isAlbumOrDrone(item.name || item.item_name));

      if (data.success && data.data && data.data.length > 0) {
        const fin = data.data[0];
        setOrderFinance(fin);
        setFinAccommodationCost(fin.accommodation_cost != null ? String(fin.accommodation_cost) : '');
        
        const savedItems = Array.isArray(fin.production_items) ? fin.production_items : [];
        const merged = [];
        
        matchingCheckoutItems.forEach(cItem => {
          const cName = (cItem.name || cItem.item_name || "Item").trim();
          const match = savedItems.find(s => s.label.trim().toLowerCase() === cName.toLowerCase());
          merged.push({
            label: cName,
            amount: match ? String(match.amount) : '0'
          });
        });

        savedItems.forEach(s => {
          const alreadyAdded = merged.some(m => m.label.toLowerCase() === s.label.trim().toLowerCase());
          if (!alreadyAdded) {
            merged.push({
              label: s.label,
              amount: String(s.amount)
            });
          }
        });

        setFinProductionItems(merged);
      } else {
        setOrderFinance({
          financial_id: null,
          accommodation_applied: false,
          notes: '',
          production_items: [],
          production_total: 0,
        });
        setFinAccommodationCost('');
        
        const initial = matchingCheckoutItems.map(cItem => ({
          label: (cItem.name || cItem.item_name || "Item").trim(),
          amount: '0'
        }));
        setFinProductionItems(initial);
      }
    } catch (e) {
      console.error("Error fetching order finance:", e);
    } finally {
      setLoadingFinance(false);
    }
  };

  const handleSaveFinanceDetails = async () => {
    if (!selectedOrder) return;
    try {
      const token = localStorage.getItem('admin_token');
      const payload = {
        order_source: selectedOrder.orderType,
        order_id: selectedOrder.id,
        accommodation_applied: Number(finAccommodationCost) > 0,
        accommodation_cost: finAccommodationCost === '' ? null : Number(finAccommodationCost),
        notes: orderFinance?.notes || '',
        production_items: finProductionItems.map(item => ({
          label: item.label.trim(),
          amount: Number(item.amount) || 0
        }))
      };

      const res = await fetch(`${API_BASE}/admin/finance/orders`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Biaya produksi & akomodasi disimpan ke keuangan!");
        fetchOrderFinance(selectedOrder);
      } else {
        toast.error(data.message || "Gagal menyimpan data keuangan");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghubungkan ke server");
    }
  };

  const handleViewDetail = (order) => {
    if (order.orderType === "order") {
      let parsedItems = [];
      try {
        const raw = JSON.parse(order.selected_items || "[]");
        parsedItems = Array.isArray(raw) ? raw : [];
      } catch {
        parsedItems = [];
      }
      const normalizedItems = parsedItems.map((item) => ({
        ...item,
        final_price: Number(
          item?.final_price ?? item?.item_price ?? item?.price ?? item?.custom_price ?? 0
        ) || 0,
      }));
      setEditableOrderItems(normalizedItems);
    } else {
      setEditableOrderItems([]);
    }
    setSelectedOrder(order);
    fetchOrderFinance(order);
    setShowDetailModal(true);
  };


  const handleRemoveEditableItem = (itemIndex) => {
    setEditableOrderItems((prev) => prev.filter((_, index) => index !== itemIndex));
  };

  const handleSaveEditableItems = async () => {
    if (!selectedOrder || selectedOrder.orderType !== "order") return;
    setSavingOrderItems(true);
    try {
      const response = await fetch(
        `${API_BASE}/orders/${selectedOrder.id}/selected-items`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
          body: JSON.stringify({
            selected_items: editableOrderItems,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Gagal menyimpan item layanan");
      }

      const nextSelectedItems = JSON.stringify(data.order?.selected_items || editableOrderItems);
      const nextTotalAmount = Number(data.order?.total_amount ?? selectedOrder.total_amount ?? 0);

      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              selected_items: nextSelectedItems,
              total_amount: nextTotalAmount,
            }
          : prev
      );
      setOrders((prev) =>
        prev.map((order) =>
          order.id === selectedOrder.id
            ? {
                ...order,
                selected_items: nextSelectedItems,
                total_amount: nextTotalAmount,
              }
            : order
        )
      );
      setTableFilteredOrders((prev) =>
        Array.isArray(prev)
          ? prev.map((order) =>
              order.orderType === "order" && order.id === selectedOrder.id
                ? {
                    ...order,
                    selected_items: nextSelectedItems,
                    total_amount: nextTotalAmount,
                  }
                : order
            )
          : prev
      );
      toast.success("Item layanan berhasil diperbarui");
    } catch (error) {
      console.error("Error saving selected items:", error);
      toast.error(error.message || "Gagal menyimpan item layanan");
    } finally {
      setSavingOrderItems(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-600 text-white";
      case "confirmed":
        return "bg-blue-600 text-white";
      case "completed":
        return "bg-green-600 text-white";
      case "cancelled":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-700 text-white";
    }
  };

  const handleOrdersPageChange = (newPage) => {
    setOrdersPagination((prev) => ({ ...prev, page: newPage }));
  };

  const getPaginationPages = (currentPage, totalPages) => {
    if (totalPages <= 7) {
      // Jika total halaman <= 7, tampilkan semua
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const showEllipsis = totalPages > 7;

    if (currentPage <= 3) {
      // Dekat dengan awal: 1 2 3 ... last-1 last
      pages.push(1, 2, 3);
      if (showEllipsis) pages.push("ellipsis");
      pages.push(totalPages - 1, totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Dekat dengan akhir: 1 2 ... last-2 last-1 last
      pages.push(1, 2);
      if (showEllipsis) pages.push("ellipsis");
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    } else {
      // Di tengah: 1 ... current-1 current current+1 ... last
      pages.push(1);
      if (showEllipsis) pages.push("ellipsis");
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      if (showEllipsis) pages.push("ellipsis");
      pages.push(totalPages);
    }

    return pages;
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
    const startWeekday = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

    const days = [];

    // Leading empty cells for first week
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }

    // Actual days of month
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const bookingsByDate = calendarOrders.reduce((acc, order) => {
    const rawDate = order.wedding_date;
    if (!rawDate) return acc;

    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) return acc;

    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {});

  const handleFilterTableBySelectedDate = (dateKey) => {
    if (!dateKey) return;
    const ordersForDate = bookingsByDate[dateKey] || [];
    setTableFilteredOrders(ordersForDate);
  };

  const handleClearTableFilter = () => {
    setTableFilteredOrders(null);
  };

  const paginatedCombined = useMemo(
    () =>
      filteredCombined.slice(
        (ordersPagination.page - 1) * ordersPagination.limit,
        ordersPagination.page * ordersPagination.limit
      ),
    [filteredCombined, ordersPagination.page, ordersPagination.limit]
  );
  const tableOrders = tableFilteredOrders ?? paginatedCombined;


  const handleEditBookingAmount = (item) => {
    setEditingItem(item);
    setNewBookingAmount(item.booking_amount?.toString() || "");
    setShowEditBookingModal(true);
  };

  const handleUpdateBookingAmount = async () => {
    if (!newBookingAmount || isNaN(parseFloat(newBookingAmount))) {
      toast.error("Masukkan jumlah booking yang valid");
      return;
    }

    const isCustom = editingItem.orderType === "custom_request";
    const url = isCustom
      ? `${API_BASE}/custom-requests/${editingItem.id}/booking-amount`
      : `${API_BASE}/orders/${editingItem.id}/booking-amount`;
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({
          booking_amount: parseFloat(newBookingAmount),
        }),
      });

      if (response.ok) {
        fetchOrders();
        toast.success("Booking amount berhasil diperbarui!");
        setShowEditBookingModal(false);
        setEditingItem(null);
        setNewBookingAmount("");
      } else {
        toast.error("Error memperbarui booking amount");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error memperbarui booking amount");
    }
  };

  const calculateInvoiceTotal = (item) => {
    if (!item) return 0;
    if (item.orderType === "custom_request") {
      const details = Array.isArray(item.items_details) ? item.items_details : [];
      const detailsTotal = details.reduce((sum, row) => {
        const p = typeof row?.price === "number" ? row.price : parseFloat(row?.price) || 0;
        return sum + p;
      }, 0);
      return detailsTotal > 0 ? detailsTotal : toNumber(item.total_amount || 0);
    }

    const basePrice = toNumber(item.base_price || 0);
    let selectedItemsTotal = 0;
    if (item.selected_items) {
      try {
        const selectedItems = JSON.parse(item.selected_items);
        if (Array.isArray(selectedItems)) {
          selectedItemsTotal = selectedItems.reduce((sum, selectedItem) => {
            const itemPrice =
              selectedItem.final_price ||
              selectedItem.item_price ||
              selectedItem.price ||
              selectedItem.custom_price ||
              0;
            const quantity = selectedItem.quantity || 1;
            return sum + toNumber(itemPrice) * quantity;
          }, 0);
        }
      } catch (error) {
        console.error("Error parsing selected_items for pelunasan:", error);
      }
    }
    const recalculated = basePrice + selectedItemsTotal;
    return recalculated > 0 ? recalculated : toNumber(item.total_amount || 0);
  };

  const handlePelunasan = async (item) => {
    if (!window.confirm("Apakah Anda yakin ingin memberi centang lunas pada invoice ini?")) {
      return;
    }
    const invoiceTotal = calculateInvoiceTotal(item);
    const currentBooking = toNumber(item.booking_amount || 0);
    const remaining = Math.max(0, invoiceTotal - currentBooking);

    if (remaining <= 0) {
      toast("Pesanan ini sudah lunas.");
      return;
    }

    const isCustom = item.orderType === "custom_request";
    const url = isCustom
      ? `${API_BASE}/custom-requests/${item.id}/booking-amount`
      : `${API_BASE}/orders/${item.id}/booking-amount`;

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({
          // Set ke total tagihan agar status pembayaran lunas di invoice.
          booking_amount: Number(invoiceTotal.toFixed(2)),
        }),
      });

      if (response.ok) {
        fetchOrders();
        toast.success(
          `Pelunasan berhasil (${formatRupiah(remaining)}). Booking menjadi ${formatRupiah(invoiceTotal)}`
        );
      } else {
        toast.error("Error memproses pelunasan");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error memproses pelunasan");
    }
  };

  const handleGenerateInvoice = (item) => {
    setPendingInvoiceItem(item);
    setShowBankSelectionModal(true);
  };

  const generateInvoicePDF = (item, selectedBank = null) => {
    const doc = new jsPDF();
    const toNumber = (value) => {
      const n = typeof value === "number" ? value : parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    };

    // Hitung lebar halaman dan margin
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Get current domain for website URL
    const currentDomain = window.location.origin;

    // ===== PAGE 1 =====
    // Company header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(appName, 20, 20);

    // Company details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const addressSingleLine = [siteContact.addressLine1, siteContact.addressLine2]
      .filter(Boolean)
      .join(" ");
    doc.text(addressSingleLine, 20, 30);
    let headerY = 37;
    if (siteContact.phone) {
      doc.text(`Telephone: ${siteContact.phone}`, 20, headerY);
      headerY += 7;
    }
    if (siteContact.email) {
      doc.text(`Email: ${siteContact.email}`, 20, headerY);
      headerY += 7;
    }
    if (siteContact.instagramUrl) {
      doc.text(`Instagram: ${siteContact.instagramUrl}`, 20, headerY);
      headerY += 7;
    }
    doc.text(`Website: ${currentDomain}`, 20, headerY);

    // Invoice details (right side)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 150, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const duplicateLabelNumber =
      duplicateOrderRankMap[`${item.orderType}-${item.id}`] || null;
    const invoiceNo = duplicateLabelNumber
      ? `${item.id || "N/A"}-D${duplicateLabelNumber}`
      : item.id || "N/A";
    doc.text(`No. Invoice: ${invoiceNo}`, 150, 30);
    doc.text(
      `Tanggal Invoice: ${new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
      150,
      37
    );
    const eventDate = item.wedding_date;
    doc.text(`Jatuh Tempo: ${eventDate ? formatDateTime(eventDate) : '-'}`, 150, 44);

    // Bill To section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Kepada :", 20, 60);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(item.name, 20, 67);
    doc.text(item.email, 20, 74);
    doc.text(item.phone, 20, 81);

    // Handle address with text wrapping to prevent breaking
    let addressY = 88;

    if (item.address) {
      // Use actual usable width (page width minus margins)
      const actualUsableWidth = pageWidth - (margin * 2);
      doc.text(item.address, margin, addressY, { maxWidth: actualUsableWidth });

      // Hitung tinggi teks untuk spacing yang tepat
      const addressHeight = doc.getTextDimensions(item.address, {
        maxWidth: actualUsableWidth,
      }).h;
      addressY += addressHeight + 5;
    }

    // Service table header - adjust based on address length
    const startY = item.address ? addressY + 8 : 110;
    doc.setFillColor(52, 152, 219); // Blue background
    doc.rect(20, startY, 170, 8, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255); // White text
    doc.text("No.", 25, startY + 6);
    doc.text("Deskripsi", 40, startY + 6);
    doc.text("Jml", 140, startY + 6);
    doc.text("Harga", 170, startY + 6);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Service items
    let currentY = startY + 15;
    let itemNumber = 1;
    let invoiceBasePrice = toNumber(item.base_price || 0);
    let selectedItemsTotal = 0;
    let invoiceTotal = toNumber(item.total_amount || 0);

    if (item.orderType === "custom_request") {
      // Custom request: list items_details or single line service_name
      const details = Array.isArray(item.items_details) && item.items_details.length > 0
        ? item.items_details
        : [{ name: item.service_name || item.services || "Layanan custom", price: item.total_amount || 0 }];
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      invoiceBasePrice = 0;
      let customTotal = 0;
      details.forEach((row, idx) => {
        const name = row.name || row.item_name || "Item";
        const price = typeof row.price === "number" ? row.price : parseFloat(row.price) || 0;
        customTotal += price;
        doc.text((idx + 1).toString(), 25, currentY);
        doc.text(name, 40, currentY);
        doc.text("1", 140, currentY);
        doc.text(formatRupiah(price), 170, currentY);
        currentY += 6;
      });
      invoiceTotal = customTotal > 0 ? customTotal : toNumber(item.total_amount || 0);
    } else {
      // Order biasa: base price + selected_items
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(itemNumber.toString(), 25, currentY);
      doc.text(item.service_name, 40, currentY);
      doc.text("1", 140, currentY);
      doc.text(formatRupiah(item.base_price || 0), 170, currentY);

      if (item.selected_items) {
        try {
          const selectedItems = JSON.parse(item.selected_items);
          if (Array.isArray(selectedItems) && selectedItems.length > 0) {
            currentY += 8;
            selectedItems.forEach((selectedItem) => {
              const itemName =
                selectedItem.name ||
                selectedItem.item_name ||
                selectedItem.title ||
                "Item tidak dikenal";
              const itemPrice =
                selectedItem.final_price ||
                selectedItem.item_price ||
                selectedItem.price ||
                selectedItem.custom_price ||
                0;
              const quantity = selectedItem.quantity || 1;
              const subtotal = (typeof itemPrice === "number" ? itemPrice : parseFloat(itemPrice) || 0) * quantity;
              selectedItemsTotal += subtotal;
              doc.setFontSize(8);
              doc.text(`  ${itemName}`, 40, currentY);
              doc.text(quantity.toString(), 140, currentY);
              doc.text(formatRupiah(subtotal), 170, currentY);
              currentY += 5;
            });
          }
        } catch (error) {
          console.error("Error parsing selected items:", error);
        }
      }

      // Gunakan total hasil perhitungan item invoice agar konsisten dengan baris detail.
      const recalculatedTotal = invoiceBasePrice + selectedItemsTotal;
      if (recalculatedTotal > 0) {
        invoiceTotal = recalculatedTotal;
      }
    }

    // Add total service row
    currentY += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("", 25, currentY); // Empty serial number
    doc.text("Total Harga Layanan:", 40, currentY);
    doc.text("", 140, currentY); // Empty quantity
    doc.text(
      formatRupiah(invoiceTotal),
      170,
      currentY
    );

    // Add payment details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detail Pembayaran:", 20, currentY + 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Harga Layanan: ${formatRupiah(invoiceBasePrice)}`,
      20,
      currentY + 30
    );
    doc.text(
      `Total Harga Layanan: ${formatRupiah(invoiceTotal)}`,
      20,
      currentY + 37
    );
    doc.text("Metode Pembayaran: Transfer Bank", 20, currentY + 44);
    doc.text(
      `Biaya Booking: ${formatRupiah(item.booking_amount || 0)}`,
      20,
      currentY + 51
    );
    doc.text(
      `Sisa Pembayaran: ${formatRupiah(
        invoiceTotal - toNumber(item.booking_amount || 0)
      )}`,
      20,
      currentY + 58
    );

    // Add bank account information
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Rekening Tujuan:", 20, currentY + 65);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    // Use selected bank account if available, otherwise use default
    const bankAccountNumber =
      selectedBank?.account_number ||
      item.selected_bank_account ||
      item.bank_account_number ||
      "1234567890";
    const bankAccountName =
      selectedBank?.name || item.bank_account_name || appName;
    doc.text(`Nomor Rekening: ${bankAccountNumber}`, 20, currentY + 75);
    doc.text(`Atas Nama: ${bankAccountName}`, 20, currentY + 82);

    const isFullyPaid =
      invoiceTotal > 0 && toNumber(item.booking_amount || 0) >= invoiceTotal;
    if (isFullyPaid) {
      doc.setFontSize(36);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("LUNAS", pageWidth - 45, 88, { align: "center", angle: -18 });
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
    }

    // Add user notes section if available
    let notesY = currentY + 95;
    const notesText = item.notes || item.additional_requests || "";
    if (notesText && notesText.trim()) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Catatan:", 20, notesY);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      notesY += 7;

      // Use full width for notes (same as address width calculation)
      const actualUsableWidth = pageWidth - (margin * 2);
      const notesLines = doc.splitTextToSize(notesText, actualUsableWidth);
      notesLines.forEach((line) => {
        doc.text(line, 20, notesY);
        notesY += 5;
      });

      notesY += 15; // Add more space after notes
    }

    // Position thank you message at the bottom of the page
    // Calculate the final Y position after all content
    const finalContentY = notesText && notesText.trim() ? notesY : currentY + 95;
    const thankYouY = finalContentY + 30; // Add 30mm space after the last content
    
    // Set font for thank you message
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Terima kasih telah memilih layanan kami!", 105, thankYouY, {
      align: "center",
    });

    // Save the PDF
    const fileName = `invoice-order-${item.id}-${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    doc.save(fileName);
  };

  return (
    <>
      <Helmet>
        <title>Kalender Booking - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Kalender Booking
          </h1>
          <p className="text-gray-600">
            Lihat jadwal booking dan pesanan yang masih menunggu.
          </p>
        </div>

        {/* Year Calendar Picker */}
        <div className="mb-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Kalender Tahunan ({activeYear})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveYear(prev => prev - 1)}
                className="px-3 py-1 border rounded hover:bg-gray-50 text-sm font-medium text-gray-600"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setActiveYear(prev => prev + 1)}
                className="px-3 py-1 border rounded hover:bg-gray-50 text-sm font-medium text-gray-600"
              >
                Berikutnya
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((mName, mIdx) => {
              const count = combinedOrders.filter((order) => {
                if (!order.wedding_date) return false;
                const d = new Date(order.wedding_date);
                return d.getFullYear() === activeYear && d.getMonth() === mIdx;
              }).length;
              const isActive = calendarMonth.getFullYear() === activeYear && calendarMonth.getMonth() === mIdx;
              return (
                <button
                  key={mIdx}
                  type="button"
                  onClick={() => {
                    setCalendarMonth(new Date(activeYear, mIdx, 1));
                  }}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    isActive
                      ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500 font-semibold"
                      : "border-gray-200 hover:border-primary-300"
                  }`}
                >
                  <p className="text-xs text-gray-700">{mName}</p>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${count > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {count} Pesanan
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Booking Calendar */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Kalender Bulanan
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

              {/* Filters & Search in Calendar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Cari nama client di kalender..."
                    value={calendarSearch}
                    onChange={(e) => setCalendarSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="min-w-[180px]">
                  <select
                    value={selectedVendorFilter}
                    onChange={(e) => setSelectedVendorFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="all">Semua Vendor</option>
                    {vendorsList.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3">
                Total client: {uniqueCalendarClients}
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
                        Memuat data booking untuk bulan ini...
                      </span>
                    </div>
                  ) : (
                    getCalendarDays().map((date, index) => {
                      if (!date) {
                        return (
                          <div
                            key={`empty-${index}`}
                            className="min-h-20 border border-gray-100 bg-gray-50"
                          />
                        );
                      }

                      const y = date.getFullYear();
                      const m = date.getMonth() + 1;
                      const d = date.getDate();
                      const key = `${y}-${String(m).padStart(
                        2,
                        "0"
                      )}-${String(d).padStart(2, "0")}`;

                      const ordersForDay = bookingsByDate[key] || [];
                      const hasBookings = ordersForDay.length > 0;
                      const isSelected = selectedDate === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedDate(key);
                            handleFilterTableBySelectedDate(key);
                          }}
                            className={`min-h-20 border border-gray-100 p-1 text-left align-top ${
                            hasBookings
                              ? "bg-blue-50"
                              : "bg-white"
                          } ${isSelected ? "ring-2 ring-primary-500 z-10" : ""}`}
                        >
                          <div className="text-sm text-blue-700 font-medium mb-1 text-center">
                            {d}
                          </div>
                          <div className="space-y-1">
                            {ordersForDay.slice(0, 3).map((order) => {
                              const colorClass = getClientChipColor(order.phone);
                              return (
                                <span
                                  key={`${order.orderType}-${order.id}`}
                                  className={`block w-full rounded px-2 py-0.5 text-[10px] font-semibold truncate ${colorClass}`}
                                >
                                  {order.name || "Client"}
                                </span>
                              );
                            })}
                            {ordersForDay.length > 3 && (
                              <span className="block text-[10px] text-gray-600 text-center">
                                +{ordersForDay.length - 3} client
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {selectedDate && (
          <div className="space-y-6">
            {tableFilteredOrders && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg">
                <span className="text-sm text-blue-800">
                  Menampilkan pesanan untuk tanggal{" "}
                  {new Date(selectedDate).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  type="button"
                  onClick={handleClearTableFilter}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  Hapus filter
                </button>
              </div>
            )}
            {!tableFilteredOrders && (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 px-4 py-2 rounded-lg mb-2">
                <span className="text-sm text-gray-700">
                  {duplicateKeysSet.size > 0 && (
                    <span className="text-red-600 font-medium">
                      {duplicateKeysSet.size} grup dengan email & tanggal sama
                    </span>
                  )}
                </span>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDuplicatesOnly}
                    onChange={(e) => {
                      setShowDuplicatesOnly(e.target.checked);
                      setOrdersPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className="rounded border-gray-300"
                  />
                  Hanya tampilkan kemungkinan duplikat
                </label>
              </div>
            )}
            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID Pesanan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pelanggan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Layanan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal Pernikahan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booking Amount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          Memuat data...
                        </td>
                      </tr>
                    ) : tableOrders.length > 0 ? (
                      tableOrders.map((order) => (
                        <tr
                          key={`${order.orderType}-${order.id}`}
                          className="bg-white hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`rounded-lg px-3 py-2 inline-flex flex-col text-white ${getClientRowColor(order.phone)}`}>
                              <span className="text-xs font-semibold">
                                #{order.id}
                              </span>
                              <span className="text-xs text-white/80 mt-1">
                                {formatDate(order.created_at)}
                              </span>
                              {order.orderType === "custom_request" ? (
                                <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-white text-black border border-gray-300">
                                  Custom
                                </span>
                              ) : (order.photo_status === 'completed' && order.video_status === 'completed' && order.album_status === 'selesai') ? (
                                <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold border border-blue-200">
                                  Selesai
                                </span>
                              ) : (
                                <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold border border-red-200">
                                  Progres
                                </span>
                              )}

                              {duplicateKeysSet.has(duplicateKey(order)) && (
                                <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-white text-black border border-gray-300" title="Email & tanggal pernikahan sama dengan pesanan lain">
                                  Duplikat ke-
                                  {duplicateOrderRankMap[`${order.orderType}-${order.id}`]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.service_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDateTime(order.wedding_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-primary-600">
                              {formatRupiah(order.total_amount ?? 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-primary-600">
                              {formatRupiah(order.booking_amount ?? 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleStatusUpdate(order, e.target.value)
                              }
                              className={`px-3 py-1 rounded-full text-sm font-medium border-0 ${getStatusColor(
                                order.status
                              )}`}
                            >
                              <option value="pending">Menunggu</option>
                              <option value="confirmed">Dikonfirmasi</option>
                              <option value="cancelled">Dibatalkan</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleViewDetail(order)}
                                className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                title="Lihat Detail"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleEditBookingAmount(order)
                                }
                                className="text-green-600 hover:text-green-700 flex items-center gap-1"
                                title="Edit Booking Amount"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handlePelunasan(order)}
                                className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                title="Pelunasan"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleGenerateInvoice(order)
                                }
                                className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                title="Download Invoice"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order)}
                                className="text-red-600 hover:text-red-700 flex items-center gap-1"
                                title="Hapus"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          Tidak ada pesanan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {!tableFilteredOrders && filteredCombined.length > ordersPagination.limit && (
              <div className="flex items-center justify-between bg-white px-6 py-3 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Menampilkan{" "}
                    {(ordersPagination.page - 1) * ordersPagination.limit + 1} -{" "}
                    {Math.min(
                      ordersPagination.page * ordersPagination.limit,
                      filteredCombined.length
                    )}{" "}
                    dari {filteredCombined.length} pesanan
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      handleOrdersPageChange(Math.max(1, ordersPagination.page - 1))
                    }
                    disabled={ordersPagination.page === 1}
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {getPaginationPages(
                    ordersPagination.page,
                    Math.max(1, Math.ceil(filteredCombined.length / ordersPagination.limit))
                  ).map((page, index) => {
                    if (page === "ellipsis") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 text-gray-500"
                        >
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => handleOrdersPageChange(page)}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                          page === ordersPagination.page
                            ? "bg-primary-600 text-white"
                            : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() =>
                      handleOrdersPageChange(
                        Math.min(
                          Math.ceil(filteredCombined.length / ordersPagination.limit),
                          ordersPagination.page + 1
                        )
                      )
                    }
                    disabled={
                      ordersPagination.page >= Math.ceil(filteredCombined.length / ordersPagination.limit)
                    }
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Detail Modal */}
        {showDetailModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  Detail Pesanan #{selectedOrder.id}
                  {selectedOrder.orderType === "custom_request" && (
                    <span className="ml-2 text-sm font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Custom Request</span>
                  )}
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
                      Informasi Pelanggan
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">Nama:</span>
                        <p className="text-gray-900">{selectedOrder.name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Email:
                        </span>
                        <p className="text-gray-900">{selectedOrder.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Telepon:
                        </span>
                        <p className="text-gray-900">{selectedOrder.phone}</p>
                      </div>
                      {(selectedOrder.bride_name || selectedOrder.groom_name) && (
                        <div>
                          <span className="font-medium text-gray-700">Pasangan:</span>
                          <p className="text-gray-900">
                            {selectedOrder.bride_name || "-"} & {selectedOrder.groom_name || "-"}
                          </p>
                        </div>
                      )}
                      {selectedOrder.reference_source && (
                        <div>
                          <span className="font-medium text-gray-700">Referensi:</span>
                          <p className="text-gray-900 capitalize">{selectedOrder.reference_source}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-700">
                          {selectedOrder.orderType === "custom_request" ? "Permintaan tambahan:" : "Alamat:"}
                        </span>
                        <p className="text-gray-900 mb-4">{selectedOrder.address || "-"}</p>
                      </div>

                      <div>
                        <span className="font-medium text-gray-700 font-semibold mb-1 block">
                          Vendor ditugaskan:
                        </span>
                        <select
                          value={selectedOrder.vendor_id || ""}
                          onChange={async (e) => {
                            const vId = e.target.value ? Number(e.target.value) : null;
                            try {
                              const url = selectedOrder.orderType === "custom_request"
                                ? `${API_BASE}/custom-requests/${selectedOrder.id}/vendor`
                                : `${API_BASE}/orders/${selectedOrder.id}/vendor`;
                              const res = await fetch(url, {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${localStorage.getItem("admin_token")}`
                                },
                                body: JSON.stringify({ vendor_id: vId })
                              });
                              if (res.ok) {
                                toast.success("Vendor berhasil diupdate");
                                setSelectedOrder(prev => ({ ...prev, vendor_id: vId }));
                                fetchOrders();
                              } else {
                                toast.error("Gagal update vendor");
                              }
                            } catch (err) {
                              toast.error("Gagal update vendor");
                            }
                          }}
                          className="w-full border rounded-lg px-2.5 py-1.5 text-sm"
                        >
                          <option value="">-- Tanpa Vendor (Internal) --</option>
                          {vendorsList.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4 border-t pt-4">
                        <span className="font-medium text-gray-700 font-semibold mb-1 block">
                          Petugas Freelance:
                        </span>
                        <div className="flex gap-2 mb-2">
                          <select
                            id="modal-freelancer-select"
                            className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm"
                          >
                            <option value="">-- Pilih Freelancer --</option>
                            {freelancersList.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              const fId = document.getElementById("modal-freelancer-select").value;
                              if (!fId) {
                                toast.error("Pilih freelance terlebih dahulu");
                                return;
                              }
                              try {
                                const fl = freelancersList.find(x => String(x.id) === String(fId));
                                const ymd = new Date(selectedOrder.wedding_date).toISOString().split('T')[0];
                                const res = await fetch(`${API_BASE}/freelance-calendar`, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${localStorage.getItem("admin_token")}`
                                  },
                                  body: JSON.stringify({
                                    order_source: selectedOrder.orderType,
                                    order_id: selectedOrder.id,
                                    freelancer_id: Number(fId),
                                    photographer_name: fl.name,
                                    duty_date: ymd,
                                    notes: "Ditugaskan dari detail pesanan admin"
                                  })
                                });
                                if (res.ok) {
                                  toast.success("Freelancer ditugaskan");
                                  fetchAssignedFreelancers();
                                } else {
                                  toast.error("Gagal menugaskan freelancer");
                                }
                              } catch (err) {
                                toast.error("Error menugaskan freelancer");
                              }
                            }}
                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium"
                          >
                            Tugaskan
                          </button>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {assignedFreelancers.map(af => (
                            <div key={af.id} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded text-xs">
                              <span>{af.photographer_name}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm(`Hapus penugasan ${af.photographer_name}?`)) return;
                                  try {
                                    const res = await fetch(`${API_BASE}/freelance-calendar/${af.id}`, {
                                      method: "DELETE",
                                      headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
                                    });
                                    if (res.ok) {
                                      toast.success("Penugasan dibatalkan");
                                      fetchAssignedFreelancers();
                                    } else {
                                      toast.error("Gagal membatalkan");
                                    }
                                  } catch (err) {
                                    toast.error("Error");
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 font-semibold"
                              >
                                Hapus
                              </button>
                            </div>
                          ))}
                          {assignedFreelancers.length === 0 && (
                            <p className="text-xs text-gray-400 italic">Belum ada freelance yang ditugaskan.</p>
                          )}
                        </div>
                      </div>

                      {/* Biaya Produksi & Akomodasi */}
                      <div className="mt-4 border-t pt-4">
                        <span className="font-semibold text-gray-700 mb-2 block">
                          Biaya Produksi &amp; Akomodasi:
                        </span>
                        {loadingFinance ? (
                          <p className="text-xs text-gray-400 italic">Memuat data keuangan...</p>
                        ) : (
                          <div className="space-y-3">
                            {/* Biaya Produksi Items */}
                            {finProductionItems.length > 0 ? (
                              <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 mb-1">Rincian Biaya Produksi Item</p>
                                {finProductionItems.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600 flex-1 truncate" title={item.label}>
                                      {item.label}
                                    </span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.amount}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFinProductionItems(prev => prev.map((p, i) => i === idx ? { ...p, amount: val } : p));
                                      }}
                                      className="w-28 border rounded-lg px-2 py-1 text-xs text-right focus:ring-1 focus:ring-primary-500"
                                      placeholder="Rp 0"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Tidak ada item album atau drone yang di-checkout.</p>
                            )}

                            {/* Biaya Akomodasi Custom */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 flex-1">
                                Biaya Akomodasi Custom
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={finAccommodationCost}
                                onChange={(e) => setFinAccommodationCost(e.target.value)}
                                className="w-28 border rounded-lg px-2 py-1 text-xs text-right focus:ring-1 focus:ring-primary-500"
                                placeholder="Rp 0"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveFinanceDetails}
                              className="w-full mt-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Simpan Biaya &amp; Akomodasi
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>


                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Informasi Pesanan
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">
                          Layanan:
                        </span>
                        <p className="text-gray-900">
                          {selectedOrder.service_name}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Tanggal Pernikahan:
                        </span>
                        <p className="text-gray-900">
                          {formatDateTime(selectedOrder.wedding_date)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Tanggal Pesanan:
                        </span>
                        <p className="text-gray-900">
                          {formatDate(selectedOrder.created_at)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Total:
                        </span>
                        <p className="text-2xl font-bold text-primary-600">
                          {formatRupiah(selectedOrder.total_amount ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {(selectedOrder.notes || selectedOrder.additional_requests) && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Catatan
                    </h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {selectedOrder.notes || selectedOrder.additional_requests}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Item yang Dipilih
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedOrder.orderType === "custom_request" ? (
                      Array.isArray(selectedOrder.items_details) && selectedOrder.items_details.length > 0 ? (
                        selectedOrder.items_details.map((item, index) => {
                          const itemName = item.name || item.item_name || "Item";
                          const itemPrice = typeof item.price === "number" ? item.price : parseFloat(item.price) || 0;
                          return (
                            <div
                              key={index}
                              className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                            >
                              <span className="text-gray-900">{itemName}</span>
                              <span className="font-medium text-primary-600">
                                {formatRupiah(itemPrice)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-gray-600 whitespace-pre-wrap">{selectedOrder.services || "-"}</p>
                      )
                    ) : editableOrderItems.length === 0 ? (
                      <div className="text-gray-500 text-center py-4">
                        Tidak ada item yang dipilih
                      </div>
                    ) : (
                      editableOrderItems.map((item, index) => {
                        const itemName =
                          item.name ||
                          item.item_name ||
                          item.title ||
                          "Item tidak dikenal";
                        const itemPrice =
                          item.final_price ||
                          item.item_price ||
                          item.price ||
                          item.custom_price ||
                          0;
                        const normalizedPrice =
                          typeof itemPrice === "number"
                            ? itemPrice
                            : parseFloat(itemPrice) || 0;
                        return (
                          <div
                            key={`${itemName}-${index}`}
                            className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                          >
                            <span className="text-gray-900">{itemName}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-primary-600">
                                {formatRupiah(normalizedPrice)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveEditableItem(index)}
                                className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {selectedOrder.orderType === "order" && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveEditableItems}
                        disabled={savingOrderItems}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
                      >
                        {savingOrderItems ? "Menyimpan..." : "Simpan Perubahan Item"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = await new Promise((resolve) => {
                        toast(
                          (t) => (
                            <div className="flex items-center gap-3">
                              <span>
                                Apakah Anda yakin ingin menghapus pesanan ini?
                              </span>
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

                      if (confirmed) {
                        await handleDeleteOrder(selectedOrder);
                        setShowDetailModal(false);
                      }
                    }}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Hapus Pesanan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Edit Booking Amount Modal */}
        {showEditBookingModal && editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Edit Booking Amount
                </h2>
                <button
                  onClick={() => {
                    setShowEditBookingModal(false);
                    setEditingItem(null);
                    setNewBookingAmount("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Amount (Rp)
                  </label>
                  <input
                    type="number"
                    value={newBookingAmount}
                    onChange={(e) => setNewBookingAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Masukkan jumlah booking"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowEditBookingModal(false);
                      setEditingItem(null);
                      setNewBookingAmount("");
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleUpdateBookingAmount}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bank Selection Modal */}
        {showBankSelectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Pilih Bank Transfer
                </h2>
                <button
                  onClick={() => {
                    setShowBankSelectionModal(false);
                    setPendingInvoiceItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Metode Pembayaran
                  </label>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedBankMethod?.id === method.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-300 hover:border-primary-300"
                        }`}
                        onClick={() => setSelectedBankMethod(method)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-800">
                              {method.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {method.type}
                            </p>
                            {method.account_number && (
                              <p className="text-xs text-gray-500">
                                No. Rek: {method.account_number}
                              </p>
                            )}
                          </div>
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex items-center justify-center">
                            {selectedBankMethod?.id === method.id && (
                              <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowBankSelectionModal(false);
                      setPendingInvoiceItem(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (pendingInvoiceItem) {
                        generateInvoicePDF(
                          pendingInvoiceItem,
                          selectedBankMethod
                        );
                        setShowBankSelectionModal(false);
                        setPendingInvoiceItem(null);
                      }
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Generate Invoice
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

export default AdminOrders;
