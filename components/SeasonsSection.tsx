
import React, { useState } from 'react';
import { Season, TVShow } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const API_BASE_URL = 'https://apiflixy.plusmovie.pw';

interface SeasonsSectionProps {
  seasons: Season[];
  tvShows: TVShow[];
  setSeasons: React.Dispatch<React.SetStateAction<Season[]>>;
  refreshData: () => void;
}

interface FetchedSeason {
  season_number: number;
  name: string;
  overview: string;
  poster_path?: string; // Fragmento de imagen original
}

const SeasonsSection: React.FC<SeasonsSectionProps> = ({ seasons, tvShows, setSeasons, refreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchedSeasons, setFetchedSeasons] = useState<FetchedSeason[]>([]);
  
  const [formData, setFormData] = useState<Partial<Season>>({
    season_name: '',
    tv_show_id: '',
    order: 1,
    status: 1
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  };

  const handleSearchSeasons = async () => {
    if (!formData.tv_show_id) {
      alert("Por favor selecciona una serie primero.");
      return;
    }

    const selectedShow = tvShows.find(s => s.id.toString() === formData.tv_show_id);
    if (!selectedShow) return;

    setIsSearching(true);
    setFetchedSeasons([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Lista las temporadas reales para la serie con TMDB ID: ${selectedShow.tmdb_id} (Título: ${selectedShow.title}). Devuelve un JSON array de objetos con: season_number (int), name (string), overview (string), y poster_path (string, solo el fragmento del poster original de la temporada ej: /pOSpG3U8jGvR6eR6q7qA8W5H8V9.jpg).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                season_number: { type: Type.INTEGER },
                name: { type: Type.STRING },
                overview: { type: Type.STRING },
                poster_path: { type: Type.STRING, nullable: true }
              },
              required: ["season_number", "name"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || "[]");
      setFetchedSeasons(data);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      alert("Error al obtener temporadas de TMDB.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectFetchedSeason = (fs: FetchedSeason) => {
    const selectedShow = tvShows.find(s => s.id.toString() === formData.tv_show_id);
    const showTitle = selectedShow ? selectedShow.title : "";
    const seasonNumFormatted = fs.season_number.toString().padStart(2, '0');
    const finalName = `S${seasonNumFormatted} : ${showTitle}`;

    setFormData({
      ...formData,
      season_name: finalName,
      order: fs.season_number,
    });
    setFetchedSeasons([]);
  };

  const handleSave = async () => {
    if (!formData.tv_show_id || !formData.season_name) {
      alert("Completa los campos obligatorios.");
      return;
    }

    setIsSaving(true);
    const payload = {
      tv_show_id: formData.tv_show_id, 
      season_name: formData.season_name,
      slug: generateSlug(formData.season_name || 'untitled'),
      order: formData.order,
      status: formData.status
    };

    try {
      const response = await fetch(`${API_BASE_URL}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        refreshData();
        setShowModal(false);
        setFormData({ season_name: '', tv_show_id: '', order: 1, status: 1 });
      } else {
        alert("Error al guardar en el servidor.");
      }
    } catch (error) {
      console.error("Error saving season:", error);
      alert("Error de conexión con la API.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm(
      "¡ATENCIÓN! Al eliminar esta temporada, también se ELIMINARÁN TODOS LOS EPISODIOS asociados. ¿Estás seguro?"
    );

    if (confirmDelete) {
      try {
        const response = await fetch(`${API_BASE_URL}/seasons/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          refreshData();
        } else {
          alert("Error al intentar eliminar.");
        }
      } catch (error) {
        console.error("Error deleting season:", error);
        alert("Error de conexión.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <i className="fas fa-layer-group text-indigo-500"></i>
            Gestión de Temporadas
          </h3>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <i className="fas fa-plus mr-2"></i> Nueva Temporada
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">ID</th>
                <th className="px-6 py-4 font-bold">TV Show ID</th>
                <th className="px-6 py-4 font-bold">Nombre</th>
                <th className="px-6 py-4 font-bold">Slug</th>
                <th className="px-6 py-4 font-bold text-center">Orden</th>
                <th className="px-6 py-4 font-bold">Estado</th>
                <th className="px-6 py-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {seasons.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4 font-mono text-indigo-400">{s.id}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-mono bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20">
                      {s.tv_show_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{s.season_name}</td>
                  <td className="px-6 py-4 text-[10px] text-gray-500 font-mono">{s.slug}</td>
                  <td className="px-6 py-4 text-center text-white">{s.order}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${s.status === 1 ? 'bg-green-900/20 text-green-400 border border-green-500/30' : 'bg-red-900/20 text-red-400 border border-red-500/30'}`}>
                      {s.status === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-gray-400 hover:text-white p-2 transition-colors"><i className="fas fa-edit"></i></button>
                      <button 
                        onClick={() => handleDelete(s.id)}
                        className="text-gray-400 hover:text-red-400 p-2 transition-colors"
                        title="Eliminar temporada y sus episodios"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-lg overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-8 border-b border-gray-800">
              <h4 className="text-2xl font-black text-white tracking-tighter">CREAR TEMPORADA</h4>
              <p className="text-gray-500 text-sm mt-1">Usa la varita para autocompletar desde TMDB con imagen original.</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">1. Seleccionar Serie</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                    value={formData.tv_show_id}
                    onChange={(e) => setFormData({...formData, tv_show_id: e.target.value})}
                  >
                    <option value="">Elegir serie...</option>
                    {tvShows.map(show => <option key={show.id} value={show.id}>{show.title}</option>)}
                  </select>
                  <button 
                    onClick={handleSearchSeasons}
                    disabled={isSearching || !formData.tv_show_id}
                    className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white w-12 rounded-xl border border-indigo-500/30 transition-all disabled:opacity-30 flex items-center justify-center shadow-lg"
                    title="Buscar Temporadas en TMDB"
                  >
                    {isSearching ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
                  </button>
                </div>
              </div>

              {fetchedSeasons.length > 0 && (
                <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 max-h-64 overflow-y-auto space-y-2 animate-fadeIn">
                  <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <i className="fas fa-list-check"></i> Elige para autocompletar:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {fetchedSeasons.map((fs) => (
                      <button 
                        key={fs.season_number}
                        onClick={() => selectFetchedSeason(fs)}
                        className="text-left text-sm text-gray-300 hover:bg-indigo-600 hover:text-white p-3 rounded-xl transition-all flex gap-4 items-center group bg-gray-900/50"
                      >
                        <div className="w-12 h-16 bg-gray-800 rounded border border-gray-700 overflow-hidden shrink-0">
                          {fs.poster_path ? (
                            <img src={`https://image.tmdb.org/t/p/original${fs.poster_path}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600">N/A</div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col">
                           <span className="font-bold">{fs.name}</span>
                           <span className="text-[10px] opacity-60">Temporada {fs.season_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded font-mono">S{fs.season_number.toString().padStart(2, '0')}</span>
                           <i className="fas fa-bolt text-indigo-500 group-hover:text-white opacity-40 group-hover:opacity-100 transition-opacity"></i>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">2. Nombre de Temporada</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all font-semibold"
                    placeholder="S01 : Nombre de la serie"
                    value={formData.season_name}
                    onChange={(e) => setFormData({...formData, season_name: e.target.value})}
                  />
                  {formData.season_name && (
                    <i className="fas fa-check-circle absolute right-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse"></i>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">3. Orden</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                    value={formData.order}
                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">4. Estado</label>
                  <select 
                    className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: parseInt(e.target.value)})}
                  >
                    <option value={1}>Publicado</option>
                    <option value={0}>Borrador</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-950/50 flex justify-end gap-4 border-t border-gray-800">
              <button 
                onClick={() => { setShowModal(false); setFetchedSeasons([]); }}
                className="text-gray-500 hover:text-white font-bold transition-colors px-4"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>}
                {isSaving ? 'Guardando...' : 'Confirmar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonsSection;
