
import React, { useState, useEffect } from 'react';
import { Episode, Season, TVShow } from '../types';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw/api.php';

// Nuevo Token de Acceso v4 proporcionado por el usuario
const DEFAULT_TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxNTU5ZjFmMGE4ODZhYTdlOTNmMjJlMDljNDdiOWM5ZSIsIm5iZiI6MTU4MzcwMDU0Mi44NCwic3ViIjoiNWU2NTVhM2U0NTlhZDYwMDExNTkzYzcwIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.ZOWuTVPOngZqSEgrSfBKN8AXpK77ADFwIvJibc3-ycI';

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
  // --- Estados de UI ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkRegistering, setIsBulkRegistering] = useState(false);
  
  // --- Configuración TMDB ---
  const [tmdbToken, setTmdbToken] = useState(localStorage.getItem('tmdb_token') || DEFAULT_TMDB_TOKEN);
  const [showTokenSettings, setShowTokenSettings] = useState(false);
  
  // --- Estados de Importación ---
  const [fetchedEpisodes, setFetchedEpisodes] = useState<FetchedEpisode[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [registeringIds, setRegisteringIds] = useState<number[]>([]);
  const [searchParams, setSearchParams] = useState({ series_id: 0, season_id: 0 });
  
  // --- Estados de Edición ---
  const [editFormData, setEditFormData] = useState<Partial<Episode>>({});

  useEffect(() => {
    localStorage.setItem('tmdb_token', tmdbToken);
  }, [tmdbToken]);

  // --- Utilidades ---
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
    if (path && path.startsWith('/')) {
        return `https://image.tmdb.org/t/p/w500${path}`;
    }
    return (!path || path === "" || path === "null" || path === ".") 
      ? 'https://via.placeholder.com/500x281?text=URL+Invalida' 
      : path;
  };

  // --- LÓGICA DE SELECCIÓN ---
  const toggleSelectEpisode = (num: number) => {
    setSelectedNumbers(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNumbers.length === fetchedEpisodes.length) {
      setSelectedNumbers([]);
    } else {
      setSelectedNumbers(fetchedEpisodes.map(fe => fe.episode_number));
    }
  };

  // --- LÓGICA DE IMPORTACIÓN TMDB ---
  const handleSearchEpisodes = async () => {
    if (!searchParams.series_id || !searchParams.season_id) {
      alert("Por favor, selecciona una Serie y una Temporada.");
      return;
    }

    const selectedShow = tvShows.find(s => Number(s.id) === searchParams.series_id);
    const selectedSeason = seasons.find(s => Number(s.id) === searchParams.season_id);

    if (!selectedShow || !selectedSeason) {
      alert("Error: No se pudo localizar la serie o temporada en la base de datos local.");
      return;
    }

    setIsSearching(true);
    setFetchedEpisodes([]);
    setSelectedNumbers([]);

    try {
      const tmdbId = selectedShow.tmdb_id;
      const seasonNum = selectedSeason.order;
      const cleanToken = tmdbToken.trim();

      if (!tmdbId || tmdbId === "0") {
        throw new Error("La serie seleccionada no tiene un TMDB ID válido configurado.");
      }

      const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?language=es-ES`;
      
      let response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${cleanToken}`, 
          'Accept': 'application/json' 
        }
      });

      if (response.status === 401) {
        const fallbackUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${cleanToken}&language=es-ES`;
        response = await fetch(fallbackUrl);
      }

      if (response.status === 401) {
        throw new Error("ERROR 401: El Token/API Key de TMDB no es válido.");
      }

      if (!response.ok) {
        throw new Error(`Error TMDB (${response.status})`);
      }

      const data = await response.json();
      if (data.episodes && Array.isArray(data.episodes)) {
        setFetchedEpisodes(data.episodes.map((ep: any) => ({
          episode_number: ep.episode_number,
          name: ep.name || `Episodio ${ep.episode_number}`,
          overview: ep.overview || "Sin descripción disponible.",
          runtime: ep.runtime || 0,
          still_path: ep.still_path || ""
        })));
      }
    } catch (error: any) {
      alert(error.message);
      if (error.message.includes("401")) setShowTokenSettings(true);
    } finally {
      setIsSearching(false);
    }
  };

  const registerFetchedEpisode = async (fe: FetchedEpisode) => {
    if (registeringIds.includes(fe.episode_number)) return;
    setRegisteringIds(prev => [...prev, fe.episode_number]);

    const posterJson = JSON.stringify({ original_image: `https://image.tmdb.org/t/p/w500${fe.still_path}` }).replace(/\//g, '\\/');
    
    const payload = {
      season_id: searchParams.season_id,
      series_id: searchParams.series_id,
      episode_name: fe.name,
      slug: fe.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      description: fe.overview,
      file_source: 'server',
      source_type: 'mp4',
      file_url: '', 
      order: fe.episode_number,
      runtime: fe.runtime ? `${fe.runtime} min` : '0 min',
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
        refreshData();
        return true;
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      setRegisteringIds(prev => prev.filter(id => id !== fe.episode_number)); 
    }
    return false;
  };

  const handleBulkImport = async () => {
    if (selectedNumbers.length === 0) return;
    setIsBulkRegistering(true);
    
    const toImport = fetchedEpisodes.filter(fe => selectedNumbers.includes(fe.episode_number));
    let successCount = 0;

    for (const ep of toImport) {
      const success = await registerFetchedEpisode(ep);
      if (success) successCount++;
    }

    setIsBulkRegistering(false);
    setSelectedNumbers([]);
    alert(`Importación finalizada: ${successCount} episodios registrados.`);
  };

  const handleUpdate = async () => {
    if (!editFormData.id) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/episodes/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        refreshData();
        setShowEditModal(false);
      }
    } catch (error) { console.error(error); }
    finally { setIsSaving(false); }
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/episodes/${deleteId}`, { 
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        refreshData();
        setDeleteId(null);
      }
    } catch (error) { console.error(error); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <i className="fas fa-film text-indigo-500"></i> Gestión de Episodios
          </h3>
          <button onClick={() => setShowImportModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95">
            <i className="fas fa-cloud-download-alt mr-2"></i> Importar de TMDB
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold w-16">Ord</th>
                <th className="px-6 py-4 font-bold">Episodio</th>
                <th className="px-6 py-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {episodes.map((ep) => (
                <tr key={ep.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4 font-black text-indigo-400">#{ep.order}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img src={getImageUrl(ep.poster)} className="w-24 h-14 rounded-lg object-cover border border-gray-700 bg-gray-800 shadow-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-bold truncate text-sm">{ep.episode_name}</p>
                        <p className="text-[10px] text-gray-500 font-mono truncate mt-1">{ep.file_url || 'Sin URL configurada'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditFormData(ep); setShowEditModal(true); }} className="text-gray-400 hover:text-indigo-400 p-2"><i className="fas fa-edit"></i></button>
                      <button onClick={() => setDeleteId(ep.id)} className="text-gray-400 hover:text-red-400 p-2"><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {episodes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-500 italic">No hay episodios. Selecciona Importar para empezar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ELIMINAR */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 border border-red-900/30 rounded-3xl w-full max-sm overflow-hidden shadow-2xl">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <i className="fas fa-exclamation-triangle text-2xl"></i>
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Eliminar</h4>
              <p className="text-gray-400 text-sm">¿Eliminar este episodio permanentemente?</p>
            </div>
            <div className="flex border-t border-gray-800">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-4 text-gray-400 font-bold hover:bg-gray-800">Cancelar</button>
              <button onClick={executeDelete} className="flex-1 px-4 py-4 bg-red-600/10 text-red-500 font-bold hover:bg-red-600 hover:text-white border-l border-gray-800">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR TMDB */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-[2rem] w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl flex">
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-800 p-8 flex flex-col bg-gray-950/80">
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-xl font-black text-white uppercase tracking-tighter">Importador</h4>
                <button 
                  onClick={() => setShowTokenSettings(!showTokenSettings)} 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${showTokenSettings ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <i className="fas fa-cog"></i>
                </button>
              </div>

              <div className="space-y-6 flex-1">
                {showTokenSettings ? (
                  <div className="bg-indigo-900/20 border border-indigo-500/30 p-5 rounded-2xl animate-fadeIn">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 block">TMDB API Token</label>
                    <textarea 
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-3 text-indigo-300 text-[10px] font-mono outline-none h-40 resize-none" 
                      value={tmdbToken} 
                      onChange={(e) => setTmdbToken(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">1. Serie</label>
                        <select 
                          className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
                          onChange={(e) => setSearchParams({...searchParams, series_id: parseInt(e.target.value), season_id: 0})} 
                          value={searchParams.series_id}
                        >
                          <option value={0}>Selecciona...</option>
                          {tvShows.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">2. Temporada</label>
                        <select 
                          className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
                          value={searchParams.season_id} 
                          onChange={(e) => setSearchParams({...searchParams, season_id: parseInt(e.target.value)})} 
                          disabled={!searchParams.series_id}
                        >
                          <option value={0}>Selecciona...</option>
                          {seasons
                            .filter(s => {
                              if (!s || !s.tv_show_id || typeof s.tv_show_id !== 'string') return false;
                              return s.tv_show_id.includes(`"${searchParams.series_id}"`);
                            })
                            .map(s => <option key={s.id} value={s.id}>{s.season_name}</option>)}
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={handleSearchEpisodes} 
                      disabled={isSearching || !searchParams.season_id} 
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      {isSearching ? <i className="fas fa-sync animate-spin"></i> : <i className="fas fa-bolt"></i>}
                      CONSULTAR API
                    </button>
                  </>
                )}
              </div>
              <button onClick={() => { setShowImportModal(false); setFetchedEpisodes([]); setSelectedNumbers([]); }} className="mt-8 text-gray-500 hover:text-white font-bold text-xs uppercase tracking-widest">Cerrar</button>
            </div>

            {/* Main Panel */}
            <div className="flex-1 overflow-y-auto p-10 bg-gray-900/40 relative flex flex-col">
              {fetchedEpisodes.length > 0 && (
                <div className="sticky top-0 z-20 mb-6 flex justify-between items-center bg-gray-800/80 backdrop-blur-md p-5 rounded-2xl border border-gray-700 shadow-xl">
                  <div className="flex items-center gap-4">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                      checked={selectedNumbers.length === fetchedEpisodes.length && fetchedEpisodes.length > 0}
                      onChange={toggleSelectAll}
                    />
                    <span className="text-white font-bold text-sm uppercase tracking-wider">
                      {selectedNumbers.length === fetchedEpisodes.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                    </span>
                  </div>
                  
                  {selectedNumbers.length > 0 && (
                    <button 
                      onClick={handleBulkImport}
                      disabled={isBulkRegistering}
                      className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-green-900/20 active:scale-95 disabled:opacity-50 flex items-center gap-3 transition-all animate-scaleIn"
                    >
                      {isBulkRegistering ? <i className="fas fa-sync animate-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
                      {isBulkRegistering ? 'PROCESANDO...' : `IMPORTAR ${selectedNumbers.length} SELECCIONADOS`}
                    </button>
                  )}
                </div>
              )}

              {fetchedEpisodes.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 animate-fadeIn pb-10">
                  {fetchedEpisodes.map(fe => {
                    const isSelected = selectedNumbers.includes(fe.episode_number);
                    const isRegistering = registeringIds.includes(fe.episode_number);
                    
                    return (
                      <div 
                        key={fe.episode_number} 
                        onClick={() => toggleSelectEpisode(fe.episode_number)}
                        className={`flex items-center gap-6 p-5 rounded-3xl border transition-all group shadow-lg cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-indigo-500/5' 
                            : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-center w-8">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                            checked={isSelected}
                            readOnly
                          />
                        </div>
                        <div className="relative">
                          <img src={`https://image.tmdb.org/t/p/w300${fe.still_path}`} className="w-48 h-28 object-cover rounded-2xl border border-gray-700 bg-gray-900" />
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg font-black">#{fe.episode_number}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-black text-xl truncate transition-colors ${isSelected ? 'text-indigo-300' : 'text-white'}`}>{fe.name}</div>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-2 leading-relaxed italic">"{fe.overview}"</p>
                        </div>
                        
                        <div className="flex items-center">
                          {isRegistering ? (
                             <div className="bg-gray-800 text-indigo-400 px-6 py-4 rounded-2xl border border-gray-700 flex items-center gap-2">
                               <i className="fas fa-spinner animate-spin"></i>
                             </div>
                          ) : isSelected ? (
                             <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg animate-scaleIn">
                                <i className="fas fa-check"></i>
                             </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); registerFetchedEpisode(fe); }}
                              className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white w-12 h-12 rounded-2xl border border-gray-700 transition-all flex items-center justify-center"
                            >
                              <i className="fas fa-plus"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4">
                  <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-700">
                    <i className="fas fa-cloud-download-alt text-4xl"></i>
                  </div>
                  <div className="text-center max-w-sm">
                    <p className="font-black uppercase tracking-widest text-sm text-gray-400">Selecciona serie y temporada</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl">
            <h4 className="text-xl font-black text-white uppercase mb-6 tracking-tighter">Editar Episodio</h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nombre del Episodio</label>
                <input type="text" className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white text-sm border border-transparent focus:border-indigo-500 outline-none transition-all" value={editFormData.episode_name || ''} onChange={(e) => setEditFormData({...editFormData, episode_name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">URL del Video</label>
                <input type="text" className="w-full bg-gray-800 rounded-xl px-4 py-3 text-indigo-300 text-sm font-mono border border-transparent focus:border-indigo-500 outline-none transition-all" value={editFormData.file_url || ''} onChange={(e) => setEditFormData({...editFormData, file_url: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Orden</label>
                  <input type="number" className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white text-sm border border-transparent focus:border-indigo-500 outline-none transition-all" value={editFormData.order || ''} onChange={(e) => setEditFormData({...editFormData, order: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Duración</label>
                  <input type="text" className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white text-sm border border-transparent focus:border-indigo-500 outline-none transition-all" value={editFormData.runtime || ''} onChange={(e) => setEditFormData({...editFormData, runtime: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 font-bold px-4 transition-colors hover:text-white uppercase text-xs tracking-widest">Cancelar</button>
              <button onClick={handleUpdate} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>}
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpisodesSection;
