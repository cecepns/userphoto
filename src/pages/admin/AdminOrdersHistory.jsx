import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AdminLayout from "../../components/AdminLayout";
import { formatRupiah, formatDate, formatDateTime } from "../../utils/formatters";

const AdminOrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersPagination.page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/wedding-app/api/orders?page=${ordersPagination.page}&limit=${ordersPagination.limit}&status=confirmed,completed,cancelled`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        setOrders(data);
        setOrdersPagination((prev) => ({
          ...prev,
          total: data.length,
          totalPages: 1,
        }));
      } else {
        setOrders(data.orders || []);
        setOrdersPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
        }));
      }
    } catch (error) {
      console.error("Error fetching orders history:", error);
      setOrders([]);
      setOrdersPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
      }));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/wedding-app/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
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

  const handleDeleteOrder = async (orderId) => {
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

    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/wedding-app/api/orders/${orderId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );

      if (response.ok) {
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

  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
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

  return (
    <>
      <Helmet>
        <title>History Pesanan - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            History Pesanan
          </h1>
          <p className="text-gray-600">
            Daftar pesanan yang sudah selesai / diselesaikan.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">
                      ID Pesanan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">
                      Pelanggan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">
                      Layanan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">
                      Tanggal Pernikahan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">
                      Booking Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-24">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-16 text-center"
                      >
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <div className="w-10 h-10 border-2 border-[#2f4274]/30 border-t-[#2f4274] rounded-full animate-spin" />
                          <span className="text-sm font-medium">Memuat data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : orders.length > 0 ? (
                    orders.map((order, idx) => (
                      <tr
                        key={order.id}
                        className={`transition-colors duration-150 hover:bg-[#2f4274]/[0.04] ${
                          idx % 2 === 1 ? "bg-gray-50/50" : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-500 font-medium">
                            {formatDate(order.created_at)}
                          </div>
                          <div className="text-sm font-semibold text-gray-900 mt-0.5">
                            #{order.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {order.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[180px]" title={order.email}>
                            {order.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium">
                            {order.service_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-800 font-medium">
                            {formatDateTime(order.wedding_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-[#2f4274]">
                            {formatRupiah(order.total_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-[#2f4274]">
                            {formatRupiah(order.booking_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleStatusUpdate(order.id, e.target.value)
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-[#2f4274]/40 outline-none transition-shadow ${getStatusColor(
                              order.status
                            )}`}
                          >
                            <option value="pending">Menunggu</option>
                            <option value="confirmed">Dikonfirmasi</option>
                            <option value="completed">Selesai</option>
                            <option value="cancelled">Dibatalkan</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetail(order)}
                              className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20 transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
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
                        className="px-6 py-16 text-center"
                      >
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                            <Eye size={24} className="text-gray-300" />
                          </div>
                          <span className="text-sm font-medium">Tidak ada pesanan selesai</span>
                          <span className="text-xs">Pesanan yang selesai atau dibatalkan akan muncul di sini.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {ordersPagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl border border-gray-100 px-6 py-4 shadow-sm">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-800">
                  {(ordersPagination.page - 1) * ordersPagination.limit + 1}–{Math.min(
                    ordersPagination.page * ordersPagination.limit,
                    ordersPagination.total
                  )}
                </span>
                <span className="mx-1">dari</span>
                <span className="font-medium text-gray-800">{ordersPagination.total}</span>
                <span className="ml-1">pesanan</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    handleOrdersPageChange(ordersPagination.page - 1)
                  }
                  disabled={ordersPagination.page === 1}
                  className="p-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>

                {getPaginationPages(
                  ordersPagination.page,
                  ordersPagination.totalPages
                ).map((page, index) => {
                  if (page === "ellipsis") {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 py-1 text-gray-400 text-sm"
                      >
                        …
                      </span>
                    );
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => handleOrdersPageChange(page)}
                      className={`min-w-[2.25rem] py-2 px-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        page === ordersPagination.page
                          ? "bg-[#2f4274] text-white shadow-md shadow-[#2f4274]/25"
                          : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() =>
                    handleOrdersPageChange(ordersPagination.page + 1)
                  }
                  disabled={
                    ordersPagination.page === ordersPagination.totalPages
                  }
                  className="p-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {showDetailModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  Detail Pesanan #{selectedOrder.id}
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
                      <div>
                        <span className="font-medium text-gray-700">
                          Alamat:
                        </span>
                        <p className="text-gray-900">{selectedOrder.address}</p>
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
                          {formatRupiah(selectedOrder.total_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Catatan
                    </h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Item yang Dipilih
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      try {
                        const items = JSON.parse(
                          selectedOrder.selected_items || "[]"
                        );

                        if (!Array.isArray(items) || items.length === 0) {
                          return (
                            <div className="text-gray-500 text-center py-4">
                              Tidak ada item yang dipilih
                            </div>
                          );
                        }

                        return items.map((item, index) => {
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
                          const quantity = item.quantity || 1;
                          const subtotal =
                            (typeof itemPrice === "number"
                              ? itemPrice
                              : parseFloat(itemPrice) || 0) * quantity;

                          return (
                            <div
                              key={index}
                              className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                            >
                              <span className="text-gray-900">
                                {itemName}{" "}
                                {quantity > 1 && (
                                  <span className="text-gray-500">
                                    (x{quantity})
                                  </span>
                                )}
                              </span>
                              <div className="text-right">
                                {quantity > 1 && (
                                  <div className="text-xs text-gray-500">
                                    {formatRupiah(itemPrice)} × {quantity}
                                  </div>
                                )}
                                <span className="font-medium text-primary-600">
                                  {formatRupiah(subtotal)}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      } catch (error) {
                        console.error("Error parsing selected items:", error);
                        return (
                          <div className="text-gray-500 text-center py-4">
                            Error memuat item yang dipilih
                          </div>
                        );
                      }
                    })()}
                  </div>
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
                        await handleDeleteOrder(selectedOrder.id);
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
      </AdminLayout>
    </>
  );
};

export default AdminOrdersHistory;
