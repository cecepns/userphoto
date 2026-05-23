import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Download, Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import AdminLayout from '../../components/AdminLayout';
import { formatDate } from '../../utils/formatters';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/request';

const emptyForm = () => ({
  client_name: '',
  client_phone: '',
  client_address: '',
  bride_name: '',
  groom_name: '',
  wedding_date: '',
  package_name: '',
  map1_url: '', map1_note: '',
  map2_url: '', map2_note: '',
  map3_url: '', map3_note: '',
  map4_url: '', map4_note: '',
  notes: '',
});

const AdminDetailAcara = () => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      client_name: row.client_name || '',
      client_phone: row.client_phone || '',
      client_address: row.client_address || '',
      bride_name: row.bride_name || '',
      groom_name: row.groom_name || '',
      wedding_date: row.wedding_date ? String(row.wedding_date).slice(0, 10) : '',
      package_name: row.package_name || '',
      map1_url: row.map1_url || '', map1_note: row.map1_note || '',
      map2_url: row.map2_url || '', map2_note: row.map2_note || '',
      map3_url: row.map3_url || '', map3_note: row.map3_note || '',
      map4_url: row.map4_url || '', map4_note: row.map4_note || '',
      notes: row.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiPut(API_ENDPOINTS.DETAIL_ACARA.UPDATE(editingId), form);
        toast.success('Detail acara diperbarui');
      } else {
        await apiPost(API_ENDPOINTS.DETAIL_ACARA.CREATE, form);
        toast.success('Detail acara dibuat');
      }
      setShowModal(false);
      fetchList();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const generatePdf = (row) => {
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(16);
    doc.text('Detail Acara', 105, y, { align: 'center' });
    y += 12;
    doc.setFontSize(10);
    const lines = [
      `Nama Client: ${row.client_name || '-'}`,
      `Telepon: ${row.client_phone || '-'}`,
      `Alamat: ${row.client_address || '-'}`,
      `Pasangan: ${row.bride_name || '-'} & ${row.groom_name || '-'}`,
      `Tanggal Acara: ${row.wedding_date ? formatDate(row.wedding_date) : '-'}`,
      `Paket: ${row.package_name || '-'}`,
    ];
    lines.forEach((line) => { doc.text(line, 20, y); y += 7; });
    y += 5;
    [1, 2, 3, 4].forEach((n) => {
      const url = row[`map${n}_url`];
      const note = row[`map${n}_note`];
      if (url || note) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Lokasi ${n}:`, 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        if (url) { doc.text(`Maps: ${url}`, 20, y); y += 6; }
        if (note) { doc.text(`Catatan: ${note}`, 20, y); y += 6; }
      }
    });
    if (row.notes) {
      doc.text(`Catatan umum: ${row.notes}`, 20, y);
    }
    doc.save(`detail-acara-${row.id}.pdf`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus detail acara?')) return;
    try {
      await apiDelete(API_ENDPOINTS.DETAIL_ACARA.DELETE(id));
      toast.success('Dihapus');
      fetchList();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  return (
    <>
      <Helmet><title>Detail Acara - Admin</title></Helmet>
      <AdminLayout>
        <div className="mb-6 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Detail Acara</h1>
            <p className="text-gray-600">Dokumen detail acara dengan lokasi maps (generate PDF).</p>
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
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center">Memuat...</td></tr>
              ) : items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">{row.client_name}</td>
                  <td className="px-4 py-3">{row.bride_name} & {row.groom_name}</td>
                  <td className="px-4 py-3">{row.wedding_date ? formatDate(row.wedding_date) : '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button type="button" onClick={() => generatePdf(row)} className="text-green-600" title="PDF"><Download size={18} /></button>
                    <button type="button" onClick={() => openEdit(row)} className="text-primary-600"><Edit size={18} /></button>
                    <button type="button" onClick={() => handleDelete(row.id)} className="text-red-600"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8">
              <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit' : 'Tambah'} Detail Acara</h3>
              <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
                {['client_name', 'client_phone', 'bride_name', 'groom_name', 'wedding_date', 'package_name'].map((field) => (
                  <div key={field} className={field === 'client_address' ? 'sm:col-span-2' : ''}>
                    <label className="text-sm capitalize">{field.replace(/_/g, ' ')}</label>
                    <input
                      type={field === 'wedding_date' ? 'date' : 'text'}
                      value={form[field]}
                      onChange={(e) => setField(field, e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                      required={['client_name', 'bride_name', 'groom_name'].includes(field)}
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="text-sm">Alamat</label>
                  <textarea value={form.client_address} onChange={(e) => setField('client_address', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" rows={2} />
                </div>
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="sm:col-span-2 border-t pt-3">
                    <p className="font-medium text-sm mb-2">Maps {n}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input placeholder="URL Maps" value={form[`map${n}_url`]} onChange={(e) => setField(`map${n}_url`, e.target.value)} className="border rounded-lg px-3 py-2" />
                      <input placeholder="Keterangan" value={form[`map${n}_note`]} onChange={(e) => setField(`map${n}_note`, e.target.value)} className="border rounded-lg px-3 py-2" />
                    </div>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="text-sm">Catatan</label>
                  <textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" rows={2} />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminDetailAcara;
