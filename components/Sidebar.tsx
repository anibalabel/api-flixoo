
import React from 'react';
import { ViewType } from '../types';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'TV_SHOWS', label: 'TV Shows', icon: 'fa-tv' },
    { id: 'SEASONS', label: 'Seasons', icon: 'fa-layer-group' },
    { id: 'EPISODES', label: 'Episodes', icon: 'fa-clapperboard' },
    { id: 'API_CODE', label: 'API Implementation', icon: 'fa-code' },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full z-30">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
            <i className="fas fa-play"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">OxooFlix</h1>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as ViewType)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeView === item.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <i className={`fas ${item.icon} w-5`}></i>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Connected Database</p>
          <div className="flex items-center gap-2 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            plusmpzj_oxooflix
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
