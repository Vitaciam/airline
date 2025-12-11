import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-black text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-4 mb-8">
              <div className="bg-white text-black p-3 rounded-xl">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </div>
              <span className="text-2xl font-black">Airline</span>
            </div>
            <p className="text-gray-400 mb-8 leading-relaxed max-w-md text-lg">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="text-xl font-black mb-8 uppercase tracking-wide">{t('footer.navigation')}</h3>
            <ul className="space-y-4">
              <li><Link to="/flights" className="text-gray-400 hover:text-white transition-colors text-lg font-semibold">{t('nav.flights')}</Link></li>
              <li><Link to="/bookings" className="text-gray-400 hover:text-white transition-colors text-lg font-semibold">{t('nav.bookings')}</Link></li>
              <li><Link to="/baggage" className="text-gray-400 hover:text-white transition-colors text-lg font-semibold">{t('nav.baggage')}</Link></li>
              <li><Link to="/admin" className="text-gray-400 hover:text-white transition-colors text-lg font-semibold">{t('nav.admin')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-black mb-8 uppercase tracking-wide">{t('footer.contacts')}</h3>
            <ul className="space-y-4 text-gray-400 text-lg">
              <li className="flex items-start space-x-4">
                <svg className="w-6 h-6 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>{t('footer.email')}</span>
              </li>
              <li className="flex items-start space-x-4">
                <svg className="w-6 h-6 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l1.106 4.423a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.423 1.106a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span>{t('footer.phone')}</span>
              </li>
              <li className="flex items-start space-x-4">
                <svg className="w-6 h-6 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{t('footer.address')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-16 pt-10 text-center text-gray-500">
          <p className="text-lg">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
