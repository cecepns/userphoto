import { useEffect, useMemo, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import AsyncSelect from 'react-select/async';
import { ChevronLeft, ChevronRight, Edit, Trash2, Plus, X, Download, Copy } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';

import AdminLayout from '../../components/AdminLayout';
import { formatDate } from '../../utils/formatters';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/request';
import {
  colorForPhotographer,
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

  const handleCopyTextFromId = async (detailAcaraId) => {
    try {
      const data = await apiGet(`/api/detail-acara/${detailAcaraId}`);
      if (!data) {
        toast.error("Gagal memuat detail acara");
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

      navigator.clipboard.writeText(text.trim());
      toast.success('Detail acara disalin ke clipboard');
    } catch (err) {
      toast.error("Gagal menyalin detail acara");
    }
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
            <p className="text-gray-600 max-w-2xl">
              Atur jadwal fotografer freelance yang terjun / bertugas pada tanggal tertentu untuk setiap
              pesanan (biasa maupun custom). Mirip staff field: satu pesanan bisa punya beberapa penugasan.
            </p>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0">
            <Plus size={18} /> Tambah penugasan
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6">
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
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
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
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-semibold text-gray-700">{d.getDate()}</span>
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {list.slice(0, 3).map((ev) => (
                            <span
                              key={ev.id}
                              className={`inline-block max-w-full truncate rounded px-1 py-0.5 text-[10px] font-medium ${colorForPhotographer(
                                ev.photographer_name
                              )}`}
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

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Detail hari</h2>
              {selectedDateKey && (
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(null)}
                  className="text-gray-500 hover:text-gray-800 p-1"
                  aria-label="Tutup"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {!selectedDateKey ? (
              <p className="text-sm text-gray-500">Klik tanggal di kalender untuk melihat daftar penugasan.</p>
            ) : selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada penugasan di {formatDate(selectedDateKey)}.</p>
            ) : (
              <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {selectedDayEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-gray-200 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${colorForPhotographer(
                            ev.photographer_name
                          )}`}
                        >
                          {ev.photographer_name}
                        </p>
                        <p className="mt-1 font-medium text-gray-900">
                          {ev.client_name || '-'} · #
                          {ev.order_source === 'custom_request' ? `C${ev.order_id}` : ev.order_id}
                        </p>
                        <p className="text-xs text-gray-500">{ev.client_phone}</p>
                        {ev.notes ? (
                          <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{ev.notes}</p>
                        ) : null}
                      </div>
                       <div className="flex gap-1.5 shrink-0 items-center">
                        {ev.detail_acara_id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(ev.detail_acara_id)}
                              className="p-1.5 rounded-lg text-green-600 bg-green-50 hover:bg-green-100"
                              title="Unduh PDF Acara"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyTextFromId(ev.detail_acara_id)}
                              className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100"
                              title="Salin Detail (WA)"
                            >
                              <Copy size={14} />
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEdit(ev)}
                          className="p-1.5 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ev.id)}
                          className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Semua penugasan bulan ini</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-2">Tanggal bertugas</th>
                  <th className="py-2 pr-2">Fotografer</th>
                  <th className="py-2 pr-2">Klien / Pesanan</th>
                  <th className="py-2 pr-2 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      Belum ada data
                    </td>
                  </tr>
                ) : (
                  assignments.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2 whitespace-nowrap">{formatDate(row.duty_date)}</td>
                      <td className="py-2 pr-2 font-medium">{row.photographer_name}</td>
                      <td className="py-2 pr-2">
                        {row.client_name || '-'} · #
                        {row.order_source === 'custom_request' ? `C${row.order_id}` : row.order_id}
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-1.5 items-center">
                          {row.detail_acara_id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(row.detail_acara_id)}
                                className="p-1.5 rounded-lg text-green-600 bg-green-50 hover:bg-green-100"
                                title="Unduh PDF Acara"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyTextFromId(row.detail_acara_id)}
                                className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100"
                                title="Salin Detail (WA)"
                              >
                                <Copy size={14} />
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="p-1.5 rounded text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="p-1.5 rounded text-red-600 bg-red-50 hover:bg-red-100"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
      </AdminLayout>
    </>
  );
};

export default AdminFreelanceCalendar;
