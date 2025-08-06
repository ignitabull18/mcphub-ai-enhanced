import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemeSwitch from '@/components/ui/ThemeSwitch';

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleMobileMenu?: () => void;
  mobileMenuOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onToggleMobileMenu, mobileMenuOpen }) => {
  const { t } = useTranslation();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-30 sticky top-0">
      <div className="flex justify-between items-center px-3 py-3">
        <div className="flex items-center">
          {/* Mobile menu toggle button - visible on mobile only */}
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none md:hidden"
            aria-label={t('app.toggleMobileMenu')}
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Desktop sidebar toggle button - hidden on mobile */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none hidden md:block"
            aria-label={t('app.toggleSidebar')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Application Title */}
          <h1 className="ml-4 text-lg md:text-xl font-bold text-gray-900 dark:text-white">{t('app.title')}</h1>
        </div>

        {/* Theme Switch */}
        <div className="flex items-center space-x-1">
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
};

export default Header;