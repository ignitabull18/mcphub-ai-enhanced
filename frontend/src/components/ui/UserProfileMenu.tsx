import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, LogOut, Info } from 'lucide-react';
import AboutDialog from './AboutDialog';
import SponsorDialog from './SponsorDialog';
import WeChatDialog from './WeChatDialog';
import WeChatIcon from '@/components/icons/WeChatIcon';
import SponsorIcon from '@/components/icons/SponsorIcon';

interface UserProfileMenuProps {
  collapsed: boolean;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ collapsed }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSettingsClick = () => {
    navigate('/settings');
    setIsOpen(false);
  };

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  const handleAboutClick = () => {
    setShowAboutDialog(true);
    setIsOpen(false);
  };

  const handleSponsorClick = () => {
    setSponsorDialogOpen(true);
    setIsOpen(false);
  };

  const handleWeChatClick = () => {
    setWechatDialogOpen(true);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex ${collapsed ? 'justify-center' : 'items-center'} w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md ${isOpen ? 'bg-gray-100 dark:bg-gray-700' : ''
          }`}
      >
        <div className="flex-shrink-0 relative">
          <div className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            <User className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </div>
        </div>
        {!collapsed && (
          <div className="ml-3 flex flex-col items-start">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {auth.user?.username || t('auth.user')}
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-0 transform -translate-y-full left-0 w-full min-w-max bg-white border border-gray-200 dark:bg-gray-800 z-50">
          <button
            onClick={handleSponsorClick}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <SponsorIcon className="h-4 w-4 mr-2" />
            {t('sponsor.label')}
          </button>


          <button
            onClick={handleSettingsClick}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('nav.settings')}
          </button>
          <button
            onClick={handleAboutClick}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Info className="h-4 w-4 mr-2" />
            {t('about.title')}
          </button>

          <div className="border-t border-gray-200 dark:border-gray-600"></div>

          <button
            onClick={handleLogoutClick}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('app.logout')}
          </button>
        </div>
      )}

      {/* About dialog */}
      <AboutDialog
        isOpen={showAboutDialog}
        onClose={() => setShowAboutDialog(false)}
      />

      {/* Sponsor dialog */}
      <SponsorDialog open={sponsorDialogOpen} onOpenChange={setSponsorDialogOpen} />

      {/* WeChat dialog */}
      <WeChatDialog open={wechatDialogOpen} onOpenChange={setWechatDialogOpen} />
    </div>
  );
};

export default UserProfileMenu;
