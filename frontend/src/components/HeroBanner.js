import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function HeroBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBookNow = () => {
    if (user) {
      navigate('/flights');
      window.scrollTo({ top: 600, behavior: 'smooth' });
    } else {
      navigate('/register');
    }
  };

  return (
    <div 
      className="relative overflow-hidden min-h-screen flex items-center"
      style={{
        backgroundImage: 'linear-gradient(rgba(30, 58, 138, 0.75), rgba(30, 64, 175, 0.75)), url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Animated cloud overlay */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.25,
          animation: 'cloudMove 30s ease-in-out infinite',
        }}
      ></div>

      {/* Dark overlay for text readability */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.65) 0%, rgba(30, 58, 138, 0.55) 100%)',
          zIndex: 1,
        }}
      ></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16 w-full" style={{ zIndex: 10 }}>
        <div className="max-w-4xl z-10">
          <div className="mb-4">
            <span className="inline-block px-6 py-2.5 rounded-full border-2 border-white" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)' }}>
              <span className="text-white font-bold text-sm md:text-base" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{t('home.searchFlights')}</span>
            </span>
          </div>
          
          <h1 
            className="font-black mb-4 leading-tight"
            style={{ 
              color: '#ffffff', 
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              fontSize: 'clamp(2rem, 6vw, 4.5rem)'
            }}
          >
            {t('home.title').split(' ').slice(0, -1).join(' ')}
            <span className="block mt-1" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              {t('home.subtitle')}
            </span>
          </h1>
          
          <p 
            className="mb-6 text-white/90 leading-relaxed max-w-2xl font-light"
            style={{ 
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              textShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
            }}
          >
            {t('home.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleBookNow}
              style={{
                backgroundColor: '#ffffff',
                color: '#4f46e5',
                padding: '1rem 2.5rem',
                fontWeight: '900',
                fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                borderRadius: '9999px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.3s ease',
              }}
              className="font-black hover:bg-gray-50 hover:shadow-3xl transform hover:scale-105"
            >
              {t('flights.bookNow')}
            </button>
            <button
              onClick={() => navigate('/flights')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(12px)',
                border: '2px solid rgba(255, 255, 255, 0.9)',
                color: '#ffffff',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                padding: '1rem 2.5rem',
                fontWeight: '700',
                fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                borderRadius: '9999px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.3s ease',
              }}
              className="hover:bg-white/30 hover:shadow-3xl transform hover:scale-105"
            >
              {t('home.searchFlights')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroBanner;
