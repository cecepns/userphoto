import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { imageUrl } from "../utils/imageUrl";

// Helper function to format price in Indonesian Rupiah format
const formatPrice = (price) => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(numPrice)) return "Rp 0";
  return `Rp ${numPrice.toLocaleString("id-ID")}`;
};

const Services = () => {
  const [services, setServices] = useState([]);
  const [heroContent, setHeroContent] = useState(null);

  useEffect(() => {
    fetchServices();
    fetchHeroContent();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch(
        "https://api-inventory.isavralabel.com/wedding-app/api/services"
      );
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const fetchHeroContent = async () => {
    try {
      const response = await fetch(
        "https://api-inventory.isavralabel.com/wedding-app/api/content-sections/services_hero_section"
      );
      if (response.ok) {
        const data = await response.json();
        setHeroContent(data);
      }
    } catch (error) {
      console.error("Error fetching hero content:", error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Dokumentasi Wedding - Chekusphoto</title>
        <meta
          name="description"
          content="Jelajahi paket pernikahan komprehensif kami termasuk perencanaan, dekorasi, fotografi, dan lainnya."
        />
      </Helmet>

      <div className="pt-20">
        {/* Hero Section */}
        <section className="section-padding bg-gray-900 text-white">
          <div className="container-custom text-left">
            <h1 className="text-3xl lg:text-5xl font-bold mb-6 animate-fade-in">
              {heroContent ? heroContent.title : ""}
            </h1>
            <p className="text-xl max-w-3xl mx-auto animate-slide-up whitespace-pre-line">
              {heroContent ? heroContent.description : ""}
            </p>
            {heroContent && heroContent.button_text && (
              <div className="mt-8">
                <Link
                  to={heroContent.button_url || "/contact"}
                  className="btn-primary-outline"
                >
                  {heroContent.button_text}
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Services Grid */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

const ServiceCard = ({ service, index }) => {
  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden card-hover animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="relative">
        <img
          src={
            service.image
              ? imageUrl(service.image)
              : `https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=400`
          }
          alt={service.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute bottom-2 text-xs left-2 px-4 py-1 rounded-full bg-white text-blue-600">
          All Package <b>{formatPrice(service.base_price)}</b>
        </div>
      </div>
      <div className="p-6">
        <h3 className=" text-2xl font-semibold text-gray-800 mb-3">
          {service.name}
        </h3>
        {/* <p className="text-gray-600 mb-4">{service.description}</p> */}

        {/* {items.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2">Paket Termasuk:</h4>
            <ul className="space-y-1">
              {items.slice(0, 3).map((item) => (
                <li
                  key={item.id}
                  className="text-sm text-gray-600 flex justify-between"
                >
                  <span>• {item.name}</span>
                  <span className="font-medium">
                    {formatPrice(item.final_price || item.item_price || 0)}
                  </span>
                </li>
              ))}
              {items.length > 3 && (
                <li className="text-sm text-gray-500">
                  + {items.length - 3} item lainnya
                </li>
              )}
            </ul>
          </div>
        )} */}

        <div className="flex flex-col gap-3">
          {/* <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-500">Mulai dari</span>
              <div className="text-2xl font-bold text-primary-600">
                {formatPrice(service.base_price)}
              </div>
            </div>
          </div> */}
          {/* <button onClick={onBook} className="btn-primary">
            Pesan Sekarang
          </button> */}
          <Link
            to={`/services/${service.id}`}
            className="w-full text-center block btn-primary font-medium"
          >
            Lihat Detail →
          </Link>
        </div>
      </div>
    </div>
  );
};

ServiceCard.propTypes = {
  service: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};

export default Services;
