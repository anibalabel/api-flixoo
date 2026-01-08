import React, { useState, useEffect } from 'react';
import { Episode, Season, TVShow } from '../types';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw/api.php';

// Token de Acceso v4 de TMDB
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
  const [showBulkUrlModal, setShowBulkUrlModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkRegistering, setIsBulkRegistering] = useState(false);
  const [isUpdatingFromTMDB, setIsUpdatingFromTMDB] = useState(false);
  const [isProcessingBulkUrls, setIsProcessingBulkUrls] = useState(false);
  
  // --- Configuración TMDB ---
  const [tmdbToken, setTmdbToken] = useState(localStorage.getItem('tmdb_token') || DEFAULT_TMDB_TOKEN);
  const [showTokenSettings, setShowTokenSettings] = useState(false);
  
  // --- Estados de Importación TMDB ---
  const [fetchedEpisodes, setFetchedEpisodes] = useState<FetchedEpisode[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [registeringIds, setRegisteringIds] = useState<number[]>([]);
  const [searchParams, setSearchParams] = useState({ series_id: 0, season_id: 0 });
  
  // --- Estados de Lote URLs ---
  const [bulkUrlParams, setBulkUrlParams] = useState({ series_id: 0, season_id: 0, startEpisodeId: 0, urls: '' });
  const [bulkUrlStatus, setBulkUrlStatus] = useState({ current: 0, total: 0, label: '' });

  // Fix: Added missing state for editing episodes
  const [editFormData, setEditFormData] = useState<Partial<Episode>>({});

  // Reset del episodio de inicio cuando cambia la serie o temporada en el modal de lote
  useEffect(() => {
    setBulkUrlParams(prev => ({ ...prev, startEpisodeId: 0 }));
  }, [bulkUrlParams.series_id, bulkUrlParams.season_id]);

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

  const getCurrentTimestamp = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // --- LÓGICA DE LOTE DE URLS ---
  const handleProcessBulkUrls = async () => {
    if (!bulkUrlParams.series_id || !bulkUrlParams.season_id || !bulkUrlParams.startEpisodeId || !bulkUrlParams.urls.trim()) {
      alert("Por favor completa todos los campos del lote.");
      return;
    }

    const urlList = bulkUrlParams.urls.split('\n').map(u => u.trim()).filter(u => u !== '');
    if (urlList.length === 0) {
      alert("No se encontraron URLs válidas.");
      return;
    }

    // 1. Obtener y ordenar episodios de la temporada seleccionada
    const seasonEpisodes = episodes
      .filter(ep => Number(ep.season_id) === Number(bulkUrlParams.season_id))
      .sort((a, b) => a.order - b.order);

    // 2. Encontrar el punto de inicio por ID de episodio
    const startIndex = seasonEpisodes.findIndex(ep => Number(ep.id) === Number(bulkUrlParams.startEpisodeId));
    
    if (startIndex === -1) {
      alert("No se pudo localizar el episodio de inicio en la base de datos actual. Intenta refrescar los datos.");
      return;
    }

    // 3. Obtener el subconjunto de episodios a partir del inicio
    const targetEpisodes = seasonEpisodes.slice(startIndex);
    const maxItems = Math.min(urlList.length, targetEpisodes.length);

    setIsProcessingBulkUrls(true);
    setBulkUrlStatus({ current: 0, total: maxItems, label: 'Iniciando actualización masiva...' });

    let count = 0;
    const timestamp = getCurrentTimestamp();

    for (let i = 0; i < maxItems; i++) {
      const ep = targetEpisodes[i];
      const url = urlList[i];

      setBulkUrlStatus({ current: i + 1, total: maxItems, label: `Actualizando: Episodio ${ep.order}` });

      try {
        const payload = { 
          ...ep, 
          file_url: url,
          file_source: 'embed',
          source_type: 'embed',
          updated_at: timestamp
        };

        const res = await fetch(`${API_BASE_URL}/episodes/${ep.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            count++;
        }
      } catch (error) {
        console.error(`Error en ID ${ep.id}:`, error);
      }
    }

    setIsProcessingBulkUrls(false);
    refreshData();
    alert(`PROCESO COMPLETADO\n\n- Episodios actualizados: ${count}\n- Modo establecido: EMBED\n- Fecha registro: ${timestamp}`);
    setShowBulkUrlModal(false);
    setBulkUrlParams({ series_id: 0, season_id: 0, startEpisodeId: 0, urls: '' });
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
    } finally {
      setIsSearching(false);
    }
  };

  const registerFetchedEpisode = async (fe: FetchedEpisode) => {
    if (registeringIds.includes(fe.episode_number)) return;
    setRegisteringIds(prev => [...prev, fe.episode_number]);

    const posterJson = JSON.stringify({ original_image: `https://image.tmdb.org/t/p/w500${fe.still_path}` }).replace(/\//g, '\\/');
    const timestamp = getCurrentTimestamp();
    
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
      total_view: 0,
      created_at: timestamp,
      updated_at: timestamp
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

  // Fix: handleUpdate now uses correctly defined editFormData and setEditFormData
  const handleUpdate = async () => {
    if (!editFormData.id) return;
    setIsSaving(true);
    try {
      const payload = {
          ...editFormData,
          updated_at: getCurrentTimestamp()
      };
      const res = await fetch(`${API_BASE_URL}/episodes/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
          <div className="flex gap-3">
            <button onClick={() => setShowBulkUrlModal(true)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-gray-700 active:scale-95 shadow-lg">
              <i className="fas fa-list-ol mr-2"></i> Lote de URLs
            </button>
            <button onClick={() => setShowImportModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95">
              <i className="fas fa-cloud-download-alt mr-2"></i> Importar de TMDB
            </button>
          </div>
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
                      <img src={getImageUrl(ep.poster)} alt={ep.episode_name} className="w-24 h-14 rounded-lg object-cover border border-gray-700 bg-gray-800 shadow-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-bold truncate text-sm">{ep.episode_name}</p>
                        <p className="text-[10px] text-gray-500 font-mono truncate mt-1">{ep.file_url || 'Sin URL configurada'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {/* Fix: Usage of setEditFormData now resolved */}
                      <button onClick={() => { setEditFormData(ep); setShowEditModal(true); }} className="text-gray-400 hover:text-indigo-400 p-2"><i className="fas fa-edit"></i></button>
                      <button onClick={() => setDeleteId(ep.id)} className="text-gray-400 hover:text-red-400 p-2"><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {episodes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-500 italic">No hay episodios registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL LOTE DE URLS */}
      {showBulkUrlModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-scaleIn">
            <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-950/80">
              <div>
                <h4 className="text-2xl font-black text-white uppercase tracking-tighter">Importar Lote URLs</h4>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">Configuración de Origen: Embed</p>
              </div>
              <button onClick={() => setShowBulkUrlModal(false)} className="w-10 h-10 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-red-600 transition-all flex items-center justify-center shadow-lg">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">1. Serie</label>
                  <select 
                    className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-white text-sm outline-none transition-all shadow-inner"
                    value={bulkUrlParams.series_id}
                    onChange={(e) => setBulkUrlParams({...bulkUrlParams, series_id: parseInt(e.target.value)})}
                  >
                    <option value={0}>Selecciona serie...</option>
                    {tvShows.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">2. Temporada</label>
                  <select 
                    className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-white text-sm outline-none transition-all shadow-inner"
                    value={bulkUrlParams.season_id}
                    onChange={(e) => setBulkUrlParams({...bulkUrlParams, season_id: parseInt(e.target.value)})}
                    disabled={!bulkUrlParams.series_id}
                  >
                    <option value={0}>Selecciona temporada...</option>
                    {seasons
                      .filter(s => s.tv_show_id && s.tv_show_id.includes(`"${bulkUrlParams.series_id}"`))
                      .map(s => <option key={s.id} value={s.id}>{s.season_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">3. Empezar desde Episodio</label>
                <select 
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-white text-sm outline-none transition-all shadow-inner disabled:opacity-50"
                  value={bulkUrlParams.startEpisodeId}
                  onChange={(e) => setBulkUrlParams({...bulkUrlParams, startEpisodeId: parseInt(e.target.value)})}
                  disabled={!bulkUrlParams.season_id}
                >
                  <option value={0}>Selecciona episodio inicial...</option>
                  {episodes
                    .filter(ep => Number(ep.season_id) === Number(bulkUrlParams.season_id))
                    .sort((a, b) => a.order - b.order)
                    .map(ep => <option key={ep.id} value={ep.id}>#{ep.order} - {ep.episode_name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">4. Lote de URLs (Una por línea)</label>
                <textarea 
                  className="w-full h-40 bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-indigo-300 text-xs font-mono outline-none transition-all resize-none shadow-inner"
                  placeholder="Pega las URLs aquí..."
                  value={bulkUrlParams.urls}
                  onChange={(e) => setBulkUrlParams({...bulkUrlParams, urls: e.target.value})}
                />
              </div>

              {isProcessingBulkUrls && (
                <div className="bg-indigo-900/20 border border-indigo-500/20 p-6 rounded-2xl animate-fadeIn shadow-lg">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <i className="fas fa-circle-notch animate-spin text-indigo-400"></i>
                      <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">{bulkUrlStatus.label}</span>
                    </div>
                    <span className="text-indigo-300 text-xs font-black">{bulkUrlStatus.current} / {bulkUrlStatus.total}</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-700">
                    <div 
                      className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]" 
                      style={{ width: `${(bulkUrlStatus.current / bulkUrlStatus.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-gray-950/80 flex justify-end gap-5 border-t border-gray-800">
              <button onClick={() => setShowBulkUrlModal(false)} className="text-gray-500 hover:text-white font-black transition-colors uppercase text-[10px] tracking-widest">Cancelar</button>
              <button 
                onClick={handleProcessBulkUrls} 
                disabled={isProcessingBulkUrls || !bulkUrlParams.startEpisodeId || !bulkUrlParams.urls.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/40 disabled:opacity-20 flex items-center gap-3 transition-all active:scale-95"
              >
                {isProcessingBulkUrls ? <i className="fas fa-sync animate-spin"></i> : <i className="fas fa-bolt"></i>}
                {isProcessingBulkUrls ? 'ACTUALIZANDO...' : 'ACTUALIZAR LOTE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-gray-900 border border-red-900/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <i className="fas fa-exclamation-triangle text-2xl"></i>
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Eliminar Episodio</h4>
              <p className="text-gray-400 text-sm">Esta acción borrará permanentemente el episodio. ¿Continuar?</p>
            </div>
            <div className="flex border-t border-gray-800">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-4 text-gray-400 font-bold hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={executeDelete} className="flex-1 px-4 py-4 bg-red-600/10 text-red-500 font-bold hover:bg-red-600 hover:text-white transition-all border-l border-gray-800">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-8 border-b border-gray-800 bg-gray-950/50">
              <h4 className="text-2xl font-black text-white uppercase tracking-tighter">Editar Episodio</h4>
            </div>
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
                  value={editFormData.episode_name || ''} 
                  onChange={(e) => setEditFormData({...editFormData, episode_name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">URL del Video</label>
                <textarea 
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-indigo-300 text-xs font-mono outline-none transition-all h-24 resize-none" 
                  value={editFormData.file_url || ''} 
                  onChange={(e) => setEditFormData({...editFormData, file_url: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Orden</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
                    value={editFormData.order || 0} 
                    onChange={(e) => setEditFormData({...editFormData, order: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duración</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
                    value={editFormData.runtime || ''} 
                    onChange={(e) => setEditFormData({...editFormData, runtime: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</label>
                <textarea 
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all h-32 resize-none" 
                  value={editFormData.description || ''} 
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                />
              </div>
            </div>
            <div className="p-8 bg-gray-950/50 flex justify-end gap-4 border-t border-gray-800">
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white font-bold transition-colors">Cancelar</button>
              <button 
                onClick={handleUpdate} 
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>}
                {isSaving ? 'Guardando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpisodesSection;