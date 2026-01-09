
import React, { useState, useEffect } from 'react';
import { Episode, Season, TVShow } from '../types';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw/api.php';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkUrlModal, setShowBulkUrlModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingBulkUrls, setIsProcessingBulkUrls] = useState(false);
  const [bulkUrlProgress, setBulkUrlProgress] = useState({ current: 0, total: 0 });
  const [bulkProcessComplete, setBulkProcessComplete] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const [tmdbToken, setTmdbToken] = useState(localStorage.getItem('tmdb_token') || DEFAULT_TMDB_TOKEN);
  const [fetchedEpisodes, setFetchedEpisodes] = useState<FetchedEpisode[]>([]);
  const [selectedEpisodeNumbers, setSelectedEpisodeNumbers] = useState<number[]>([]);
  const [registeringIds, setRegisteringIds] = useState<number[]>([]);
  const [searchParams, setSearchParams] = useState({ series_id: 0, season_id: 0 });
  const [bulkUrlParams, setBulkUrlParams] = useState({ 
    series_id: 0, 
    season_id: 0, 
    startEpisodeId: 0, 
    urls: '',
    source_type: 'embed' as 'embed' | 'm3u8'
  });
  const [editFormData, setEditFormData] = useState<Partial<Episode>>({});
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  useEffect(() => {
    localStorage.setItem('tmdb_token', tmdbToken);
  }, [tmdbToken]);

  const getImageUrl = (input: any) => {
    const placeholder = 'https://via.placeholder.com/500x281?text=Sin+Imagen';
    if (!input || input === "" || input === "null" || input === "[]" || input === "{}") return placeholder;

    let path = "";
    try {
      if (typeof input === 'object' && input !== null) {
        path = input.original_image || input.thumbnail || input.still_path || "";
      } else {
        const str = String(input).trim();
        if (str.startsWith('{')) {
          try {
            const data = JSON.parse(str);
            path = data.original_image || data.thumbnail || data.still_path || "";
          } catch (e) {
            const match = str.match(/"(?:original_image|thumbnail|still_path)"\s*:\s*"([^"]+)"/);
            path = match ? match[1] : str;
          }
        } else {
          path = str;
        }
      }
    } catch (error) {
      return placeholder;
    }

    if (!path || path === "null" || path === "") return placeholder;
    path = path.replace(/\\\//g, '/').replace(/\\/g, '');

    if (path.startsWith('/') && !path.startsWith('//')) {
      return `https://image.tmdb.org/t/p/w500${path}`;
    }
    if (path.startsWith('http')) return path;
    return path;
  };

  const getCurrentTimestamp = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const handleSearchEpisodes = async () => {
    if (!searchParams.series_id || !searchParams.season_id) return;
    const selectedShow = tvShows.find(s => Number(s.id) === searchParams.series_id);
    const selectedSeason = seasons.find(s => Number(s.id) === searchParams.season_id);
    if (!selectedShow || !selectedSeason) return;
    
    setIsSearching(true);
    setFetchedEpisodes([]);
    setSelectedEpisodeNumbers([]);
    
    try {
      const url = `https://api.themoviedb.org/3/tv/${selectedShow.tmdb_id}/season/${selectedSeason.order}?language=es-ES`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${tmdbToken.trim()}` }
      });
      const data = await response.json();
      setFetchedEpisodes(data.episodes || []);
    } catch (error) { console.error(error); }
    finally { setIsSearching(false); }
  };

  const toggleEpisodeSelection = (episodeNumber: number) => {
    const isRegistered = episodes.some(e => Number(e.season_id) === searchParams.season_id && e.order === episodeNumber);
    if (isRegistered) return;

    setSelectedEpisodeNumbers(prev => 
      prev.includes(episodeNumber) 
        ? prev.filter(num => num !== episodeNumber)
        : [...prev, episodeNumber]
    );
  };

  const handleSelectAll = () => {
    const availableEpisodes = fetchedEpisodes
      .filter(fe => !episodes.some(e => Number(e.season_id) === searchParams.season_id && e.order === fe.episode_number))
      .map(fe => fe.episode_number);
    
    if (selectedEpisodeNumbers.length === availableEpisodes.length) {
      setSelectedEpisodeNumbers([]);
    } else {
      setSelectedEpisodeNumbers(availableEpisodes);
    }
  };

  const registerEpisode = async (fe: FetchedEpisode) => {
    const posterJson = `{"original_image":"${fe.still_path || ""}"}`.replace(/\//g, '\\/');
    const timestamp = getCurrentTimestamp();
    const payload = {
      season_id: searchParams.season_id,
      series_id: searchParams.series_id,
      episode_name: fe.name,
      slug: fe.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      description: fe.overview,
      file_source: 'embed',
      source_type: 'embed',
      file_url: '', 
      order: fe.episode_number,
      runtime: fe.runtime ? `${fe.runtime} min` : '0 min',
      poster: posterJson,
      total_view: 0,
      created_at: timestamp,
      updated_at: timestamp
    };

    const res = await fetch(`${API_BASE_URL}/episodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  };

  const handleBulkImport = async () => {
    if (selectedEpisodeNumbers.length === 0) return;
    
    setBulkImporting(true);
    setImportProgress(0);
    
    const episodesToImport = fetchedEpisodes.filter(fe => selectedEpisodeNumbers.includes(fe.episode_number));
    
    for (let i = 0; i < episodesToImport.length; i++) {
      const fe = episodesToImport[i];
      setRegisteringIds(prev => [...prev, fe.episode_number]);
      try {
        await registerEpisode(fe);
        setImportProgress(i + 1);
      } catch (error) {
        console.error("Error al importar episodio", fe.episode_number, error);
      } finally {
        setRegisteringIds(prev => prev.filter(id => id !== fe.episode_number));
      }
    }
    
    refreshData();
    setBulkImporting(false);
    setSelectedEpisodeNumbers([]);
  };

  const handleUpdate = async () => {
    if (!editFormData.id) return;
    setIsSaving(true);
    try {
      const payload = { ...editFormData, updated_at: getCurrentTimestamp() };
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

  const handleProcessBulkUrls = async () => {
    setBulkError('');
    if (!bulkUrlParams.series_id || !bulkUrlParams.season_id || !bulkUrlParams.urls.trim()) {
      setBulkError("Por favor selecciona serie, temporada y añade URLs.");
      return;
    }

    const urlList = bulkUrlParams.urls.split('\n').map(u => u.trim()).filter(u => u !== "");
    if (urlList.length === 0) {
       setBulkError("No se encontraron URLs válidas en el texto.");
       return;
    }

    setIsProcessingBulkUrls(true);
    setBulkUrlProgress({ current: 0, total: urlList.length });
    
    try {
      const seasonEpisodes = episodes
        .filter(ep => Number(ep.season_id) === bulkUrlParams.season_id)
        .sort((a, b) => a.order - b.order);
      
      let startIndex = 0;
      if (bulkUrlParams.startEpisodeId > 0) {
        startIndex = seasonEpisodes.findIndex(ep => ep.id === bulkUrlParams.startEpisodeId);
        if (startIndex === -1) startIndex = 0;
      }

      for (let i = 0; i < urlList.length; i++) {
        const episode = seasonEpisodes[startIndex + i];
        if (!episode) break;

        const payload = {
          ...episode,
          file_url: urlList[i],
          file_source: bulkUrlParams.source_type,
          source_type: bulkUrlParams.source_type,
          updated_at: getCurrentTimestamp()
        };

        await fetch(`${API_BASE_URL}/episodes/${episode.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        setBulkUrlProgress(prev => ({ ...prev, current: i + 1 }));
      }
      
      refreshData();
      setBulkProcessComplete(true);
    } catch (error) {
      console.error("Error processing bulk URLs:", error);
      setBulkError("Error crítico al procesar el lote. Verifica la conexión.");
    } finally {
      setIsProcessingBulkUrls(false);
    }
  };

  const closeBulkModal = () => {
    setShowBulkUrlModal(false);
    setBulkProcessComplete(false);
    setBulkUrlProgress({ current: 0, total: 0 });
    setBulkError('');
    setBulkUrlParams({ ...bulkUrlParams, urls: '', source_type: 'embed' });
  };

  const filteredSeasons = seasons.filter(s => {
    if (!searchParams.series_id) return false;
    const tvShowIdStr = String(s.tv_show_id || '');
    return tvShowIdStr.includes(`"${searchParams.series_id}"`) || tvShowIdStr.includes(`${searchParams.series_id}`);
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-4 md:p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900/50">
          <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
             <i className="fas fa-film text-indigo-500"></i> Gestión de Episodios
          </h3>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 w-full sm:w-auto">
            <button onClick={() => { setBulkProcessComplete(false); setShowBulkUrlModal(true); }} className="flex-1 sm:flex-none bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all border border-gray-700 shadow-lg">
              <i className="fas fa-list-ol mr-2"></i> Lote
            </button>
            <button onClick={() => setShowImportModal(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all shadow-lg active:scale-95">
              <i className="fas fa-cloud-download-alt mr-2"></i> Importar
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-4 md:px-6 py-4 font-bold w-12 md:w-16">ORD</th>
                <th className="px-4 md:px-6 py-4 font-bold">EPISODIO</th>
                <th className="px-4 md:px-6 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {episodes.map((ep) => {
                const epImg = getImageUrl(ep.poster);
                const show = tvShows.find(s => Number(s.id) === Number(ep.series_id));
                const season = seasons.find(s => Number(s.id) === Number(ep.season_id));
                const hasUrl = ep.file_url && ep.file_url.trim() !== "";

                return (
                  <tr key={ep.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-4 md:px-6 py-4 font-black text-indigo-400">#{ep.order}</td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-16 h-10 md:w-24 md:h-14 rounded-lg flex-shrink-0 overflow-hidden border border-gray-700 bg-gray-800 shadow-xl">
                          <img src={epImg} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-bold truncate text-xs md:text-sm">{ep.episode_name}</p>
                          <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mb-1 mt-0.5 truncate">
                            {show?.title || 'Serie'} <span className="mx-1 text-gray-700">•</span> {season?.season_name || 'Temporada'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {!hasUrl && <i className="fas fa-circle text-red-500 text-[6px] animate-pulse"></i>}
                            <p className={`text-[10px] font-mono truncate ${!hasUrl ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                                {hasUrl ? ep.file_url : 'Sin URL'}
                            </p>
                            {hasUrl && (
                                <span className="ml-2 text-[9px] font-black uppercase bg-gray-800 text-indigo-300 px-1.5 py-0.5 rounded border border-gray-700">
                                    {ep.source_type}
                                </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 md:gap-2">
                        <button onClick={() => { setEditFormData(ep); setShowEditModal(true); }} className="text-gray-400 hover:text-indigo-400 p-2"><i className="fas fa-edit"></i></button>
                        <button onClick={() => setDeleteId(ep.id)} className="text-gray-400 hover:text-red-400 p-2"><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL IMPORTAR TMDB */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[60] p-2 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-scaleIn">
            <div className="p-5 md:p-8 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
              <h4 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Buscador TMDB</h4>
              <button onClick={() => setShowImportModal(false)} className="w-10 h-10 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-red-600 transition-all flex items-center justify-center flex-shrink-0">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-5 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Serie</label>
                  <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={searchParams.series_id} onChange={(e)=>setSearchParams({...searchParams, series_id: parseInt(e.target.value)})}>
                    <option value={0}>Elegir serie...</option>
                    {tvShows.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Temporada</label>
                  <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" value={searchParams.season_id} onChange={(e)=>setSearchParams({...searchParams, season_id: parseInt(e.target.value)})}>
                    <option value={0}>Elegir temporada...</option>
                    {filteredSeasons.map(s => <option key={s.id} value={s.id}>{s.season_name}</option>)}
                  </select>
                </div>
              </div>
              
              <button onClick={handleSearchEpisodes} disabled={isSearching} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-xl disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                {isSearching ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-search"></i>}
                Obtener Episodios
              </button>

              {fetchedEpisodes.length > 0 && (
                <div className="flex justify-between items-center px-2 py-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="selectAll"
                      className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedEpisodeNumbers.length > 0 && selectedEpisodeNumbers.length === fetchedEpisodes.filter(fe => !episodes.some(e => Number(e.season_id) === searchParams.season_id && e.order === fe.episode_number)).length}
                      onChange={handleSelectAll}
                    />
                    <label htmlFor="selectAll" className="text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer">Seleccionar todo</label>
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                    {selectedEpisodeNumbers.length} Seleccionados
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isSearching ? (
                  Array.from({length: 4}).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-800/20 border border-gray-800/40 p-4 rounded-2xl flex items-center gap-4">
                       <div className="w-20 h-12 bg-gray-800 rounded-lg"></div>
                       <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                          <div className="h-2 bg-gray-800 rounded w-1/2"></div>
                       </div>
                    </div>
                  ))
                ) : fetchedEpisodes.length > 0 ? (
                  fetchedEpisodes.map(fe => {
                    const isRegistered = episodes.some(e => Number(e.season_id) === searchParams.season_id && e.order === fe.episode_number);
                    const isSelected = selectedEpisodeNumbers.includes(fe.episode_number);
                    
                    return (
                      <div 
                        key={fe.episode_number} 
                        onClick={() => toggleEpisodeSelection(fe.episode_number)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${isRegistered ? 'bg-gray-800/10 border-gray-800/40 opacity-50' : isSelected ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-600/5' : 'bg-gray-800/40 border-gray-700 hover:border-gray-500'}`}
                      >
                        <div className="w-16 h-10 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 relative">
                          <img src={getImageUrl(fe.still_path)} className="w-full h-full object-cover" />
                          {isRegistered && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <i className="fas fa-check text-green-500 text-xl drop-shadow-lg"></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">E{fe.episode_number}: {fe.name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                           {!isRegistered && (
                             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'}`}>
                                {isSelected && <i className="fas fa-check text-[10px] text-white"></i>}
                             </div>
                           )}
                           {isRegistered && <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">OK</span>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-16 text-center text-gray-600">
                     <i className="fas fa-cloud-download-alt mb-4 block text-4xl opacity-20"></i>
                     <p className="text-sm font-medium">Busca episodios para importar.</p>
                  </div>
                )}
              </div>
            </div>

            {selectedEpisodeNumbers.length > 0 && (
              <div className="p-6 bg-gray-950/80 border-t border-gray-800 flex items-center justify-between animate-fadeIn">
                 <div className="flex flex-col">
                    <span className="text-xs font-bold text-white uppercase tracking-widest">
                       {bulkImporting ? 'Procesando Lote...' : 'Listo para importar'}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1">
                       {bulkImporting ? `Progreso: ${importProgress} de ${selectedEpisodeNumbers.length}` : `${selectedEpisodeNumbers.length} episodios seleccionados`}
                    </span>
                 </div>
                 <button 
                  onClick={handleBulkImport}
                  disabled={bulkImporting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/40 flex items-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                 >
                    {bulkImporting ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-bolt"></i>}
                    {bulkImporting ? 'Importando...' : 'Importar Seleccionados'}
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PROCESAR LOTE DE URLS (ACTUALIZADO CON SELECTOR DE TIPO) */}
      {showBulkUrlModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-6 md:p-8 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center">
              <h4 className="text-xl font-black text-white uppercase tracking-tighter">Procesar Lote de URLs</h4>
              {bulkProcessComplete && (
                <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-fadeIn border border-green-500/20">
                  Completado
                </div>
              )}
            </div>
            
            <div className="p-6 md:p-8 space-y-5 min-h-[300px] flex flex-col justify-center">
              {!bulkProcessComplete ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs md:text-sm outline-none" value={bulkUrlParams.series_id} onChange={(e)=>setBulkUrlParams({...bulkUrlParams, series_id: parseInt(e.target.value)})}>
                      <option value={0}>Serie...</option>
                      {tvShows.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                    <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs md:text-sm outline-none" value={bulkUrlParams.season_id} onChange={(e)=>setBulkUrlParams({...bulkUrlParams, season_id: parseInt(e.target.value)})}>
                      <option value={0}>Temporada...</option>
                      {seasons.filter(s => {
                        const tvShowIdStr = String(s.tv_show_id || '');
                        return tvShowIdStr.includes(`"${bulkUrlParams.series_id}"`) || tvShowIdStr.includes(`${bulkUrlParams.series_id}`);
                      }).map(s => <option key={s.id} value={s.id}>{s.season_name}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Tipo de Fuente</label>
                    <div className="flex gap-2 p-1 bg-gray-800 rounded-xl border border-gray-700">
                        {(['embed', 'm3u8'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setBulkUrlParams({...bulkUrlParams, source_type: type})}
                            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${
                                bulkUrlParams.source_type === type 
                                ? 'bg-indigo-600 text-white shadow-lg' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                        >
                            {type}
                        </button>
                        ))}
                    </div>
                  </div>

                  <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs md:text-sm outline-none" value={bulkUrlParams.startEpisodeId} onChange={(e)=>setBulkUrlParams({...bulkUrlParams, startEpisodeId: parseInt(e.target.value)})}>
                      <option value={0}>Empezar desde el episodio...</option>
                      {episodes.filter(ep => Number(ep.season_id) === bulkUrlParams.season_id).sort((a,b)=>a.order-b.order).map(ep => (
                        <option key={ep.id} value={ep.id}>#{ep.order} - {ep.episode_name}</option>
                      ))}
                  </select>
                  <textarea 
                      className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none h-40 resize-none"
                      placeholder="Pega aquí las URLs de los videos, una por línea..."
                      value={bulkUrlParams.urls}
                      onChange={(e)=>setBulkUrlParams({...bulkUrlParams, urls: e.target.value})}
                  ></textarea>
                  {bulkError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center animate-pulse">{bulkError}</p>}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 animate-scaleIn text-center">
                   <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 border-4 border-green-500/20 shadow-2xl shadow-green-500/10">
                      <i className="fas fa-check text-4xl"></i>
                   </div>
                   <h5 className="text-2xl font-black text-white uppercase mb-2">¡Todo Listo!</h5>
                   <p className="text-gray-400 text-sm max-w-xs leading-relaxed">Se han actualizado correctamente <b>{bulkUrlProgress.total}</b> episodios con las nuevas URLs y tipo de fuente <b>{bulkUrlParams.source_type}</b>.</p>
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 bg-gray-950/50 flex flex-col md:flex-row justify-end items-center gap-4 border-t border-gray-800">
              {isProcessingBulkUrls && (
                <div className="flex-1 w-full md:w-auto">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Actualizando: {bulkUrlProgress.current} / {bulkUrlProgress.total}</span>
                   </div>
                   <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300" 
                        style={{ width: `${(bulkUrlProgress.current / bulkUrlProgress.total) * 100}%` }}
                      ></div>
                   </div>
                </div>
              )}
              
              <div className="flex gap-4 w-full md:w-auto justify-end">
                <button onClick={closeBulkModal} className="text-gray-500 font-bold hover:text-white transition-colors">{bulkProcessComplete ? 'Finalizar' : 'Cerrar'}</button>
                {!bulkProcessComplete && (
                  <button 
                    onClick={handleProcessBulkUrls} 
                    disabled={isProcessingBulkUrls} 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-600/20 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isProcessingBulkUrls ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-play"></i>}
                    {isProcessingBulkUrls ? 'Procesando...' : 'Aplicar Lote'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN Y ELIMINACIÓN */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-6 md:p-8 border-b border-gray-800 bg-gray-950/50">
              <h4 className="text-xl font-black text-white uppercase tracking-tighter">Editar Episodio</h4>
            </div>
            <div className="p-6 md:p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nombre</label>
                <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={editFormData.episode_name} onChange={(e)=>setEditFormData({...editFormData, episode_name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">URL de Video</label>
                <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={editFormData.file_url} onChange={(e)=>setEditFormData({...editFormData, file_url: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo de Fuente</label>
                <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={editFormData.source_type} onChange={(e)=>setEditFormData({...editFormData, source_type: e.target.value, file_source: e.target.value})}>
                  <option value="embed">EMBED</option>
                  <option value="m3u8">M3U8</option>
                  <option value="server">SERVER</option>
                  <option value="mp4">MP4</option>
                </select>
              </div>
            </div>
            <div className="p-6 md:p-8 bg-gray-950/50 flex justify-end gap-4 border-t border-gray-800">
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 font-bold">Cancelar</button>
              <button onClick={handleUpdate} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl">
                {isSaving ? 'Guardando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 max-w-xs text-center shadow-2xl">
            <h4 className="text-lg font-bold text-white mb-4">¿Eliminar episodio?</h4>
            <div className="flex gap-4">
              <button onClick={() => setDeleteId(null)} className="flex-1 text-gray-400 font-bold">No</button>
              <button onClick={async () => {
                await fetch(`${API_BASE_URL}/episodes/${deleteId}`, { method: 'DELETE' });
                refreshData();
                setDeleteId(null);
              }} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold">Sí</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpisodesSection;
