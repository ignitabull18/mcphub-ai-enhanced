import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Content from '@/components/layout/Content';

const MainLayout: React.FC = () => {
  // Control sidebar expand/collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  // Control mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu on route change or window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  const handleBackdropClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Top Navigation */}
      <Header 
        onToggleSidebar={toggleSidebar} 
        onToggleMobileMenu={toggleMobileMenu}
        mobileMenuOpen={mobileMenuOpen}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={handleBackdropClick}
          />
        )}
        
        {/* Side Navigation */}
        <Sidebar 
          collapsed={sidebarCollapsed} 
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />
        
        {/* Main Content Area */}
        <Content>
          <Outlet />
        </Content>
      </div>
    </div>
  );
};

export default MainLayout;