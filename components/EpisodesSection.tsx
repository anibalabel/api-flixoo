
import React, { useState } from 'react';
import { Episode, Season, TVShow } from '../types';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw';
// Token proporcionado por el usuario
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
  
  const [formData, setFormData] = useState<{series_id: number; season_id: number}>({
    series_id: 0,
    season_id: 0,
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
        return `https://image.tmdb.org/t/p/w500${path}`;
    }
    return (!path || path === "" || path === "null" || path === ".") 
      ? 'https://via.placeholder.com/500x281?text=URL+Invalida' 
      : path;
  };

  const handleSearchEpisodes = async () => {
    console.log("Iniciando búsqueda con:", formData);
    
    if (!formData.series_id || !formData.season_id) {
      alert("Debes seleccionar una Serie y una Temporada primero.");
      return;
    }

    const selectedShow = tvShows.find(s => Number(s.id) === formData.series_id);
    const selectedSeason = seasons.find(s => Number(s.id) === formData.season_id);

    if (!selectedShow) {
      alert("No se pudo encontrar la serie seleccionada en la base de datos.");
      return;
    }
    if (!selectedSeason) {
      alert("No se pudo encontrar la temporada seleccionada en la base de datos.");
      return;
    }

    setIsSearching(true);
    setFetchedEpisodes([]);

    try {
      // URL dinámica: /tv/{series_id}/season/{season_number}
      const url = `https://api.themoviedb.org/3/tv/${selectedShow.tmdb_id}/season/${selectedSeason.order}?language=es-ES`;
      console.log("Consultando TMDB:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${TMDB_TOKEN}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("TMDB Error:", errorData);
        throw new Error(errorData.status_message || "Error al conectar con TMDB");
      }
      
      const data = await response.json();
      console.log("Datos recibidos de TMDB:", data);
      
      if (data.episodes && Array.isArray(data.episodes)) {
        const formatted = data.episodes.map((ep: any) => ({
          episode_number: ep.episode_number,
          name: ep.name || `Episodio ${ep.episode_number}`,
          overview: ep.overview || "Sin descripción.",
          runtime: ep.runtime || 0,
          still_path: ep.still_path || ""
        }));
        setFetchedEpisodes(formatted);
      } else {
        alert("La API de TMDB no devolvió episodios para esta temporada.");
      }
    } catch (error: any) {
      console.error("Error en handleSearchEpisodes:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const registerFetchedEpisode = async (fe: FetchedEpisode) => {
    if (registeringIds.includes(fe.episode_number)) return;
    setRegisteringIds(prev => [...prev, fe.episode_number]);

    // Formato de póster Oxoo: JSON con barras escapadas
    const rawPath = fe.still_path.startsWith('/') ? fe.still_path : `/${fe.still_path}`;
    const finalImageUrl = `https://image.tmdb.org/t/p/w500${rawPath}`;
    
    // IMPORTANTE: Oxoo guarda las URLs en la DB escapando las barras: https:\/\/...
    const posterJson = JSON.stringify({ original_image: finalImageUrl }).replace(/\//g, '\\/');

    const payload = {
      season_id: formData.season_id,
      series_id: formData.series_id,
      episode_name: fe.name,
      slug: fe.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      description: fe.overview,
      file_source: 'server',
      source_type: 'mp4',
      file_url: '', // Se deja vacío para que el admin lo llene luego
      order: fe.episode_number,
      runtime: `${fe.runtime} min`,
      poster: posterJson,
      total_view: 0
    };

    try {
      const res = await fetch(`${API_BASE_URL}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        console.log(`Episodio ${fe.episode_number} registrado con éxito.`);
        refreshData();
      } else {
        const err = await res.json();
        alert(`Error al registrar episodio ${fe.episode_number}: ${err.error || 'Error desconocido'}`);
      }
    } catch (error) { 
      console.error(error);
      alert("Error de conexión al intentar registrar el episodio.");
    } finally {
      setRegisteringIds(prev => prev.filter(id => id !== fe.episode_number));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <i className="fas fa-film text-indigo-500"></i>
             Gestión de Episodios
          </h3>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <i className="fas fa-cloud-download-alt"></i> Importar desde TMDB
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold w-16">Ord</th>
                <th className="px-6 py-4 font-bold">Información del Episodio</th>
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
                        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/500x281?text=Error+Poster')}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-bold truncate text-sm">{ep.episode_name}</p>
                        <p className="text-[10px] text-gray-500 font-mono truncate mt-1 bg-black/30 p-1 px-2 rounded-md border border-gray-800 inline-block max-w-full">
                            {getImageUrl(ep.poster)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => {if(window.confirm('¿Eliminar episodio?')) fetch(`${API_BASE_URL}/episodes/${ep.id}`, {method:'DELETE'}).then(()=>refreshData())}} className="text-gray-600 hover:text-red-400 p-2 transition-colors">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {episodes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-600 italic">No hay episodios registrados para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn">
            <div className="flex h-[85vh]">
              {/* Panel de Control Lateral */}
              <div className="w-80 border-r border-gray-800 p-8 flex flex-col bg-gray-950/80">
                <div className="mb-10">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl mb-4 shadow-xl shadow-blue-600/20">
                        <i className="fas fa-satellite-dish"></i>
                    </div>
                    <h4 className="text-xl font-black text-white tracking-tighter uppercase leading-none">TMDB API Fetcher</h4>
                    <p className="text-gray-500 text-[10px] font-bold mt-2 uppercase tracking-widest">Conexión directa v3</p>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">1. Seleccionar Serie</label>
                    <select 
                      className="w-full bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-4 text-white text-sm outline-none transition-all appearance-none cursor-pointer" 
                      onChange={(e) => setFormData({...formData, series_id: parseInt(e.target.value), season_id: 0})}
                      value={formData.series_id}
                    >
                      <option value={0}>Elegir Serie...</option>
                      {tvShows.map(s => <option key={s.id} value={s.id}>{s.title} (ID: {s.tmdb_id})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">2. Temporada</label>
                    <select 
                      className="w-full bg-gray-800 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-4 text-white text-sm outline-none transition-all appearance-none disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer" 
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
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/10 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:grayscale disabled:opacity-50"
                  >
                    {isSearching ? <i className="fas fa-sync-alt animate-spin"></i> : <i className="fas fa-search"></i>}
                    CONSULTAR API
                  </button>
                </div>
                
                <button 
                  onClick={() => { setShowModal(false); setFetchedEpisodes([]); }} 
                  className="mt-8 text-gray-600 hover:text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 justify-center py-2 hover:bg-white/5 rounded-lg transition-all"
                >
                  <i className="fas fa-arrow-left"></i> Volver al panel
                </button>
              </div>

              {/* Área de resultados */}
              <div className="flex-1 overflow-y-auto p-10 bg-gray-900/40">
                {isSearching && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="font-black text-white text-xl uppercase tracking-tighter">Conectando con TMDB...</p>
                  </div>
                )}

                {fetchedEpisodes.length > 0 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-3xl flex items-center gap-6">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 text-xl shadow-inner">
                            <i className="fas fa-info-circle"></i>
                        </div>
                        <div>
                            <p className="text-xs text-white font-black uppercase tracking-wider">Episodios Encontrados</p>
                            <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                                Los pósters se guardarán usando la resolución <strong>w500</strong> con el formato JSON escapado requerido por Oxoo.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {fetchedEpisodes.map(fe => (
                        <div key={fe.episode_number} className="flex items-center gap-6 p-6 rounded-[2rem] bg-gray-800/20 border border-gray-700/40 hover:border-blue-500/40 transition-all group">
                            <div className="w-48 h-28 bg-black rounded-2xl overflow-hidden shrink-0 border border-gray-700 shadow-2xl relative">
                                <img 
                                    src={`https://image.tmdb.org/t/p/w500${fe.still_path}`} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/500x281?text=Sin+Imagen')}
                                />
                                <div className="absolute top-3 left-3 bg-blue-600 text-[10px] font-black text-white px-2.5 py-1 rounded-lg uppercase shadow-lg">Ep {fe.episode_number}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-black text-xl mb-2 truncate group-hover:text-blue-400 transition-colors">{fe.name}</div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[9px] text-green-500 font-black bg-green-500/10 px-2 py-1 rounded-md uppercase border border-green-500/20">Still Path:</span>
                                    <span className="text-[11px] font-mono text-gray-400 truncate max-w-xs">{fe.still_path || '/no-path'}</span>
                                    <span className="text-[9px] text-blue-400 font-black bg-blue-400/10 px-2 py-1 rounded-md uppercase border border-blue-400/20 ml-auto">{fe.runtime} min</span>
                                </div>
                                <p className="text-[11px] text-gray-500 line-clamp-2 italic leading-relaxed">"{fe.overview || 'Sin descripción proporcionada por la API.'}"</p>
                            </div>
                            <button 
                                onClick={() => registerFetchedEpisode(fe)} 
                                disabled={registeringIds.includes(fe.episode_number)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl shadow-blue-600/10 active:scale-95"
                            >
                                {registeringIds.includes(fe.episode_number) ? <i className="fas fa-spinner animate-spin"></i> : 'REGISTRAR'}
                            </button>
                        </div>
                        ))}
                    </div>
                  </div>
                )}

                {fetchedEpisodes.length === 0 && !isSearching && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-800 opacity-20 select-none">
                    <i className="fas fa-database text-[12rem] mb-8"></i>
                    <p className="text-5xl font-black uppercase tracking-tighter">API Inactiva</p>
                    <p className="text-lg font-bold">Selecciona una serie y temporada para comenzar.</p>
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
