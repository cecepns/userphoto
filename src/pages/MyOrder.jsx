import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { formatRupiah } from "../utils/formatters";
import { imageUrl } from "../utils/imageUrl";
import { formatPhotoStatus, formatVideoStatus } from "../constants/orderProgress";

const API_BASE = "https://api.kingcreativestudio.my.id/user-photo/api";

const toNumber = (value) => {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const weddingDateToInputValue = (value) => {
  if (value == null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value).slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatProgressStatus = (s) =>
  ({
    pending: "Pending",
    diproses: "Diproses",
    selesai: "Selesai",
  }[s] || s || "-");

const MyOrder = () => {
  const [invoiceId, setInvoiceId] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [orderSource, setOrderSource] = useState("order");
  const [albumProgress, setAlbumProgress] = useState(null);
  const [orderProgress, setOrderProgress] = useState(null);
  const [loading, setLoading] = useState(false);

  const parseInvoiceInput = (value) => {
    const raw = String(value || "").trim();
    const normalized = raw.toLowerCase();
    if (!raw) return { id: "", sourceHint: null };
    if (normalized.startsWith("custom:")) {
      return { id: raw.split(":")[1]?.trim() || "", sourceHint: "custom_request" };
    }
    if (/^c\d+$/i.test(raw)) {
      return { id: raw.slice(1), sourceHint: "custom_request" };
    }
    return { id: raw, sourceHint: "order" };
  };

  const loadOrder = async () => {
    const { id, sourceHint } = parseInvoiceInput(invoiceId);
    const phone = lookupPhone.trim();
    if (!id || !phone) {
      toast.error("Masukkan nomor invoice/pesanan dan nomor HP");
      return;
    }

    setLoading(true);
    setAlbumProgress(null);
    setOrderProgress(null);
    try {
      const tryFetchOrder = async () => {
        const response = await fetch(
          `${API_BASE}/orders/public/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`
        );
        const data = await response.json();
        return { response, data, source: "order" };
      };
      const tryFetchCustom = async () => {
        const response = await fetch(
          `${API_BASE}/custom-requests/public/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`
        );
        const data = await response.json();
        return { response, data, source: "custom_request" };
      };

      let lookupResult;
      if (sourceHint === "custom_request") {
        lookupResult = await tryFetchCustom();
      } else {
        lookupResult = await tryFetchOrder();
        if (!lookupResult.response.ok) {
          const fallback = await tryFetchCustom();
          if (fallback.response.ok) {
            lookupResult = fallback;
          }
        }
      }

      if (!lookupResult.response.ok) {
        throw new Error(lookupResult.data?.message || "Pesanan tidak ditemukan");
      }

      setOrderSource(lookupResult.source);
      setOrder(lookupResult.data);

      const apiSource =
        lookupResult.source === "custom_request" ? "custom_request" : "order";
      const progRes = await fetch(
        `${API_BASE}/album-progress/public/${apiSource}/${lookupResult.data.id}?phone=${encodeURIComponent(phone)}`
      );
      const progJson = await progRes.json().catch(() => ({}));
      if (progRes.ok) {
        setAlbumProgress(progJson.progress || null);
      } else {
        setAlbumProgress(null);
      }

      const orderProgRes = await fetch(
        `${API_BASE}/order-progress/public/${apiSource}/${lookupResult.data.id}?phone=${encodeURIComponent(phone)}`
      );
      const orderProgJson = await orderProgRes.json().catch(() => ({}));
      if (orderProgRes.ok) {
        setOrderProgress(orderProgJson.progress || null);
      }
    } catch (error) {
      setOrder(null);
      setAlbumProgress(null);
      setOrderProgress(null);
      toast.error(error.message || "Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  const displayItems = useMemo(() => {
    if (!order || orderSource === "custom_request") return [];
    const raw = order.selected_items;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const p = typeof raw === "string" ? JSON.parse(raw) : [];
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }, [order, orderSource]);

  const selectedItemsTotal = useMemo(() => {
    return displayItems.reduce((s, item) => {
      const unit = toNumber(
        item.final_price ?? item.custom_price ?? item.item_price ?? item.price ?? 0
      );
      return s + unit;
    }, 0);
  }, [displayItems]);

  const totalAmount = useMemo(() => {
    if (!order || orderSource === "custom_request") return 0;
    const basePrice = toNumber(order.base_price);
    return basePrice + selectedItemsTotal;
  }, [order, selectedItemsTotal, orderSource]);

  const formatDisplayDate = (v) => (v ? weddingDateToInputValue(v) : "-");

  return (
    <>
      <Helmet>
        <title>Pesanan Saya - Chekusphoto</title>
      </Helmet>

      <section className="pt-28 pb-16 bg-[#f0f8ff] min-h-screen">
        <div className="container-custom">
          <div className="max-w-6xl mx-auto px-4 md:px-0">
            <h1 className="text-3xl font-bold text-[#2f4274] mb-2">Pesanan Saya</h1>
            <p className="text-[#4a5f95] mb-6">
              Lihat ringkasan pesanan dan progress album Anda.
            </p>

            <div className="bg-white rounded-2xl border border-[#d7e3ff] shadow-lg p-4 md:p-6 mb-6">
              <label className="block text-sm font-medium text-[#2f4274] mb-2">
                Nomor Invoice / ID Pesanan
              </label>
              <div className="grid md:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  placeholder="Contoh: 123 atau custom:45 / C45"
                  className="flex-1 rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value)}
                  placeholder="Nomor HP sesuai pesanan"
                  className="flex-1 rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={loadOrder}
                  disabled={loading}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {loading ? "Mencari..." : "Cari"}
                </button>
              </div>
            </div>

            {order && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-[#d7e3ff] shadow-lg p-4 md:p-6 space-y-3">
                  <h2 className="text-lg font-semibold text-[#2f4274]">
                    Detail Pesanan #{order.id}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Tipe:{" "}
                    {orderSource === "custom_request" ? "Layanan custom" : "Pesanan biasa"}
                  </p>
                  <ReadRow label="Nama" value={order.name} />
                  <ReadRow label="Email" value={order.email} />
                  <ReadRow label="No. HP" value={order.phone} />
                  {orderSource === "order" && (
                    <ReadRow label="Alamat" value={order.address} multiline />
                  )}
                  <ReadRow
                    label="Tanggal acara"
                    value={formatDisplayDate(order.wedding_date)}
                  />
                  {orderSource === "order" && (
                    <ReadRow label="Catatan" value={order.notes} multiline />
                  )}
                  {orderSource === "custom_request" && (
                    <>
                      <ReadRow
                        label="Layanan custom"
                        value={order.services}
                        multiline
                      />
                      <ReadRow
                        label="Permintaan tambahan"
                        value={order.additional_requests}
                        multiline
                      />
                    </>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-[#d7e3ff] shadow-lg p-4 md:p-6">
                    <h2 className="text-lg font-semibold text-[#2f4274] mb-3">
                      Progress album
                    </h2>
                    {albumProgress ? (
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-600">Status</dt>
                          <dd className="font-semibold text-gray-900">
                            {formatProgressStatus(albumProgress.status)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-600">Estimasi selesai</dt>
                          <dd className="font-medium text-gray-900">
                            {albumProgress.estimated_completion
                              ? formatDisplayDate(albumProgress.estimated_completion)
                              : "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-600 mb-1">Link album</dt>
                          <dd>
                            {albumProgress.album_link ? (
                              <a
                                href={albumProgress.album_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 font-medium hover:underline break-all"
                              >
                                {albumProgress.album_link}
                              </a>
                            ) : (
                              <span className="text-gray-500">Belum tersedia</span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Belum ada informasi progress album untuk pesanan ini. Hubungi tim kami bila
                        dibutuhkan.
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-[#d7e3ff] shadow-lg p-4 md:p-6">
                    <h2 className="text-lg font-semibold text-[#2f4274] mb-3">
                      Progress pesanan (Foto & Video)
                    </h2>
                    {orderProgress ? (
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-600">Progres foto</dt>
                          <dd className="font-semibold text-gray-900">
                            {formatPhotoStatus(orderProgress.photo_status)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-600">Progres video</dt>
                          <dd className="font-semibold text-gray-900">
                            {formatVideoStatus(orderProgress.video_status)}
                          </dd>
                        </div>
                        {orderProgress.photo_link && (
                          <div>
                            <dt className="text-gray-600 mb-1">Link foto</dt>
                            <dd>
                              <a href={orderProgress.photo_link} target="_blank" rel="noreferrer" className="text-primary-600 break-all hover:underline">
                                {orderProgress.photo_link}
                              </a>
                            </dd>
                          </div>
                        )}
                        {orderProgress.video_link && (
                          <div>
                            <dt className="text-gray-600 mb-1">Link video</dt>
                            <dd>
                              <a href={orderProgress.video_link} target="_blank" rel="noreferrer" className="text-primary-600 break-all hover:underline">
                                {orderProgress.video_link}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Belum ada update progress foto/video. Tim kami akan memperbarui status ini.
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-[#d7e3ff] shadow-lg p-4 md:p-6">
                    {order?.service_image && orderSource === "order" && (
                      <div className="mb-4">
                        <img
                          src={imageUrl(order.service_image)}
                          alt={order.service_name || "Layanan"}
                          className="h-56 w-full rounded-lg object-cover border border-gray-200"
                        />
                      </div>
                    )}
                    <h2 className="text-lg font-semibold text-[#2f4274] mb-3">
                      {orderSource === "custom_request"
                        ? "Rincian layanan custom"
                        : `Item tambahan (${order.service_name || "Layanan"})`}
                    </h2>
                    {orderSource === "custom_request" ? (
                      <div className="pt-2 border-t border-gray-100 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total booking</span>
                          <span className="font-medium">
                            {formatRupiah(toNumber(order.booking_amount))}
                          </span>
                        </div>
                      </div>
                    ) : displayItems.length === 0 ? (
                      <p className="text-sm text-gray-500">Tidak ada item tambahan.</p>
                    ) : (
                      <>
                        <ul className="space-y-2 max-h-[320px] overflow-auto pr-1">
                          {displayItems.map((item, index) => {
                            const unitPrice = toNumber(
                              item.final_price ??
                                item.custom_price ??
                                item.item_price ??
                                item.price ??
                                0
                            );
                            return (
                              <li
                                key={`${item.id ?? item.item_id ?? item.name ?? "i"}-${index}`}
                                className="rounded-lg border border-gray-200 p-3 text-sm"
                              >
                                <p className="font-semibold text-gray-900">
                                  {item.name || item.item_name || item.title || "Item"}
                                </p>
                                <p className="text-xs text-gray-600">{formatRupiah(unitPrice)}</p>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Harga layanan</span>
                            <span className="font-medium">{formatRupiah(totalAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total booking</span>
                            <span className="font-medium">
                              {formatRupiah(toNumber(order.booking_amount))}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold text-[#2f4274] pt-1">
                            <span>Pelunasan</span>
                            <span>
                              {formatRupiah(
                                Math.max(0, totalAmount - toNumber(order.booking_amount))
                              )}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

function ReadRow({ label, value, multiline }) {
  const v = value != null && String(value).trim() !== "" ? String(value) : "-";
  return (
    <div>
      <p className="text-xs font-medium text-[#4a5f95] mb-0.5">{label}</p>
      {multiline ? (
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{v}</p>
      ) : (
        <p className="text-sm text-gray-900">{v}</p>
      )}
    </div>
  );
}

ReadRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  multiline: PropTypes.bool,
};

ReadRow.defaultProps = {
  multiline: false,
};

export default MyOrder;
