import React from 'react';

interface DashboardProps {
  tvCount: number;
  seasonCount: number;
  episodeCount: number;
  movieCount?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ tvCount, seasonCount, episodeCount, movieCount = 0 }) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-400">
              <i className="fas fa-tv text-2xl"></i>
            </div>
            <span className="text-green-500 text-xs font-bold bg-green-900/20 px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">TV Shows</p>
          <h3 className="text-3xl font-bold text-white mt-1">{tvCount}</h3>
        </div>

        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-400">
              <i className="fas fa-layer-group text-2xl"></i>
            </div>
            <span className="text-green-500 text-xs font-bold bg-green-900/20 px-2 py-1 rounded-full">+4%</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">Seasons</p>
          <h3 className="text-3xl font-bold text-white mt-1">{seasonCount}</h3>
        </div>

        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-400">
              <i className="fas fa-clapperboard text-2xl"></i>
            </div>
            <span className="text-green-500 text-xs font-bold bg-green-900/20 px-2 py-1 rounded-full">+18%</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">Episodes</p>
          <h3 className="text-3xl font-bold text-white mt-1">{episodeCount}</h3>
        </div>

        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-pink-900/30 rounded-xl flex items-center justify-center text-pink-400">
              <i className="fas fa-film text-2xl"></i>
            </div>
            <span className="text-indigo-400 text-xs font-bold bg-indigo-900/20 px-2 py-1 rounded-full">New</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">Movies</p>
          <h3 className="text-3xl font-bold text-white mt-1">{movieCount}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h4 className="text-lg font-bold text-white mb-6">Database Config</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-800">
              <span className="text-gray-400">Host</span>
              <span className="text-indigo-400 font-mono text-sm">localhost</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-800">
              <span className="text-gray-400">Database</span>
              <span className="text-indigo-400 font-mono text-sm">plusmpzj_oxooflix</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-800">
              <span className="text-gray-400">Port</span>
              <span className="text-indigo-400 font-mono text-sm">3306</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-400">Status</span>
              <span className="text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400"></span> Online
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-500 mb-4 border border-indigo-500/30">
                <i className="fas fa-rocket text-3xl"></i>
            </div>
            <h4 className="text-xl font-bold text-white">Quick Actions</h4>
            <p className="text-gray-400 text-sm mt-2 mb-6">Start managing your streaming content efficiently using the sidebar navigation.</p>
            <div className="flex gap-4">
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                    Add New Season
                </button>
                <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded-lg font-semibold transition-colors">
                    Upload Episode
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;