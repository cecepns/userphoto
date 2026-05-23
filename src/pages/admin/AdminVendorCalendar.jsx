import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";

const API_BASE = "https://api.kingcreativestudio.my.id/chekusphoto/api";

const VENDOR_COLOR_POOL = [
  "bg-green-600 text-white",
  "bg-sky-600 text-white",
  "bg-indigo-600 text-white",
  "bg-amber-700 text-white",
  "bg-purple-700 text-white",
  "bg-orange-600 text-white",
  "bg-emerald-700 text-white",
  "bg-rose-600 text-white",
  "bg-cyan-700 text-white",
];

const SPECIAL_VENDOR_COLORS = {
  "video cinematic": "bg-red-700 text-white",
};

const statusLabel = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
};

const normalizeCategory = (value) =>
  (value || "").toString().trim().toLowerCase();

const normalizeText = (value) =>
  (value || "").toString().trim().toLowerCase();

const normalizeIdentityText = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const AdminVendorCalendar = () => {
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [toppingVendorsMap, setToppingVendorsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [vendorInputName, setVendorInputName] = useState("");
  const [savingVendorName, setSavingVendorName] = useState(false);
  const [adminVendors, setAdminVendors] = useState([]);
  const [vendorFilter, setVendorFilter] = useState("all");
  const [assignedVendorId, setAssignedVendorId] = useState("");
  const [savingAssignedVendor, setSavingAssignedVendor] = useState(false);

  const getVendorColorClass = (vendorKey, vendorName = "") => {
    const vendorNameNormalized = normalizeText(vendorName);
    if (vendorNameNormalized && SPECIAL_VENDOR_COLORS[vendorNameNormalized]) {
      return SPECIAL_VENDOR_COLORS[vendorNameNormalized];
    }

    const key = (vendorKey || "").toString();
    if (!key) return "bg-gray-700 text-white";
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash + key.charCodeAt(i) * (i + 1)) % 100000;
    }
    return VENDOR_COLOR_POOL[hash % VENDOR_COLOR_POOL.length];
  };

  const fetchVendorCalendar = async () => {
    setLoading(true);
    try {
      const [itemsRes, calendarRes] = await Promise.all([
        fetch(`${API_BASE}/items`),
        fetch(`${API_BASE}/vendor-calendar`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }),
      ]);

      const itemsData = await itemsRes.json();
      const calendarData = await calendarRes.json();

      const toppingItems = Array.isArray(itemsData)
        ? itemsData.filter((item) => normalizeCategory(item?.category) === "topping")
        : [];

      const toppingMap = toppingItems.reduce((acc, item) => {
        const id = Number(item?.id);
        if (!Number.isFinite(id)) return acc;
        const key = `item_${id}`;
        acc[key] = {
          key,
          id,
          name: item?.name || `Item ${id}`,
          description: item?.description || "",
          nameNormalized: normalizeText(item?.name),
        };
        return acc;
      }, {});

      const filteredEvents = (Array.isArray(calendarData?.events) ? calendarData.events : [])
        .filter((event) => {
          const key = (event?.vendor_key || "").toString();
          if (key && toppingMap[key]) return true;

          const eventVendorName = normalizeText(event?.vendor_name);
          if (!eventVendorName) return false;
          return Object.values(toppingMap).some(
            (vendor) => vendor.nameNormalized === eventVendorName
          );
        })
        .map((event) => {
          const key = (event?.vendor_key || "").toString();
          if (key && toppingMap[key]) {
            return {
              ...event,
              vendor_name: event?.vendor_name || toppingMap[key].name,
              vendor_description: toppingMap[key].description || event?.vendor_description || "",
            };
          }

          const eventVendorName = normalizeText(event?.vendor_name);
          const matchedByName = Object.values(toppingMap).find(
            (vendor) => vendor.nameNormalized === eventVendorName
          );
          if (!matchedByName) return event;

          return {
            ...event,
            vendor_key: matchedByName.key,
            vendor_name: matchedByName.name,
            vendor_description: matchedByName.description || event?.vendor_description || "",
          };
        });

      setToppingVendorsMap(toppingMap);
      setEvents(filteredEvents);
      setAdminVendors(Array.isArray(calendarData?.admin_vendors) ? calendarData.admin_vendors : []);
    } catch (error) {
      console.error("Error fetching vendor calendar:", error);
      setToppingVendorsMap({});
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorCalendar();
  }, []);

  const monthlyEvents = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    return events.filter((event) => {
      const d = new Date(event.wedding_date);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== year || d.getMonth() !== month) return false;
      if (vendorFilter === "all") return true;
      return String(event.vendor_id || "") === String(vendorFilter);
    });
  }, [events, calendarMonth, vendorFilter]);

  const eventsByDate = useMemo(() => {
    return monthlyEvents.reduce((acc, event) => {
      const d = new Date(event.wedding_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});
  }, [monthlyEvents]);

  const selectedDateEvents = useMemo(
    () => (selectedDate ? eventsByDate[selectedDate] || [] : []),
    [selectedDate, eventsByDate]
  );
  const dedupedSelectedDateEvents = useMemo(() => {
    if (!selectedDateEvents.length) return [];

    const seen = new Set();
    const result = [];

    for (const event of selectedDateEvents) {
      const normalizedVendor = normalizeIdentityText(
        event.vendor_name || event.vendor_key
      );
      const normalizedClientName = normalizeIdentityText(event.client_name);
      const dedupeKey = [
        normalizedVendor,
        normalizedClientName,
      ].join("|");

      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      result.push(event);
    }

    return result;
  }, [selectedDateEvents]);

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const changeMonth = (direction) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
    setSelectedDate(null);
  };

  const handleOpenEventDetail = (event) => {
    setSelectedEventDetail(event);
    setVendorInputName(event.custom_vendor_name || "");
    setAssignedVendorId(event.vendor_id ? String(event.vendor_id) : "");
  };

  const handleSaveAssignedVendor = async () => {
    if (!selectedEventDetail) return;
    setSavingAssignedVendor(true);
    try {
      const path =
        selectedEventDetail.event_type === "custom_request"
          ? `${API_BASE}/custom-requests/${selectedEventDetail.source_id}/vendor`
          : `${API_BASE}/orders/${selectedEventDetail.source_id}/vendor`;
      const response = await fetch(path, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({
          vendor_id: assignedVendorId ? Number(assignedVendorId) : null,
        }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan vendor");
      await fetchVendorCalendar();
      setSelectedEventDetail(null);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingAssignedVendor(false);
    }
  };

  const handleApplyVendorName = () => {
    if (!selectedEventDetail || savingVendorName) return;
    const nextVendorName = vendorInputName.trim();
    if (!nextVendorName) return;

    const applyLocalUpdate = (updatedName) => {
      const matcher = (event) =>
        event.event_type === selectedEventDetail.event_type &&
        event.source_id === selectedEventDetail.source_id &&
        event.vendor_key === selectedEventDetail.vendor_key &&
        event.wedding_date === selectedEventDetail.wedding_date;

      setEvents((prev) =>
        prev.map((event) =>
          matcher(event) ? { ...event, custom_vendor_name: updatedName } : event
        )
      );
      setSelectedEventDetail((prev) =>
        prev ? { ...prev, custom_vendor_name: updatedName } : prev
      );
    };

    const previousName = selectedEventDetail.custom_vendor_name || "";
    applyLocalUpdate(nextVendorName);
    setSavingVendorName(true);

    fetch(`${API_BASE}/vendor-calendar/vendor-name`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
      },
      body: JSON.stringify({
        event_type: selectedEventDetail.event_type,
        source_id: selectedEventDetail.source_id,
        vendor_key: selectedEventDetail.vendor_key,
        wedding_date: selectedEventDetail.wedding_date,
        vendor_name: nextVendorName,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Gagal menyimpan nama vendor");
        }
        setSelectedEventDetail(null);
        setVendorInputName("");
      })
      .catch((error) => {
        console.error("Error saving vendor name:", error);
        applyLocalUpdate(previousName);
        setVendorInputName(previousName);
      })
      .finally(() => {
        setSavingVendorName(false);
      });
  };

  return (
    <>
      <Helmet>
        <title>Kalender Vendor (Topping) - Dashboard Admin</title>
      </Helmet>

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Kalender Vendor</h1>
          <p className="text-gray-600">
            Filter semua client atau per vendor. Kelola daftar vendor di menu Daftar Vendor.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Filter aktif: hanya item kategori TOPPING ({Object.keys(toppingVendorsMap).length} vendor aktif).
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-sm text-gray-600">Filter vendor:</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm max-w-xs"
            >
              <option value="all">Semua Client</option>
              {adminVendors.map((v) => (
                <option key={v.id} value={String(v.id)}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Jadwal Vendor</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
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
                onClick={() => changeMonth(1)}
                className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                title="Bulan berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-50 text-xs font-semibold text-gray-600">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
                <div key={day} className="px-2 py-2 text-center uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 text-sm">
              {loading ? (
                <div className="col-span-7 py-8 text-center text-gray-500">
                  Memuat jadwal vendor...
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

                  const key = `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  const eventsForDay = eventsByDate[key] || [];
                  const vendorsForDay = [...new Set(eventsForDay.map((e) => e.vendor_key))];
                  const isSelected = selectedDate === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={`min-h-20 border border-gray-100 p-1 text-left align-top ${
                        vendorsForDay.length > 0 ? "bg-blue-50" : "bg-white"
                      } ${isSelected ? "ring-2 ring-primary-500 z-10" : ""}`}
                    >
                      <div className="text-sm text-blue-700 font-medium mb-1 text-center">
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {vendorsForDay.slice(0, 3).map((vendorKey) => {
                          const vendorEvent = eventsForDay.find((e) => e.vendor_key === vendorKey);
                          const colorClass = getVendorColorClass(
                            vendorKey,
                            vendorEvent?.vendor_name || ""
                          );
                          return (
                            <span
                              key={vendorKey}
                              className={`block w-full rounded px-2 py-0.5 text-[10px] font-semibold truncate ${colorClass}`}
                            >
                              {vendorEvent?.vendor_name || vendorKey}
                            </span>
                          );
                        })}
                        {vendorsForDay.length > 3 && (
                          <span className="block text-[10px] text-gray-600 text-center">
                            +{vendorsForDay.length - 3} vendor
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

        {selectedDate && (
          <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Detail Vendor{" "}
                {new Date(selectedDate).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                Tutup detail
              </button>
            </div>

            {dedupedSelectedDateEvents.length === 0 ? (
              <p className="text-sm text-gray-500">Tidak ada jadwal vendor di tanggal ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Vendor</th>
                      <th className="px-4 py-2 text-left">Client</th>
                      <th className="px-4 py-2 text-left">Kontak</th>
                      <th className="px-4 py-2 text-left">Sumber</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dedupedSelectedDateEvents.map((event, idx) => (
                      <tr
                        key={`${event.event_type}-${event.source_id}-${event.vendor_key}-${idx}`}
                        className="border-t border-gray-100 cursor-pointer hover:bg-blue-50"
                        onClick={() => handleOpenEventDetail(event)}
                        title="Klik untuk lihat deskripsi vendor"
                      >
                        <td className="px-4 py-2">
                          <div>
                            <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${getVendorColorClass(event.vendor_key, event.vendor_name)}`}>
                              {event.vendor_name}
                            </span>
                            {event.custom_vendor_name?.trim() && (
                              <p className="mt-1 text-xs text-gray-600">
                                {event.custom_vendor_name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">{event.client_name || "-"}</td>
                        <td className="px-4 py-2">
                          <div>{event.client_phone || "-"}</div>
                          <div className="text-xs text-gray-500">{event.client_email || "-"}</div>
                        </td>
                        <td className="px-4 py-2">
                          {event.event_type === "custom_request" ? "Custom Request" : "Order"} #{event.source_id}
                        </td>
                        <td className="px-4 py-2">{statusLabel[event.status] || event.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selectedEventDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Detail Vendor</h3>
                <button
                  type="button"
                  onClick={() => setSelectedEventDetail(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${getVendorColorClass(selectedEventDetail.vendor_key, selectedEventDetail.vendor_name)}`}>
                    {selectedEventDetail.vendor_name}
                  </span>
                  {selectedEventDetail.custom_vendor_name?.trim() && (
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedEventDetail.custom_vendor_name}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Tanggal Acara</p>
                    <p className="font-medium text-gray-900">
                      {selectedEventDetail.wedding_date
                        ? new Date(selectedEventDetail.wedding_date).toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            }
                          )
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Nama Vendor (Input Admin)</p>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={vendorInputName}
                        onChange={(e) => setVendorInputName(e.target.value)}
                        placeholder="Masukkan nama vendor"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyVendorName}
                        disabled={savingVendorName}
                        className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                      >
                        {savingVendorName ? "Menyimpan..." : "Simpan"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Client</p>
                    <p className="font-medium text-gray-900">{selectedEventDetail.client_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Kontak</p>
                    <p className="font-medium text-gray-900">{selectedEventDetail.client_phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Sumber</p>
                    <p className="font-medium text-gray-900">
                      {selectedEventDetail.event_type === "custom_request" ? "Custom Request" : "Order"} #{selectedEventDetail.source_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium text-gray-900">{statusLabel[selectedEventDetail.status] || selectedEventDetail.status}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-gray-500">Vendor Penugasan (dari daftar admin)</p>
                    <div className="mt-1 flex gap-2">
                      <select
                        value={assignedVendorId}
                        onChange={(e) => setAssignedVendorId(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">— Belum dipilih —</option>
                        {adminVendors.map((v) => (
                          <option key={v.id} value={String(v.id)}>{v.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleSaveAssignedVendor}
                        disabled={savingAssignedVendor}
                        className="rounded-lg bg-secondary-600 px-3 py-2 text-sm font-medium text-white hover:bg-secondary-700 disabled:opacity-60"
                      >
                        {savingAssignedVendor ? "..." : "Simpan"}
                      </button>
                    </div>
                    {selectedEventDetail.assigned_vendor_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        Saat ini: {selectedEventDetail.assigned_vendor_name}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Deskripsi Vendor</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedEventDetail.vendor_description?.trim()
                      ? selectedEventDetail.vendor_description
                      : "Deskripsi vendor belum tersedia."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminVendorCalendar;
