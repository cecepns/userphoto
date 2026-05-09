import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const ArticleDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/wedding-app/api/articles/${id}`);
      const data = await response.json();
      setArticle(data);
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat artikel...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className=" text-4xl text-gray-800 mb-4">Artikel Tidak Ditemukan</h1>
          <p className="text-gray-600 mb-8">Artikel yang Anda cari tidak ada.</p>
          <Link to="/articles" className="btn-primary">
            Kembali ke Artikel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{article.title} - Chekusphoto</title>
        <meta name="description" content={article.excerpt || article.content.substring(0, 160)} />
      </Helmet>

      <div className="pt-20">
        <article className="section-padding bg-white">
          <div className="container-custom max-w-4xl">
            {/* Breadcrumb */}
            <nav className="mb-8">
              <ol className="flex items-center space-x-2 text-sm text-gray-500">
                <li><Link to="/" className="hover:text-primary-600">Beranda</Link></li>
                <li>•</li>
                <li><Link to="/articles" className="hover:text-primary-600">Artikel</Link></li>
                <li>•</li>
                <li className="text-gray-800">{article.title}</li>
              </ol>
            </nav>

            {/* Article Header */}
            <header className="mb-8 animate-fade-in">
              <h1 className=" text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                {article.title}
              </h1>
              <div className="flex items-center text-gray-500 mb-6">
                <span>{new Date(article.created_at).toLocaleDateString('id-ID', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
                <span className="mx-2">•</span>
                <span>{article.category || 'Tips Pernikahan'}</span>
              </div>
              {article.image && (
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-64 lg:h-96 object-cover rounded-2xl shadow-lg"
                />
              )}
            </header>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none animate-slide-up">
              <div className="text-gray-700 leading-relaxed">
                {article.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Back to Articles */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <Link
                to="/articles"
                className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Artikel
              </Link>
            </div>
          </div>
        </article>
      </div>
    </>
  );
};

export default ArticleDetail;