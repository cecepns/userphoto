import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

const About = () => {
  const [heroContent, setHeroContent] = useState(null);
  const [missionContent, setMissionContent] = useState(null);
  const [ctaContent, setCtaContent] = useState(null);
  const [aboutCards, setAboutCards] = useState([]);

  useEffect(() => {
    fetchAboutContent();
    fetchAboutCards();
  }, []);

  const fetchAboutContent = async () => {
    try {
      // Fetch hero section content
      const heroResponse = await fetch('https://api.kingcreativestudio.my.id/user-photo/api/content-sections/about_hero_section');
      if (heroResponse.ok) {
        const heroData = await heroResponse.json();
        setHeroContent(heroData);
      }

      // Fetch mission section content
      const missionResponse = await fetch('https://api.kingcreativestudio.my.id/user-photo/api/content-sections/about_mission_section');
      if (missionResponse.ok) {
        const missionData = await missionResponse.json();
        setMissionContent(missionData);
      }

      // Fetch CTA section content
      const ctaResponse = await fetch('https://api.kingcreativestudio.my.id/user-photo/api/content-sections/about_cta_section');
      if (ctaResponse.ok) {
        const ctaData = await ctaResponse.json();
        setCtaContent(ctaData);
      }
    } catch (error) {
      console.error('Error fetching about content:', error);
    }
  };

  const fetchAboutCards = async () => {
    try {
      const response = await fetch('https://api.kingcreativestudio.my.id/user-photo/api/service-cards?card_type=about');
      if (response.ok) {
        const data = await response.json();
        setAboutCards(data);
      }
    } catch (error) {
      console.error('Error fetching about cards:', error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Tentang Kami - Chekusphoto</title>
        <meta name="description" content="Pelajari tentang tim Chekusphoto dan misi kami untuk menciptakan perayaan pernikahan yang sempurna." />
      </Helmet>

      <div className="pt-20">
        {/* Hero Section */}
        <section className="section-padding bg-gray-900 text-white">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="animate-fade-in">
                <h1 className=" text-3xl lg:text-6xl font-bold  mb-6">
                  {heroContent ? heroContent.title : ''}
                </h1>
                <p className="text-xl  mb-8 leading-relaxed">
                  {heroContent ? heroContent.description : ''}
                </p>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">100+</div>
                    <div>Pernikahan Direncanakan</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">5+</div>
                    <div>Tahun Pengalaman</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">98%</div>
                    <div>Pasangan Bahagia</div>
                  </div>
                </div>
              </div>
              <div className="animate-slide-up">
                <img
                  src={heroContent ? heroContent.image_url : "https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800"}
                  alt="Tim perencanaan pernikahan"
                  className="w-full h-96 object-cover rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className=" text-4xl lg:text-5xl font-bold text-gray-800 mb-6 animate-fade-in">
                {missionContent ? missionContent.title : 'Misi Kami'}
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto animate-slide-up">
                {missionContent ? missionContent.description : 'Menciptakan pengalaman pernikahan luar biasa yang melampaui ekspektasi dan menciptakan kenangan abadi. Kami percaya setiap pasangan layak mendapat perayaan yang unik seperti kisah cinta mereka.'}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {aboutCards.length > 0 ? (
                aboutCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="text-center p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white shadow-lg card-hover animate-slide-up"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <div className="text-6xl mb-6">{card.icon}</div>
                    <h3 className=" text-2xl font-semibold text-gray-800 mb-4">
                      {card.title}
                    </h3>
                    <p className="text-gray-600">{card.description}</p>
                  </div>
                ))
              ) : (
                // Fallback cards if no data from API
                [
                  // {
                  //   title: "Layanan Personal",
                  //   description: "Setiap pernikahan unik, dan kami menyesuaikan layanan kami dengan visi dan preferensi Anda.",
                  //   icon: "💖"
                  // },
                  // {
                  //   title: "Perhatian pada Detail",
                  //   description: "Dari dekorasi terkecil hingga gestur terbesar, kami memastikan kesempurnaan dalam setiap elemen.",
                  //   icon: "✨"
                  // },
                  // {
                  //   title: "Perencanaan Bebas Stres",
                  //   description: "Kami menangani semua logistik sehingga Anda bisa fokus menikmati masa tunangan dan hari spesial.",
                  //   icon: "🎯"
                  // }
                ].map((value, index) => (
                  <div
                    key={index}
                    className="text-center p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white shadow-lg card-hover animate-slide-up"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <div className="text-6xl mb-6">{value.icon}</div>
                    <h3 className=" text-2xl font-semibold text-gray-800 mb-4">
                      {value.title}
                    </h3>
                    <p className="text-gray-600">{value.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-padding bg-gray-900 text-white">
          <div className="container-custom text-center">
            <h2 className="  text-3xl lg:text-5xl font-bold mb-6 animate-fade-in">
              {ctaContent ? ctaContent.title : 'Siap Mulai Merencanakan?'}
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto animate-slide-up">
              {ctaContent ? ctaContent.description : 'Mari ciptakan pernikahan impian Anda bersama. Hubungi kami untuk konsultasi gratis.'}
            </p>
            <a
              href={ctaContent ? ctaContent.button_url : "/contact"}
              className="inline-block bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105"
            >
              {ctaContent ? ctaContent.button_text : 'Mulai Hari Ini'}
            </a>
          </div>
        </section>
      </div>
    </>
  );
};

export default About;