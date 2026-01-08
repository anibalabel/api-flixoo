
import React from 'react';
import { ViewType } from '../types';

interface HeaderProps {
  activeView: ViewType;
}

const Header: React.FC<HeaderProps> = ({ activeView }) => {
  const getTitle = () => {
    switch (activeView) {
      case 'DASHBOARD': return 'Overview';
      case 'TV_SHOWS': return 'Manage TV Shows';
      case 'SEASONS': return 'Manage Seasons';
      case 'EPISODES': return 'Manage Episodes';
      case 'API_CODE': return 'Rest API Developer Docs';
      default: return 'OxooFlix Admin';
    }
  };

  return (
    <header className="h-20 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-8 z-20 sticky top-0">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Search content..." 
            className="bg-gray-800 text-gray-200 pl-10 pr-4 py-2 rounded-full border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
          />
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-white">Administrator</p>
            <p className="text-xs text-gray-500">Super User</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white border-2 border-gray-800 overflow-hidden shadow-lg">
             <img src="https://picsum.photos/100/100" alt="Avatar" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
