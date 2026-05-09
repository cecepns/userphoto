import { Link } from 'react-router-dom';
import { useSiteIdentity } from '../hooks/useSiteIdentity';

const Footer = () => {
  const { appName, companyName } = useSiteIdentity();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div>
                <span className=" text-2xl font-bold">{appName}</span>
                <p className="text-sm text-gray-400">{companyName}</p>
              </div>
            </div>
            <p className="text-gray-400">
              Menciptakan momen magis dan kenangan tak terlupakan untuk hari spesial Anda.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/user_wedding_organizer/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-400 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className=" text-lg font-semibold mb-4">Tautan Cepat</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Beranda</Link></li>
              <li><Link to="/services" className="text-gray-400 hover:text-white transition-colors">Layanan</Link></li>
              <li><Link to="/gallery" className="text-gray-400 hover:text-white transition-colors">Galeri</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">Tentang</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className=" text-lg font-semibold mb-4">Layanan</h3>
            <ul className="space-y-2">
              <li><span className="text-gray-400">Perencanaan Pernikahan</span></li>
              <li><span className="text-gray-400">Koordinasi Acara</span></li>
              <li><span className="text-gray-400">Pemilihan Venue</span></li>
              <li><span className="text-gray-400">Dekorasi</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className=" text-lg font-semibold mb-4">Informasi Kontak</h3>
            <div className="space-y-2 text-gray-400">
              <p>Jl. Raya panongan Kec. Panongan Kab. Tangerang</p>
              <p>Provinsi Banten</p>
              <p>Telepon: 089646829459</p>
              <p>Email: edo19priyatno@gmail.com</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; 2025 {companyName}. Semua hak dilindungi.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;