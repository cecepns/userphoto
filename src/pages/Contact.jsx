import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useSiteIdentity } from '../hooks/useSiteIdentity';

const Contact = () => {
  const { appName, contact } = useSiteIdentity();
  const [heroContent, setHeroContent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadHero = async () => {
      try {
        const response = await fetch(
          'https://api.kingcreativestudio.my.id/user-photo/api/content-sections/contact_hero_section'
        );
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setHeroContent(data);
      } catch (error) {
        console.error('Error fetching contact hero:', error);
      }
    };
    loadHero();
    return () => {
      cancelled = true;
    };
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    instagram: '',
    consultation_date: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://api.kingcreativestudio.my.id/user-photo/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Pesan berhasil dikirim! Kami akan menghubungi Anda segera.');
        setFormData({ name: '', email: '', phone: '', address: '', instagram: '', consultation_date: '', message: '' });
      } else {
        toast.error('Error mengirim pesan. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error mengirim pesan. Silakan coba lagi.');
    }
  };

  return (
    <>
      <Helmet>
        <title>{`Hubungi Kami - ${appName}`}</title>
        <meta
          name="description"
          content={`Hubungi ${appName} untuk kebutuhan perencanaan pernikahan Anda. Booking konsultasi hari ini.`}
        />
      </Helmet>

      <div className="pt-20">
        <section className="section-padding bg-gray-900 text-white">
          <div className="container-custom text-left">
            <h1 className="text-3xl md:text-5xl max-w-3xl mx-auto lg:text-6xl font-bold mb-6 animate-fade-in">
              {heroContent?.title?.trim() || 'Hubungi Kami'}
            </h1>
            <p className="text-xl max-w-3xl mx-auto animate-slide-up">
              {heroContent?.description?.trim() ||
                `Siap merencanakan pernikahan impian Anda? Hubungi ${appName} untuk konsultasi.`}
            </p>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="animate-slide-up">
                <h2 className=" text-3xl font-bold text-gray-800 mb-6">
                  Kirim Pesan kepada Kami
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Telepon</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Masukkan alamat lengkap Anda..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                    <input
                      type="text"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleInputChange}
                      placeholder="@username atau username Instagram"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Konsultasi</label>
                    <input
                      type="date"
                      name="consultation_date"
                      value={formData.consultation_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pesan</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      placeholder="Ceritakan tentang pernikahan impian Anda..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    ></textarea>
                  </div>
                  
                  <button type="submit" className="w-full btn-primary">
                    Kirim Pesan
                  </button>
                </form>
              </div>

              {/* Contact Info */}
              <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <h2 className=" text-3xl font-bold text-gray-800 mb-6">
                  Hubungi Kami
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">Alamat</h3>
                      <p className="text-gray-600">
                        {contact.addressLine1 || contact.addressLine2 ? (
                          <>
                            {contact.addressLine1}
                            {contact.addressLine1 && contact.addressLine2 ? <br /> : null}
                            {contact.addressLine2}
                          </>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">Telepon</h3>
                      <p className="text-gray-600">
                        {contact.phone ? (
                          <a
                            href={`tel:${String(contact.phone).replace(/\s/g, '')}`}
                            className="text-primary-600 hover:underline"
                          >
                            {contact.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">Email</h3>
                      <p className="text-gray-600">
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="text-primary-600 hover:underline">
                            {contact.email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                  </div>

                  {contact.instagramUrl ? (
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-1">Instagram</h3>
                        <p className="text-gray-600">
                          <a
                            href={contact.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline"
                          >
                            Buka Instagram
                          </a>
                        </p>
                      </div>
                    </div>
                  ) : null}
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">Jam Kerja</h3>
                      <p className="text-gray-600 whitespace-pre-line">{contact.businessHours}</p>
                    </div>
                  </div>
                </div>

                {contact.mapsEmbedUrl ? (
                  <div className="mt-8">
                    <iframe
                      title="Peta lokasi"
                      src={contact.mapsEmbedUrl}
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="rounded-lg"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Contact;