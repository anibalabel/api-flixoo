
import React, { useState } from 'react';
import { TVShow } from '../types';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw/api.php';

interface TVShowsSectionProps {
  tvShows: TVShow[];
  refreshData: () => void;
}

const TVShowsSection: React.FC<TVShowsSectionProps> = ({ tvShows, refreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<TVShow>>({
    title: '',
    tmdb_id: '',
    thumbnail: '{"original_image":""}'
  });

  const getImageUrl = (input: any) => {
    if (!input) return 'https://via.placeholder.com/342x513?text=Sin+Poster';
    if (typeof input === 'object' && input !== null) return input.original_image || 'https://via.placeholder.com/342x513?text=Sin+Poster';
    if (typeof input === 'string') {
      if (input.startsWith('http')) return input;
      try {
        const data = JSON.parse(input);
        if (data && data.original_image) return data.original_image;
      } catch (e) {
        const match = input.match(/"original_image"\s*:\s*"([^"]+)"/);
        if (match && match[1]) return match[1].replace(/\\/g, '');
      }
    }
    return 'https://via.placeholder.com/342x513?text=Sin+Poster';
  };

  const handleEdit = (show: TVShow) => {
    setFormData(show);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id: number, title: string) => {
    console.log(`Intentando eliminar serie ID: ${id}`);
    if (window.confirm(`¿Estás SEGURO de eliminar "${title}"?\n\n¡Esto borrará TODAS las temporadas y episodios de esta serie permanentemente!`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/tv_shows/${id}`, { 
          method: 'DELETE',
          headers: { 'Accept': 'application/json' }
        });
        
        console.log("Respuesta del servidor:", response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log("Resultado de eliminación:", result);
          refreshData();
        } else {
          const errorText = await response.text();
          console.error("Error del servidor:", errorText);
          alert(`Error al eliminar: El servidor respondió con código ${response.status}`);
        }
      } catch (error) {
        console.error("Error de red al eliminar:", error);
        alert("No se pudo conectar con el servidor para eliminar. Revisa la consola (F12).");
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.tmdb_id) {
      alert("Título y TMDB ID son obligatorios.");
      return;
    }

    setIsSaving(true);
    try {
      const url = isEditing ? `${API_BASE_URL}/tv_shows/${formData.id}` : `${API_BASE_URL}/tv_shows`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        refreshData();
        setShowModal(false);
        setFormData({ title: '', tmdb_id: '', thumbnail: '{"original_image":""}' });
      } else {
        alert("Error al guardar los cambios.");
      }
    } catch (error) {
      console.error("Error saving TV Show:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <i className="fas fa-tv text-indigo-500"></i>
            Lista de Series
          </h3>
          <button 
            onClick={() => { setIsEditing(false); setFormData({ title: '', tmdb_id: '', thumbnail: '{"original_image":""}' }); setShowModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg active:scale-95"
          >
            <i className="fas fa-plus mr-2"></i> Añadir Serie
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">Serie</th>
                <th className="px-6 py-4 font-bold">TMDB ID</th>
                <th className="px-6 py-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tvShows.map((show) => (
                <tr key={show.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img src={getImageUrl(show.thumbnail)} alt={show.title} className="w-12 h-16 object-cover rounded shadow-lg border border-gray-700 bg-gray-800" />
                      <div>
                        <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{show.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-1 uppercase">ID: {show.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-800 text-indigo-300 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-500/20">
                      {show.tmdb_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(show)} className="text-gray-400 hover:text-white p-2 transition-colors"><i className="fas fa-edit"></i></button>
                      <button onClick={() => handleDelete(show.id, show.title)} className="text-gray-400 hover:text-red-400 p-2 transition-colors"><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {tvShows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-500 italic">No hay series registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-md overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-8 border-b border-gray-800">
              <h4 className="text-2xl font-black text-white tracking-tighter uppercase">{isEditing ? 'Editar Serie' : 'Nueva Serie'}</h4>
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TMDB ID</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
                  value={formData.tmdb_id} 
                  onChange={(e) => setFormData({...formData, tmdb_id: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">JSON Póster (Oxoo Format)</label>
                <textarea 
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-indigo-300 text-xs font-mono outline-none transition-all h-24" 
                  value={formData.thumbnail} 
                  onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                />
              </div>
            </div>
            <div className="p-8 bg-gray-950/50 flex justify-end gap-4 border-t border-gray-800">
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white font-bold transition-colors">Cancelar</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
              >
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

export default TVShowsSection;
