import type { ChillPlaylist } from "./types.ts";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const DEFAULT_API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const DEFAULT_CLIENT_VERSION = "1.20261020.10.00";
const DEFAULT_CHILL_PARAMS = "ggMPOg1uX1JOQWZFeDByc2Jm";

export function extractThumbnailId(url: string | undefined): string {
  if (!url) return "";
  const googleMatch = url.match(
    /(?:googleusercontent\.com|ggpht\.com)\/([^=?/]+)/,
  );
  if (googleMatch?.[1]) return googleMatch[1];
  const ytMatch = url.match(/i\.ytimg\.com\/vi\/([^/?]+)/);
  if (ytMatch?.[1]) return ytMatch[1];
  return "";
}

export function getThumbnailUrl(thumbnailId: string): string {
  if (!thumbnailId) return "";
  if (thumbnailId.length === 11) {
    return `https://i.ytimg.com/vi/${thumbnailId}/hqdefault.jpg`;
  }
  return `https://lh3.googleusercontent.com/${thumbnailId}=w544-h544-l90-rj`;
}

export function getVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getSongUrl(songId: string): string {
  return `https://music.youtube.com/watch?v=${songId}`;
}

export function cleanPlaylistId(rawId: string | undefined): string {
  if (!rawId) return "";
  let id = rawId.trim();
  if (id.startsWith("VL_")) id = id.substring(3);
  else if (id.startsWith("VL-")) id = id.substring(3);
  else if (id.startsWith("VL")) id = id.substring(2);
  if (id.startsWith("RDCLAK5uy_")) id = id.substring(10);
  return id;
}

export async function fetchChillCategoryData(
  apiKey = DEFAULT_API_KEY,
  clientVersion = DEFAULT_CLIENT_VERSION,
  params = DEFAULT_CHILL_PARAMS,
): Promise<any> {
  const browseUrl = `https://music.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`;

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
          clientVersion,
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
      `Failed to fetch category data: HTTP ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

export function parseChillPlaylists(categoryJson: any): ChillPlaylist[] {
  const sectionList =
    categoryJson?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  const playlistMap = new Map<string, ChillPlaylist>();
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

      // Only curated RDCLAK playlists allowed in display
      if (!rawId.includes("RDCLAK5uy")) continue;

      const playlistId = cleanPlaylistId(rawId);
      if (!playlistId || playlistId.length <= 11 || playlistId.startsWith("PL"))
        continue;

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

  // Aggregate and sort by appearance (most frequent first, then first appearance index)
  return Array.from(playlistMap.values()).sort((a, b) => {
    if (b.appearances !== a.appearances) {
      return b.appearances - a.appearances;
    }
    return a.firstAppearanceIndex - b.firstAppearanceIndex;
  });
}

export async function scrapeChill(): Promise<ChillPlaylist[]> {
  const json = await fetchChillCategoryData();
  return parseChillPlaylists(json);
}
