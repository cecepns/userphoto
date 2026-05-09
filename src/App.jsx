import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import CustomService from './pages/CustomService';
import Gallery from './pages/Gallery';
import About from './pages/About';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import Contact from './pages/Contact';
import MyOrder from './pages/MyOrder';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminItems from './pages/admin/AdminItems';
import AdminServices from './pages/admin/AdminServices';
import AdminPayments from './pages/admin/AdminPayments';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrdersHistory from './pages/admin/AdminOrdersHistory';
import AdminSuratJalan from './pages/admin/AdminSuratJalan';
import AdminAlbumProgress from './pages/admin/AdminAlbumProgress';
import AdminGallery from './pages/admin/AdminGallery';
import AdminArticles from './pages/admin/AdminArticles';
import AdminContactMessages from './pages/admin/AdminContactMessages';
import AdminContent from './pages/admin/AdminContent';
import AdminServiceCards from './pages/admin/AdminServiceCards';
import AdminServiceFeatures from './pages/admin/AdminServiceFeatures';
import AdminVendorCalendar from './pages/admin/AdminVendorCalendar';
import AdminFreelanceCalendar from './pages/admin/AdminFreelanceCalendar';
import AdminChangePassword from './pages/admin/AdminChangePassword';
import ProtectedRoute from './components/ProtectedRoute';
import SiteIdentitySync from './components/SiteIdentitySync';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <SiteIdentitySync />
        <ScrollToTop />
        <div className="min-h-screen flex flex-col">
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/items" element={
              <ProtectedRoute>
                <AdminItems />
              </ProtectedRoute>
            } />
            <Route path="/admin/services" element={
              <ProtectedRoute>
                <AdminServices />
              </ProtectedRoute>
            } />
            <Route path="/admin/payments" element={
              <ProtectedRoute>
                <AdminPayments />
              </ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute>
                <AdminOrders />
              </ProtectedRoute>
            } />
            <Route path="/admin/orders-history" element={
              <ProtectedRoute>
                <AdminOrdersHistory />
              </ProtectedRoute>
            } />
            <Route path="/admin/surat-jalan" element={
              <ProtectedRoute>
                <AdminSuratJalan />
              </ProtectedRoute>
            } />
            <Route path="/admin/album-progress" element={
              <ProtectedRoute>
                <AdminAlbumProgress />
              </ProtectedRoute>
            } />
            <Route path="/admin/articles" element={
              <ProtectedRoute>
                <AdminArticles />
              </ProtectedRoute>
            } />
            <Route path="/admin/gallery" element={
              <ProtectedRoute>
                <AdminGallery />
              </ProtectedRoute>
            } />
            <Route path="/admin/contact-messages" element={
              <ProtectedRoute>
                <AdminContactMessages />
              </ProtectedRoute>
            } />
            <Route path="/admin/content" element={
              <ProtectedRoute>
                <AdminContent />
              </ProtectedRoute>
            } />
            <Route path="/admin/service-cards" element={
              <ProtectedRoute>
                <AdminServiceCards />
              </ProtectedRoute>
            } />
            <Route path="/admin/service-features" element={
              <ProtectedRoute>
                <AdminServiceFeatures />
              </ProtectedRoute>
            } />
            <Route path="/admin/vendor-calendar" element={
              <ProtectedRoute>
                <AdminVendorCalendar />
              </ProtectedRoute>
            } />
            <Route path="/admin/freelance-calendar" element={
              <ProtectedRoute>
                <AdminFreelanceCalendar />
              </ProtectedRoute>
            } />
            <Route path="/admin/change-password" element={
              <ProtectedRoute>
                <AdminChangePassword />
              </ProtectedRoute>
            } />

            
            {/* Public Routes */}
            <Route path="/*" element={
              <>
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/services/:id" element={<ServiceDetail />} />
                    <Route path="/custom-service" element={<CustomService />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/articles" element={<Articles />} />
                    <Route path="/articles/:id" element={<ArticleDetail />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/pesanan-saya" element={<MyOrder />} />
                  </Routes>
                </main>
                <Footer />
                <WhatsAppButton />
              </>
            } />
          </Routes>
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </Router>
    </HelmetProvider>
  );
}

export default App;