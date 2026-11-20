export interface MoodPlaylist {
  playlistId: string;
  thumbnailId: string;
  playlistTitle: string;
  shelfTitle: string;
  appearances: number;
  shelves: string[];
  firstAppearanceIndex: number;
}

export type ChillPlaylist = MoodPlaylist;

export interface ArtistCredit {
  name: string;
  id?: string;
}

export interface NodeTrack {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  artists?: ArtistCredit[];
  albumTitle?: string;
  albumId?: string;
  durationStr?: string;
  thumbnailId?: string;
  isSong: boolean;
  isMainPlaylist: boolean;
  appearances: number;
  rank: number;
  communityPlaylists?: string[];
}

export interface RelatedNode {
  id: string; // clean node id without RDCLAK5uy_
  title: string;
  thumbnailId?: string;
}

export interface NodeData {
  playlistId: string;
  playlistTitle: string;
  thumbnailId: string;
  atvs: NodeTrack[];
  omvs: NodeTrack[];
  relatedNodes: RelatedNode[];
  communityPlaylistsScraped: number;
}

export interface NetworkNode {
  id: string; // clean ID without RDCLAK5uy_
  title: string;
  thumbnailId: string;
  moods: string[];
  shelves: string[];
  appearances: number;
}

export interface CategoryChip {
  slug: string;
  title: string;
  id: string;
  scraped?: boolean;
  playlistCount?: number;
}

export interface CategoriesData {
  moods: CategoryChip[];
  genres: CategoryChip[];
}

export type SortMode = "appearances" | "order" | "title";
export type AppView = "categories" | "playlists" | "node";
export type NodePlaybackMode = "song" | "video";
