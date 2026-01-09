import React, { useState } from 'react';
import { Movie } from '../types';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw/api.php';

interface FeaturedSectionProps {
  movies: Movie[];
  refreshData: () => void;
}

const FeaturedSection: React.FC<FeaturedSectionProps> = ({ movies, refreshData }) => {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  // Se usa Number() para manejar casos donde la API devuelve el valor como string "1"
  const featuredMovies = movies.filter(m => Number(m.is_featured) === 1);

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

  const toggleFeatured = async (movie: Movie) => {
    setIsUpdating(movie.id);
    try {
      const response = await fetch(`${API_BASE_URL}/movies/${movie.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...movie, is_featured: 0 })
      });
      if (response.ok) {
        refreshData();
      }
    } catch (error) {
      console.error("Error updating featured status:", error);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <i className="fas fa-star text-indigo-500"></i>
            Contenido Destacado
          </h3>
          <p className="text-xs text-gray-500">Mostrando solo elementos con is_featured = 1</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">CONTENIDO</th>
                <th className="px-6 py-4 font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {featuredMovies.map((movie) => (
                <tr key={movie.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 flex-shrink-0 bg-gray-800 rounded overflow-hidden border border-gray-700 shadow-md">
                        <img src={getImageUrlForPreview(movie.thumbnail)} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{movie.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">MODO DESTACADO ACTIVO</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleFeatured(movie)} 
                      disabled={isUpdating === movie.id}
                      className="bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ml-auto"
                    >
                      {isUpdating === movie.id ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-star-slash"></i>}
                      Quitar de destacados
                    </button>
                  </td>
                </tr>
              ))}
              {featuredMovies.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-20 text-center text-gray-500 italic">
                    <i className="fas fa-star-half-alt text-4xl mb-4 block opacity-20"></i>
                    No hay contenidos marcados como destacados en este momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeaturedSection;