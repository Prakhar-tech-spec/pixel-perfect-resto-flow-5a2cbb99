import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, ClipboardList, Users, Calendar, IndianRupee, FileText, Menu, X, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  userName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userName = 'Raja Dhaba' }) => {
  const [isOpen, setIsOpen] = useState(true);

  const navItems = [
    { name: 'Home', icon: LayoutGrid, path: '/' },
    { name: 'Inventory Expenses', icon: ClipboardList, path: '/inventory' },
    { name: 'Staff Management', icon: Users, path: '/staff' },
    { name: 'Attendance Tracker', icon: Calendar, path: '/attendance' },
    { name: 'Sales', icon: IndianRupee, path: '/sales' },
    { name: 'Notes', icon: FileText, path: '/notes' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];
  
  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-[#2A2A2A] text-white"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-[240px] md:w-[220px] xl:w-[250px]
        bg-[#181818] flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-6 py-5">
          <h1 className="text-white text-xl font-semibold tracking-tight">INVENTORY360</h1>
      </div>
      
        <nav className="flex-1 px-4 py-2 space-y-[2px] overflow-y-auto relative">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-4 px-5 py-2.5 rounded-[20px] text-[14px] md:text-[15px] font-medium transition-all relative overflow-hidden ${
                isActive
                  ? 'text-white'
                  : 'text-white/60 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-[#2A2A2A] z-0 rounded-[20px]"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <item.icon className="w-[18px] h-[18px] flex-shrink-0 z-10" />
                <span className="truncate z-10">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
        <div className="p-4 mx-4 mb-4 border-t border-white/10">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white flex items-center justify-center text-[#181818] text-base font-medium flex-shrink-0">
            R
          </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{userName}</div>
            </div>
            <button className="text-white/60 hover:text-white p-1">
              <svg width="16" height="16" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 5.5L7.5 8.5L10.5 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
