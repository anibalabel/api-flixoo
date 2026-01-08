
import React, { useState, useEffect } from 'react';
import { ViewType, TVShow, Season, Episode } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TVShowsSection from './components/TVShowsSection';
import SeasonsSection from './components/SeasonsSection';
import EpisodesSection from './components/EpisodesSection';
import BackendCodeSection from './components/BackendCodeSection';
import Dashboard from './components/Dashboard';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('DASHBOARD');
  const [isLoading, setIsLoading] = useState(true);
  
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
          <p className="font-medium">Conectando con apiflixy.plusmovie.pw...</p>
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header activeView={activeView} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-950">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
