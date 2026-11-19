import { extractThumbnailId } from "./scraper.ts";
import type {
  ArtistCredit,
  NodeData,
  NodeTrack,
  RelatedNode,
} from "./types.ts";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const CLIENT_VERSION = "1.20261020.10.00";

function extractArtistsAndAlbum(
  col1Runs: any[],
  col2Runs: any[],
): {
  author: string;
  authorId?: string;
  artists: ArtistCredit[];
  albumTitle?: string;
  albumId?: string;
} {
  const artists: ArtistCredit[] = [];
  for (const r of col1Runs) {
    const text = r.text?.trim();
    if (
      !text ||
      text === "•" ||
      text === "," ||
      text === "&" ||
      text === "feat." ||
      text === "ft."
    ) {
      continue;
    }
    const browseId = r.navigationEndpoint?.browseEndpoint?.browseId;
    const pageType =
      r.navigationEndpoint?.browseEndpoint
        ?.browseEndpointContextSupportedConfigs
        ?.browseEndpointContextMusicConfig?.pageType;

    // If it's an album run inside col1, skip from artists
    if (
      pageType === "MUSIC_PAGE_TYPE_ALBUM" ||
      browseId?.startsWith("MPREb") ||
      browseId?.startsWith("OLAK")
    ) {
      continue;
    }

    if (
      pageType === "MUSIC_PAGE_TYPE_ARTIST" ||
      browseId?.startsWith("UC") ||
      (!browseId && artists.length === 0)
    ) {
      artists.push({
        name: text,
        id: browseId,
      });
    } else if (!browseId && text.length > 0 && !text.includes("•")) {
      artists.push({ name: text });
    }
  }

  const author =
    artists.map((a) => a.name).join(", ") ||
    col1Runs
      .map((x: any) => x.text)
      .join("")
      .trim();
  const authorId = artists.find((a) => a.id)?.id;

  // Extract Album
  let albumTitle: string | undefined;
  let albumId: string | undefined;

  const albumRunCol2 =
    col2Runs.find(
      (x: any) =>
        x.navigationEndpoint?.browseEndpoint
          ?.browseEndpointContextSupportedConfigs
          ?.browseEndpointContextMusicConfig?.pageType ===
          "MUSIC_PAGE_TYPE_ALBUM" ||
        x.navigationEndpoint?.browseEndpoint?.browseId?.startsWith("MPREb") ||
        x.navigationEndpoint?.browseEndpoint?.browseId?.startsWith("OLAK"),
    ) ||
    (col2Runs.length > 0 && col2Runs[0].text?.trim() ? col2Runs[0] : undefined);

  if (albumRunCol2) {
    albumTitle = albumRunCol2.text?.trim();
    albumId = albumRunCol2.navigationEndpoint?.browseEndpoint?.browseId;
  } else {
    const albumRunCol1 = col1Runs.find(
      (x: any) =>
        x.navigationEndpoint?.browseEndpoint
          ?.browseEndpointContextSupportedConfigs
          ?.browseEndpointContextMusicConfig?.pageType ===
          "MUSIC_PAGE_TYPE_ALBUM" ||
        x.navigationEndpoint?.browseEndpoint?.browseId?.startsWith("MPREb") ||
        x.navigationEndpoint?.browseEndpoint?.browseId?.startsWith("OLAK"),
    );
    if (albumRunCol1) {
      albumTitle = albumRunCol1.text?.trim();
      albumId = albumRunCol1.navigationEndpoint?.browseEndpoint?.browseId;
    }
  }

  return { author, authorId, artists, albumTitle, albumId };
}

export async function fetchPlaylistTracks(playlistId: string): Promise<{
  tracks: NodeTrack[];
  headerTitle?: string;
  headerThumbnailId?: string;
}> {
  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const browseUrl = `https://music.youtube.com/youtubei/v1/browse?key=${API_KEY}&prettyPrint=false`;

  const response = await fetch(browseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/",
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
      browseId,
    }),
  });

  if (!response.ok) return { tracks: [] };

  const json: any = await response.json();
  const shelf =
    json?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents
      ?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer ||
    json?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer;

  const header =
    json?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.sectionListRenderer?.contents?.[0]
      ?.musicResponsiveHeaderRenderer ||
    json?.header?.musicDetailHeaderRenderer ||
    json?.header?.musicResponsiveHeaderRenderer;

  const headerTitle = header?.title?.runs?.[0]?.text?.trim();
  const headerThumbs =
    header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
    header?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails;
  const headerThumbUrl =
    headerThumbs?.[headerThumbs.length - 1]?.url || headerThumbs?.[0]?.url;
  const headerThumbnailId = extractThumbnailId(headerThumbUrl);

  const rawContents = shelf?.contents || [];
  const tracks: NodeTrack[] = [];

  for (const item of rawContents) {
    const r = item.musicResponsiveListItemRenderer;
    if (!r) continue;

    const rawVideoId =
      r.playlistItemData?.videoId ||
      r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
    if (!rawVideoId) continue;
    const videoId = rawVideoId.trim();

    const title =
      r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text?.trim() ||
      "";

    const col1Runs: any[] =
      r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs || [];
    const col2Runs: any[] =
      r.flexColumns?.[2]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs || [];

    const { author, authorId, artists, albumTitle, albumId } =
      extractArtistsAndAlbum(col1Runs, col2Runs);

    const durationStr =
      r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text?.trim() ||
      "";

    const thumbs =
      r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails;
    const thumbUrl = thumbs?.[thumbs.length - 1]?.url || thumbs?.[0]?.url;
    const thumbnailId = extractThumbnailId(thumbUrl) || videoId;

    const watchCfg =
      r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs?.[0]?.navigationEndpoint?.watchEndpoint
        ?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig ||
      r.overlay?.musicItemThumbnailOverlayRenderer?.content
        ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint
        ?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig ||
      r.navigationEndpoint?.watchEndpoint?.watchEndpointMusicSupportedConfigs
        ?.watchEndpointMusicConfig;
    const isSong = watchCfg?.musicVideoType === "MUSIC_VIDEO_TYPE_ATV";

    tracks.push({
      id: videoId,
      title,
      author,
      authorId,
      artists,
      albumTitle,
      albumId,
      durationStr,
      thumbnailId,
      isSong,
      isMainPlaylist: false,
      appearances: 1,
      rank: 0,
    });
  }

  return { tracks, headerTitle, headerThumbnailId };
}

/**
 * Searches and separates related playlists into:
 * 1. Related Nodes: Official curated playlists (RDCLAK5uy_)
 * 2. Community Playlists: User playlists (PL...), strictly excluding RDCLAK5uy_
 */
export async function fetchRelatedPlaylists(
  query: string,
  currentNodeId: string,
  limitNodes = 8,
  limitCommunity = 6,
): Promise<{
  relatedNodes: RelatedNode[];
  communityPlaylists: { id: string; title: string }[];
}> {
  const searchUrl = `https://music.youtube.com/youtubei/v1/search?key=${API_KEY}&prettyPrint=false`;

  // 1. Featured Playlists search (identifying related RDCLAK nodes)
  const resFeatured = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/",
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
      query,
      params: "EgeKAQQoADgBahIQBRADEBAQBBAJEAoQERAVEA4=", // Featured playlists
    }),
  });

  const relatedNodes: RelatedNode[] = [];
  if (resFeatured.ok) {
    const json: any = await resFeatured.json();
    const section =
      json?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents?.[0];
    const items = section?.musicShelfRenderer?.contents || [];

    for (const it of items) {
      if (relatedNodes.length >= limitNodes) break;
      const r = it?.musicResponsiveListItemRenderer;
      const title =
        r?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text
          ?.runs?.[0]?.text || "";
      const rawId =
        r?.navigationEndpoint?.browseEndpoint?.browseId ||
        r?.overlay?.musicItemThumbnailOverlayRenderer?.content
          ?.musicPlayButtonRenderer?.playNavigationEndpoint
          ?.watchPlaylistEndpoint?.playlistId ||
        "";

      if (rawId.includes("RDCLAK5uy_")) {
        const cleanId = rawId.replace(/^VL/, "").replace(/^RDCLAK5uy_/, "");
        // Exclude current node itself
        if (
          cleanId &&
          cleanId !== currentNodeId &&
          !relatedNodes.some((n) => n.id === cleanId)
        ) {
          const thumbs =
            r?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
            r?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails;
          const thumbUrl = thumbs?.[thumbs.length - 1]?.url || thumbs?.[0]?.url;
          const thumbnailId = extractThumbnailId(thumbUrl);

          relatedNodes.push({
            id: cleanId,
            title,
            thumbnailId,
          });
        }
      }
    }
  }

  // 2. Community Playlists search (strictly user community playlists, avoiding RDCLAK5uy)
  const resCommunity = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/",
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
      query,
      params: "EgeKAQQoAEABahIQBRADEBAQBBAJEAoQERAVEA4=", // Community playlists
    }),
  });

  const communityPlaylists: { id: string; title: string }[] = [];
  if (resCommunity.ok) {
    const json: any = await resCommunity.json();
    const section =
      json?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents?.[0];
    const items = section?.musicShelfRenderer?.contents || [];

    for (const it of items) {
      if (communityPlaylists.length >= limitCommunity) break;
      const r = it?.musicResponsiveListItemRenderer;
      const title =
        r?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text
          ?.runs?.[0]?.text || "";
      const rawId =
        r?.navigationEndpoint?.browseEndpoint?.browseId ||
        r?.overlay?.musicItemThumbnailOverlayRenderer?.content
          ?.musicPlayButtonRenderer?.playNavigationEndpoint
          ?.watchPlaylistEndpoint?.playlistId ||
        "";

      // Avoid using RDCLAK5uy playlists in related playlists for node aggregation!
      if (rawId.includes("RDCLAK5uy") || rawId.includes("RDCLAK")) {
        continue;
      }

      if (rawId.includes("PL") || rawId.includes("VLPL")) {
        const id = rawId.replace(/^VL/, "");
        if (!communityPlaylists.some((cp) => cp.id === id)) {
          communityPlaylists.push({ id, title });
        }
      }
    }
  }

  return { relatedNodes, communityPlaylists };
}

/**
 * Scrapes any node by its clean ID without the RDCLAK5uy_ prefix.
 * Harvests main playlist tracks, discovers related nodes (RDCLAK5uy),
 * and harvests user community playlists (PL...) for ATV occurrence ranking.
 */
export async function scrapeNode(
  cleanNodeId: string,
  knownTitle?: string,
): Promise<NodeData> {
  const fullPlaylistId = cleanNodeId.startsWith("PL")
    ? cleanNodeId
    : cleanNodeId.startsWith("RDCLAK5uy_")
      ? cleanNodeId
      : `RDCLAK5uy_${cleanNodeId}`;

  const {
    tracks: mainTracks,
    headerTitle,
    headerThumbnailId,
  } = await fetchPlaylistTracks(fullPlaylistId);
  const playlistTitle = knownTitle || headerTitle || "Curated Node";

  const mainTrackMap = new Map<string, NodeTrack>();
  for (const t of mainTracks) {
    t.isMainPlaylist = true;
    t.appearances = 1;
    mainTrackMap.set(t.id, t);
  }

  const mainAtvs: NodeTrack[] = mainTracks.filter((t) => t.isSong);
  const omvs: NodeTrack[] = mainTracks.filter((t) => !t.isSong);

  // Discover related nodes and community playlists (excluding RDCLAK from community harvesting)
  const { relatedNodes, communityPlaylists } = await fetchRelatedPlaylists(
    playlistTitle,
    cleanNodeId,
  );

  const communityAtvMap = new Map<string, NodeTrack>();

  for (const cp of communityPlaylists) {
    const { tracks: cpTracks } = await fetchPlaylistTracks(cp.id);
    for (const track of cpTracks) {
      if (!track.isSong) {
        if (!omvs.some((o) => o.id === track.id)) {
          omvs.push(track);
        }
        continue;
      }

      if (mainTrackMap.has(track.id)) {
        const existing = mainTrackMap.get(track.id)!;
        existing.appearances += 1;
        existing.communityPlaylists = existing.communityPlaylists || [];
        if (!existing.communityPlaylists.includes(cp.title)) {
          existing.communityPlaylists.push(cp.title);
        }
      } else {
        if (!communityAtvMap.has(track.id)) {
          track.communityPlaylists = [cp.title];
          track.appearances = 1;
          communityAtvMap.set(track.id, track);
        } else {
          const existing = communityAtvMap.get(track.id)!;
          existing.appearances += 1;
          existing.communityPlaylists = existing.communityPlaylists || [];
          if (!existing.communityPlaylists.includes(cp.title)) {
            existing.communityPlaylists.push(cp.title);
          }
        }
      }
    }
  }

  // Ranking rule:
  // In song mode rank ATVs by number of appearance.
  // ATVs already in the main playlist get higher precedence no matter what.
  // The rest is judged by number of appearances in community playlists.
  const rankedMainAtvs = mainAtvs.sort((a, b) => {
    if (b.appearances !== a.appearances) {
      return b.appearances - a.appearances;
    }
    return 0;
  });

  const rankedCommunityAtvs = Array.from(communityAtvMap.values()).sort(
    (a, b) => {
      return b.appearances - a.appearances;
    },
  );

  const rankedAtvs = [...rankedMainAtvs, ...rankedCommunityAtvs];

  rankedAtvs.forEach((t, i) => {
    t.rank = i + 1;
  });

  omvs.forEach((t, i) => {
    t.rank = i + 1;
  });

  return {
    playlistId: cleanNodeId,
    playlistTitle,
    thumbnailId: headerThumbnailId || (mainTracks[0]?.thumbnailId ?? ""),
    atvs: rankedAtvs,
    omvs,
    relatedNodes,
    communityPlaylistsScraped: communityPlaylists.length,
  };
}

export async function scrapeDeepSleepMeditationNode(): Promise<NodeData> {
  return scrapeNode(
    "l2OjbOL4oVkkHE86UT6oQCNufuv8d0luQ",
    "Deep Sleep Meditation",
  );
}
