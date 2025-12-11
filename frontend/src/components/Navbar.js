import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState('statistics');

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (location.hash) {
      const tab = location.hash.substring(1);
      if (['statistics', 'airlines', 'flights', 'clients', 'bookings'].includes(tab)) {
        setActiveAdminTab(tab);
      }
    }
  }, [location.hash]);

  const handleAdminTabClick = (tab) => {
    setActiveAdminTab(tab);
    window.location.hash = tab;
    if (location.pathname !== '/admin') {
      navigate(`/admin#${tab}`);
    } else {
      // Trigger event for AdminPanel to update
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-white/95 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/flights" className="flex items-center space-x-3 group">
            <div className="bg-black text-white p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
            <span className="text-2xl font-black text-black tracking-tight">
              Airline
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {/* Language Switcher */}
            <div className="flex items-center space-x-2 mr-4 px-3 py-2 rounded-full bg-gray-100">
              <button
                onClick={() => changeLanguage('ru')}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  i18n.language === 'ru' ? 'bg-black text-white' : 'text-gray-700 hover:text-black'
                }`}
                title="Русский"
              >
                RU
              </button>
              <button
                onClick={() => changeLanguage('ro')}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  i18n.language === 'ro' ? 'bg-black text-white' : 'text-gray-700 hover:text-black'
                }`}
                title="Română"
              >
                RO
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  i18n.language === 'en' ? 'bg-black text-white' : 'text-gray-700 hover:text-black'
                }`}
                title="English"
              >
                EN
              </button>
            </div>

            {user ? (
              <>
                {user.is_admin ? (
                  <>
                    <button
                      onClick={() => handleAdminTabClick('statistics')}
                      className={`px-4 py-2.5 font-semibold transition-all duration-200 rounded-full text-sm ${
                        activeAdminTab === 'statistics'
                          ? 'bg-black text-white shadow-lg'
                          : 'text-gray-700 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      {t('admin.statistics')}
                    </button>
                    <button
                      onClick={() => handleAdminTabClick('airlines')}
                      className={`px-4 py-2.5 font-semibold transition-all duration-200 rounded-full text-sm ${
                        activeAdminTab === 'airlines'
                          ? 'bg-black text-white shadow-lg'
                          : 'text-gray-700 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      {t('admin.airlines')}
                    </button>
                    <button
                      onClick={() => handleAdminTabClick('flights')}
                      className={`px-4 py-2.5 font-semibold transition-all duration-200 rounded-full text-sm ${
                        activeAdminTab === 'flights'
                          ? 'bg-black text-white shadow-lg'
                          : 'text-gray-700 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      {t('admin.flights')}
                    </button>
                    <button
                      onClick={() => handleAdminTabClick('clients')}
                      className={`px-4 py-2.5 font-semibold transition-all duration-200 rounded-full text-sm ${
                        activeAdminTab === 'clients'
                          ? 'bg-black text-white shadow-lg'
                          : 'text-gray-700 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      {t('admin.clients')}
                    </button>
                    <button
                      onClick={() => handleAdminTabClick('bookings')}
                      className={`px-4 py-2.5 font-semibold transition-all duration-200 rounded-full text-sm ${
                        activeAdminTab === 'bookings'
                          ? 'bg-black text-white shadow-lg'
                          : 'text-gray-700 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      {t('admin.bookings')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/flights"
                      className="px-6 py-2.5 text-gray-700 hover:text-black font-semibold transition-colors duration-200 rounded-full hover:bg-gray-50"
                    >
                      {t('nav.flights')}
                    </Link>
                    <Link
                      to="/bookings"
                      className="px-6 py-2.5 text-gray-700 hover:text-black font-semibold transition-colors duration-200 rounded-full hover:bg-gray-50"
                    >
                      {t('nav.bookings')}
                    </Link>
                    <Link
                      to="/baggage"
                      className="px-6 py-2.5 text-gray-700 hover:text-black font-semibold transition-colors duration-200 rounded-full hover:bg-gray-50"
                    >
                      {t('nav.baggage')}
                    </Link>
                    <Link
                      to="/profile"
                      className="px-6 py-2.5 text-gray-700 hover:text-black font-semibold transition-colors duration-200 rounded-full hover:bg-gray-50"
                    >
                      {t('nav.profile')}
                    </Link>
                  </>
                )}
                <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-200">
                  <div className="text-right">
                    <p className="text-sm font-bold text-black">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-6 py-2.5 bg-black text-white rounded-full font-semibold hover:bg-gray-900 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-6 py-2.5 text-gray-700 hover:text-black font-semibold transition-colors duration-200 rounded-full hover:bg-gray-50"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 bg-black text-white rounded-full font-semibold hover:bg-gray-900 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-black hover:text-gray-600 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 border-t border-gray-200 mt-2 pt-4">
            {/* Mobile Language Switcher */}
            <div className="flex items-center space-x-2 mb-4 px-4">
              <button
                onClick={() => changeLanguage('ru')}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  i18n.language === 'ru' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                RU
              </button>
              <button
                onClick={() => changeLanguage('ro')}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  i18n.language === 'ro' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                RO
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                  i18n.language === 'en' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                EN
              </button>
            </div>
            {user ? (
              <div className="space-y-2">
                {user.is_admin ? (
                  <>
                    <button onClick={() => handleAdminTabClick('statistics')} className={`w-full text-left px-4 py-2 rounded-lg font-semibold ${activeAdminTab === 'statistics' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'}`}>{t('admin.statistics')}</button>
                    <button onClick={() => handleAdminTabClick('airlines')} className={`w-full text-left px-4 py-2 rounded-lg font-semibold ${activeAdminTab === 'airlines' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'}`}>{t('admin.airlines')}</button>
                    <button onClick={() => handleAdminTabClick('flights')} className={`w-full text-left px-4 py-2 rounded-lg font-semibold ${activeAdminTab === 'flights' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'}`}>{t('admin.flights')}</button>
                    <button onClick={() => handleAdminTabClick('clients')} className={`w-full text-left px-4 py-2 rounded-lg font-semibold ${activeAdminTab === 'clients' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'}`}>{t('admin.clients')}</button>
                    <button onClick={() => handleAdminTabClick('bookings')} className={`w-full text-left px-4 py-2 rounded-lg font-semibold ${activeAdminTab === 'bookings' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'}`}>{t('admin.bookings')}</button>
                  </>
                ) : (
                  <>
                    <Link to="/flights" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold">{t('nav.flights')}</Link>
                    <Link to="/bookings" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold">{t('nav.bookings')}</Link>
                    <Link to="/baggage" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold">{t('nav.baggage')}</Link>
                    <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold">{t('nav.profile')}</Link>
                  </>
                )}
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-black hover:bg-gray-50 rounded-lg font-semibold">{t('nav.logout')}</button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/login" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold">{t('nav.login')}</Link>
                <Link to="/register" className="block px-4 py-2 bg-black text-white rounded-lg text-center font-semibold">{t('nav.register')}</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
