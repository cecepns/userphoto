import { useEffect, useMemo, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import AsyncSelect from 'react-select/async';
import { ChevronLeft, ChevronRight, Edit, Trash2, Plus, X, Download, Copy } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';

import AdminLayout from '../../components/AdminLayout';
import { formatDate, formatRupiah } from '../../utils/formatters';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/request';
import {
  colorForPhotographer,
  styleForPhotographer,
  dutyDateLabel,
  getCalendarDays,
} from '../../utils/freelanceCalendar';

const AdminFreelanceCalendar = () => {
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedOrderOpt, setSelectedOrderOpt] = useState(null);
  const [selectedFreelancerOpt, setSelectedFreelancerOpt] = useState(null);
  const [freelancersList, setFreelancersList] = useState([]);
  const [freelancerFilter, setFreelancerFilter] = useState("all");
  const [form, setForm] = useState({
    duty_date: '',
    notes: '',
  });
  const [showFreelancerModal, setShowFreelancerModal] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loadingClient, setLoadingClient] = useState(false);

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth() + 1;

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet(`${API_ENDPOINTS.FREELANCE_CALENDAR}?year=${year}&month=${month}`);
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Gagal memuat jadwal');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const fetchFreelancers = useCallback(async () => {
    try {
      const data = await apiGet(API_ENDPOINTS.FREELANCERS.ALL);
      setFreelancersList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    fetchFreelancers();
  }, [fetchAssignments, fetchFreelancers]);

  const filteredAssignments = useMemo(() => {
    if (freelancerFilter === "all") return assignments;
    return assignments.filter(a => String(a.freelancer_id) === String(freelancerFilter));
  }, [assignments, freelancerFilter]);

  const eventsByDate = useMemo(() => {
    return filteredAssignments.reduce((acc, row) => {
      const key = dutyDateLabel(row.duty_date);
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [filteredAssignments]);

  const changeMonth = (delta) => {
    setCalendarMonth((prev) => {
      const n = new Date(prev);
      n.setMonth(prev.getMonth() + delta);
      return n;
    });
    setSelectedDateKey(null);
  };

  const handleDownloadPdf = async (detailAcaraId) => {
    try {
      const data = await apiGet(`/api/detail-acara/${detailAcaraId}`);
      if (!data) {
        toast.error("Gagal memuat detail acara");
        return;
      }

      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(16);
      doc.text('Detail Acara', 105, y, { align: 'center' });
      y += 12;
      doc.setFontSize(10);
      const lines = [
        `Nama Client: ${data.client_name || '-'}`,
        `Telepon: ${data.client_phone || '-'}`,
        `Alamat: ${data.client_address || '-'}`,
        `Pasangan: ${data.bride_name || '-'} & ${data.groom_name || '-'}`,
        `Tanggal Acara: ${data.wedding_date ? formatDate(data.wedding_date) : '-'}`,
        `Paket: ${data.package_name || '-'}`,
      ];
      lines.forEach((line) => { doc.text(line, 20, y); y += 7; });
      y += 5;

      const maps = Array.isArray(data.maps) && data.maps.length ? data.maps : [
        { url: data.map1_url || '', note: data.map1_note || '' },
        { url: data.map2_url || '', note: data.map2_note || '' },
        { url: data.map3_url || '', note: data.map3_note || '' },
        { url: data.map4_url || '', note: data.map4_note || '' },
      ].filter((m) => m.url || m.note);

      maps.forEach((m, index) => {
        if (!m.url && !m.note) return;
        doc.setFont('helvetica', 'bold');
        doc.text(`Lokasi ${index + 1}:`, 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        if (m.url) { doc.text(`Maps: ${m.url}`, 20, y); y += 6; }
        if (m.note) { doc.text(`Catatan: ${m.note}`, 20, y); y += 6; }
      });

      if (data.notes) {
        doc.text(`Catatan umum: ${data.notes}`, 20, y);
      }
      doc.save(`detail-acara-${data.id}.pdf`);
      toast.success("PDF Detail Acara berhasil diunduh");
    } catch (err) {
      toast.error("Gagal mengunduh PDF");
    }
  };

  const handleCopyTextFromId = (detailAcaraId) => {
    const copyPromise = new Promise(async (resolve, reject) => {
      try {
        const data = await apiGet(`/api/detail-acara/${detailAcaraId}`);
        if (!data) {
          reject(new Error("Gagal memuat detail acara"));
          return;
        }

        const maps = Array.isArray(data.maps) && data.maps.length ? data.maps : [
          { url: data.map1_url || '', note: data.map1_note || '' },
          { url: data.map2_url || '', note: data.map2_note || '' },
          { url: data.map3_url || '', note: data.map3_note || '' },
          { url: data.map4_url || '', note: data.map4_note || '' },
        ].filter((m) => m.url || m.note);

        let text = `Nama Client: ${data.client_name || '-'}\n`;
        text += `Telepon: ${data.client_phone || '-'}\n`;
        text += `Alamat: ${data.client_address || '-'}\n`;
        text += `Pasangan: ${data.bride_name || '-'} & ${data.groom_name || '-'}\n`;
        text += `Tanggal Acara: ${data.wedding_date ? formatDate(data.wedding_date) : '-'}\n`;
        text += `Paket: ${data.package_name || '-'}\n\n`;

        maps.forEach((m, index) => {
          if (!m.url && !m.note) return;
          text += `Lokasi ${index + 1}:\n`;
          if (m.url) text += `Maps: ${m.url}\n`;
          if (m.note) text += `Catatan: ${m.note}\n`;
          text += `\n`;
        });

        if (data.notes) {
          text += `Catatan umum: ${data.notes}\n`;
        }

        resolve(new Blob([text.trim()], { type: "text/plain" }));
      } catch (err) {
        reject(err);
      }
    });

    if (navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": copyPromise,
        })
      ]).then(() => {
        toast.success('Detail acara disalin ke clipboard');
      }).catch((err) => {
        console.error("Async copy error:", err);
        toast.error("Gagal menyalin detail acara");
      });
    } else {
      apiGet(`/api/detail-acara/${detailAcaraId}`).then((data) => {
        if (!data) return;
        const maps = Array.isArray(data.maps) && data.maps.length ? data.maps : [
          { url: data.map1_url || '', note: data.map1_note || '' },
          { url: data.map2_url || '', note: data.map2_note || '' },
          { url: data.map3_url || '', note: data.map3_note || '' },
          { url: data.map4_url || '', note: data.map4_note || '' },
        ].filter((m) => m.url || m.note);

        let text = `Nama Client: ${data.client_name || '-'}\n`;
        text += `Telepon: ${data.client_phone || '-'}\n`;
        text += `Alamat: ${data.client_address || '-'}\n`;
        text += `Pasangan: ${data.bride_name || '-'} & ${data.groom_name || '-'}\n`;
        text += `Tanggal Acara: ${data.wedding_date ? formatDate(data.wedding_date) : '-'}\n`;
        text += `Paket: ${data.package_name || '-'}\n\n`;

        maps.forEach((m, index) => {
          if (!m.url && !m.note) return;
          text += `Lokasi ${index + 1}:\n`;
          if (m.url) text += `Maps: ${m.url}\n`;
          if (m.note) text += `Catatan: ${m.note}\n`;
          text += `\n`;
        });

        if (data.notes) {
          text += `Catatan umum: ${data.notes}\n`;
        }

        navigator.clipboard.writeText(text.trim());
        toast.success('Detail acara disalin ke clipboard');
      }).catch(() => {
        toast.error("Browser tidak mendukung salin otomatis.");
      });
    }
  };

  const handleViewFreelancerDetail = (freelancerId, photographerName) => {
    const fl = freelancersList.find(f => String(f.id) === String(freelancerId));
    if (fl) {
      setSelectedFreelancer(fl);
    } else {
      setSelectedFreelancer({
        name: photographerName,
        phone: '—',
        email: '—',
        rekening: '—',
        alamat: '—',
        rates: []
      });
    }
    setShowFreelancerModal(true);
  };

  const handleViewClientDetail = async (row) => {
    setLoadingClient(true);
    setShowClientModal(true);
    try {
      if (row.detail_acara_id) {
        const data = await apiGet(`/api/detail-acara/${row.detail_acara_id}`);
        setSelectedClient({
          name: data.client_name,
          phone: data.client_phone,
          address: data.client_address,
          wedding_date: data.wedding_date,
          package_name: data.package_name,
          bride_name: data.bride_name,
          groom_name: data.groom_name,
          notes: data.notes,
          order_id: row.order_id,
          order_source: row.order_source
        });
        return;
      }
      
      if (row.order_source === 'order') {
        const data = await apiGet(`/api/orders/${row.order_id}`);
        setSelectedClient({
          name: data.name,
          phone: data.phone,
          address: data.address,
          wedding_date: data.wedding_date,
          package_name: data.service_name,
          bride_name: data.bride_name,
          groom_name: data.groom_name,
          notes: data.notes,
          order_id: row.order_id,
          order_source: row.order_source
        });
      } else {
        const data = await apiGet(`/api/custom-requests/${row.order_id}`);
        setSelectedClient({
          name: data.name,
          phone: data.phone,
          address: data.additional_requests || '',
          wedding_date: data.wedding_date,
          package_name: data.services || 'Layanan Custom',
          bride_name: '',
          groom_name: '',
          notes: data.additional_requests,
          order_id: row.order_id,
          order_source: row.order_source
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data client');
      setSelectedClient({
        name: row.client_name,
        phone: row.client_phone,
        address: '',
        wedding_date: row.duty_date,
        package_name: row.service_label || 'Layanan',
        bride_name: '',
        groom_name: '',
        notes: row.notes,
        order_id: row.order_id,
        order_source: row.order_source
      });
    } finally {
      setLoadingClient(false);
    }
  };

  const handleCopyFreelancer = (fl) => {
    if (!fl) return;
    let text = `Detail Freelancer:\n`;
    text += `Nama: ${fl.name || '-'}\n`;
    text += `Telepon: ${fl.phone || '-'}\n`;
    text += `Email: ${fl.email || '-'}\n`;
    text += `Rekening: ${fl.rekening || '-'}\n`;
    text += `Alamat: ${fl.alamat || '-'}\n`;
    if (Array.isArray(fl.rates) && fl.rates.length > 0) {
      text += `Rates:\n`;
      fl.rates.forEach(r => {
        text += `- ${r.label}: ${formatRupiah(r.price)}\n`;
      });
    }
    navigator.clipboard.writeText(text.trim());
    toast.success('Detail freelancer disalin ke clipboard');
  };



  const loadFreelancerOptions = async (inputValue) => {
    const data = await apiGet(
      `${API_ENDPOINTS.FREELANCERS.SEARCH}?q=${encodeURIComponent(inputValue || '')}&limit=20`,
    );
    const rows = data.data || [];
    return rows.map((f) => ({
      value: f.id,
      label: f.phone ? `${f.name} · ${f.phone}` : f.name,
      freelancer: f,
    }));
  };

  const loadOrderOptions = async (inputValue) => {
    const rows = await apiGet(`/api/orders/search?q=${encodeURIComponent(inputValue || '')}`);
    return rows.map((row) => {
      const isCustom = row.order_source === 'custom_request';
      const datePart = row.wedding_date ? formatDate(row.wedding_date) : '-';
      const svc = row.service_name || (isCustom ? 'Layanan custom' : '-');
      const prefix = isCustom ? 'C' : '';
      const tag = isCustom ? 'Custom' : 'Biasa';
      const ymd = dutyDateLabel(row.wedding_date);
      return {
        value: isCustom ? `custom:${row.id}` : `order:${row.id}`,
        label: `#${prefix}${row.id} — ${row.name || '-'} — ${svc} (${tag}) · acara ${datePart}`,
        order: {
          id: row.id,
          source: isCustom ? 'custom_request' : 'order',
          name: row.name,
          wedding_date: ymd,
        },
      };
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setSelectedOrderOpt(null);
    setSelectedFreelancerOpt(null);
    setForm({ duty_date: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setSelectedOrderOpt({
      value: `${row.order_source === 'custom_request' ? 'custom' : 'order'}:${row.order_id}`,
      label: `#${row.order_source === 'custom_request' ? 'C' : ''}${row.order_id} — ${row.client_name || '-'}`,
      order: {
        id: row.order_id,
        source: row.order_source,
        name: row.client_name,
        wedding_date: row.order_wedding_date || '',
      },
    });
    setSelectedFreelancerOpt(
      row.freelancer_id
        ? {
          value: row.freelancer_id,
          label: row.photographer_name || `Freelance #${row.freelancer_id}`,
          freelancer: { id: row.freelancer_id, name: row.photographer_name },
        }
        : row.photographer_name
          ? { value: `legacy:${row.photographer_name}`, label: row.photographer_name, freelancer: null }
          : null,
    );
    setForm({
      duty_date: dutyDateLabel(row.duty_date),
      notes: row.notes || '',
    });
    setShowModal(true);
  };

  const handleOrderSelect = (opt) => {
    setSelectedOrderOpt(opt);
    if (opt?.order?.wedding_date) {
      setForm((f) => ({ ...f, duty_date: opt.order.wedding_date }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingId && !selectedOrderOpt?.order) {
      toast.error('Pilih pesanan');
      return;
    }
    const freelancerId = Number(
      selectedFreelancerOpt?.freelancer?.id ?? selectedFreelancerOpt?.value,
    );
    if (!Number.isFinite(freelancerId) || freelancerId <= 0) {
      toast.error('Pilih freelance / fotografer dari database');
      return;
    }
    const dd = form.duty_date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dd)) {
      toast.error('Tanggal bertugas tidak valid');
      return;
    }

    const payload = {
      freelancer_id: freelancerId,
      duty_date: dd,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        await apiPut(`${API_ENDPOINTS.FREELANCE_CALENDAR}/${editingId}`, payload);
        toast.success('Jadwal diperbarui');
      } else {
        const { source, id } = selectedOrderOpt.order;
        await apiPost(API_ENDPOINTS.FREELANCE_CALENDAR, {
          order_source: source,
          order_id: id,
          ...payload,
        });
        toast.success('Jadwal ditambahkan');
      }
      setShowModal(false);
      fetchAssignments();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus jadwal freelance ini?')) return;
    try {
      await apiDelete(`${API_ENDPOINTS.FREELANCE_CALENDAR}/${id}`);
      toast.success('Dihapus');
      fetchAssignments();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus');
    }
  };

  const days = getCalendarDays(calendarMonth);
  const selectedDayEvents = selectedDateKey ? eventsByDate[selectedDateKey] || [] : [];

  return (
    <>
      <Helmet>
        <title>Kalender Freelance (Fotografer) - Dashboard Admin</title>
      </Helmet>
      <Toaster position="top-right" />
      <AdminLayout>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Kalender Freelance</h1>
          </div>
          {/* <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0">
            <Plus size={18} /> Tambah penugasan
          </button> */}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Kalender</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[180px]">
                <select
                  value={freelancerFilter}
                  onChange={(e) => setFreelancerFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">Semua Freelance</option>
                  {freelancersList.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
                  {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-500">Memuat…</div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-gray-500 mb-2">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, idx) => {
                  if (!d) {
                    return <div key={`pad-${idx}`} className="min-h-[72px] rounded-lg bg-gray-50/50" />;
                  }
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                    d.getDate()
                  ).padStart(2, '0')}`;
                  const list = eventsByDate[key] || [];
                  const isSelected = selectedDateKey === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedDateKey(isSelected ? null : key)}
                      className={`min-h-[72px] rounded-lg border p-1 text-left text-xs transition-colors ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : list.length
                            ? 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50'
                            : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-semibold text-gray-700">{d.getDate()}</span>
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {list.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className="inline-block max-w-full truncate rounded px-1 py-0.5 text-[10px] font-medium"
                            style={styleForPhotographer(ev.photographer_name)}
                            title={ev.photographer_name}
                          >
                            {ev.photographer_name}
                          </span>
                        ))}
                        {list.length > 3 && (
                          <span className="text-[10px] text-gray-500">+{list.length - 3}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {selectedDateKey && (
          <div className="bg-white rounded-xl border border-gray-100 shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Detail Penugasan Tanggal {formatDate(selectedDateKey)}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className="text-sm font-medium text-primary-600 hover:text-primary-800"
              >
                Tutup detail
              </button>
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">Belum ada penugasan di tanggal ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-2">Fg/Vg</th>
                      <th className="py-2 pr-2">Klien / Pesanan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDayEvents.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => handleViewClientDetail(row)}
                        className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                        title="Klik untuk detail client"
                      >
                        <td className="py-3 pr-2 font-medium text-gray-700">
                          <span
                            className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                            style={styleForPhotographer(row.photographer_name)}
                          >
                            {row.photographer_name}
                          </span>
                        </td>
                        <td className="py-3 pr-2 font-medium text-primary-600 hover:underline">
                          {row.client_name || '-'} · #
                          {row.order_source === 'custom_request' ? `C${row.order_id}` : row.order_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  {editingId ? 'Edit penugasan' : 'Tambah penugasan fotografer'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pesanan *</label>
                  {editingId ? (
                    <p className="text-sm text-gray-800 py-2 border rounded-lg px-3 bg-gray-50">
                      {selectedOrderOpt?.label}
                    </p>
                  ) : (
                    <AsyncSelect
                      cacheOptions
                      defaultOptions
                      loadOptions={loadOrderOptions}
                      value={selectedOrderOpt}
                      onChange={handleOrderSelect}
                      placeholder="Cari pesanan (nama, HP, ID)…"
                      classNamePrefix="rs"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: 42,
                          borderRadius: 8,
                          borderColor: '#d1d5db',
                        }),
                      }}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Freelance / Fotografer *</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadFreelancerOptions}
                    value={selectedFreelancerOpt}
                    onChange={setSelectedFreelancerOpt}
                    placeholder="Cari freelance (nama, email)…"
                    noOptionsMessage={() => 'Freelance tidak ditemukan'}
                    classNamePrefix="rs"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: 42,
                        borderRadius: 8,
                        borderColor: '#d1d5db',
                      }),
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Data diambil dari menu Database Freelance Inhouse. Freelancer login untuk melihat jadwal ini.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal bertugas *</label>
                  <input
                    type="date"
                    value={form.duty_date}
                    onChange={(e) => setForm((f) => ({ ...f, duty_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default mengikuti tanggal acara pesanan; bisa diubah jika hari kerja berbeda.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Lokasi, shift, dll."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn-primary px-4 py-2">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showFreelancerModal && selectedFreelancer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-gray-200 flex justify-between items-center relative">
                <h2 className="text-lg font-semibold text-gray-800">
                  Detail Freelancer
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyFreelancer(selectedFreelancer)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Copy size={14} /> Salin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFreelancerModal(false);
                      setSelectedFreelancer(null);
                    }}
                    className="text-gray-500 hover:text-gray-800 p-1"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase">Nama</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedFreelancer.name || '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase">No. HP</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedFreelancer.phone || '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase">Email</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedFreelancer.email || '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase">No. Rekening</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedFreelancer.rekening || '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase">Alamat</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 whitespace-pre-wrap">{selectedFreelancer.alamat || '—'}</p>
                </div>
                {Array.isArray(selectedFreelancer.rates) && selectedFreelancer.rates.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Tugas &amp; Rate</label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFreelancer.rates.map((r, idx) => (
                        <span key={idx} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                          {r.label}: {formatRupiah(r.price)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-gray-150 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowFreelancerModal(false);
                    setSelectedFreelancer(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {showClientModal && selectedClient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  Detail Client / Pesanan
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowClientModal(false);
                    setSelectedClient(null);
                  }}
                  className="text-gray-500 hover:text-gray-800 p-1"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto">
                {loadingClient ? (
                  <p className="text-center text-gray-500 py-8">Memuat detail client...</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase">Nama Client</label>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedClient.name || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase">No. HP</label>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedClient.phone || '—'}</p>
                    </div>
                    {selectedClient.bride_name && selectedClient.groom_name && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase">Pasangan</label>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                          {selectedClient.bride_name} &amp; {selectedClient.groom_name}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase">Tanggal Acara</label>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedClient.wedding_date ? formatDate(selectedClient.wedding_date) : '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase">Layanan / Paket</label>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedClient.package_name || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase">Alamat</label>
                      <p className="text-sm font-medium text-gray-900 mt-0.5 whitespace-pre-wrap">{selectedClient.address || '—'}</p>
                    </div>
                    {selectedClient.notes && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase">Catatan</label>
                        <p className="text-sm font-medium text-gray-900 mt-0.5 whitespace-pre-wrap">{selectedClient.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-gray-150 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowClientModal(false);
                    setSelectedClient(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminFreelanceCalendar;
