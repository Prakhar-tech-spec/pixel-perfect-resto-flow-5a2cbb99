import React from 'react';
import Sidebar from './Sidebar';

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="fixed inset-0 flex bg-[#181818]">
      <Sidebar />
      <main className="flex-1 m-4 bg-[#f3f5ed] rounded-[32px] relative transition-all duration-300 ease-in-out">
        <div className="absolute inset-0 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PageLayout; 