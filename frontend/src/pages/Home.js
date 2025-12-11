import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const destinations = [
    { city: 'București', country: 'România', color: 'from-blue-500 to-blue-600', price: '850' },
    { city: 'Istanbul', country: 'Turcia', color: 'from-purple-500 to-purple-600', price: '1500' },
    { city: 'Paris', country: 'Franța', color: 'from-pink-500 to-pink-600', price: '2500' },
    { city: 'London', country: 'Marea Britanie', color: 'from-indigo-500 to-indigo-600', price: '2800' },
    { city: 'Milano', country: 'Italia', color: 'from-green-500 to-green-600', price: '2200' },
    { city: 'Viena', country: 'Austria', color: 'from-yellow-500 to-yellow-600', price: '1800' },
    { city: 'Praga', country: 'Cehia', color: 'from-red-500 to-red-600', price: '1900' },
    { city: 'Berlin', country: 'Germania', color: 'from-gray-500 to-gray-600', price: '2100' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f0' }}>
      {/* Hero Section with Animated Background Image */}
      <div 
        className="relative overflow-hidden flex items-center justify-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(30, 58, 138, 0.7), rgba(30, 64, 175, 0.7)), url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
          paddingTop: '40px',
          paddingBottom: '40px',
          position: 'relative',
        }}
      >
        {/* Animated cloud overlay */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.3,
            animation: 'cloudMove 30s ease-in-out infinite',
          }}
        ></div>

        {/* Dark overlay for text readability */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 58, 138, 0.5) 100%)',
            zIndex: 1,
          }}
        ></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative w-full" style={{ zIndex: 10 }}>
          <div className="text-center">
            <div className="inline-block mb-4 px-6 py-2.5 rounded-full border-2 border-white" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)' }}>
              <span className="text-white font-bold text-sm md:text-base" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{t('home.searchFlights')}</span>
            </div>
            <h1 
              className="font-black mb-3 leading-tight px-4"
              style={{ 
                color: '#ffffff', 
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                fontSize: 'clamp(2rem, 6vw, 4.5rem)'
              }}
            >
              {t('home.title')}
            </h1>
            <p 
              className="mb-2 font-light px-4"
              style={{ 
                color: 'rgba(255, 255, 255, 0.95)', 
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                fontSize: 'clamp(1rem, 3vw, 2rem)'
              }}
            >
              {t('home.subtitle')}
            </p>
            <p 
              className="mb-6 max-w-3xl mx-auto font-light px-4"
              style={{ 
                color: 'rgba(255, 255, 255, 0.9)', 
                textShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                fontSize: 'clamp(0.875rem, 2vw, 1.25rem)'
              }}
            >
              {t('home.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <button
                    onClick={() => navigate('/flights')}
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
                    className="font-black hover:bg-gray-50 hover:shadow-3xl transform hover:scale-105 hover:-translate-y-1"
                  >
                    {t('home.searchFlights')}
                  </button>
                  {user.is_admin && (
                    <button
                      onClick={() => navigate('/admin')}
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '3px solid rgba(255, 255, 255, 0.9)',
                        color: '#ffffff',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                        padding: '1rem 2.5rem',
                        fontWeight: '900',
                        fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                        borderRadius: '9999px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        display: 'inline-block',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      Админ-панель
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/register')}
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
                    className="font-black hover:bg-gray-50 hover:shadow-3xl transform hover:scale-105 hover:-translate-y-1"
                  >
                    {t('nav.register')}
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '3px solid rgba(255, 255, 255, 0.9)',
                      color: '#ffffff',
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                      padding: '1rem 2.5rem',
                      fontWeight: '900',
                      fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)',
                      borderRadius: '9999px',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      display: 'inline-block',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    {t('nav.login')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Popular Destinations Section */}
      <div className="bg-gradient-to-b from-white via-gray-50 to-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-center mb-4 text-gray-900">
              {t('home.popularDestinations')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Откройте для себя лучшие направления по выгодным ценам
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {destinations.map((dest, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-indigo-200 transform hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative p-8">
                  <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${dest.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2 text-center group-hover:text-indigo-600 transition-colors">
                    {dest.city}
                  </h3>
                  <p className="text-base text-gray-600 mb-6 text-center font-medium">
                    {dest.country}
                  </p>
                  <div className="text-center pt-4 border-t border-gray-100 group-hover:border-indigo-200 transition-colors">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">De la</span>
                    <p className="text-3xl font-black text-gray-900 mt-2 group-hover:text-indigo-600 transition-colors">
                      {dest.price} <span className="text-lg">MDL</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-center mb-4 text-gray-900">
              {t('home.whyUs')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Почему выбирают нас тысячи путешественников
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">{t('home.reason1')}</h3>
              <p className="text-gray-600 text-lg leading-relaxed">{t('home.reason1desc')}</p>
            </div>
            
            <div className="text-center group">
              <div className="w-28 h-28 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 4.08-3.05 7.44-7 7.93v2.02c5.053-.502 9-4.765 9-9.95 0-5.185-3.947-9.448-9-9.95zM11 2v20c-5.053-.502-9-4.765-9-9.95C2 6.765 5.947 2.502 11 2z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-green-600 transition-colors">{t('home.reason2')}</h3>
              <p className="text-gray-600 text-lg leading-relaxed">{t('home.reason2desc')}</p>
            </div>
            
            <div className="text-center group">
              <div className="w-28 h-28 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                  <path d="M12 13c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-1-3h2V6h-2v4z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">{t('home.reason3')}</h3>
              <p className="text-gray-600 text-lg leading-relaxed">{t('home.reason3desc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div 
        className="relative py-20 overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(30, 58, 138, 0.8), rgba(30, 64, 175, 0.8)), url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80)',
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
            opacity: 0.2,
            animation: 'cloudMove 30s ease-in-out infinite',
          }}
        ></div>
        
        {/* Dark overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            zIndex: 1,
          }}
        ></div>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative" style={{ zIndex: 10 }}>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 drop-shadow-lg">
            Gata să zbori?
          </h2>
          <p className="text-xl md:text-2xl text-white/95 mb-10 font-light drop-shadow-md">
            Înregistrează-te acum și rezervă primul tău zbor!
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-12 py-6 bg-white text-indigo-600 font-black text-xl rounded-full hover:bg-gray-50 transition-all shadow-2xl hover:shadow-3xl transform hover:scale-105 hover:-translate-y-1"
          >
            Începe acum
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;

