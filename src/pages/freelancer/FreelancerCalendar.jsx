import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, X, Calendar, Download, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import FreelancerLayout from '../../components/FreelancerLayout';
import { formatDate } from '../../utils/formatters';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { freelancerGet } from '../../utils/request';
import {
  colorForPhotographer,
  dutyDateLabel,
  getCalendarDays,
} from '../../utils/freelanceCalendar';

const FreelancerCalendar = () => {
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(null);

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth() + 1;

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await freelancerGet(
        `${API_ENDPOINTS.FREELANCE_CALENDAR}?year=${year}&month=${month}`,
      );
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    } catch (e) {
      toast.error(e.message || 'Gagal memuat jadwal');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const eventsByDate = useMemo(
    () =>
      assignments.reduce((acc, row) => {
        const key = dutyDateLabel(row.duty_date);
        if (!key) return acc;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      }, {}),
    [assignments],
  );

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
      const data = await freelancerGet(`/api/detail-acara/${detailAcaraId}`);
      if (!data) {
        toast.error("Gagal memuat detail acara");
        return;
      }
      
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("DETAIL ACARA", 105, 20, { align: "center" });

      // Company Name
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Chekusphoto", 20, 32);

      // Divider Line
      doc.setLineWidth(0.5);
      doc.line(20, 36, 190, 36);

      // Client Info Header
      let y = 46;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Data Client:", 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      doc.text(`Nama Client: ${data.client_name || '-'}`, 20, y);
      y += 6;
      doc.text(`Telepon: ${data.client_phone || '-'}`, 20, y);
      y += 6;
      doc.text(`Pasangan: ${data.bride_name || '-'} & ${data.groom_name || '-'}`, 20, y);
      y += 6;
      doc.text(`Tanggal Acara: ${data.wedding_date ? formatDate(data.wedding_date) : '-'}`, 20, y);
      y += 6;
      doc.text(`Paket: ${data.package_name || '-'}`, 20, y);
      y += 8;

      const addressLines = data.client_address
        ? doc.splitTextToSize(`Alamat: ${data.client_address}`, 170)
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

      const maps = Array.isArray(data.maps) && data.maps.length ? data.maps : [
        { url: data.map1_url || '', note: data.map1_note || '' },
        { url: data.map2_url || '', note: data.map2_note || '' },
        { url: data.map3_url || '', note: data.map3_note || '' },
        { url: data.map4_url || '', note: data.map4_note || '' },
      ].filter((m) => m.url || m.note);

      maps.forEach((m, index) => {
        if (!m.url && !m.note) return;
        if (y > 270) {
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
        }
        if (m.note) { 
          const noteLines = doc.splitTextToSize(`Catatan: ${m.note}`, 170);
          doc.text(noteLines, 20, y); 
          y += noteLines.length * 5; 
        }
        y += 2;
      });

      if (data.notes) {
        y += 4;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text("Catatan Umum:", 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(data.notes, 170);
        doc.text(notesLines, 20, y);
        y += notesLines.length * 5;
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
        const data = await freelancerGet(`/api/detail-acara/${detailAcaraId}`);
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
      freelancerGet(`/api/detail-acara/${detailAcaraId}`).then((data) => {
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



  const days = getCalendarDays(calendarMonth);
  const selectedDayEvents = selectedDateKey ? eventsByDate[selectedDateKey] || [] : [];
  const freelancerName = localStorage.getItem('freelancer_name') || 'Anda';

  return (
    <>
      <Helmet>
        <title>Kalender Penugasan Saya</title>
      </Helmet>
      <FreelancerLayout>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Kalender Penugasan</h1>
          <p className="text-gray-600">
            Jadwal tugas untuk <span className="font-medium text-gray-800">{freelancerName}</span> — hanya penugasan yang ditetapkan kepada Anda.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Calendar size={20} /> Kalender
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
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
                >
                  <ChevronRight size={18} />
                </button>
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
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
                              ? 'border-primary-200 bg-primary-50/40 hover:bg-primary-50'
                              : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-semibold text-gray-700">{d.getDate()}</span>
                        {list.length > 0 && (
                          <span className="mt-1 block text-[10px] font-medium text-primary-700">
                            {list.length} tugas
                          </span>
                        )}
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
                <button type="button" onClick={() => setSelectedDateKey(null)} className="text-gray-500 p-1">
                  <X size={18} />
                </button>
              )}
            </div>
            {!selectedDateKey ? (
              <p className="text-sm text-gray-500">Klik tanggal di kalender untuk melihat penugasan Anda.</p>
            ) : selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-500">Tidak ada penugasan di {formatDate(selectedDateKey)}.</p>
            ) : (
              <ul className="space-y-3 max-h-[420px] overflow-y-auto">
                {selectedDayEvents.map((ev) => (
                  <li key={ev.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                    <p className="font-medium text-gray-900">
                      {ev.client_name || '-'} · #
                      {ev.order_source === 'custom_request' ? `C${ev.order_id}` : ev.order_id}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{ev.client_phone}</p>
                    {ev.service_label ? (
                      <p className="text-xs text-gray-600 mt-1">{ev.service_label}</p>
                    ) : null}
                    {ev.notes ? (
                      <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap border-t pt-2">{ev.notes}</p>
                    ) : null}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2 items-center justify-between">
                      {ev.detail_acara_id ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(ev.detail_acara_id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Download size={13} /> Unduh PDF Acara
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyTextFromId(ev.detail_acara_id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Copy size={13} /> Salin Detail (WA)
                          </button>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full">
                          📌 Tanda Penugasan (Detail belum diisi)
                        </span>
                      )}
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
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-2">Tanggal</th>
                  <th className="py-2 pr-2">Klien / Pesanan</th>
                  <th className="py-2 pr-2">Catatan</th>
                  <th className="py-2 pr-2 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      Belum ada penugasan untuk Anda bulan ini
                    </td>
                  </tr>
                ) : (
                  assignments.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2 whitespace-nowrap">{formatDate(row.duty_date)}</td>
                      <td className="py-2 pr-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-semibold mr-2 ${colorForPhotographer(row.photographer_name)}`}
                        >
                          {row.photographer_name}
                        </span>
                        {row.client_name || '-'} · #
                        {row.order_source === 'custom_request' ? `C${row.order_id}` : row.order_id}
                      </td>
                      <td className="py-2 pr-2 text-gray-600">{row.notes || '-'}</td>
                      <td className="py-2 pr-2">
                        {row.detail_acara_id ? (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(row.detail_acara_id)}
                              className="p-1.5 rounded text-green-600 bg-green-50 hover:bg-green-100"
                              title="Unduh PDF Acara"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyTextFromId(row.detail_acara_id)}
                              className="p-1.5 rounded text-blue-600 bg-blue-50 hover:bg-blue-100"
                              title="Salin Detail (WA)"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium italic">Belum diisi</span>
                        )}
                      </td>
                    </tr>

                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FreelancerLayout>
    </>
  );
};

export default FreelancerCalendar;
