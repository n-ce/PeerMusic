import { cleanPlaylistId, extractThumbnailId } from "./scraper.ts";
import type {
  CategoriesData,
  CategoryChip,
  MoodPlaylist,
  NetworkNode,
} from "./types.ts";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const CLIENT_VERSION = "1.20261020.10.00";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^-+|-+$/g, "");
}

/**
 * Fetches the live Moods & Genres index page via Innertube browse API.
 * Automatically retrieves updated rotation IDs/params for all moods and genres.
 */
export async function fetchMoodsAndGenresList(): Promise<CategoriesData> {
  const browseUrl = `https://music.youtube.com/youtubei/v1/browse?key=${API_KEY}&prettyPrint=false`;

  const response = await fetch(browseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/moods_and_genres",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: CLIENT_VERSION,
          hl: "en",
          gl: "US",
        },
      },
      browseId: "FEmusic_moods_and_genres",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch moods_and_genres: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const data: any = await response.json();
  const sections =
    data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.sectionListRenderer?.contents || [];

  const moods: CategoryChip[] = [];
  const genres: CategoryChip[] = [];

  for (const sec of sections) {
    const grid = sec.gridRenderer;
    const headerTitle =
      grid?.header?.gridHeaderRenderer?.title?.runs?.[0]?.text?.toLowerCase() ||
      "";
    const items = grid?.items || [];

    const isMood =
      headerTitle.includes("mood") || headerTitle.includes("moment");
    const isGenre = headerTitle.includes("genre");

    for (const item of items) {
      const btn = item.musicNavigationButtonRenderer;
      if (!btn) continue;

      const title = btn.buttonText?.runs?.[0]?.text?.trim() || "";
      const id =
        btn.clickCommand?.browseEndpoint?.params ||
        btn.navigationEndpoint?.browseEndpoint?.params ||
        "";
      if (!title || !id) continue;

      const chip: CategoryChip = {
        slug: slugify(title),
        title,
        id,
      };

      if (isMood) {
        moods.push(chip);
      } else if (isGenre) {
        genres.push(chip);
      } else {
        // Fallback default
        moods.push(chip);
      }
    }
  }

  return { moods, genres };
}

/**
 * Fetches category shelves for a single mood using its live params.
 */
export async function fetchMoodCategoryPlaylists(
  params: string,
  moodSlug: string,
): Promise<MoodPlaylist[]> {
  const browseUrl = `https://music.youtube.com/youtubei/v1/browse?key=${API_KEY}&prettyPrint=false`;

  const response = await fetch(browseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/moods_and_genres",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: CLIENT_VERSION,
          hl: "en",
          gl: "US",
        },
      },
      browseId: "FEmusic_moods_and_genres_category",
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch category "${moodSlug}": HTTP ${response.status}`,
    );
  }

  const categoryJson: any = await response.json();
  const sectionList =
    categoryJson?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  const playlistMap = new Map<string, MoodPlaylist>();
  let appearanceIndex = 0;

  for (const section of sectionList) {
    const shelf = section.musicCarouselShelfRenderer || section.gridRenderer;
    const shelfTitle =
      shelf?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]
        ?.text ||
      shelf?.header?.gridHeaderRenderer?.title?.runs?.[0]?.text ||
      "";

    if (!shelfTitle) continue;

    const lower = shelfTitle.toLowerCase();
    if (
      lower === "songs" ||
      lower.includes("top songs") ||
      lower === "music videos" ||
      lower === "videos"
    ) {
      continue;
    }

    const items = shelf?.contents || shelf?.items || [];
    for (const rawItem of items) {
      const r = rawItem.musicTwoRowItemRenderer;
      if (!r) continue;

      const title = r.title?.runs?.[0]?.text?.trim() || "Untitled Playlist";
      const browseId =
        r.navigationEndpoint?.browseEndpoint?.browseId ||
        r.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
      const watchPlaylistId =
        r.navigationEndpoint?.watchPlaylistEndpoint?.playlistId ||
        r.menu?.menuRenderer?.items?.find(
          (i: any) =>
            i?.menuNavigationItemRenderer?.navigationEndpoint
              ?.watchPlaylistEndpoint,
        )?.menuNavigationItemRenderer?.navigationEndpoint?.watchPlaylistEndpoint
          ?.playlistId;

      const rawId = watchPlaylistId || browseId;
      if (!rawId) continue;

      const playlistId = cleanPlaylistId(rawId);
      if (!playlistId || playlistId.length <= 11) continue;

      const thumbnails =
        r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
      const thumbUrl =
        thumbnails?.[thumbnails.length - 1]?.url || thumbnails?.[0]?.url;
      const thumbnailId = extractThumbnailId(thumbUrl);

      if (!playlistMap.has(playlistId)) {
        playlistMap.set(playlistId, {
          playlistId,
          thumbnailId,
          playlistTitle: title,
          shelfTitle,
          appearances: 1,
          shelves: [shelfTitle],
          firstAppearanceIndex: appearanceIndex++,
        });
      } else {
        const existing = playlistMap.get(playlistId)!;
        existing.appearances += 1;
        if (!existing.shelves.includes(shelfTitle)) {
          existing.shelves.push(shelfTitle);
        }
      }
    }
  }

  return Array.from(playlistMap.values()).sort((a, b) => {
    if (b.appearances !== a.appearances) {
      return b.appearances - a.appearances;
    }
    return a.firstAppearanceIndex - b.firstAppearanceIndex;
  });
}

/**
 * Fetches playlists for any mood by its slug name.
 */
export async function fetchMoodPlaylistsBySlug(
  slug: string,
): Promise<MoodPlaylist[]> {
  const categories = await fetchMoodsAndGenresList();
  const mood = categories.moods.find(
    (m) => m.slug.toLowerCase() === slug.toLowerCase(),
  );
  if (!mood) {
    throw new Error(`Mood "${slug}" not found in moods list`);
  }
  return fetchMoodCategoryPlaylists(mood.id, mood.slug);
}

export interface NetworkScrapeResult {
  nodes: NetworkNode[];
  categories: CategoriesData;
  categoryPlaylists: Record<string, MoodPlaylist[]>;
  totalUniqueNodes: number;
}

/**
 * Scrapes all live mood categories and constructs the comprehensive
 * RDCLAK5uy nodes network across all moods and shelves.
 */
export async function scrapeMoodsNetwork(): Promise<NetworkScrapeResult> {
  const categories = await fetchMoodsAndGenresList();
  const categoryPlaylists: Record<string, MoodPlaylist[]> = {};
  const networkMap = new Map<string, NetworkNode>();

  for (const mood of categories.moods) {
    try {
      const playlists = await fetchMoodCategoryPlaylists(mood.id, mood.slug);
      categoryPlaylists[mood.slug] = playlists;
      mood.scraped = true;
      mood.playlistCount = playlists.length;

      for (const p of playlists) {
        if (!networkMap.has(p.playlistId)) {
          networkMap.set(p.playlistId, {
            id: p.playlistId,
            title: p.playlistTitle,
            thumbnailId: p.thumbnailId,
            moods: [mood.slug],
            shelves: [...p.shelves],
            appearances: p.appearances,
          });
        } else {
          const node = networkMap.get(p.playlistId)!;
          node.appearances += p.appearances;
          if (!node.moods.includes(mood.slug)) {
            node.moods.push(mood.slug);
          }
          for (const s of p.shelves) {
            if (!node.shelves.includes(s)) {
              node.shelves.push(s);
            }
          }
        }
      }
    } catch (err) {
      console.error(`Failed scraping mood: ${mood.title} (${mood.slug})`, err);
      mood.scraped = false;
    }
  }

  // Sort network nodes by total appearances across all moods/shelves, then title
  const nodes = Array.from(networkMap.values()).sort((a, b) => {
    if (b.appearances !== a.appearances) {
      return b.appearances - a.appearances;
    }
    return a.title.localeCompare(b.title);
  });

  return {
    nodes,
    categories,
    categoryPlaylists,
    totalUniqueNodes: nodes.length,
  };
}
