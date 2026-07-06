import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { Download, Plus, Edit, Trash2, X, Copy } from 'lucide-react';
import AsyncSelect from 'react-select/async';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import AdminLayout from '../../components/AdminLayout';
import { formatDate, toDateOnlyString } from '../../utils/formatters';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/request';
import { useSiteIdentity } from '../../hooks/useSiteIdentity';

const MAX_MAPS = 20;

const FIELD_LABELS = {
  client_name: 'Nama Client',
  client_phone: 'Telepon',
  bride_name: 'Nama Pengantin Wanita',
  groom_name: 'Nama Pengantin Pria',
  wedding_date: 'Tanggal Acara',
  package_name: 'Nama Paket',
  fg_vg: 'Nama FG/VG',
};

const emptyMap = () => ({ url: '', note: '' });

const mapsFromRow = (row) => {
  if (Array.isArray(row?.maps) && row.maps.length) {
    return row.maps.map((m) => ({ url: m.url || '', note: m.note || '' }));
  }
  const legacy = [1, 2, 3, 4]
    .map((n) => ({ url: row[`map${n}_url`] || '', note: row[`map${n}_note`] || '' }))
    .filter((m) => m.url || m.note);
  return legacy.length ? legacy : [emptyMap()];
};

const emptyForm = () => ({
  order_source: null,
  order_id: null,
  client_name: '',
  client_phone: '',
  client_address: '',
  bride_name: '',
  groom_name: '',
  wedding_date: '',
  package_name: '',
  fg_vg: '',
  maps: [emptyMap()],
  notes: '',
});


const AdminDetailAcara = () => {
  const { appName } = useSiteIdentity();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedOrderOpt, setSelectedOrderOpt] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: String(pagination.limit) });
      if (q.trim()) params.set('q', q.trim());
      const data = await apiGet(`${API_ENDPOINTS.DETAIL_ACARA.LIST}?${params}`);
      setItems(data.items || []);
      setPagination((p) => ({ ...p, ...data.pagination }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, q]);

  useEffect(() => {
    const t = setTimeout(() => fetchList(), 300);
    return () => clearTimeout(t);
  }, [fetchList]);

  const loadOrderOptions = async (inputValue) => {
    const data = await apiGet(`${API_ENDPOINTS.ORDERS.SEARCH}?q=${encodeURIComponent(inputValue || '')}`);
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => {
      const isCustom = row.order_source === 'custom_request';
      const datePart = row.wedding_date ? formatDate(row.wedding_date) : '-';
      const svc = row.service_name || (isCustom ? 'Layanan custom' : '-');
      const prefix = isCustom ? 'C' : '';
      const tag = isCustom ? 'Custom' : 'Biasa';
      return {
        value: isCustom ? `custom:${row.id}` : `order:${row.id}`,
        label: `#${prefix}${row.id} — ${row.name || '-'} — ${svc} (${tag}) · ${datePart}`,
        order: {
          id: row.id,
          source: isCustom ? 'custom_request' : 'order',
          name: row.name,
          phone: row.phone,
          address: row.address,
          bride_name: row.bride_name,
          groom_name: row.groom_name,
          wedding_date: toDateOnlyString(row.wedding_date),
          package_name: svc
        }
      };
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setSelectedOrderOpt(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      order_source: row.order_source || null,
      order_id: row.order_id || null,
      client_name: row.client_name || '',
      client_phone: row.client_phone || '',
      client_address: row.client_address || '',
      bride_name: row.bride_name || '',
      groom_name: row.groom_name || '',
      wedding_date: toDateOnlyString(row.wedding_date),
      package_name: row.package_name || '',
      fg_vg: row.fg_vg || '',
      maps: mapsFromRow(row),
      notes: row.notes || '',
    });

    // Set auto-select field state if order reference exists
    if (row.order_id && row.order_source) {
      const isCustom = row.order_source === 'custom_request';
      const prefix = isCustom ? 'C' : '';
      const tag = isCustom ? 'Custom' : 'Biasa';
      setSelectedOrderOpt({
        value: isCustom ? `custom:${row.order_id}` : `order:${row.order_id}`,
        label: `#${prefix}${row.order_id} — ${row.client_name || '-'} — ${row.package_name || '-'} (${tag})`,
        order: {
          id: row.order_id,
          source: row.order_source,
          name: row.client_name,
          phone: row.client_phone,
          address: row.client_address,
          bride_name: row.bride_name,
          groom_name: row.groom_name,
          wedding_date: toDateOnlyString(row.wedding_date),
          package_name: row.package_name
        }
      });
    } else {
      setSelectedOrderOpt(null);
    }
    setShowModal(true);
  };


  const buildPayload = () => ({
    order_source: form.order_source,
    order_id: form.order_id,
    client_name: form.client_name,
    client_phone: form.client_phone,
    client_address: form.client_address,
    bride_name: form.bride_name,
    groom_name: form.groom_name,
    wedding_date: form.wedding_date,
    package_name: form.package_name,
    fg_vg: form.fg_vg,
    notes: form.notes,
    maps: form.maps
      .map((m) => ({ url: m.url.trim(), note: m.note.trim() }))
      .filter((m) => m.url || m.note),
  });


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = buildPayload();
      if (editingId) {
        await apiPut(API_ENDPOINTS.DETAIL_ACARA.UPDATE(editingId), payload);
        toast.success('Detail acara diperbarui');
      } else {
        await apiPost(API_ENDPOINTS.DETAIL_ACARA.CREATE, payload);
        toast.success('Detail acara dibuat');
      }
      setShowModal(false);
      fetchList();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const generatePdf = async (row) => {
    const maps = mapsFromRow(row);
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("DETAIL ACARA", 105, 20, { align: "center" });

    // Company Name
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(appName || "Chekusphoto", 20, 32);

    // Divider Line
    doc.setLineWidth(0.5);
    doc.line(20, 36, 190, 36);

    // FG / VG Name Section (Placed above data client)
    let y = 44;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`FG / VG: ${row.fg_vg || '-'}`, 20, y);
    y += 10;

    // Client Info Header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Data Client:", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(`Nama Client: ${row.client_name || '-'}`, 20, y);
    y += 6;
    doc.text(`Telepon: ${row.client_phone || '-'}`, 20, y);
    y += 6;
    doc.text(`Pasangan: ${row.bride_name || '-'} & ${row.groom_name || '-'}`, 20, y);
    y += 6;
    doc.text(`Tanggal Acara: ${row.wedding_date ? formatDate(row.wedding_date) : '-'}`, 20, y);
    y += 6;
    doc.text(`Paket: ${row.package_name || '-'}`, 20, y);
    y += 8;

    const addressLines = row.client_address
      ? doc.splitTextToSize(`Alamat: ${row.client_address}`, 170)
      : [];
    if (addressLines.length > 0) {
      doc.text(addressLines, 20, y);
      y += addressLines.length * 5 + 4;
    }

    // Divider Line
    doc.setLineWidth(0.2);
    doc.line(20, y, 190, y);
    y += 8;

    // Locations Info Header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Lokasi Acara:", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    for (let index = 0; index < maps.length; index++) {
      const m = maps[index];
      if (!m.url && !m.note) continue;

      // Calculate required height for this location block
      const qrHeight = m.url ? 36 : 0;
      const noteLines = m.note ? doc.splitTextToSize(`Catatan: ${m.note}`, 170) : [];
      const noteHeight = noteLines.length * 5;
      const textHeight = m.url ? doc.splitTextToSize(`Maps: ${m.url}`, 170).length * 5 : 0;
      const totalBlockHeight = 6 + textHeight + qrHeight + noteHeight + 4;

      if (y + totalBlockHeight > 280) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`Lokasi ${index + 1}:`, 20, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      if (m.url) {
        const urlLines = doc.splitTextToSize(`Maps: ${m.url}`, 170);
        doc.text(urlLines, 20, y);
        y += urlLines.length * 5;

        try {
          const qrDataUrl = await QRCode.toDataURL(m.url, { margin: 1, width: 100 });
          doc.addImage(qrDataUrl, 'PNG', 20, y, 30, 30);
          y += 36;
        } catch (qrErr) {
          console.error("Error generating QR code:", qrErr);
        }
      }
      if (m.note) {
        doc.text(noteLines, 20, y);
        y += noteHeight;
      }
      y += 2;
    }

    if (row.notes) {
      y += 4;
      const notesLines = doc.splitTextToSize(row.notes, 170);
      const notesHeight = notesLines.length * 5 + 6;
      if (y + notesHeight > 280) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text("Catatan Umum:", 20, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(notesLines, 20, y);
      y += notesLines.length * 5;
    }

    doc.save(`detail-acara-${row.id}.pdf`);
  };


  const handleCopyText = (row) => {
    const maps = mapsFromRow(row);
    let text = `Nama FG/VG: ${row.fg_vg || '-'}\n`;
    text += `Nama Client: ${row.client_name || '-'}\n`;
    text += `Telepon: ${row.client_phone || '-'}\n`;
    text += `Alamat: ${row.client_address || '-'}\n`;
    text += `Pasangan: ${row.bride_name || '-'} & ${row.groom_name || '-'}\n`;
    text += `Tanggal Acara: ${row.wedding_date ? formatDate(row.wedding_date) : '-'}\n`;
    text += `Paket: ${row.package_name || '-'}\n\n`;

    maps.forEach((m, index) => {
      if (!m.url && !m.note) return;
      text += `Lokasi ${index + 1}:\n`;
      if (m.url) text += `Maps: ${m.url}\n`;
      if (m.note) text += `Catatan: ${m.note}\n`;
      text += `\n`;
    });

    if (row.notes) {
      text += `Catatan umum: ${row.notes}\n`;
    }

    navigator.clipboard.writeText(text.trim());
    toast.success('Detail acara disalin ke clipboard');
  };


  const handleDelete = async (id) => {
    if (!window.confirm('Hapus detail acara?')) return;
    try {
      await apiDelete(API_ENDPOINTS.DETAIL_ACARA.DELETE(id));
      toast.success('Dihapus');
      fetchList();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const setMapField = (index, field, value) => {
    setForm((f) => {
      const maps = [...f.maps];
      maps[index] = { ...maps[index], [field]: value };
      return { ...f, maps };
    });
  };

  const addMap = () => {
    if (form.maps.length >= MAX_MAPS) {
      toast.error(`Maksimal ${MAX_MAPS} lokasi maps`);
      return;
    }
    setForm((f) => ({ ...f, maps: [...f.maps, emptyMap()] }));
  };

  const removeMap = (index) => {
    setForm((f) => {
      if (f.maps.length <= 1) return f;
      return { ...f, maps: f.maps.filter((_, i) => i !== index) };
    });
  };

  const modal = showModal ? (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="fixed inset-0 bg-black/50"
          aria-label="Tutup"
          onClick={() => setShowModal(false)}
        />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[min(90vh,100dvh-2rem)] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingId ? 'Edit' : 'Tambah'} Detail Acara
            </h3>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>
          </div>

          <form id="detail-acara-form" onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 flex-1">
            {!editingId && (
              <div className="sm:col-span-2 mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-1">Cari &amp; Isi Otomatis dari Pesanan</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadOrderOptions}
                  value={selectedOrderOpt}
                  onChange={(opt) => {
                    setSelectedOrderOpt(opt);
                    if (opt?.order) {
                      setForm({
                        order_source: opt.order.source || null,
                        order_id: opt.order.id || null,
                        client_name: opt.order.name || '',
                        client_phone: opt.order.phone || '',
                        client_address: opt.order.address || '',
                        bride_name: opt.order.bride_name || '',
                        groom_name: opt.order.groom_name || '',
                        wedding_date: opt.order.wedding_date || '',
                        package_name: opt.order.package_name || '',
                        fg_vg: form.fg_vg || '',
                        maps: form.maps,
                        notes: form.notes
                      });
                    } else {
                      setForm((f) => ({ ...f, order_source: null, order_id: null }));
                    }
                  }}

                  placeholder="Ketik nama client / HP..."
                  classNamePrefix="rs"
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderRadius: 8,
                      borderColor: '#d1d5db',
                      minHeight: 42,
                    }),
                  }}
                />
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.keys(FIELD_LABELS).map((field) => (
                <div key={field}>
                  <label className="text-sm font-medium text-gray-700">{FIELD_LABELS[field]}</label>
                  <input
                    type={field === 'wedding_date' ? 'date' : 'text'}
                    value={form[field]}
                    onChange={(e) => setField(field, e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 mt-1 ${field === 'fg_vg' ? 'bg-gray-150 cursor-not-allowed text-gray-600' : ''}`}
                    required={['client_name', 'bride_name', 'groom_name'].includes(field)}
                    disabled={field === 'fg_vg'}
                    placeholder={field === 'fg_vg' ? 'Terisi otomatis dari penugasan freelance' : ''}
                  />
                </div>
              ))}

              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">Alamat</label>
                <textarea
                  value={form.client_address}
                  onChange={(e) => setField('client_address', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={2}
                />
              </div>

              <div className="sm:col-span-2 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-gray-800">Lokasi Maps</p>
                  <button
                    type="button"
                    onClick={addMap}
                    disabled={form.maps.length >= MAX_MAPS}
                    className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                  >
                    <Plus size={16} /> Tambah Maps
                  </button>
                </div>

                <div className="space-y-4">
                  {form.maps.map((map, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 p-3 bg-gray-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Maps {index + 1}</span>
                        {form.maps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMap(index)}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} /> Hapus
                          </button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input
                          placeholder="URL Google Maps"
                          value={map.url}
                          onChange={(e) => setMapField(index, 'url', e.target.value)}
                          className="border rounded-lg px-3 py-2 bg-white text-sm"
                        />
                        <input
                          placeholder="Keterangan lokasi"
                          value={map.note}
                          onChange={(e) => setMapField(index, 'note', e.target.value)}
                          className="border rounded-lg px-3 py-2 bg-white text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">Catatan Umum</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={2}
                />
              </div>
            </div>
          </form>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">
              Batal
            </button>
            <button
              type="submit"
              form="detail-acara-form"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Helmet><title>Detail Acara - Admin</title></Helmet>
      <AdminLayout>
        <div className="mb-6 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Detail Acara</h1>
            <p className="text-gray-600">Dokumen detail acara</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg">
            <Plus size={18} /> Tambah
          </button>
        </div>

        <input
          type="search"
          placeholder="Cari..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="mb-4 border rounded-lg px-3 py-2 max-w-sm w-full"
        />

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Pasangan</th>
                <th className="px-4 py-3 text-left">FG/VG</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3">Edit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center">Memuat...</td></tr>
              ) : items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">{row.client_name}</td>
                  <td className="px-4 py-3">{row.bride_name} & {row.groom_name}</td>
                  <td className="px-4 py-3">{row.fg_vg || '-'}</td>
                  <td className="px-4 py-3">{row.wedding_date ? formatDate(row.wedding_date) : '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button type="button" onClick={() => generatePdf(row)} className="text-green-600 hover:text-green-700" title="Unduh PDF Acara"><Download size={18} /></button>
                    <button type="button" onClick={() => handleCopyText(row)} className="text-blue-600 hover:text-blue-700" title="Salin Detail (WA)"><Copy size={18} /></button>
                    <button type="button" onClick={() => openEdit(row)} className="text-primary-600 hover:text-primary-700"><Edit size={18} /></button>
                    <button type="button" onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-700"><Trash2 size={18} /></button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {typeof document !== 'undefined' && createPortal(modal, document.body)}
      </AdminLayout>
    </>
  );
};

export default AdminDetailAcara;
