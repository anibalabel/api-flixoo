
import React from 'react';
import { TVShow } from '../types';

const API_BASE_URL = 'https://apiflixy.plusmovie.pw';

interface TVShowsSectionProps {
  tvShows: TVShow[];
  refreshData?: () => void;
}

const TVShowsSection: React.FC<TVShowsSectionProps> = ({ tvShows, refreshData }) => {
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

  const handleDelete = async (id: number, title: string) => {
    const confirm = window.confirm(`¿Estás SEGURO de eliminar "${title}"?\n\n¡Esto borrará TODAS las temporadas y episodios de esta serie permanentemente!`);
    if (confirm) {
      try {
        const response = await fetch(`${API_BASE_URL}/tv_shows/${id}`, { method: 'DELETE' });
        if (response.ok) {
          if (refreshData) refreshData();
          else window.location.reload();
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <i className="fas fa-tv text-indigo-500"></i>
          Lista de Series
        </h3>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
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
                    <button className="text-gray-400 hover:text-white p-2 transition-colors"><i className="fas fa-edit"></i></button>
                    <button onClick={() => handleDelete(show.id, show.title)} className="text-gray-400 hover:text-red-400 p-2 transition-colors"><i className="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TVShowsSection;
