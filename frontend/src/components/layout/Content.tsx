import React, { ReactNode } from 'react';

interface ContentProps {
  children: ReactNode;
}

const Content: React.FC<ContentProps> = ({ children }) => {
  return (
    <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto max-w-7xl">
        {children}
      </div>
    </main>
  );
};

export default Content;