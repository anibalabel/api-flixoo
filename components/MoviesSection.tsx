import React, { useState } from 'react';
import { Movie } from '../types';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw/api.php';

interface MoviesSectionProps {
  movies: Movie[];
  refreshData: () => void;
}

const MoviesSection: React.FC<MoviesSectionProps> = ({ movies, refreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Movie>>({});

  const getImageUrlForPreview = (input: any) => {
    const placeholder = 'https://via.placeholder.com/342x513?text=No+Poster';
    if (!input || input === "" || input === "null" || input === "[]" || input === "{}") return placeholder;

    let path = "";
    try {
      if (typeof input === 'object' && input !== null) {
        path = input.original_image || input.thumbnail || "";
      } else {
        const str = String(input).trim();
        if (str.startsWith('{')) {
          try {
            const data = JSON.parse(str);
            path = data.original_image || data.thumbnail || "";
          } catch (e) {
            const match = str.match(/"(?:original_image|thumbnail)"\s*:\s*"([^"]+)"/);
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

  const handleEdit = (movie: Movie) => {
    setFormData({ ...movie });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/movies/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        refreshData();
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error saving movie:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <i className="fas fa-film text-indigo-500"></i>
            Lista de Películas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">PELÍCULA</th>
                <th className="px-6 py-4 font-bold text-center">FEATURED</th>
                <th className="px-6 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {movies.map((movie) => (
                <tr key={movie.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 flex-shrink-0 bg-gray-800 rounded overflow-hidden border border-gray-700 shadow-md">
                        <img src={getImageUrlForPreview(movie.thumbnail)} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{movie.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">ID: {movie.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black ${Number(movie.is_featured) === 1 ? 'bg-indigo-900/40 text-indigo-400 border border-indigo-500/30' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                      {Number(movie.is_featured) === 1 ? 'SÍ' : 'NO'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(movie)} className="text-gray-400 hover:text-white p-2 transition-colors">
                      <i className="fas fa-edit"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {movies.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-500 italic">No hay películas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-8 border-b border-gray-800 bg-gray-950/50">
              <h4 className="text-2xl font-black text-white tracking-tighter uppercase">Editar Película</h4>
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" 
                  value={formData.title || ''} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thumbnail (JSON)</label>
                <textarea 
                  className="w-full bg-gray-800/50 border-2 border-dashed border-indigo-500/30 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none transition-all h-24 resize-none" 
                  value={formData.thumbnail || ''} 
                  onChange={(e) => setFormData({...formData, thumbnail: e.target.value})} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destacada (Featured)</label>
                <select 
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                  value={Number(formData.is_featured)}
                  onChange={(e) => setFormData({...formData, is_featured: parseInt(e.target.value)})}
                >
                  <option value={0}>NO</option>
                  <option value={1}>SÍ</option>
                </select>
              </div>
            </div>
            <div className="p-8 bg-gray-950/50 flex justify-end gap-4 border-t border-gray-800">
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white font-bold transition-colors px-4">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>}
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoviesSection;