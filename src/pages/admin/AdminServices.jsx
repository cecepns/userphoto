import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2, Package, Search, Upload } from 'lucide-react';
import Select from 'react-select';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { API_BASE, imageUrl } from '../../utils/imageUrl';

// Utility function for Indonesian Rupiah formatting
const formatRupiah = (amount) => {
  if (!amount && amount !== 0) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [serviceItems, setServiceItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [editingServiceItem, setEditingServiceItem] = useState(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const serviceItemsSectionRef = useRef(null);

  useEffect(() => {
    fetchAvailableItems();
  }, []);

  const fetchServices = async (searchQuery = '') => {
    try {
      const base = 'https://api-inventory.isavralabel.com/wedding-app/api/services';
      const url = searchQuery.trim()
        ? `${base}?q=${encodeURIComponent(searchQuery.trim())}`
        : base;
      const response = await fetch(url);
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  // Debounced search by API: initial load + when search query changes
  useEffect(() => {
    const delay = serviceSearchQuery.trim() ? 400 : 0;
    const t = setTimeout(() => {
      fetchServices(serviceSearchQuery);
    }, delay);
    return () => clearTimeout(t);
  }, [serviceSearchQuery]);

  const fetchAvailableItems = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/wedding-app/api/items');
      const data = await response.json();
      setAvailableItems(data);
    } catch (error) {
      console.error('Error fetching available items:', error);
    }
  };

  const fetchServiceItems = async (serviceId) => {
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/wedding-app/api/services/${serviceId}/items`);
      const data = await response.json();
      setServiceItems(data);
    } catch (error) {
      console.error('Error fetching service items:', error);
    }
  };

  useEffect(() => {
    if (selectedService && serviceItemsSectionRef.current) {
      serviceItemsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedService]);

  const handleServiceSubmit = async (serviceData) => {
    try {
      const url = serviceData.id 
        ? `https://api-inventory.isavralabel.com/wedding-app/api/services/${serviceData.id}`
        : 'https://api-inventory.isavralabel.com/wedding-app/api/services';
      
      const method = serviceData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(serviceData),
      });

      if (response.ok) {
        fetchServices(serviceSearchQuery);
        setShowServiceModal(false);
        toast.success('Layanan berhasil disimpan!');
      } else {
        toast.error('Error menyimpan layanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menyimpan layanan');
    }
  };

  const handleDeleteService = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus layanan ini?</span>
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
      ), {
        duration: Infinity,
        position: 'top-center',
      });
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/wedding-app/api/services/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchServices(serviceSearchQuery);
        toast.success('Layanan berhasil dihapus!');
      } else {
        toast.error('Error menghapus layanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus layanan');
    }
  };

  const handleAddItemToService = async (itemData) => {
    try {
      const url = `https://api-inventory.isavralabel.com/wedding-app/api/services/${selectedService.id}/items`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        fetchServiceItems(selectedService.id);
        setShowItemModal(false);
        toast.success('Item berhasil ditambahkan ke layanan!');
      } else {
        const errorData = await response.json();
        toast.error(`Error menambahkan item: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menambahkan item');
    }
  };

  const handleUpdateServiceItem = async (itemData) => {
    try {
      const url = `https://api-inventory.isavralabel.com/wedding-app/api/service-items/${editingServiceItem.id}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        fetchServiceItems(selectedService.id);
        setShowItemModal(false);
        setEditingServiceItem(null);
        toast.success('Item layanan berhasil diperbarui!');
      } else {
        toast.error('Error memperbarui item layanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error memperbarui item layanan');
    }
  };

  const handleDeleteServiceItem = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus item ini dari layanan?</span>
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
      ), {
        duration: Infinity,
        position: 'top-center',
      });
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/wedding-app/api/service-items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchServiceItems(selectedService.id);
        toast.success('Item berhasil dihapus dari layanan!');
      } else {
        toast.error('Error menghapus item dari layanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus item dari layanan');
    }
  };

  return (
    <>
      <Helmet>
        <title>Kelola Layanan - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Kelola Layanan</h1>
              <p className="text-gray-600">Buat dan kelola layanan pernikahan Anda beserta item-itemnya.</p>
            </div>
            <button
              onClick={() => setShowServiceModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Tambah Layanan Baru
            </button>
          </div>
        </div>

        {/* Search nama makeup / paket */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={serviceSearchQuery}
              onChange={(e) => setServiceSearchQuery(e.target.value)}
              placeholder="Cari nama makeup / nama paket..."
              className={`w-full pl-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${serviceSearchQuery ? 'pr-9' : 'pr-4'}`}
            />
            {serviceSearchQuery && (
              <button
                type="button"
                onClick={() => setServiceSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded"
                aria-label="Hapus pencarian"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Nama Layanan</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Harga Dasar</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Item</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white/95 w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {services.map((service, idx) => (
                  <tr
                    key={service.id}
                    className={`transition-colors duration-150 hover:bg-[#2f4274]/[0.04] ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {service.image && (
                          <img
                            src={imageUrl(service.image)}
                            alt={service.name}
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        )}
                        <div className="text-sm font-semibold text-gray-900">{service.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-[#2f4274]">{formatRupiah(service.base_price)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => { setSelectedService(service); fetchServiceItems(service.id); }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2f4274]/10 text-[#2f4274] hover:bg-[#2f4274]/20 text-sm font-medium transition-colors"
                      >
                        <Package size={16} />
                        Kelola Item
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedService(service); setShowServiceModal(true); }}
                          className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Service Items Preview */}
        {selectedService && (
          <div ref={serviceItemsSectionRef} className="mt-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 scroll-mt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-lg text-gray-800">
                Item Layanan: {selectedService.name}
              </h4>
              <button
                onClick={() => setShowItemModal(true)}
                className="bg-secondary-500 text-white px-4 py-2 rounded-lg hover:bg-secondary-600 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Tambah Item
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-gradient-to-r from-[#2f4274] to-[#3d5285] text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/95 w-12">No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Nama Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Kategori</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/95">Harga</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/95 w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {serviceItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`transition-colors duration-150 hover:bg-[#2f4274]/[0.04] ${index % 2 === 1 ? "bg-gray-50/50" : ""}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-sm font-medium">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.is_required ? (
                          <span className="inline-flex px-2.5 py-1 rounded-lg bg-red-100 text-red-800 text-xs font-semibold">Wajib</span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-medium">Opsional</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-[#2f4274]">{formatRupiah(item.final_price)}</div>
                        {item.custom_price && (
                          <div className="text-xs text-gray-500">Asli: {formatRupiah(item.item_price)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditingServiceItem(item); setShowItemModal(true); }}
                            className="p-2 rounded-lg text-[#2f4274] bg-[#2f4274]/10 hover:bg-[#2f4274]/20 transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteServiceItem(item.id)}
                            className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Service Modal */}
        {showServiceModal && (
          <ServiceModal
            service={selectedService}
            onSubmit={handleServiceSubmit}
            onClose={() => {
              setShowServiceModal(false);
              setSelectedService(null);
            }}
          />
        )}

        {/* Item Modal */}
        {showItemModal && (
          <ServiceItemModal
            serviceItem={editingServiceItem}
            availableItems={availableItems}
            existingItemIds={serviceItems
              .filter((si) => !editingServiceItem || si.item_id != editingServiceItem.item_id)
              .map((si) => si.item_id)}
            onSubmit={editingServiceItem ? handleUpdateServiceItem : handleAddItemToService}
            onClose={() => {
              setShowItemModal(false);
              setEditingServiceItem(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
};

const ServiceModal = ({ service, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    base_price: service?.base_price || '',
    image: service?.image || ''
  });
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|png|gif|webp)/.test(file.type)) {
      toast.error('Hanya file gambar (JPEG, PNG, GIF, WebP) yang diizinkan.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
        body: fd,
      });
      const data = await response.json();
      if (data.filename) {
        setFormData((prev) => ({ ...prev, image: data.filename }));
        toast.success('Gambar berhasil diunggah.');
      } else {
        toast.error(data.message || 'Upload gagal');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload gagal');
    }
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: service?.id,
      base_price: parseFloat(formData.base_price)
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {service ? 'Edit Layanan' : 'Tambah Layanan Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Layanan</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Harga Dasar (Rp)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({...formData, base_price: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Layanan</label>
                {formData.image && (
                  <div className="mb-2">
                    <img
                      src={imageUrl(formData.image)}
                      alt="Preview"
                      className="h-20 w-auto rounded-lg border border-gray-200 object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-[#2f4274]/10 text-[#2f4274] rounded-lg hover:bg-[#2f4274]/20 text-sm font-medium"
                >
                  <Upload size={16} />
                  Upload Gambar
                </button>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {service ? 'Perbarui Layanan' : 'Buat Layanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
};

const ServiceItemModal = ({ serviceItem, availableItems, existingItemIds = [], onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    item_id: serviceItem?.item_id || '',
    custom_price: serviceItem?.custom_price || '',
    is_required: serviceItem?.is_required || false,
    sort_order: serviceItem?.sort_order || 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.item_id) {
      toast.error('Pilih item terlebih dahulu');
      return;
    }
    onSubmit({
      ...formData,
      custom_price: formData.custom_price ? parseFloat(formData.custom_price) : null
    });
  };

  const selectedItem = availableItems.find(item => item.id == formData.item_id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {serviceItem ? 'Edit Item Layanan' : 'Tambah Item ke Layanan'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Item</label>
                <Select
                  placeholder="Pilih item..."
                  value={formData.item_id
                    ? (() => {
                        const idx = availableItems.findIndex((i) => i.id == formData.item_id);
                        const item = availableItems[idx];
                        if (!item) return null;
                        return {
                          value: item.id,
                          label: `${idx + 1}. ${item.name} - ${formatRupiah(item.price)}`,
                        };
                      })()
                    : null}
                  onChange={(option) =>
                    setFormData({
                      ...formData,
                      item_id: option?.value ?? '',
                      sort_order: option?.sortOrder ?? 0,
                    })
                  }
                  options={availableItems.map((item, index) => ({
                    value: item.id,
                    label: `${index + 1}. ${item.name} - ${formatRupiah(item.price)}`,
                    sortOrder: index + 1,
                  }))}
                  isOptionDisabled={(option) => existingItemIds.some((id) => id == option.value)}
                  isClearable
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: 48,
                      borderRadius: '0.5rem',
                      borderColor: '#d1d5db',
                    }),
                    menu: (base) => ({ ...base, zIndex: 50 }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isDisabled ? '#fef2f2' : state.isFocused ? '#f3f4f6' : base.backgroundColor,
                      color: state.isDisabled ? '#9ca3af' : base.color,
                      cursor: state.isDisabled ? 'not-allowed' : 'default',
                    }),
                  }}
                />
              </div>

              {selectedItem && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">{selectedItem.name}</h4>
                  <p className="text-gray-600 text-sm mb-2">{selectedItem.description}</p>
                  <p className="text-sm text-gray-500">Kategori: {selectedItem.category}</p>
                  <p className="text-sm text-gray-500">Harga: {formatRupiah(selectedItem.price)}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Harga Kustom (Opsional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.custom_price}
                  onChange={(e) => setFormData({...formData, custom_price: e.target.value})}
                  placeholder="Biarkan kosong untuk menggunakan harga default"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jika diisi, akan menggantikan harga default item
                </p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({...formData, is_required: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Item Wajib</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Item wajib akan otomatis dipilih saat customer memilih layanan ini
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Urutan</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {serviceItem ? 'Perbarui Item' : 'Tambah Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminServices;