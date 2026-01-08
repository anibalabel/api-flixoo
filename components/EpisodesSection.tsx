
import React, { useState } from 'react';
import { Episode, Season, TVShow } from '../types';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw';
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxNTU5ZjFmMGE4ODZhYTdlOTNmMjJlMDljNDdiOWM5ZSIsIm5iZiI6MTU4MzcwMDU0Mi44NCwic3ViIjoiNWU2NTVhM2U0NTlhZDYwMDExNTkzYzcwIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.ZOWuTVPOngZqSEgrSfBKN8AXpK77ADFwIvJibc3-ycI';

interface EpisodesSectionProps {
  episodes: Episode[];
  seasons: Season[];
  tvShows: TVShow[];
  setEpisodes: React.Dispatch<React.SetStateAction<Episode[]>>;
  refreshData: () => void;
}

interface FetchedEpisode {
  episode_number: number;
  name: string;
  overview: string;
  runtime: number;
  still_path: string; 
}

const EpisodesSection: React.FC<EpisodesSectionProps> = ({ episodes, seasons, tvShows, setEpisodes, refreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [fetchedEpisodes, setFetchedEpisodes] = useState<FetchedEpisode[]>([]);
  const [registeringIds, setRegisteringIds] = useState<number[]>([]);
  
  const [formData, setFormData] = useState<Partial<Episode>>({
    season_id: 0,
    series_id: 0,
    file_url: '',
  });

  const getImageUrl = (input: any) => {
    if (!input) return 'https://via.placeholder.com/500x281?text=Sin+Imagen';
    let path = "";
    if (typeof input === 'object' && input !== null) {
      path = input.original_image || "";
    } else if (typeof input === 'string') {
      const cleaned = input.replace(/\\\//g, '/'); 
      if (cleaned.startsWith('http')) {
        path = cleaned;
      } else {
        try {
          const data = JSON.parse(cleaned);
          path = data.original_image || "";
        } catch (e) {
          path = cleaned;
        }
      }
    }
    if (path.startsWith('/')) {
        return `https://image.tmdb.org/t/p/original${path}`;
    }
    return (!path || path === "" || path === "null" || path === ".") 
      ? 'https://via.placeholder.com/500x281?text=URL+Invalida' 
      : path;
  };

  const handleSearchEpisodes = async () => {
    if (!formData.series_id || !formData.season_id) {
      alert("Selecciona serie y temporada.");
      return;
    }

    const selectedShow = tvShows.find(s => s.id === formData.series_id);
    const selectedSeason = seasons.find(s => s.id === formData.season_id);

    if (!selectedShow || !selectedSeason) return;

    setIsSearching(true);
    setFetchedEpisodes([]);

    try {
      // Llamada directa a TMDB API sin IA
      const url = `https://api.themoviedb.org/3/tv/${selectedShow.tmdb_id}/season/${selectedSeason.order}?language=es-ES`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${TMDB_TOKEN}`
        }
      });

      if (!response.ok) throw new Error("Error al consultar TMDB");
      
      const data = await response.json();
      
      // Mapeamos los episodios del array "episodes" de TMDB
      if (data.episodes && Array.isArray(data.episodes)) {
        const formatted = data.episodes.map((ep: any) => ({
          episode_number: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          runtime: ep.runtime || 0,
          still_path: ep.still_path || ""
        }));
        setFetchedEpisodes(formatted);
      } else {
        alert("No se encontraron episodios en esta temporada.");
      }
    } catch (error) {
      console.error(error);
      alert("Error conectando con TMDB. Verifica tu token o el ID de la serie.");
    } finally {
      setIsSearching(false);
    }
  };

  const registerFetchedEpisode = async (fe: FetchedEpisode) => {
    if (registeringIds.includes(fe.episode_number)) return;
    setRegisteringIds(prev => [...prev, fe.episode_number]);

    // Formato de Registro Oxoo estricto con barras escapadas
    const rawPath = fe.still_path.startsWith('/') ? fe.still_path : `/${fe.still_path}`;
    const finalUrl = `https://image.tmdb.org/t/p/original${rawPath}`;
    // Reemplazamos / por \/ para cumplir con el formato JSON de Oxoo
    const posterJson = JSON.stringify({ original_image: finalUrl }).replace(/\//g, '\\/');

    const payload = {
      season_id: formData.season_id,
      series_id: formData.series_id,
      episode_name: fe.name,
      slug: fe.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      description: fe.overview,
      file_source: 'server',
      source_type: 'mp4',
      file_url: formData.file_url || '',
      order: fe.episode_number,
      runtime: `${fe.runtime || 45} min`,
      poster: posterJson
    };

    try {
      const res = await fetch(`${API_BASE_URL}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) refreshData();
    } catch (error) { 
      console.error(error); 
    } finally {
      setRegisteringIds(prev => prev.filter(id => id !== fe.episode_number));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <i className="fas fa-server text-indigo-500"></i>
             Librería de Episodios
          </h3>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <i className="fas fa-cloud-arrow-down"></i> Importador Directo TMDB
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold w-16">Eps</th>
                <th className="px-6 py-4 font-bold">Título / Path Oxoo</th>
                <th className="px-6 py-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {episodes.map((ep) => (
                <tr key={ep.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4 font-black text-indigo-400">#{ep.order}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img 
                        src={getImageUrl(ep.poster)} 
                        className="w-24 h-14 rounded-lg object-cover border border-gray-700 bg-gray-800 shadow-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-bold truncate text-sm">{ep.episode_name}</p>
                        <p className="text-[10px] text-gray-500 font-mono truncate mt-1 max-w-md bg-black/20 p-1 rounded">
                            {getImageUrl(ep.poster)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => {if(window.confirm('Eliminar?')) fetch(`${API_BASE_URL}/episodes/${ep.id}`, {method:'DELETE'}).then(()=>refreshData())}} className="text-gray-500 hover:text-red-400 p-2 transition-colors">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-[2rem] w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn">
            <div className="flex h-[85vh]">
              <div className="w-80 border-r border-gray-800 p-8 flex flex-col bg-gray-950/80">
                <div className="mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl mb-4">
                        <i className="fas fa-link"></i>
                    </div>
                    <h4 className="text-xl font-black text-white tracking-tighter uppercase">Direct API Fetch</h4>
                    <p className="text-gray-500 text-[10px] font-bold mt-1 uppercase">Sin IA - Datos Originales TMDB</p>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">1. Serie</label>
                    <select 
                      className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-white text-sm outline-none transition-all appearance-none" 
                      onChange={(e) => setFormData({...formData, series_id: parseInt(e.target.value), season_id: 0})}
                      value={formData.series_id}
                    >
                      <option value={0}>Elegir Serie...</option>
                      {tvShows.map(s => <option key={s.id} value={s.id}>{s.title} (ID: {s.tmdb_id})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">2. Temporada</label>
                    <select 
                      className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-white text-sm outline-none transition-all appearance-none disabled:opacity-20" 
                      value={formData.season_id} 
                      onChange={(e) => setFormData({...formData, season_id: parseInt(e.target.value)})}
                      disabled={!formData.series_id}
                    >
                      <option value={0}>Elegir Temporada...</option>
                      {seasons
                        .filter(s => s.tv_show_id && s.tv_show_id.includes(`"${formData.series_id}"`))
                        .map(s => <option key={s.id} value={s.id}>{s.season_name} (S{s.order})</option>)
                      }
                    </select>
                  </div>
                  <button 
                    onClick={handleSearchEpisodes} 
                    disabled={isSearching || !formData.season_id}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:grayscale"
                  >
                    {isSearching ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-download"></i>}
                    CONSULTAR API
                  </button>
                </div>
                
                <button 
                  onClick={() => { setShowModal(false); setFetchedEpisodes([]); }} 
                  className="mt-8 text-gray-600 hover:text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-2"
                >
                  <i className="fas fa-times"></i> Cancelar Importación
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-gray-900/50">
                {isSearching && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="font-black text-white text-xl uppercase tracking-tighter">Pidiendo datos a TMDB...</p>
                  </div>
                )}

                {fetchedEpisodes.length > 0 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl">
                        <p className="text-xs text-blue-400 font-black uppercase mb-1">Resultados de la API:</p>
                        <p className="text-[11px] text-gray-400">Se han encontrado {fetchedEpisodes.length} episodios. El still_path es el original de TMDB.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {fetchedEpisodes.map(fe => (
                        <div key={fe.episode_number} className="flex items-center gap-6 p-5 rounded-3xl bg-gray-800/40 border border-gray-700/50 hover:border-blue-500/30 transition-all">
                            <div className="w-44 h-24 bg-black rounded-2xl overflow-hidden shrink-0 border border-gray-700 relative">
                                <img 
                                    src={`https://image.tmdb.org/t/p/w300${fe.still_path}`} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300x169?text=Sin+Imagen')}
                                />
                                <div className="absolute top-2 left-2 bg-blue-600 text-[9px] font-black text-white px-2 py-1 rounded">E{fe.episode_number}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-black text-lg mb-1 truncate">{fe.name}</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[9px] text-green-500 font-black bg-green-500/10 px-2 py-0.5 rounded uppercase">STILL_PATH</span>
                                    <span className="text-[11px] font-mono text-gray-500 truncate">{fe.still_path || '/vacío'}</span>
                                </div>
                                <p className="text-[11px] text-gray-500 line-clamp-2 italic leading-relaxed">"{fe.overview || 'Sin descripción disponible.'}"</p>
                            </div>
                            <button 
                                onClick={() => registerFetchedEpisode(fe)} 
                                disabled={registeringIds.includes(fe.episode_number)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg"
                            >
                                {registeringIds.includes(fe.episode_number) ? <i className="fas fa-circle-notch animate-spin"></i> : 'REGISTRAR'}
                            </button>
                        </div>
                        ))}
                    </div>
                  </div>
                )}

                {fetchedEpisodes.length === 0 && !isSearching && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-800 opacity-20">
                    <i className="fas fa-cloud-download-alt text-[12rem] mb-8"></i>
                    <p className="text-4xl font-black uppercase tracking-tighter">API Fetcher</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpisodesSection;
