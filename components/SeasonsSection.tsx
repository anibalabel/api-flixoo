
import React, { useState } from 'react';
import { Season, TVShow } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const API_BASE_URL = 'https://apiflixy.plusmovie.pw/api.php';

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
  poster_path?: string;
}

const SeasonsSection: React.FC<SeasonsSectionProps> = ({ seasons, tvShows, setSeasons, refreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSeasonId, setCurrentSeasonId] = useState<number | null>(null);
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
        contents: `Lista las temporadas reales para la serie con TMDB ID: ${selectedShow.tmdb_id}. Devuelve un JSON array de objetos con: season_number (int), name (string), overview (string), y poster_path (string).`,
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
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const openEditModal = (season: Season) => {
    setIsEditing(true);
    setCurrentSeasonId(season.id);
    
    let showId = "";
    if (season.tv_show_id) {
      const showIdMatch = season.tv_show_id.match(/"(\d+)"/);
      showId = showIdMatch ? showIdMatch[1] : season.tv_show_id;
    }
    
    setFormData({
      season_name: season.season_name || '',
      tv_show_id: showId,
      order: season.order || 1,
      status: season.status || 1
    });
    setShowModal(true);
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
      const url = isEditing ? `${API_BASE_URL}/seasons/${currentSeasonId}` : `${API_BASE_URL}/seasons`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        refreshData();
        closeModal();
      } else {
        alert("Error al guardar en el servidor.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setCurrentSeasonId(null);
    setFormData({ season_name: '', tv_show_id: '', order: 1, status: 1 });
    setFetchedSeasons([]);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/seasons/${deleteId}`, { 
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      
      if (res.ok) {
        refreshData();
        setDeleteId(null);
      } else {
        alert("Error al eliminar la temporada.");
      }
    } catch (error) { 
      console.error(error);
      alert("Error de red.");
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
          <button onClick={() => { setIsEditing(false); closeModal(); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95">
            <i className="fas fa-plus mr-2"></i> Nueva Temporada
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">Serie ID</th>
                <th className="px-6 py-4 font-bold">Nombre</th>
                <th className="px-6 py-4 font-bold text-center">Orden</th>
                <th className="px-6 py-4 font-bold">Estado</th>
                <th className="px-6 py-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {seasons.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-mono bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20">
                        {s.tv_show_id || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{s.season_name}</td>
                  <td className="px-6 py-4 text-center text-white">{s.order}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${s.status === 1 ? 'bg-green-900/20 text-green-400 border border-green-500/30' : 'bg-red-900/20 text-red-400 border border-red-500/30'}`}>
                      {s.status === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(s)} title="Editar" className="text-gray-400 hover:text-indigo-400 p-2 transition-colors"><i className="fas fa-edit"></i></button>
                      <button onClick={() => setDeleteId(s.id)} title="Eliminar" className="text-gray-400 hover:text-red-400 p-2 transition-colors"><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {seasons.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">No hay temporadas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ELIMINAR (Sustituye a confirm) */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 border border-red-900/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <i className="fas fa-exclamation-triangle text-2xl"></i>
              </div>
              <h4 className="text-xl font-bold text-white mb-2">¿Estás seguro?</h4>
              <p className="text-gray-400 text-sm">Esta acción eliminará la temporada y todos sus episodios de forma permanente.</p>
            </div>
            <div className="flex border-t border-gray-800">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-4 text-gray-400 font-bold hover:bg-gray-800 transition-colors">Cancelar</button>
              <button onClick={executeDelete} className="flex-1 px-4 py-4 bg-red-600/10 text-red-500 font-bold hover:bg-red-600 hover:text-white transition-all border-l border-gray-800">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-8 border-b border-gray-800">
              <h4 className="text-2xl font-black text-white tracking-tighter uppercase">{isEditing ? 'Editar Temporada' : 'Crear Temporada'}</h4>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serie</label>
                <div className="flex gap-2">
                  <select className="flex-1 bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.tv_show_id} onChange={(e) => setFormData({...formData, tv_show_id: e.target.value})}>
                    <option value="">Elegir serie...</option>
                    {tvShows.map(show => <option key={show.id} value={show.id}>{show.title}</option>)}
                  </select>
                  {!isEditing && (
                    <button onClick={handleSearchSeasons} className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white w-12 rounded-xl border border-indigo-500/30 transition-all flex items-center justify-center shadow-lg">
                      {isSearching ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre</label>
                <input type="text" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.season_name} onChange={(e) => setFormData({...formData, season_name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Orden</label>
                  <input type="number" className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.order} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</label>
                  <select className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" value={formData.status} onChange={(e) => setFormData({...formData, status: parseInt(e.target.value)})}>
                    <option value={1}>Publicado</option>
                    <option value={0}>Borrador</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-950/50 flex justify-end gap-4 border-t border-gray-800">
              <button onClick={closeModal} className="text-gray-500 hover:text-white font-bold transition-colors px-4">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>}
                {isSaving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonsSection;
