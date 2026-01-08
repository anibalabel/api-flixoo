import React, { useState, useEffect } from 'react';
import { ViewType, TVShow, Season, Episode } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TVShowsSection from './components/TVShowsSection';
import SeasonsSection from './components/SeasonsSection';
import EpisodesSection from './components/EpisodesSection';
import BackendCodeSection from './components/BackendCodeSection';
import Dashboard from './components/Dashboard';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw/api.php';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('DASHBOARD');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [tvShows, setTvShows] = useState<TVShow[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [showsRes, seasonsRes, episodesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tv_shows`),
        fetch(`${API_BASE_URL}/seasons`),
        fetch(`${API_BASE_URL}/episodes`)
      ]);

      if (showsRes.ok) setTvShows(await showsRes.json());
      if (seasonsRes.ok) setSeasons(await seasonsRes.json());
      if (episodesRes.ok) setEpisodes(await episodesRes.json());
    } catch (error) {
      console.error("Error fetching data from API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading && activeView !== 'API_CODE') {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <i className="fas fa-circle-notch animate-spin text-4xl mb-4 text-indigo-500"></i>
          <p className="font-medium">Conectando con el servidor...</p>
        </div>
      );
    }

    switch (activeView) {
      case 'DASHBOARD':
        return <Dashboard tvCount={tvShows.length} seasonCount={seasons.length} episodeCount={episodes.length} />;
      case 'TV_SHOWS':
        return <TVShowsSection tvShows={tvShows} refreshData={fetchData} />;
      case 'SEASONS':
        return <SeasonsSection seasons={seasons} tvShows={tvShows} setSeasons={setSeasons} refreshData={fetchData} />;
      case 'EPISODES':
        return <EpisodesSection episodes={episodes} seasons={seasons} tvShows={tvShows} setEpisodes={setEpisodes} refreshData={fetchData} />;
      case 'API_CODE':
        return <BackendCodeSection />;
      default:
        return <Dashboard tvCount={tvShows.length} seasonCount={seasons.length} episodeCount={episodes.length} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar 
        activeView={activeView} 
        setActiveView={(v) => { setActiveView(v); setIsSidebarOpen(false); }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header 
          activeView={activeView} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Overlay para móvil cuando el sidebar está abierto */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default App;