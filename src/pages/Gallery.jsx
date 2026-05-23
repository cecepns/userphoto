import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

const API_BASE = 'https://api.kingcreativestudio.my.id/chekusphoto';
function imageUrl(value) {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return `${API_BASE}/uploads-weddingsapp/${value}`;
}

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [heroContent, setHeroContent] = useState(null);

  useEffect(() => {
    fetchGalleryData();
    fetchHeroContent();
  }, []);

  const fetchGalleryData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const categoriesResponse = await fetch('https://api.kingcreativestudio.my.id/chekusphoto/api/gallery/categories');
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);
      
      // Fetch images
      const imagesResponse = await fetch('https://api.kingcreativestudio.my.id/chekusphoto/api/gallery/images');
      const imagesData = await imagesResponse.json();
      setImages(imagesData);
    } catch (error) {
      console.error('Error fetching gallery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeroContent = async () => {
    try {
      const response = await fetch('https://api.kingcreativestudio.my.id/chekusphoto/api/content-sections/gallery_hero_section');
      if (response.ok) {
        const data = await response.json();
        setHeroContent(data);
      }
    } catch (error) {
      console.error('Error fetching hero content:', error);
    }
  };

  const filteredImages = activeCategory === 'all' 
    ? images 
    : images.filter(img => img.category_id == activeCategory);

  if (loading) {
    return (
      <div className="pt-20">
        <div className="section-padding gradient-bg">
          <div className="container-custom text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat galeri...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Galeri Pernikahan - Chekusphoto</title>
        <meta name="description" content="Jelajahi galeri pernikahan kami yang menakjubkan menampilkan upacara, resepsi, dan dekorasi yang indah." />
      </Helmet>

      <div className="pt-20">
        {/* Hero Section */}
        {/* <section className="section-padding bg-gray-900 text-white">
          <div className="container-custom text-left">
            <h1 className="text-3xl lg:text-6xl max-w-3xl mx-auto font-bold mb-6 animate-fade-in">
              {heroContent ? heroContent.title : ''}
            </h1>
            <p className="text-xl max-w-3xl mx-auto animate-slide-up">
              {heroContent ? heroContent.description : ''}
            </p>
            {heroContent && heroContent.button_text && (
              <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <a
                  href={heroContent.button_url || '/gallery'}
                  className="btn-primary-outline inline-flex items-center gap-2"
                >
                  {heroContent.button_text}
                </a>
              </div>
            )}
          </div>
        </section> */}

        {/* Category Filter */}
        <section className="py-8 bg-white">
          <div className="container-custom">
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  activeCategory === 'all'
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                }`}
              >
                Semua
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id.toString())}
                  className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                    activeCategory === category.id.toString()
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            {filteredImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="group relative overflow-hidden rounded-2xl shadow-lg card-hover animate-scale-in cursor-pointer"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={imageUrl(image.image_url)}
                      alt={image.title}
                      className="w-full h-64 lg:h-80 object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 text-white">
                        <span className="inline-block px-3 py-1 bg-primary-500 rounded-full text-sm font-medium mb-2">
                          {image.category_name || 'Tanpa Kategori'}
                        </span>
                        <h3 className="text-lg font-semibold">{image.title}</h3>
                        {image.description && (
                          <p className="text-sm text-gray-200 mt-1">{image.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-2xl text-gray-600 mb-4">Belum Ada Gambar</h3>
                <p className="text-gray-500">Galeri akan segera diisi dengan foto-foto pernikahan yang indah.</p>
              </div>
            )}
          </div>
        </section>

        {/* Image Modal */}
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
            <div className="relative max-w-5xl max-h-screen p-4">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={imageUrl(selectedImage.image_url)}
                alt={selectedImage.title}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <div className="absolute bottom-4 left-4 text-white">
                <span className="inline-block px-3 py-1 bg-primary-500 rounded-full text-sm font-medium mb-2">
                  {selectedImage.category_name || 'Tanpa Kategori'}
                </span>
                <h3 className="text-xl font-semibold">{selectedImage.title}</h3>
                {selectedImage.description && (
                  <p className="text-sm text-gray-200 mt-1">{selectedImage.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Gallery;