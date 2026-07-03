import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const Articles = () => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('https://api.kingcreativestudio.my.id/user-photo/api/articles');
      const data = await response.json();
      setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Artikel & Tips Pernikahan - Chekusphoto</title>
        <meta name="description" content="Baca tips perencanaan pernikahan terbaru, tren, dan artikel inspirasi kami." />
      </Helmet>

      <div className="pt-20">
        {/* Hero Section */}
        <section className="section-padding gradient-bg">
          <div className="container-custom text-center">
            <h1 className=" text-3xl lg:text-6xl font-bold text-gray-800 mb-6 animate-fade-in">
              Artikel Pernikahan
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-slide-up">
              Temukan tips perencanaan pernikahan, tren terbaru, dan inspirasi untuk hari sempurna Anda.
            </p>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article, index) => (
                <article
                  key={article.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden card-hover animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <img
                    src={article.image || "https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=400"}
                    alt={article.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <span>{new Date(article.created_at).toLocaleDateString()}</span>
                      <span className="mx-2">•</span>
                      <span>{article.category || 'Tips Pernikahan'}</span>
                    </div>
                    <h2 className=" text-xl font-semibold text-gray-800 mb-3">
                      {article.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {article.excerpt || article.content.substring(0, 150) + '...'}
                    </p>
                    <Link
                      to={`/articles/${article.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Baca Selengkapnya →
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {articles.length === 0 && (
              <div className="text-center py-16">
                <h3 className=" text-2xl text-gray-600 mb-4">Tidak Ada Artikel Tersedia</h3>
                <p className="text-gray-500">Kembali lagi nanti untuk tips dan inspirasi pernikahan!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default Articles;