
export interface TVShow {
  id: number;
  title: string;
  tmdb_id: string;
  thumbnail: string; // Formato JSON: {"original_image":"..."}
}

export interface Season {
  id: number;
  tv_show_id: string; // Stored as '["1"]'
  slug: string;
  season_name: string;
  order: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface Episode {
  id: number;
  season_id: number;
  series_id: number;
  episode_name: string;
  slug: string;
  description: string;
  file_source: string;
  source_type: string;
  file_url: string;
  order: number;
  runtime: string;
  poster: string; // Formato JSON: {"original_image":"..."}
  total_view: number;
  created_at?: string;
  updated_at?: string;
}

export type ViewType = 'DASHBOARD' | 'TV_SHOWS' | 'SEASONS' | 'EPISODES' | 'API_CODE';
